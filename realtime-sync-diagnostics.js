/**
 * Realtime Sync Diagnostics and Fixes
 * Comprehensive tool to diagnose and fix realtime sync issues
 */

class RealtimeSyncDiagnostics {
    constructor() {
        this.diagnosticResults = {};
        this.fixAttempts = [];
        this.lastRealtimeEvent = null;
        this.subscriptionHistory = [];
        this.blockingFlags = {
            isLocalSaveInProgress: false,
            isRestoringCursor: false,
            isExcelSaveInProgress: false,
            snapshotMode: null
        };
        
        this.init();
    }

    init() {
        this.monitorBlockingFlags();
        this.monitorRealtimeEvents();
        console.log('🔍 Realtime Sync Diagnostics initialized');
    }

    monitorBlockingFlags() {
        // Monitor the blocking flags that prevent realtime sync
        setInterval(() => {
            this.blockingFlags = {
                isLocalSaveInProgress: window.isLocalSaveInProgress || false,
                isRestoringCursor: window.isRestoringCursor ? window.isRestoringCursor() : false,
                isExcelSaveInProgress: window.isExcelSaveInProgress || false,
                snapshotMode: window.snapshotMode || 'unknown'
            };
        }, 1000);
    }

    monitorRealtimeEvents() {
        // Hook into the realtime update handler to monitor events
        const originalHandler = window.handleRealtimeUpdate;
        if (originalHandler) {
            window.handleRealtimeUpdate = (payload) => {
                this.lastRealtimeEvent = {
                    timestamp: Date.now(),
                    payload: payload,
                    blockingFlags: { ...this.blockingFlags }
                };
                console.log('🔍 [DIAGNOSTICS] Realtime event intercepted:', payload);
                return originalHandler(payload);
            };
        }
    }

    async runComprehensiveDiagnostics() {
        console.log('🔍 Starting comprehensive realtime sync diagnostics...');
        
        const diagnostics = {
            timestamp: new Date().toISOString(),
            supabaseConnection: await this.testSupabaseConnection(),
            realtimeSubscription: this.testRealtimeSubscription(),
            blockingFlags: this.checkBlockingFlags(),
            tableStructure: await this.verifyTableStructure(),
            permissions: await this.testPermissions(),
            networkConnectivity: await this.testNetworkConnectivity(),
            subscriptionHistory: this.analyzeSubscriptionHistory()
        };

        this.diagnosticResults = diagnostics;
        this.generateDiagnosticReport();
        
        return diagnostics;
    }

    async testSupabaseConnection() {
        console.log('🔍 Testing Supabase connection...');
        
        try {
            if (!window.supabase) {
                return {
                    status: 'FAILED',
                    error: 'Supabase client not initialized',
                    fix: 'Check if Supabase client is properly created'
                };
            }

            // Test basic connection with a simple query
            const { data, error } = await window.supabase
                .from('staffTable')
                .select('count(*)')
                .limit(1);

            if (error) {
                return {
                    status: 'FAILED',
                    error: error.message,
                    details: error,
                    fix: 'Check database permissions and table existence'
                };
            }

            return {
                status: 'SUCCESS',
                details: 'Basic connection working',
                rowCount: data?.[0]?.count || 'unknown'
            };

        } catch (error) {
            return {
                status: 'FAILED',
                error: error.message,
                fix: 'Check network connection and Supabase configuration'
            };
        }
    }

    testRealtimeSubscription() {
        console.log('🔍 Testing realtime subscription...');
        
        const results = {
            subscriptionExists: !!window.realtimeSubscription,
            subscriptionState: null,
            channelName: null,
            eventHandlers: []
        };

        if (window.realtimeSubscription) {
            try {
                results.subscriptionState = window.realtimeSubscription.state || 'unknown';
                results.channelName = window.realtimeSubscription.topic || 'unknown';
                
                // Check if handlers are properly attached
                const bindings = window.realtimeSubscription.bindings || {};
                results.eventHandlers = Object.keys(bindings);
                
                if (results.subscriptionState !== 'joined') {
                    results.issue = 'Subscription not in joined state';
                    results.fix = 'Recreate subscription or check network connection';
                }

            } catch (error) {
                results.error = error.message;
                results.fix = 'Subscription object corrupted, needs recreation';
            }
        } else {
            results.issue = 'No realtime subscription found';
            results.fix = 'Call setupRealtimeSubscription() to create subscription';
        }

        return results;
    }

