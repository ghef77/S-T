// =============================================
// SUPPRESS BROWSER EXTENSION CONSOLE ERRORS
// =============================================
// Run this to clean up your console from extension noise

console.log('🧹 SUPPRESSING BROWSER EXTENSION ERRORS');
console.log('=' .repeat(50));

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// List of extension-related error patterns
const extensionErrorPatterns = [
    'FrameDoesNotExistError',
    'Could not establish connection',
    'Receiving end does not exist',
    'The message port closed before a response was received',
    'background.js',
    'extensionState.js',
    'utils.js',
    'heuristicsRedefinitions.js',
    'Failed to load resource: net::ERR_FILE_NOT_FOUND',
    'content_script',
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://'
];

// Enhanced error filtering function
function isExtensionError(message) {
    const messageStr = String(message);
    return extensionErrorPatterns.some(pattern => messageStr.includes(pattern));
}

// Override console.error
console.error = function(...args) {
    const message = args.join(' ');
    
    // Skip extension errors
    if (isExtensionError(message)) {
        return; // Silently ignore extension errors
    }
    
    // Show other errors normally
    originalConsoleError.apply(console, args);
};

// Override console.warn for extension warnings
console.warn = function(...args) {
    const message = args.join(' ');
    
    // Skip extension warnings
    if (isExtensionError(message)) {
        return; // Silently ignore extension warnings
    }
    
    // Show other warnings normally
    originalConsoleWarn.apply(console, args);
};

// Function to restore original console
window.restoreConsole = function() {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log('✅ Console restored to show all errors');
};

// Function to show extension error count (optional)
let extensionErrorCount = 0;
const originalConsoleErrorWithCount = console.error;
console.error = function(...args) {
    const message = args.join(' ');
    
    if (isExtensionError(message)) {
        extensionErrorCount++;
        return; // Silently count and ignore
    }
    
    originalConsoleError.apply(console, args);
};

// Function to check extension error count
window.showExtensionErrorCount = function() {
    console.log(`🔕 Suppressed ${extensionErrorCount} extension errors`);
};

// Clear console and show clean state
console.clear();
console.log('✅ Browser extension errors suppressed');
console.log('📋 Available functions:');
console.log('   restoreConsole() - Show all errors again');
console.log('   showExtensionErrorCount() - See how many were suppressed');
console.log('');
console.log('🎯 Your console is now clean for app debugging!');
console.log('Extension errors will be hidden, but YOUR app errors will still show.');

// Auto-suppress after 1 second to catch immediate extension errors
setTimeout(() => {
    if (extensionErrorCount > 0) {
        console.log(`🧹 Cleaned up ${extensionErrorCount} extension errors automatically`);
    }
}, 1000);