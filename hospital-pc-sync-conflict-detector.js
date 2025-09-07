/**
 * EMERGENCY Hospital PC Sync Conflict Detector
 * Specifically designed to fix persistent duplication issues
 * Aggressive conflict detection and prevention for hospital environments
 */

class EmergencyHospitalConflictDetector {
    constructor() {
        this.isActive = false;
        this.duplicateOperations = new Map();
        this.buttonCreationLocks = new Set();
        this.eventAttachmentLocks = new Set();
        this.domObserver = null;
        this.lastSnapshotClick = 0;
        this.snapshotInProgress = false;
        
        // Emergency configuration for immediate conflict resolution
        this.config = {
            duplicateDetectionWindow: 500, // 500ms window for duplicate detection
            maxDuplicateOperations: 1, // Only allow 1 of same operation
            emergencyBlockDuration: 2000, // 2 second emergency block
            buttonLockDuration: 3000, // 3 second button lock
            aggressiveMode: true // Aggressive conflict prevention
        };

        this.duplicatePatterns = [
            'handleManualSnapshotClick',
            'manual-snapshot-btn', 
            'Snapshot Manuel',
            'createManualSnapshot',
            'Événements tactiles ajoutés au bouton snapshot uniquement'
        ];

        this.init();
    }

    init() {
        console.log('🚨 EMERGENCY Hospital PC Conflict Detector starting...');
        this.startEmergencyMonitoring();
        this.setupDOMObserver();
        this.patchDuplicateFunctions();
        this.preventDuplicateEvents();
        console.log('✅ EMERGENCY conflict detector ready - aggressive mode enabled');
    }

    startEmergencyMonitoring() {
        this.isActive = true;
        
        // ULTRA-FREQUENT monitoring every 100ms for duplicates
        this.emergencyMonitorInterval = setInterval(() => {
            this.scanForDuplicates();
        }, 100);

        // Button-specific monitoring every 200ms
        this.buttonMonitorInterval = setInterval(() => {
            this.monitorSnapshotButtons();
        }, 200);

        // Event monitoring every 300ms
        this.eventMonitorInterval = setInterval(() => {
            this.monitorDuplicateEvents();
        }, 300);

        console.log('🔍 Emergency monitoring active - scanning every 100ms');
    }

    scanForDuplicates() {
        try {
            // 1. Check for duplicate snapshot buttons
            this.checkDuplicateButtons();
            
            // 2. Check for duplicate event listeners
            this.checkDuplicateEventListeners();
            
            // 3. Check for duplicate DOM elements
            this.checkDuplicateElements();
            
            // 4. Check for duplicate operations
            this.checkDuplicateOperations();

        } catch (error) {
            console.error('❌ Error during duplicate scan:', error);
        }
    }

    checkDuplicateButtons() {
        // Find all manual snapshot buttons
        const snapshotButtons = document.querySelectorAll('[id*="manual-snapshot"], [onclick*="handleManualSnapshotClick"], [onclick*="createManualSnapshot"]');
        
        if (snapshotButtons.length > 1) {
            console.log(`🚨 DUPLICATE BUTTONS DETECTED: Found ${snapshotButtons.length} snapshot buttons`);
            this.removeDuplicateButtons(snapshotButtons);
        }
    }

    removeDuplicateButtons(buttons) {
        console.log('🧹 Removing duplicate snapshot buttons...');
        
        // Keep only the first button, remove the rest
        for (let i = 1; i < buttons.length; i++) {
            const duplicateButton = buttons[i];
            console.log(`🗑️ Removing duplicate button #${i}:`, duplicateButton);
            
            // Remove duplicate button
            if (duplicateButton.parentNode) {
                duplicateButton.parentNode.removeChild(duplicateButton);
            }
        }
        
        console.log(`✅ Removed ${buttons.length - 1} duplicate snapshot buttons`);
        this.logConflictResolution('DUPLICATE_BUTTONS_REMOVED', buttons.length - 1);
    }

    checkDuplicateEventListeners() {
        // Check console for duplicate event attachment messages
        const consoleEntries = this.getRecentConsoleEntries();
        const duplicateEvents = consoleEntries.filter(entry => 
            this.duplicatePatterns.some(pattern => entry.includes(pattern))
        );

        if (duplicateEvents.length > 2) {
            console.log('🚨 DUPLICATE EVENT LISTENERS DETECTED:', duplicateEvents.length);
            this.preventFurtherEventAttachment();
        }
    }

