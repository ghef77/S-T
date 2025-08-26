/**
 * Synchronization Optimizer for Staff Table Application
 * Fixes race conditions between saves, cursor restoration, and real-time updates
 */

class SyncOptimizer {
    constructor() {
        this.saveQueue = [];
        this.isProcessingSave = false;
        this.syncManager = new SynchronizationManager();
        this.cursorManager = new CursorManager();
        this.lastSaveTime = 0;
        this.minSaveInterval = 500; // Minimum time between saves (ms)
        
        // State tracking for different save types
        this.saveStates = {
            autosave: { active: false, timestamp: 0 },
            manual: { active: false, timestamp: 0 },
            excel: { active: false, timestamp: 0 },
            restore: { active: false, timestamp: 0 }
        };
    }

    /**
     * Enhanced save queuing system to prevent conflicts
     */
    async queueSave(saveOperation, saveType = 'manual', priority = 0) {
        const saveTask = {
            operation: saveOperation,
            type: saveType,
            priority,
            timestamp: performance.now(),
            id: this.generateSaveId()
        };

        // Check if we should throttle this save
        if (this.shouldThrottleSave(saveType)) {
            console.log(`🚫 Save throttled: ${saveType} (too frequent)`);
            return null;
        }

        // Add to queue with priority
        this.saveQueue.push(saveTask);
        this.saveQueue.sort((a, b) => b.priority - a.priority);

        console.log(`📝 Save queued: ${saveType} (queue length: ${this.saveQueue.length})`);
        
        // Process queue if not already processing
        if (!this.isProcessingSave) {
            return this.processSaveQueue();
        }
        
        return saveTask.id;
    }

    shouldThrottleSave(saveType) {
        const now = performance.now();
        const lastSave = this.saveStates[saveType];
        
        if (lastSave && (now - lastSave.timestamp) < this.minSaveInterval) {
            return true;
        }
        
        return false;
    }

    async processSaveQueue() {
        if (this.isProcessingSave || this.saveQueue.length === 0) {
            return;
        }

        this.isProcessingSave = true;
        console.log(`🔄 Processing save queue: ${this.saveQueue.length} items`);

        try {
            while (this.saveQueue.length > 0) {
                const saveTask = this.saveQueue.shift();
                
                // Mark this save type as active
                this.saveStates[saveTask.type] = {
                    active: true,
                    timestamp: performance.now()
                };

                try {
                    console.log(`💾 Executing ${saveTask.type} save (ID: ${saveTask.id})`);
                    
                    // Execute save with lock to prevent concurrent saves
                    await this.syncManager.executeWithLock(
                        `save-${saveTask.type}`, 
                        saveTask.operation,
                        10000 // 10 second timeout
                    );
                    
                    console.log(`✅ ${saveTask.type} save completed (ID: ${saveTask.id})`);
                    this.lastSaveTime = performance.now();
                    
                } catch (error) {
                    console.error(`❌ ${saveTask.type} save failed (ID: ${saveTask.id}):`, error);
                    
                    // Re-queue with lower priority if it's a transient error
                    if (this.isTransientError(error) && saveTask.priority > -5) {
                        saveTask.priority -= 1;
                        this.saveQueue.unshift(saveTask);
                        console.log(`🔄 Re-queuing failed save: ${saveTask.id}`);
                    }
                } finally {
                    // Mark save type as inactive
                    this.saveStates[saveTask.type].active = false;
                }

                // Small delay between saves to prevent overwhelming the database
                await this.delay(100);
            }
        } finally {
            this.isProcessingSave = false;
            console.log(`✅ Save queue processing completed`);
        }
    }

    isTransientError(error) {
        const transientErrors = [
            'network',
            'timeout',
            'connection',
            'temporary',
            'rate limit'
        ];
        
        const errorMessage = error.message?.toLowerCase() || '';
        return transientErrors.some(keyword => errorMessage.includes(keyword));
    }

