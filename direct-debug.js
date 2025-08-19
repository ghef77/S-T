// Direct Snapshot Debug - Simple Console Logging
// Copy and paste this into your browser console

console.log('🔍 === DIRECT SNAPSHOT DEBUG ===');

// 1. Check if page is loaded
console.log('1. Page Status:');
console.log('   Document ready:', document.readyState);
console.log('   URL:', window.location.href);
console.log('   Title:', document.title);

// 2. Check Supabase directly
console.log('\n2. Supabase Check:');
if (typeof supabase !== 'undefined') {
    console.log('   ✅ Supabase is available');
    console.log('   URL:', supabase.supabaseUrl);
    console.log('   Key length:', supabase.supabaseKey?.length || 'No key');
} else {
    console.log('   ❌ Supabase is NOT available');
}

// 3. Check if we're logged in
console.log('\n3. Login Status:');
console.log('   Session storage:', sessionStorage.getItem('isLoggedIn'));
console.log('   Login container hidden:', document.getElementById('login-container')?.classList.contains('hidden'));
console.log('   Table container visible:', !document.getElementById('table-container')?.classList.contains('hidden'));

// 4. Check snapshot variables directly
console.log('\n4. Snapshot Variables:');
console.log('   availableSnapshots:', typeof availableSnapshots !== 'undefined' ? availableSnapshots : 'UNDEFINED');
console.log('   snapshotMode:', typeof snapshotMode !== 'undefined' ? snapshotMode : 'UNDEFINED');
console.log('   currentSnapshotDate:', typeof currentSnapshotDate !== 'undefined' ? currentSnapshotDate : 'UNDEFINED');
console.log('   isHistoryBarVisible:', typeof isHistoryBarVisible !== 'undefined' ? isHistoryBarVisible : 'UNDEFINED');

// 5. Check UI elements
console.log('\n5. UI Elements:');
const historyBar = document.getElementById('history-bar');
const historyBack = document.getElementById('history-back');
const historyNext = document.getElementById('history-next');
const historyDate = document.getElementById('history-date');

console.log('   history-bar:', historyBar ? 'FOUND' : 'NOT FOUND');
console.log('   history-back:', historyBack ? 'FOUND' : 'NOT FOUND');
console.log('   history-next:', historyNext ? 'FOUND' : 'NOT FOUND');
console.log('   history-date:', historyDate ? 'FOUND' : 'NOT FOUND');

if (historyBar) {
    console.log('   History bar classes:', historyBar.className);
    console.log('   History bar hidden:', historyBar.classList.contains('hidden'));
}

// 6. Direct database test
console.log('\n6. Database Test:');
if (typeof supabase !== 'undefined') {
    console.log('   Testing database connection...');
    
    // Simple count query
    supabase.from('table_snapshots_index').select('count').limit(1)
        .then(result => {
            console.log('   ✅ Database query result:', result);
            console.log('   Data:', result.data);
            console.log('   Error:', result.error);
        })
        .catch(error => {
            console.log('   ❌ Database error:', error);
        });
    
    // Check if table exists by trying to select all
    supabase.from('table_snapshots_index').select('*').limit(1)
        .then(result => {
            console.log('   ✅ Table query result:', result);
            console.log('   Records found:', result.data?.length || 0);
            if (result.data && result.data.length > 0) {
                console.log('   First record:', result.data[0]);
            }
        })
        .catch(error => {
            console.log('   ❌ Table query error:', error);
        });
} else {
    console.log('   ❌ Cannot test database - Supabase not available');
}

// 7. Storage test
console.log('\n7. Storage Test:');
if (typeof supabase !== 'undefined') {
    console.log('   Testing storage access...');
    
    supabase.storage.from('table-snapshots').list('', { limit: 5 })
        .then(result => {
            console.log('   ✅ Storage result:', result);
            console.log('   Files found:', result.data?.length || 0);
            if (result.data && result.data.length > 0) {
                console.log('   Files:', result.data.map(f => f.name));
            }
        })
        .catch(error => {
            console.log('   ❌ Storage error:', error);
        });
} else {
    console.log('   ❌ Cannot test storage - Supabase not available');
}

// 8. Check for any error messages in console
console.log('\n8. Console Errors:');
console.log('   Check the console above for any red error messages');
console.log('   Look for messages starting with ❌');

// 9. Manual snapshot check
console.log('\n9. Manual Snapshot Check:');
console.log('   Try this command to see snapshots:');
console.log('   supabase.from("table_snapshots_index").select("*")');

// 10. Summary
console.log('\n10. Summary:');
console.log('   If you see ❌ errors above, those are the problems');
console.log('   If you see ✅ success messages, those parts are working');
console.log('   Check the database and storage results above');

console.log('\n🔍 === DIRECT DEBUG COMPLETE ===');
console.log('💡 Look at the results above to see what is working and what is not');
