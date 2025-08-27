/**
 * Realtime Sync Fix
 * Comprehensive fix for realtime synchronization issues
 */

class RealtimeSyncFix {
    constructor() {
        this.initialized = false;
        this.fixApplied = false;
        this.blockingFlagsMonitor = null;
        this.subscriptionAttempts = 0;
        this.maxSubscriptionAttempts = 5;
        
        this.init();
    }

    init() {
        console.log('🔧 Realtime Sync Fix initializing...');
        this.applyFixes();
        this.startFlagMonitoring();
        this.initialized = true;
        console.log('✅ Realtime Sync Fix initialized');
    }

    applyFixes() {
        console.log('🔧 Applying realtime sync fixes...');
        
        // Fix 1: Ensure functions are globally available
        this.exposeRealtimeFunctions();
        
        // Fix 2: Add robust subscription management
        this.enhanceSubscriptionManagement();
        
        // Fix 3: Fix blocking flags logic
        this.fixBlockingFlags();
        
        // Fix 4: Add automatic recovery mechanisms
        this.setupAutoRecovery();
        
        this.fixApplied = true;
        console.log('✅ Realtime sync fixes applied');
    }

    exposeRealtimeFunctions() {
        console.log('🔧 Exposing realtime functions globally...');
        
        // Ensure setupRealtimeSubscription is available globally
        if (typeof window.setupRealtimeSubscription !== 'function') {
            console.log('⚠️ setupRealtimeSubscription not globally available, creating fallback');
            
            window.setupRealtimeSubscription = () => {
                console.log('🔧 [FALLBACK] Setting up realtime subscription...');
                
                if (!window.supabase) {
                    console.error('❌ Supabase client not available');
                    return false;
                }
                
                try {
                    // Clean up existing subscription
                    if (window.realtimeSubscription) {
                        window.supabase.removeChannel(window.realtimeSubscription);
                        window.realtimeSubscription = null;
                    }
                    
                    // Create new subscription with unique channel name
                    const channelName = `staff-table-${Date.now()}`;
                    console.log(`🔄 Creating channel: ${channelName}`);
                    
                    window.realtimeSubscription = window.supabase
                        .channel(channelName)
                        .on('postgres_changes', {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'staffTable'
                        }, (payload) => {
                            console.log('🔄 [FALLBACK-REALTIME] INSERT:', payload);
                            if (typeof window.handleRealtimeUpdate === 'function') {
                                window.handleRealtimeUpdate(payload);
                            }
                        })
                        .on('postgres_changes', {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'staffTable'
                        }, (payload) => {
                            console.log('🔄 [FALLBACK-REALTIME] UPDATE:', payload);
                            if (typeof window.handleRealtimeUpdate === 'function') {
                                window.handleRealtimeUpdate(payload);
                            }
                        })
                        .on('postgres_changes', {
                            event: 'DELETE',
                            schema: 'public',
                            table: 'staffTable'
                        }, (payload) => {
                            console.log('🔄 [FALLBACK-REALTIME] DELETE:', payload);
                            if (typeof window.handleRealtimeUpdate === 'function') {
                                window.handleRealtimeUpdate(payload);
                            }
                        })
                        .subscribe((status, error) => {
                            console.log('📡 [FALLBACK-REALTIME] Subscription status:', status, error);
                            
                            if (status === 'SUBSCRIBED') {
                                console.log('✅ [FALLBACK-REALTIME] Subscription successful');
                                if (typeof window.showMessage === 'function') {
                                    window.showMessage('Synchronisation temps réel activée', 'success');
                                }
                                this.subscriptionAttempts = 0; // Reset attempts on success
                            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                                console.error('❌ [FALLBACK-REALTIME] Subscription failed:', status, error);
                                this.handleSubscriptionFailure(error);
                            }
                        });
                    
                    return true;
                    
                } catch (error) {
                    console.error('❌ Error in fallback setupRealtimeSubscription:', error);
                    return false;
                }
            };
        }
        
        // Ensure handleRealtimeUpdate is available
        if (typeof window.handleRealtimeUpdate !== 'function') {
            console.log('⚠️ handleRealtimeUpdate not globally available, creating fallback');
            
            window.handleRealtimeUpdate = (payload) => {
                console.log('🔄 [FALLBACK] Handling realtime update:', payload);
                
                // Basic implementation - just refresh data
                setTimeout(() => {
                    if (typeof window.fetchInitialData === 'function') {
                        console.log('🔄 [FALLBACK] Refreshing data due to realtime update');
                        window.fetchInitialData(true);
                    }
                }, 1000);
            };
        }
    }

