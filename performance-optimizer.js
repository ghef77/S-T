/**
 * Performance Optimizer for Staff Table Application
 * Optimizes async operations, reduces race conditions, and improves UI responsiveness
 */

class PerformanceOptimizer {
    constructor() {
        this.pendingOperations = new Map();
        this.requestIdleCallbackSupported = 'requestIdleCallback' in window;
        this.intersectionObserver = null;
        this.mutationObserver = null;
        this.scheduledTasks = new Set();
        
        this.initializeObservers();
    }

    initializeObservers() {
        // Initialize Intersection Observer for lazy loading
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver(
                this.handleIntersection.bind(this),
                { threshold: 0.1, rootMargin: '50px' }
            );
        }

        // Initialize Mutation Observer for DOM changes
        if ('MutationObserver' in window) {
            this.mutationObserver = new MutationObserver(
                this.throttle(this.handleMutations.bind(this), 100)
            );
        }
    }

    /**
     * Enhanced debounce with cancellation support
     */
    debounce(func, delay, immediate = false, key = null) {
        if (key && this.pendingOperations.has(key)) {
            clearTimeout(this.pendingOperations.get(key));
        }

        const timeoutId = setTimeout(() => {
            if (key) this.pendingOperations.delete(key);
            if (!immediate) func.apply(this, arguments);
        }, delay);

        if (key) this.pendingOperations.set(key, timeoutId);
        
        if (immediate && (!key || !this.pendingOperations.has(key))) {
            func.apply(this, arguments);
        }
        
        return timeoutId;
    }

    /**
     * Enhanced throttle with leading and trailing edge support
     */
    throttle(func, delay, options = {}) {
        let timeoutId = null;
        let lastExecTime = 0;
        const { leading = true, trailing = true } = options;

        return function throttledFunction(...args) {
            const now = performance.now();
            
            if (!lastExecTime && !leading) {
                lastExecTime = now;
            }

            const remaining = delay - (now - lastExecTime);

            if (remaining <= 0 || remaining > delay) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                lastExecTime = now;
                return func.apply(this, args);
            } else if (!timeoutId && trailing) {
                timeoutId = setTimeout(() => {
                    lastExecTime = leading ? 0 : performance.now();
                    timeoutId = null;
                    func.apply(this, args);
                }, remaining);
            }
        };
    }

    /**
     * Queue operations to prevent race conditions
     */
    async queueOperation(key, operation) {
        // Wait for any pending operation with the same key
        if (this.pendingOperations.has(key)) {
            try {
                await this.pendingOperations.get(key);
            } catch (error) {
                console.warn(`Previous operation with key "${key}" failed:`, error);
            }
        }

        const operationPromise = operation();
        this.pendingOperations.set(key, operationPromise);

        try {
            const result = await operationPromise;
            this.pendingOperations.delete(key);
            return result;
        } catch (error) {
            this.pendingOperations.delete(key);
            throw error;
        }
    }

    /**
     * Batch DOM updates to reduce reflows
     */
    batchDOMUpdates(updates) {
        return new Promise((resolve) => {
            if (this.requestIdleCallbackSupported) {
                requestIdleCallback(() => {
                    this.executeBatchedUpdates(updates);
                    resolve();
                });
            } else {
                setTimeout(() => {
                    this.executeBatchedUpdates(updates);
                    resolve();
                }, 0);
            }
        });
    }

    executeBatchedUpdates(updates) {
        // Force a single reflow by reading layout properties first
        const elementsToRead = updates.filter(update => update.read);
        elementsToRead.forEach(update => update.read());

        // Then perform all writes
        const elementsToWrite = updates.filter(update => update.write);
        elementsToWrite.forEach(update => update.write());
    }

    /**
     * Optimized event delegation
     */
    delegateEvent(container, eventType, selector, handler, options = {}) {
        const { throttleMs = 0, debounceMs = 0 } = options;
        let processedHandler = handler;

        if (throttleMs > 0) {
            processedHandler = this.throttle(handler, throttleMs);
        } else if (debounceMs > 0) {
            processedHandler = this.debounce(handler, debounceMs);
        }

        const delegatedHandler = (event) => {
            const target = event.target.closest(selector);
            if (target && container.contains(target)) {
                processedHandler.call(target, event);
            }
        };

        container.addEventListener(eventType, delegatedHandler, { passive: true, ...options });
        return delegatedHandler;
    }

    /**
     * Memory-efficient history management
     */
    manageHistory(history, maxSize = 50) {
        if (history.length > maxSize) {
            // Remove oldest entries, keep recent ones
            const excessCount = history.length - maxSize;
            history.splice(0, excessCount);
            
            // Trigger garbage collection hint
            if ('gc' in window && typeof window.gc === 'function') {
                window.gc();
            }
        }
        return history;
    }

    /**
     * Optimized table rendering with virtual scrolling
     */
    renderLargeTable(data, container, renderRow, options = {}) {
        const { itemHeight = 50, buffer = 5 } = options;
        const containerHeight = container.clientHeight;
        const visibleCount = Math.ceil(containerHeight / itemHeight) + buffer * 2;
        
        let scrollTop = container.scrollTop;
        let startIndex = Math.floor(scrollTop / itemHeight) - buffer;
        startIndex = Math.max(0, startIndex);
        
        let endIndex = startIndex + visibleCount;
        endIndex = Math.min(data.length, endIndex);

        // Clear existing content efficiently
        container.innerHTML = '';
        
        // Create document fragment for batch insertion
        const fragment = document.createDocumentFragment();
        
        for (let i = startIndex; i < endIndex; i++) {
            const row = renderRow(data[i], i);
            row.style.transform = `translateY(${i * itemHeight}px)`;
            fragment.appendChild(row);
        }
        
        container.appendChild(fragment);
    }

    /**
     * Cleanup and dispose resources
     */
    dispose() {
        // Clear all pending operations
        this.pendingOperations.forEach((operation, key) => {
            if (typeof operation === 'number') {
                clearTimeout(operation);
            }
        });
        this.pendingOperations.clear();

        // Disconnect observers
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }

        // Clear scheduled tasks
        this.scheduledTasks.clear();
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                // Trigger lazy loading or other actions
                element.classList.add('visible');
            }
        });
    }

    handleMutations(mutations) {
        const addedNodes = new Set();
        const removedNodes = new Set();
        
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    addedNodes.add(node);
                }
            });
            mutation.removedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    removedNodes.add(node);
                }
            });
        });

        // Process DOM changes efficiently
        this.processDOMChanges(addedNodes, removedNodes);
    }

    processDOMChanges(addedNodes, removedNodes) {
        // Implement efficient DOM change processing
        addedNodes.forEach(node => {
            // Setup observers or lazy loading for new nodes
            if (this.intersectionObserver && node.dataset && node.dataset.lazy) {
                this.intersectionObserver.observe(node);
            }
        });
    }
}

