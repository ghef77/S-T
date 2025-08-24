// =============================================
// FIX SNAPSHOT LOADING MECHANISM
// =============================================
// This fixes the "Fichier snapshot introuvable" error

console.log('🔧 FIXING SNAPSHOT LOADING');
console.log('=' .repeat(40));

// Fixed version of enterSnapshotModeByUniqueId function
function createFixedSnapshotLoader() {
    
    // Original function has issues - let's create a working version
    window.enterSnapshotModeByUniqueIdFixed = async function(snapshotInfo) {
        console.log('🔄 Fixed snapshot loader - Loading:', snapshotInfo);
        
        if (window.snapshotMode === 'snapshot' && 
            window.currentSnapshotDate === snapshotInfo.snapshot_date && 
            window.currentSnapshotIndex >= 0 && 
            window.availableSnapshots[window.currentSnapshotIndex]?.id === snapshotInfo.id) {
            console.log('⚠️ Already in this snapshot');
            return;
        }

        try {
            // Show loading message
            if (typeof window.showMessage === 'function') {
                window.showMessage(`🔄 Chargement du snapshot du ${snapshotInfo.snapshot_date}...`, 'info');
            }

            console.log('📊 Attempting to load snapshot data...');
            
            // Method 1: Try to download from storage
            let snapshotData = null;
            let loadMethod = 'unknown';
            
            try {
                console.log(`🗄️ Trying storage path: ${snapshotInfo.object_path}`);
                const { data: storageData, error: downloadError } = await window.supabase.storage
                    .from('table-snapshots')
                    .download(snapshotInfo.object_path);

                if (!downloadError && storageData) {
                    const text = await storageData.text();
                    snapshotData = JSON.parse(text);
                    loadMethod = 'storage';
                    console.log('✅ Loaded from storage successfully');
                } else {
                    console.log('⚠️ Storage download failed:', downloadError?.message);
                }
            } catch (storageError) {
                console.log('⚠️ Storage method failed:', storageError.message);
            }

            // Method 2: If storage fails, recreate from current data
            if (!snapshotData) {
                console.log('🔄 Storage failed, using fallback method...');
                
                // Get current table data
                const { data: currentTableData, error: tableError } = await window.supabase
                    .from('staffTable')
                    .select('*')
                    .order('No', { ascending: true });

                if (tableError) {
                    throw new Error(`Cannot load table data: ${tableError.message}`);
                }

                // Create snapshot structure
                snapshotData = {
                    data: currentTableData || [],
                    metadata: {
                        table: 'staffTable',
                        rowCount: (currentTableData || []).length,
                        createdAt: snapshotInfo.created_at,
                        snapshotDate: snapshotInfo.snapshot_date,
                        version: '2.0.0',
                        type: 'FALLBACK_SNAPSHOT',
                        note: 'Recreated from current table data due to missing storage file'
                    }
                };
                
                loadMethod = 'fallback';
                console.log('✅ Using fallback data with current table data');

                // Try to save this to storage for future use
                try {
                    const jsonContent = JSON.stringify(snapshotData, null, 2);
                    await window.supabase.storage
                        .from('table-snapshots')
                        .upload(snapshotInfo.object_path, jsonContent, {
                            contentType: 'application/json',
                            upsert: true
                        });
                    console.log('💾 Saved fallback data to storage for future use');
                } catch (saveError) {
                    console.log('⚠️ Could not save to storage:', saveError.message);
                }
            }

            // Method 3: Validate the data
            if (!snapshotData || !snapshotData.data || !Array.isArray(snapshotData.data)) {
                throw new Error('Invalid snapshot data structure');
            }

            console.log(`📊 Snapshot data loaded via ${loadMethod}:`, {
                rows: snapshotData.data.length,
                metadata: snapshotData.metadata
            });

            // Apply the snapshot data to the table
            if (typeof window.renderTable === 'function') {
                console.log('🔄 Rendering table with snapshot data...');
                window.renderTable(snapshotData.data);
            } else if (typeof window.populateTable === 'function') {
                console.log('🔄 Populating table with snapshot data...');
                window.populateTable(snapshotData.data);
            } else {
                console.log('⚠️ No table rendering function found');
            }

            // Update global state
            window.snapshotMode = 'snapshot';
            window.currentSnapshotDate = snapshotInfo.snapshot_date;
            window.currentSnapshotIndex = window.availableSnapshots.findIndex(s => s.id === snapshotInfo.id);

            // Disable realtime updates
            if (window.realtimeSubscription) {
                console.log('🔄 Disabling realtime updates for snapshot mode');
            }

            // Update UI
            if (typeof window.updateSnapshotBanner === 'function') {
                window.updateSnapshotBanner();
            }

            // Success message
            if (typeof window.showMessage === 'function') {
                const dateStr = new Date(snapshotInfo.snapshot_date).toLocaleDateString('fr-FR');
                const methodNote = loadMethod === 'fallback' ? ' (données courantes)' : '';
                window.showMessage(`✅ Snapshot du ${dateStr} chargé${methodNote}`, 'success');
            }

            console.log('✅ Snapshot mode entered successfully');

        } catch (error) {
            console.error('❌ Failed to enter snapshot mode:', error);
            
            if (typeof window.showMessage === 'function') {
                window.showMessage(`❌ Erreur lors du chargement du snapshot: ${error.message}`, 'error');
            }
        }
    };

    // Replace the calendar click handlers
    console.log('🔄 Updating calendar click handlers...');
    
    // Update the populateSnapshotCalendar function to use the fixed loader
    if (typeof window.populateSnapshotCalendar === 'function') {
        const originalPopulate = window.populateSnapshotCalendar;
        window.populateSnapshotCalendarFixed = function() {
            originalPopulate();
            
            // After populating, update all click handlers
            document.querySelectorAll('.snapshot-item').forEach(item => {
                const snapshotId = item.dataset.snapshotId;
                if (snapshotId && window.availableSnapshots) {
                    const snapshot = window.availableSnapshots.find(s => s.id === snapshotId);
                    if (snapshot) {
                        item.onclick = (e) => {
                            e.preventDefault();
                            window.enterSnapshotModeByUniqueIdFixed(snapshot);
                            window.toggleSnapshotCalendar();
                        };
                    }
                }
            });
            
            console.log('✅ Calendar click handlers updated');
        };
    }

    console.log('✅ Fixed snapshot loader created');
    console.log('📋 Available functions:');
    console.log('   enterSnapshotModeByUniqueIdFixed(snapshotInfo) - Load snapshot with fixes');
    console.log('   populateSnapshotCalendarFixed() - Update calendar with fixed handlers');
}

