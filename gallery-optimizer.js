/**
 * Gallery Performance Optimizer
 * Advanced image loading, caching, and rendering optimizations for smooth gallery experience
 */

class GalleryOptimizer {
    constructor(galleryInstance) {
        this.gallery = galleryInstance;
        this.imageCache = new Map();
        this.loadingQueue = [];
        this.visibilityObserver = null;
        this.prefetchObserver = null;
        this.renderedImages = new Set();
        this.loadingImages = new Set();
        
        // Performance settings
        this.settings = {
            lazyLoadThreshold: 0.1,
            prefetchThreshold: 0.5,
            maxConcurrentLoads: 4,
            imageQuality: 0.85,
            cacheTTL: 30 * 60 * 1000, // 30 minutes
            enableWebP: this.supportsWebP(),
            enableProgressiveJPEG: true,
            virtualScrolling: true,
            bufferSize: 5
        };

        this.init();
    }

    init() {
        this.setupIntersectionObservers();
        this.setupImageCache();
        this.optimizeExistingImages();
        this.setupProgressiveLoading();
        
        console.log('🖼️ Gallery Optimizer initialized with advanced performance features');
    }

    supportsWebP() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
    }

    setupIntersectionObservers() {
        // Lazy loading observer
        this.visibilityObserver = new IntersectionObserver(
            this.handleImageVisibility.bind(this),
            {
                rootMargin: '100px',
                threshold: this.settings.lazyLoadThreshold
            }
        );

        // Prefetch observer for images about to come into view
        this.prefetchObserver = new IntersectionObserver(
            this.handleImagePrefetch.bind(this),
            {
                rootMargin: '300px',
                threshold: 0.01
            }
        );
    }

    setupImageCache() {
        // Enhanced image caching with size limits
        this.imageCache = {
            data: new Map(),
            maxSize: 100, // Maximum cached images
            currentSize: 0,
            
            set: (key, value) => {
                if (this.imageCache.currentSize >= this.imageCache.maxSize) {
                    // Remove oldest entries
                    const firstKey = this.imageCache.data.keys().next().value;
                    this.imageCache.data.delete(firstKey);
                    this.imageCache.currentSize--;
                }
                
                this.imageCache.data.set(key, {
                    ...value,
                    timestamp: Date.now(),
                    accessCount: 0
                });
                this.imageCache.currentSize++;
            },
            
            get: (key) => {
                const item = this.imageCache.data.get(key);
                if (item) {
                    // Check TTL
                    if (Date.now() - item.timestamp > this.settings.cacheTTL) {
                        this.imageCache.data.delete(key);
                        this.imageCache.currentSize--;
                        return null;
                    }
                    
                    item.accessCount++;
                    item.lastAccess = Date.now();
                    return item;
                }
                return null;
            },
            
            has: (key) => {
                const item = this.imageCache.get(key);
                return item !== null;
            },
            
            clear: () => {
                this.imageCache.data.clear();
                this.imageCache.currentSize = 0;
            }
        };
    }

    handleImageVisibility(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadImageOptimized(entry.target);
                this.visibilityObserver.unobserve(entry.target);
            }
        });
    }

    handleImagePrefetch(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.prefetchImage(entry.target);
            }
        });
    }

    async loadImageOptimized(imgElement) {
        const originalSrc = imgElement.dataset.src || imgElement.src;
        const imageKey = this.getImageKey(originalSrc);
        
        // Check cache first
        const cachedImage = this.imageCache.get(imageKey);
        if (cachedImage) {
            this.applyOptimizedImage(imgElement, cachedImage.optimizedSrc);
            return;
        }

        // Prevent duplicate loading
        if (this.loadingImages.has(originalSrc)) {
            return;
        }

        this.loadingImages.add(originalSrc);
        
        try {
            // Add to loading queue with priority
            await this.queueImageLoad(imgElement, originalSrc);
        } catch (error) {
            console.error('Failed to load optimized image:', error);
            // Fallback to original image
            imgElement.src = originalSrc;
        } finally {
            this.loadingImages.delete(originalSrc);
        }
    }

    async queueImageLoad(imgElement, src) {
        return new Promise((resolve, reject) => {
            const loadTask = {
                element: imgElement,
                src: src,
                priority: this.getImagePriority(imgElement),
                resolve,
                reject
            };

            this.loadingQueue.push(loadTask);
            this.processLoadingQueue();
        });
    }

    async processLoadingQueue() {
        // Sort by priority (higher priority first)
        this.loadingQueue.sort((a, b) => b.priority - a.priority);
        
        const activeTasks = this.loadingQueue.splice(0, this.settings.maxConcurrentLoads);
        
        const loadPromises = activeTasks.map(async (task) => {
            try {
                const optimizedSrc = await this.createOptimizedImage(task.src, task.element);
                this.applyOptimizedImage(task.element, optimizedSrc);
                
                // Cache the optimized image
                const imageKey = this.getImageKey(task.src);
                this.imageCache.set(imageKey, {
                    originalSrc: task.src,
                    optimizedSrc: optimizedSrc,
                    element: task.element
                });
                
                task.resolve();
            } catch (error) {
                task.reject(error);
            }
        });

        await Promise.allSettled(loadPromises);
        
        // Process remaining queue
        if (this.loadingQueue.length > 0) {
            setTimeout(() => this.processLoadingQueue(), 100);
        }
    }

    getImagePriority(imgElement) {
        const rect = imgElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Higher priority for images closer to viewport
        if (rect.top < viewportHeight) return 10; // In viewport
        if (rect.top < viewportHeight * 1.5) return 8; // Near viewport
        if (rect.top < viewportHeight * 2) return 5; // Somewhat close
        return 1; // Far from viewport
    }

    async createOptimizedImage(src, imgElement) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = () => {
                try {
                    // Calculate optimal dimensions
                    const { width, height } = this.calculateOptimalDimensions(
                        img.naturalWidth, 
                        img.naturalHeight,
                        imgElement
                    );
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Enable image smoothing
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // Draw optimized image
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to optimized format
                    const format = this.settings.enableWebP ? 'image/webp' : 'image/jpeg';
                    const optimizedDataUrl = canvas.toDataURL(format, this.settings.imageQuality);
                    
                    resolve(optimizedDataUrl);
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.crossOrigin = 'anonymous';
            img.src = src;
        });
    }

    calculateOptimalDimensions(naturalWidth, naturalHeight, imgElement) {
        const containerRect = imgElement.parentElement.getBoundingClientRect();
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Target dimensions based on container and device pixel ratio
        const targetWidth = containerRect.width * devicePixelRatio;
        const targetHeight = containerRect.height * devicePixelRatio;
        
        // Calculate aspect ratio preserving dimensions
        const aspectRatio = naturalWidth / naturalHeight;
        let width, height;
        
        if (targetWidth / aspectRatio <= targetHeight) {
            width = Math.min(targetWidth, naturalWidth);
            height = width / aspectRatio;
        } else {
            height = Math.min(targetHeight, naturalHeight);
            width = height * aspectRatio;
        }
        
        return {
            width: Math.round(width),
            height: Math.round(height)
        };
    }

    applyOptimizedImage(imgElement, optimizedSrc) {
        // Progressive enhancement with fade-in effect
        imgElement.style.transition = 'opacity 0.3s ease-in-out';
        imgElement.style.opacity = '0';
        
        const tempImg = new Image();
        tempImg.onload = () => {
            imgElement.src = optimizedSrc;
            imgElement.style.opacity = '1';
            imgElement.classList.add('loaded');
            
            // Remove lazy loading classes
            imgElement.classList.remove('lazy-loading');
            
            // Add performance optimizations
            imgElement.style.willChange = 'auto';
            imgElement.style.transform = 'translateZ(0)';
        };
        
        tempImg.src = optimizedSrc;
    }

    async prefetchImage(imgElement) {
        const src = imgElement.dataset.src || imgElement.src;
        const imageKey = this.getImageKey(src);
        
        if (!this.imageCache.has(imageKey) && !this.loadingImages.has(src)) {
            // Low priority prefetch
            this.queueImageLoad(imgElement, src).catch(() => {
                // Ignore prefetch failures
            });
        }
    }

    optimizeExistingImages() {
        // Find all gallery images and apply lazy loading
        const images = document.querySelectorAll('#gallery-grid img');
        
        images.forEach((img, index) => {
            // Add loading placeholder
            if (!img.src) {
                img.src = this.createPlaceholder(img.clientWidth, img.clientHeight);
            }
            
            // Setup lazy loading
            if (img.src && !img.complete) {
                img.classList.add('lazy-loading');
                this.visibilityObserver.observe(img);
                this.prefetchObserver.observe(img);
            }
            
            // Add performance optimizations
            img.style.willChange = 'transform';
            img.style.transform = 'translateZ(0)';
            
            // Optimize large images
            if (index > 20) { // Only lazy load images beyond first 20
                const originalSrc = img.src;
                img.dataset.src = originalSrc;
                img.src = this.createPlaceholder(200, 200);
                
                this.visibilityObserver.observe(img);
                this.prefetchObserver.observe(img);
            }
        });
    }

    createPlaceholder(width, height) {
        // Create SVG placeholder for better performance than canvas
        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f3f4f6"/>
                <rect x="20%" y="20%" width="60%" height="60%" fill="#e5e7eb" rx="4"/>
                <circle cx="35%" cy="35%" r="8%" fill="#d1d5db"/>
                <rect x="20%" y="55%" width="40%" height="5%" fill="#d1d5db" rx="2"/>
                <rect x="20%" y="65%" width="60%" height="5%" fill="#d1d5db" rx="2"/>
            </svg>
        `;
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    setupProgressiveLoading() {
        // Setup progressive JPEG loading for better perceived performance
        if (!this.settings.enableProgressiveJPEG) return;
        
        const style = document.createElement('style');
        style.textContent = `
            .lazy-loading {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
            }
            
            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            
            .loaded {
                animation: none;
                background: none;
            }
        `;
        document.head.appendChild(style);
    }

    getImageKey(src) {
        // Create consistent cache key
        return btoa(src).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    }

    // Virtual scrolling for large galleries
    enableVirtualScrolling(container) {
        if (!this.settings.virtualScrolling) return;
        
        const itemHeight = 300; // Approximate image card height
        const buffer = this.settings.bufferSize;
        
        let isScrolling = false;
        
        const updateVisibleItems = () => {
            const scrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            const totalHeight = container.scrollHeight;
            
            const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
            const endIndex = Math.min(
                Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer,
                Math.floor(totalHeight / itemHeight)
            );
            
            // Show/hide images based on visibility
            const images = container.querySelectorAll('.image-card');
            images.forEach((img, index) => {
                if (index >= startIndex && index <= endIndex) {
                    img.style.display = '';
                    if (!img.classList.contains('loaded')) {
                        this.loadImageOptimized(img.querySelector('img'));
                    }
                } else {
                    img.style.display = 'none';
                }
            });
        };
        
        container.addEventListener('scroll', () => {
            if (!isScrolling) {
                requestAnimationFrame(() => {
                    updateVisibleItems();
                    isScrolling = false;
                });
                isScrolling = true;
            }
        }, { passive: true });
        
        // Initial render
        updateVisibleItems();
    }

    // Preload next batch of images
    preloadNextBatch(currentIndex, batchSize = 5) {
        if (!this.gallery || !this.gallery.images) return;
        
        const startIndex = currentIndex + 1;
        const endIndex = Math.min(startIndex + batchSize, this.gallery.images.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const image = this.gallery.images[i];
            if (image) {
                // Create invisible image for preloading
                const preloadImg = new Image();
                preloadImg.src = image.url;
                
                // Add to cache when loaded
                preloadImg.onload = () => {
                    const imageKey = this.getImageKey(image.url);
                    this.imageCache.set(imageKey, {
                        originalSrc: image.url,
                        optimizedSrc: image.url,
                        preloaded: true
                    });
                };
            }
        }
    }

    // Performance monitoring
    getPerformanceStats() {
        return {
            cacheSize: this.imageCache.currentSize,
            loadingQueueSize: this.loadingQueue.length,
            activeLoads: this.loadingImages.size,
            renderedImages: this.renderedImages.size,
            cacheTTL: this.settings.cacheTTL,
            webPSupport: this.settings.enableWebP
        };
    }

    // Cleanup method
    dispose() {
        if (this.visibilityObserver) {
            this.visibilityObserver.disconnect();
        }
        if (this.prefetchObserver) {
            this.prefetchObserver.disconnect();
        }
        
        this.imageCache.clear();
        this.loadingQueue.length = 0;
        this.loadingImages.clear();
        this.renderedImages.clear();
        
        console.log('🧹 Gallery Optimizer disposed');
    }
}

// Integration with SimpleGallery
if (typeof window !== 'undefined') {
    window.GalleryOptimizer = GalleryOptimizer;
    
    // Auto-initialize when SimpleGallery is available
    const initializeOptimizer = () => {
        if (window.simpleGallery && !window.simpleGallery.optimizer) {
            window.simpleGallery.optimizer = new GalleryOptimizer(window.simpleGallery);
            
            // Override gallery rendering for optimization
            const originalRenderGallery = window.simpleGallery.renderGallery;
            window.simpleGallery.renderGallery = async function() {
                await originalRenderGallery.call(this);
                
                // Apply optimizations after render
                if (this.optimizer) {
                    setTimeout(() => {
                        this.optimizer.optimizeExistingImages();
                        
                        const galleryGrid = document.getElementById('gallery-grid');
                        if (galleryGrid) {
                            this.optimizer.enableVirtualScrolling(galleryGrid);
                        }
                    }, 100);
                }
            };
            
            console.log('🚀 Gallery Optimizer integrated with SimpleGallery');
        }
    };
    
    // Try to initialize immediately or wait for SimpleGallery
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializeOptimizer, 1000);
        });
    } else {
        setTimeout(initializeOptimizer, 1000);
    }
}

export default GalleryOptimizer;