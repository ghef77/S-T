/**
 * Virtual Scrolling System for Large Tables
 * Renders only visible rows to optimize performance with large datasets
 */

class VirtualScroller {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            itemHeight: 50,
            buffer: 10,
            threshold: 100, // Activate virtual scrolling when >100 rows
            estimatedHeight: 50,
            overscan: 5,
            ...options
        };
        
        this.data = [];
        this.visibleRange = { start: 0, end: 0 };
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.totalHeight = 0;
        this.isVirtualScrollingActive = false;
        this.renderCallback = null;
        
        // Performance optimization
        this.renderDebounce = this.debounce(this.render.bind(this), 16); // 60fps
        this.measuredHeights = new Map();
        this.averageHeight = this.options.itemHeight;
        
        // RAF optimization
        this.rafId = null;
        this.isRendering = false;
        
        this.initialize();
    }

    initialize() {
        if (!this.container) {
            console.error('❌ Virtual scroller: container is required');
            return;
        }

        this.setupContainer();
        this.bindEvents();
        
        console.log('📜 Virtual Scroller initialized');
    }

    setupContainer() {
        // Ensure container has proper styling for virtual scrolling
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        
        // Create virtual content container
        this.virtualContainer = document.createElement('div');
        this.virtualContainer.className = 'virtual-scroller-content';
        this.virtualContainer.style.position = 'relative';
        this.virtualContainer.style.willChange = 'transform';
        this.virtualContainer.style.contain = 'layout style paint';
        
        // Move existing content to virtual container
        while (this.container.firstChild) {
            this.virtualContainer.appendChild(this.container.firstChild);
        }
        
        this.container.appendChild(this.virtualContainer);
        
        // Create spacer for maintaining scroll height
        this.spacer = document.createElement('div');
        this.spacer.className = 'virtual-scroller-spacer';
        this.spacer.style.height = '0px';
        this.spacer.style.pointerEvents = 'none';
        this.container.appendChild(this.spacer);
    }

    bindEvents() {
        // Optimized scroll handler
        this.container.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        
        // Resize observer for container changes
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(
                this.debounce(this.handleResize.bind(this), 100)
            );
            this.resizeObserver.observe(this.container);
        }
        
        // Performance monitoring
        if (window.performanceBooster) {
            this.setupPerformanceOptimizations();
        }
    }

    setupPerformanceOptimizations() {
        // Use performance booster's RAF scheduler if available
        if (window.scheduleHighPriority) {
            this.scheduleRender = (callback) => window.scheduleHighPriority(callback);
        } else if (window.requestIdleCallback) {
            this.scheduleRender = (callback) => window.requestIdleCallback(callback, { timeout: 16 });
        } else {
            this.scheduleRender = (callback) => requestAnimationFrame(callback);
        }
    }

    handleScroll(event) {
        const newScrollTop = this.container.scrollTop;
        
        // Skip if scroll hasn't changed significantly
        if (Math.abs(newScrollTop - this.scrollTop) < 1) {
            return;
        }
        
        this.scrollTop = newScrollTop;
        
        if (this.isVirtualScrollingActive) {
            // Cancel previous render if still pending
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
            }
            
            // Schedule new render
            this.rafId = requestAnimationFrame(() => {
                this.updateVisibleRange();
                this.renderDebounce();
            });
        }
    }

    handleResize() {
        this.containerHeight = this.container.clientHeight;
        
        if (this.isVirtualScrollingActive) {
            this.updateVisibleRange();
            this.render();
        }
    }

    setData(data, renderCallback) {
        this.data = data || [];
        this.renderCallback = renderCallback;
        
        // Decide whether to activate virtual scrolling
        const shouldActivate = this.data.length > this.options.threshold;
        
        if (shouldActivate && !this.isVirtualScrollingActive) {
            this.activateVirtualScrolling();
        } else if (!shouldActivate && this.isVirtualScrollingActive) {
            this.deactivateVirtualScrolling();
        }
        
        if (this.isVirtualScrollingActive) {
            this.updateVisibleRange();
            this.render();
        } else {
            this.renderAll();
        }
        
        console.log(`📊 Virtual Scroller: ${this.data.length} items, virtual scrolling ${shouldActivate ? 'active' : 'inactive'}`);
    }

    activateVirtualScrolling() {
        this.isVirtualScrollingActive = true;
        this.containerHeight = this.container.clientHeight;
        this.updateTotalHeight();
        
        // Apply GPU acceleration
        this.virtualContainer.style.transform = 'translateZ(0)';
        this.virtualContainer.style.willChange = 'transform';
        
        console.log('🚀 Virtual scrolling activated');
    }

    deactivateVirtualScrolling() {
        this.isVirtualScrollingActive = false;
        
        // Remove GPU acceleration
        this.virtualContainer.style.transform = '';
        this.virtualContainer.style.willChange = '';
        
        // Reset spacer
        this.spacer.style.height = '0px';
        
        console.log('⏹️ Virtual scrolling deactivated');
    }

    updateVisibleRange() {
        if (!this.isVirtualScrollingActive || this.data.length === 0) {
            return;
        }
        
        const scrollTop = this.scrollTop;
        const containerHeight = this.containerHeight;
        
        // Calculate visible range with buffer
        const startIndex = Math.max(0, 
            Math.floor(scrollTop / this.averageHeight) - this.options.buffer
        );
        
        const visibleCount = Math.ceil(containerHeight / this.averageHeight) + 
                           (this.options.buffer * 2) + this.options.overscan;
        
        const endIndex = Math.min(this.data.length, startIndex + visibleCount);
        
        // Only update if range has changed significantly
        if (startIndex !== this.visibleRange.start || endIndex !== this.visibleRange.end) {
            this.visibleRange = { start: startIndex, end: endIndex };
            return true;
        }
        
        return false;
    }

    updateTotalHeight() {
        if (!this.isVirtualScrollingActive) return;
        
        // Use measured heights if available, otherwise estimate
        let totalHeight = 0;
        
        for (let i = 0; i < this.data.length; i++) {
            totalHeight += this.measuredHeights.get(i) || this.averageHeight;
        }
        
        this.totalHeight = totalHeight;
        this.spacer.style.height = totalHeight + 'px';
    }

    render() {
        if (!this.isVirtualScrollingActive || this.isRendering || !this.renderCallback) {
            return;
        }
        
        this.isRendering = true;
        
        if (this.scheduleRender) {
            this.scheduleRender(() => {
                this.performRender();
                this.isRendering = false;
            });
        } else {
            requestAnimationFrame(() => {
                this.performRender();
                this.isRendering = false;
            });
        }
    }

    performRender() {
        const { start, end } = this.visibleRange;
        const fragment = document.createDocumentFragment();
        
        // Calculate offset for visible items
        let offsetY = 0;
        for (let i = 0; i < start; i++) {
            offsetY += this.measuredHeights.get(i) || this.averageHeight;
        }
        
        // Clear current content efficiently
        this.virtualContainer.innerHTML = '';
        
        // Render visible items
        let currentY = offsetY;
        const renderedElements = [];
        
        for (let i = start; i < end; i++) {
            if (!this.data[i]) continue;
            
            const element = this.renderCallback(this.data[i], i);
            if (!element) continue;
            
            // Position element
            element.style.position = 'absolute';
            element.style.top = currentY + 'px';
            element.style.left = '0';
            element.style.right = '0';
            element.style.transform = 'translateZ(0)'; // GPU acceleration
            
            // Measure height after render
            fragment.appendChild(element);
            renderedElements.push({ element, index: i, y: currentY });
            
            const height = this.measuredHeights.get(i) || this.averageHeight;
            currentY += height;
        }
        
        // Append all elements at once
        this.virtualContainer.appendChild(fragment);
        
        // Measure actual heights for better estimation
        this.measureHeights(renderedElements);
        
        // Update container height
        this.virtualContainer.style.height = (currentY - offsetY) + 'px';
        
        console.log(`🎯 Rendered items ${start}-${end} (${end - start} items)`);
    }

    measureHeights(renderedElements) {
        // Measure heights in batch to avoid layout thrashing
        const measurements = [];
        
        // Read phase - batch all measurements
        renderedElements.forEach(({ element, index }) => {
            const rect = element.getBoundingClientRect();
            measurements.push({ index, height: rect.height });
        });
        
        // Write phase - update cached heights
        let needsHeightUpdate = false;
        let totalMeasured = 0;
        let countMeasured = 0;
        
        measurements.forEach(({ index, height }) => {
            const previousHeight = this.measuredHeights.get(index);
            
            if (!previousHeight || Math.abs(height - previousHeight) > 1) {
                this.measuredHeights.set(index, height);
                needsHeightUpdate = true;
            }
            
            totalMeasured += height;
            countMeasured++;
        });
        
        // Update average height
        if (countMeasured > 0) {
            const newAverage = totalMeasured / countMeasured;
            this.averageHeight = (this.averageHeight + newAverage) / 2;
        }
        
        // Update total height if measurements changed
        if (needsHeightUpdate) {
            this.updateTotalHeight();
        }
    }

    renderAll() {
        if (!this.renderCallback || this.data.length === 0) {
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        this.data.forEach((item, index) => {
            const element = this.renderCallback(item, index);
            if (element) {
                // Remove virtual scrolling styles
                element.style.position = '';
                element.style.top = '';
                element.style.transform = '';
                fragment.appendChild(element);
            }
        });
        
        this.virtualContainer.innerHTML = '';
        this.virtualContainer.appendChild(fragment);
        this.virtualContainer.style.height = '';
    }

    scrollToIndex(index, behavior = 'smooth') {
        if (index < 0 || index >= this.data.length) {
            return;
        }
        
        let targetY = 0;
        
        if (this.isVirtualScrollingActive) {
            // Calculate position based on measured heights
            for (let i = 0; i < index; i++) {
                targetY += this.measuredHeights.get(i) || this.averageHeight;
            }
        } else {
            // Find element directly
            const elements = this.virtualContainer.children;
            if (elements[index]) {
                targetY = elements[index].offsetTop;
            }
        }
        
        this.container.scrollTo({
            top: targetY,
            behavior
        });
    }

    scrollToTop() {
        this.container.scrollTo({ top: 0, behavior: 'smooth' });
    }

    scrollToBottom() {
        this.container.scrollTo({ 
            top: this.isVirtualScrollingActive ? this.totalHeight : this.container.scrollHeight, 
            behavior: 'smooth' 
        });
    }

    // Utility methods
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    getStats() {
        return {
            isActive: this.isVirtualScrollingActive,
            totalItems: this.data.length,
            visibleRange: this.visibleRange,
            renderedItems: this.visibleRange.end - this.visibleRange.start,
            averageHeight: Math.round(this.averageHeight),
            totalHeight: this.totalHeight,
            containerHeight: this.containerHeight,
            measuredHeights: this.measuredHeights.size
        };
    }

    destroy() {
        // Clean up event listeners
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // Cancel pending renders
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        // Clear measurements
        this.measuredHeights.clear();
        
        console.log('🧹 Virtual Scroller destroyed');
    }
}

