/**
 * Timestamp Sync Conflict Fix for Hospital PC
 * Fixes the persistent duplication issue caused by timestamp sync running every 1-3 seconds
 */

class TimestampSyncConflictFix {
    constructor() {
        this.isActive = false;
        this.syncOperationsInProgress = new Set();
        this.lastSyncAttempt = 0;
        this.duplicatePreventionWindow = 2000; // 2 seconds
        this.maxConcurrentSyncs = 1;
        
        // Track timestamp sync state
        this.timestampSyncBlocked = false;
        this.blockReason = null;
        this.blockDuration = 0;
        
        this.init();
    }

    init() {
        console.log('🔧 Timestamp Sync Conflict Fix initializing...');
        this.patchTimestampSyncFunctions();
        this.monitorSyncConflicts();
        this.setupConflictPrevention();
        console.log('✅ Timestamp Sync Conflict Fix ready');
    }

    patchTimestampSyncFunctions() {
        console.log('🔧 Patching timestamp sync functions...');
        
        // Patch startTimestampSync to prevent duplicates
        if (window.startTimestampSync) {
            const original = window.startTimestampSync;
            window.startTimestampSync = () => {
                if (this.syncOperationsInProgress.has('startTimestampSync')) {
                    console.log('🚨 BLOCKED: startTimestampSync already in progress');
                    return;
                }
                
                if (this.timestampSyncBlocked) {
                    console.log(`🚨 BLOCKED: Timestamp sync blocked - ${this.blockReason}`);
                    return;
                }
                
                this.syncOperationsInProgress.add('startTimestampSync');
                console.log('🔄 Starting timestamp sync (conflict-protected)');
                
                try {
                    const result = original();
                    setTimeout(() => {
                        this.syncOperationsInProgress.delete('startTimestampSync');
                    }, 1000);
                    return result;
                } catch (error) {
                    this.syncOperationsInProgress.delete('startTimestampSync');
                    throw error;
                }
            };
        }
        
        // Patch checkUserActivityAndScheduleSync
        if (window.checkUserActivityAndScheduleSync) {
            const originalCheck = window.checkUserActivityAndScheduleSync;
            window.checkUserActivityAndScheduleSync = async () => {
                const now = Date.now();
                
                // Prevent rapid consecutive sync checks
                if (now - this.lastSyncAttempt < this.duplicatePreventionWindow) {
                    console.log('🚨 BLOCKED: Timestamp sync check too frequent');
                    return;
                }
                
                if (this.syncOperationsInProgress.size >= this.maxConcurrentSyncs) {
                    console.log('🚨 BLOCKED: Too many concurrent sync operations');
                    return;
                }
                
                this.lastSyncAttempt = now;
                const operationId = 'checkUserActivity-' + now;
                this.syncOperationsInProgress.add(operationId);
                
                try {
                    console.log('🔍 Checking user activity (conflict-protected)');
                    const result = await originalCheck();
                    
                    setTimeout(() => {
                        this.syncOperationsInProgress.delete(operationId);
                    }, 500);
                    
                    return result;
                } catch (error) {
                    this.syncOperationsInProgress.delete(operationId);
                    console.error('❌ Error in timestamp sync check:', error);
                    throw error;
                }
            };
        }
        
        // Patch getLastModificationTimestamp to prevent database spam
        if (window.getLastModificationTimestamp) {
            const originalGet = window.getLastModificationTimestamp;
            let lastTimestampCheck = 0;
            let cachedTimestamp = null;
            
            window.getLastModificationTimestamp = async () => {
                const now = Date.now();
                
                // Use cached timestamp if recent (within 5 seconds)
                if (cachedTimestamp && (now - lastTimestampCheck) < 5000) {
                    console.log('🔄 Using cached timestamp to prevent database spam');
                    return cachedTimestamp;
                }
                
                try {
                    console.log('🔍 Fetching fresh timestamp from database');
                    const timestamp = await originalGet();
                    
                    cachedTimestamp = timestamp;
                    lastTimestampCheck = now;
                    
                    return timestamp;
                } catch (error) {
                    console.error('❌ Error fetching timestamp:', error);
                    // Return cached timestamp on error if available
                    if (cachedTimestamp) {
                        console.log('⚠️ Using cached timestamp due to error');
                        return cachedTimestamp;
                    }
                    throw error;
                }
            };
        }
        
        console.log('✅ Timestamp sync functions patched');
    }

