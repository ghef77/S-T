// Simple Snapshot System Debug
// Run this in your browser console to test the snapshot system

console.log('🔍 === SIMPLE SNAPSHOT DEBUG ===');

// Test 1: Check if Supabase is available
console.log('\n📋 Test 1: Supabase Connection');
if (typeof window.supabase !== 'undefined') {
    console.log('✅ Supabase is available');
    console.log('URL:', window.supabase.supabaseUrl);
} else {
    console.log('❌ Supabase is not available');
    console.log('Please wait for the page to fully load');
}

// Test 2: Check if snapshot functions exist
console.log('\n📋 Test 2: Function Availability');
const functions = [
    'loadAvailableSnapshots',
    'enterSnapshotMode',
    'goToPreviousSnapshot',
    'goToNextSnapshot'
];

functions.forEach(funcName => {
    const exists = typeof window[funcName] === 'function';
    console.log(`${exists ? '✅' : '❌'} ${funcName}: ${exists ? 'Available' : 'Missing'}`);
});

// Test 3: Check global variables
console.log('\n📋 Test 3: Global Variables');
const variables = [
    'availableSnapshots',
    'snapshotMode',
    'currentSnapshotDate',
    'currentSnapshotIndex',
    'isHistoryBarVisible'
];

variables.forEach(varName => {
    const value = window[varName];
    console.log(`  - ${varName}:`, value);
    if (Array.isArray(value)) {
        console.log(`    Array length: ${value.length}`);
    }
});

// Test 4: Check UI elements
console.log('\n📋 Test 4: UI Elements');
const elements = [
    'history-bar',
    'history-back',
    'history-next',
    'history-date',
    'snapshot-banner'
];

elements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
        console.log(`✅ ${elementId}: Found`);
        console.log(`  - Visible:`, !element.classList.contains('hidden'));
        console.log(`  - Disabled:`, element.disabled || 'N/A');
    } else {
        console.log(`❌ ${elementId}: Not found`);
    }
});

// Test 5: Test database query directly
console.log('\n📋 Test 5: Database Query');
async function testDatabase() {
    if (typeof window.supabase === 'undefined') {
        console.log('❌ Supabase not available');
        return;
    }
    
    try {
        console.log('🔄 Querying table_snapshots_index...');
        
        const { data, error } = await window.supabase
            .from('table_snapshots_index')
            .select('*');
        
        if (error) {
            console.log('❌ Database error:', error);
        } else {
            console.log('✅ Database query successful');
            console.log('📊 Records found:', data.length);
            
            if (data.length > 0) {
                console.log('📋 First record:', data[0]);
            }
        }
    } catch (error) {
        console.log('❌ Query error:', error);
    }
}

// Test 6: Test storage bucket
console.log('\n📋 Test 6: Storage Bucket');
async function testStorage() {
    if (typeof window.supabase === 'undefined') {
        console.log('❌ Supabase not available');
        return;
    }
    
    try {
        console.log('🔄 Checking table-snapshots bucket...');
        
        const { data: files, error } = await window.supabase.storage
            .from('table-snapshots')
            .list('', { limit: 10 });
        
        if (error) {
            console.log('❌ Storage error:', error);
        } else {
            console.log('✅ Storage access successful');
            console.log('📁 Files found:', files.length);
            
            if (files.length > 0) {
                files.forEach((file, index) => {
                    console.log(`  ${index + 1}. ${file.name}`);
                });
            }
        }
    } catch (error) {
        console.log('❌ Storage error:', error);
    }
}

// Test 7: Test loadAvailableSnapshots function
console.log('\n📋 Test 7: Load Function');
async function testLoadFunction() {
    if (typeof window.loadAvailableSnapshots !== 'function') {
        console.log('❌ loadAvailableSnapshots function not available');
        return;
    }
    
    try {
        console.log('🔄 Testing loadAvailableSnapshots...');
        
        await window.loadAvailableSnapshots();
        
        console.log('✅ Function executed');
        console.log('📊 Updated availableSnapshots:', window.availableSnapshots);
        console.log('📊 Length:', window.availableSnapshots?.length || 0);
        
    } catch (error) {
        console.log('❌ Function error:', error);
    }
}

// Make test functions available globally
window.testDatabase = testDatabase;
window.testStorage = testStorage;
window.testLoadFunction = testLoadFunction;

// Run basic tests
console.log('\n🚀 Running basic tests...');
testDatabase();
testStorage();

console.log('\n💡 Available test functions:');
console.log('  - window.testDatabase() - Test database connection');
console.log('  - window.testStorage() - Test storage bucket');
console.log('  - window.testLoadFunction() - Test load function');

console.log('\n🔍 === SIMPLE DEBUG COMPLETE ===');
