// ==========================================
// DEBUG SNAPSHOT ISSUES - MANUAL TESTING
// ==========================================
// Quick diagnostic script to identify snapshot issues

const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';

// Debug result object
let debugResults = {
    connection: false,
    mainTable: false,
    snapshotIndex: false,
    snapshotBucket: false,
    edgeFunction: false,
    loadFunction: false,
    errors: []
};

// Main debug function
async function debugSnapshotSystem() {
    console.log('🔍 DEBUGGING SNAPSHOT SYSTEM');
    console.log('=' .repeat(50));
    
    try {
        await testConnection();
        await testMainTable();
        await testSnapshotIndex();
        await testSnapshotBucket();
        await testEdgeFunction();
        await testLoadFunction();
        
        generateDebugReport();
    } catch (error) {
        console.error('❌ Debug error:', error);
        debugResults.errors.push(error.message);
        generateDebugReport();
    }
}

// 1. Test basic connection
async function testConnection() {
    console.log('\n1. 🔌 Testing Supabase Connection...');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            console.log('✅ Supabase connection successful');
            debugResults.connection = true;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        debugResults.errors.push(`Connection: ${error.message}`);
    }
}

// 2. Test main staffTable
async function testMainTable() {
    console.log('\n2. 📋 Testing staffTable...');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/staffTable?select=count&limit=1`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ staffTable accessible');
            console.log(`📊 Records found: ${data.length > 0 ? 'Yes' : 'No data'}`);
            debugResults.mainTable = true;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ staffTable access failed:', error.message);
        debugResults.errors.push(`staffTable: ${error.message}`);
    }
}

// 3. Test snapshot index table
async function testSnapshotIndex() {
    console.log('\n3. 📊 Testing table_snapshots_index...');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=id,snapshot_date,created_at&limit=5`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ table_snapshots_index accessible');
            console.log(`📊 Snapshots found: ${data.length}`);
            
            if (data.length > 0) {
                console.log('📅 Recent snapshots:');
                data.forEach((snap, idx) => {
                    console.log(`   ${idx + 1}. ${snap.snapshot_date} (Created: ${new Date(snap.created_at).toLocaleString()})`);
                });
            } else {
                console.log('⚠️ No snapshots found in index');
            }
            
            debugResults.snapshotIndex = true;
        } else if (response.status === 404) {
            console.error('❌ table_snapshots_index table does not exist');
            debugResults.errors.push('table_snapshots_index table missing - Run create table SQL');
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Snapshot index failed:', error.message);
        debugResults.errors.push(`Snapshot index: ${error.message}`);
    }
}

// 4. Test snapshot storage bucket
async function testSnapshotBucket() {
    console.log('\n4. 🗄️ Testing table-snapshots bucket...');
    try {
        const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket/table-snapshots`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            console.log('✅ table-snapshots bucket exists');
            
            // Try to list objects
            const listResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/list/table-snapshots?limit=5`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            
            if (listResponse.ok) {
                const files = await listResponse.json();
                console.log(`📁 Files in bucket: ${files.length}`);
                files.forEach((file, idx) => {
                    console.log(`   ${idx + 1}. ${file.name}`);
                });
            }
            
            debugResults.snapshotBucket = true;
        } else if (response.status === 404) {
            console.error('❌ table-snapshots bucket does not exist');
            debugResults.errors.push('table-snapshots bucket missing - Create in Supabase Dashboard');
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Bucket test failed:', error.message);
        debugResults.errors.push(`Storage bucket: ${error.message}`);
    }
}

// 5. Test Edge Function
async function testEdgeFunction() {
    console.log('\n5. ⚡ Testing snapshot Edge Function...');
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/snapshot_staff_table`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ test: true })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Edge Function accessible');
            console.log('📊 Response:', result);
            debugResults.edgeFunction = true;
        } else if (response.status === 404) {
            console.error('❌ Edge Function not deployed');
            debugResults.errors.push('Edge Function not deployed - Run: supabase functions deploy snapshot_staff_table');
        } else {
            const errorText = await response.text();
            console.error(`❌ Function error ${response.status}:`, errorText);
            debugResults.errors.push(`Edge Function: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error('❌ Edge Function test failed:', error.message);
        debugResults.errors.push(`Edge Function: ${error.message}`);
    }
}

