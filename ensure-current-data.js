// =============================================
// ENSURE CURRENT DATA CAPTURE
// =============================================
// Run this in console to ensure snapshots capture current edited data

console.log('🔧 SETTING UP CURRENT DATA CAPTURE');
console.log('=' .repeat(50));

// Function to extract current table data from the DOM
function extractCurrentTableData() {
    console.log('📊 Extracting current table data from DOM...');
    
    const table = document.getElementById('data-table');
    if (!table) {
        console.log('❌ Table element not found');
        return null;
    }
    
    const tbody = table.querySelector('tbody');
    if (!tbody) {
        console.log('❌ Table body not found');
        return null;
    }
    
    const rows = tbody.querySelectorAll('tr');
    console.log(`📋 Found ${rows.length} rows in table`);
    
    const data = [];
    
    // Get header columns to know the structure
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => 
        th.textContent.trim()
    );
    console.log('📄 Table headers:', headers);
    
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td');
        const rowData = {};
        
        cells.forEach((cell, cellIndex) => {
            if (headers[cellIndex]) {
                // Try to get the value from input/textarea if it exists
                const input = cell.querySelector('input, textarea, select');
                let value = input ? input.value : cell.textContent.trim();
                
                // Convert to appropriate type if it's a number
                if (!isNaN(value) && value !== '') {
                    value = parseFloat(value);
                }
                
                rowData[headers[cellIndex]] = value;
            }
        });
        
        if (Object.keys(rowData).length > 0) {
            data.push(rowData);
        }
    });
    
    console.log(`✅ Extracted ${data.length} rows of data`);
    console.log('📝 Sample row:', data[0] || 'No data');
    
    return data;
}

// Function to update window.tableData with current state
function updateCurrentTableData() {
    console.log('🔄 Updating window.tableData with current state...');
    
    const currentData = extractCurrentTableData();
    if (currentData && currentData.length > 0) {
        window.tableData = currentData;
        console.log(`✅ window.tableData updated with ${currentData.length} rows`);
        return currentData;
    } else {
        console.log('⚠️ No current data found to update');
        return null;
    }
}

// Function to test manual snapshot with current data
async function testManualSnapshotWithCurrentData() {
    console.log('🧪 Testing manual snapshot with current data...');
    
    // First, ensure we have the latest data
    updateCurrentTableData();
    
    // Check if we have data
    if (!window.tableData || window.tableData.length === 0) {
        console.log('❌ No current table data available');
        return;
    }
    
    console.log(`📊 Current data ready: ${window.tableData.length} rows`);
    console.log('📝 First row of current data:', window.tableData[0]);
    
    // Now call the manual snapshot function
    if (typeof window.createManualSnapshot === 'function') {
        console.log('🚀 Creating manual snapshot with current data...');
        await window.createManualSnapshot();
        console.log('✅ Manual snapshot creation attempted - check results above');
    } else {
        console.log('❌ createManualSnapshot function not found');
    }
}

// Set up automatic data capture on table changes
function setupDataCaptureListeners() {
    console.log('🎧 Setting up automatic data capture listeners...');
    
    const table = document.getElementById('data-table');
    if (table) {
        // Listen for input changes in the table
        table.addEventListener('input', function(e) {
            console.log('📝 Table data changed, updating window.tableData...');
            setTimeout(() => {
                updateCurrentTableData();
            }, 100); // Small delay to ensure changes are processed
        });
        
        // Listen for blur events (when user finishes editing)
        table.addEventListener('blur', function(e) {
            console.log('👁️ Table edit finished, updating window.tableData...');
            updateCurrentTableData();
        }, true);
        
        console.log('✅ Data capture listeners set up');
    } else {
        console.log('❌ Table not found for setting up listeners');
    }
}

// Auto-setup
updateCurrentTableData();
setupDataCaptureListeners();

// Make functions available globally
window.extractCurrentTableData = extractCurrentTableData;
window.updateCurrentTableData = updateCurrentTableData;
window.testManualSnapshotWithCurrentData = testManualSnapshotWithCurrentData;
window.setupDataCaptureListeners = setupDataCaptureListeners;

console.log('🚀 CURRENT DATA CAPTURE READY');
console.log('📋 Available functions:');
console.log('   updateCurrentTableData() - Extract and update current data');
console.log('   testManualSnapshotWithCurrentData() - Test snapshot with current data');
console.log('   extractCurrentTableData() - Get current DOM data');
console.log('');
console.log('✅ Automatic listeners are now active');
console.log('💡 Edit your table, then run testManualSnapshotWithCurrentData()');