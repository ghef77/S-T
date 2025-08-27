/**
 * DOM Caching System
 * Optimizes repetitive DOM queries by caching results and managing invalidation
 */

class DOMCache {
    constructor() {
        this.cache = new Map();
        this.observers = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            queries: 0
        };
        
        this.initializeMutationObserver();
    }

    /**
     * Initialize mutation observer to auto-invalidate cache
     */
    initializeMutationObserver() {
        if ('MutationObserver' in window) {
            this.mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // Invalidate cache when DOM structure changes
                        this.invalidateByType('structure');
                    }
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        // Invalidate class-based selectors
                        this.invalidateByType('class');
                    }
                });
            });

            // Observe the main table container
            const tableContainer = document.getElementById('table-container');
            if (tableContainer) {
                this.mutationObserver.observe(tableContainer, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class', 'id']
                });
            }
        }
    }

    /**
     * Generate cache key from selector and context
     */
    generateKey(selector, context = document, options = {}) {
        const contextId = context.id || context.nodeName || 'document';
        const optionsKey = JSON.stringify(options);
        return `${selector}::${contextId}::${optionsKey}`;
    }

    /**
     * Get cached DOM elements or query and cache them with performance optimization
     */
    get(selector, context = document, options = {}) {
        this.stats.queries++;
        const key = this.generateKey(selector, context, options);
        
        if (this.cache.has(key)) {
            const cached = this.cache.get(key);
            // Verify elements are still connected to DOM
            if (options.single) {
                if (cached.elements && cached.elements.isConnected) {
                    this.stats.hits++;
                    return cached.elements;
                }
            } else {
                const validElements = cached.elements.filter(el => el.isConnected);
                if (validElements.length === cached.elements.length && validElements.length > 0) {
                    this.stats.hits++;
                    return validElements;
                }
            }
            // Remove invalid cache entry
            this.cache.delete(key);
        }

        this.stats.misses++;
        
        // Perform the actual query with performance optimization
        let elements;
        if (window.scheduleHighPriority) {
            // Use performance-optimized querying if available
            const queryStart = performance.now();
            if (options.single) {
                elements = context.querySelector(selector);
            } else {
                elements = Array.from(context.querySelectorAll(selector));
            }
            const queryTime = performance.now() - queryStart;
            
            // Log slow queries for optimization
            if (queryTime > 5) {
                console.warn(`Slow DOM query (${queryTime.toFixed(2)}ms):`, selector);
            }
        } else {
            // Fallback to standard querying
            if (options.single) {
                elements = context.querySelector(selector);
            } else {
                elements = Array.from(context.querySelectorAll(selector));
            }
        }

        // Cache with metadata
        this.cache.set(key, {
            elements,
            selector,
            context,
            timestamp: Date.now(),
            type: this.classifySelector(selector)
        });

        return elements;
    }

    /**
     * Get single element (shorthand for options.single = true)
     */
    getSingle(selector, context = document) {
        return this.get(selector, context, { single: true });
    }

    /**
     * Classify selector type for smart invalidation
     */
    classifySelector(selector) {
        if (selector.includes('#')) return 'id';
        if (selector.includes('.')) return 'class';
        if (selector.includes('tr') || selector.includes('td') || selector.includes('th')) return 'structure';
        return 'other';
    }

    /**
     * Invalidate cache entries by type
     */
    invalidateByType(type) {
        const keysToDelete = [];
        for (const [key, value] of this.cache.entries()) {
            if (value.type === type) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
        console.log(`🗑️ Invalidated ${keysToDelete.length} ${type} cache entries`);
    }

    /**
     * Invalidate specific selector
     */
    invalidate(selector, context = document) {
        const key = this.generateKey(selector, context);
        this.cache.delete(key);
    }

    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
        console.log('🗑️ DOM cache cleared');
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.stats.queries > 0 ? 
            (this.stats.hits / this.stats.queries * 100).toFixed(2) : 0;
        
        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            cacheSize: this.cache.size
        };
    }

    /**
     * Auto-cleanup old entries
     */
    cleanup(maxAge = 5 * 60 * 1000) { // 5 minutes default
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > maxAge) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
        if (keysToDelete.length > 0) {
            console.log(`🗑️ Cleaned up ${keysToDelete.length} old cache entries`);
        }
    }
}

// Enhanced table operations with caching
class CachedTableOperations {
    constructor(domCache) {
        this.cache = domCache;
    }

    /**
     * Get all table rows (cached)
     */
    getTableRows() {
        return this.cache.get('#table-body tr');
    }

    /**
     * Get table headers (cached)
     */
    getTableHeaders() {
        return this.cache.get('#data-table thead th');
    }

    /**
     * Get row index efficiently without Array.from every time
     */
    getRowIndex(row) {
        const cachedRows = this.getTableRows();
        return cachedRows.indexOf(row);
    }

    /**
     * Get cell coordinates efficiently
     */
    getCellCoordinates(cell) {
        const row = cell.closest('tr');
        const rowIndex = this.getRowIndex(row);
        const cellIndex = Array.from(row.cells).indexOf(cell);
        
        return { rowIndex, cellIndex };
    }

    /**
     * Get all cells in a column
     */
    getColumnCells(columnIndex) {
        return this.cache.get(`#table-body tr td:nth-child(${columnIndex + 1})`);
    }

    /**
     * Invalidate table-related cache when structure changes
     */
    invalidateTableCache() {
        this.cache.invalidateByType('structure');
    }
}

// Create global instances
window.domCache = new DOMCache();
window.cachedTableOps = new CachedTableOperations(window.domCache);

// Performance monitoring
setInterval(() => {
    window.domCache.cleanup();
}, 2 * 60 * 1000); // Cleanup every 2 minutes

// Report stats in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setInterval(() => {
        const stats = window.domCache.getStats();
        console.log('📊 DOM Cache Stats:', stats);
    }, 30000); // Every 30 seconds in dev
}

// Add to window for debugging
window.getDOMCacheStats = () => window.domCache.getStats();

console.log('🚀 DOM Cache system initialized');