// 6. Test loadAvailableSnapshots function
async function testLoadFunction() {
    console.log('\n6. 🔄 Testing loadAvailableSnapshots function...');
    try {
        if (typeof window !== 'undefined' && typeof window.loadAvailableSnapshots === 'function') {
            console.log('✅ loadAvailableSnapshots function found');
            
            // Try to call it
            console.log('🔄 Executing loadAvailableSnapshots...');
            await window.loadAvailableSnapshots();
            
            // Check if availableSnapshots was populated
            if (window.availableSnapshots && Array.isArray(window.availableSnapshots)) {
                console.log(`✅ Function executed successfully - ${window.availableSnapshots.length} snapshots loaded`);
                debugResults.loadFunction = true;
            } else {
                console.log('⚠️ Function executed but no snapshots loaded');
                debugResults.errors.push('loadAvailableSnapshots executed but no snapshots loaded');
            }
        } else {
            console.log('❌ loadAvailableSnapshots function not found in window');
            debugResults.errors.push('loadAvailableSnapshots function not found - Check if main script loaded');
        }
    } catch (error) {
        console.error('❌ Load function test failed:', error.message);
        debugResults.errors.push(`Load function: ${error.message}`);
    }
}

// Generate final report
function generateDebugReport() {
    console.log('\n📊 DEBUG REPORT');
    console.log('=' .repeat(50));
    
    console.log('🔍 TEST RESULTS:');
    console.log(`   Connection: ${debugResults.connection ? '✅' : '❌'}`);
    console.log(`   staffTable: ${debugResults.mainTable ? '✅' : '❌'}`);
    console.log(`   Snapshot Index: ${debugResults.snapshotIndex ? '✅' : '❌'}`);
    console.log(`   Storage Bucket: ${debugResults.snapshotBucket ? '✅' : '❌'}`);
    console.log(`   Edge Function: ${debugResults.edgeFunction ? '✅' : '❌'}`);
    console.log(`   Load Function: ${debugResults.loadFunction ? '✅' : '❌'}`);
    
    if (debugResults.errors.length === 0) {
        console.log('\n🎉 ALL TESTS PASSED - Snapshot system should be working!');
        console.log('If snapshots still not showing, check browser console for JavaScript errors');
    } else {
        console.log(`\n🚨 ${debugResults.errors.length} ISSUES FOUND:`);
        debugResults.errors.forEach((error, idx) => {
            console.log(`   ${idx + 1}. ${error}`);
        });
        
        console.log('\n🔧 RECOMMENDED FIXES:');
        if (debugResults.errors.some(e => e.includes('table_snapshots_index'))) {
            console.log('   1. Create table_snapshots_index table (see diagnostic SQL script)');
        }
        if (debugResults.errors.some(e => e.includes('table-snapshots bucket'))) {
            console.log('   2. Create table-snapshots storage bucket in Supabase Dashboard');
        }
        if (debugResults.errors.some(e => e.includes('Edge Function'))) {
            console.log('   3. Deploy Edge Function: supabase functions deploy snapshot_staff_table');
        }
        if (debugResults.errors.some(e => e.includes('loadAvailableSnapshots'))) {
            console.log('   4. Check if main index.html script is loaded properly');
        }
    }
    
    console.log(`\n⏰ Debug completed at: ${new Date().toLocaleString()}`);
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    window.debugSnapshotSystem = debugSnapshotSystem;
    console.log('🚀 Debug script loaded! Run debugSnapshotSystem() to start');
}

// Auto-run if in Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { debugSnapshotSystem };
}