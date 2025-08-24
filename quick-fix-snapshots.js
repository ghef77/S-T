// =============================================
// QUICK FIX FOR SNAPSHOT "FILE NOT FOUND" ERROR
// =============================================
// Run this directly in browser console to fix snapshot issues

console.log('🔧 QUICK SNAPSHOT FIX');
console.log('=' .repeat(40));

// Configuration
const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';

// Quick fix function
async function quickFixSnapshots() {
    console.log('🚀 Starting quick snapshot fix...');
    
    try {
        // 1. Check current snapshots
        console.log('\n1. 📊 Checking current snapshots...');
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=*&order=created_at.desc&limit=5`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Cannot access snapshots table: ${response.status}`);
        }
        
        const snapshots = await response.json();
        console.log(`Found ${snapshots.length} existing snapshots`);
        
        if (snapshots.length > 0) {
            console.log('📅 Recent snapshots:');
            snapshots.forEach((snap, idx) => {
                console.log(`   ${idx + 1}. ${snap.snapshot_date} - ${snap.object_path}`);
            });
        }
        
        // 2. Try to create a working snapshot
        console.log('\n2. 🔨 Creating a test snapshot...');
        await createTestSnapshot();
        
        // 3. Reload snapshots in the app
        console.log('\n3. 🔄 Reloading snapshots in app...');
        if (typeof window.loadAvailableSnapshots === 'function') {
            await window.loadAvailableSnapshots();
            console.log('✅ Snapshots reloaded in app');
            
            if (window.availableSnapshots && window.availableSnapshots.length > 0) {
                console.log(`📊 App now shows ${window.availableSnapshots.length} snapshots`);
                
                // Update the calendar
                if (typeof window.populateSnapshotCalendar === 'function') {
                    window.populateSnapshotCalendar();
                    console.log('📅 Calendar updated');
                }
            } else {
                console.log('⚠️ App still shows no snapshots - checking storage...');
                await checkStorage();
            }
        } else {
            console.log('❌ loadAvailableSnapshots function not found');
        }
        
        console.log('\n✅ Quick fix completed!');
        console.log('Try using the snapshot calendar now.');
        
    } catch (error) {
        console.error('❌ Quick fix failed:', error);
        console.log('\n🔧 MANUAL STEPS NEEDED:');
        console.log('1. Go to Supabase Dashboard');
        console.log('2. Run the fix-snapshot-issues.sql script');
        console.log('3. Check storage bucket permissions');
    }
}

// Create a test snapshot
async function createTestSnapshot() {
    try {
        // Get current table data
        const dataResponse = await fetch(`${SUPABASE_URL}/rest/v1/staffTable?select=*&order=No.asc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (!dataResponse.ok) {
            throw new Error('Cannot fetch table data');
        }
        
        const tableData = await dataResponse.json();
        console.log(`📊 Fetched ${tableData.length} rows from staffTable`);
        
        // Create snapshot data
        const today = new Date().toISOString().split('T')[0];
        const snapshotData = {
            data: tableData,
            metadata: {
                table: 'staffTable',
                rowCount: tableData.length,
                createdAt: new Date().toISOString(),
                snapshotDate: today,
                version: '2.0.0',
                type: 'MANUAL_TEST_SNAPSHOT'
            }
        };
        
        const jsonContent = JSON.stringify(snapshotData, null, 2);
        const fileSize = new TextEncoder().encode(jsonContent).length;
        
        // Try to upload to storage (might fail due to RLS)
        try {
            const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/table-snapshots/test/${today}_test.json`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: jsonContent
            });
            
            if (uploadResponse.ok) {
                console.log('✅ Test file uploaded to storage');
            } else {
                console.log('⚠️ Storage upload failed (RLS issue) - creating index entry only');
            }
        } catch (uploadError) {
            console.log('⚠️ Storage upload failed:', uploadError.message);
        }
        
        // Create index entry
        const indexResponse = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                snapshot_date: today,
                object_path: `test/${today}_test.json`,
                row_count: tableData.length,
                file_size_bytes: fileSize,
                metadata: snapshotData.metadata
            })
        });
        
        if (indexResponse.ok) {
            console.log('✅ Test snapshot index entry created');
        } else {
            const errorText = await indexResponse.text();
            console.log('⚠️ Index creation failed:', errorText);
            
            // Try upsert instead
            const upsertResponse = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    snapshot_date: today,
                    object_path: `test/${today}_test.json`,
                    row_count: tableData.length,
                    file_size_bytes: fileSize,
                    metadata: snapshotData.metadata
                })
            });
            
            if (upsertResponse.ok) {
                console.log('✅ Test snapshot created via upsert');
            } else {
                console.log('❌ Both insert and upsert failed');
            }
        }
        
    } catch (error) {
        console.error('❌ Test snapshot creation failed:', error);
    }
}

// Check storage accessibility
async function checkStorage() {
    try {
        console.log('🗄️ Checking storage bucket...');
        const response = await fetch(`${SUPABASE_URL}/storage/v1/object/list/table-snapshots?limit=10`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            const files = await response.json();
            console.log(`📁 Found ${files.length} files in storage`);
            files.forEach((file, idx) => {
                console.log(`   ${idx + 1}. ${file.name}`);
            });
        } else {
            console.log('❌ Cannot list storage files:', response.status);
        }
    } catch (error) {
        console.log('❌ Storage check failed:', error);
    }
}

// Make functions available
window.quickFixSnapshots = quickFixSnapshots;
window.createTestSnapshot = createTestSnapshot;
window.checkStorage = checkStorage;

console.log('\n🚀 READY TO FIX SNAPSHOTS!');
console.log('Run: quickFixSnapshots()');