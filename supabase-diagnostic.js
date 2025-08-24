// =============================================
// SUPABASE DIAGNOSTIC SCRIPT
// =============================================
// Run this to gather comprehensive information about your Supabase setup

console.log('🔍 SUPABASE COMPREHENSIVE DIAGNOSTIC');
console.log('=' .repeat(60));

async function runSupabaseDiagnostic() {
    const results = {
        timestamp: new Date().toISOString(),
        connection: null,
        tables: {},
        storage: {},
        policies: {},
        functions: {},
        data: {},
        errors: []
    };

    const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';

    console.log('\n📊 PROJECT INFO:');
    console.log(`   URL: ${SUPABASE_URL}`);
    console.log(`   Project ID: fiecugxopjxzqfdnaqsu`);
    
    // Helper function for API calls
    const apiCall = async (endpoint, method = 'GET', body = null) => {
        try {
            const response = await fetch(`${SUPABASE_URL}${endpoint}`, {
                method,
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: body ? JSON.stringify(body) : undefined
            });
            
            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                data: response.ok ? await response.json() : await response.text()
            };
        } catch (error) {
            return {
                ok: false,
                status: 0,
                statusText: 'Network Error',
                error: error.message
            };
        }
    };

    try {
        // 1. Test basic connection
        console.log('\n1. 🔌 Testing Connection...');
        const connectionTest = await apiCall('/rest/v1/');
        results.connection = {
            status: connectionTest.status,
            ok: connectionTest.ok,
            error: connectionTest.error || null
        };
        
        if (connectionTest.ok) {
            console.log('✅ Connection successful');
        } else {
            console.log(`❌ Connection failed: ${connectionTest.status} ${connectionTest.statusText}`);
        }

        // 2. Test staffTable
        console.log('\n2. 📋 Testing staffTable...');
        const staffTableTest = await apiCall('/rest/v1/staffTable?select=*&limit=3');
        results.tables.staffTable = {
            accessible: staffTableTest.ok,
            status: staffTableTest.status,
            sampleData: staffTableTest.ok ? staffTableTest.data : null,
            error: staffTableTest.error || (!staffTableTest.ok ? staffTableTest.data : null)
        };
        
        if (staffTableTest.ok) {
            console.log(`✅ staffTable accessible (${staffTableTest.data.length} sample records)`);
            console.log('   Sample data:', staffTableTest.data[0] || 'No data');
        } else {
            console.log(`❌ staffTable access failed: ${staffTableTest.status}`);
        }

        // 3. Test snapshot index table
        console.log('\n3. 📊 Testing table_snapshots_index...');
        const snapshotIndexTest = await apiCall('/rest/v1/table_snapshots_index?select=*&order=created_at.desc&limit=5');
        results.tables.table_snapshots_index = {
            accessible: snapshotIndexTest.ok,
            status: snapshotIndexTest.status,
            snapshots: snapshotIndexTest.ok ? snapshotIndexTest.data : null,
            error: snapshotIndexTest.error || (!snapshotIndexTest.ok ? snapshotIndexTest.data : null)
        };
        
        if (snapshotIndexTest.ok) {
            console.log(`✅ table_snapshots_index accessible (${snapshotIndexTest.data.length} snapshots)`);
            snapshotIndexTest.data.forEach((snap, idx) => {
                console.log(`   ${idx + 1}. ${snap.snapshot_date} - ${snap.object_path} (${snap.row_count} rows)`);
            });
        } else {
            console.log(`❌ table_snapshots_index access failed: ${snapshotIndexTest.status}`);
        }

        // 4. Test storage bucket
        console.log('\n4. 🗄️ Testing Storage Bucket...');
        const bucketTest = await apiCall('/storage/v1/bucket/table-snapshots');
        results.storage.bucket = {
            exists: bucketTest.ok,
            status: bucketTest.status,
            info: bucketTest.ok ? bucketTest.data : null,
            error: bucketTest.error || (!bucketTest.ok ? bucketTest.data : null)
        };
        
        if (bucketTest.ok) {
            console.log('✅ table-snapshots bucket exists');
            
            // Test listing files
            const filesTest = await apiCall('/storage/v1/object/list/table-snapshots');
            results.storage.files = {
                accessible: filesTest.ok,
                status: filesTest.status,
                files: filesTest.ok ? filesTest.data : null,
                error: filesTest.error || (!filesTest.ok ? filesTest.data : null)
            };
            
            if (filesTest.ok) {
                console.log(`📁 Found ${filesTest.data.length} files in bucket:`);
                filesTest.data.forEach((file, idx) => {
                    console.log(`   ${idx + 1}. ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
                });
            } else {
                console.log(`❌ Cannot list files: ${filesTest.status}`);
            }
        } else {
            console.log(`❌ Bucket access failed: ${bucketTest.status}`);
        }

        // 5. Test Edge Function
        console.log('\n5. ⚡ Testing Edge Function...');
        const edgeFunctionTest = await apiCall('/functions/v1/snapshot_staff_table_daily', 'POST', { test: true });
        results.functions.snapshot_staff_table = {
            accessible: edgeFunctionTest.ok,
            status: edgeFunctionTest.status,
            response: edgeFunctionTest.ok ? edgeFunctionTest.data : null,
            error: edgeFunctionTest.error || (!edgeFunctionTest.ok ? edgeFunctionTest.data : null)
        };
        
        if (edgeFunctionTest.ok) {
            console.log('✅ Edge Function executed successfully');
            console.log('   Response:', edgeFunctionTest.data);
        } else {
            console.log(`❌ Edge Function failed: ${edgeFunctionTest.status}`);
            console.log('   Error:', edgeFunctionTest.data);
        }

        // 6. Cross-reference data
        console.log('\n6. 🔍 Cross-referencing Data...');
        if (results.tables.table_snapshots_index?.snapshots && results.storage.files?.files) {
            const snapshots = results.tables.table_snapshots_index.snapshots;
            const files = results.storage.files.files.map(f => f.name);
            
            console.log('📋 File-Database Cross-reference:');
            snapshots.forEach(snap => {
                const fileExists = files.includes(snap.object_path);
                const status = fileExists ? '✅' : '❌';
                console.log(`   ${status} ${snap.snapshot_date}: ${snap.object_path} ${fileExists ? '(found)' : '(missing)'}`);
            });
            
            // Store analysis
            results.data.crossReference = snapshots.map(snap => ({
                snapshot_date: snap.snapshot_date,
                object_path: snap.object_path,
                file_exists: files.includes(snap.object_path)
            }));
        }

    } catch (error) {
        console.error('❌ Diagnostic failed:', error);
        results.errors.push(error.message);
    }

    // Generate summary report
    console.log('\n' + '=' .repeat(60));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('=' .repeat(60));
    
    const checks = [
        { name: 'Connection', status: results.connection?.ok },
        { name: 'staffTable', status: results.tables.staffTable?.accessible },
        { name: 'Snapshot Index', status: results.tables.table_snapshots_index?.accessible },
        { name: 'Storage Bucket', status: results.storage.bucket?.exists },
        { name: 'File Listing', status: results.storage.files?.accessible },
        { name: 'Edge Function', status: results.functions.snapshot_staff_table?.accessible }
    ];
    
    checks.forEach(check => {
        const icon = check.status ? '✅' : '❌';
        console.log(`${icon} ${check.name}`);
    });
    
    const passedChecks = checks.filter(c => c.status).length;
    console.log(`\n📊 Overall Status: ${passedChecks}/${checks.length} checks passed`);
    
    if (results.data.crossReference) {
        const missingFiles = results.data.crossReference.filter(cr => !cr.file_exists);
        if (missingFiles.length > 0) {
            console.log(`\n⚠️  ${missingFiles.length} snapshot files missing from storage:`);
            missingFiles.forEach(mf => {
                console.log(`   - ${mf.snapshot_date}: ${mf.object_path}`);
            });
        }
    }
    
    // Recommendations
    console.log('\n🔧 RECOMMENDATIONS:');
    if (!results.connection?.ok) {
        console.log('   1. Check internet connection and Supabase service status');
    }
    if (!results.tables.table_snapshots_index?.accessible) {
        console.log('   1. Run fix-snapshot-issues.sql to create/fix snapshot table');
    }
    if (!results.storage.bucket?.exists) {
        console.log('   2. Create table-snapshots bucket in Supabase Dashboard');
    }
    if (results.data.crossReference?.some(cr => !cr.file_exists)) {
        console.log('   3. Run fixSnapshotFiles() to recreate missing storage files');
    }
    if (!results.functions.snapshot_staff_table?.accessible) {
        console.log('   4. Deploy Edge Function: supabase functions deploy snapshot_staff_table_daily');
    }

    console.log(`\n⏰ Diagnostic completed at: ${new Date().toLocaleString()}`);
    
    // Store results globally for inspection
    window.supabaseDiagnosticResults = results;
    console.log('\n📋 Detailed results stored in: window.supabaseDiagnosticResults');
    
    return results;
}

// Make function available globally
window.runSupabaseDiagnostic = runSupabaseDiagnostic;

console.log('\n🚀 DIAGNOSTIC READY');
console.log('Run: runSupabaseDiagnostic()');