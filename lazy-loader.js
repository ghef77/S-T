/**
 * Lazy Loader for External Libraries
 * Loads heavy libraries only when needed to improve initial page load
 */

class LazyLoader {
    constructor() {
        this.loadedLibraries = new Set();
        this.loadingPromises = new Map();
    }

    /**
     * Load a library dynamically
     */
    async loadLibrary(name, url, globalCheck = null) {
        // Check if already loaded
        if (this.loadedLibraries.has(name)) {
            return true;
        }

        // Check if currently loading
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        // Check if global variable exists (library already loaded)
        if (globalCheck && window[globalCheck]) {
            this.loadedLibraries.add(name);
            return true;
        }

        const loadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            
            script.onload = () => {
                this.loadedLibraries.add(name);
                this.loadingPromises.delete(name);
                console.log(`✅ Lazy loaded: ${name}`);
                resolve(true);
            };
            
            script.onerror = () => {
                this.loadingPromises.delete(name);
                console.error(`❌ Failed to load: ${name}`);
                reject(new Error(`Failed to load ${name}`));
            };
            
            document.head.appendChild(script);
        });

        this.loadingPromises.set(name, loadPromise);
        return loadPromise;
    }

    /**
     * Load multiple libraries in parallel
     */
    async loadLibraries(libraries) {
        const promises = libraries.map(lib => 
            this.loadLibrary(lib.name, lib.url, lib.globalCheck)
        );
        return Promise.all(promises);
    }

    /**
     * Load PDF generation libraries
     */
    async loadPDFLibraries() {
        return this.loadLibraries([
            {
                name: 'jspdf',
                url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
                globalCheck: 'jsPDF'
            },
            {
                name: 'jspdf-autotable',
                url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js',
                globalCheck: null // Extends jsPDF
            }
        ]);
    }

    /**
     * Load Excel generation libraries
     */
    async loadExcelLibraries() {
        return this.loadLibrary(
            'xlsx',
            'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js',
            'XLSX'
        );
    }

    /**
     * Load image capture libraries
     */
    async loadImageLibraries() {
        return this.loadLibrary(
            'html2canvas',
            'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
            'html2canvas'
        );
    }

    /**
     * Preload libraries on user interaction (hover)
     */
    preloadOnHover(buttonSelector, loadFunction) {
        const button = document.querySelector(buttonSelector);
        if (button) {
            let preloaded = false;
            button.addEventListener('mouseenter', () => {
                if (!preloaded) {
                    preloaded = true;
                    loadFunction.call(this);
                }
            }, { once: true });
        }
    }
}

// Global instance
window.lazyLoader = new LazyLoader();

// Enhanced export functions with lazy loading
window.exportToPDFLazy = async function() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
        await window.lazyLoader.loadPDFLibraries();
        
        // Call the original PDF export function
        if (typeof window.exportToPDF === 'function') {
            await window.exportToPDF();
        } else {
            throw new Error('PDF export function not found');
        }
    } catch (error) {
        console.error('PDF export failed:', error);
        alert('Erreur lors de l\'exportation PDF. Veuillez réessayer.');
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
};

window.exportToExcelLazy = async function() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
        await window.lazyLoader.loadExcelLibraries();
        
        // Call the original Excel export function
        if (typeof window.exportToExcel === 'function') {
            await window.exportToExcel();
        } else {
            throw new Error('Excel export function not found');
        }
    } catch (error) {
        console.error('Excel export failed:', error);
        alert('Erreur lors de l\'exportation Excel. Veuillez réessayer.');
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
};

window.captureScreenshotLazy = async function() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
        await window.lazyLoader.loadImageLibraries();
        
        // Call the original screenshot function
        if (typeof window.captureScreenshot === 'function') {
            await window.captureScreenshot();
        } else {
            throw new Error('Screenshot function not found');
        }
    } catch (error) {
        console.error('Screenshot failed:', error);
        alert('Erreur lors de la capture d\'écran. Veuillez réessayer.');
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
};

// Setup preloading on hover for better UX
document.addEventListener('DOMContentLoaded', () => {
    // Preload PDF libraries when user hovers over PDF export button
    window.lazyLoader.preloadOnHover('[title*="PDF"]', window.lazyLoader.loadPDFLibraries);
    
    // Preload Excel libraries when user hovers over Excel export button  
    window.lazyLoader.preloadOnHover('[title*="Excel"]', window.lazyLoader.loadExcelLibraries);
    
    // Preload image libraries when user hovers over screenshot button
    window.lazyLoader.preloadOnHover('[title*="capture"]', window.lazyLoader.loadImageLibraries);
    
    console.log('🚀 Lazy loader initialized - libraries will load on demand');
});