    preventFurtherEventAttachment() {
        // Temporarily block event attachment to prevent duplicates
        if (!this.eventAttachmentLocks.has('snapshot-events')) {
            this.eventAttachmentLocks.add('snapshot-events');
            console.log('🛡️ Blocking further event attachment for 3 seconds');
            
            setTimeout(() => {
                this.eventAttachmentLocks.delete('snapshot-events');
                console.log('🔓 Event attachment block released');
            }, 3000);
        }
    }

    checkDuplicateElements() {
        // Look for duplicate DOM elements with same content
        const elements = document.querySelectorAll('*');
        const textContentMap = new Map();
        const duplicates = [];

        elements.forEach(el => {
            if (el.textContent && el.textContent.includes('Événements tactiles')) {
                const text = el.textContent.trim();
                if (textContentMap.has(text)) {
                    duplicates.push(el);
                } else {
                    textContentMap.set(text, el);
                }
            }
        });

        if (duplicates.length > 0) {
            console.log(`🚨 DUPLICATE ELEMENTS DETECTED: ${duplicates.length} elements`);
            duplicates.forEach(el => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                    console.log('🗑️ Removed duplicate element:', el.textContent.substring(0, 50));
                }
            });
        }
    }

    checkDuplicateOperations() {
        const now = Date.now();
        
        // Clean up old operations
        for (const [key, timestamp] of this.duplicateOperations.entries()) {
            if (now - timestamp > this.config.duplicateDetectionWindow) {
                this.duplicateOperations.delete(key);
            }
        }
    }

    monitorSnapshotButtons() {
        const snapshotBtn = document.getElementById('manual-snapshot-btn');
        if (snapshotBtn) {
            // Check if button is being clicked too frequently
            const clickHandler = (event) => {
                const now = Date.now();
                
                if (now - this.lastSnapshotClick < 1000) { // Less than 1 second apart
                    console.log('🚨 RAPID SNAPSHOT CLICKS DETECTED - Blocking duplicate');
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    
                    this.showEmergencyMessage('⛔ Clics trop rapides détectés - Opération bloquée pour éviter les doublons');
                    return false;
                }
                
                if (this.snapshotInProgress) {
                    console.log('🚨 SNAPSHOT ALREADY IN PROGRESS - Blocking duplicate');
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    
                    this.showEmergencyMessage('⛔ Création de snapshot déjà en cours - Veuillez attendre');
                    return false;
                }
                
                this.lastSnapshotClick = now;
                this.snapshotInProgress = true;
                
                // Auto-release snapshot lock after 5 seconds
                setTimeout(() => {
                    this.snapshotInProgress = false;
                    console.log('🔓 Snapshot operation lock released');
                }, 5000);
            };

            // Remove existing listeners and add our protected one
            const newButton = snapshotBtn.cloneNode(true);
            snapshotBtn.parentNode.replaceChild(newButton, snapshotBtn);
            
            // Add our protected click handler
            newButton.addEventListener('click', clickHandler, true); // Capture phase
            newButton.onclick = null; // Remove inline onclick
        }
    }

    monitorDuplicateEvents() {
        // Monitor for signs of duplicate event attachment in the DOM
        const elements = document.querySelectorAll('[onclick*="handleManualSnapshot"]');
        if (elements.length > 1) {
            console.log(`🚨 Multiple elements with snapshot handlers: ${elements.length}`);
            
            // Keep only the first one
            for (let i = 1; i < elements.length; i++) {
                elements[i].onclick = null;
                console.log(`🧹 Removed onclick from duplicate element #${i}`);
            }
        }
    }

    setupDOMObserver() {
        // Watch for DOM changes that might indicate duplicates being added
        this.domObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.checkNewNodeForDuplicates(node);
                        }
                    });
                }
            });
        });

        this.domObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('👁️ DOM observer active - watching for duplicate additions');
    }

    checkNewNodeForDuplicates(node) {
        // Check if the new node is a duplicate snapshot button or element
        if (node.id && node.id.includes('manual-snapshot')) {
            const existingButton = document.querySelector('#manual-snapshot-btn');
            if (existingButton && existingButton !== node) {
                console.log('🚨 ATTEMPTED DUPLICATE BUTTON ADDITION BLOCKED');
                node.remove();
                return;
            }
        }

        // Check for duplicate text content
        if (node.textContent && node.textContent.includes('Événements tactiles')) {
            const existing = document.querySelector('*:not(' + node.tagName.toLowerCase() + ')');
            if (existing && existing.textContent === node.textContent) {
                console.log('🚨 DUPLICATE CONTENT ELEMENT BLOCKED');
                node.remove();
                return;
            }
        }

        // Check for duplicate onclick handlers
        if (node.onclick && node.onclick.toString().includes('handleManualSnapshot')) {
            const existingHandlers = document.querySelectorAll('[onclick*="handleManualSnapshot"]');
            if (existingHandlers.length > 0) {
                console.log('🚨 DUPLICATE ONCLICK HANDLER BLOCKED');
                node.onclick = null;
            }
        }
    }

    patchDuplicateFunctions() {
        // Patch the original functions to prevent duplicates
        console.log('🔧 Patching functions to prevent duplicates...');

        // Patch handleManualSnapshotClick
        if (window.handleManualSnapshotClick) {
            const originalFunction = window.handleManualSnapshotClick;
            window.handleManualSnapshotClick = (...args) => {
                const operationKey = 'handleManualSnapshotClick-' + Date.now();
                
                if (this.isDuplicateOperation(operationKey)) {
                    console.log('🚨 DUPLICATE handleManualSnapshotClick CALL BLOCKED');
                    this.showEmergencyMessage('⛔ Opération snapshot dupliquée bloquée');
                    return;
                }
                
                this.registerOperation(operationKey);
                
                try {
                    return originalFunction.apply(this, args);
                } finally {
                    setTimeout(() => this.duplicateOperations.delete(operationKey), 1000);
                }
            };
        }

        // Patch createManualSnapshot if it exists
        if (window.createManualSnapshot) {
            const originalCreate = window.createManualSnapshot;
            window.createManualSnapshot = (...args) => {
                const operationKey = 'createManualSnapshot-' + Date.now();
                
                if (this.isDuplicateOperation(operationKey)) {
                    console.log('🚨 DUPLICATE createManualSnapshot CALL BLOCKED');
                    return;
                }
                
                this.registerOperation(operationKey);
                
                try {
                    return originalCreate.apply(this, args);
                } finally {
                    setTimeout(() => this.duplicateOperations.delete(operationKey), 2000);
                }
            };
        }

        console.log('✅ Functions patched for duplicate prevention');
    }

    preventDuplicateEvents() {
        // Override addEventListener to prevent duplicate event attachment
        const originalAddEventListener = Element.prototype.addEventListener;
        
        Element.prototype.addEventListener = function(type, listener, options) {
            // Check if this is a duplicate snapshot-related event
            if (type === 'click' && 
                (this.id === 'manual-snapshot-btn' || 
                 (listener && listener.toString().includes('handleManualSnapshot')))) {
                
                const eventKey = `${this.id}-${type}-snapshot`;
                
                if (window.emergencyDetector && window.emergencyDetector.eventAttachmentLocks.has(eventKey)) {
                    console.log('🚨 DUPLICATE EVENT LISTENER BLOCKED:', eventKey);
                    return;
                }
                
                if (window.emergencyDetector) {
                    window.emergencyDetector.eventAttachmentLocks.add(eventKey);
                    setTimeout(() => {
                        window.emergencyDetector.eventAttachmentLocks.delete(eventKey);
                    }, 5000);
                }
            }
            
            return originalAddEventListener.call(this, type, listener, options);
        };

        console.log('🛡️ Event listener protection active');
    }

    isDuplicateOperation(operationKey) {
        const operationType = operationKey.split('-')[0];
        const now = Date.now();
        
        // Check for recent operations of the same type
        for (const [key, timestamp] of this.duplicateOperations.entries()) {
            if (key.startsWith(operationType) && 
                (now - timestamp) < this.config.duplicateDetectionWindow) {
                return true;
            }
        }
        
        return false;
    }

    registerOperation(operationKey) {
        this.duplicateOperations.set(operationKey, Date.now());
        console.log(`📝 Registered operation: ${operationKey}`);
    }

    showEmergencyMessage(message) {
        console.log(`🚨 EMERGENCY MESSAGE: ${message}`);
        
        // Try to show message using existing system
        if (typeof window.showMessage === 'function') {
            window.showMessage(message, 'error');
        } else {
            // Fallback: create temporary notification
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #dc2626;
                color: white;
                padding: 15px;
                border-radius: 5px;
                z-index: 10000;
                font-weight: bold;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }
    }

    getRecentConsoleEntries() {
        // This is a simplified version - in reality would need more sophisticated console monitoring
        return [];
    }

    logConflictResolution(type, count) {
        const resolution = {
            timestamp: Date.now(),
            type: type,
            count: count,
            action: 'RESOLVED'
        };
        
        console.log('✅ CONFLICT RESOLVED:', resolution);
    }

    // Emergency cleanup methods
    emergencyCleanup() {
        console.log('🚨 EMERGENCY CLEANUP - Removing all duplicates...');
        
        // Remove duplicate buttons
        const allSnapshotButtons = document.querySelectorAll('[id*="manual-snapshot"], [onclick*="handleManualSnapshot"]');
        if (allSnapshotButtons.length > 1) {
            for (let i = 1; i < allSnapshotButtons.length; i++) {
                allSnapshotButtons[i].remove();
            }
            console.log(`🧹 Emergency: Removed ${allSnapshotButtons.length - 1} duplicate buttons`);
        }
        
        // Clear all duplicate operations
        this.duplicateOperations.clear();
        
        // Reset locks
        this.buttonCreationLocks.clear();
        this.eventAttachmentLocks.clear();
        
        // Reset snapshot state
        this.snapshotInProgress = false;
        this.lastSnapshotClick = 0;
        
        console.log('✅ Emergency cleanup completed');
    }

    forceStopAllDuplicates() {
        console.log('🛑 FORCE STOPPING ALL DUPLICATE OPERATIONS...');
        
        // Stop all intervals
        if (this.emergencyMonitorInterval) {
            clearInterval(this.emergencyMonitorInterval);
        }
        if (this.buttonMonitorInterval) {
            clearInterval(this.buttonMonitorInterval);
        }
        if (this.eventMonitorInterval) {
            clearInterval(this.eventMonitorInterval);
        }
        
        // Run emergency cleanup
        this.emergencyCleanup();
        
        // Restart monitoring with fresh state
        this.startEmergencyMonitoring();
        
        console.log('✅ Force stop completed - monitoring restarted');
    }

    getEmergencyStatus() {
        return {
            isActive: this.isActive,
            duplicateOperations: this.duplicateOperations.size,
            buttonLocks: this.buttonCreationLocks.size,
            eventLocks: this.eventAttachmentLocks.size,
            snapshotInProgress: this.snapshotInProgress,
            lastSnapshotClick: this.lastSnapshotClick,
            aggressiveMode: this.config.aggressiveMode
        };
    }

    cleanup() {
        console.log('🧹 Cleaning up Emergency Hospital Conflict Detector...');
        
        this.isActive = false;
        
        if (this.emergencyMonitorInterval) {
            clearInterval(this.emergencyMonitorInterval);
        }
        if (this.buttonMonitorInterval) {
            clearInterval(this.buttonMonitorInterval);
        }
        if (this.eventMonitorInterval) {
            clearInterval(this.eventMonitorInterval);
        }
        if (this.domObserver) {
            this.domObserver.disconnect();
        }
        
        console.log('✅ Emergency detector cleanup completed');
    }
}

// Initialize Emergency Hospital Conflict Detector
window.emergencyDetector = new EmergencyHospitalConflictDetector();

// Expose emergency functions
window.emergencyCleanupDuplicates = () => window.emergencyDetector.emergencyCleanup();
window.forceStopAllDuplicates = () => window.emergencyDetector.forceStopAllDuplicates();
window.getEmergencyStatus = () => window.emergencyDetector.getEmergencyStatus();

console.log('🚨 Emergency Hospital PC Conflict Detector loaded');
console.log('Emergency commands available:');
console.log('  - window.emergencyCleanupDuplicates() - Remove all duplicates immediately');
console.log('  - window.forceStopAllDuplicates() - Force stop and cleanup');
console.log('  - window.getEmergencyStatus() - Get emergency system status');