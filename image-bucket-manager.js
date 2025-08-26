/**
 * Proactive Image Bucket Management System
 * Handles automatic bucket creation, capacity monitoring, and cleanup
 */

class ImageBucketManager {
    constructor(supabaseConfig) {
        // Configuration
        this.supabaseUrl = supabaseConfig.supabaseUrl;
        this.supabaseAnonKey = supabaseConfig.supabaseAnonKey;
        this.supabaseServiceKey = supabaseConfig.supabaseServiceKey;
        this.baseBucketName = 'patient-images';
        this.maxBucketSize = 1024 * 1024 * 1024; // 1GB per bucket
        this.cleanupThreshold = 0.85; // Trigger cleanup at 85% capacity
        this.overflowThreshold = 0.95; // Create new bucket at 95% capacity
        this.imageMaxAge = 30; // Days - images older than 30 days get cleaned
        
        // Initialize Supabase clients
        this.supabase = null; // Anonymous client
        this.serviceSupabase = null; // Service role client
        
        // State tracking
        this.activeBuckets = new Map(); // Track bucket usage
        this.cleanupScheduled = false;
        this.monitoring = false;
        
        this.initializeClients();
    }

    async initializeClients() {
        try {
            const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
            
            this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);
            this.serviceSupabase = createClient(this.supabaseUrl, this.supabaseServiceKey);
            
            console.log('✅ Image Bucket Manager initialized');
            
            // Start monitoring
            this.startMonitoring();
        } catch (error) {
            console.error('❌ Failed to initialize Image Bucket Manager:', error);
            throw error;
        }
    }

    /**
     * Get bucket usage information
     */
    async getBucketUsage(bucketName) {
        try {
            const { data: files, error } = await this.serviceSupabase.storage
                .from(bucketName)
                .list('', { limit: 1000 });

            if (error) {
                throw new Error(`Failed to list files in ${bucketName}: ${error.message}`);
            }

            const totalSize = files.reduce((sum, file) => {
                return sum + (file.metadata?.size || 0);
            }, 0);

            const totalFiles = files.length;
            const usagePercent = (totalSize / this.maxBucketSize) * 100;

            return {
                bucketName,
                totalSize,
                totalFiles,
                usagePercent: Math.round(usagePercent * 100) / 100,
                maxSize: this.maxBucketSize,
                files
            };
        } catch (error) {
            console.error(`❌ Error getting usage for bucket ${bucketName}:`, error);
            return null;
        }
    }

    /**
     * Get all available buckets with patient-images pattern
     */
    async getImageBuckets() {
        try {
            const { data: buckets, error } = await this.serviceSupabase.storage.listBuckets();
            
            if (error) {
                throw new Error(`Failed to list buckets: ${error.message}`);
            }

            // Filter buckets that match our naming pattern
            const imageBuckets = buckets.filter(bucket => 
                bucket.name === this.baseBucketName || 
                bucket.name.startsWith(`${this.baseBucketName}-`)
            );

            return imageBuckets;
        } catch (error) {
            console.error('❌ Error listing image buckets:', error);
            return [];
        }
    }

    /**
     * Create a new overflow bucket
     */
    async createOverflowBucket() {
        try {
            const existingBuckets = await this.getImageBuckets();
            const bucketNumber = existingBuckets.length;
            const newBucketName = `${this.baseBucketName}-${bucketNumber}`;

            console.log(`🆕 Creating overflow bucket: ${newBucketName}`);

            const { data, error } = await this.serviceSupabase.storage.createBucket(newBucketName, {
                public: false,
                fileSizeLimit: this.maxBucketSize,
                allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
            });

            if (error) {
                throw new Error(`Failed to create bucket ${newBucketName}: ${error.message}`);
            }

            // Set up bucket policies for the new bucket
            await this.setupBucketPolicies(newBucketName);

            console.log(`✅ Overflow bucket created: ${newBucketName}`);
            return newBucketName;

        } catch (error) {
            console.error('❌ Error creating overflow bucket:', error);
            throw error;
        }
    }

    /**
     * Set up storage policies for a bucket
     */
    async setupBucketPolicies(bucketName) {
        try {
            // Note: This would need to be done via SQL or Supabase Dashboard
            // as the JS client doesn't have direct policy management
            console.log(`⚠️ Manual action required: Set up RLS policies for bucket ${bucketName}`);
            console.log(`Run this SQL in your Supabase SQL Editor:`);
            console.log(`
-- Policies for ${bucketName}
INSERT INTO storage.policies (name, bucket_id, command, definition)
VALUES 
  ('anon_select_${bucketName.replace(/-/g, '_')}', '${bucketName}', 'SELECT', 'true'),
  ('anon_insert_${bucketName.replace(/-/g, '_')}', '${bucketName}', 'INSERT', 'true'),
  ('service_all_${bucketName.replace(/-/g, '_')}', '${bucketName}', 'ALL', 'auth.role() = ''service_role''')
ON CONFLICT (name, bucket_id) DO NOTHING;
            `);
        } catch (error) {
            console.warn('⚠️ Could not automatically set up bucket policies:', error);
        }
    }

    /**
     * Find the best bucket for uploading (least full, or create new)
     */
    async findOptimalBucket() {
        try {
            const imageBuckets = await this.getImageBuckets();
            
            if (imageBuckets.length === 0) {
                throw new Error('No image buckets found');
            }

            let bestBucket = null;
            let lowestUsage = 100;

            // Check usage of each bucket
            for (const bucket of imageBuckets) {
                const usage = await this.getBucketUsage(bucket.name);
                
                if (usage && usage.usagePercent < lowestUsage) {
                    bestBucket = bucket.name;
                    lowestUsage = usage.usagePercent;
                }

                // Cache the usage info
                this.activeBuckets.set(bucket.name, usage);
            }

            // If the best bucket is too full, create a new one
            if (lowestUsage > this.overflowThreshold) {
                bestBucket = await this.createOverflowBucket();
            }

            console.log(`📍 Optimal bucket selected: ${bestBucket} (${lowestUsage.toFixed(1)}% full)`);
            return bestBucket;

        } catch (error) {
            console.error('❌ Error finding optimal bucket:', error);
            // Fallback to base bucket
            return this.baseBucketName;
        }
    }

    /**
     * Clean up old images (older than specified days)
     */
    async cleanupOldImages() {
        try {
            console.log('🧹 Starting automatic image cleanup...');
            
            const imageBuckets = await this.getImageBuckets();
            let totalCleaned = 0;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.imageMaxAge);

            for (const bucket of imageBuckets) {
                const usage = await this.getBucketUsage(bucket.name);
                
                if (!usage || !usage.files) continue;

                // Find old images
                const oldImages = usage.files.filter(file => {
                    const fileDate = new Date(file.created_at);
                    return fileDate < cutoffDate;
                });

                if (oldImages.length > 0) {
                    console.log(`🧹 Found ${oldImages.length} old images in ${bucket.name}`);
                    
                    // Delete old images in batches
                    const batchSize = 50;
                    for (let i = 0; i < oldImages.length; i += batchSize) {
                        const batch = oldImages.slice(i, i + batchSize);
                        const filePaths = batch.map(file => file.name);
                        
                        const { error } = await this.serviceSupabase.storage
                            .from(bucket.name)
                            .remove(filePaths);

                        if (error) {
                            console.warn(`⚠️ Error deleting batch in ${bucket.name}:`, error);
                        } else {
                            totalCleaned += batch.length;
                            console.log(`✅ Deleted ${batch.length} old images from ${bucket.name}`);
                        }

                        // Small delay between batches to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                    // Also clean up patient associations for deleted images
                    await this.cleanupOrphanedAssociations(oldImages.map(f => f.name));
                }
            }

            if (totalCleaned > 0) {
                console.log(`✅ Cleanup completed: ${totalCleaned} old images removed`);
                
                // Trigger a notification if available
                if (typeof window !== 'undefined' && window.simpleGallery?.showMessage) {
                    window.simpleGallery.showMessage(
                        `🧹 Nettoyage automatique : ${totalCleaned} anciennes images supprimées (> ${this.imageMaxAge} jours)`, 
                        'info'
                    );
                }
            }

            return totalCleaned;

        } catch (error) {
            console.error('❌ Error during image cleanup:', error);
            return 0;
        }
    }

    /**
     * Clean up orphaned patient associations
     */
    async cleanupOrphanedAssociations(deletedImageNames) {
        try {
            if (!deletedImageNames || deletedImageNames.length === 0) return;

            const { error } = await this.serviceSupabase
                .from('image_patient_associations')
                .delete()
                .in('image_name', deletedImageNames);

            if (error) {
                console.warn('⚠️ Error cleaning up patient associations:', error);
            } else {
                console.log(`✅ Cleaned up ${deletedImageNames.length} orphaned patient associations`);
            }
        } catch (error) {
            console.warn('⚠️ Error cleaning up orphaned associations:', error);
        }
    }

    /**
     * Check if cleanup is needed based on bucket usage
     */
    async shouldTriggerCleanup() {
        try {
            const imageBuckets = await this.getImageBuckets();
            
            for (const bucket of imageBuckets) {
                const usage = await this.getBucketUsage(bucket.name);
                
                if (usage && usage.usagePercent > (this.cleanupThreshold * 100)) {
                    console.log(`⚠️ Bucket ${bucket.name} is ${usage.usagePercent}% full - cleanup needed`);
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('❌ Error checking cleanup need:', error);
            return false;
        }
    }

    /**
     * Start monitoring bucket capacity and trigger cleanup when needed
     */
    startMonitoring() {
        if (this.monitoring) return;
        
        this.monitoring = true;
        console.log('👀 Starting bucket capacity monitoring...');

        // Check every 5 minutes
        setInterval(async () => {
            try {
                if (await this.shouldTriggerCleanup() && !this.cleanupScheduled) {
                    this.cleanupScheduled = true;
                    console.log('🧹 Triggering automatic cleanup...');
                    
                    await this.cleanupOldImages();
                    
                    // Reset flag after cleanup
                    setTimeout(() => {
                        this.cleanupScheduled = false;
                    }, 60000); // 1 minute cooldown
                }
            } catch (error) {
                console.error('❌ Error in monitoring cycle:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Get comprehensive bucket statistics
     */
    async getBucketStatistics() {
        try {
            const imageBuckets = await this.getImageBuckets();
            const stats = {
                buckets: [],
                totalSize: 0,
                totalFiles: 0,
                averageUsage: 0
            };

            for (const bucket of imageBuckets) {
                const usage = await this.getBucketUsage(bucket.name);
                if (usage) {
                    stats.buckets.push(usage);
                    stats.totalSize += usage.totalSize;
                    stats.totalFiles += usage.totalFiles;
                }
            }

            if (stats.buckets.length > 0) {
                stats.averageUsage = stats.buckets.reduce((sum, bucket) => sum + bucket.usagePercent, 0) / stats.buckets.length;
                stats.averageUsage = Math.round(stats.averageUsage * 100) / 100;
            }

            return stats;
        } catch (error) {
            console.error('❌ Error getting bucket statistics:', error);
            return null;
        }
    }

    /**
     * Force cleanup (manual trigger)
     */
    async forceCleanup() {
        console.log('🧹 Manual cleanup triggered...');
        return await this.cleanupOldImages();
    }

    /**
     * Dispose of the manager (cleanup intervals)
     */
    dispose() {
        this.monitoring = false;
        console.log('✅ Image Bucket Manager disposed');
    }
}

// Export for global use
window.ImageBucketManager = ImageBucketManager;

// Export for module use
export default ImageBucketManager;