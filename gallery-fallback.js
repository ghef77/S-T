/**
 * Gallery Fallback Handler
 * Provides offline functionality and error recovery for gallery when Supabase is unavailable
 */

class GalleryFallback {
    constructor() {
        this.offlineImages = new Map();
        this.isOnline = navigator.onLine;
        this.errorRecoveryAttempts = 0;
        this.maxRecoveryAttempts = 3;
        this.fallbackImageSources = [];
        
        this.init();
    }

    init() {
        this.setupNetworkListeners();
        this.setupSupabaseErrorHandling();
        this.generateFallbackImages();
        
        console.log('🔄 Gallery Fallback initialized - providing offline support');
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.errorRecoveryAttempts = 0;
            console.log('🌐 Network restored - attempting gallery recovery');
            this.attemptGalleryRecovery();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 Network lost - switching to fallback mode');
            this.enableOfflineMode();
        });
    }

    setupSupabaseErrorHandling() {
        // Override console.error to catch Supabase 401 errors
        const originalError = console.error;
        console.error = (...args) => {
            const errorMessage = args.join(' ');
            
            if (errorMessage.includes('401') || errorMessage.includes('Database connection error')) {
                this.handleSupabaseError(errorMessage);
            }
            
            originalError.apply(console, args);
        };

        // Intercept fetch requests to Supabase
        if (window.fetch) {
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                const [url] = args;
                
                try {
                    const response = await originalFetch.apply(this, args);
                    
                    // Handle Supabase 401 errors
                    if (response.status === 401 && typeof url === 'string' && url.includes('supabase.co')) {
                        console.warn('🔐 Supabase authentication failed - using fallback');
                        this.handleSupabaseError(`401 error for ${url}`);
                        
                        // Return mock successful response for gallery endpoints
                        if (url.includes('gallery_images') || url.includes('staffTable')) {
                            return new Response(JSON.stringify([]), {
                                status: 200,
                                headers: { 'Content-Type': 'application/json' }
                            });
                        }
                    }
                    
                    return response;
                } catch (error) {
                    if (typeof url === 'string' && url.includes('supabase.co')) {
                        console.warn('🔌 Supabase network error - using fallback');
                        this.handleSupabaseError(`Network error for ${url}`);
                        
                        // Return empty array for data endpoints
                        if (url.includes('gallery_images') || url.includes('staffTable')) {
                            return new Response(JSON.stringify([]), {
                                status: 200,
                                headers: { 'Content-Type': 'application/json' }
                            });
                        }
                    }
                    
                    throw error;
                }
            };
        }
    }

    handleSupabaseError(errorMessage) {
        this.errorRecoveryAttempts++;
        
        if (this.errorRecoveryAttempts <= this.maxRecoveryAttempts) {
            console.log(`🔄 Supabase error detected (attempt ${this.errorRecoveryAttempts}/${this.maxRecoveryAttempts})`);
            
            // Try recovery after delay
            setTimeout(() => {
                this.attemptGalleryRecovery();
            }, 2000 * this.errorRecoveryAttempts);
        } else {
            console.log('⚠️ Max recovery attempts reached - enabling persistent fallback mode');
            this.enablePersistentFallbackMode();
        }
    }

    attemptGalleryRecovery() {
        if (window.simpleGallery && this.isOnline) {
            console.log('🔄 Attempting gallery recovery...');
            
            // Try to reinitialize Supabase connection
            if (window.simpleGallery.initializeSupabase) {
                window.simpleGallery.initializeSupabase()
                    .then(() => {
                        console.log('✅ Gallery recovery successful');
                        window.simpleGallery.loadImages();
                    })
                    .catch(() => {
                        console.log('❌ Gallery recovery failed - using fallback');
                        this.provideFallbackImages();
                    });
            } else {
                this.provideFallbackImages();
            }
        }
    }

    enableOfflineMode() {
        this.showOfflineMessage();
        this.provideFallbackImages();
    }

    enablePersistentFallbackMode() {
        this.showPersistentFallbackMessage();
        this.provideFallbackImages();
    }

    generateFallbackImages() {
        // Generate placeholder images for when Supabase is unavailable
        this.fallbackImageSources = [
            this.createPlaceholderImage(400, 300, 'Sample Image 1', '#3B82F6'),
            this.createPlaceholderImage(400, 300, 'Sample Image 2', '#10B981'),
            this.createPlaceholderImage(400, 300, 'Sample Image 3', '#8B5CF6'),
            this.createPlaceholderImage(400, 300, 'Sample Image 4', '#F59E0B'),
            this.createPlaceholderImage(400, 300, 'Sample Image 5', '#EF4444'),
            this.createPlaceholderImage(400, 300, 'Sample Image 6', '#06B6D4'),
        ];
    }

    createPlaceholderImage(width, height, text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        
        // Overlay pattern
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < width; i += 20) {
            for (let j = 0; j < height; j += 20) {
                if ((i / 20 + j / 20) % 2 === 0) {
                    ctx.fillRect(i, j, 20, 20);
                }
            }
        }
        
        // Icon
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🖼️', width / 2, height / 2 - 20);
        
        // Text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, width / 2, height / 2 + 30);
        
        // Subtitle
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText('Demo Gallery Image', width / 2, height / 2 + 50);
        
        return canvas.toDataURL();
    }

    provideFallbackImages() {
        if (!window.simpleGallery) {
            console.log('⚠️ SimpleGallery not available for fallback');
            return;
        }

        console.log('🔄 Providing fallback images...');
        
        // Create fallback image data
        const fallbackImages = this.fallbackImageSources.map((dataUrl, index) => ({
            name: `fallback-image-${index + 1}.png`,
            url: dataUrl,
            size: 50000, // Approximate size
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            bucketName: 'fallback-images'
        }));

        // Update gallery with fallback images
        window.simpleGallery.images = fallbackImages;
        window.simpleGallery.renderGallery();
        window.simpleGallery.updateImageCount();

        console.log(`✅ Provided ${fallbackImages.length} fallback images`);
        
        // Show fallback message
        this.showFallbackMessage(fallbackImages.length);
    }

    showOfflineMessage() {
        this.showMessage(
            '📴 You are offline. Showing cached images.',
            'info',
            5000
        );
    }

    showPersistentFallbackMessage() {
        this.showMessage(
            '🔐 Database connection unavailable. Showing demo images.',
            'warning',
            7000
        );
    }

    showFallbackMessage(imageCount) {
        this.showMessage(
            `🖼️ Showing ${imageCount} demo images. Check your connection or database access.`,
            'info',
            5000
        );
    }

    showMessage(message, type = 'info', duration = 3000) {
        // Create toast message
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm transition-all duration-300 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-black' :
            'bg-blue-500 text-white'
        }`;
        
        toast.innerHTML = `
            <div class="flex items-start space-x-2">
                <div class="flex-shrink-0">
                    <i class="fas fa-${
                        type === 'success' ? 'check-circle' : 
                        type === 'error' ? 'exclamation-circle' : 
                        type === 'warning' ? 'exclamation-triangle' : 
                        'info-circle'
                    }"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium">${message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="flex-shrink-0 text-white/80 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, duration);
    }

    // Enable demo mode for testing
    enableDemoMode() {
        console.log('🎭 Enabling gallery demo mode...');
        this.provideFallbackImages();
        
        // Add demo mode indicator
        const demoIndicator = document.createElement('div');
        demoIndicator.id = 'demo-mode-indicator';
        demoIndicator.className = 'fixed top-2 left-2 bg-purple-600 text-white px-3 py-1 rounded-full text-sm z-50 animate-pulse';
        demoIndicator.innerHTML = '🎭 Demo Mode';
        document.body.appendChild(demoIndicator);

        return true;
    }

    // Disable demo mode
    disableDemoMode() {
        const indicator = document.getElementById('demo-mode-indicator');
        if (indicator) {
            indicator.remove();
        }
        
        // Try to reload real images
        if (window.simpleGallery && this.isOnline) {
            window.simpleGallery.loadImages();
        }
    }

    // Get fallback status
    getStatus() {
        return {
            isOnline: this.isOnline,
            errorRecoveryAttempts: this.errorRecoveryAttempts,
            maxRecoveryAttempts: this.maxRecoveryAttempts,
            fallbackImagesCount: this.fallbackImageSources.length,
            hasOfflineImages: this.offlineImages.size > 0
        };
    }
}

// Auto-initialize fallback handler
if (typeof window !== 'undefined') {
    window.GalleryFallback = GalleryFallback;
    
    // Initialize fallback handler when DOM is ready
    const initializeFallback = () => {
        if (!window.galleryFallback) {
            window.galleryFallback = new GalleryFallback();
            
            // Add global helper functions
            window.enableGalleryDemo = () => window.galleryFallback.enableDemoMode();
            window.disableGalleryDemo = () => window.galleryFallback.disableDemoMode();
            window.getGalleryFallbackStatus = () => window.galleryFallback.getStatus();
            
            console.log('✅ Gallery Fallback initialized');
            console.log('💡 Use enableGalleryDemo() to test demo mode');
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFallback);
    } else {
        initializeFallback();
    }
}

export default GalleryFallback;