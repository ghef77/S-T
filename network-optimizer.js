/**
 * Advanced Network Optimization System
 * Handles request batching, caching, compression, and offline functionality
 */

class NetworkOptimizer {
    constructor() {
        this.requestQueue = new Map();
        this.responseCache = new Map();
        this.batchProcessor = null;
        this.connectionType = this.detectConnectionType();
        this.isOnline = navigator.onLine;
        this.pendingRequests = new Map();
        this.requestDeduplication = new Map();
        
        // Configuration based on connection type
        this.config = this.getOptimizationConfig();
        
        // Statistics
        this.stats = {
            totalRequests: 0,
            cachedResponses: 0,
            batchedRequests: 0,
            compressedRequests: 0,
            networkSavings: 0
        };
        
        this.initialize();
    }

    detectConnectionType() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (!connection) return 'unknown';
        
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink;
        
        return {
            effectiveType,
            downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
        };
    }

    getOptimizationConfig() {
        const baseConfig = {
            batchDelay: 100,
            maxCacheSize: 50,
            cacheTTL: 300000, // 5 minutes
            compressionThreshold: 1024,
            maxConcurrentRequests: 6,
            retryAttempts: 3,
            timeoutDuration: 30000
        };

        if (!this.connectionType || this.connectionType === 'unknown') {
            return baseConfig;
        }

        // Optimize based on connection type
        switch (this.connectionType.effectiveType) {
            case 'slow-2g':
            case '2g':
                return {
                    ...baseConfig,
                    batchDelay: 500,
                    maxCacheSize: 100,
                    cacheTTL: 600000, // 10 minutes
                    maxConcurrentRequests: 2,
                    timeoutDuration: 60000
                };
            case '3g':
                return {
                    ...baseConfig,
                    batchDelay: 200,
                    maxCacheSize: 75,
                    maxConcurrentRequests: 4
                };
            case '4g':
            default:
                return {
                    ...baseConfig,
                    batchDelay: 50,
                    maxConcurrentRequests: 8
                };
        }
    }

    initialize() {
        this.setupEventListeners();
        this.initializeBatchProcessor();
        this.setupServiceWorker();
        this.monitorConnection();
        
        console.log('🌐 Network Optimizer initialized -', this.connectionType.effectiveType || 'unknown', 'connection');
    }

    setupEventListeners() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processOfflineQueue();
            console.log('🟢 Connection restored');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('🔴 Connection lost - queuing requests');
        });

        // Monitor connection changes
        if (navigator.connection) {
            navigator.connection.addEventListener('change', () => {
                this.connectionType = this.detectConnectionType();
                this.config = this.getOptimizationConfig();
                console.log('🔄 Connection changed:', this.connectionType.effectiveType);
            });
        }
    }

    initializeBatchProcessor() {
        this.batchProcessor = {
            queue: [],
            timer: null,
            
            add: (request) => {
                this.batchProcessor.queue.push(request);
                
                if (!this.batchProcessor.timer) {
                    this.batchProcessor.timer = setTimeout(() => {
                        this.processBatch();
                    }, this.config.batchDelay);
                }
            },
            
            flush: () => {
                if (this.batchProcessor.timer) {
                    clearTimeout(this.batchProcessor.timer);
                    this.batchProcessor.timer = null;
                }
                if (this.batchProcessor.queue.length > 0) {
                    this.processBatch();
                }
            }
        };
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            // Check if service worker is already registered
            navigator.serviceWorker.getRegistration().then(registration => {
                if (registration) {
                    console.log('✅ Service Worker already registered');
                    this.serviceWorkerReady = true;
                } else {
                    // Register service worker if available
                    this.registerServiceWorker();
                }
            });
        }
    }

    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('service-worker.js');
            console.log('✅ Service Worker registered:', registration.scope);
            this.serviceWorkerReady = true;
            
            // Listen for updates
            registration.addEventListener('updatefound', () => {
                console.log('🔄 Service Worker update available');
            });
            
        } catch (error) {
            console.warn('⚠️ Service Worker registration failed:', error);
        }
    }

    monitorConnection() {
        // Periodic connection quality check
        setInterval(() => {
            this.checkConnectionQuality();
        }, 30000); // Every 30 seconds
    }

    async checkConnectionQuality() {
        if (!this.isOnline) return;
        
        const startTime = performance.now();
        
        try {
            // Use a small request to test latency
            await fetch('/favicon.ico', { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            const latency = performance.now() - startTime;
            
            // Adjust configuration based on measured latency
            if (latency > 2000) { // Very slow
                this.config.batchDelay = 1000;
                this.config.maxConcurrentRequests = 2;
            } else if (latency > 1000) { // Slow
                this.config.batchDelay = 500;
                this.config.maxConcurrentRequests = 3;
            } else { // Fast
                this.config.batchDelay = 100;
                this.config.maxConcurrentRequests = 6;
            }
            
        } catch (error) {
            console.warn('⚠️ Connection quality check failed');
        }
    }

    // Enhanced fetch with optimization
    async optimizedFetch(url, options = {}) {
        const requestKey = this.generateRequestKey(url, options);
        
        this.stats.totalRequests++;
        
        // Check for duplicate requests
        if (this.requestDeduplication.has(requestKey)) {
            console.log('🔄 Deduplicating request:', url);
            return this.requestDeduplication.get(requestKey);
        }
        
        // Check cache first
        if (options.method === 'GET' || !options.method) {
            const cached = this.getFromCache(requestKey);
            if (cached && !this.isCacheExpired(cached)) {
                this.stats.cachedResponses++;
                console.log('💾 Cache hit:', url);
                return cached.response.clone();
            }
        }
        
        // Handle offline requests
        if (!this.isOnline) {
            return this.handleOfflineRequest(url, options);
        }
        
        // Create optimized request
        const optimizedOptions = this.optimizeRequestOptions(options);
        const requestPromise = this.executeOptimizedRequest(url, optimizedOptions, requestKey);
        
        // Store promise for deduplication
        this.requestDeduplication.set(requestKey, requestPromise);
        
        try {
            const response = await requestPromise;
            
            // Cache successful GET requests
            if (response.ok && (options.method === 'GET' || !options.method)) {
                this.addToCache(requestKey, response.clone());
            }
            
            return response;
            
        } finally {
            // Clean up deduplication entry
            this.requestDeduplication.delete(requestKey);
        }
    }

    optimizeRequestOptions(options) {
        const optimized = { ...options };
        
        // Add compression headers
        if (!optimized.headers) {
            optimized.headers = {};
        }
        
        if (!optimized.headers['Accept-Encoding']) {
            optimized.headers['Accept-Encoding'] = 'gzip, deflate, br';
        }
        
        // Add cache headers based on connection
        if (this.connectionType.saveData || 
            ['slow-2g', '2g', '3g'].includes(this.connectionType.effectiveType)) {
            optimized.headers['Cache-Control'] = 'max-age=300'; // 5 minutes
        }
        
        // Set timeout
        if (!optimized.signal) {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), this.config.timeoutDuration);
            optimized.signal = controller.signal;
        }
        
        return optimized;
    }

    async executeOptimizedRequest(url, options, requestKey) {
        let attempts = 0;
        let lastError = null;
        
        while (attempts < this.config.retryAttempts) {
            try {
                const response = await fetch(url, options);
                
                if (!response.ok && response.status >= 500 && attempts < this.config.retryAttempts - 1) {
                    // Retry server errors
                    attempts++;
                    await this.delay(Math.pow(2, attempts) * 1000); // Exponential backoff
                    continue;
                }
                
                return response;
                
            } catch (error) {
                lastError = error;
                attempts++;
                
                if (attempts < this.config.retryAttempts) {
                    await this.delay(Math.pow(2, attempts) * 1000);
                }
            }
        }
        
        throw lastError || new Error('Request failed after retries');
    }

    // Request batching system
    batchRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const request = {
                url,
                options,
                resolve,
                reject,
                timestamp: Date.now()
            };
            
            this.batchProcessor.add(request);
        });
    }

    async processBatch() {
        const batch = this.batchProcessor.queue.splice(0);
        this.batchProcessor.timer = null;
        
        if (batch.length === 0) return;
        
        console.log(`📦 Processing batch of ${batch.length} requests`);
        this.stats.batchedRequests += batch.length;
        
        // Group requests by domain for better connection reuse
        const requestsByDomain = new Map();
        
        batch.forEach(request => {
            const domain = new URL(request.url, window.location.origin).origin;
            if (!requestsByDomain.has(domain)) {
                requestsByDomain.set(domain, []);
            }
            requestsByDomain.get(domain).push(request);
        });
        
        // Process each domain group concurrently
        const domainPromises = Array.from(requestsByDomain.values()).map(requests => 
            this.processDomainBatch(requests)
        );
        
        await Promise.allSettled(domainPromises);
    }

    async processDomainBatch(requests) {
        // Limit concurrent requests per domain
        const maxConcurrent = Math.min(this.config.maxConcurrentRequests, requests.length);
        const semaphore = this.createSemaphore(maxConcurrent);
        
        const requestPromises = requests.map(async (request) => {
            await semaphore.acquire();
            
            try {
                const response = await this.optimizedFetch(request.url, request.options);
                request.resolve(response);
            } catch (error) {
                request.reject(error);
            } finally {
                semaphore.release();
            }
        });
        
        await Promise.allSettled(requestPromises);
    }

    // Cache management
    addToCache(key, response) {
        // Manage cache size
        if (this.responseCache.size >= this.config.maxCacheSize) {
            this.evictOldestCacheEntries();
        }
        
        this.responseCache.set(key, {
            response,
            timestamp: Date.now(),
            ttl: this.config.cacheTTL
        });
    }

    getFromCache(key) {
        return this.responseCache.get(key);
    }

    isCacheExpired(cacheEntry) {
        return Date.now() - cacheEntry.timestamp > cacheEntry.ttl;
    }

    evictOldestCacheEntries() {
        // Remove 25% of oldest entries
        const entriesToRemove = Math.ceil(this.responseCache.size * 0.25);
        const sortedEntries = Array.from(this.responseCache.entries())
            .sort(([,a], [,b]) => a.timestamp - b.timestamp);
        
        for (let i = 0; i < entriesToRemove; i++) {
            this.responseCache.delete(sortedEntries[i][0]);
        }
        
        console.log(`🧹 Evicted ${entriesToRemove} cache entries`);
    }

    // Offline handling
    handleOfflineRequest(url, options) {
        // Queue request for when connection is restored
        if (!this.offlineQueue) {
            this.offlineQueue = [];
        }
        
        return new Promise((resolve, reject) => {
            this.offlineQueue.push({
                url,
                options,
                resolve,
                reject,
                timestamp: Date.now()
            });
            
            // Try to serve from cache for GET requests
            if (options.method === 'GET' || !options.method) {
                const requestKey = this.generateRequestKey(url, options);
                const cached = this.getFromCache(requestKey);
                
                if (cached) {
                    console.log('📱 Serving from cache while offline:', url);
                    resolve(cached.response.clone());
                } else {
                    reject(new Error('Offline - no cached response available'));
                }
            } else {
                reject(new Error('Offline - cannot perform write operations'));
            }
        });
    }

    async processOfflineQueue() {
        if (!this.offlineQueue || this.offlineQueue.length === 0) return;
        
        console.log(`🔄 Processing ${this.offlineQueue.length} offline requests`);
        
        const queue = this.offlineQueue.splice(0);
        this.offlineQueue = [];
        
        // Process requests in batches
        for (const request of queue) {
            try {
                const response = await this.optimizedFetch(request.url, request.options);
                request.resolve(response);
            } catch (error) {
                request.reject(error);
            }
        }
    }

    // Utility methods
    generateRequestKey(url, options) {
        const method = options.method || 'GET';
        const headers = JSON.stringify(options.headers || {});
        const body = options.body || '';
        
        return `${method}:${url}:${headers}:${body}`;
    }

    createSemaphore(maxConcurrency) {
        let running = 0;
        const queue = [];
        
        return {
            async acquire() {
                return new Promise((resolve) => {
                    if (running < maxConcurrency) {
                        running++;
                        resolve();
                    } else {
                        queue.push(resolve);
                    }
                });
            },
            
            release() {
                running--;
                if (queue.length > 0) {
                    const next = queue.shift();
                    running++;
                    next();
                }
            }
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public API
    async get(url, options = {}) {
        return this.optimizedFetch(url, { ...options, method: 'GET' });
    }

    async post(url, data, options = {}) {
        return this.optimizedFetch(url, {
            ...options,
            method: 'POST',
            body: data
        });
    }

    async put(url, data, options = {}) {
        return this.optimizedFetch(url, {
            ...options,
            method: 'PUT',
            body: data
        });
    }

    async delete(url, options = {}) {
        return this.optimizedFetch(url, { ...options, method: 'DELETE' });
    }

    // Batch API
    batchGet(urls) {
        return Promise.all(urls.map(url => this.batchRequest(url, { method: 'GET' })));
    }

    // Cache management
    clearCache() {
        this.responseCache.clear();
        console.log('🧹 Network cache cleared');
    }

    getStats() {
        const cacheHitRate = this.stats.totalRequests > 0 ? 
            (this.stats.cachedResponses / this.stats.totalRequests * 100).toFixed(1) : 0;
        
        return {
            ...this.stats,
            cacheHitRate: `${cacheHitRate}%`,
            cacheSize: this.responseCache.size,
            connectionType: this.connectionType.effectiveType || 'unknown',
            isOnline: this.isOnline,
            offlineQueueSize: this.offlineQueue ? this.offlineQueue.length : 0
        };
    }

    // Configuration
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ Network configuration updated');
    }
}