    enhanceSubscriptionManagement() {
        console.log('🔧 Enhancing subscription management...');
        
        // Override the original setupRealtimeSubscription to add error handling
        const originalSetup = window.setupRealtimeSubscription;
        
        window.setupRealtimeSubscription = (...args) => {
            console.log('🔧 [ENHANCED] Setting up realtime subscription with error handling...');
            
            try {
                const result = originalSetup.apply(this, args);
                
                // Add timeout for subscription
                const subscriptionTimeout = setTimeout(() => {
                    if (window.realtimeSubscription && 
                        (!window.realtimeSubscription.state || window.realtimeSubscription.state !== 'joined')) {
                        console.log('⏰ Subscription timeout, retrying...');
                        this.retrySubscription();
                    }
                }, 10000); // 10 second timeout
                
                // Clear timeout when subscription is successful
                if (window.realtimeSubscription) {
                    const checkSubscription = () => {
                        if (window.realtimeSubscription.state === 'joined') {
                            clearTimeout(subscriptionTimeout);
                        }
                    };
                    
                    // Check subscription state periodically
                    const stateInterval = setInterval(() => {
                        if (window.realtimeSubscription.state === 'joined') {
                            clearInterval(stateInterval);
                            clearTimeout(subscriptionTimeout);
                        }
                    }, 1000);
                    
                    // Clear interval after 15 seconds
                    setTimeout(() => clearInterval(stateInterval), 15000);
                }
                
                return result;
                
            } catch (error) {
                console.error('❌ Enhanced setupRealtimeSubscription error:', error);
                this.handleSubscriptionFailure(error);
                return false;
            }
        };
    }

    fixBlockingFlags() {
        console.log('🔧 Fixing blocking flags logic...');
        
        // Create flag manager to prevent flags from getting stuck
        this.flagManager = {
            flags: {
                isLocalSaveInProgress: false,
                isExcelSaveInProgress: false,
                isRestoringCursor: false
            },
            
            timers: {},
            
            setFlag: (flagName, value, maxDuration = 10000) => {
                console.log(`🏁 Setting flag ${flagName} = ${value}`);
                
                this.flagManager.flags[flagName] = value;
                
                // Set corresponding window flag
                if (window[flagName] !== undefined) {
                    window[flagName] = value;
                }
                
                if (value && maxDuration > 0) {
                    // Clear any existing timer
                    if (this.flagManager.timers[flagName]) {
                        clearTimeout(this.flagManager.timers[flagName]);
                    }
                    
                    // Set auto-clear timer
                    this.flagManager.timers[flagName] = setTimeout(() => {
                        console.log(`⏰ Auto-clearing stuck flag: ${flagName}`);
                        this.flagManager.setFlag(flagName, false, 0);
                    }, maxDuration);
                }
            },
            
            getFlag: (flagName) => {
                return this.flagManager.flags[flagName] || window[flagName] || false;
            },
            
            clearAllFlags: () => {
                console.log('🧹 Clearing all blocking flags');
                Object.keys(this.flagManager.flags).forEach(flagName => {
                    this.flagManager.setFlag(flagName, false, 0);
                });
            }
        };
        
        // Expose flag manager globally
        window.realtimeFlagManager = this.flagManager;
        
        // Monitor flags and auto-clear if stuck
        this.startFlagMonitoring();
    }

    startFlagMonitoring() {
        if (this.blockingFlagsMonitor) {
            clearInterval(this.blockingFlagsMonitor);
        }
        
        this.blockingFlagsMonitor = setInterval(() => {
            const flags = this.flagManager.flags;
            const hasBlockingFlags = Object.values(flags).some(flag => flag === true);
            
            if (hasBlockingFlags) {
                console.log('📊 Active blocking flags:', Object.entries(flags).filter(([k, v]) => v));
                
                // Check if flags have been active too long
                const now = Date.now();
                Object.entries(flags).forEach(([flagName, value]) => {
                    if (value) {
                        const timer = this.flagManager.timers[flagName];
                        if (!timer) {
                            console.log(`⚠️ Flag ${flagName} active without timer, setting auto-clear`);
                            this.flagManager.setFlag(flagName, false, 0);
                        }
                    }
                });
            }
        }, 5000); // Check every 5 seconds
    }