    generateSaveId() {
        return `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear save queue and reset states
     */
    clearQueue() {
        this.saveQueue.length = 0;
        Object.keys(this.saveStates).forEach(key => {
            this.saveStates[key].active = false;
        });
        this.isProcessingSave = false;
        console.log('🧹 Save queue cleared');
    }

    /**
     * Get current save status
     */
    getStatus() {
        return {
            queueLength: this.saveQueue.length,
            isProcessing: this.isProcessingSave,
            activeStates: Object.entries(this.saveStates)
                .filter(([, state]) => state.active)
                .map(([type]) => type),
            lastSaveTime: this.lastSaveTime
        };
    }
}

/**
 * Enhanced Cursor Manager to handle focus restoration without conflicts
 */
class CursorManager {
    constructor() {
        this.focusHistory = [];
        this.maxHistorySize = 10;
        this.restorationTimeout = null;
        this.isRestoring = false;
        this.restorationCallbacks = new Set();
    }

    captureFocus(element, metadata = {}) {
        if (!element || this.isRestoring) return null;

        const focusState = {
            element,
            position: this.getCaretPosition(element),
            timestamp: performance.now(),
            metadata: { ...metadata }
        };

        this.focusHistory.push(focusState);
        
        // Limit history size
        if (this.focusHistory.length > this.maxHistorySize) {
            this.focusHistory.shift();
        }

        console.log('👁️ Focus captured:', {
            element: element.tagName,
            position: focusState.position,
            metadata
        });

        return focusState;
    }

    async restoreFocus(focusState = null, delay = 0) {
        if (this.isRestoring) {
            console.log('⏳ Focus restoration already in progress');
            return false;
        }

        const stateToRestore = focusState || this.getLatestFocusState();
        if (!stateToRestore || !stateToRestore.element) {
            console.log('❌ No focus state to restore');
            return false;
        }

        this.isRestoring = true;
        
        try {
            if (delay > 0) {
                await this.delay(delay);
            }

            // Check if element is still in DOM and editable
            if (!document.contains(stateToRestore.element) || 
                stateToRestore.element.contentEditable !== 'true') {
                console.log('❌ Focus restoration failed: element not available');
                return false;
            }

            // Restore focus
            stateToRestore.element.focus();
            
            // Restore cursor position
            if (typeof stateToRestore.position === 'number') {
                await this.setCaretPosition(stateToRestore.element, stateToRestore.position);
            }

            console.log('✅ Focus restored successfully');
            
            // Notify callbacks
            this.restorationCallbacks.forEach(callback => {
                try {
                    callback(stateToRestore);
                } catch (error) {
                    console.warn('Restoration callback error:', error);
                }
            });

            return true;

        } catch (error) {
            console.error('❌ Focus restoration error:', error);
            return false;
        } finally {
            // Reset restoration flag after a short delay
            setTimeout(() => {
                this.isRestoring = false;
            }, 100);
        }
    }

    getLatestFocusState() {
        return this.focusHistory[this.focusHistory.length - 1];
    }

    getCaretPosition(element) {
        let position = 0;
        const selection = window.getSelection();
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            position = preCaretRange.toString().length;
        }
        
        return position;
    }

    async setCaretPosition(element, position) {
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                try {
                    const range = document.createRange();
                    const selection = window.getSelection();
                    
                    // Handle text nodes within the element
                    const walker = document.createTreeWalker(
                        element,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                    );
                    
                    let currentPos = 0;
                    let node;
                    
                    while (node = walker.nextNode()) {
                        const nodeLength = node.textContent.length;
                        
                        if (currentPos + nodeLength >= position) {
                            range.setStart(node, position - currentPos);
                            range.collapse(true);
                            break;
                        }
                        currentPos += nodeLength;
                    }
                    
                    // Fallback: place at end of element
                    if (!range.startContainer) {
                        range.selectNodeContents(element);
                        range.collapse(false);
                    }
                    
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    resolve(true);
                } catch (error) {
                    console.warn('Caret position setting failed:', error);
                    resolve(false);
                }
            });
        });
    }

    addRestorationCallback(callback) {
        this.restorationCallbacks.add(callback);
    }

    removeRestorationCallback(callback) {
        this.restorationCallbacks.delete(callback);
    }

    clearHistory() {
        this.focusHistory.length = 0;
        this.restorationCallbacks.clear();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export classes for use in main application
window.SyncOptimizer = SyncOptimizer;
window.CursorManager = CursorManager;