// Synchronization Manager to handle race conditions
class SynchronizationManager {
    constructor() {
        this.locks = new Map();
        this.operations = new Map();
    }

    async acquireLock(key, timeout = 5000) {
        if (this.locks.has(key)) {
            const existingLock = this.locks.get(key);
            if (Date.now() - existingLock.timestamp > timeout) {
                // Lock has expired, remove it
                this.locks.delete(key);
            } else {
                // Wait for lock to be released
                return new Promise((resolve) => {
                    const checkLock = () => {
                        if (!this.locks.has(key)) {
                            resolve(this.acquireLock(key, timeout));
                        } else {
                            setTimeout(checkLock, 10);
                        }
                    };
                    checkLock();
                });
            }
        }

        const lock = {
            timestamp: Date.now(),
            release: () => this.locks.delete(key)
        };
        this.locks.set(key, lock);
        return lock;
    }

    async executeWithLock(key, operation, timeout = 5000) {
        const lock = await this.acquireLock(key, timeout);
        try {
            const result = await operation();
            return result;
        } finally {
            lock.release();
        }
    }

    // Cancel all pending operations for cleanup
    cancelAll() {
        this.locks.clear();
        this.operations.clear();
    }
}

// Export for use in main application
window.PerformanceOptimizer = PerformanceOptimizer;
window.SynchronizationManager = SynchronizationManager;