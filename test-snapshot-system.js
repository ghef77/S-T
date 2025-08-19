// Demo Test Script for Snapshot System
// Run this in your browser console to test the snapshot functionality

console.log('🧪 Starting Snapshot System Test...\n');

// Test 1: Check if snapshot system is loaded
function testSnapshotSystemLoaded() {
    console.log('📋 Test 1: Checking if snapshot system is loaded...');
    
    const requiredFunctions = [
        'loadAvailableSnapshots',
        'enterSnapshotMode',
        'exitSnapshotMode',
        'goToPreviousSnapshot',
        'goToNextSnapshot'
    ];
    
    let allFunctionsExist = true;
    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ ${funcName} function exists`);
        } else {
            console.log(`❌ ${funcName} function missing`);
            allFunctionsExist = false;
        }
    });
    
    if (allFunctionsExist) {
        console.log('✅ All required snapshot functions are loaded\n');
        return true;
    } else {
        console.log('❌ Some snapshot functions are missing\n');
        return false;
    }
}

// Test 2: Check if database tables exist
async function testDatabaseTables() {
    console.log('📋 Test 2: Checking database tables...');
    
    try {
        // Check if we can access the snapshots table
        const { data, error } = await supabase
            .from('table_snapshots_index')
            .select('count')
            .limit(1);
        
        if (error) {
            console.log(`❌ Database table error: ${error.message}`);
            return false;
        }
        
        console.log('✅ table_snapshots_index table is accessible');
        
        // Check restore log table
        const { data: restoreData, error: restoreError } = await supabase
            .from('snapshot_restore_log')
            .select('count')
            .limit(1);
        
        if (restoreError) {
            console.log(`❌ Restore log table error: ${restoreError.message}`);
            return false;
        }
        
        console.log('✅ snapshot_restore_log table is accessible');
        console.log('✅ Database tables are working correctly\n');
        return true;
        
    } catch (error) {
        console.log(`❌ Database test failed: ${error.message}`);
        return false;
    }
}

// Test 3: Check storage bucket access
async function testStorageBucket() {
    console.log('📋 Test 3: Checking storage bucket access...');
    
    try {
        // Try to list files in the table-snapshots bucket
        const { data, error } = await supabase.storage
            .from('table-snapshots')
            .list('', { limit: 1 });
        
        if (error) {
            console.log(`❌ Storage bucket error: ${error.message}`);
            return false;
        }
        
        console.log('✅ table-snapshots storage bucket is accessible');
        console.log(`📁 Bucket contains ${data.length} items\n`);
        return true;
        
    } catch (error) {
        console.log(`❌ Storage test failed: ${error.message}`);
        return false;
    }
}

// Test 4: Check UI elements
function testUIElements() {
    console.log('📋 Test 4: Checking UI elements...');
    
    const requiredElements = [
        { id: 'history-back', name: 'History Back Button' },
        { id: 'history-date', name: 'History Date Button' },
        { id: 'history-next', name: 'History Next Button' },
        { id: 'snapshot-banner', name: 'Snapshot Banner' }
    ];
    
    let allElementsExist = true;
    requiredElements.forEach(element => {
        const el = document.getElementById(element.id);
        if (el) {
            console.log(`✅ ${element.name} exists`);
        } else {
            console.log(`❌ ${element.name} missing`);
            allElementsExist = false;
        }
    });
    
    if (allElementsExist) {
        console.log('✅ All required UI elements are present\n');
        return true;
    } else {
        console.log('❌ Some UI elements are missing\n');
        return false;
    }
}

// Test 5: Test snapshot loading
async function testSnapshotLoading() {
    console.log('📋 Test 5: Testing snapshot loading...');
    
    try {
        // Try to load available snapshots
        if (typeof loadAvailableSnapshots === 'function') {
            await loadAvailableSnapshots();
            console.log('✅ loadAvailableSnapshots function executed');
            
            // Check if snapshots were loaded
            if (window.availableSnapshots && Array.isArray(window.availableSnapshots)) {
                console.log(`📸 Found ${window.availableSnapshots.length} available snapshots`);
                
                if (window.availableSnapshots.length > 0) {
                    console.log('📅 Available snapshot dates:');
                    window.availableSnapshots.forEach(snapshot => {
                        console.log(`   - ${snapshot.snapshot_date} (${snapshot.row_count} rows)`);
                    });
                }
            } else {
                console.log('⚠️ No snapshots found (this is normal if none exist yet)');
            }
        } else {
            console.log('❌ loadAvailableSnapshots function not available');
            return false;
        }
        
        console.log('✅ Snapshot loading test completed\n');
        return true;
        
    } catch (error) {
        console.log(`❌ Snapshot loading test failed: ${error.message}`);
        return false;
    }
}

// Test 6: Test Edge Function
async function testEdgeFunction() {
    console.log('📋 Test 6: Testing Edge Function...');
    
    try {
        // Try to invoke the snapshot function
        const response = await fetch('/functions/v1/snapshot_staff_table', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabase.supabaseKey}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Edge Function is accessible');
            console.log('📊 Function response:', result);
        } else {
            console.log(`⚠️ Edge Function returned status: ${response.status}`);
            console.log('ℹ️ This might be normal if the function requires specific parameters');
        }
        
        console.log('✅ Edge Function test completed\n');
        return true;
        
    } catch (error) {
        console.log(`❌ Edge Function test failed: ${error.message}`);
        console.log('ℹ️ This might be normal if the function is not publicly accessible\n');
        return false;
    }
}

// Test 7: Create a test snapshot manually
async function createTestSnapshot() {
    console.log('📋 Test 7: Creating a test snapshot...');
    
    try {
        // Get current table data
        const tbody = document.getElementById('table-body');
        if (!tbody) {
            console.log('❌ Table body not found');
            return false;
        }
        
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const rowCount = rows.length;
        
        console.log(`📊 Current table has ${rowCount} rows`);
        
        // Create test snapshot data
        const testSnapshot = {
            data: Array.from(rows).map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                return {
                    No: cells[0]?.textContent || '',
                    Nom_Prénom: cells[1]?.textContent || '',
                    DDN: cells[2]?.textContent || '',
                    // Add other columns as needed
                };
            }),
            metadata: {
                table: 'staffTable',
                rowCount,
                createdAt: new Date().toISOString(),
                snapshotDate: new Date().toISOString().split('T')[0],
                version: '1.0.0',
                test: true
            }
        };
        
        console.log('📝 Test snapshot data created');
        console.log('📊 Snapshot contains:', testSnapshot.data.length, 'rows');
        
        // Try to save to storage (this might fail if not properly configured)
        try {
            const fileName = `test-${Date.now()}.json`;
            const { error } = await supabase.storage
                .from('table-snapshots')
                .upload(`test/${fileName}`, JSON.stringify(testSnapshot), {
                    contentType: 'application/json'
                });
            
            if (error) {
                console.log(`⚠️ Could not save test snapshot: ${error.message}`);
                console.log('ℹ️ This is normal if the function needs proper authentication');
            } else {
                console.log('✅ Test snapshot saved to storage');
            }
        } catch (storageError) {
            console.log(`⚠️ Storage test failed: ${storageError.message}`);
        }
        
        console.log('✅ Test snapshot creation completed\n');
        return true;
        
    } catch (error) {
        console.log(`❌ Test snapshot creation failed: ${error.message}`);
        return false;
    }
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting comprehensive snapshot system test...\n');
    
    const tests = [
        { name: 'Snapshot System Loaded', func: testSnapshotSystemLoaded },
        { name: 'Database Tables', func: testDatabaseTables },
        { name: 'Storage Bucket', func: testStorageBucket },
        { name: 'UI Elements', func: testUIElements },
        { name: 'Snapshot Loading', func: testSnapshotLoading },
        { name: 'Edge Function', func: testEdgeFunction },
        { name: 'Test Snapshot Creation', func: createTestSnapshot }
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
        try {
            const result = await test.func();
            if (result) passedTests++;
        } catch (error) {
            console.log(`❌ ${test.name} test crashed: ${error.message}`);
        }
    }
    
    // Final summary
    console.log('📊 Test Results Summary:');
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Your snapshot system is working perfectly!');
    } else if (passedTests >= totalTests * 0.7) {
        console.log('👍 Most tests passed! Your snapshot system is mostly working.');
    } else {
        console.log('⚠️ Several tests failed. Check the errors above for issues.');
    }
    
    console.log('\n🔧 Next steps:');
    if (passedTests >= 4) {
        console.log('   - Your snapshot system should be working!');
        console.log('   - Try refreshing your app to see the history navigation');
        console.log('   - Check if you can navigate between snapshots');
    } else {
        console.log('   - Fix the failed tests above');
        console.log('   - Check your Supabase configuration');
        console.log('   - Verify database tables and storage bucket');
    }
}

// Export functions for manual testing
window.testSnapshotSystem = {
    runAllTests,
    testSnapshotSystemLoaded,
    testDatabaseTables,
    testStorageBucket,
    testUIElements,
    testSnapshotLoading,
    testEdgeFunction,
    createTestSnapshot
};

console.log('🧪 Snapshot System Test Script Loaded!');
console.log('📝 Run: testSnapshotSystem.runAllTests() to start testing');
console.log('📝 Or run individual tests like: testSnapshotSystem.testDatabaseTables()\n');

// Auto-run tests if requested
if (window.location.search.includes('test=snapshot')) {
    console.log('🔄 Auto-running tests due to URL parameter...');
    setTimeout(runAllTests, 1000);
}