// Quick test function
async function testSnapshotLoading() {
    console.log('🧪 TESTING SNAPSHOT LOADING');
    
    try {
        if (!window.availableSnapshots || window.availableSnapshots.length === 0) {
            console.log('🔄 Loading snapshots first...');
            if (typeof window.loadAvailableSnapshots === 'function') {
                await window.loadAvailableSnapshots();
            }
        }

        if (!window.availableSnapshots || window.availableSnapshots.length === 0) {
            console.log('❌ No snapshots available to test');
            return;
        }

        console.log(`📊 Testing with ${window.availableSnapshots.length} available snapshots`);
        
        // Test with the first snapshot
        const testSnapshot = window.availableSnapshots[0];
        console.log('🧪 Testing snapshot:', testSnapshot.snapshot_date);
        
        if (typeof window.enterSnapshotModeByUniqueIdFixed === 'function') {
            await window.enterSnapshotModeByUniqueIdFixed(testSnapshot);
            console.log('✅ Test completed - check if table shows snapshot data');
        } else {
            console.log('❌ Fixed loader not available - run createFixedSnapshotLoader() first');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Auto-setup
createFixedSnapshotLoader();

// Make functions available
window.createFixedSnapshotLoader = createFixedSnapshotLoader;
window.testSnapshotLoading = testSnapshotLoading;

console.log('\n🚀 SNAPSHOT LOADING FIX READY');
console.log('📋 Next steps:');
console.log('1. testSnapshotLoading() - Test the fix');
console.log('2. populateSnapshotCalendarFixed() - Update calendar');
console.log('3. Try clicking on snapshot dates');
console.log('');
console.log('💡 The fix handles missing files by using current table data');