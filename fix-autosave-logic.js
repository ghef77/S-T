// Logique corrigée pour éviter l'autosave lors des changements de focus

// Fonction markEdited améliorée
function markEdited() {
    // CRITICAL: Ne pas marquer comme édité pendant la restauration du focus
    if (window._isRestoringFocus) {
        console.log('🚫 markEdited supprimé - restauration du focus en cours');
        return;
    }
    
    // Vérifier si c'est une vraie modification de contenu
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'TD' && activeElement.contentEditable === 'true') {
        const currentValue = activeElement.textContent;
        const originalValue = activeElement.dataset.originalValue;
        
        // Si originalValue n'est pas défini, c'est probablement la première fois qu'on édite cette cellule
        // Dans ce cas, on permet l'édition
        if (originalValue !== undefined && currentValue === originalValue) {
            console.log('🚫 markEdited supprimé - aucun changement de contenu détecté');
            return;
        }
        
        // Vérification supplémentaire : s'assurer que ce n'est pas juste un changement de focus
        if (originalValue !== undefined && Math.abs(currentValue.length - originalValue.length) <= 1) {
            // Si la différence de longueur est très petite, vérifier que c'est vraiment une modification
            if (currentValue === originalValue || currentValue === originalValue.trim()) {
                console.log('🚫 markEdited supprimé - changement de focus détecté, pas de vraie modification');
                return;
            }
        }
        
        if (originalValue !== undefined) {
            console.log(`✅ Modification détectée: "${originalValue}" → "${currentValue}"`);
        } else {
            console.log(`✅ Première édition de la cellule: "${currentValue}"`);
        }
    }
    
    // Continuer avec l'autosave seulement si c'est une vraie modification
    isDirty = true; 
    isTyping = true; 
    lastEditAt = Date.now();
    
    if (typingTimer) clearTimeout(typingTimer);
    scheduleAutosaveCountdown();
    typingTimer = setTimeout(() => { isTyping = false; }, 1200);
}

// Fonction pour vérifier si une modification est légitime
function isLegitimateEdit(cell, newValue) {
    const originalValue = cell.dataset.originalValue;
    
    // Si pas de valeur originale, c'est la première édition
    if (originalValue === undefined) {
        return true;
    }
    
    // Si la valeur n'a pas changé, ce n'est pas une modification
    if (newValue === originalValue) {
        return false;
    }
    
    // Vérification pour les changements de focus (différences très petites)
    if (Math.abs(newValue.length - originalValue.length) <= 1) {
        // Vérifier si c'est juste un changement de focus
        if (newValue === originalValue.trim() || newValue === originalValue) {
            return false;
        }
    }
    
    return true;
}

// Fonction pour mettre à jour dataset.originalValue de manière sûre
function updateOriginalValue(cell, newValue) {
    if (isLegitimateEdit(cell, newValue)) {
        cell.dataset.originalValue = newValue;
        console.log(`✅ Valeur originale mise à jour: "${newValue}"`);
        return true;
    } else {
        console.log(`🚫 Valeur originale non mise à jour - modification non légitime`);
        return false;
    }
}

// Logique pour les événements blur
function handleBlurEvent(cell) {
    const currentValue = cell.textContent;
    const originalValue = cell.dataset.originalValue;
    
    // Sauvegarder seulement si la valeur a vraiment changé
    if (currentValue !== originalValue) {
        console.log(`✅ Modification détectée lors du blur: "${originalValue}" → "${currentValue}"`);
        
        // Mettre à jour la valeur originale
        cell.dataset.originalValue = currentValue;
        
        // Déclencher l'autosave
        saveStateToHistory();
        saveLocalDraft();
        markEdited();
    } else {
        console.log(`🚫 Aucune modification lors du blur - valeur identique`);
    }
}

// Logique pour les événements input
function handleInputEvent(cell) {
    const currentValue = cell.textContent;
    const originalValue = cell.dataset.originalValue;
    
    // Vérifier que le contenu a vraiment changé
    if (currentValue === originalValue) {
        console.log(`🚫 Input ignoré - aucun changement de contenu`);
        return;
    }
    
    console.log(`✅ Input détecté: "${originalValue}" → "${currentValue}"`);
    
    // Marquer comme modifié
    hasBeenModified = true;
    
    // Mettre à jour la valeur originale
    cell.dataset.originalValue = currentValue;
    
    // Continuer avec la logique normale
    // ... (rest of the input logic)
}

console.log('✅ Logique autosave corrigée chargée');
console.log('Fonctions disponibles:');
console.log('- markEdited() : Version améliorée avec détection des vraies modifications');
console.log('- isLegitimateEdit(cell, newValue) : Vérifie si une modification est légitime');
console.log('- updateOriginalValue(cell, newValue) : Met à jour la valeur originale de manière sûre');
console.log('- handleBlurEvent(cell) : Gère les événements blur');
console.log('- handleInputEvent(cell) : Gère les événements input');