    setupAutoRecovery() {
        console.log('🔧 Setting up auto-recovery mechanisms...');
        
        // Auto-recovery: Check realtime connection every 30 seconds
        setInterval(() => {
            this.checkAndRecoverConnection();
        }, 30000);
        
        // Recovery on visibility change (tab focus)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('👁️ Tab visible again, checking realtime connection...');
                setTimeout(() => this.checkAndRecoverConnection(), 2000);
            }
        });
        
        // Recovery on online event
        window.addEventListener('online', () => {
            console.log('🌐 Back online, recovering realtime connection...');
            setTimeout(() => this.checkAndRecoverConnection(), 3000);
        });
    }

    async checkAndRecoverConnection() {
        try {
            // Check if subscription exists and is connected
            const hasSubscription = !!window.realtimeSubscription;
            const isConnected = hasSubscription && 
                window.realtimeSubscription.state === 'joined';
            
            console.log('🔍 Connection check:', { hasSubscription, isConnected });
            
            if (!hasSubscription || !isConnected) {
                console.log('🔧 Connection issue detected, attempting recovery...');
                
                // Clear any blocking flags first
                this.flagManager.clearAllFlags();
                
                // Wait a moment for flags to clear
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Attempt to reconnect
                if (typeof window.setupRealtimeSubscription === 'function') {
                    const success = window.setupRealtimeSubscription();
                    if (success) {
                        console.log('✅ Realtime connection recovered');
                    } else {
                        console.log('⚠️ Recovery attempt failed, will retry later');
                    }
                }
            } else {
                console.log('✅ Realtime connection healthy');
            }
            
        } catch (error) {
            console.error('❌ Error during connection recovery:', error);
        }
    }

    handleSubscriptionFailure(error) {
        this.subscriptionAttempts++;
        console.log(`❌ Subscription failed (attempt ${this.subscriptionAttempts}/${this.maxSubscriptionAttempts}):`, error);
        
        if (this.subscriptionAttempts < this.maxSubscriptionAttempts) {
            const retryDelay = Math.min(1000 * Math.pow(2, this.subscriptionAttempts), 30000); // Exponential backoff, max 30s
            console.log(`🔄 Retrying in ${retryDelay}ms...`);
            
            setTimeout(() => {
                this.retrySubscription();
            }, retryDelay);
        } else {
            console.error('❌ Max subscription attempts reached, stopping retries');
            if (typeof window.showMessage === 'function') {
                window.showMessage('Erreur de synchronisation persistante', 'error');
            }
        }
    }

    retrySubscription() {
        console.log('🔄 Retrying realtime subscription...');
        
        // Clear blocking flags before retry
        this.flagManager.clearAllFlags();
        
        // Wait for flags to clear
        setTimeout(() => {
            if (typeof window.setupRealtimeSubscription === 'function') {
                window.setupRealtimeSubscription();
            }
        }, 1000);
    }

    // Public API methods
    forceReconnect() {
        console.log('🔧 Force reconnecting realtime sync...');
        this.subscriptionAttempts = 0; // Reset attempts
        this.flagManager.clearAllFlags();
        
        // Remove existing subscription
        if (window.realtimeSubscription) {
            try {
                window.supabase.removeChannel(window.realtimeSubscription);
            } catch (error) {
                console.warn('Warning removing channel:', error);
            }
            window.realtimeSubscription = null;
        }
        
        // Wait and reconnect
        setTimeout(() => {
            if (typeof window.setupRealtimeSubscription === 'function') {
                window.setupRealtimeSubscription();
            }
        }, 2000);
    }

    getStatus() {
        return {
            initialized: this.initialized,
            fixApplied: this.fixApplied,
            subscriptionAttempts: this.subscriptionAttempts,
            maxAttempts: this.maxSubscriptionAttempts,
            blockingFlags: this.flagManager ? this.flagManager.flags : {},
            hasSubscription: !!window.realtimeSubscription,
            subscriptionState: window.realtimeSubscription?.state || 'none'
        };
    }

    dispose() {
        if (this.blockingFlagsMonitor) {
            clearInterval(this.blockingFlagsMonitor);
        }
        
        if (this.flagManager) {
            Object.values(this.flagManager.timers).forEach(timer => clearTimeout(timer));
        }
    }
}

// Initialize the fix
window.realtimeSyncFix = new RealtimeSyncFix();

// Expose convenient methods
window.forceRealtimeReconnect = () => window.realtimeSyncFix.forceReconnect();
window.getRealtimeStatus = () => window.realtimeSyncFix.getStatus();
window.clearRealtimeFlags = () => window.realtimeSyncFix.flagManager.clearAllFlags();

console.log('🔧 Realtime Sync Fix loaded. Available commands:');
console.log('  - window.forceRealtimeReconnect() - Force reconnect realtime sync');
console.log('  - window.getRealtimeStatus() - Get current status');
console.log('  - window.clearRealtimeFlags() - Clear all blocking flags');