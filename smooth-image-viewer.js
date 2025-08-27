/**
 * Smooth Image Viewer with Advanced Performance Optimizations
 * Provides buttery-smooth image viewing experience with hardware acceleration
 */

class SmoothImageViewer {
    constructor(galleryInstance) {
        this.gallery = galleryInstance;
        this.currentImageElement = null;
        this.isTransitioning = false;
        this.preloadedImages = new Map();
        this.transitionDuration = 300;
        
        // Touch and gesture support
        this.touchState = {
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            isDragging: false,
            isSwipe: false,
            initialDistance: 0,
            currentDistance: 0,
            isPinching: false
        };

        // Animation state
        this.animationFrameId = null;
        this.pendingTransitions = new Set();
        
        this.init();
    }

    init() {
        this.setupImageViewer();
        this.setupTouchHandlers();
        this.setupKeyboardShortcuts();
        this.setupPreloading();
        this.applyOptimizedStyles();
        
        console.log('📱 Smooth Image Viewer initialized with touch and gesture support');
    }

    setupImageViewer() {
        const viewerHTML = `
            <div id="smooth-image-viewer" class="image-viewer-overlay hidden">
                <div class="viewer-container">
                    <!-- Header with controls -->
                    <div class="viewer-header">
                        <div class="viewer-info">
                            <span id="viewer-counter" class="counter-display">1 / 1</span>
                            <span id="viewer-caption" class="image-caption">Image Caption</span>
                        </div>
                        <div class="viewer-controls">
                            <button id="zoom-out-btn" class="control-btn" title="Zoom Out (-)">
                                <i class="fas fa-search-minus"></i>
                            </button>
                            <span id="zoom-level" class="zoom-display">100%</span>
                            <button id="zoom-in-btn" class="control-btn" title="Zoom In (+)">
                                <i class="fas fa-search-plus"></i>
                            </button>
                            <button id="zoom-reset-btn" class="control-btn" title="Reset Zoom (0)">
                                <i class="fas fa-expand-arrows-alt"></i>
                            </button>
                            <button id="fullscreen-btn" class="control-btn" title="Fullscreen (F)">
                                <i class="fas fa-expand"></i>
                            </button>
                            <button id="close-viewer" class="control-btn close-btn" title="Close (Esc)">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Main image container with hardware acceleration -->
                    <div class="image-container" id="image-container">
                        <div class="image-wrapper" id="image-wrapper">
                            <img id="viewer-image" class="viewer-image" alt="Gallery Image">
                            <div class="loading-spinner hidden" id="image-loading">
                                <div class="spinner"></div>
                                <span>Loading...</span>
                            </div>
                        </div>
                        
                        <!-- Navigation arrows -->
                        <button id="prev-image" class="nav-arrow nav-prev" title="Previous (←)">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button id="next-image" class="nav-arrow nav-next" title="Next (→)">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>

                    <!-- Touch indicators -->
                    <div class="touch-indicators">
                        <div class="swipe-hint left-hint">
                            <i class="fas fa-chevron-left"></i>
                            <span>Swipe</span>
                        </div>
                        <div class="swipe-hint right-hint">
                            <span>Swipe</span>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        <div class="pinch-hint">
                            <i class="fas fa-expand-arrows-alt"></i>
                            <span>Pinch to zoom</span>
                        </div>
                    </div>

                    <!-- Progress indicator -->
                    <div class="progress-indicator">
                        <div class="progress-bar" id="progress-bar"></div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing viewer if any
        const existingViewer = document.getElementById('smooth-image-viewer');
        if (existingViewer) {
            existingViewer.remove();
        }

        document.body.insertAdjacentHTML('beforeend', viewerHTML);
        this.viewer = document.getElementById('smooth-image-viewer');
    }

    applyOptimizedStyles() {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            .image-viewer-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.95);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                           visibility 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
            }

            .image-viewer-overlay:not(.hidden) {
                opacity: 1;
                visibility: visible;
            }

            .viewer-container {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                position: relative;
                will-change: transform;
                transform: translateZ(0);
            }

            .viewer-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem 2rem;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                color: white;
                position: relative;
                z-index: 10001;
                transform: translateZ(0);
            }

            .viewer-info {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .counter-display {
                font-size: 0.875rem;
                opacity: 0.8;
            }

            .image-caption {
                font-size: 1rem;
                font-weight: 500;
            }

            .viewer-controls {
                display: flex;
                gap: 0.5rem;
                align-items: center;
            }

            .control-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                will-change: transform, background-color;
                transform: translateZ(0);
            }

            .control-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateZ(0) scale(1.05);
            }

            .control-btn:active {
                transform: translateZ(0) scale(0.95);
            }

            .zoom-display {
                color: white;
                font-size: 0.875rem;
                min-width: 50px;
                text-align: center;
            }

            .close-btn {
                background: rgba(255, 0, 0, 0.2);
                border-color: rgba(255, 0, 0, 0.3);
            }

            .close-btn:hover {
                background: rgba(255, 0, 0, 0.3);
            }

            .image-container {
                flex: 1;
                position: relative;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                will-change: transform;
                transform: translateZ(0);
            }

            .image-wrapper {
                position: relative;
                width: fit-content;
                height: fit-content;
                will-change: transform;
                transform: translateZ(0);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .viewer-image {
                max-width: 90vw;
                max-height: 80vh;
                object-fit: contain;
                border-radius: 8px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                will-change: transform, opacity;
                transform: translateZ(0);
                transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: grab;
            }

            .viewer-image:active {
                cursor: grabbing;
            }

            .viewer-image.loading {
                opacity: 0.5;
            }

            .nav-arrow {
                position: absolute;
                top: 50%;
                transform: translateY(-50%) translateZ(0);
                background: rgba(0, 0, 0, 0.7);
                border: none;
                color: white;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 1.5rem;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                will-change: transform, opacity;
                opacity: 0.7;
                backdrop-filter: blur(10px);
            }

            .nav-prev {
                left: 2rem;
            }

            .nav-next {
                right: 2rem;
            }

            .nav-arrow:hover {
                opacity: 1;
                transform: translateY(-50%) translateZ(0) scale(1.1);
                background: rgba(0, 0, 0, 0.8);
            }

            .nav-arrow:active {
                transform: translateY(-50%) translateZ(0) scale(0.95);
            }

            .loading-spinner {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) translateZ(0);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
                color: white;
            }

            .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-top: 3px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                will-change: transform;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .touch-indicators {
                position: absolute;
                bottom: 2rem;
                left: 50%;
                transform: translateX(-50%) translateZ(0);
                display: flex;
                gap: 2rem;
                opacity: 0;
                transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: none;
            }

            .touch-indicators.show {
                opacity: 1;
            }

            .swipe-hint, .pinch-hint {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: white;
                font-size: 0.875rem;
                background: rgba(0, 0, 0, 0.7);
                padding: 0.5rem 1rem;
                border-radius: 20px;
                backdrop-filter: blur(10px);
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }

            .progress-indicator {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: rgba(255, 255, 255, 0.1);
            }

            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                width: 0%;
                transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                will-change: transform;
            }

            /* Mobile optimizations */
            @media (max-width: 768px) {
                .viewer-header {
                    padding: 1rem;
                }
                
                .viewer-controls {
                    gap: 0.25rem;
                }
                
                .control-btn {
                    width: 36px;
                    height: 36px;
                }
                
                .nav-arrow {
                    width: 50px;
                    height: 50px;
                    font-size: 1.25rem;
                }
                
                .nav-prev {
                    left: 1rem;
                }
                
                .nav-next {
                    right: 1rem;
                }
                
                .viewer-image {
                    max-width: 95vw;
                    max-height: 75vh;
                }

                .touch-indicators {
                    bottom: 1rem;
                    gap: 1rem;
                }
            }

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .image-viewer-overlay,
                .image-wrapper,
                .viewer-image,
                .nav-arrow,
                .control-btn {
                    transition: none !important;
                    animation: none !important;
                }
            }

            /* High contrast support */
            @media (prefers-contrast: high) {
                .image-viewer-overlay {
                    background: rgba(0, 0, 0, 0.98);
                }
                
                .control-btn {
                    border-color: white;
                }
            }
        `;

        document.head.appendChild(styleSheet);
    }

