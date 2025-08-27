/**
 * Advanced Image Optimization System for Staff Table Application
 * Handles image compression, lazy loading, and progressive enhancement
 */

class ImageOptimizer {
    constructor() {
        this.imageCache = new Map();
        this.compressionWorker = null;
        this.loadingQueue = [];
        this.isProcessing = false;
        this.maxConcurrentLoads = 3;
        this.currentLoads = 0;
        
        // Performance mode detection
        this.performanceMode = this.detectPerformanceMode();
        
        // Compression settings based on device capabilities
        this.compressionSettings = this.getCompressionSettings();
        
        this.initializeOptimizations();
    }

    detectPerformanceMode() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const slowConnection = connection && ['slow-2g', '2g', '3g'].includes(connection.effectiveType);
        const lowEndDevice = navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 2;
        
        if (slowConnection || lowEndDevice) return 'aggressive';
        return connection && connection.effectiveType === '4g' ? 'balanced' : 'quality';
    }

    getCompressionSettings() {
        switch (this.performanceMode) {
            case 'aggressive':
                return { quality: 0.6, maxWidth: 800, maxHeight: 600, format: 'webp' };
            case 'balanced':
                return { quality: 0.8, maxWidth: 1200, maxHeight: 900, format: 'webp' };
            case 'quality':
                return { quality: 0.9, maxWidth: 1600, maxHeight: 1200, format: 'webp' };
            default:
                return { quality: 0.8, maxWidth: 1200, maxHeight: 900, format: 'webp' };
        }
    }

    initializeOptimizations() {
        // Initialize compression worker if available
        if ('Worker' in window) {
            try {
                this.compressionWorker = new Worker(URL.createObjectURL(new Blob([`
                    self.onmessage = function(e) {
                        const { imageData, settings, id } = e.data;
                        
                        // Create canvas for compression
                        const canvas = new OffscreenCanvas(settings.maxWidth, settings.maxHeight);
                        const ctx = canvas.getContext('2d');
                        
                        // Create image bitmap and compress
                        createImageBitmap(imageData).then(bitmap => {
                            const aspectRatio = bitmap.width / bitmap.height;
                            let newWidth = settings.maxWidth;
                            let newHeight = settings.maxHeight;
                            
                            if (aspectRatio > 1) {
                                newHeight = newWidth / aspectRatio;
                            } else {
                                newWidth = newHeight * aspectRatio;
                            }
                            
                            canvas.width = newWidth;
                            canvas.height = newHeight;
                            
                            ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
                            
                            canvas.convertToBlob({
                                type: 'image/' + settings.format,
                                quality: settings.quality
                            }).then(blob => {
                                self.postMessage({ id, blob, success: true });
                            }).catch(error => {
                                self.postMessage({ id, error: error.message, success: false });
                            });
                        });
                    };
                `], { type: 'application/javascript' })));

                this.compressionWorker.onmessage = (e) => {
                    this.handleWorkerMessage(e.data);
                };
            } catch (error) {
                console.warn('⚠️ Image compression worker not available:', error);
            }
        }

        // Set up intersection observer for lazy loading
        this.setupLazyLoading();
        
        // Optimize existing images
        this.optimizeExistingImages();
        
        console.log('🖼️ Image Optimizer initialized -', this.performanceMode, 'mode');
    }

    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            this.lazyLoadObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.loadImage(entry.target);
                            this.lazyLoadObserver.unobserve(entry.target);
                        }
                    });
                },
                { 
                    rootMargin: '50px',
                    threshold: 0.1
                }
            );

            // Observe all lazy images
            document.querySelectorAll('img[data-lazy-src]').forEach(img => {
                this.lazyLoadObserver.observe(img);
            });
        }
    }

    optimizeExistingImages() {
        // Find all images and optimize them
        const images = document.querySelectorAll('img:not([data-optimized])');
        
        images.forEach(img => {
            this.processImage(img);
        });
    }

    async processImage(imgElement) {
        if (imgElement.dataset.optimized) return;
        
        const originalSrc = imgElement.src;
        if (!originalSrc || originalSrc.startsWith('data:')) return;

        // Check cache first
        if (this.imageCache.has(originalSrc)) {
            const cachedData = this.imageCache.get(originalSrc);
            this.applyOptimizedImage(imgElement, cachedData.optimizedSrc);
            return;
        }

        // Add to loading queue
        this.queueImageOptimization(imgElement, originalSrc);
    }

    queueImageOptimization(imgElement, originalSrc) {
        const task = {
            element: imgElement,
            originalSrc,
            id: this.generateId(),
            timestamp: performance.now()
        };

        this.loadingQueue.push(task);
        this.processQueue();
    }

    async processQueue() {
        if (this.isProcessing || this.currentLoads >= this.maxConcurrentLoads) {
            return;
        }

        if (this.loadingQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        const task = this.loadingQueue.shift();
        this.currentLoads++;

        try {
            await this.optimizeImage(task);
        } catch (error) {
            console.error('❌ Image optimization failed:', error);
        } finally {
            this.currentLoads--;
            this.isProcessing = false;
            
            // Process next in queue
            if (this.loadingQueue.length > 0) {
                setTimeout(() => this.processQueue(), 10);
            }
        }
    }

    async optimizeImage(task) {
        const { element, originalSrc, id } = task;
        
        try {
            // Load original image
            const originalImage = await this.loadImageAsBlob(originalSrc);
            
            if (this.compressionWorker && originalImage.size > 100000) { // Only compress large images (>100KB)
                // Use worker for compression
                this.compressionWorker.postMessage({
                    imageData: originalImage,
                    settings: this.compressionSettings,
                    id
                });
                
                // Store reference for callback
                this.imageCache.set(originalSrc, { 
                    status: 'compressing', 
                    element,
                    originalSize: originalImage.size 
                });
                
            } else {
                // Direct optimization for smaller images
                const optimizedBlob = await this.compressImageDirect(originalImage);
                const optimizedSrc = URL.createObjectURL(optimizedBlob);
                
                this.cacheOptimizedImage(originalSrc, optimizedSrc, originalImage.size, optimizedBlob.size);
                this.applyOptimizedImage(element, optimizedSrc);
            }
            
        } catch (error) {
            console.error('❌ Image optimization error:', error);
            // Mark as optimized to prevent retry
            element.dataset.optimized = 'failed';
        }
    }

    handleWorkerMessage(data) {
        const { id, blob, success, error } = data;
        
        if (!success) {
            console.error('❌ Worker compression failed:', error);
            return;
        }

        // Find the original source by looking through cache
        for (const [originalSrc, cacheData] of this.imageCache.entries()) {
            if (cacheData.status === 'compressing') {
                const optimizedSrc = URL.createObjectURL(blob);
                
                this.cacheOptimizedImage(originalSrc, optimizedSrc, cacheData.originalSize, blob.size);
                this.applyOptimizedImage(cacheData.element, optimizedSrc);
                break;
            }
        }
    }

    cacheOptimizedImage(originalSrc, optimizedSrc, originalSize, optimizedSize) {
        const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
        
        this.imageCache.set(originalSrc, {
            optimizedSrc,
            originalSize,
            optimizedSize,
            compressionRatio,
            timestamp: Date.now()
        });

        console.log(`📊 Image optimized: ${compressionRatio}% smaller (${this.formatBytes(originalSize)} → ${this.formatBytes(optimizedSize)})`);
    }

    applyOptimizedImage(element, optimizedSrc) {
        // Smooth transition to optimized image
        const img = new Image();
        img.onload = () => {
            if (window.scheduleHighPriority) {
                window.scheduleHighPriority(() => {
                    element.src = optimizedSrc;
                    element.dataset.optimized = 'true';
                    element.style.transition = 'opacity 0.3s ease';
                    element.style.opacity = '1';
                });
            } else {
                element.src = optimizedSrc;
                element.dataset.optimized = 'true';
            }
        };
        img.src = optimizedSrc;
    }

    async loadImageAsBlob(src) {
        const response = await fetch(src);
        if (!response.ok) {
            throw new Error(`Failed to load image: ${response.status}`);
        }
        return await response.blob();
    }

    async compressImageDirect(blob) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                let newWidth = this.compressionSettings.maxWidth;
                let newHeight = this.compressionSettings.maxHeight;
                
                if (aspectRatio > 1) {
                    newHeight = newWidth / aspectRatio;
                } else {
                    newWidth = newHeight * aspectRatio;
                }
                
                canvas.width = newWidth;
                canvas.height = newHeight;
                
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                canvas.toBlob(
                    resolve,
                    `image/${this.compressionSettings.format}`,
                    this.compressionSettings.quality
                );
            };
            
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }

    async loadImage(imgElement) {
        const lazySrc = imgElement.dataset.lazySrc;
        if (!lazySrc) return;

        imgElement.style.opacity = '0.5';
        
        try {
            await this.processImage(imgElement);
            imgElement.removeAttribute('data-lazy-src');
            imgElement.style.opacity = '1';
        } catch (error) {
            console.error('❌ Lazy loading failed:', error);
            imgElement.src = lazySrc; // Fallback to original
            imgElement.style.opacity = '1';
        }
    }

    // Progressive image enhancement
    enableProgressiveLoading(container) {
        const images = container.querySelectorAll('img');
        
        images.forEach(img => {
            // Create low-quality placeholder
            this.createProgressivePlaceholder(img);
        });
    }

    createProgressivePlaceholder(imgElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create tiny blurred version as placeholder
        canvas.width = 20;
        canvas.height = 20;
        
        const tempImg = new Image();
        tempImg.onload = () => {
            ctx.drawImage(tempImg, 0, 0, 20, 20);
            ctx.filter = 'blur(2px)';
            
            const placeholderSrc = canvas.toDataURL('image/jpeg', 0.1);
            imgElement.style.backgroundImage = `url(${placeholderSrc})`;
            imgElement.style.backgroundSize = 'cover';
            imgElement.style.backgroundPosition = 'center';
        };
        
        tempImg.src = imgElement.src;
    }

    // Utility methods
    generateId() {
        return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Public API
    getStats() {
        let totalOriginalSize = 0;
        let totalOptimizedSize = 0;
        let optimizedCount = 0;

        for (const data of this.imageCache.values()) {
            if (typeof data.originalSize === 'number' && typeof data.optimizedSize === 'number') {
                totalOriginalSize += data.originalSize;
                totalOptimizedSize += data.optimizedSize;
                optimizedCount++;
            }
        }

        const totalSavings = totalOriginalSize - totalOptimizedSize;
        const averageCompression = totalOriginalSize > 0 ? 
            ((totalSavings / totalOriginalSize) * 100).toFixed(1) : 0;

        return {
            mode: this.performanceMode,
            optimizedImages: optimizedCount,
            totalSavings: this.formatBytes(totalSavings),
            averageCompression: `${averageCompression}%`,
            cacheSize: this.imageCache.size,
            queueSize: this.loadingQueue.length
        };
    }

    clearCache() {
        // Clean up object URLs to prevent memory leaks
        for (const data of this.imageCache.values()) {
            if (data.optimizedSrc && data.optimizedSrc.startsWith('blob:')) {
                URL.revokeObjectURL(data.optimizedSrc);
            }
        }
        
        this.imageCache.clear();
        this.loadingQueue.length = 0;
        console.log('🧹 Image cache cleared');
    }

    dispose() {
        this.clearCache();
        
        if (this.compressionWorker) {
            this.compressionWorker.terminate();
        }
        
        if (this.lazyLoadObserver) {
            this.lazyLoadObserver.disconnect();
        }
    }
}

