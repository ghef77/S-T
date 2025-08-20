// 🆕 FONCTION UNDO COMPLÈTE - Fichier séparé pour éviter les conflits
// Ce fichier contient la fonction undo recréée depuis zéro avec protection complète

// 🔄 Annuler une modification de cellule
function undoCellEdit(operation) {
    try {
        const { rowKey, columnLabel, initialValue } = operation.data;
        if (!rowKey || !columnLabel) {
            log('❌ Données manquantes pour annuler la modification de cellule', 'error');
            return false;
        }
        
        const tbody = document.getElementById('table-body');
        const targetRow = Array.from(tbody.children).find(tr => keyForRow(tr) === rowKey);
        
        if (!targetRow) {
            log('❌ Ligne non trouvée pour annuler la modification', 'error');
            return false;
        }
        
        const headers = Array.from(document.querySelectorAll('#data-table thead th')).slice(2).map(th => th.textContent);
        const columnIndex = headers.indexOf(columnLabel);
        const cells = Array.from(targetRow.querySelectorAll('td')).slice(2);
        
        if (columnIndex >= 0 && cells[columnIndex]) {
            cells[columnIndex].textContent = initialValue;
            cells[columnIndex].classList.remove('bg-yellow-100');
            log(`✅ Valeur de cellule restaurée: ${columnLabel} = "${initialValue}"`);
            return true;
        } else {
            log('❌ Colonne non trouvée pour annuler la modification', 'error');
            return false;
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'annulation de la modification de cellule:', error);
        return false;
    }
}

// ➕ Annuler l'ajout d'une ligne
function undoRowInsert(operation) {
    try {
        const { newRowKey } = operation.data;
        if (!newRowKey) {
            log('❌ Clé de ligne manquante pour annuler l\'ajout', 'error');
            return false;
        }
        
        const tbody = document.getElementById('table-body');
        const targetRow = Array.from(tbody.children).find(tr => keyForRow(tr) === newRowKey);
        
        if (!targetRow) {
            log('❌ Ligne à supprimer non trouvée', 'error');
            return false;
        }
        
        targetRow.remove();
        updateRowCount();
        log('✅ Ligne ajoutée supprimée avec succès');
        return true;
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'annulation de l\'ajout de ligne:', error);
        return false;
    }
}

// 🗑️ Annuler la suppression d'une ligne
function undoRowDelete(operation) {
    try {
        const { rowData, rowNumbers } = operation.data;
        if (!rowData || rowData.length === 0) {
            log('❌ Données de ligne manquantes pour annuler la suppression', 'error');
            return false;
        }
        
        const tbody = document.getElementById('table-body');
        const headers = Array.from(document.querySelectorAll('#data-table thead th')).slice(2).map(th => th.textContent);
        
        // Trier les données par numéro de ligne pour restaurer dans l'ordre correct
        let sortedRowData = [];
        if (rowNumbers && rowNumbers.length > 0) {
            const rowDataWithNumbers = rowData.map((rowDataItem, index) => ({
                rowNumber: rowNumbers[index] || 0,
                rowData: rowDataItem,
                originalIndex: index
            }));
            
            // Trier par numéro de ligne (croissant: 5, 6, 7)
            rowDataWithNumbers.sort((a, b) => a.rowNumber - b.rowNumber);
            sortedRowData = rowDataWithNumbers.map(item => item.rowData);
        } else {
            sortedRowData = rowData;
        }
        
        // Restaurer les lignes dans l'ordre trié
        sortedRowData.forEach((rowDataItem, index) => {
            const newRow = document.createElement('tr');
            newRow.className = 'bg-white hover:bg-gray-100 transition-colors cursor-pointer';
            
            // Créer la cellule de numéro de ligne
            const numCell = document.createElement('td');
            numCell.textContent = rowNumbers ? rowNumbers[index] : (tbody.children.length + 1);
            numCell.className = 'py-2 px-2 md:px-4 font-bold text-gray-800 whitespace-nowrap cursor-pointer frozen-column frozen-1';
            numCell.setAttribute('data-label', 'No');
            newRow.appendChild(numCell);
            
            // Créer la cellule de suppression/sélection
            newRow.appendChild(createDeleteCell(newRow));
            
            // Créer les cellules de données
            headers.forEach(header => {
                const value = rowDataItem[header] || '';
                newRow.appendChild(createEditableCell(header, value));
            });
            
            // Insérer à la position originale correcte
            if (rowNumbers && rowNumbers[index]) {
                const targetPosition = Math.min(rowNumbers[index] - 1, tbody.children.length);
                if (targetPosition >= 0) {
                    tbody.insertBefore(newRow, tbody.children[targetPosition]);
                } else {
                    tbody.appendChild(newRow);
                }
            } else {
                tbody.appendChild(newRow);
            }
        });
        
        // Renuméroter les lignes après restauration
        Array.from(tbody.children).forEach((tr, idx) => {
            const noCell = tr.querySelector('td:first-child');
            if (noCell) noCell.textContent = idx + 1;
        });
        
        updateRowCount();
        log(`✅ ${sortedRowData.length} ligne(s) restaurée(s) dans l'ordre original`);
        return true;
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'annulation de la suppression de ligne:', error);
        return false;
    }
}

