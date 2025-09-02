// HTTP Polling Fallback Demo Integration
// This script integrates the demo with the actual application functions

class HttpPollingDemo {
    constructor() {
        this.isConnected = false;
        this.originalFunctions = {};
        this.demoLog = [];
        this.statusCallbacks = [];
        
        this.init();
    }

    init() {
        console.log('🧪 HTTP Polling Demo Integration initialized');
        this.backupOriginalFunctions();
        this.overrideApplicationFunctions();
        this.startStatusMonitoring();
    }

    // Backup original application functions
    backupOriginalFunctions() {
        if (typeof window.enableHttpPollingMode === 'function') {
            this.originalFunctions.enableHttpPollingMode = window.enableHttpPollingMode;
        }
        if (typeof window.enableWebSocketMode === 'function') {
            this.originalFunctions.enableWebSocketMode = window.enableWebSocketMode;
        }
        if (typeof window.getCurrentSyncMode === 'function') {
            this.originalFunctions.getCurrentSyncMode = window.getCurrentSyncMode;
        }
        if (typeof handleRealtimeConnectionError === 'function') {
            this.originalFunctions.handleRealtimeConnectionError = handleRealtimeConnectionError;
        }
    }

    // Override application functions for demo purposes
    overrideApplicationFunctions() {
        const self = this;

        // Enhanced logging wrapper for existing functions
        if (this.originalFunctions.enableHttpPollingMode) {
            window.enableHttpPollingMode = function() {
                self.logDemo('🔄 [REAL] Enabling HTTP polling mode via application function', 'info');
                return self.originalFunctions.enableHttpPollingMode.apply(this, arguments);
            };
        }

        if (this.originalFunctions.enableWebSocketMode) {
            window.enableWebSocketMode = function() {
                self.logDemo('🔄 [REAL] Enabling WebSocket mode via application function', 'info');
                return self.originalFunctions.enableWebSocketMode.apply(this, arguments);
            };
        }

        // Add demo-specific testing functions
        window.testHttpPollingFallback = () => this.testHttpPollingFallback();
        window.simulateHospitalNetworkReal = () => this.simulateHospitalNetworkReal();
        window.getDemoStatus = () => this.getDemoStatus();
        window.resetDemoState = () => this.resetDemoState();
    }

    // Test HTTP polling fallback with real functions
    async testHttpPollingFallback() {
        this.logDemo('🧪 Starting HTTP polling fallback test...', 'warning');
        
        try {
            // Force WebSocket disconnection if subscription exists
            if (typeof realtimeSubscription !== 'undefined' && realtimeSubscription) {
                this.logDemo('🔌 Disconnecting existing WebSocket subscription...', 'warning');
                supabase.removeChannel(realtimeSubscription);
                realtimeSubscription = null;
            }

            // Simulate multiple WebSocket failure attempts
            this.logDemo('❌ Simulating WebSocket connection failures...', 'error');
            
            // Set retry count to trigger fallback
            if (typeof realtimeRetryCount !== 'undefined') {
                realtimeRetryCount = 4; // Just before max
            }

            // Trigger the actual error handler
            if (typeof handleRealtimeConnectionError === 'function') {
                this.logDemo('🔄 Triggering real error handler...', 'warning');
                handleRealtimeConnectionError();
            }

            // Wait and check if HTTP polling started
            setTimeout(() => {
                this.checkFallbackStatus();
            }, 3000);

        } catch (error) {
            this.logDemo(`❌ Error during fallback test: ${error.message}`, 'error');
        }
    }

    // Check if fallback is working
    checkFallbackStatus() {
        const syncMode = this.originalFunctions.getCurrentSyncMode ? 
            this.originalFunctions.getCurrentSyncMode() : 
            this.getFallbackStatus();

        this.logDemo(`📊 Current sync status: ${JSON.stringify(syncMode)}`, 'info');

        if (syncMode.isHttpPollingActive) {
            this.logDemo('✅ HTTP polling fallback is ACTIVE - test successful!', 'success');
        } else if (syncMode.isWebSocketActive) {
            this.logDemo('⚠️ WebSocket is still active - fallback not triggered', 'warning');
        } else {
            this.logDemo('❓ No active sync detected - checking system state...', 'warning');
        }
    }

    // Get fallback status from global variables
    getFallbackStatus() {
        return {
            isWebSocketActive: typeof realtimeSubscription !== 'undefined' && !!realtimeSubscription,
            isHttpPollingActive: typeof isHttpPollingActive !== 'undefined' ? isHttpPollingActive : false,
            realtimeRetryCount: typeof realtimeRetryCount !== 'undefined' ? realtimeRetryCount : 0,
            httpPollingAttempts: typeof httpPollingAttempts !== 'undefined' ? httpPollingAttempts : 0,
            fallbackMode: typeof fallbackMode !== 'undefined' ? fallbackMode : false
        };
    }