// CSS for image optimization
const imageOptimizationCSS = `
/* Image optimization styles */
img[data-lazy-src] {
    background: linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%, #f0f0f0),
                linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%, #f0f0f0);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    animation: loading-pattern 1s linear infinite;
    transition: opacity 0.3s ease;
}

img[data-optimized="true"] {
    transform: translateZ(0); /* GPU acceleration */
}

@keyframes loading-pattern {
    0% { background-position: 0 0, 10px 10px; }
    100% { background-position: 20px 20px, 30px 30px; }
}

/* Progressive enhancement for slow connections */
@media (max-width: 768px) and (max-resolution: 150dpi) {
    img {
        image-rendering: -webkit-optimize-contrast;
        image-rendering: optimize-contrast;
    }
}

/* Reduce image quality on very slow connections */
@media (connection: slow-2g) {
    img {
        filter: contrast(0.9) brightness(1.1);
    }
}
`;

// Apply CSS
const imageOptimizerStyle = document.createElement('style');
imageOptimizerStyle.textContent = imageOptimizationCSS;
document.head.appendChild(imageOptimizerStyle);

// Initialize image optimizer
window.imageOptimizer = new ImageOptimizer();

// Auto-optimize images when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.imageOptimizer.optimizeExistingImages();
    console.log('🚀 Image optimization activated');
});

console.log('📸 Image Optimizer loaded - Advanced compression and lazy loading active');