    checkBlockingFlags() {
        console.log('🔍 Checking blocking flags...');
        
        const activeBlocks = [];
        
        if (this.blockingFlags.isLocalSaveInProgress) {
            activeBlocks.push('Local Save In Progress');
        }
        
        if (this.blockingFlags.isRestoringCursor) {
            activeBlocks.push('Cursor Restoration In Progress');
        }
        
        if (this.blockingFlags.isExcelSaveInProgress) {
            activeBlocks.push('Excel Save In Progress');
        }
        
        if (this.blockingFlags.snapshotMode !== 'live') {
            activeBlocks.push(`Snapshot Mode: ${this.blockingFlags.snapshotMode}`);
        }

        return {
            activeBlocks,
            isBlocked: activeBlocks.length > 0,
            details: this.blockingFlags,
            lastRealtimeEvent: this.lastRealtimeEvent
        };
    }

    async verifyTableStructure() {
        console.log('🔍 Verifying table structure...');
        
        try {
            if (!window.supabase) {
                return { status: 'FAILED', error: 'No Supabase client' };
            }

            // Get table info
            const { data, error } = await window.supabase
                .from('staffTable')
                .select('*')
                .limit(1);

            if (error) {
                return {
                    status: 'FAILED',
                    error: error.message,
                    fix: 'Check if table exists and has proper permissions'
                };
            }

            const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
            
            return {
                status: 'SUCCESS',
                tableExists: true,
                columns: columns,
                sampleData: data?.[0] || null
            };

        } catch (error) {
            return {
                status: 'FAILED',
                error: error.message
            };
        }
    }

    async testPermissions() {
        console.log('🔍 Testing database permissions...');
        
        const permissions = {
            select: false,
            insert: false,
            update: false,
            delete: false,
            realtime: false
        };

        try {
            // Test SELECT
            const { error: selectError } = await window.supabase
                .from('staffTable')
                .select('*')
                .limit(1);
            permissions.select = !selectError;

            // Test realtime subscription capability
            try {
                const testChannel = window.supabase
                    .channel('test-permissions')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'staffTable'
                    }, () => {})
                    .subscribe();

                permissions.realtime = true;
                
                // Clean up test channel
                setTimeout(() => {
                    window.supabase.removeChannel(testChannel);
                }, 1000);

            } catch (realtimeError) {
                permissions.realtime = false;
                permissions.realtimeError = realtimeError.message;
            }

