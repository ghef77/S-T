// Step-by-Step Snapshot System Debug
// Run this in your browser console to debug step by step

console.log('🔍 === STEP-BY-STEP SNAPSHOT DEBUG ===');

// Step 1: Check basic environment
console.log('\n📋 STEP 1: Basic Environment Check');
console.log('Document ready state:', document.readyState);
console.log('Window loaded:', typeof window !== 'undefined');
console.log('Supabase available:', typeof window.supabase !== 'undefined');

if (typeof window.supabase === 'undefined') {
    console.log('❌ STOP: Supabase is not available. Cannot continue.');
    console.log('Please ensure the page is fully loaded and Supabase is initialized.');
} else {
    console.log('✅ Supabase is available, continuing with tests...');
}

// Step 2: Check Supabase connection
console.log('\n📋 STEP 2: Supabase Connection Test');
console.log('Supabase URL:', window.supabase.supabaseUrl);
console.log('Supabase key length:', window.supabase.supabaseKey?.length || 'No key');

// Step 3: Test database access
console.log('\n📋 STEP 3: Database Access Test');
async function testDatabaseAccess() {
    try {
        console.log('🔄 Testing database connection...');
        
        // Test basic connection
        const { data: testData, error: testError } = await window.supabase
            .from('table_snapshots_index')
            .select('count')
            .limit(1);
        
        if (testError) {
            console.log('❌ Database connection failed:', testError);
            return false;
        }
        
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.log('❌ Database test error:', error);
        return false;
    }
}

// Step 4: Check if tables exist and have data
console.log('\n📋 STEP 4: Table Data Check');
async function checkTableData() {
    try {
        console.log('🔄 Checking table_snapshots_index...');
        
        const { data, error } = await window.supabase
            .from('table_snapshots_index')
            .select('*');
        
        if (error) {
            console.log('❌ Error querying table_snapshots_index:', error);
            return false;
        }
        
        console.log('✅ table_snapshots_index query successful');
        console.log('📊 Records found:', data.length);
        
        if (data.length > 0) {
            console.log('📋 Sample record:', data[0]);
            console.log('🔑 Key fields:');
            console.log('  - snapshot_date:', data[0].snapshot_date);
            console.log('  - object_path:', data[0].object_path);
            console.log('  - row_count:', data[0].row_count);
            console.log('  - created_at:', data[0].created_at);
        } else {
            console.log('⚠️ No records found in table_snapshots_index');
        }
        
        return data.length > 0;
    } catch (error) {
        console.log('❌ Table check error:', error);
        return false;
    }
}

// Step 5: Check storage bucket
console.log('\n📋 STEP 5: Storage Bucket Check');
async function checkStorageBucket() {
    try {
        console.log('🔄 Checking table-snapshots bucket...');
        
        const { data: files, error } = await window.supabase.storage
            .from('table-snapshots')
            .list('', { limit: 100 });
        
        if (error) {
            console.log('❌ Storage bucket error:', error);
            return false;
        }
        
        console.log('✅ Storage bucket access successful');
        console.log('📁 Files found:', files.length);
        
        if (files.length > 0) {
            console.log('📋 Files in bucket:');
            files.forEach((file, index) => {
                console.log(`  ${index + 1}. ${file.name} (${file.metadata?.size || 'unknown size'} bytes)`);
            });
        } else {
            console.log('⚠️ No files found in table-snapshots bucket');
        }
        
        return files.length > 0;
    } catch (error) {
        console.log('❌ Storage check error:', error);
        return false;
    }
}

// Step 6: Test file download
console.log('\n📋 STEP 6: File Download Test');
async function testFileDownload() {
    try {
        // First check if we have data from previous steps
        const { data: snapshots } = await window.supabase
            .from('table_snapshots_index')
            .select('*')
            .limit(1);
        
        if (!snapshots || snapshots.length === 0) {
            console.log('⚠️ No snapshots to test download');
            return false;
        }
        
        const snapshot = snapshots[0];
        console.log('🔄 Testing download of:', snapshot.object_path);
        
        const { data: fileData, error } = await window.supabase.storage
            .from('table-snapshots')
            .download(snapshot.object_path);
        
        if (error) {
            console.log('❌ File download failed:', error);
            return false;
        }
        
        console.log('✅ File download successful');
        console.log('📄 File size:', fileData.size, 'bytes');
        
        // Try to read the content
        const content = await fileData.text();
        console.log('📝 Content preview:', content.substring(0, 200) + '...');
        
        // Try to parse JSON
        try {
            const parsed = JSON.parse(content);
            console.log('✅ JSON parsing successful');
            console.log('📊 Data structure:');
            console.log('  - Has metadata:', !!parsed.snapshot_metadata);
            console.log('  - Has data array:', !!parsed.data);
            console.log('  - Data array length:', parsed.data?.length || 'No data array');
            
            if (parsed.data && Array.isArray(parsed.data)) {
                console.log('✅ Data array is valid and contains', parsed.data.length, 'rows');
            } else {
                console.log('❌ Data array is missing or invalid');
            }
            
        } catch (parseError) {
            console.log('❌ JSON parsing failed:', parseError);
            return false;
        }
        
        return true;
    } catch (error) {
        console.log('❌ Download test error:', error);
        return false;
    }
}

