/**
 * 🧪 MANUAL SNAPSHOT CREATION TEST
 * 
 * This script creates a manual snapshot for testing purposes
 * Run this in the browser console on your main page
 */

(async function createManualSnapshot() {
    console.log('🧪 Starting Manual Snapshot Creation...');
    
    // Ensure we have Supabase available
    if (typeof window.supabase === 'undefined') {
        console.log('📦 Importing Supabase client...');
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        
        const config = {
            supabaseUrl: 'https://fiecugxopjxzqfdnaqsu.supabase.co',
            supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw'
        };
        
        window.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    }
    
    const supabase = window.supabase;
    const results = {
        dataFetched: false,
        snapshotCreated: false,
        indexUpdated: false,
        rowCount: 0,
        fileSize: 0,
        objectPath: '',
        errors: []
    };
    
    try {
        // Step 1: Fetch current table data
        console.log('📊 Step 1: Fetching current table data...');
        
        const { data: tableData, error: fetchError } = await supabase
            .from('staffTable')
            .select('*')
            .order('No', { ascending: true });
        
        if (fetchError) {
            console.error('❌ Failed to fetch table data:', fetchError);
            results.errors.push({ step: 'fetch_data', error: fetchError.message });
            return results;
        }
        
        console.log(`✅ Fetched ${tableData?.length || 0} rows from staffTable`);
        results.dataFetched = true;
        results.rowCount = tableData?.length || 0;
        
        // Step 2: Prepare snapshot data
        console.log('📝 Step 2: Preparing snapshot data...');
        
        const now = new Date();
        const snapshotDate = now.toISOString().split('T')[0];
        const timestamp = now.toISOString().replace(/[:.]/g, '-');
        
        const snapshotData = {
            data: tableData || [],
            metadata: {
                table: 'staffTable',
                rowCount: tableData?.length || 0,
                createdAt: now.toISOString(),
                snapshotDate,
                version: '2.0.0',
                type: 'MANUAL_TEST',
                createdBy: 'manual-snapshot-script',
                purpose: 'Testing and debugging',
                timezone: 'Europe/Paris',
                browserInfo: {
                    userAgent: navigator.userAgent,
                    timestamp: now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
                }
            }
        };
        
        const jsonContent = JSON.stringify(snapshotData, null, 2);
        results.fileSize = new TextEncoder().encode(jsonContent).length;
        
        console.log(`📋 Snapshot prepared: ${results.rowCount} rows, ${(results.fileSize / 1024).toFixed(2)} KB`);
        
        // Step 3: Generate storage path
        console.log('📁 Step 3: Generating storage path...');
        
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        
        // Use a test directory to avoid conflicts with production snapshots
        results.objectPath = `manual-test/${year}/${month}/${day}/MANUAL_TEST_${timestamp}.json`;
        
        console.log(`📁 Storage path: ${results.objectPath}`);
        
        // Step 4: Upload to storage
        console.log('☁️ Step 4: Uploading to storage...');
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('table-snapshots')
            .upload(results.objectPath, jsonContent, {
                contentType: 'application/json',
                upsert: true,
                cacheControl: '3600'
            });
        
        if (uploadError) {
            console.error('❌ Upload failed:', uploadError);
            results.errors.push({ step: 'upload', error: uploadError.message });
            
            // Try to provide helpful error information
            if (uploadError.message.includes('Bucket not found')) {
                console.log('🔧 SOLUTION: Create the storage bucket');
                console.log('   1. Go to Supabase Dashboard > Storage');
                console.log('   2. Create bucket: table-snapshots');
                console.log('   3. Set appropriate permissions');
            } else if (uploadError.message.includes('permission')) {
                console.log('🔧 SOLUTION: Fix storage permissions');
                console.log('   1. Check RLS policies for storage.objects');
                console.log('   2. Allow authenticated users to insert/update');
                console.log('   3. Verify bucket policies');
            }
            
            return results;
        }
        
        console.log('✅ File uploaded successfully:', uploadData);
        results.snapshotCreated = true;
        
        // Step 5: Update snapshots index
        console.log('🗂️ Step 5: Updating snapshots index...');
        
        const { data: indexData, error: indexError } = await supabase
            .from('table_snapshots_index')
            .insert({
                snapshot_date: snapshotDate,
                object_path: results.objectPath,
                row_count: results.rowCount,
                file_size_bytes: results.fileSize,
                metadata: snapshotData.metadata
            })
            .select();
        
        if (indexError) {
            console.error('❌ Index update failed:', indexError);
            results.errors.push({ step: 'index_update', error: indexError.message });
            
            // Try to provide helpful error information
            if (indexError.code === 'PGRST301') {
                console.log('🔧 SOLUTION: Create the snapshots index table');
                console.log('   1. Run the database setup script');
                console.log('   2. Execute diagnostic-database-check.sql');
                console.log('   3. Check table permissions');
            } else if (indexError.message.includes('permission')) {
                console.log('🔧 SOLUTION: Fix table permissions');
                console.log('   1. Check RLS policies for table_snapshots_index');
                console.log('   2. Allow authenticated users to insert');
                console.log('   3. Verify service role access');
            } else if (indexError.code === '23505') { // Unique constraint violation
                console.log('⚠️ Snapshot for this date already exists, trying upsert...');
                
                // Try with upsert instead
                const { data: upsertData, error: upsertError } = await supabase
                    .from('table_snapshots_index')
                    .upsert({
                        snapshot_date: snapshotDate,
                        object_path: results.objectPath,
                        row_count: results.rowCount,
                        file_size_bytes: results.fileSize,
                        metadata: snapshotData.metadata
                    })
                    .select();
                
                if (upsertError) {
                    console.error('❌ Upsert also failed:', upsertError);
                    results.errors.push({ step: 'index_upsert', error: upsertError.message });
                } else {
                    console.log('✅ Index updated with upsert:', upsertData);
                    results.indexUpdated = true;
                }
            }
        } else {
            console.log('✅ Index updated successfully:', indexData);
            results.indexUpdated = true;
        }
        
        // Step 6: Verify the snapshot can be loaded
        if (results.snapshotCreated) {
            console.log('🔍 Step 6: Verifying snapshot can be loaded...');
            
            try {
                const { data: verifyData, error: verifyError } = await supabase.storage
                    .from('table-snapshots')
                    .download(results.objectPath);
                
                if (verifyError) {
                    console.error('❌ Verification download failed:', verifyError);
                    results.errors.push({ step: 'verify_download', error: verifyError.message });
                } else {
                    const verifyText = await verifyData.text();
                    const verifyParsed = JSON.parse(verifyText);
                    
                    console.log('✅ Snapshot verification successful');
                    console.log(`   - Verified ${verifyParsed.data?.length} rows`);
                    console.log(`   - Metadata type: ${verifyParsed.metadata?.type}`);
                    console.log(`   - Created by: ${verifyParsed.metadata?.createdBy}`);
                }
            } catch (verifyError) {
                console.error('❌ Snapshot verification failed:', verifyError);
                results.errors.push({ step: 'verify_snapshot', error: verifyError.message });
            }
        }
        
        // Step 7: Optional - Add to restore log
        console.log('📝 Step 7: Adding to restore log (optional)...');
        
        try {
            const { error: logError } = await supabase
                .from('snapshot_restore_log')
                .insert({
                    snapshot_date: snapshotDate,
                    restored_at: now.toISOString(),
                    restored_by: 'manual-snapshot-script',
                    restore_reason: 'Manual snapshot creation test',
                    row_count: results.rowCount,
                    restore_strategy: 'manual-test'
                });
            
            if (logError) {
                console.warn('⚠️ Could not add to restore log:', logError.message);
                // This is not critical, so we don't add to errors
            } else {
                console.log('✅ Added entry to restore log');
            }
        } catch (logError) {
            console.warn('⚠️ Restore log error:', logError);
        }
        
    } catch (generalError) {
        console.error('❌ General error during snapshot creation:', generalError);
        results.errors.push({ step: 'general', error: generalError.message });
    }
    
    // Generate summary report
    console.log('📊 MANUAL SNAPSHOT CREATION SUMMARY:');
    console.log(`   ✅ Data fetched: ${results.dataFetched} (${results.rowCount} rows)`);
    console.log(`   ✅ Snapshot created: ${results.snapshotCreated}`);
    console.log(`   ✅ Index updated: ${results.indexUpdated}`);
    console.log(`   📁 File path: ${results.objectPath}`);
    console.log(`   💾 File size: ${(results.fileSize / 1024).toFixed(2)} KB`);
    console.log(`   ❌ Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
        console.log('❌ DETAILED ERRORS:');
        results.errors.forEach(error => {
            console.log(`   - ${error.step}: ${error.error}`);
        });
    }
    
    // Overall status
    const success = results.dataFetched && results.snapshotCreated;
    const indexWarning = success && !results.indexUpdated;
    
    if (success && results.indexUpdated) {
        console.log('✅ MANUAL SNAPSHOT CREATED SUCCESSFULLY');
    } else if (success && indexWarning) {
        console.log('⚠️ SNAPSHOT CREATED BUT INDEX NOT UPDATED');
        console.log('   The file exists in storage but may not show in the interface');
    } else {
        console.log('❌ MANUAL SNAPSHOT CREATION FAILED');
    }
    
    return results;
    
})().then(results => {
    console.log('🏁 Manual Snapshot Creation Test Complete');
    
    // Provide next steps
    if (results.snapshotCreated) {
        console.log('🎯 NEXT STEPS:');
        console.log('   1. Refresh your main application page');
        console.log('   2. Check if the snapshot appears in the calendar');
        console.log('   3. Try loading the snapshot to verify functionality');
        console.log('   4. Run loadAvailableSnapshots() to refresh the list');
        
        if (typeof window.loadAvailableSnapshots === 'function') {
            console.log('🔄 Automatically refreshing snapshots list...');
            window.loadAvailableSnapshots().then(() => {
                console.log('✅ Snapshots list refreshed');
                
                if (typeof window.populateSnapshotCalendar === 'function') {
                    window.populateSnapshotCalendar();
                    console.log('✅ Calendar updated');
                }
            }).catch(error => {
                console.error('❌ Failed to refresh snapshots:', error);
            });
        }
    }
    
    // Cleanup recommendation
    if (results.snapshotCreated) {
        console.log('🧹 CLEANUP: To remove test snapshots later, run:');
        console.log(`   DELETE FROM table_snapshots_index WHERE object_path LIKE 'manual-test/%';`);
        console.log('   Then delete files from storage bucket manually');
    }
    
}).catch(error => {
    console.error('💥 Manual Snapshot Creation failed:', error);
});