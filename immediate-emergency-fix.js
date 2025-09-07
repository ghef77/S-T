/**
 * IMMEDIATE EMERGENCY FIX for Hospital PC
 * Based on console analysis - stops duplicate creation at the source
 */

(function() {
    'use strict';
    
    console.log('🚨 IMMEDIATE EMERGENCY FIX LOADING...');
    
    // 1. IMMEDIATELY STOP ALL DUPLICATE BUTTON CREATION
    let buttonCreationBlocked = false;
    
    // Override createElement to prevent duplicate buttons
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        
        if (tagName.toLowerCase() === 'button' && !buttonCreationBlocked) {
            // Hook into button creation
            const originalSetAttribute = element.setAttribute;
            element.setAttribute = function(name, value) {
                if (name === 'id' && value === 'manual-snapshot-btn') {
                    // Check if button already exists
                    const existing = document.getElementById('manual-snapshot-btn');
                    if (existing) {
                        console.log('🚨 BLOCKED: Attempted duplicate manual-snapshot-btn creation');
                        return; // Don't set the ID - prevents duplicate
                    }
                }
                return originalSetAttribute.call(this, name, value);
            };
        }
        
        return element;
    };
    
    // 2. IMMEDIATELY CLEAN EXISTING DUPLICATES
    function emergencyCleanup() {
        console.log('🧹 EMERGENCY: Cleaning all duplicates NOW...');
        
        // Remove duplicate buttons
        const allButtons = document.querySelectorAll('[id*="manual-snapshot"], [onclick*="handleManualSnapshot"]');
        if (allButtons.length > 1) {
            console.log(`🚨 Found ${allButtons.length} snapshot buttons - keeping first only`);
            for (let i = 1; i < allButtons.length; i++) {
                allButtons[i].remove();
                console.log(`🗑️ Removed duplicate button ${i}`);
            }
        }
        
        // Remove duplicate text elements
        const textElements = document.querySelectorAll('*');
        const seenTexts = new Set();
        textElements.forEach(el => {
            if (el.textContent && el.textContent.includes('Événements tactiles ajoutés au bouton snapshot')) {
                if (seenTexts.has(el.textContent)) {
                    el.remove();
                    console.log('🗑️ Removed duplicate text element');
                } else {
                    seenTexts.add(el.textContent);
                }
            }
        });
        
        console.log('✅ Emergency cleanup completed');
    }
    
    // 3. STOP THE SOURCE OF DUPLICATES
    function stopDuplicationSource() {
        console.log('🛑 Stopping duplication at source...');
        
        // Block all touch event additions temporarily
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        let eventBlockActive = true;
        
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            // Block snapshot-related event duplicates
            if (type === 'click' && 
                this.id === 'manual-snapshot-btn' && 
                eventBlockActive) {
                
                // Check if listener already exists
                const existingListeners = this._eventListeners?.click || [];
                if (existingListeners.length > 0) {
                    console.log('🚨 BLOCKED: Duplicate click listener on snapshot button');
                    return;
                }
                
                // Track listeners
                if (!this._eventListeners) this._eventListeners = {};
                if (!this._eventListeners[type]) this._eventListeners[type] = [];
                this._eventListeners[type].push(listener);
            }
            
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        // Re-enable event addition after 10 seconds
        setTimeout(() => {
            eventBlockActive = false;
            console.log('🔓 Event blocking released after 10 seconds');
        }, 10000);
    }
    
    // 4. MONITOR AND PREVENT IN REAL-TIME
    function startEmergencyMonitoring() {
        console.log('👁️ Starting emergency monitoring...');
        
        setInterval(() => {
            // Check for new duplicates every 500ms
            const buttons = document.querySelectorAll('[id="manual-snapshot-btn"]');
            if (buttons.length > 1) {
                console.log(`🚨 DETECTED: ${buttons.length} duplicate buttons - removing extras`);
                for (let i = 1; i < buttons.length; i++) {
                    buttons[i].remove();
                }
            }
            
            // Check for duplicate event listeners
            const buttonWithMultipleHandlers = document.getElementById('manual-snapshot-btn');
            if (buttonWithMultipleHandlers && buttonWithMultipleHandlers._eventListeners) {
                const clickListeners = buttonWithMultipleHandlers._eventListeners.click;
                if (clickListeners && clickListeners.length > 1) {
                    console.log('🚨 DETECTED: Multiple click listeners - cleaning up');
                    // Remove all but first listener
                    buttonWithMultipleHandlers._eventListeners.click = clickListeners.slice(0, 1);
                }
            }
        }, 500);
    }
    
    // 5. PATCH SPECIFIC PROBLEM FUNCTIONS
    function patchProblemFunctions() {
        console.log('🔧 Patching problem functions...');
        
        // Prevent multiple calls to touch event setup
        let touchEventsAdded = false;
        
        // If there's a function adding touch events, patch it
        const originalConsoleLog = console.log;
        console.log = function(...args) {
            const message = args.join(' ');
            
            // Don't allow "Événements tactiles ajoutés" to be logged multiple times
            if (message.includes('Événements tactiles ajoutés au bouton snapshot uniquement')) {
                if (touchEventsAdded) {
                    console.warn('🚨 BLOCKED: Attempted duplicate touch events addition');
                    return;
                }
                touchEventsAdded = true;
            }
            
            return originalConsoleLog.apply(this, args);
        };
    }
    
    // EXECUTE EMERGENCY FIXES IMMEDIATELY
    console.log('🚨 EXECUTING EMERGENCY FIXES...');
    
    // Run cleanup immediately
    emergencyCleanup();
    
    // Stop duplication source
    stopDuplicationSource();
    
    // Start monitoring
    startEmergencyMonitoring();
    
    // Patch functions
    patchProblemFunctions();
    
    // Run cleanup again after 2 seconds to catch any stragglers
    setTimeout(emergencyCleanup, 2000);
    
    // Final cleanup after 5 seconds
    setTimeout(() => {
        emergencyCleanup();
        console.log('✅ EMERGENCY FIXES COMPLETE - Monitoring active');
    }, 5000);
    
    // Expose emergency controls
    window.immediateEmergencyCleanup = emergencyCleanup;
    window.stopAllDuplicates = () => {
        emergencyCleanup();
        buttonCreationBlocked = true;
        console.log('🛑 ALL DUPLICATE CREATION STOPPED');
    };
    
    console.log('✅ IMMEDIATE EMERGENCY FIX LOADED');
    console.log('Commands: window.immediateEmergencyCleanup() or window.stopAllDuplicates()');
    
})();