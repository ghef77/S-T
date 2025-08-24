// =============================================
// CLEAN CONSOLE ERRORS - DIAGNOSTIC SCRIPT
// =============================================
// This script helps identify and suppress console errors

console.log('🧹 CLEANING CONSOLE ERRORS');
console.log('=' .repeat(40));

// 1. Browser Extension Errors
console.log('\n📋 BROWSER EXTENSION ERRORS:');
console.log('The following errors are from browser extensions and can be safely ignored:');
console.log('   - FrameDoesNotExistError: Frame XXXX does not exist');
console.log('   - Could not establish connection. Receiving end does not exist');
console.log('   - Failed to load resource: net::ERR_FILE_NOT_FOUND (for extension files)');
console.log('');
console.log('💡 These are caused by browser extensions (like ad blockers, dev tools extensions)');
console.log('   and do NOT affect your app functionality.');

// 2. Suppress extension errors (optional)
const originalConsoleError = console.error;
let suppressExtensionErrors = false;

window.suppressExtensionErrors = function(enable = true) {
    suppressExtensionErrors = enable;
    if (enable) {
        console.error = function(...args) {
            const message = args.join(' ');
            
            // Skip extension-related errors
            if (message.includes('FrameDoesNotExistError') ||
                message.includes('Could not establish connection') ||
                message.includes('background.js') ||
                message.includes('extensionState.js') ||
                message.includes('utils.js') ||
                message.includes('heuristicsRedefinitions.js') ||
                message.includes('Receiving end does not exist')) {
                return; // Skip these errors
            }
            
            // Show other errors normally
            originalConsoleError.apply(console, args);
        };
        console.log('✅ Extension errors suppressed');
    } else {
        console.error = originalConsoleError;
        console.log('✅ Extension error suppression disabled');
    }
};

// 3. Main App Error Checker
window.checkMainAppErrors = function() {
    console.log('\n🔍 CHECKING MAIN APP ERRORS:');
    
    // Check if supabase is initialized
    if (typeof window.supabase !== 'undefined') {
        console.log('✅ Supabase client initialized');
    } else {
        console.log('❌ Supabase client not found');
    }
    
    // Check if loadAvailableSnapshots exists
    if (typeof window.loadAvailableSnapshots === 'function') {
        console.log('✅ loadAvailableSnapshots function available');
    } else {
        console.log('❌ loadAvailableSnapshots function not found');
    }
    
    // Check if availableSnapshots exists
    if (typeof window.availableSnapshots !== 'undefined') {
        console.log(`✅ availableSnapshots array: ${window.availableSnapshots.length} items`);
    } else {
        console.log('❌ availableSnapshots not initialized');
    }
    
    // Check if createManualSnapshot exists
    if (typeof window.createManualSnapshot === 'function') {
        console.log('✅ createManualSnapshot function available');
    } else {
        console.log('❌ createManualSnapshot function not found');
    }
};

// 4. Test Manual Snapshot (safe version)
window.testManualSnapshot = async function() {
    console.log('\n🧪 TESTING MANUAL SNAPSHOT CREATION:');
    
    try {
        if (typeof window.createManualSnapshot !== 'function') {
            console.log('❌ createManualSnapshot function not available');
            return;
        }
        
        console.log('🚀 Attempting to create manual snapshot...');
        await window.createManualSnapshot();
        console.log('✅ Manual snapshot test completed - check above for results');
    } catch (error) {
        console.log('❌ Manual snapshot test failed:', error.message);
        
        // Provide specific guidance based on error type
        if (error.message.includes('supabaseService')) {
            console.log('💡 supabaseService error fixed - please refresh page and try again');
        } else if (error.message.includes('ReferenceError')) {
            console.log('💡 Variable reference error - check browser console for details');
        } else if (error.message.includes('row-level security')) {
            console.log('💡 Database permission error - run fix-snapshot-issues.sql');
        }
    }
};

// 5. Quick Diagnostics
window.quickDiagnostic = function() {
    console.log('\n⚡ QUICK DIAGNOSTIC:');
    checkMainAppErrors();
    
    if (typeof window.loadAvailableSnapshots === 'function') {
        console.log('🔄 Testing loadAvailableSnapshots...');
        window.loadAvailableSnapshots().then(() => {
            console.log('✅ loadAvailableSnapshots test completed');
        }).catch(error => {
            console.log('❌ loadAvailableSnapshots failed:', error.message);
        });
    }
};

// Instructions
console.log('\n📋 AVAILABLE FUNCTIONS:');
console.log('   suppressExtensionErrors(true)  - Hide extension errors');
console.log('   suppressExtensionErrors(false) - Show all errors');
console.log('   checkMainAppErrors()           - Check app initialization');
console.log('   testManualSnapshot()           - Test snapshot creation');
console.log('   quickDiagnostic()              - Run all checks');

console.log('\n🚀 Run quickDiagnostic() to start testing!');