// Table-specific virtual scroller
class TableVirtualScroller extends VirtualScroller {
    constructor(tableContainer, options = {}) {
        super(tableContainer, {
            itemHeight: 50, // Default row height
            threshold: 200, // Activate for tables with >200 rows
            ...options
        });
        
        this.table = null;
        this.thead = null;
        this.tbody = null;
        
        this.initializeTable();
    }

    initializeTable() {
        this.table = this.container.querySelector('table');
        if (!this.table) {
            console.warn('⚠️ Table not found in container');
            return;
        }
        
        this.thead = this.table.querySelector('thead');
        this.tbody = this.table.querySelector('tbody');
        
        if (!this.tbody) {
            console.warn('⚠️ Table body not found');
            return;
        }
        
        // Ensure table is properly structured for virtual scrolling
        this.setupTableForVirtualScrolling();
    }

    setupTableForVirtualScrolling() {
        // Fix header position
        if (this.thead) {
            this.thead.style.position = 'sticky';
            this.thead.style.top = '0';
            this.thead.style.zIndex = '10';
            this.thead.style.backgroundColor = 'var(--bg-primary, #ffffff)';
        }
        
        // Optimize table rendering
        this.table.style.tableLayout = 'fixed';
        this.table.style.contain = 'layout style';
        
        // Set up tbody for virtual scrolling
        this.tbody.style.position = 'relative';
    }