    monitorSyncConflicts() {
        console.log('👁️ Starting sync conflict monitoring...');
        
        // Monitor every 1 second for conflicts
        setInterval(() => {
            this.detectAndResolveConflicts();
        }, 1000);
        
        // Clean up completed operations every 5 seconds
        setInterval(() => {
            this.cleanupCompletedOperations();
        }, 5000);
    }

    detectAndResolveConflicts() {
        const now = Date.now();
        
        // Check for stuck operations (longer than 10 seconds)
        for (const operationId of this.syncOperationsInProgress) {
            if (typeof operationId === 'string' && operationId.includes('-')) {
                const timestamp = parseInt(operationId.split('-').pop());
                if (timestamp && (now - timestamp) > 10000) {
                    console.log(`🧹 Cleaning up stuck operation: ${operationId}`);
                    this.syncOperationsInProgress.delete(operationId);
                }
            }
        }
        
        // Check for excessive sync operations
        if (this.syncOperationsInProgress.size > 3) {
            console.log('🚨 CONFLICT: Too many sync operations detected - clearing all');
            this.emergencyCleanup();
        }
        
        // Auto-unblock if blocked too long
        if (this.timestampSyncBlocked && (now - this.blockDuration) > 30000) {
            console.log('🔓 Auto-unblocking timestamp sync after 30 seconds');
            this.unblockTimestampSync();
        }
    }

    cleanupCompletedOperations() {
        const activeCount = this.syncOperationsInProgress.size;
        if (activeCount > 0) {
            console.log(`🔍 Active sync operations: ${activeCount}`);
            Array.from(this.syncOperationsInProgress).forEach(op => {
                console.log(`  - ${op}`);
            });
        }
    }

    setupConflictPrevention() {
        console.log('🛡️ Setting up conflict prevention...');
        
        // Override setInterval for timestamp sync to prevent duplicates
        const originalSetInterval = window.setInterval;
        window.setInterval = (callback, interval, ...args) => {
            // Check if this is the timestamp sync interval
            if (interval === 3000 && callback.toString().includes('checkUserActivityAndScheduleSync')) {
                console.log('🛡️ Intercepting timestamp sync interval setup');
                
                // Ensure only one timestamp sync interval exists
                if (window.timestampSyncInterval) {
                    console.log('🚨 CONFLICT: Timestamp sync interval already exists - preventing duplicate');
                    return window.timestampSyncInterval;
                }
                
                // Create protected interval
                const intervalId = originalSetInterval(() => {
                    if (!this.timestampSyncBlocked) {
                        callback();
                    } else {
                        console.log('🛡️ Timestamp sync interval blocked due to conflict');
                    }
                }, interval, ...args);
                
                console.log('✅ Protected timestamp sync interval created');
                return intervalId;
            }
            
            return originalSetInterval(callback, interval, ...args);
        };
        
        console.log('✅ Conflict prevention setup complete');
    }

    // Public methods for emergency control
    blockTimestampSync(reason = 'Manual block', duration = 10000) {
        console.log(`🛑 BLOCKING timestamp sync: ${reason}`);
        this.timestampSyncBlocked = true;
        this.blockReason = reason;
        this.blockDuration = Date.now();
        
        // Auto-unblock after duration
        setTimeout(() => {
            if (this.timestampSyncBlocked && this.blockReason === reason) {
                this.unblockTimestampSync();
            }
        }, duration);
    }

    unblockTimestampSync() {
        console.log('🔓 UNBLOCKING timestamp sync');
        this.timestampSyncBlocked = false;
        this.blockReason = null;
        this.blockDuration = 0;
    }

    emergencyCleanup() {
        console.log('🚨 EMERGENCY: Cleaning up all sync operations');
        
        // Stop all timestamp sync operations
        if (window.timestampSyncInterval) {
            clearInterval(window.timestampSyncInterval);
            window.timestampSyncInterval = null;
        }
        
        if (window.userInactivityTimeout) {
            clearTimeout(window.userInactivityTimeout);
            window.userInactivityTimeout = null;
        }
        
        // Clear operation tracking
        this.syncOperationsInProgress.clear();
        this.lastSyncAttempt = 0;
        
        // Block for 5 seconds to prevent immediate restart
        this.blockTimestampSync('Emergency cleanup', 5000);
        
        // Restart timestamp sync cleanly
        setTimeout(() => {
            if (window.startTimestampSync && typeof window.startTimestampSync === 'function') {
                console.log('🔄 Restarting timestamp sync after emergency cleanup');
                window.startTimestampSync();
            }
        }, 6000);
        
        console.log('✅ Emergency cleanup completed');
    }

