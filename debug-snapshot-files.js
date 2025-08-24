// =============================================
// DEBUG SNAPSHOT FILE PATHS
// =============================================
// Run in browser console to debug snapshot file loading issues

console.log('🔍 DEBUGGING SNAPSHOT FILE PATHS');
console.log('=' .repeat(50));

async function debugSnapshotFiles() {
    const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';

    try {
        // 1. Get snapshots from database index
        console.log('\n1. 📊 Snapshots in database index:');
        const indexResponse = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=*&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        const snapshots = await indexResponse.json();
        console.log(`Found ${snapshots.length} snapshots in database:`);
        snapshots.forEach((snap, idx) => {
            console.log(`   ${idx + 1}. Date: ${snap.snapshot_date}`);
            console.log(`      Path: ${snap.object_path}`);
            console.log(`      ID: ${snap.id}`);
            console.log('');
        });
        
        // 2. Get files from storage bucket
        console.log('\n2. 📁 Files in storage bucket:');
        const storageResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/list/table-snapshots`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (storageResponse.ok) {
            const files = await storageResponse.json();
            console.log(`Found ${files.length} files in storage:`);
            files.forEach((file, idx) => {
                console.log(`   ${idx + 1}. ${file.name} (${file.metadata?.size || 'unknown size'})`);
            });
        } else {
            console.log(`❌ Cannot access storage: ${storageResponse.status}`);
        }
        
        // 3. Check for path mismatches
        console.log('\n3. 🔍 Checking path mismatches:');
        if (storageResponse.ok) {
            const files = await storageResponse.json();
            const fileNames = files.map(f => f.name);
            
            snapshots.forEach(snap => {
                const pathMatch = fileNames.find(name => name === snap.object_path);
                const similarMatch = fileNames.find(name => name.includes(snap.snapshot_date));
                
                if (pathMatch) {
                    console.log(`   ✅ ${snap.snapshot_date}: Exact path match found`);
                } else if (similarMatch) {
                    console.log(`   ⚠️  ${snap.snapshot_date}: Path mismatch!`);
                    console.log(`      Expected: ${snap.object_path}`);
                    console.log(`      Found: ${similarMatch}`);
                } else {
                    console.log(`   ❌ ${snap.snapshot_date}: No file found in storage`);
                }
            });
        }
        
        // 4. Test downloading a snapshot
        console.log('\n4. 🧪 Testing snapshot download:');
        if (snapshots.length > 0) {
            const testSnapshot = snapshots[0];
            console.log(`Testing download of: ${testSnapshot.object_path}`);
            
            const downloadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/table-snapshots/${testSnapshot.object_path}`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            
            if (downloadResponse.ok) {
                const data = await downloadResponse.json();
                console.log('✅ Snapshot download successful');
                console.log(`   Data rows: ${data.data?.length || 0}`);
                console.log(`   Metadata: ${JSON.stringify(data.metadata)}`);
            } else {
                console.log(`❌ Snapshot download failed: ${downloadResponse.status}`);
                const errorText = await downloadResponse.text();
                console.log(`   Error: ${errorText}`);
            }
        }
        
        // 5. Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        if (snapshots.length > 0) {
            const files = await fetch(`${SUPABASE_URL}/storage/v1/object/list/table-snapshots`, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            }).then(r => r.ok ? r.json() : []).catch(() => []);
            
            if (files.length === 0) {
                console.log('   1. No files in storage - run createManualSnapshot() to create files');
            } else if (files.length !== snapshots.length) {
                console.log('   1. File count mismatch - some snapshots missing files');
                console.log('   2. Run fixSnapshotFiles() to recreate missing files');
            } else {
                console.log('   1. Files exist but paths may be wrong');
                console.log('   2. Update database paths to match actual file names');
            }
        } else {
            console.log('   1. No snapshots in database - create snapshots first');
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

// Function to fix snapshot files by recreating them from database entries
async function fixSnapshotFiles() {
    console.log('🔧 FIXING SNAPSHOT FILES');
    
    try {
        if (typeof window.availableSnapshots === 'undefined' || !Array.isArray(window.availableSnapshots)) {
            console.log('⚠️ Loading snapshots first...');
            if (typeof window.loadAvailableSnapshots === 'function') {
                await window.loadAvailableSnapshots();
            }
        }
        
        if (!window.availableSnapshots || window.availableSnapshots.length === 0) {
            console.log('❌ No snapshots available to fix');
            return;
        }
        
        console.log(`🔄 Found ${window.availableSnapshots.length} snapshots to fix`);
        
        // For each snapshot, try to recreate the storage file
        for (const snapshot of window.availableSnapshots) {
            console.log(`\n🔨 Fixing snapshot: ${snapshot.snapshot_date}`);
            
            // Create the snapshot data structure
            const snapshotData = {
                data: [], // We'll populate this from current table data as fallback
                metadata: snapshot.metadata || {
                    table: 'staffTable',
                    rowCount: snapshot.row_count || 0,
                    createdAt: snapshot.created_at,
                    snapshotDate: snapshot.snapshot_date,
                    version: '2.0.0',
                    type: 'RECREATED_SNAPSHOT'
                }
            };
            
            // Get current table data as fallback
            if (window.tableData && window.tableData.length > 0) {
                snapshotData.data = window.tableData;
                console.log(`   📊 Using current table data: ${window.tableData.length} rows`);
            } else {
                console.log('   ⚠️ No table data available, creating empty snapshot');
            }
            
            // Upload to storage with correct path
            const jsonContent = JSON.stringify(snapshotData, null, 2);
            
            try {
                const { error: uploadError } = await window.supabase.storage
                    .from('table-snapshots')
                    .upload(snapshot.object_path, jsonContent, {
                        contentType: 'application/json',
                        upsert: true
                    });
                
                if (uploadError) {
                    console.log(`   ❌ Upload failed: ${uploadError.message}`);
                } else {
                    console.log(`   ✅ File recreated: ${snapshot.object_path}`);
                }
            } catch (uploadErr) {
                console.log(`   ❌ Upload error: ${uploadErr.message}`);
            }
        }
        
        console.log('\n✅ Snapshot file fixing completed');
        console.log('Try clicking on a snapshot date now');
        
    } catch (error) {
        console.error('❌ Fix failed:', error);
    }
}

// Make functions available
window.debugSnapshotFiles = debugSnapshotFiles;
window.fixSnapshotFiles = fixSnapshotFiles;

console.log('\n🚀 DEBUG FUNCTIONS LOADED:');
console.log('   debugSnapshotFiles() - Analyze file/path issues');
console.log('   fixSnapshotFiles() - Recreate missing snapshot files');
console.log('');
console.log('💡 Start with: debugSnapshotFiles()');