// Enhanced Supabase client wrapper with optimization
class OptimizedSupabaseClient {
    constructor(supabaseClient) {
        this.client = supabaseClient;
        this.networkOptimizer = new NetworkOptimizer();
        this.queryCache = new Map();
        this.subscriptions = new Map();
        
        this.setupOptimizations();
    }

    setupOptimizations() {
        // Override fetch method to use network optimizer
        const originalFetch = this.client.rest.fetch;
        
        this.client.rest.fetch = async (url, options) => {
            return this.networkOptimizer.optimizedFetch(url, options);
        };
        
        console.log('🎯 Supabase client optimized');
    }

    // Optimized query methods
    async optimizedSelect(table, query = '', options = {}) {
        const cacheKey = `select:${table}:${query}`;
        const cacheTTL = options.cacheTTL || 60000; // 1 minute default
        
        // Check cache
        if (this.queryCache.has(cacheKey)) {
            const cached = this.queryCache.get(cacheKey);
            if (Date.now() - cached.timestamp < cacheTTL) {
                console.log('💾 Query cache hit:', table);
                return cached.data;
            }
        }
        
        try {
            let queryBuilder = this.client.from(table).select(query);
            
            // Apply filters if provided
            if (options.filters) {
                options.filters.forEach(filter => {
                    queryBuilder = queryBuilder.filter(filter.column, filter.operator, filter.value);
                });
            }
            
            // Apply ordering
            if (options.orderBy) {
                queryBuilder = queryBuilder.order(options.orderBy.column, { 
                    ascending: options.orderBy.ascending 
                });
            }
            
            // Apply limits
            if (options.limit) {
                queryBuilder = queryBuilder.limit(options.limit);
            }
            
            const { data, error } = await queryBuilder;
            
            if (error) throw error;
            
            // Cache successful results
            this.queryCache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            return data;
            
        } catch (error) {
            console.error('❌ Optimized query failed:', error);
            throw error;
        }
    }