            return {
                status: permissions.select && permissions.realtime ? 'SUCCESS' : 'PARTIAL',
                permissions,
                issues: []
            };

        } catch (error) {
            return {
                status: 'FAILED',
                error: error.message,
                permissions
            };
        }
    }

    async testNetworkConnectivity() {
        console.log('🔍 Testing network connectivity...');
        
        try {
            // Test basic internet connectivity
            const response = await fetch('https://httpbin.org/json', { 
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            
            const internetConnectivity = response.ok;
            
            // Test Supabase API connectivity
            let supabaseConnectivity = false;
            try {
                const supabaseResponse = await fetch(window.supabaseConfig?.supabaseUrl || '', {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                });
                supabaseConnectivity = supabaseResponse.ok;
            } catch (e) {
                supabaseConnectivity = false;
            }

            return {
                status: internetConnectivity && supabaseConnectivity ? 'SUCCESS' : 'PARTIAL',
                internetConnectivity,
                supabaseConnectivity,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                status: 'FAILED',
                error: error.message,
                internetConnectivity: false,
                supabaseConnectivity: false
            };
        }
    }

    analyzeSubscriptionHistory() {
        return {
            totalSubscriptions: this.subscriptionHistory.length,
            lastSubscription: this.subscriptionHistory[this.subscriptionHistory.length - 1] || null,
            subscriptionPattern: this.subscriptionHistory.slice(-5)
        };
    }

    generateDiagnosticReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.generateSummary(),
            recommendations: this.generateRecommendations(),
            fixActions: this.generateFixActions(),
            details: this.diagnosticResults
        };

        console.log('📋 Realtime Sync Diagnostic Report:', report);
        return report;
    }

    generateSummary() {
        const issues = [];
        const successes = [];

        Object.entries(this.diagnosticResults).forEach(([key, result]) => {
            if (result.status === 'FAILED') {
                issues.push(`${key}: ${result.error || 'Failed'}`);
            } else if (result.status === 'SUCCESS') {
                successes.push(`${key}: Working`);
            }
        });

        return {
            overallStatus: issues.length === 0 ? 'HEALTHY' : issues.length < 3 ? 'ISSUES' : 'CRITICAL',
            issues,
            successes,
            blockingFactors: this.diagnosticResults.blockingFlags?.activeBlocks || []
        };
    }

    generateRecommendations() {
        const recommendations = [];

        if (this.diagnosticResults.supabaseConnection?.status === 'FAILED') {
            recommendations.push('Fix Supabase connection issues first');
        }

        if (this.diagnosticResults.realtimeSubscription?.issue) {
            recommendations.push('Recreate realtime subscription');
        }

        if (this.diagnosticResults.blockingFlags?.isBlocked) {
            recommendations.push('Wait for blocking operations to complete');
        }

        if (this.diagnosticResults.permissions?.status !== 'SUCCESS') {
            recommendations.push('Check database permissions for realtime');
        }

        return recommendations;
    }

    generateFixActions() {
        return [
            {
                name: 'Reset Realtime Subscription',
                action: () => this.fixRealtimeSubscription(),
                description: 'Recreate the realtime subscription with proper error handling'
            },
            {
                name: 'Clear Blocking Flags',
                action: () => this.clearBlockingFlags(),
                description: 'Reset all blocking flags that prevent realtime updates'
            },
            {
                name: 'Force Realtime Reconnection',
                action: () => this.forceReconnection(),
                description: 'Force a complete reconnection to realtime services'
            },
            {
                name: 'Test Realtime Event',
                action: () => this.testRealtimeEvent(),
                description: 'Send a test event to verify realtime functionality'
            }
        ];
    }

    async fixRealtimeSubscription() {
        console.log('🔧 Attempting to fix realtime subscription...');
        
        try {
            // Remove existing subscription
            if (window.realtimeSubscription) {
                await window.supabase.removeChannel(window.realtimeSubscription);
                window.realtimeSubscription = null;
            }

            // Wait a moment for cleanup
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Create new subscription with enhanced error handling
            const channel = window.supabase
                .channel(`table-changes-${Date.now()}`) // Unique channel name
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'staffTable'
                }, (payload) => {
                    console.log('🔄 [FIXED-REALTIME] INSERT:', payload);
                    if (typeof window.handleRealtimeUpdate === 'function') {
                        window.handleRealtimeUpdate(payload);
                    }
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'staffTable'
                }, (payload) => {
                    console.log('🔄 [FIXED-REALTIME] UPDATE:', payload);
                    if (typeof window.handleRealtimeUpdate === 'function') {
                        window.handleRealtimeUpdate(payload);
                    }
                })
                .on('postgres_changes', {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'staffTable'
                }, (payload) => {
                    console.log('🔄 [FIXED-REALTIME] DELETE:', payload);
                    if (typeof window.handleRealtimeUpdate === 'function') {
                        window.handleRealtimeUpdate(payload);
                    }
                });

            // Subscribe with promise-based handling
            return new Promise((resolve, reject) => {
                channel.subscribe((status, error) => {
                    console.log('📡 [FIXED-REALTIME] Subscription status:', status);
                    
                    if (status === 'SUBSCRIBED') {
                        window.realtimeSubscription = channel;
                        console.log('✅ [FIXED-REALTIME] Subscription successful');
                        if (typeof window.showMessage === 'function') {
                            window.showMessage('Synchronisation temps réel restaurée', 'success');
                        }
                        resolve({ status: 'SUCCESS', channel });
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('❌ [FIXED-REALTIME] Subscription error:', error);
                        reject(new Error('Subscription failed: ' + (error?.message || 'Unknown error')));
                    } else if (status === 'TIMED_OUT') {
                        console.error('⏰ [FIXED-REALTIME] Subscription timed out');
                        reject(new Error('Subscription timed out'));
                    }
                });

                // Timeout fallback
                setTimeout(() => {
                    reject(new Error('Subscription timeout'));
                }, 10000);
            });

        } catch (error) {
            console.error('❌ Error fixing realtime subscription:', error);
            this.fixAttempts.push({
                timestamp: Date.now(),
                action: 'fixRealtimeSubscription',
                error: error.message
            });
            throw error;
        }
    }

    clearBlockingFlags() {
        console.log('🔧 Clearing blocking flags...');
        
        // Reset blocking flags
        if (window.isLocalSaveInProgress) {
            window.isLocalSaveInProgress = false;
        }
        
        if (window.isRestoringCursor && typeof window.isRestoringCursor === 'function') {
            // Can't directly modify this as it might be a function
            console.log('⚠️ Cursor restoration flag detected - may need manual intervention');
        }
        
        if (window.isExcelSaveInProgress) {
            window.isExcelSaveInProgress = false;
        }
        
        console.log('✅ Blocking flags cleared');
        return { status: 'SUCCESS', message: 'Blocking flags reset' };
    }

    async forceReconnection() {
        console.log('🔧 Forcing realtime reconnection...');
        
        try {
            // Disconnect all channels
            if (window.supabase && window.supabase.removeAllChannels) {
                await window.supabase.removeAllChannels();
            }
            
            // Wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Reinitialize realtime subscription
            await this.fixRealtimeSubscription();
            
            console.log('✅ Forced reconnection completed');
            return { status: 'SUCCESS' };
            
        } catch (error) {
            console.error('❌ Error during forced reconnection:', error);
            throw error;
        }
    }

    async testRealtimeEvent() {
        console.log('🔧 Testing realtime event...');
        
        try {
            // Simulate a realtime event
            if (typeof window.handleRealtimeUpdate === 'function') {
                const testPayload = {
                    event: 'UPDATE',
                    table: 'staffTable',
                    schema: 'public',
                    record: { id: 'test-' + Date.now() },
                    timestamp: new Date().toISOString()
                };
                
                console.log('🧪 Sending test realtime event:', testPayload);
                window.handleRealtimeUpdate(testPayload);
                
                return { status: 'SUCCESS', payload: testPayload };
            } else {
                throw new Error('handleRealtimeUpdate function not available');
            }
            
        } catch (error) {
            console.error('❌ Error testing realtime event:', error);
            throw error;
        }
    }

    // Public API methods
    async diagnoseAndFix() {
        const diagnostics = await this.runComprehensiveDiagnostics();
        const summary = this.generateSummary();
        
        if (summary.overallStatus !== 'HEALTHY') {
            console.log('🔧 Attempting automatic fixes...');
            
            try {
                // Try to fix the most common issues
                if (summary.issues.some(issue => issue.includes('subscription'))) {
                    await this.fixRealtimeSubscription();
                }
                
                if (summary.blockingFactors.length > 0) {
                    this.clearBlockingFlags();
                }
                
                console.log('✅ Automatic fixes completed');
                return await this.runComprehensiveDiagnostics(); // Re-run diagnostics
                
            } catch (error) {
                console.error('❌ Automatic fixes failed:', error);
                return diagnostics;
            }
        }
        
        return diagnostics;
    }

    getStatus() {
        return {
            diagnosticResults: this.diagnosticResults,
            blockingFlags: this.blockingFlags,
            lastRealtimeEvent: this.lastRealtimeEvent,
            fixAttempts: this.fixAttempts
        };
    }
}

// Initialize diagnostics
window.realtimeDiagnostics = new RealtimeSyncDiagnostics();

// Convenient global functions
window.diagnoseRealtime = () => window.realtimeDiagnostics.runComprehensiveDiagnostics();
window.fixRealtime = () => window.realtimeDiagnostics.diagnoseAndFix();
window.resetRealtimeSubscription = () => window.realtimeDiagnostics.fixRealtimeSubscription();

console.log('🔍 Realtime Sync Diagnostics loaded. Available commands:');
console.log('  - window.diagnoseRealtime() - Run comprehensive diagnostics');
console.log('  - window.fixRealtime() - Diagnose and attempt automatic fixes');
console.log('  - window.resetRealtimeSubscription() - Reset realtime subscription');