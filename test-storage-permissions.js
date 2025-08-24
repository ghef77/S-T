/**
 * 🧪 STORAGE PERMISSIONS TEST
 * 
 * This script tests storage bucket permissions and access
 * Run this in the browser console on your main page
 */

(async function testStoragePermissions() {
    console.log('🧪 Starting Storage Permissions Test...');
    
    // Import Supabase if not already available
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
    const bucketName = 'table-snapshots';
    
    console.log(`🗂️ Testing bucket: ${bucketName}`);
    
    const results = {
        bucketExists: false,
        canList: false,
        canUpload: false,
        canDownload: false,
        canDelete: false,
        existingFiles: [],
        errors: []
    };
    
    try {
        // Test 1: Check if bucket exists and list files
        console.log('📋 Test 1: Listing files in storage bucket...');
        
        const { data: files, error: listError } = await supabase.storage
            .from(bucketName)
            .list('', { limit: 10, sortBy: { column: 'updated_at', order: 'desc' } });
        
        if (listError) {
            console.error('❌ List files error:', listError);
            results.errors.push({ test: 'list', error: listError.message });
            
            if (listError.message.includes('Bucket not found')) {
                console.error('❌ Storage bucket does not exist!');
                results.errors.push({ test: 'bucket_existence', error: 'Bucket not found' });
                return results;
            }
        } else {
            console.log('✅ Successfully listed files:', files);
            results.bucketExists = true;
            results.canList = true;
            results.existingFiles = files || [];
        }
        
        // Test 2: Upload a test file
        console.log('📋 Test 2: Testing file upload...');
        
        const testContent = JSON.stringify({
            test: true,
            timestamp: new Date().toISOString(),
            purpose: 'storage_permissions_test'
        }, null, 2);
        
        const testFileName = `test/permissions-test-${Date.now()}.json`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(testFileName, testContent, {
                contentType: 'application/json',
                upsert: true
            });
        
        if (uploadError) {
            console.error('❌ Upload test failed:', uploadError);
            results.errors.push({ test: 'upload', error: uploadError.message });
        } else {
            console.log('✅ Upload test successful:', uploadData);
            results.canUpload = true;
        }
        
        // Test 3: Download the test file
        if (results.canUpload) {
            console.log('📋 Test 3: Testing file download...');
            
            const { data: downloadData, error: downloadError } = await supabase.storage
                .from(bucketName)
                .download(testFileName);
            
            if (downloadError) {
                console.error('❌ Download test failed:', downloadError);
                results.errors.push({ test: 'download', error: downloadError.message });
            } else {
                console.log('✅ Download test successful');
                const text = await downloadData.text();
                const parsed = JSON.parse(text);
                console.log('✅ Downloaded and parsed content:', parsed);
                results.canDownload = true;
            }
        }
        
        // Test 4: Delete the test file
        if (results.canUpload) {
            console.log('📋 Test 4: Testing file deletion...');
            
            const { error: deleteError } = await supabase.storage
                .from(bucketName)
                .remove([testFileName]);
            
            if (deleteError) {
                console.error('❌ Delete test failed:', deleteError);
                results.errors.push({ test: 'delete', error: deleteError.message });
            } else {
                console.log('✅ Delete test successful');
                results.canDelete = true;
            }
        }
        
        // Test 5: Test accessing an existing snapshot file
        if (results.existingFiles.length > 0) {
            console.log('📋 Test 5: Testing access to existing snapshot files...');
            
            // Find a JSON file to test
            const jsonFile = results.existingFiles.find(file => 
                file.name.endsWith('.json') && !file.name.includes('test/')
            );
            
            if (jsonFile) {
                console.log(`📄 Testing access to: ${jsonFile.name}`);
                
                try {
                    const { data: existingFile, error: existingError } = await supabase.storage
                        .from(bucketName)
                        .download(jsonFile.name);
                    
                    if (existingError) {
                        console.error('❌ Failed to access existing file:', existingError);
                        results.errors.push({ test: 'existing_file_access', error: existingError.message });
                    } else {
                        const text = await existingFile.text();
                        const parsed = JSON.parse(text);
                        console.log('✅ Successfully accessed existing snapshot file');
                        console.log(`   - Rows: ${parsed.data?.length || 'unknown'}`);
                        console.log(`   - Created: ${parsed.metadata?.createdAt || 'unknown'}`);
                        console.log(`   - Type: ${parsed.metadata?.type || 'unknown'}`);
                    }
                } catch (accessError) {
                    console.error('❌ Error accessing existing file:', accessError);
                    results.errors.push({ test: 'existing_file_access', error: accessError.message });
                }
            } else {
                console.log('⚠️ No JSON files found to test existing file access');
            }
        }
        
    } catch (generalError) {
        console.error('❌ General storage test error:', generalError);
        results.errors.push({ test: 'general', error: generalError.message });
    }
    
    // Generate summary
    console.log('📊 STORAGE PERMISSIONS TEST SUMMARY:');
    console.log(`   ✅ Bucket exists: ${results.bucketExists}`);
    console.log(`   ✅ Can list files: ${results.canList}`);
    console.log(`   ✅ Can upload files: ${results.canUpload}`);
    console.log(`   ✅ Can download files: ${results.canDownload}`);
    console.log(`   ✅ Can delete files: ${results.canDelete}`);
    console.log(`   📁 Existing files: ${results.existingFiles.length}`);
    console.log(`   ❌ Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
        console.log('❌ ERRORS FOUND:');
        results.errors.forEach(error => {
            console.log(`   - ${error.test}: ${error.error}`);
        });
    }
    
    // Check if all permissions are working
    const allWorking = results.bucketExists && results.canList && results.canUpload && results.canDownload && results.canDelete;
    console.log(`🎯 OVERALL STATUS: ${allWorking ? '✅ ALL PERMISSIONS WORKING' : '❌ SOME PERMISSIONS MISSING'}`);
    
    return results;
    
})().then(results => {
    console.log('🏁 Storage Permissions Test Complete');
    
    // Provide specific recommendations
    if (!results.bucketExists) {
        console.log('🔧 RECOMMENDATION: Create the storage bucket');
        console.log('   1. Go to Supabase Dashboard > Storage');
        console.log('   2. Create new bucket: table-snapshots');
        console.log('   3. Set public access if needed');
    }
    
    if (results.bucketExists && !results.canUpload) {
        console.log('🔧 RECOMMENDATION: Fix upload permissions');
        console.log('   1. Check RLS policies for storage bucket');
        console.log('   2. Ensure authenticated users can insert');
        console.log('   3. Verify service role has full access');
    }
    
    if (results.existingFiles.length === 0) {
        console.log('🔧 RECOMMENDATION: No snapshot files found');
        console.log('   1. Run Edge Function manually to create first snapshot');
        console.log('   2. Or use the manual snapshot creation feature');
    }
    
}).catch(error => {
    console.error('💥 Storage Permissions Test failed:', error);
});

/**
 * STORAGE TROUBLESHOOTING GUIDE
 * 
 * Common Issues and Solutions:
 * 
 * 1. BUCKET NOT FOUND:
 *    - Go to Supabase Dashboard > Storage
 *    - Create bucket: table-snapshots
 *    - Set appropriate permissions
 * 
 * 2. PERMISSION DENIED:
 *    - Check RLS policies on storage.objects table
 *    - Ensure authenticated users can read/write
 *    - Verify service role has admin access
 * 
 * 3. CORS ISSUES:
 *    - Check allowed origins in Storage settings
 *    - Ensure your domain is whitelisted
 * 
 * 4. UPLOAD FAILS:
 *    - Check file size limits
 *    - Verify content type settings
 *    - Check bucket quotas
 * 
 * 5. DOWNLOAD FAILS:
 *    - Verify file exists
 *    - Check download permissions
 *    - Test with different file paths
 */