    // Batch operations
    async batchInsert(table, records, options = {}) {
        const batchSize = options.batchSize || 100;
        const batches = [];
        
        for (let i = 0; i < records.length; i += batchSize) {
            batches.push(records.slice(i, i + batchSize));
        }
        
        const results = [];
        
        for (const batch of batches) {
            try {
                const { data, error } = await this.client
                    .from(table)
                    .insert(batch);
                
                if (error) throw error;
                results.push(...data);
                
            } catch (error) {
                console.error('❌ Batch insert failed:', error);
                throw error;
            }
        }
        
        return results;
    }

    // Optimized real-time subscriptions
    optimizedSubscribe(table, callback, options = {}) {
        const subscriptionKey = `${table}:${JSON.stringify(options.filters || {})}`;
        
        // Check for existing subscription
        if (this.subscriptions.has(subscriptionKey)) {
            console.log('🔄 Reusing existing subscription:', table);
            const existing = this.subscriptions.get(subscriptionKey);
            existing.callbacks.push(callback);
            return existing.subscription;
        }
        
        // Create new subscription with optimization
        const subscription = this.client
            .channel(`optimized-${table}-${Date.now()}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: table,
                filter: options.filters
            }, (payload) => {
                // Batch callback executions to prevent UI blocking
                if (window.scheduleHighPriority) {
                    window.scheduleHighPriority(() => {
                        this.subscriptions.get(subscriptionKey)?.callbacks.forEach(cb => cb(payload));
                    });
                } else {
                    requestAnimationFrame(() => {
                        this.subscriptions.get(subscriptionKey)?.callbacks.forEach(cb => cb(payload));
                    });
                }
            })
            .subscribe();
        
        this.subscriptions.set(subscriptionKey, {
            subscription,
            callbacks: [callback],
            table,
            options
        });
        
        console.log('📡 Optimized subscription created:', table);
        return subscription;
    }

    // Clean up
    dispose() {
        this.queryCache.clear();
        this.subscriptions.forEach(({ subscription }) => {
            subscription.unsubscribe();
        });
        this.subscriptions.clear();
        this.networkOptimizer.clearCache();
    }
}

// Global network optimizer instance
window.networkOptimizer = new NetworkOptimizer();

// Replace global fetch with optimized version
const originalFetch = window.fetch;
window.optimizedFetch = window.networkOptimizer.optimizedFetch.bind(window.networkOptimizer);

// Optional: Override global fetch (can be enabled if needed)
// window.fetch = window.optimizedFetch;

// Export classes
window.NetworkOptimizer = NetworkOptimizer;
window.OptimizedSupabaseClient = OptimizedSupabaseClient;

// Debug tools
window.debugNetwork = () => {
    console.table(window.networkOptimizer.getStats());
};

console.log('🌐 Network Optimizer loaded - Advanced request batching and caching active');