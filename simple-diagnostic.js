// =============================================
// SIMPLE SUPABASE DIAGNOSTIC
// =============================================
// Copy and paste this entire script, then run: checkSupabase()

async function checkSupabase() {
    console.clear();
    console.log('🔍 SUPABASE DIAGNOSTIC STARTING...');
    console.log('=' .repeat(50));

    const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';

    // 1. Check snapshots in database
    console.log('\n1. 📊 CHECKING SNAPSHOTS IN DATABASE...');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=*&order=created_at.desc&limit=10`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            const snapshots = await response.json();
            console.log(`✅ Found ${snapshots.length} snapshots in database:`);
            snapshots.forEach((snap, i) => {
                console.log(`   ${i+1}. ${snap.snapshot_date} → ${snap.object_path}`);
            });
            
            // Store for later use
            window.dbSnapshots = snapshots;
            
        } else {
            console.log(`❌ Database error: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.log(`❌ Database connection failed: ${error.message}`);
    }

    // 2. Check files in storage
    console.log('\n2. 📁 CHECKING FILES IN STORAGE...');
    try {
        const response = await fetch(`${SUPABASE_URL}/storage/v1/object/list/table-snapshots`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            const files = await response.json();
            console.log(`✅ Found ${files.length} files in storage:`);
            files.forEach((file, i) => {
                console.log(`   ${i+1}. ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
            });
            
            // Store for later use
            window.storageFiles = files;
            
        } else {
            console.log(`❌ Storage error: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.log(`❌ Storage connection failed: ${error.message}`);
    }

    // 3. Compare database vs storage
    console.log('\n3. 🔍 COMPARING DATABASE vs STORAGE...');
    if (window.dbSnapshots && window.storageFiles) {
        const fileNames = window.storageFiles.map(f => f.name);
        
        window.dbSnapshots.forEach(snap => {
            const fileExists = fileNames.includes(snap.object_path);
            const status = fileExists ? '✅ MATCH' : '❌ MISSING';
            console.log(`   ${status}: ${snap.snapshot_date} needs ${snap.object_path}`);
        });
        
        console.log('\n📋 SUMMARY:');
        const missingCount = window.dbSnapshots.filter(snap => !fileNames.includes(snap.object_path)).length;
        console.log(`   Database entries: ${window.dbSnapshots.length}`);
        console.log(`   Storage files: ${window.storageFiles.length}`);
        console.log(`   Missing files: ${missingCount}`);
        
        if (missingCount > 0) {
            console.log('\n⚠️ PROBLEM IDENTIFIED: Missing storage files!');
            console.log('This is why you get "Fichier snapshot introuvable"');
            console.log('Solution: Run createMissingFiles() to fix this');
        } else {
            console.log('\n✅ All files present - issue might be elsewhere');
        }
    }

    // 4. Test Edge Function
    console.log('\n4. ⚡ TESTING EDGE FUNCTION...');
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/snapshot_staff_table_daily`, {
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
            console.log('✅ Edge Function works:', result.message || 'Success');
        } else {
            const error = await response.text();
            console.log(`❌ Edge Function error: ${response.status}`);
            console.log(`   Error: ${error}`);
        }
    } catch (error) {
        console.log(`❌ Edge Function failed: ${error.message}`);
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎯 DIAGNOSTIC COMPLETE');
    console.log('=' .repeat(50));
    console.log('Next step: If files are missing, run createMissingFiles()');
    
    return "Diagnostic complete - check console output above ⬆️";
}

// Function to create missing snapshot files
async function createMissingFiles() {
    console.log('🔨 CREATING MISSING SNAPSHOT FILES...');
    
    if (!window.dbSnapshots) {
        console.log('❌ Run checkSupabase() first');
        return;
    }

    const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';

    // Get current table data
    console.log('📊 Getting current table data...');
    const tableResponse = await fetch(`${SUPABASE_URL}/rest/v1/staffTable?select=*&order=No.asc`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    
    if (!tableResponse.ok) {
        console.log('❌ Cannot get table data');
        return;
    }
    
    const tableData = await tableResponse.json();
    console.log(`✅ Got ${tableData.length} rows of table data`);

    // Create missing files
    const fileNames = window.storageFiles ? window.storageFiles.map(f => f.name) : [];
    
    for (const snap of window.dbSnapshots) {
        if (!fileNames.includes(snap.object_path)) {
            console.log(`🔨 Creating: ${snap.object_path}`);
            
            // Create snapshot data
            const snapshotData = {
                data: tableData,
                metadata: {
                    table: 'staffTable',
                    rowCount: tableData.length,
                    createdAt: snap.created_at,
                    snapshotDate: snap.snapshot_date,
                    version: '2.0.0',
                    type: 'RECREATED_SNAPSHOT',
                    note: 'File recreated from current table data'
                }
            };
            
            const jsonContent = JSON.stringify(snapshotData, null, 2);
            
            try {
                const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/table-snapshots/${snap.object_path}`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: jsonContent
                });
                
                if (uploadResponse.ok) {
                    console.log(`   ✅ Created successfully`);
                } else {
                    console.log(`   ❌ Upload failed: ${uploadResponse.status}`);
                }
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
    }
    
    console.log('🎉 File creation complete! Try clicking snapshots now.');
    return "Missing files created - test your snapshots now!";
}

// Make functions available
window.checkSupabase = checkSupabase;
window.createMissingFiles = createMissingFiles;

console.log('🚀 DIAGNOSTIC LOADED');
console.log('📋 Commands:');
console.log('   checkSupabase() - Run full diagnostic');
console.log('   createMissingFiles() - Fix missing snapshot files');
console.log('');
console.log('▶️ Start with: checkSupabase()');