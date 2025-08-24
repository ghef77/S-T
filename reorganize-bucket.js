// =============================================
// REORGANIZE STORAGE BUCKET FILES
// =============================================
// Run this in your browser console after running the SQL script

console.log('🗂️ STARTING STORAGE BUCKET REORGANIZATION');
console.log('=' .repeat(60));

const supabaseConfig = {
    supabaseUrl: 'https://fiecugxopjxzqfdnaqsu.supabase.co',
    supabaseServiceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDUwNTY1NywiZXhwIjoyMDcwMDgxNjU3fQ.5m7nLHxHxOkxQf8maZis7Y7jynqu2dWqIzEbgWvOTcE'
};

async function reorganizeStorageBucket() {
    try {
        console.log('🔑 Creating Supabase service client...');
        
        // Import and create Supabase client
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        const supabase = createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabaseServiceKey);
        
        console.log('✅ Service client created');
        
        // Step 1: Get all current files in the bucket
        console.log('📂 Listing all files in bucket...');
        const { data: allFiles, error: listError } = await supabase.storage
            .from('table-snapshots')
            .list('', { limit: 1000 });
            
        if (listError) {
            throw new Error(`Failed to list files: ${listError.message}`);
        }
        
        console.log(`📊 Found ${allFiles?.length || 0} items in root`);
        
        // Step 2: Get database index to see expected paths
        console.log('📚 Getting database index...');
        const { data: indexData, error: indexError } = await supabase
            .from('table_snapshots_index')
            .select('*')
            .order('snapshot_date', { ascending: false });
            
        if (indexError) {
            throw new Error(`Failed to get index: ${indexError.message}`);
        }
        
        console.log(`📋 Found ${indexData?.length || 0} index entries`);
        
        // Step 3: Process each file
        let movedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        for (const file of allFiles || []) {
            try {
                // Skip folders
                if (!file.metadata) {
                    console.log(`📁 Skipping folder: ${file.name}`);
                    skippedCount++;
                    continue;
                }
                
                // Skip files that are already in the correct format (contain /)
                if (file.name.includes('/')) {
                    console.log(`✅ Already organized: ${file.name}`);
                    skippedCount++;
                    continue;
                }
                
                console.log(`🔄 Processing file: ${file.name}`);
                
                // Determine new path based on file name
                let newPath = '';
                
                if (file.name.includes('MANUAL')) {
                    // Manual snapshot: extract date and time
                    const manualMatch = file.name.match(/(\d{4}-\d{2}-\d{2}).*MANUAL.*(\d{2}-\d{2}-\d{2}).*staffTable/);
                    if (manualMatch) {
                        const [, dateStr, timeStr] = manualMatch;
                        const [year, month, day] = dateStr.split('-');
                        newPath = `${year}/${month}/${day}/MANUAL_${timeStr}_staffTable.json`;
                    } else {
                        // Fallback for manual files
                        const today = new Date();
                        const year = today.getFullYear();
                        const month = (today.getMonth() + 1).toString().padStart(2, '0');
                        const day = today.getDate().toString().padStart(2, '0');
                        newPath = `${year}/${month}/${day}/MANUAL_${file.name}`;
                    }
                } else if (file.name.includes('daily') || file.name.includes('DAILY')) {
                    // Daily snapshot: extract date
                    const dailyMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
                    if (dailyMatch) {
                        const [, dateStr] = dailyMatch;
                        const [year, month, day] = dateStr.split('-');
                        newPath = `${year}/${month}/${day}/DAILY_staffTable.json`;
                    } else {
                        // Fallback for daily files
                        const today = new Date();
                        const year = today.getFullYear();
                        const month = (today.getMonth() + 1).toString().padStart(2, '0');
                        const day = today.getDate().toString().padStart(2, '0');
                        newPath = `${year}/${month}/${day}/DAILY_staffTable.json`;
                    }
                } else {
                    // Unknown file type - try to extract date
                    const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
                    if (dateMatch) {
                        const [, dateStr] = dateMatch;
                        const [year, month, day] = dateStr.split('-');
                        newPath = `${year}/${month}/${day}/${file.name}`;
                    } else {
                        // Put in today's folder as fallback
                        const today = new Date();
                        const year = today.getFullYear();
                        const month = (today.getMonth() + 1).toString().padStart(2, '0');
                        const day = today.getDate().toString().padStart(2, '0');
                        newPath = `${year}/${month}/${day}/${file.name}`;
                    }
                }
                
                console.log(`  📁 Old path: ${file.name}`);
                console.log(`  📁 New path: ${newPath}`);
                
                // Step 4: Copy file to new location
                const { data: copyData, error: copyError } = await supabase.storage
                    .from('table-snapshots')
                    .copy(file.name, newPath);
                    
                if (copyError) {
                    console.error(`  ❌ Copy failed: ${copyError.message}`);
                    errorCount++;
                    continue;
                }
                
                console.log(`  ✅ Copied to new location`);
                
                // Step 5: Delete old file
                const { error: deleteError } = await supabase.storage
                    .from('table-snapshots')
                    .remove([file.name]);
                    
                if (deleteError) {
                    console.warn(`  ⚠️ Delete failed: ${deleteError.message}`);
                    // Don't count as error since copy succeeded
                } else {
                    console.log(`  🗑️ Deleted old file`);
                }
                
                movedCount++;
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (fileError) {
                console.error(`❌ Error processing ${file.name}:`, fileError.message);
                errorCount++;
            }
        }
        
        console.log('=' .repeat(60));
        console.log('📊 REORGANIZATION SUMMARY:');
        console.log(`  ✅ Files moved: ${movedCount}`);
        console.log(`  ⏭️ Files skipped: ${skippedCount}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        console.log('=' .repeat(60));
        
        // Step 6: Verify the new structure
        console.log('🔍 Verifying new structure...');
        const { data: newStructure, error: verifyError } = await supabase.storage
            .from('table-snapshots')
            .list('', { limit: 50 });
            
        if (!verifyError && newStructure) {
            console.log('📁 New bucket structure:');
            for (const item of newStructure.slice(0, 10)) {
                if (!item.metadata) {
                    // It's a folder, list its contents
                    const { data: folderContents } = await supabase.storage
                        .from('table-snapshots')
                        .list(item.name, { limit: 10 });
                    
                    console.log(`  📁 ${item.name}/`);
                    if (folderContents) {
                        folderContents.forEach(subItem => {
                            if (subItem.metadata) {
                                console.log(`    📄 ${subItem.name} (${(subItem.metadata.size / 1024).toFixed(2)} KB)`);
                            }
                        });
                    }
                } else {
                    console.log(`  📄 ${item.name} (${(item.metadata.size / 1024).toFixed(2)} KB)`);
                }
            }
        }
        
        console.log('🎉 REORGANIZATION COMPLETE!');
        console.log('💡 Your app should now be able to find all snapshots correctly.');
        
        return { movedCount, skippedCount, errorCount };
        
    } catch (error) {
        console.error('💥 REORGANIZATION FAILED:', error);
        throw error;
    }
}

// Export function to global scope
window.reorganizeStorageBucket = reorganizeStorageBucket;

console.log('🚀 READY TO REORGANIZE!');
console.log('💡 Run: reorganizeStorageBucket()');
console.log('⚠️  Make sure you\'ve run the SQL script first!');