    forceStopTimestampSync() {
        console.log('🛑 FORCE STOPPING all timestamp sync');
        
        // Stop the timestamp sync
        if (window.stopTimestampSync) {
            window.stopTimestampSync();
        }
        
        // Block it from restarting
        this.blockTimestampSync('Force stop', 60000); // Block for 1 minute
        
        // Clean up any remaining operations
        this.syncOperationsInProgress.clear();
        
        console.log('🛑 Timestamp sync force stopped and blocked for 1 minute');
    }

    getConflictStatus() {
        return {
            activeOperations: Array.from(this.syncOperationsInProgress),
            operationCount: this.syncOperationsInProgress.size,
            isBlocked: this.timestampSyncBlocked,
            blockReason: this.blockReason,
            lastSyncAttempt: this.lastSyncAttempt,
            timeSinceLastSync: Date.now() - this.lastSyncAttempt
        };
    }

    // Fix specific duplicate issues
    fixDuplicateSnapshotButtons() {
        console.log('🔧 Fixing duplicate snapshot buttons caused by timestamp sync...');
        
        // Find all snapshot buttons
        const buttons = document.querySelectorAll('[id*="manual-snapshot"], [onclick*="handleManualSnapshot"]');
        
        if (buttons.length > 1) {
            console.log(`🚨 Found ${buttons.length} duplicate snapshot buttons`);
            
            // Remove all but the first one
            for (let i = 1; i < buttons.length; i++) {
                console.log(`🗑️ Removing duplicate button #${i}`);
                buttons[i].remove();
            }
            
            // Block timestamp sync temporarily to prevent re-creation
            this.blockTimestampSync('Fixing duplicate buttons', 10000);
            
            console.log('✅ Duplicate snapshot buttons cleaned up');
        }
    }

    fixDuplicateEventListeners() {
        console.log('🔧 Fixing duplicate event listeners caused by timestamp sync...');
        
        // This requires removing and re-adding event listeners
        const snapshotBtn = document.getElementById('manual-snapshot-btn');
        if (snapshotBtn) {
            // Clone the button to remove all event listeners
            const cleanBtn = snapshotBtn.cloneNode(true);
            snapshotBtn.parentNode.replaceChild(cleanBtn, snapshotBtn);
            
            // Add only one clean event listener
            cleanBtn.addEventListener('click', function(e) {
                if (window.handleManualSnapshotClick) {
                    window.handleManualSnapshotClick();
                }
            });
            
            console.log('✅ Event listeners cleaned up');
        }
    }
}

// Initialize the timestamp sync conflict fix
window.timestampSyncFix = new TimestampSyncConflictFix();

// Expose emergency controls
window.blockTimestampSync = (reason, duration) => window.timestampSyncFix.blockTimestampSync(reason, duration);
window.unblockTimestampSync = () => window.timestampSyncFix.unblockTimestampSync();
window.emergencyCleanupSync = () => window.timestampSyncFix.emergencyCleanup();
window.forceStopTimestampSync = () => window.timestampSyncFix.forceStopTimestampSync();
window.getTimestampSyncStatus = () => window.timestampSyncFix.getConflictStatus();
window.fixDuplicateButtons = () => window.timestampSyncFix.fixDuplicateSnapshotButtons();
window.fixDuplicateEvents = () => window.timestampSyncFix.fixDuplicateEventListeners();

console.log('🔧 Timestamp Sync Conflict Fix loaded');
console.log('Available commands:');
console.log('  - window.blockTimestampSync("reason", duration) - Block timestamp sync');
console.log('  - window.unblockTimestampSync() - Unblock timestamp sync');  
console.log('  - window.emergencyCleanupSync() - Emergency cleanup');
console.log('  - window.forceStopTimestampSync() - Force stop sync');
console.log('  - window.getTimestampSyncStatus() - Get current status');
console.log('  - window.fixDuplicateButtons() - Fix duplicate snapshot buttons');
console.log('  - window.fixDuplicateEvents() - Fix duplicate event listeners');