// Step 7: Check global variables
console.log('\n📋 STEP 7: Global Variables Check');
function checkGlobalVariables() {
    console.log('🔍 Checking global snapshot variables...');
    
    const variables = [
        'availableSnapshots',
        'snapshotMode',
        'currentSnapshotDate',
        'currentSnapshotIndex',
        'isHistoryBarVisible'
    ];
    
    variables.forEach(varName => {
        const value = window[varName];
        console.log(`  - ${varName}:`, value);
        if (Array.isArray(value)) {
            console.log(`    Array length: ${value.length}`);
        }
    });
}

// Step 8: Check UI elements
console.log('\n📋 STEP 8: UI Elements Check');
function checkUIElements() {
    console.log('🔍 Checking snapshot UI elements...');
    
    const elements = [
        'history-bar',
        'history-back',
        'history-next',
        'history-date',
        'snapshot-banner'
    ];
    
    elements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            console.log(`✅ ${elementId}:`, element);
            console.log(`  - Visible:`, !element.classList.contains('hidden'));
            console.log(`  - Disabled:`, element.disabled || 'N/A');
        } else {
            console.log(`❌ ${elementId}: Element not found`);
        }
    });
}

// Step 9: Test loadAvailableSnapshots function
console.log('\n📋 STEP 9: Function Test');
async function testLoadFunction() {
    try {
        if (typeof window.loadAvailableSnapshots !== 'function') {
            console.log('❌ loadAvailableSnapshots function not available');
            return false;
        }
        
        console.log('🔄 Testing loadAvailableSnapshots function...');
        
        // Call the function
        await window.loadAvailableSnapshots();
        
        console.log('✅ Function executed successfully');
        console.log('📊 Updated availableSnapshots:', window.availableSnapshots);
        console.log('📊 Length:', window.availableSnapshots?.length || 0);
        
        // Check if UI was updated
        const backBtn = document.getElementById('history-back');
        const nextBtn = document.getElementById('history-next');
        
        if (backBtn) {
            console.log('🔘 Back button disabled:', backBtn.disabled);
        }
        if (nextBtn) {
            console.log('🔘 Next button disabled:', nextBtn.disabled);
        }
        
        return true;
    } catch (error) {
        console.log('❌ Function test error:', error);
        return false;
    }
}

// Main execution function
async function runAllTests() {
    console.log('🚀 Starting comprehensive snapshot system test...\n');
    
    // Run all tests
    const results = {
        databaseAccess: await testDatabaseAccess(),
        tableData: await checkTableData(),
        storageBucket: await checkStorageBucket(),
        fileDownload: await testFileDownload(),
        loadFunction: await testLoadFunction()
    };
    
    // Check global variables and UI
    checkGlobalVariables();
    checkUIElements();
    
    // Summary
    console.log('\n📋 STEP 10: Test Summary');
    console.log('='.repeat(50));
    Object.entries(results).forEach(([test, result]) => {
        console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
    });
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (!results.databaseAccess) {
        console.log('  - Check Supabase connection and credentials');
    }
    if (!results.tableData) {
        console.log('  - Verify table_snapshots_index table exists and has data');
    }
    if (!results.storageBucket) {
        console.log('  - Check table-snapshots bucket exists and is accessible');
    }
    if (!results.fileDownload) {
        console.log('  - Verify file paths match between database and storage');
    }
    if (!results.loadFunction) {
        console.log('  - Check if loadAvailableSnapshots function is properly defined');
    }
    
    console.log('\n🔍 === DEBUG COMPLETE ===');
}

// Make functions available globally
window.runSnapshotDebug = runAllTests;
window.testDatabaseAccess = testDatabaseAccess;
window.checkTableData = checkTableData;
window.checkStorageBucket = checkStorageBucket;
window.testFileDownload = testFileDownload;
window.testLoadFunction = testLoadFunction;

console.log('💡 Available functions:');
console.log('  - window.runSnapshotDebug() - Run all tests');
console.log('  - window.testDatabaseAccess() - Test database connection');
console.log('  - window.checkTableData() - Check table data');
console.log('  - window.checkStorageBucket() - Check storage bucket');
console.log('  - window.testFileDownload() - Test file download');
console.log('  - window.testLoadFunction() - Test load function');

console.log('\n🚀 To run all tests, use: window.runSnapshotDebug()');