    setupTouchHandlers() {
        const imageContainer = document.getElementById('image-container');
        const imageWrapper = document.getElementById('image-wrapper');
        
        if (!imageContainer || !imageWrapper) return;

        // Touch start
        imageContainer.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e);
        }, { passive: false });

        // Touch move
        imageContainer.addEventListener('touchmove', (e) => {
            this.handleTouchMove(e);
        }, { passive: false });

        // Touch end
        imageContainer.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e);
        }, { passive: false });

        // Mouse events for desktop dragging
        imageContainer.addEventListener('mousedown', (e) => {
            this.handleMouseStart(e);
        });

        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });

        document.addEventListener('mouseup', (e) => {
            this.handleMouseEnd(e);
        });

        // Show touch hints on mobile
        this.showTouchHints();
    }

    handleTouchStart(e) {
        if (e.touches.length === 1) {
            // Single touch - prepare for swipe or pan
            this.touchState.startX = e.touches[0].clientX;
            this.touchState.startY = e.touches[0].clientY;
            this.touchState.isDragging = false;
            this.touchState.isSwipe = false;
        } else if (e.touches.length === 2) {
            // Multi-touch - prepare for pinch zoom
            this.touchState.isPinching = true;
            this.touchState.initialDistance = this.getTouchDistance(e.touches);
            this.touchState.currentDistance = this.touchState.initialDistance;
        }

        e.preventDefault();
    }

    handleTouchMove(e) {
        if (e.touches.length === 1 && !this.touchState.isPinching) {
            const deltaX = e.touches[0].clientX - this.touchState.startX;
            const deltaY = e.touches[0].clientY - this.touchState.startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > 10) {
                this.touchState.isDragging = true;
                
                // Determine if it's a swipe (horizontal > vertical)
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                    this.touchState.isSwipe = true;
                    
                    // Provide visual feedback
                    const imageWrapper = document.getElementById('image-wrapper');
                    if (imageWrapper) {
                        const translateX = deltaX * 0.3; // Damping factor
                        imageWrapper.style.transform = `translateX(${translateX}px) translateZ(0)`;
                        imageWrapper.style.opacity = Math.max(0.5, 1 - Math.abs(translateX) / 200);
                    }
                }
            }
        } else if (e.touches.length === 2 && this.touchState.isPinching) {
            // Handle pinch zoom
            this.touchState.currentDistance = this.getTouchDistance(e.touches);
            const scale = this.touchState.currentDistance / this.touchState.initialDistance;
            
            // Apply zoom with bounds checking
            const currentZoom = this.gallery?.currentZoom || 1;
            const newZoom = Math.max(0.5, Math.min(3, currentZoom * scale));
            
            if (this.gallery?.applyZoom) {
                this.gallery.currentZoom = newZoom;
                this.gallery.applyZoom();
            }
        }

        e.preventDefault();
    }

    handleTouchEnd(e) {
        if (this.touchState.isSwipe && e.changedTouches.length === 1) {
            const deltaX = e.changedTouches[0].clientX - this.touchState.startX;
            
            // Reset visual feedback first
            const imageWrapper = document.getElementById('image-wrapper');
            if (imageWrapper) {
                imageWrapper.style.transform = 'translateX(0) translateZ(0)';
                imageWrapper.style.opacity = '1';
                imageWrapper.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
                
                // Remove transition after animation
                setTimeout(() => {
                    if (imageWrapper) {
                        imageWrapper.style.transition = '';
                    }
                }, 300);
            }
            
            // Navigate based on swipe direction
            if (Math.abs(deltaX) > 80) {
                if (deltaX > 0) {
                    this.previousImage();
                } else {
                    this.nextImage();
                }
            }
        }

        // Reset touch state
        this.touchState = {
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            isDragging: false,
            isSwipe: false,
            initialDistance: 0,
            currentDistance: 0,
            isPinching: false
        };

        e.preventDefault();
    }

    handleMouseStart(e) {
        if (e.button === 0) { // Left mouse button
            this.touchState.startX = e.clientX;
            this.touchState.startY = e.clientY;
            this.touchState.isDragging = true;
            e.preventDefault();
        }
    }

    handleMouseMove(e) {
        if (this.touchState.isDragging) {
            // Handle pan when zoomed
            if (this.gallery && this.gallery.currentZoom > 1) {
                const deltaX = e.clientX - this.touchState.startX;
                const deltaY = e.clientY - this.touchState.startY;
                
                if (this.gallery.panX !== undefined) {
                    this.gallery.panX += deltaX * 0.5;
                    this.gallery.panY += deltaY * 0.5;
                    this.gallery.applyZoom();
                }
                
                this.touchState.startX = e.clientX;
                this.touchState.startY = e.clientY;
            }
        }
    }

    handleMouseEnd(e) {
        this.touchState.isDragging = false;
    }

    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    showTouchHints() {
        const touchIndicators = document.querySelector('.touch-indicators');
        if (touchIndicators && 'ontouchstart' in window) {
            touchIndicators.classList.add('show');
            
            // Hide after 3 seconds
            setTimeout(() => {
                touchIndicators.classList.remove('show');
            }, 3000);
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible()) return;

            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    this.previousImage();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    this.nextImage();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.close();
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.zoomIn();
                    break;
                case '-':
                case '_':
                    e.preventDefault();
                    this.zoomOut();
                    break;
                case '0':
                    e.preventDefault();
                    this.resetZoom();
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'r':
                case 'R':
                    e.preventDefault();
                    this.rotateImage();
                    break;
            }
        });
    }

    setupPreloading() {
        // Preload adjacent images for smooth navigation
        this.preloadQueue = [];
        this.maxPreload = 3;
    }

    open(imageIndex) {
        if (!this.gallery || !this.gallery.images) return;
        
        this.gallery.currentImageIndex = imageIndex;
        this.viewer.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        this.displayCurrentImage();
        this.preloadAdjacentImages();
        this.updateProgress();
        
        // Add show class after a frame to trigger animation
        requestAnimationFrame(() => {
            this.viewer.classList.add('show');
        });
    }

    close() {
        this.viewer.classList.remove('show');
        document.body.style.overflow = '';
        
        // Hide after transition
        setTimeout(() => {
            this.viewer.classList.add('hidden');
        }, 300);
        
        // Reset zoom and pan
        if (this.gallery) {
            this.gallery.currentZoom = 1;
            this.gallery.panX = 0;
            this.gallery.panY = 0;
        }
    }

    isVisible() {
        return !this.viewer.classList.contains('hidden');
    }

    displayCurrentImage() {
        if (!this.gallery || !this.gallery.images) return;
        
        const image = this.gallery.images[this.gallery.currentImageIndex];
        if (!image) return;

        const viewerImage = document.getElementById('viewer-image');
        const viewerCaption = document.getElementById('viewer-caption');
        const viewerCounter = document.getElementById('viewer-counter');
        const loadingSpinner = document.getElementById('image-loading');

        if (!viewerImage || !viewerCaption || !viewerCounter) return;

        // Show loading spinner
        if (loadingSpinner) {
            loadingSpinner.classList.remove('hidden');
        }
        
        viewerImage.classList.add('loading');

        // Update counter
        viewerCounter.textContent = `${this.gallery.currentImageIndex + 1} / ${this.gallery.images.length}`;
        
        // Update caption with patient info
        const patientName = this.gallery.patientNames && this.gallery.patientNames[image.name];
        viewerCaption.textContent = patientName ? `Patient: ${patientName}` : 'Patient: Non assigné';

        // Load image with smooth transition
        const tempImg = new Image();
        tempImg.onload = () => {
            viewerImage.src = tempImg.src;
            viewerImage.classList.remove('loading');
            
            if (loadingSpinner) {
                loadingSpinner.classList.add('hidden');
            }
            
            // Reset zoom and pan
            if (this.gallery) {
                this.gallery.currentZoom = 1;
                this.gallery.panX = 0;
                this.gallery.panY = 0;
                this.gallery.applyZoom();
            }

            // Cache the loaded image
            this.preloadedImages.set(image.url, tempImg);
        };
        
        tempImg.onerror = () => {
            viewerImage.classList.remove('loading');
            if (loadingSpinner) {
                loadingSpinner.classList.add('hidden');
            }
            console.error('Failed to load image:', image.url);
        };
        
        tempImg.src = image.url;
    }

    preloadAdjacentImages() {
        if (!this.gallery || !this.gallery.images) return;

        const currentIndex = this.gallery.currentImageIndex;
        const images = this.gallery.images;
        
        // Preload previous and next images
        const indicesToPreload = [
            currentIndex - 2,
            currentIndex - 1,
            currentIndex + 1,
            currentIndex + 2
        ].filter(index => index >= 0 && index < images.length);

        indicesToPreload.forEach(index => {
            const image = images[index];
            if (image && !this.preloadedImages.has(image.url)) {
                const preloadImg = new Image();
                preloadImg.src = image.url;
                preloadImg.onload = () => {
                    this.preloadedImages.set(image.url, preloadImg);
                };
            }
        });
    }

    previousImage() {
        if (!this.gallery || this.gallery.currentImageIndex <= 0) return;
        
        if (!this.isTransitioning) {
            this.isTransitioning = true;
            this.transitionToImage(this.gallery.currentImageIndex - 1, 'prev');
        }
    }

    nextImage() {
        if (!this.gallery || this.gallery.currentImageIndex >= this.gallery.images.length - 1) return;
        
        if (!this.isTransitioning) {
            this.isTransitioning = true;
            this.transitionToImage(this.gallery.currentImageIndex + 1, 'next');
        }
    }

    transitionToImage(newIndex, direction) {
        if (!this.gallery) return;

        this.gallery.currentImageIndex = newIndex;
        
        // Smooth transition animation
        const imageWrapper = document.getElementById('image-wrapper');
        if (imageWrapper) {
            const translateX = direction === 'next' ? '-100px' : '100px';
            
            imageWrapper.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            imageWrapper.style.transform = `translateX(${translateX}) translateZ(0)`;
            imageWrapper.style.opacity = '0.5';
            
            setTimeout(() => {
                this.displayCurrentImage();
                
                // Slide in new image
                imageWrapper.style.transform = 'translateX(0) translateZ(0)';
                imageWrapper.style.opacity = '1';
                
                setTimeout(() => {
                    imageWrapper.style.transition = '';
                    this.isTransitioning = false;
                    this.preloadAdjacentImages();
                    this.updateProgress();
                }, 300);
            }, 150);
        } else {
            this.displayCurrentImage();
            this.isTransitioning = false;
            this.preloadAdjacentImages();
            this.updateProgress();
        }
    }

    updateProgress() {
        const progressBar = document.getElementById('progress-bar');
        if (progressBar && this.gallery && this.gallery.images) {
            const progress = ((this.gallery.currentImageIndex + 1) / this.gallery.images.length) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }

    zoomIn() {
        if (this.gallery && this.gallery.zoomIn) {
            this.gallery.zoomIn();
        }
    }

    zoomOut() {
        if (this.gallery && this.gallery.zoomOut) {
            this.gallery.zoomOut();
        }
    }

    resetZoom() {
        if (this.gallery && this.gallery.resetZoom) {
            this.gallery.resetZoom();
        }
    }

    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.viewer.requestFullscreen().catch(err => {
                console.warn('Could not enter fullscreen:', err);
            });
        }
    }

    rotateImage() {
        const viewerImage = document.getElementById('viewer-image');
        if (viewerImage) {
            const currentRotation = parseFloat(viewerImage.dataset.rotation || '0');
            const newRotation = (currentRotation + 90) % 360;
            
            viewerImage.dataset.rotation = newRotation;
            viewerImage.style.transform = `rotate(${newRotation}deg) translateZ(0)`;
        }
    }

    // Performance monitoring
    getPerformanceStats() {
        return {
            preloadedImagesCount: this.preloadedImages.size,
            isTransitioning: this.isTransitioning,
            touchSupport: 'ontouchstart' in window,
            currentImageIndex: this.gallery?.currentImageIndex || 0
        };
    }

    // Cleanup
    dispose() {
        // Clear preloaded images
        this.preloadedImages.clear();
        
        // Cancel any pending animation frames
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // Remove viewer from DOM
        if (this.viewer) {
            this.viewer.remove();
        }
        
        console.log('🧹 Smooth Image Viewer disposed');
    }
}