// 🎨 Appliquer les couleurs de ligne au tableau
function applyRowColorsToTable() {
    try {
        Array.from(document.querySelectorAll('#data-table tr')).forEach(tr => {
            const k = keyForRow(tr);
            const c = rowColorMap[k];
            if (c && c !== '') {
                setRowColor(tr, c);
            }
        });
    } catch (error) {
        console.error('❌ Erreur lors de l\'application des couleurs:', error);
    }
}

// 🆕 NOUVELLE FONCTION UNDO PRINCIPALE - Recréée depuis zéro avec protection complète
function undo() {
    // 🚫 PROTECTION: Vérifier si l'undo est autorisé
    if (isPerformingUndoRedo) {
        log('🚫 Undo déjà en cours...', 'warning');
        return;
    }
    
    // 🚫 PROTECTION: Vérifier s'il y a des opérations à annuler
    if (operationHistory.length === 0) {
        log('ℹ️ Aucune opération à annuler.', 'info');
        return;
    }
    
    // 🚫 PROTECTION: Vérifier si la synchronisation est en cours
    if (window.isLocalSaveInProgress) {
        log('🚫 Synchronisation en cours, undo temporairement bloqué...', 'warning');
        return;
    }
    
    try {
        // 🔒 ACTIVER LE MODE UNDO
        isPerformingUndoRedo = true;
        
        // 📊 RÉCUPÉRER LA DERNIÈRE OPÉRATION (LIFO - Last In, First Out)
        const lastOperation = operationHistory[operationHistory.length - 1];
        const operationType = lastOperation.type;
        
        log(`🔄 Annulation de l'opération: ${getOperationTypeLabel(operationType)}`);
        
        // 🚫 PROTECTION: Arrêter toute synchronisation pendant l'undo
        if (autosaveTicker) {
            clearInterval(autosaveTicker);
            autosaveTicker = null;
        }
        
        // 🚫 PROTECTION: Bloquer la synchronisation temps réel
        suppressRealtimeUntil = Date.now() + 5000; // 5 secondes
        suppressAutosaveUntil = Date.now() + 3000; // 3 secondes
        
        // 🔄 TRAITER L'OPÉRATION SELON SON TYPE
        let operationSuccess = false;
        
        switch (operationType) {
            case OPERATION_TYPES.CELL_EDIT:
                operationSuccess = undoCellEdit(lastOperation);
                break;
                
            case OPERATION_TYPES.ROW_INSERT:
                operationSuccess = undoRowInsert(lastOperation);
                break;
                
            case OPERATION_TYPES.ROW_DELETE:
                operationSuccess = undoRowDelete(lastOperation);
                break;
                
            default:
                log(`⚠️ Type d'opération non supporté: ${operationType}`, 'warning');
                break;
        }
        
        if (operationSuccess) {
            // ✅ SUCCÈS: Supprimer l'opération de l'historique
            operationHistory.pop();
            
            // 🔄 RESTAURER LES COULEURS SI DISPONIBLES
            if (lastOperation.rowColors) {
                rowColorMap = { ...lastOperation.rowColors };
                persistRowColors();
                applyRowColorsToTable();
            }
            
            // 💾 SAUVEGARDER L'ÉTAT DE L'HISTORIQUE
            persistHistoryStacks();
            
            // 🔄 METTRE À JOUR L'ÉTAT DU BOUTON UNDO
            updateUndoButtonState();
            
            // 📊 AFFICHER LE STATUT
            log(`✅ Opération '${operationType}' annulée avec succès.`, 'success');
            showMessage(`✅ Opération annulée: ${getOperationTypeLabel(operationType)}`, 'success');
            
            // 🚫 PROTECTION: Démarrer le timer de reprise de synchronisation
            startUndoInactivityTimer();
            
        } else {
            log(`❌ Échec de l'annulation de l'opération: ${operationType}`, 'error');
            showMessage(`❌ Échec de l'annulation`, 'error');
        }
        
    } catch (error) {
        console.error('❌ Erreur critique lors de l\'undo:', error);
        log('❌ Erreur lors de l\'annulation.', 'error');
        showMessage('❌ Erreur lors de l\'annulation', 'error');
    } finally {
        // 🔓 DÉSACTIVER LE MODE UNDO
        isPerformingUndoRedo = false;
    }
}

// 🌐 Exposer les fonctions globalement
window.undo = undo;
window.undoCellEdit = undoCellEdit;
window.undoRowInsert = undoRowInsert;
window.undoRowDelete = undoRowDelete;
window.applyRowColorsToTable = applyRowColorsToTable;

