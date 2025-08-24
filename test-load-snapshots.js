/**
 * 🧪 LOAD SNAPSHOTS FUNCTIONALITY TEST
 * 
 * This script tests the loadAvailableSnapshots function and related functionality
 * Run this in the browser console on your main page (index.html)
 */

(async function testLoadSnapshots() {
    console.log('🧪 Starting Load Snapshots Functionality Test...');
    
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
        databaseConnection: false,
        tableExists: false,
        canQuerySnapshots: false,
        snapshotsFound: 0,
        canLoadSnapshotFile: false,
        loadAvailableFunctionWorks: false,
        errors: []
    };
    
    try {
        // Test 1: Database connection
        console.log('📋 Test 1: Testing database connection...');
        
        const { data: testConnection, error: connectionError } = await supabase
            .from('staffTable')
            .select('count')
            .limit(1);
        
        if (connectionError) {
            console.error('❌ Database connection failed:', connectionError);
            results.errors.push({ test: 'database_connection', error: connectionError.message });
        } else {
            console.log('✅ Database connection successful');
            results.databaseConnection = true;
        }
        
        // Test 2: Check if snapshots index table exists
        console.log('📋 Test 2: Checking snapshots index table...');
        
        const { data: tableTest, error: tableError } = await supabase
            .from('table_snapshots_index')
            .select('*')
            .limit(1);
        
        if (tableError) {
            console.error('❌ Snapshots table access failed:', tableError);
            results.errors.push({ test: 'snapshots_table', error: tableError.message });
            
            if (tableError.code === 'PGRST301' || tableError.message.includes('does not exist')) {
                console.error('❌ Table table_snapshots_index does not exist!');
                console.log('🔧 You need to run the database setup script first');
            }
        } else {
            console.log('✅ Snapshots table exists and accessible');
            results.tableExists = true;
        }
        
        // Test 3: Query all snapshots
        if (results.tableExists) {
            console.log('📋 Test 3: Querying all snapshots...');
            
            const { data: snapshots, error: queryError } = await supabase
                .from('table_snapshots_index')
                .select('id, snapshot_date, created_at, row_count, object_path, file_size_bytes')
                .order('created_at', { ascending: false });
            
            if (queryError) {
                console.error('❌ Failed to query snapshots:', queryError);
                results.errors.push({ test: 'query_snapshots', error: queryError.message });
            } else {
                console.log(`✅ Successfully queried snapshots: ${snapshots?.length || 0} found`);
                results.canQuerySnapshots = true;
                results.snapshotsFound = snapshots?.length || 0;
                
                if (snapshots && snapshots.length > 0) {
                    console.log('📊 Sample snapshots:');
                    snapshots.slice(0, 3).forEach(snapshot => {
                        console.log(`   - ${snapshot.snapshot_date}: ${snapshot.row_count} rows (${(snapshot.file_size_bytes / 1024).toFixed(2)} KB)`);
                    });
                }
            }
        }
        
        // Test 4: Test loading a snapshot file
        if (results.snapshotsFound > 0) {
            console.log('📋 Test 4: Testing snapshot file loading...');
            
            // Get the most recent snapshot
            const { data: recentSnapshots, error: recentError } = await supabase
                .from('table_snapshots_index')
                .select('object_path, snapshot_date')
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (recentError) {
                console.error('❌ Failed to get recent snapshot:', recentError);
                results.errors.push({ test: 'get_recent_snapshot', error: recentError.message });
            } else if (recentSnapshots && recentSnapshots.length > 0) {
                const snapshot = recentSnapshots[0];
                console.log(`📄 Testing file: ${snapshot.object_path}`);
                
                try {
                    const { data: fileData, error: downloadError } = await supabase.storage
                        .from('table-snapshots')
                        .download(snapshot.object_path);
                    
                    if (downloadError) {
                        console.error('❌ Failed to download snapshot file:', downloadError);
                        results.errors.push({ test: 'download_snapshot', error: downloadError.message });
                    } else {
                        const text = await fileData.text();
                        const parsed = JSON.parse(text);
                        
                        console.log('✅ Successfully loaded and parsed snapshot file');
                        console.log(`   - Data rows: ${parsed.data?.length || 0}`);
                        console.log(`   - Snapshot date: ${parsed.metadata?.snapshotDate || 'unknown'}`);
                        console.log(`   - Created at: ${parsed.metadata?.createdAt || 'unknown'}`);
                        console.log(`   - Type: ${parsed.metadata?.type || 'unknown'}`);
                        
                        results.canLoadSnapshotFile = true;
                    }
                } catch (parseError) {
                    console.error('❌ Failed to parse snapshot file:', parseError);
                    results.errors.push({ test: 'parse_snapshot', error: parseError.message });
                }
            }
        }
        
        // Test 5: Test the actual loadAvailableSnapshots function
        console.log('📋 Test 5: Testing loadAvailableSnapshots function...');
        
        if (typeof window.loadAvailableSnapshots === 'function') {
            console.log('✅ loadAvailableSnapshots function found');
            
            try {
                await window.loadAvailableSnapshots();
                console.log('✅ loadAvailableSnapshots executed successfully');
                results.loadAvailableFunctionWorks = true;
                
                // Check if global snapshots variable was populated
                if (typeof window.availableSnapshots !== 'undefined') {
                    console.log(`✅ availableSnapshots populated: ${window.availableSnapshots.length} snapshots`);
                } else {
                    console.log('⚠️ availableSnapshots global variable not found');
                }
                
            } catch (functionError) {
                console.error('❌ loadAvailableSnapshots function failed:', functionError);
                results.errors.push({ test: 'load_available_snapshots', error: functionError.message });
            }
        } else {
            console.error('❌ loadAvailableSnapshots function not found');
            console.log('⚠️ Make sure you are running this on the main page (index.html)');
            results.errors.push({ test: 'function_availability', error: 'Function not found in global scope' });
        }
        
        // Test 6: Test calendar population (if available)
        console.log('📋 Test 6: Testing calendar population...');
        
        if (typeof window.populateSnapshotCalendar === 'function') {
            try {
                window.populateSnapshotCalendar();
                console.log('✅ populateSnapshotCalendar executed');
                
                // Check if calendar was populated
                const calendarElement = document.querySelector('.calendar-grid');
                if (calendarElement) {
                    const dayElements = calendarElement.querySelectorAll('.day');
                    const snapshotDays = Array.from(dayElements).filter(day => 
                        day.classList.contains('has-snapshot')
                    );
                    console.log(`✅ Calendar populated: ${snapshotDays.length} days with snapshots`);
                } else {
                    console.log('⚠️ Calendar element not found');
                }
            } catch (calendarError) {
                console.error('❌ populateSnapshotCalendar failed:', calendarError);
                results.errors.push({ test: 'calendar_population', error: calendarError.message });
            }
        } else {
            console.log('⚠️ populateSnapshotCalendar function not found');
        }
        
    } catch (generalError) {
        console.error('❌ General test error:', generalError);
        results.errors.push({ test: 'general', error: generalError.message });
    }
    
    // Generate summary report
    console.log('📊 LOAD SNAPSHOTS TEST SUMMARY:');
    console.log(`   ✅ Database connection: ${results.databaseConnection}`);
    console.log(`   ✅ Snapshots table exists: ${results.tableExists}`);
    console.log(`   ✅ Can query snapshots: ${results.canQuerySnapshots}`);
    console.log(`   📊 Snapshots found: ${results.snapshotsFound}`);
    console.log(`   ✅ Can load snapshot files: ${results.canLoadSnapshotFile}`);
    console.log(`   ✅ loadAvailableSnapshots works: ${results.loadAvailableFunctionWorks}`);
    console.log(`   ❌ Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
        console.log('❌ DETAILED ERRORS:');
        results.errors.forEach(error => {
            console.log(`   - ${error.test}: ${error.error}`);
        });
    }
    
    // Overall status
    const criticalIssues = !results.databaseConnection || !results.tableExists;
    const functionalIssues = !results.canQuerySnapshots || !results.loadAvailableFunctionWorks;
    
    if (criticalIssues) {
        console.log('🚨 CRITICAL ISSUES FOUND - Basic infrastructure missing');
    } else if (functionalIssues) {
        console.log('⚠️ FUNCTIONAL ISSUES FOUND - Some features not working');
    } else if (results.snapshotsFound === 0) {
        console.log('📝 NO SNAPSHOTS FOUND - System working but no data');
    } else {
        console.log('✅ ALL TESTS PASSED - Snapshot system fully functional');
    }
    
    return results;
    
})().then(results => {
    console.log('🏁 Load Snapshots Test Complete');
    
    // Provide specific recommendations based on results
    if (!results.tableExists) {
        console.log('🔧 CRITICAL: Run database setup script');
        console.log('   1. Execute diagnostic-database-check.sql in Supabase SQL Editor');
        console.log('   2. If missing, run setup-snapshot-infrastructure.sql');
        console.log('   3. Verify table permissions and RLS policies');
    }
    
    if (results.tableExists && results.snapshotsFound === 0) {
        console.log('🔧 RECOMMENDATION: Create first snapshot');
        console.log('   1. Run Edge Function manually');
        console.log('   2. Or use the test-snapshot-functionality.html page');
        console.log('   3. Check if cron job is working');
    }
    
    if (!results.canLoadSnapshotFile && results.snapshotsFound > 0) {
        console.log('🔧 RECOMMENDATION: Fix storage access');
        console.log('   1. Check storage bucket permissions');
        console.log('   2. Verify file paths in database match storage');
        console.log('   3. Run test-storage-permissions.js');
    }
    
    if (!results.loadAvailableFunctionWorks) {
        console.log('🔧 RECOMMENDATION: Check main application');
        console.log('   1. Ensure you are on the main page (index.html)');
        console.log('   2. Check browser console for JavaScript errors');
        console.log('   3. Verify Supabase client is properly initialized');
    }
    
}).catch(error => {
    console.error('💥 Load Snapshots Test failed:', error);
});