// Integration with existing gallery
if (typeof window !== 'undefined') {
    window.SmoothImageViewer = SmoothImageViewer;
    
    // Auto-integrate with SimpleGallery
    const integrateSmoothViewer = () => {
        if (window.simpleGallery && !window.simpleGallery.smoothViewer) {
            window.simpleGallery.smoothViewer = new SmoothImageViewer(window.simpleGallery);
            
            // Override gallery's image viewer methods
            window.simpleGallery.openImageViewerByIndex = function(index) {
                this.smoothViewer.open(index);
            };
            
            window.simpleGallery.openImageViewer = function(imageUrl, imageName) {
                const imageIndex = this.images.findIndex(img => img.url === imageUrl);
                if (imageIndex !== -1) {
                    this.smoothViewer.open(imageIndex);
                }
            };
            
            window.simpleGallery.closeImageViewer = function() {
                this.smoothViewer.close();
            };
            
            // Setup control button handlers
            document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
                window.simpleGallery.smoothViewer.zoomIn();
            });
            
            document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
                window.simpleGallery.smoothViewer.zoomOut();
            });
            
            document.getElementById('zoom-reset-btn')?.addEventListener('click', () => {
                window.simpleGallery.smoothViewer.resetZoom();
            });
            
            document.getElementById('fullscreen-btn')?.addEventListener('click', () => {
                window.simpleGallery.smoothViewer.toggleFullscreen();
            });
            
            document.getElementById('close-viewer')?.addEventListener('click', () => {
                window.simpleGallery.smoothViewer.close();
            });
            
            document.getElementById('prev-image')?.addEventListener('click', () => {
                window.simpleGallery.smoothViewer.previousImage();
            });
            
            document.getElementById('next-image')?.addEventListener('click', () => {
                window.simpleGallery.smoothViewer.nextImage();
            });
            
            console.log('📱 Smooth Image Viewer integrated with SimpleGallery');
        }
    };
    
    // Try integration after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(integrateSmoothViewer, 1500);
        });
    } else {
        setTimeout(integrateSmoothViewer, 1500);
    }
}

export default SmoothImageViewer;