    setTableData(rows, rowRenderer) {
        const renderRow = (rowData, index) => {
            const tr = rowRenderer ? rowRenderer(rowData, index) : this.defaultRowRenderer(rowData, index);
            return tr;
        };
        
        this.setData(rows, renderRow);
    }

    defaultRowRenderer(rowData, index) {
        const tr = document.createElement('tr');
        tr.className = 'virtual-row';
        tr.dataset.index = index;
        
        // Create cells based on row data
        if (Array.isArray(rowData)) {
            rowData.forEach(cellData => {
                const td = document.createElement('td');
                td.textContent = cellData || '';
                td.className = 'editable-cell';
                tr.appendChild(td);
            });
        } else if (typeof rowData === 'object') {
            Object.values(rowData).forEach(cellData => {
                const td = document.createElement('td');
                td.textContent = cellData || '';
                td.className = 'editable-cell';
                tr.appendChild(td);
            });
        }
        
        return tr;
    }

    activateVirtualScrolling() {
        super.activateVirtualScrolling();
        
        // Additional table-specific optimizations
        if (this.tbody) {
            this.tbody.style.display = 'block';
            this.tbody.style.position = 'relative';
        }
        
        // Ensure header remains visible
        if (this.thead) {
            this.thead.style.display = 'table-header-group';
        }
    }

    deactivateVirtualScrolling() {
        super.deactivateVirtualScrolling();
        
        // Restore table display
        if (this.tbody) {
            this.tbody.style.display = '';
            this.tbody.style.position = '';
        }
    }
}

// Export classes
window.VirtualScroller = VirtualScroller;
window.TableVirtualScroller = TableVirtualScroller;

// Helper function to enable virtual scrolling on existing tables
window.enableTableVirtualScrolling = function(tableSelector, options = {}) {
    const container = document.querySelector(tableSelector);
    if (!container) {
        console.warn(`⚠️ Table container not found: ${tableSelector}`);
        return null;
    }
    
    const virtualScroller = new TableVirtualScroller(container, options);
    
    // Auto-detect data and set up virtual scrolling
    const tbody = container.querySelector('tbody');
    if (tbody) {
        const rows = Array.from(tbody.querySelectorAll('tr')).map((tr, index) => {
            return Array.from(tr.querySelectorAll('td')).map(td => td.textContent);
        });
        
        if (rows.length > 0) {
            virtualScroller.setTableData(rows);
        }
    }
    
    return virtualScroller;
};

console.log('📜 Virtual Scroller loaded - Optimized rendering for large datasets');