    // Simulate real hospital network conditions
    async simulateHospitalNetworkReal() {
        this.logDemo('🏥 Simulating REAL hospital network conditions...', 'warning');
        
        try {
            // Block WebSocket by removing existing connections
            if (typeof realtimeSubscription !== 'undefined' && realtimeSubscription) {
                this.logDemo('🚫 Blocking WebSocket connection (hospital firewall simulation)', 'error');
                supabase.removeChannel(realtimeSubscription);
                realtimeSubscription = null;
            }

            // Set max retry count to trigger immediate fallback
            if (typeof realtimeRetryCount !== 'undefined') {
                realtimeRetryCount = 5; // Max retries reached
                this.logDemo('⚠️ Setting max retry count - triggering immediate fallback', 'warning');
            }

            // Force HTTP polling activation
            if (typeof startHttpPollingFallback === 'function') {
                this.logDemo('🔄 Activating HTTP polling fallback...', 'info');
                startHttpPollingFallback();
            } else if (this.originalFunctions.enableHttpPollingMode) {
                this.logDemo('🔄 Using manual HTTP polling activation...', 'info');
                this.originalFunctions.enableHttpPollingMode();
            }

            // Monitor the fallback
            this.startFallbackMonitoring();

        } catch (error) {
            this.logDemo(`❌ Error during hospital network simulation: ${error.message}`, 'error');
        }
    }

    // Monitor fallback activity
    startFallbackMonitoring() {
        let monitorCount = 0;
        const maxMonitorChecks = 10;

        const monitor = setInterval(() => {
            monitorCount++;
            const status = this.getFallbackStatus();
            
            this.logDemo(`📡 Monitor check ${monitorCount}: HTTP polling ${status.isHttpPollingActive ? 'ACTIVE' : 'INACTIVE'}`, 
                status.isHttpPollingActive ? 'success' : 'warning');

            if (monitorCount >= maxMonitorChecks) {
                clearInterval(monitor);
                this.logDemo('📊 Monitoring complete - check activity log for results', 'info');
            }
        }, 3000);
    }

    // Start continuous status monitoring
    startStatusMonitoring() {
        setInterval(() => {
            this.broadcastStatus();
        }, 1000);
    }

    // Broadcast status to any listening components
    broadcastStatus() {
        const status = {
            ...this.getFallbackStatus(),
            timestamp: new Date().toISOString(),
            demoActive: true
        };

        this.statusCallbacks.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                console.error('Status callback error:', error);
            }
        });

        // Update demo interface if present
        if (typeof updateDemoStatus === 'function') {
            updateDemoStatus(status);
        }
    }

    // Add status listener
    onStatusUpdate(callback) {
        this.statusCallbacks.push(callback);
    }

    // Demo logging
    logDemo(message, type = 'info') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            message,
            type
        };
        
        this.demoLog.push(logEntry);
        console.log(`[HTTP-DEMO] ${message}`);
        
        // Send to demo interface if available
        if (typeof logActivity === 'function') {
            logActivity(`[REAL] ${message}`, type);
        }
        
        // Keep log size manageable
        if (this.demoLog.length > 100) {
            this.demoLog.shift();
        }
    }

    // Get demo status
    getDemoStatus() {
        return {
            isConnected: this.isConnected,
            logCount: this.demoLog.length,
            recentLogs: this.demoLog.slice(-5),
            syncStatus: this.getFallbackStatus(),
            originalFunctions: Object.keys(this.originalFunctions)
        };
    }

    // Reset demo state
    resetDemoState() {
        this.logDemo('🔄 Resetting demo state...', 'info');
        
        // Reset retry counts
        if (typeof realtimeRetryCount !== 'undefined') {
            realtimeRetryCount = 0;
        }
        if (typeof httpPollingAttempts !== 'undefined') {
            httpPollingAttempts = 0;
        }

        // Stop HTTP polling if active
        if (typeof stopHttpPollingFallback === 'function') {
            stopHttpPollingFallback();
        }

        // Clear demo log
        this.demoLog = [];
        
        this.logDemo('✅ Demo state reset complete', 'success');
    }

    // Performance testing
    async performanceTest() {
        this.logDemo('🚀 Starting performance test...', 'info');
        
        const startTime = performance.now();
        let httpPollingTime = 0;
        let websocketTime = 0;

        try {
            // Test HTTP polling performance
            this.logDemo('📡 Testing HTTP polling performance...', 'info');
            const httpStart = performance.now();
            
            // Simulate HTTP polling data fetch
            if (typeof supabase !== 'undefined') {
                const { data, error } = await supabase
                    .from('staffTable')
                    .select('*')
                    .limit(1);
                
                httpPollingTime = performance.now() - httpStart;
                this.logDemo(`⏱️ HTTP polling test: ${httpPollingTime.toFixed(2)}ms`, 'success');
            }

            // Test WebSocket setup performance
            this.logDemo('🌐 Testing WebSocket setup performance...', 'info');
            const wsStart = performance.now();
            
            if (typeof setupRealtimeSubscription === 'function') {
                setupRealtimeSubscription();
                websocketTime = performance.now() - wsStart;
                this.logDemo(`⏱️ WebSocket setup: ${websocketTime.toFixed(2)}ms`, 'success');
            }

            const totalTime = performance.now() - startTime;
            this.logDemo(`🏁 Performance test complete: ${totalTime.toFixed(2)}ms total`, 'success');

        } catch (error) {
            this.logDemo(`❌ Performance test error: ${error.message}`, 'error');
        }
    }
}

// Initialize demo integration if in demo environment
if (typeof window !== 'undefined' && (window.location.pathname.includes('demo') || window.location.search.includes('demo=true'))) {
    window.httpPollingDemo = new HttpPollingDemo();
    console.log('🧪 HTTP Polling Demo Integration loaded');
    
    // Add global demo functions
    window.testHttpPollingFallback = () => window.httpPollingDemo.testHttpPollingFallback();
    window.simulateHospitalNetworkReal = () => window.httpPollingDemo.simulateHospitalNetworkReal();
    window.performanceTest = () => window.httpPollingDemo.performanceTest();
}

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HttpPollingDemo;
}