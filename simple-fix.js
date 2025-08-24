// Simple direct fix - copy and paste this entire block at once
(async function() {
    console.log('🔧 Running snapshot fix...');
    
    try {
        // Clear any cached data
        window.availableSnapshots = [];
        console.log('🧹 Cleared cache');
        
        // Force reload snapshots
        if (typeof window.loadAvailableSnapshots === 'function') {
            console.log('🔄 Loading snapshots...');
            await window.loadAvailableSnapshots();
            
            if (window.availableSnapshots && window.availableSnapshots.length > 0) {
                console.log(`✅ SUCCESS: Found ${window.availableSnapshots.length} snapshots!`);
                
                // List them
                window.availableSnapshots.forEach((snap, i) => {
                    console.log(`   ${i+1}. ${snap.snapshot_date}`);
                });
                
                // Update calendar
                if (typeof window.populateSnapshotCalendar === 'function') {
                    window.populateSnapshotCalendar();
                    console.log('✅ Calendar updated');
                }
                
                console.log('🎉 FIXED! Try clicking snapshot calendar now!');
                return 'SUCCESS: Snapshots loaded and ready!';
                
            } else {
                console.log('❌ No snapshots loaded from database');
                return 'ERROR: No snapshots found';
            }
        } else {
            console.log('❌ loadAvailableSnapshots function not found');
            return 'ERROR: Function not found';
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        return 'ERROR: ' + error.message;
    }
})();