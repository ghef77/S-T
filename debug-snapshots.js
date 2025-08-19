// Debug Snapshot System - Comprehensive Testing
// Run this in your browser console to debug the snapshot system

console.log('🔍 === SNAPSHOT SYSTEM DEBUG START ===');

// Test 1: Check if functions are available
console.log('=== TEST 1: Function Availability ===');
console.log('loadAvailableSnapshots:', typeof window.loadAvailableSnapshots);
console.log('enterSnapshotMode:', typeof window.enterSnapshotMode);
console.log('goToPreviousSnapshot:', typeof window.goToPreviousSnapshot);
console.log('goToNextSnapshot:', typeof window.goToNextSnapshot);

// Test 2: Check global variables
console.log('=== TEST 2: Global Variables ===');
console.log('availableSnapshots:', window.availableSnapshots);
console.log('snapshotMode:', window.snapshotMode);
console.log('isHistoryBarVisible:', window.isHistoryBarVisible);
console.log('currentSnapshotDate:', window.currentSnapshotDate);
console.log('currentSnapshotIndex:', window.currentSnapshotIndex);

// Test 3: Check UI elements
console.log('=== TEST 3: UI Elements ===');
console.log('history-bar:', document.getElementById('history-bar'));
console.log('history-back:', document.getElementById('history-back'));
console.log('history-next:', document.getElementById('history-next'));
console.log('history-date:', document.getElementById('history-date'));
console.log('snapshot-banner:', document.getElementById('snapshot-banner'));

// Test 4: Check Supabase connection
console.log('=== TEST 4: Supabase Connection ===');
console.log('supabase client:', typeof window.supabase);
console.log('supabase URL:', window.supabase?.supabaseUrl);

// Test 5: Check database tables directly
console.log('=== TEST 5: Database Tables ===');
if (window.supabase) {
    // Test table_snapshots_index
    window.supabase.from('table_snapshots_index').select('*')
        .then(result => {
            console.log('✅ table_snapshots_index result:', result);
            console.log('Data:', result.data);
            console.log('Error:', result.error);
            console.log('Count:', result.data?.length || 0);
        })
        .catch(error => {
            console.error('❌ table_snapshots_index error:', error);
        });
    
    // Test snapshot_restore_log
    window.supabase.from('snapshot_restore_log').select('*')
        .then(result => {
            console.log('✅ snapshot_restore_log result:', result);
            console.log('Data:', result.data);
            console.log('Error:', result.error);
            console.log('Count:', result.data?.length || 0);
        })
        .catch(error => {
            console.error('❌ snapshot_restore_log error:', error);
        });
} else {
    console.log('❌ Supabase client not available');
}

// Test 6: Check storage bucket
console.log('=== TEST 6: Storage Bucket ===');
if (window.supabase) {
    window.supabase.storage.from('table-snapshots').list('', { limit: 10 })
        .then(result => {
            console.log('✅ Storage bucket result:', result);
            console.log('Files:', result.data);
            console.log('Error:', result.error);
        })
        .catch(error => {
            console.error('❌ Storage bucket error:', error);
        });
} else {
    console.log('❌ Supabase client not available');
}

// Test 7: Test loadAvailableSnapshots function
console.log('=== TEST 7: Test loadAvailableSnapshots ===');
if (typeof window.loadAvailableSnapshots === 'function') {
    console.log('🔄 Calling loadAvailableSnapshots...');
    window.loadAvailableSnapshots().then(() => {
        console.log('✅ loadAvailableSnapshots completed');
        console.log('Updated availableSnapshots:', window.availableSnapshots);
        console.log('Length:', window.availableSnapshots?.length || 0);
        
        // Check if history navigation was updated
        const backBtn = document.getElementById('history-back');
        const nextBtn = document.getElementById('history-next');
        console.log('Back button disabled:', backBtn?.disabled);
        console.log('Next button disabled:', nextBtn?.disabled);
        
    }).catch(error => {
        console.error('❌ loadAvailableSnapshots error:', error);
    });
} else {
    console.log('❌ loadAvailableSnapshots function not available');
}

// Test 8: Check localStorage and sessionStorage
console.log('=== TEST 8: Storage ===');
console.log('localStorage historyBarVisible:', localStorage.getItem('historyBarVisible'));
console.log('sessionStorage isLoggedIn:', sessionStorage.getItem('isLoggedIn'));

console.log('🔍 === SNAPSHOT SYSTEM DEBUG END ===');

// Helper function to manually test snapshot loading
window.testSnapshotLoading = async () => {
    console.log('🧪 Manual snapshot loading test...');
    
    if (!window.supabase) {
        console.log('❌ Supabase not available');
        return;
    }
    
    try {
        // Test 1: Load snapshots from database
        const { data, error } = await window.supabase
            .from('table_snapshots_index')
            .select('*')
            .order('snapshot_date', { ascending: false });
        
        console.log('Database query result:', { data, error });
        
        if (data && data.length > 0) {
            // Test 2: Try to download first snapshot
            const firstSnapshot = data[0];
            console.log('Testing download of:', firstSnapshot);
            
            const { data: fileData, error: fileError } = await window.supabase.storage
                .from('table-snapshots')
                .download(firstSnapshot.object_path);
            
            console.log('File download result:', { fileData, fileError });
            
            if (fileData) {
                const content = await fileData.text();
                console.log('File content:', content.substring(0, 200) + '...');
                
                try {
                    const parsed = JSON.parse(content);
                    console.log('Parsed JSON:', parsed);
                    console.log('Data array length:', parsed.data?.length || 'No data array');
                } catch (parseError) {
                    console.error('JSON parse error:', parseError);
                }
            }
        }
        
    } catch (error) {
        console.error('Test error:', error);
    }
};

// Helper function to force history bar visibility
window.forceShowHistoryBar = () => {
    console.log('🔧 Forcing history bar to be visible...');
    window.isHistoryBarVisible = true;
    localStorage.setItem('historyBarVisible', 'true');
    
    const historyBar = document.getElementById('history-bar');
    if (historyBar) {
        historyBar.classList.remove('hidden');
        historyBar.classList.add('lg:flex');
        console.log('✅ History bar forced visible');
    } else {
        console.log('❌ History bar element not found');
    }
};

console.log('💡 Helper functions available:');
console.log('  - window.testSnapshotLoading() - Test snapshot loading manually');
console.log('  - window.forceShowHistoryBar() - Force history bar to be visible');
