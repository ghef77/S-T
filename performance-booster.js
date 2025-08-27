/**
 * Performance Booster - Advanced optimizations for fluid running and flicker prevention
 * Addresses common performance bottlenecks and visual inconsistencies
 */

class PerformanceBooster {
    constructor() {
        this.rafQueue = new Map();
        this.frameScheduler = null;
        this.performanceMode = this.detectPerformanceMode();
        this.activeAnimations = new Set();
        this.scrollCache = new Map();
        this.resizeCache = new Map();
        
        this.init();
    }

    init() {
        this.setupAdvancedRAF();
        this.optimizeScrolling();
        this.preventFlickering();
        this.optimizeAnimations();
        this.setupAdvancedCaching();
        this.optimizeTimers();
        
        console.log('🚀 Performance Booster initialized -', this.performanceMode, 'mode active');
    }

    detectPerformanceMode() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const slowConnection = connection && connection.effectiveType && 
            ['slow-2g', '2g', '3g'].includes(connection.effectiveType);
        
        const lowEndDevice = navigator.hardwareConcurrency <= 2 || 
            navigator.deviceMemory <= 2;
        
        if (slowConnection || lowEndDevice) {
            return 'power-save';
        }
        
        return window.innerWidth > 1920 && navigator.hardwareConcurrency >= 8 ? 
            'high-performance' : 'balanced';
    }

    setupAdvancedRAF() {
        // Enhanced RAF scheduler with priority queuing
        this.frameScheduler = {
            high: [],
            normal: [],
            low: [],
            isScheduled: false,

            add: (callback, priority = 'normal') => {
                if (this.performanceMode === 'power-save' && priority === 'low') {
                    // Skip low priority operations in power-save mode
                    return;
                }
                
                this.frameScheduler[priority].push(callback);
                
                if (!this.frameScheduler.isScheduled) {
                    this.frameScheduler.isScheduled = true;
                    requestAnimationFrame(this.frameScheduler.flush);
                }
            },

            flush: (timestamp) => {
                const startTime = performance.now();
                const maxFrameTime = this.performanceMode === 'high-performance' ? 16 : 8;
                const frameScheduler = this.frameScheduler;
                
                // Process high priority first
                frameScheduler.processQueue('high', startTime, maxFrameTime);
                
                if (performance.now() - startTime < maxFrameTime) {
                    frameScheduler.processQueue('normal', startTime, maxFrameTime);
                }
                
                if (performance.now() - startTime < maxFrameTime * 0.5) {
                    frameScheduler.processQueue('low', startTime, maxFrameTime);
                }
                
                frameScheduler.isScheduled = false;
                
                // Schedule remaining tasks for next frame if any
                if (frameScheduler.high.length || 
                    frameScheduler.normal.length || 
                    frameScheduler.low.length) {
                    frameScheduler.isScheduled = true;
                    requestAnimationFrame(frameScheduler.flush);
                }
            },

            processQueue: (priority, startTime, maxFrameTime) => {
                const frameScheduler = this.frameScheduler;
                while (frameScheduler[priority].length && 
                       (performance.now() - startTime) < maxFrameTime) {
                    const callback = frameScheduler[priority].shift();
                    try {
                        callback();
                    } catch (error) {
                        console.error('RAF callback error:', error);
                    }
                }
            }
        };

        // Replace global requestAnimationFrame usages
        window.scheduleHighPriority = (callback) => this.frameScheduler.add(callback, 'high');
        window.scheduleNormalPriority = (callback) => this.frameScheduler.add(callback, 'normal');
        window.scheduleLowPriority = (callback) => this.frameScheduler.add(callback, 'low');
    }

    optimizeScrolling() {
        // Advanced scroll optimization with momentum preservation
        let isScrolling = false;
        let scrollTimeout;
        let lastScrollTop = 0;
        let scrollVelocity = 0;
        let lastScrollTime = 0;

        const optimizedScrollHandler = (event) => {
            const now = performance.now();
            const currentScrollTop = event.target.scrollTop || window.pageYOffset;
            
            if (lastScrollTime) {
                scrollVelocity = (currentScrollTop - lastScrollTop) / (now - lastScrollTime);
            }
            
            lastScrollTop = currentScrollTop;
            lastScrollTime = now;

            if (!isScrolling) {
                isScrolling = true;
                document.body.style.pointerEvents = 'none'; // Prevent interference during scroll
                
                // Enable GPU acceleration for smooth scrolling
                document.body.style.willChange = 'scroll-position';
            }

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
                document.body.style.pointerEvents = '';
                document.body.style.willChange = '';
                scrollVelocity = 0;
            }, 150);
        };

        // Apply to all scrollable elements
        document.addEventListener('scroll', optimizedScrollHandler, { passive: true });
        
        // Optimize table scrolling specifically
        const tableContainer = document.getElementById('table-container');
        if (tableContainer) {
            tableContainer.addEventListener('scroll', optimizedScrollHandler, { passive: true });
        }
    }

    preventFlickering() {
        // Advanced flicker prevention system
        const flickerPrevention = {
            pendingUpdates: new Set(),
            
            batchUpdate: (element, updates) => {
                if (this.flickerPrevention.pendingUpdates.has(element)) {
                    return;
                }
                
                this.flickerPrevention.pendingUpdates.add(element);
                
                this.frameScheduler.add(() => {
                    // Force read phase first (batch all reads)
                    const computedStyle = getComputedStyle(element);
                    const rect = element.getBoundingClientRect();
                    
                    // Then batch all writes
                    Object.entries(updates).forEach(([property, value]) => {
                        if (property.startsWith('style.')) {
                            element.style[property.replace('style.', '')] = value;
                        } else {
                            element[property] = value;
                        }
                    });
                    
                    this.flickerPrevention.pendingUpdates.delete(element);
                }, 'high');
            }
        };

        // Replace common DOM manipulation patterns
        window.safeUpdateElement = flickerPrevention.batchUpdate;

        // Optimize table cell updates
        this.optimizeTableCellUpdates();
        
        // Optimize button state changes
        this.optimizeButtonUpdates();
    }

    optimizeTableCellUpdates() {
        // Prevent cell flicker during edits
        const originalMarkEdited = window.markEdited;
        if (originalMarkEdited) {
            window.markEdited = (cell) => {
                // Batch cell styling updates
                this.frameScheduler.add(() => {
                    originalMarkEdited.call(this, cell);
                }, 'high');
            };
        }

        // Optimize cell focus changes
        const originalFocusCell = window.focusCellByPos;
        if (originalFocusCell) {
            window.focusCellByPos = (position) => {
                this.frameScheduler.add(() => {
                    originalFocusCell.call(this, position);
                }, 'high');
            };
        }
    }

    optimizeButtonUpdates() {
        // Prevent button flicker during state changes
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            let lastState = '';
            
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'attributes' && 
                        (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                        
                        const currentState = button.className + button.style.cssText;
                        if (currentState !== lastState) {
                            // Force hardware acceleration on state change
                            button.style.transform = button.style.transform || 'translateZ(0)';
                            button.style.willChange = 'transform, opacity';
                            lastState = currentState;
                            
                            // Clear will-change after animation
                            setTimeout(() => {
                                if (button.style.willChange === 'transform, opacity') {
                                    button.style.willChange = '';
                                }
                            }, 200);
                        }
                    }
                });
            });
            
            observer.observe(button, { attributes: true });
        });
    }

    optimizeAnimations() {
        // Animation performance monitoring and optimization
        const originalAnimate = Element.prototype.animate;
        
        Element.prototype.animate = function(keyframes, options) {
            const animation = originalAnimate.call(this, keyframes, options);
            
            // Track active animations
            this.activeAnimations.add(animation);
            
            // Optimize animation performance
            this.style.willChange = 'transform, opacity';
            
            animation.addEventListener('finish', () => {
                this.activeAnimations.delete(animation);
                if (this.activeAnimations.size === 0) {
                    this.style.willChange = '';
                }
            });
            
            animation.addEventListener('cancel', () => {
                this.activeAnimations.delete(animation);
                if (this.activeAnimations.size === 0) {
                    this.style.willChange = '';
                }
            });
            
            return animation;
        };

        // Optimize CSS transitions
        const style = document.createElement('style');
        style.textContent = `
            * {
                /* Optimize transitions for performance */
                transition-property: transform, opacity, background-color, color, border-color;
            }
            
            .optimized-transform {
                transform: translateZ(0);
                will-change: transform;
            }
            
            .disable-animations {
                transition: none !important;
                animation: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    setupAdvancedCaching() {
        // Advanced caching for frequently accessed elements
        const elementCache = new Map();
        
        window.getCachedElement = (selector, context = document) => {
            const key = `${selector}::${context.id || 'document'}`;
            
            if (elementCache.has(key)) {
                const cached = elementCache.get(key);
                // Verify element is still in DOM
                if (cached.element && cached.element.isConnected) {
                    return cached.element;
                }
                elementCache.delete(key);
            }
            
            const element = context.querySelector(selector);
            if (element) {
                elementCache.set(key, { 
                    element, 
                    timestamp: Date.now(),
                    selector,
                    context 
                });
                
                // Auto-cleanup on element removal
                const observer = new MutationObserver(() => {
                    if (!element.isConnected) {
                        elementCache.delete(key);
                        observer.disconnect();
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            }
            
            return element;
        };

        // Cache frequently accessed table elements
        this.cacheTableElements();
    }

    cacheTableElements() {
        // Pre-cache common table selectors
        const commonSelectors = [
            '#table-body',
            '#data-table',
            '#table-container',
            '#button-bar',
            '#history-bar-container'
        ];
        
        commonSelectors.forEach(selector => {
            window.getCachedElement(selector);
        });
        
        // Update cache when table structure changes
        const tableBody = document.getElementById('table-body');
        if (tableBody) {
            const observer = new MutationObserver(() => {
                // Re-cache table rows when structure changes
                this.frameScheduler.add(() => {
                    window.getCachedElement('#table-body tr', tableBody);
                }, 'low');
            });
            
            observer.observe(tableBody, { childList: true, subtree: true });
        }
    }

    optimizeTimers() {
        // Timer optimization to reduce CPU usage
        const timerOptimizer = {
            intervals: new Map(),
            timeouts: new Map(),
            
            optimizeInterval: (callback, delay, priority = 'normal') => {
                // Align intervals to frame boundaries for better performance
                const alignedDelay = Math.max(delay, 16); // Min 16ms (60fps)
                const optimizedDelay = Math.round(alignedDelay / 16) * 16;
                
                const intervalId = setInterval(() => {
                    if (this.performanceMode === 'power-save' && priority === 'low') {
                        // Skip low priority intervals in power-save mode
                        return;
                    }
                    
                    this.frameScheduler.add(callback, priority);
                }, optimizedDelay);
                
                timerOptimizer.intervals.set(intervalId, { callback, delay: optimizedDelay, priority });
                return intervalId;
            },
            
            optimizeTimeout: (callback, delay, priority = 'normal') => {
                const timeoutId = setTimeout(() => {
                    this.frameScheduler.add(callback, priority);
                    timerOptimizer.timeouts.delete(timeoutId);
                }, delay);
                
                timerOptimizer.timeouts.set(timeoutId, { callback, delay, priority });
                return timeoutId;
            }
        };

        // Replace common timer patterns
        window.optimizedSetInterval = timerOptimizer.optimizeInterval;
        window.optimizedSetTimeout = timerOptimizer.optimizeTimeout;
        
        // Monitor and optimize existing timers
        this.monitorTimerPerformance();
    }

    monitorTimerPerformance() {
        // Monitor performance and adjust timer behavior
        let lastPerformanceCheck = Date.now();
        
        const performanceMonitor = () => {
            const now = Date.now();
            const timeSinceLastCheck = now - lastPerformanceCheck;
            
            // Check frame rate
            const frameRate = 1000 / timeSinceLastCheck;
            
            if (frameRate < 30 && this.performanceMode !== 'power-save') {
                console.log('⚠️ Low frame rate detected, switching to power-save mode');
                this.performanceMode = 'power-save';
                
                // Disable low priority animations
                document.body.classList.add('disable-animations');
                
                // Restore after performance improves
                setTimeout(() => {
                    this.performanceMode = 'balanced';
                    document.body.classList.remove('disable-animations');
                }, 5000);
            }
            
            lastPerformanceCheck = now;
        };
        
        // Check performance every second
        window.optimizedSetInterval(performanceMonitor, 1000, 'low');
    }

    // Public API methods
    enableHighPerformanceMode() {
        this.performanceMode = 'high-performance';
        console.log('🚀 High performance mode enabled');
    }

    enablePowerSaveMode() {
        this.performanceMode = 'power-save';
        document.body.classList.add('disable-animations');
        console.log('🔋 Power save mode enabled');
    }

    getPerformanceStats() {
        return {
            mode: this.performanceMode,
            activeAnimations: this.activeAnimations.size,
            queuedOperations: this.frameScheduler.high.length + 
                             this.frameScheduler.normal.length + 
                             this.frameScheduler.low.length,
            cacheSize: window.getCachedElement ? 
                      Object.keys(window.getCachedElement.cache || {}).length : 0
        };
    }
}

// CSS optimizations for better performance
const performanceCSS = `
/* Force GPU acceleration for smooth animations */
.gpu-accelerated {
    transform: translateZ(0);
    will-change: transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
}

/* Optimize table rendering */
#data-table {
    transform: translateZ(0);
    will-change: scroll-position;
    contain: layout style paint;
}

/* Smooth scrolling optimization */
.smooth-scroll {
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
}

/* Prevent text selection flicker */
.no-select {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

/* Optimize hover effects */
button:hover, .hover-effect:hover {
    transform: translateZ(0) scale(1.02);
    transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Battery-aware animations */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

/* High contrast mode optimizations */
@media (prefers-contrast: high) {
    .message-box {
        border-width: 2px;
    }
}

/* Dark mode performance optimizations */
@media (prefers-color-scheme: dark) {
    body {
        color-scheme: dark;
    }
}
`;

// Apply CSS optimizations
const style = document.createElement('style');
style.textContent = performanceCSS;
document.head.appendChild(style);

// Initialize performance booster
window.performanceBooster = new PerformanceBooster();

// Auto-apply optimizations to existing elements
document.addEventListener('DOMContentLoaded', () => {
    // Apply GPU acceleration to key elements
    const keyElements = [
        '#data-table',
        '#table-container', 
        '#button-bar',
        '.message-box',
        'button'
    ];
    
    keyElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('gpu-accelerated');
        }
    });
    
    // Apply smooth scrolling to scrollable containers
    const scrollableElements = document.querySelectorAll(
        '#table-container, .overflow-auto, .overflow-scroll'
    );
    scrollableElements.forEach(el => el.classList.add('smooth-scroll'));
    
    console.log('🎯 Performance optimizations applied to DOM elements');
});

// Performance debugging tools
window.debugPerformance = () => {
    console.table(window.performanceBooster.getPerformanceStats());
};

console.log('⚡ Performance Booster loaded - Advanced optimizations active');