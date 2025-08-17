// Main Application JavaScript - Enhanced Version
// This file contains all the core functionality, autosave, table management, and gallery system

// Import Supabase functions
import { 
    supabase, 
    supabaseConfig, 
    loadFromSupabase, 
    syncToSupabase, 
    deleteFromSupabase,
    createStorageBucket,
    uploadImageToStorage,
    deleteImageFromStorage,
    syncImagesToSupabase,
    loadImagesFromSupabase,
    testSupabaseConnection
} from './supabase-connection.js';

// Configuration
const APP_CONFIG = { 
    password: 'p123', 
    version: '2.5.4-modular-enhanced' 
};

// Global state management
const appState = { 
    isLoggedIn: false, 
    masterSource: 'supabase', 
    dataHash: null, 
    localData: null, 
    serverColumns: null 
};

// Application state variables
let isDirty = false;
let saveTimeout = null;
let history = [];
let historyDebounceTimeout = null;
let isTyping = false;
let lastEditAt = Date.now();
let typingTimer = null;
let isSyncing = false;
let realtimeSubscription = null;
let lastSyncTimestamp = null;
let isRealtimeEnabled = true;

// Autosave configuration
const AUTOSAVE_DELAY_MS = 3000; // 3 seconds after last edit when idle
let autosaveTicker = null;
let lastShownCountdown = null;
let lastFocusInfo = null;
let lastCellPos = null;

// Zoom functionality
let zoomFactor = parseFloat(localStorage.getItem('zoomFactor') || '1');

// Row color management
let currentRowColor = localStorage.getItem('rowColor') || '#FFF59D';
let rowColorMap = {};
let isRowPaintDragging = false;
let rowPaintAction = 'color';
let paintMode = localStorage.getItem('rowPaintMode') || 'auto';
let showOnlyColored = false;

// Image management
// Variables de galerie supprimées - galerie simplifiée gérée séparément
let isUploading = false; // Prevent multiple simultaneous uploads

// Enhanced constants and helpers
const BOLD_HEADERS = ['nom_prénom', 'pec finale', 'diagnostic_initial'];

// Utility functions
function log(message, type = 'info') {
    // Simplified logging - only log errors
    if (type === 'error') {
        console.error(message);
    }
}

function showMessage(message, type = 'info') {
    const messageBox = document.getElementById('message-box');
    const messageText = document.getElementById('message-text');
    
    if (messageBox && messageText) {
        // Clear any existing timer
        if (window._msgTimer) clearTimeout(window._msgTimer);
        
        messageText.textContent = message;
        messageBox.className = `message-box ${type}`;
        
        // Force reflow for smooth animation
        void messageBox.offsetWidth;
        
        messageBox.classList.remove('hidden');
        messageBox.classList.add('show');
        
        // Auto-hide after 3 seconds
        window._msgTimer = setTimeout(() => {
            messageBox.classList.remove('show');
            setTimeout(() => messageBox.classList.add('hidden'), 500);
        }, 3000);
    }
}

function getFormattedDate() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
}

function getHeaders() {
    return [
        'Date de saisie',
        'PEC finale',
        'PEC initiale',
        'Nom_Prénom',
        'DDN',
        'Diagnostic_initial',
        'information complementaire',
        'numero_tel'
    ];
}

// Enhanced name formatting functions
function _titleCasePart(s) {
    if (!s) return '';
    return s.split(' ').map(word => {
        if (word.length <= 2) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

function formatNomPrenom(raw) {
    if (raw == null) return '';
    let s = String(raw).trim().replace(/\s+/g, ' ');
    if (!s) return '';
    
    // If there's a comma, interpret as "LAST, First ..."
    if (s.includes(',')) {
        const [last, rest] = s.split(',');
        const nom = last.trim().toUpperCase();
        const prenom = _titleCasePart((rest || '').trim());
        return prenom ? `${nom}\n${prenom}` : nom;
    }
    
    // Default: first token is last name; remainder is first name(s)
    const parts = s.split(' ');
    const nom = (parts.shift() || '').toUpperCase();
    const prenom = _titleCasePart(parts.join(' ').trim());
    return prenom ? `${nom}\n${prenom}` : nom;
}

function isNomPrenomLabel(label) {
    try {
        const n = normalizeKey(label);
        return n === 'nom prenom' || n.includes('nom prenom');
    } catch (_) {
        return label === 'Nom_Prénom';
    }
}

function normalizeKey(k) {
    if (!k) return '';
    return String(k).trim().toLowerCase().replace(/[_\-\s]+/g, ' ').replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Core autosave functionality
function markEdited() {
    isDirty = true;
    isTyping = true;
    log('📝 markEdited() called - setting isTyping=true, isDirty=true');
    
    if (typingTimer) clearTimeout(typingTimer);
    
    // Debounced approach: only update lastEditAt after user stops typing
    typingTimer = setTimeout(() => {
        isTyping = false;
        lastEditAt = Date.now(); // Only set this when typing stops
        log('✅ Typing stopped, lastEditAt updated to: ' + new Date(lastEditAt).toLocaleTimeString());
    }, 1200);
}

function startPeriodicSync() {
    if (window._syncTimer) {
        log('Autosave timer already running, skipping...');
        return;
    }
    
    log('Starting autosave timer...');
    window._syncTimer = setInterval(async () => {
        if (isTyping) return;
        
        // Don't autosave if there are pending deletions
        if (deletionQueue.length > 0) {
            updateSyncIndicator('pending', `Suppressions en cours...`);
            return;
        }
        
        // Calculate remaining time for autosave
        const timeSinceLastEdit = Date.now() - lastEditAt;
        const remainingTime = Math.max(0, AUTOSAVE_DELAY_MS - timeSinceLastEdit);
        
        // Update countdown display
        if (isDirty && remainingTime > 0) {
            const secondsRemaining = Math.ceil(remainingTime / 1000);
            updateSyncIndicator('pending', `Sauvegarde dans ${secondsRemaining}s...`);
        }
        
        if (remainingTime > 0) return;
        
        if (isSyncing) return;
        
        if (!isDirty) return;
        
        try {
            // Capture current focus before autosave
            captureFocusInfo();
            captureSimplePos();
            
            isSyncing = true;
            updateSyncIndicator('syncing', 'Synchronisation automatique...');
            await syncToSupabase(collectTableData(), false);
            isDirty = false;
            updateSyncIndicator('synced', 'Synchronisé');
            
            // Restore focus after successful autosave
            setTimeout(() => {
                restoreFocus();
            }, 100);
            
        } catch (error) {
            console.error('❌ Autosave error:', error);
            updateSyncIndicator('error', 'Non synchronisé');
            showMessage('Erreur de sauvegarde automatique', 'error');
            
            // Restore focus even on error
            setTimeout(() => {
                restoreFocus();
            }, 100);
        } finally { 
            isSyncing = false; 
        }
    }, 1000); // Check every second for countdown
}

function stopPeriodicSync() {
    if (window._syncTimer) {
        clearInterval(window._syncTimer);
        window._syncTimer = null;
        log('Autosave timer stopped');
    }
}

// Enhanced table data collection
function collectTableData() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return [];
    
    const data = [];
    Array.from(tbody.querySelectorAll('tr')).forEach((row, index) => {
        const rowData = {};
        const cells = Array.from(row.querySelectorAll('td'));
        
        // Get the original row number from the first cell (No column)
        const noCell = row.querySelector('td:first-child');
        let originalRowNo = index + 1; // Default to index + 1
        
        if (noCell && noCell.textContent && noCell.textContent.trim() !== '') {
            const parsedNo = parseInt(noCell.textContent.trim());
            if (!isNaN(parsedNo)) {
                originalRowNo = parsedNo;
            }
        }
        
        // Add row number - preserve original number if possible
        rowData['No'] = originalRowNo;
        
        // Add data from editable cells - use data-label to ensure correct mapping
        const headers = getHeaders();
        headers.forEach((header) => {
            // Find the cell by its data-label attribute to ensure correct mapping
            const cell = row.querySelector(`[data-label="${header}"]`);
            if (cell) {
                const input = cell.querySelector('input');
                if (input) {
                    rowData[header] = input.value.trim();
                } else {
                    rowData[header] = cell.textContent.trim();
                }
            } else {
                // If cell doesn't exist, set default value
                if (header === 'Date de saisie') {
                    rowData[header] = getFormattedDate();
                } else if (header === 'PEC finale' || header === 'PEC initiale') {
                    rowData[header] = 'À définir';
                } else if (header === 'Diagnostic_initial') {
                    rowData[header] = 'À préciser';
                } else {
                    rowData[header] = '';
                }
            }
        });
        
        // Add supprimer field (exists in database schema)
        rowData.supprimer = '';
        
        data.push(rowData);
    });
    
    return data;
}

// Enhanced table management functions
function createEditableCell(label, value = '') {
    const cell = document.createElement('td');
    const dbKey = label; // names are identical (no mapping)
    
    // Check if this is a PEC column that should have placeholder behavior
    const isPecColumn = label === 'PEC finale' || label === 'PEC initiale';
    
    // Check if this is a placeholder column (PEC or Diagnostic_initial)
    const isPlaceholderColumn = isPecColumn || label === 'Diagnostic_initial';
    
    // Set initial content
    if (isPlaceholderColumn && (value === 'À définir' || value === 'À préciser')) {
        cell.textContent = value;
        cell.classList.add('placeholder-text');
    } else {
        cell.textContent = value || '';
    }
    
    cell.contentEditable = true;
    cell.className = 'py-2 px-2 md:px-4 editable-cell';
    cell.setAttribute('data-label', label);
    cell.setAttribute('data-dbkey', dbKey);
    
    // --- Nom_Prénom auto-formatting logic ---
    if (isNomPrenomLabel(label)) {
        // Ensure initial display is formatted when creating the cell
        if (value) {
            value = formatNomPrenom(value);
            cell.textContent = value;
        }
        // Format when the user leaves the cell
        cell.addEventListener('blur', () => {
            cell.textContent = formatNomPrenom(cell.textContent);
            saveStateToHistory();
        markEdited();
        });
        // Also normalize after paste into this cell
        cell.addEventListener('paste', () => {
            setTimeout(() => {
                cell.textContent = formatNomPrenom(cell.textContent);
        saveStateToHistory();
                markEdited();
            }, 0);
        });
    }
    
    // --- PEC columns placeholder and Excel-like behavior ---
    if (isPecColumn) {
        // Add tooltip to show functionality
        cell.title = 'Cliquez pour éditer • Clic droit pour restaurer le placeholder • Ctrl+Espace pour effacer';
        
        // Handle focus - clear placeholder and select all text
        cell.addEventListener('focus', (e) => {
            if (cell.textContent === 'À définir') {
                cell.textContent = '';
                cell.classList.remove('placeholder-text');
                // Apply bold styling if this is a bold header
                if (BOLD_HEADERS.includes(label.toLowerCase())) {
                    cell.style.fontWeight = 'bold';
                    cell.style.color = '#000';
                }
            }
            // Select all text when focusing (Excel-like behavior)
            setTimeout(() => {
                const range = document.createRange();
                range.selectNodeContents(cell);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }, 0);
        });
        
        // Handle blur - restore placeholder if empty
        cell.addEventListener('blur', () => {
            if (cell.textContent.trim() === '') {
                cell.textContent = 'À définir';
                cell.classList.add('placeholder-text');
                // Remove bold styling when placeholder is restored
                if (BOLD_HEADERS.includes(label.toLowerCase())) {
                    cell.style.fontWeight = 'normal';
                    cell.style.color = '#9CA3AF';
                }
            }
        });
        
        // Handle input - remove placeholder class when typing
        cell.addEventListener('input', () => {
            if (cell.classList.contains('placeholder-text')) {
                cell.classList.remove('placeholder-text');
                // Apply bold styling if this is a bold header
                if (BOLD_HEADERS.includes(label.toLowerCase())) {
                    cell.style.fontWeight = 'bold';
                    cell.style.color = '#000';
                }
            }
        });
        
        // Handle click - clear content and select all text (Excel-like)
        cell.addEventListener('click', (e) => {
            if (cell.textContent === 'À définir') {
                cell.textContent = '';
                cell.classList.remove('placeholder-text');
                // Apply bold styling if this is a bold header
                if (BOLD_HEADERS.includes(label.toLowerCase())) {
                    cell.style.fontWeight = 'bold';
                    cell.style.color = '#000';
                }
                // Select all text after clearing
                setTimeout(() => {
                    const range = document.createRange();
                    range.selectNodeContents(cell);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }, 0);
            }
        });
        
        // Handle keydown for Enter key to clear placeholder
        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && cell.textContent === 'À définir') {
                cell.textContent = '';
                cell.classList.remove('placeholder-text');
                // Apply bold styling if this is a bold header
                if (BOLD_HEADERS.includes(label.toLowerCase())) {
                    cell.style.fontWeight = 'bold';
                    cell.style.color = '#000';
                }
                e.preventDefault();
            }
        });
        
        // Add right-click context menu for PEC cells
        cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // Create context menu
            const contextMenu = document.createElement('div');
            contextMenu.className = 'context-menu';
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
            
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = 'Restaurer placeholder';
            menuItem.onclick = () => {
                cell.textContent = 'À définir';
                cell.classList.add('placeholder-text');
                // Remove bold styling when placeholder is restored
                if (BOLD_HEADERS.includes(label.toLowerCase())) {
                    cell.style.fontWeight = 'normal';
                    cell.style.color = '#9CA3AF';
                }
                contextMenu.remove();
                showMessage('Placeholder restauré', 'info');
            };
            
            contextMenu.appendChild(menuItem);
            document.body.appendChild(contextMenu);
            
            // Remove context menu when clicking elsewhere
            const removeMenu = () => {
                contextMenu.remove();
                document.removeEventListener('click', removeMenu);
            };
            setTimeout(() => document.addEventListener('click', removeMenu), 0);
        });
    }
    
    // --- Diagnostic_initial column placeholder behavior ---
    if (label === 'Diagnostic_initial') {
        // Add tooltip to show functionality
        cell.title = 'Cliquez pour éditer • Clic droit pour restaurer le placeholder • Ctrl+Espace pour effacer';
        
        // Handle focus - clear placeholder and select all text
        cell.addEventListener('focus', (e) => {
            if (cell.textContent === 'À préciser') {
                cell.textContent = '';
                cell.classList.remove('placeholder-text');
                // Apply bold styling if this is a bold header
                if (BOLD_HEADERS.includes(label.toLowerCase())) {
                    cell.style.fontWeight = 'bold';
                    cell.style.color = '#000';
                }
            }
            // Select all text when focusing (Excel-like behavior)
            setTimeout(() => {
                const range = document.createRange();
                range.selectNodeContents(cell);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }, 0);
        });
        
        // Handle blur - restore placeholder if empty
        cell.addEventListener('blur', () => {
            if (cell.textContent.trim() === '') {
                cell.textContent = 'À préciser';
                cell.classList.add('placeholder-text');
                // Remove bold styling when placeholder is restored
                if (BOLD_HEADERS.includes(label.toLowerCase())) {
                    cell.style.fontWeight = 'normal';
                    cell.style.color = '#9CA3AF';
                }
            }
        });
        
        // Handle input - remove placeholder class when typing
        cell.addEventListener('input', () => {
            if (cell.classList.contains('placeholder-text')) {
                cell.classList.remove('placeholder-text');
                // Apply bold styling if this is a bold header
                if (BOLD_HEADERS.includes(label.toLowerCase())) {
                    cell.style.fontWeight = 'bold';
                    cell.style.color = '#000';
                }
            }
        });
        
        // Handle click - clear content and select all text (Excel-like)
        cell.addEventListener('click', (e) => {
            if (cell.textContent === 'À préciser') {
                cell.textContent = '';
                cell.classList.remove('placeholder-text');
                // Apply bold styling if this is a bold header
                if (BOLD_HEADERS.includes(label.toLowerCase())) {
                    cell.style.fontWeight = 'bold';
                    cell.style.color = '#000';
                }
                // Select all text after clearing
                setTimeout(() => {
                    const range = document.createRange();
                    range.selectNodeContents(cell);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
            }, 0);
            }
        });
        
        // Handle keydown for Enter key to clear placeholder
        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && cell.textContent === 'À préciser') {
                cell.textContent = '';
                cell.classList.remove('placeholder-text');
                // Apply bold styling if this is a bold header
                if (BOLD_HEADERS.includes(label.toLowerCase())) {
                    cell.style.fontWeight = 'bold';
                    cell.style.color = '#000';
                }
                e.preventDefault();
            }
        });
        
        // Add right-click context menu for Diagnostic_initial cells
        cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // Create context menu
            const contextMenu = document.createElement('div');
            contextMenu.className = 'context-menu';
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
            
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = 'Restaurer placeholder';
            menuItem.onclick = () => {
                cell.textContent = 'À préciser';
                cell.classList.add('placeholder-text');
                // Remove bold styling when placeholder is restored
                if (BOLD_HEADERS.includes(label.toLowerCase())) {
                    cell.style.fontWeight = 'normal';
                    cell.style.color = '#9CA3AF';
                }
                contextMenu.remove();
                showMessage('Placeholder restauré', 'info');
            };
            
            contextMenu.appendChild(menuItem);
            document.body.appendChild(contextMenu);
            
            // Remove context menu when clicking elsewhere
            const removeMenu = () => {
                contextMenu.remove();
                document.removeEventListener('click', removeMenu);
            };
            setTimeout(() => document.addEventListener('click', removeMenu), 0);
        });
    }
    
    if (BOLD_HEADERS.includes(label.toLowerCase())) {
        // Don't apply bold styling to PEC columns when they have placeholder text
        if (!isPecColumn || !cell.classList.contains('placeholder-text')) {
            cell.style.fontWeight = 'bold';
            cell.style.color = '#000';
        }
    }
    
    cell.setAttribute('tabindex', '0');
    cell.oninput = () => {
        saveStateToHistory();
        markEdited();
        // keep caret/position updated while typing
        captureFocusInfo();
        captureSimplePos();
    };
    
    cell.addEventListener('keyup', (e) => {
        // update caret after navigation keys
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
            captureFocusInfo();
            captureSimplePos();
        }
    });
    
    return cell;
}

function createDeleteCell(row) {
    const deleteCell = document.createElement('td');
    deleteCell.className = 'p-0 text-center';
    deleteCell.setAttribute('data-label', 'Effacer');
    
    const sel = document.createElement('input');
    sel.type = 'checkbox';
    sel.className = 'm-1 align-middle';
    sel.addEventListener('change', () => { 
        row.classList.toggle('selected-row', sel.checked); 
    });
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'text-red-500 hover:text-red-700 font-bold p-2 transition-colors';
    deleteButton.innerHTML = '🗑️';
    deleteButton.onclick = (e) => {
        e.stopPropagation();
        const selected = Array.from(document.querySelectorAll('#table-body tr.selected-row'));
        if (selected.length > 0) {
            // Multiple rows selected: confirm before deleting
            promptKeyConfirm(`Supprimer ${selected.length} ligne(s) ?`, () => deleteRows(selected));
        } else {
            // Single row via trash icon: delete immediately without confirmation
            deleteRows([row]);
        }
    };
    
    const wrap = document.createElement('div');
    wrap.className = 'flex items-center justify-center gap-1';
    wrap.appendChild(sel);
    wrap.appendChild(deleteButton);
    deleteCell.appendChild(wrap);
    
    return deleteCell;
}

// Enhanced row creation
function addRow() {
    const tbody = document.getElementById('table-body');
    
    // Check if limit of 100 rows is reached
    if (tbody.children.length >= 100) {
        showMessage('Limite atteinte - Maximum 100 lignes autorisées', 'error');
        return;
    }
    
    const row = document.createElement('tr');
    row.className = 'bg-white hover:bg-gray-100 transition-colors cursor-pointer';
    
    // Row identification will use the 'No' column
    
    // Row number
    const numCell = document.createElement('td');
    numCell.textContent = tbody.children.length + 1;
    numCell.className = 'py-2 px-2 md:px-4 font-bold text-gray-800 whitespace-nowrap cursor-pointer frozen-column frozen-1';
    numCell.setAttribute('data-label', 'No');
    numCell.title = 'Cliquer pour colorer/effacer la ligne';
    
    // Add row painting functionality
    numCell.addEventListener('mousedown', (e) => { 
        if (e.button !== 0) return; 
        startRowPaint(row); 
        e.preventDefault(); 
    });
    
    numCell.addEventListener('mouseenter', () => { 
        if (isRowPaintDragging) applyRowPaint(row); 
    });
    
    numCell.addEventListener('click', (e) => {
        e.preventDefault();
        // En mode auto, on colorie/décolore directement au clic
        if (paintMode === 'auto') {
            rowPaintAction = getPaintActionForRow(row);
            applyRowPaint(row);
        } else if (!isRowPaintDragging) {
            // En mode manuel, on utilise l'action sélectionnée
            rowPaintAction = getPaintActionForRow(row);
            applyRowPaint(row);
        }
    });
    
    numCell.addEventListener('touchstart', (e) => { 
        startRowPaint(row); 
        e.preventDefault(); 
    }, { passive: false });
    
    numCell.addEventListener('touchmove', (e) => { 
        const t = e.touches && e.touches[0]; 
        if (!t) return; 
        const el = document.elementFromPoint(t.clientX, t.clientY); 
        const tr = el ? el.closest('#table-body tr') : null; 
        if (tr) applyRowPaint(tr); 
        e.preventDefault(); 
    }, { passive: false });
    
    row.appendChild(numCell);
    
    // Delete/selection cell
    row.appendChild(createDeleteCell(row));
    
    // Date cell (pre-filled)
    const dateCell = createEditableCell('Date de saisie', getFormattedDate());
    row.appendChild(dateCell);
    
    // Add remaining headers (skip Date de saisie)
    const headers = getHeaders().slice(1);
    headers.forEach(header => {
        // Create editable cell with appropriate default value
        let defaultValue = '';
        if (header === 'PEC finale' || header === 'PEC initiale') {
            defaultValue = 'À définir';
        } else if (header === 'Diagnostic_initial') {
            defaultValue = 'À préciser';
        }
        row.appendChild(createEditableCell(header, defaultValue));
    });
    
    tbody.appendChild(row);
    
    try { 
        const k = String(tbody.children.length); 
        const col = rowColorMap[k]; 
        if (col) setRowColor(row, col); 
    } catch (_) {}
    
    // cleanupImagesColumn(); // Removed redundant call
    
    markEdited();
    
    // Update select-all checkbox state after adding new row
    setTimeout(() => {
        updateSelectAllState();
        updateRowCounter();
    }, 100);
}

// Load existing data into table
function loadDataIntoTable(data) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    
    // Check if data exceeds the 100 row limit
    if (data && data.length > 100) {
        showMessage('Limite atteinte - Maximum 100 lignes autorisées. Seules les 100 premières lignes seront importées.', 'warning');
        data = data.slice(0, 100); // Limit to first 100 rows
    }
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (data && data.length > 0) {

        
        // Migrate data to new structure if needed
        const migratedData = migrateDataStructure(data);
        
        migratedData.forEach((rowData, index) => {

            const row = document.createElement('tr');
            row.className = 'bg-white hover:bg-gray-100 transition-colors cursor-pointer';
            
            // Set row key for identification
            const rowKey = rowData.key || String(index + 1);
            row.dataset.key = rowKey;
            
            // Row number
            const numCell = document.createElement('td');
            numCell.textContent = index + 1;
            numCell.className = 'py-2 px-2 md:px-4 font-bold text-gray-800 whitespace-nowrap cursor-pointer frozen-column frozen-1';
            numCell.setAttribute('data-label', 'No');
            numCell.title = 'Cliquer pour colorer/effacer la ligne';
            
            // Add row painting functionality
            numCell.addEventListener('mousedown', (e) => { 
                if (e.button !== 0) return; 
                startRowPaint(row); 
                e.preventDefault(); 
            });
            
            numCell.addEventListener('mouseenter', () => { 
                if (isRowPaintDragging) {
                    applyRowPaint(row); 
                } else if (paintMode === 'hover') {
                    // Mode survol : colorer automatiquement au passage de la souris
                    if (row.dataset.rowColored !== '1') {
                        setRowColor(row, currentRowColor);
                        const key = keyForRow(row);
                        rowColorMap[key] = currentRowColor;
                        persistRowColors();
                    }
                }
            });
            

            
            numCell.addEventListener('click', (e) => {
                e.preventDefault();
                // En mode auto, on colorie/décolore directement au clic
                if (paintMode === 'auto') {
                    rowPaintAction = getPaintActionForRow(row);
                    applyRowPaint(row);
                } else if (!isRowPaintDragging) {
                    // En mode manuel, on utilise l'action sélectionnée
                    rowPaintAction = getPaintActionForRow(row);
                    applyRowPaint(row);
                }
            });
            
            numCell.addEventListener('touchstart', (e) => { 
                startRowPaint(row); 
                e.preventDefault(); 
            }, { passive: false });
            
            numCell.addEventListener('touchmove', (e) => { 
                const t = e.touches && e.touches[0]; 
                if (!t) return; 
                const el = document.elementFromPoint(t.clientX, t.clientY); 
                const tr = el ? el.closest('#table-body tr') : null; 
                if (tr) applyRowPaint(tr); 
                e.preventDefault(); 
            }, { passive: false });
            
            row.appendChild(numCell);
            
            // Delete/selection cell
            row.appendChild(createDeleteCell(row));
            
            // Add data cells
            const headers = getHeaders();

            headers.forEach(header => {
                const value = rowData[header] || '';

                row.appendChild(createEditableCell(header, value));
            });
            
            tbody.appendChild(row);
        });
        
        // cleanupImagesColumn(); // Removed redundant call
        

    } else {

        addRow();
    }
    
    // cleanupImagesColumn(); // Removed redundant call
    
    // Update row counter after loading data
    updateRowCounter();
}

// Table data loading function
function loadTableData(data) {
    if (!data) { 
        log('Structure invalide', 'error'); 
        return false; 
    }
    
    const tbody = document.getElementById('table-body');
    if (!tbody) return false;
    
    tbody.innerHTML = '';
    const headers = getHeaders();
    
    // Migrate data to new structure if needed
    const migratedData = migrateDataStructure(data);
    
    migratedData.forEach((rowData, index) => {
        const row = document.createElement('tr');
        row.className = 'bg-white hover:bg-gray-100 transition-colors cursor-pointer';
        
        if (rowData[supabaseConfig.primaryKeyColumn]) {
            row.dataset.key = rowData[supabaseConfig.primaryKeyColumn];
        }

        // Create row number cell
        const numCell = document.createElement('td');
        numCell.textContent = index + 1;
        numCell.className = 'py-2 px-2 md:px-4 font-bold text-gray-800 whitespace-nowrap cursor-pointer frozen-column frozen-1';
        numCell.setAttribute('data-label', 'No');
        numCell.title = 'Cliquer pour colorer/effacer la ligne';
        
        // Add event listeners for row painting
        numCell.addEventListener('mousedown', (e) => { 
            if (e.button !== 0) return; 
            startRowPaint(row); 
            e.preventDefault(); 
        });
        
        numCell.addEventListener('mouseenter', () => { 
            if (isRowPaintDragging) {
                applyRowPaint(row); 
            } else if (paintMode === 'hover') {
                // Mode survol : colorer automatiquement au passage de la souris
                if (row.dataset.rowColored !== '1') {
                    setRowColor(row, currentRowColor);
                    const key = keyForRow(row);
                    rowColorMap[key] = currentRowColor;
                    persistRowColors();
                }
            }
        });
        

        
        numCell.addEventListener('click', (e) => { 
            e.preventDefault();
            // En mode auto, on colorie/décolore directement au clic
            if (paintMode === 'auto') {
                rowPaintAction = getPaintActionForRow(row);
                applyRowPaint(row);
            } else if (!isRowPaintDragging) {
                // En mode manuel, on utilise l'action sélectionnée
                rowPaintAction = getPaintActionForRow(row);
                applyRowPaint(row);
            }
        });
        
        numCell.addEventListener('touchstart', (e) => { 
            startRowPaint(row); 
            e.preventDefault(); 
        }, { passive: false });
        
        numCell.addEventListener('touchmove', (e) => { 
            const t = e.touches && e.touches[0]; 
            if (!t) return; 
            const el = document.elementFromPoint(t.clientX, t.clientY); 
            const tr = el ? el.closest('#table-body tr') : null; 
            if (tr) applyRowPaint(tr); 
            e.preventDefault(); 
        }, { passive: false });
        
        row.appendChild(numCell);

        // Add delete/selection cell
        row.appendChild(createDeleteCell(row));

        // Add data cells
        const headers = getHeaders();
        headers.forEach(header => {
            const value = rowData[header] || '';
            row.appendChild(createEditableCell(header, value));
        });

        tbody.appendChild(row);
    });
    
    // Re-apply stored row colors after rebuilding the tbody
    try {
        Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
            const k = keyForRow(tr);
            const col = rowColorMap[k];
            if (col) setRowColor(tr, col);
        });
    } catch (_) {}
    
    log('Données du tableau chargées.', 'success');
    appState.localData = collectTableData();
    appState.dataHash = generateDataHash(appState.localData);
    
    // Fix any "to be defined" text and ensure proper placeholder behavior
    setTimeout(() => {
        fixToBeDefinedText();
        ensurePecPlaceholderBehavior();
    }, 100);
    
    // Dispatch event for other components
    document.dispatchEvent(new CustomEvent('table:reloaded'));
    log('table:reloaded dispatched');
    
    // cleanupImagesColumn(); // Removed redundant call
    
    return true;
}

// Row painting functionality
function getPaintActionForRow(row) {
    if (paintMode === 'auto') {
        // En mode auto : si la ligne est colorée, on la décolore, sinon on la colorie
        const isColored = row && (row.dataset.rowColored === '1' || 
                                (row.style.backgroundColor && row.style.backgroundColor !== ''));
        return isColored ? 'clear' : 'color';
    }
    return paintMode;
}

function applyRowPaint(row) {
    if (!row) return;
    
    const key = keyForRow(row);
    if (rowPaintAction === 'color') {
        setRowColor(row, currentRowColor);
        rowColorMap[key] = currentRowColor;
    } else {
        setRowColor(row, null);
        delete rowColorMap[key];
    }
    persistRowColors();
}

function startRowPaint(row) {
    if (paintMode === 'color') {
        rowPaintAction = 'color';
    } else if (paintMode === 'clear') {
        rowPaintAction = 'clear';
    } else { // paintMode === 'auto'
        rowPaintAction = (row && row.dataset.rowColored === '1') ? 'clear' : 'color';
    }
    isRowPaintDragging = true;
    applyRowPaint(row);
}

function endRowPaint() { 
    isRowPaintDragging = false; 
}



// Paint mode management
function updatePaintModeButton() {
    const btn = document.getElementById('paint-mode-toggle');
    if (!btn) return;
    
    if (paintMode === 'auto') { 
        btn.innerHTML = '<i class="fa-solid fa-arrows-rotate w-4 h-4"></i>'; 
        btn.title = 'Mode Auto: Cliquez pour colorer/décolorer (P pour changer)'; 
    } else if (paintMode === 'color') { 
        btn.innerHTML = '<i class="fa-solid fa-paintbrush w-4 h-4"></i>'; 
        btn.title = 'Mode Colorer (P pour changer)'; 
    } else { 
        btn.innerHTML = '<i class="fa-solid fa-eraser w-4 h-4"></i>'; 
        btn.title = 'Mode Effacer (P pour changer)'; 
    }
}

function cyclePaintMode() {
    paintMode = (paintMode === 'auto') ? 'color' : (paintMode === 'color' ? 'clear' : 'auto');
    localStorage.setItem('rowPaintMode', paintMode);
    updatePaintModeButton();
    
    let message = paintMode === 'auto' ? 'Auto' : (paintMode === 'color' ? 'Coloré' : 'Effacer');
    showMessage(message, 'info');
}

// Row color management
function persistRowColors() { 
    try { 
        localStorage.setItem('rowColors', JSON.stringify(rowColorMap)); 
    } catch (_) {} 
}

function setRowColor(tr, color) {
    if (!tr) return;
    
    if (color) { 
        tr.style.setProperty('background-color', color, 'important');
        tr.dataset.rowColored = '1';
        tr.classList.add('row-colored');
        tr.style.setProperty('--row-color', color, 'important');
    } else { 
        tr.style.removeProperty('background-color');
        tr.dataset.rowColored = '0';
        tr.classList.remove('row-colored');
        tr.style.removeProperty('--row-color');
    }
}

function keyForRow(tr) {
    return tr.dataset.key || (Array.from(tr.parentElement.children).indexOf(tr) + 1);
}

function toggleRowColor(tr) {
    const key = keyForRow(tr);
    if (tr.dataset.rowColored === '1') {
        setRowColor(tr, null);
        delete rowColorMap[key];
    } else {
        setRowColor(tr, currentRowColor);
        rowColorMap[key] = currentRowColor;
    }
    persistRowColors();
}

// Filter functionality
function applyColoredFilter() {
    try {
    const tbody = document.getElementById('table-body');
    Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
            const colored = tr.dataset.rowColored === '1' || (tr.style.backgroundColor && tr.style.backgroundColor !== '');
            tr.style.display = (showOnlyColored && !colored) ? 'none' : '';
        });
    } catch (_) {}
}

function updateFilterColoredButton() {
    const btn = document.getElementById('filter-colored-toggle');
    if (!btn) return;
    
    if (showOnlyColored) {
        btn.innerHTML = '<i class="fa-solid fa-eye w-4 h-4"></i>';
        btn.title = 'Afficher toutes les lignes';
        btn.setAttribute('aria-pressed', 'true');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-filter w-4 h-4"></i>';
        btn.title = 'Afficher seulement les lignes colorées';
        btn.setAttribute('aria-pressed', 'false');
    }
}

function toggleColoredFilter() {
    showOnlyColored = !showOnlyColored;
    applyColoredFilter();
    updateFilterColoredButton();
}

// Row color utilities
function clearAllRowColors() {
    try {
        const tbody = document.getElementById('table-body');
        Array.from(tbody.querySelectorAll('tr')).forEach(tr => setRowColor(tr, null));
        rowColorMap = {};
        persistRowColors();
        showMessage('Couleurs des lignes effacées.', 'info');
    } catch (_) {}
}

// Focus management
function captureSimplePos() {
    const active = document.activeElement;
    if (!(active && active.tagName === 'TD' && active.isContentEditable)) return;
    
    const rowEl = active.closest('tr');
    const tbody = document.getElementById('table-body');
    const rowIndex = Array.from(tbody.querySelectorAll('tr')).indexOf(rowEl);
    const cellIndex = Array.from(rowEl.cells).indexOf(active);
    
    if (rowIndex >= 0 && cellIndex >= 0) {
        lastCellPos = { rowIndex, cellIndex };
    }
    
    if (lastCellPos) { 
        log(`captureSimplePos -> row=${lastCellPos.rowIndex}, cell=${lastCellPos.cellIndex}`); 
    }
    
    try { 
        localStorage.setItem('lastCellPos', JSON.stringify(lastCellPos)); 
    } catch (_) {}
}

function captureFocusInfo() {
    const active = document.activeElement;
    if (!(active && active.tagName === 'TD' && active.isContentEditable)) return;
    
    const row = active.closest('tr');
    const tbody = document.getElementById('table-body');
    const rowIndex = Array.from(tbody.querySelectorAll('tr')).indexOf(row);
    const colLabel = active.getAttribute('data-label') || '';
    const rowKey = row ? row.dataset.key || null : null;
    const caret = getCaretOffsetWithin(active);
    
    lastFocusInfo = { rowKey, rowIndex, colLabel, caret };
    
    try { 
        localStorage.setItem('lastFocusInfo', JSON.stringify(lastFocusInfo)); 
    } catch (_) {}
}

function getCaretOffsetWithin(el) {
    try {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        
        const range = sel.getRangeAt(0);
        if (!el.contains(range.startContainer)) return null;
        
        const preRange = range.cloneRange();
        preRange.selectNodeContents(el);
        preRange.setEnd(range.startContainer, range.startOffset);
        
        return preRange.toString().length;
    } catch (_) { 
        return null; 
    }
}

function setCaretAt(el, offset) {
    try {
        el.focus();
        const selection = window.getSelection();
        selection.removeAllRanges();
        const range = document.createRange();
        
        let remaining = (typeof offset === 'number' && offset >= 0) ? offset : null;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let node = walker.nextNode();
        
        if (remaining === null) {
            let lastNode = null;
            while (node) { 
                lastNode = node; 
                node = walker.nextNode(); 
            }
            
            if (lastNode) {
                range.setStart(lastNode, lastNode.textContent.length);
                range.collapse(true);
                selection.addRange(range);
            }
        return; 
    }
        
        while (node) {
            const len = node.textContent.length;
            if (remaining <= len) {
                range.setStart(node, remaining);
                range.collapse(true);
                selection.addRange(range);
                return;
            }
            remaining -= len;
            node = walker.nextNode();
        }
        
        const endNode = el.lastChild;
        if (endNode && endNode.nodeType === Node.TEXT_NODE) {
            range.setStart(endNode, endNode.textContent.length);
        } else {
            range.selectNodeContents(el);
            range.collapse(false);
        }
        selection.addRange(range);
    } catch (_) {}
}

// Focus restoration function to maintain user's editing position
function restoreFocus() {
    try {
        // Try to restore focus using detailed focus info first
        if (lastFocusInfo && lastFocusInfo.rowIndex >= 0 && lastFocusInfo.colLabel) {
            const tbody = document.getElementById('table-body');
            if (tbody) {
                const rows = tbody.querySelectorAll('tr');
                if (rows[lastFocusInfo.rowIndex]) {
                    const targetCell = rows[lastFocusInfo.rowIndex].querySelector(`[data-label="${lastFocusInfo.colLabel}"]`);
                    if (targetCell && targetCell.isContentEditable) {
                        targetCell.focus();
                        
                        // Restore caret position if available
                        if (lastFocusInfo.caret !== null && lastFocusInfo.caret >= 0) {
                            setCaretAt(targetCell, lastFocusInfo.caret);
                        }
                        
                        // Ensure cell is visible
                        ensureCellVisible(targetCell);
                        
                        log(`✅ Focus restored to ${lastFocusInfo.colLabel} at row ${lastFocusInfo.rowIndex + 1}`);
                        return true;
                    }
                }
            }
        }
        
        // Fallback to simple position if detailed info fails
        if (lastCellPos && lastCellPos.rowIndex >= 0 && lastCellPos.cellIndex >= 0) {
            const tbody = document.getElementById('table-body');
            if (tbody) {
                const rows = tbody.querySelectorAll('tr');
                if (rows[lastCellPos.rowIndex]) {
                    const cells = rows[lastCellPos.rowIndex].cells;
                    if (cells[lastCellPos.cellIndex] && cells[lastCellPos.cellIndex].isContentEditable) {
                        cells[lastCellPos.cellIndex].focus();
                        ensureCellVisible(cells[lastCellPos.cellIndex]);
                        
                        log(`✅ Focus restored to cell ${lastCellPos.cellIndex} at row ${lastCellPos.rowIndex + 1}`);
                        return true;
                    }
                }
            }
        }
        
        log('⚠️ Could not restore focus - no valid position information');
        return false;
        
    } catch (error) {
        log('❌ Error restoring focus: ' + error.message, 'error');
        return false;
    }
}

// Mobile detection and support
function isMobile() {
    try { 
        return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent); 
    } catch (_) { 
        return false; 
    }
}

function getScrollContainer() {
    return document.getElementById('table-container');
}

function ensureCellVisible(cell) {
    try {
        if (!cell) return;
        
        const sc = getScrollContainer();
        if (!sc) { 
            cell.scrollIntoView({block: 'center', inline: 'nearest'}); 
            return; 
        }
        
        const vv = window.visualViewport;
        const rect = cell.getBoundingClientRect();
        const viewportHeight = vv ? vv.height : window.innerHeight;
        const bottomSafe = viewportHeight - 64;
        
        if (rect.bottom > bottomSafe || rect.top < 0) {
            const delta = rect.bottom - bottomSafe;
            sc.scrollTop += Math.max(delta, -20);
            try { 
                cell.scrollIntoView({block: 'center', inline: 'nearest'}); 
            } catch (_) {}
        }
    } catch (_) {}
}

function focusCellWithMobileSupport(cell) {
    try {
        try { 
            cell.scrollIntoView({ block: 'center', inline: 'nearest' }); 
        } catch (_) {}
        
        setTimeout(() => {
            try {
                cell.dispatchEvent(new Event('pointerdown', { bubbles: true }));
                cell.dispatchEvent(new Event('mousedown', { bubbles: true }));
                cell.dispatchEvent(new Event('mouseup', { bubbles: true }));
                cell.click();
                
                try { 
                    cell.focus({ preventScroll: true }); 
                } catch (_) { 
                    try { 
                        cell.focus(); 
                    } catch (__) {} 
                }
                
                setCaretAt(cell, null);
                
                try {
                    requestAnimationFrame(() => {
                        setCaretAt(cell, null);
                        requestAnimationFrame(() => { 
                            setCaretAt(cell, null); 
                        });
                    });
                } catch (_) {}
                
                setTimeout(() => { 
                    setCaretAt(cell, null); 
                }, 250);
            } catch (_) {
                try { 
                    cell.focus(); 
                    setCaretAt(cell, null); 
                } catch (__) {}
            }
        }, 350);
        
        ensureCellVisible(cell);
        return true;
    } catch (_) { 
        return false; 
    }
}

function focusCellFromInfo(info) {
    if (!info) return false;
    
    const tbody = document.getElementById('table-body');
    let targetRow = null;
    
    if (info.rowKey) {
        targetRow = Array.from(tbody.querySelectorAll('tr')).find(tr => tr.dataset.key === String(info.rowKey));
    }
    
    if (!targetRow) {
        const rows = tbody.querySelectorAll('tr');
        targetRow = rows[info.rowIndex] || null;
    }
    
    if (!targetRow) return false;
    
    const cells = Array.from(targetRow.querySelectorAll('td'));
    const editableCells = cells.slice(2);
    const cell = editableCells.find(td => (td.getAttribute('data-label') || '') === info.colLabel) || null;
    
    if (!cell) return false;
    
    if (isMobile()) {
        return focusCellWithMobileSupport(cell);
    }
    
    try { 
        cell.scrollIntoView({ block: 'center', inline: 'nearest' }); 
    } catch (_) {}
    
    let placed = false;
    try { 
        setCaretAt(cell, null); 
        placed = true; 
    } catch (_) {}
    
    if (!placed) { 
        setTimeout(() => { 
            try { 
                setCaretAt(cell, null); 
            } catch (_) {} 
        }, 50); 
    }
    
    try {
        requestAnimationFrame(() => {
            setCaretAt(cell, null);
            requestAnimationFrame(() => { 
                setCaretAt(cell, null); 
            });
        });
    } catch (_) {}
    
    if (document.activeElement !== cell) { 
        try { 
            cell.focus(); 
        } catch (_) {} 
    }
    
    return true;
}

function focusCellByPos(pos) {
    try {
        if (!pos) return false;
        
        const tbody = document.getElementById('table-body');
        const row = tbody.querySelectorAll('tr')[pos.rowIndex];
        if (!row) return false;
        
        const cell = row.cells[pos.cellIndex];
        if (!cell) return false;
        
        log(`focusCellByPos -> trying row=${pos.rowIndex}, cell=${pos.cellIndex}`);
        
        if (isMobile()) {
            return focusCellWithMobileSupport(cell);
        }
        
        setCaretAt(cell, null);
        
        try {
            cell.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
            cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            cell.click();
        } catch (_) {}
        
        log(`focusCellByPos -> active=${document.activeElement === cell}`);
        
        try {
            requestAnimationFrame(() => {
                setCaretAt(cell, null);
                requestAnimationFrame(() => { 
                    setCaretAt(cell, null); 
                });
            });
        } catch (_) {}
        
        return document.activeElement === cell;
    } catch (_) { 
        return false; 
    }
}

// Data collection and management
function saveStateToHistory() { 
    if (historyDebounceTimeout) clearTimeout(historyDebounceTimeout); 
    
    historyDebounceTimeout = setTimeout(() => { 
        const s = collectTableData(); 
        const last = history[history.length - 1]; 
        
        if (!last || generateDataHash(s) !== generateDataHash(last)) { 
            history.push(s); 
            if (history.length > 10) history.shift(); 
            updateUndoButtonState(); 
            log('État de l\'historique enregistré.'); 
        } 
    }, 500); 
}

function generateDataHash(data) { 
    return JSON.stringify(data.rows ? data.rows.map(r => ({...r, [supabaseConfig.primaryKeyColumn]: undefined})) : data.map(r => ({...r, [supabaseConfig.primaryKeyColumn]: undefined}))).split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0).toString(16); 
}

// Undo functionality
function undo() {
    if (history.length > 1) {
        history.pop(); 
        const prev = history[history.length - 1]; 
        loadTableData(prev.rows || prev); 
        updateUndoButtonState(); 
        log('Annulation effectuée.'); 
    } 
}

function updateUndoButtonState() { 
    document.getElementById('undo-button').disabled = history.length <= 1; 
}

// Zoom functionality
function updateZoomDisplay() {
    const btn = document.getElementById('zoom-display');
    if (!btn) return;
    
    const pct = Math.round(zoomFactor * 100);
    btn.textContent = pct + '%';
    btn.title = `Réinitialiser à 100% (actuel : ${pct}%)`;
}

function applyZoom() {
    try {
        const clamped = Math.max(0.3, Math.min(2, zoomFactor));
        zoomFactor = clamped;
        document.documentElement.style.fontSize = (16 * zoomFactor) + 'px';
        localStorage.setItem('zoomFactor', String(zoomFactor));
        updateZoomDisplay();
    } catch (_) {}
}

function zoomIn() { 
    zoomFactor += 0.1; 
    applyZoom(); 
}

function zoomOut() { 
    zoomFactor -= 0.1; 
    applyZoom(); 
}

function zoomReset() { 
    zoomFactor = 1; 
    applyZoom(); 
}

function updateZoom() {
    applyZoom();
}

// Export functions
function downloadExcel() {
    try {
        log('📊 Exporting to Excel...');
        showMessage('Export Excel en cours...', 'info');
        
        const tableData = collectTableData();
        if (tableData.length === 0) {
            showMessage('Aucune donnée à exporter', 'warning');
            return;
        }
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(tableData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'StaffTable');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `staff_table_${timestamp}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        showMessage('Export Excel réussi', 'success');
        log('✅ Excel export completed');
        
    } catch (error) {
        log('❌ Excel export failed: ' + error.message, 'error');
        showMessage('Erreur export Excel', 'error');
    }
}

function downloadPDF() {
    try {
        log('📄 Exporting to PDF...');
        showMessage('Export PDF en cours...', 'info');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Get table data
        const tableData = collectTableData();
        if (tableData.length === 0) {
            showMessage('Aucune donnée à exporter', 'warning');
            return;
        }
        
        // Prepare data for PDF
        const headers = getHeaders();
        const rows = tableData.map(row => 
            headers.map(header => row[header] || '')
        );
        
        // Add title
        doc.setFontSize(16);
        doc.text('Tableau de Staff', 14, 22);
        
        // Add table
        doc.autoTable({
            head: [headers],
            body: rows,
            startY: 30,
            styles: {
                fontSize: 8,
                cellPadding: 2
            }
        });
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `staff_table_${timestamp}.pdf`;
        
        // Save file
        doc.save(filename);
        
        showMessage('Export PDF réussi', 'success');
        log('✅ PDF export completed');
        
    } catch (error) {
        log('❌ PDF export failed: ' + error.message, 'error');
        showMessage('Erreur export PDF', 'error');
    }
}

function downloadImage() {
    try {
        log('🖼️ Exporting to image...');
        showMessage('Export image en cours...', 'info');
        
        const table = document.getElementById('data-table');
        if (!table) {
            showMessage('Tableau non trouvé', 'error');
            return;
        }
        
        html2canvas(table, {
            scale: 2,
            useCORS: true,
            allowTaint: true
        }).then(canvas => {
            // Convert to blob
            canvas.toBlob(blob => {
                // Create download link
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                // Generate filename with timestamp
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                a.download = `staff_table_${timestamp}.png`;
                
                // Trigger download
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Cleanup
                URL.revokeObjectURL(url);
                
        showMessage('Export image réussi', 'success');
                log('✅ Image export completed');
            }, 'image/png');
        });
        
    } catch (error) {
        log('❌ Image export failed: ' + error.message, 'error');
        showMessage('Erreur export image', 'error');
    }
}

function importExcelFromFile(file) {
    try {
        if (!file) {
            showMessage('Aucun fichier sélectionné', 'info');
            return;
        }
        
        log('📥 Importing Excel file...');
        showMessage('Import Excel en cours...', 'info');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
                
                // Get first sheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
                
                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length < 2) {
                    showMessage('Fichier Excel vide ou invalide', 'warning');
                    return;
                }
                
                // Process data
                const headers = jsonData[0];
                
                // Define columns to exclude during import
                const excludedColumns = ['No', 'Action', 'Date de saisie', 'supprimer'];
                
                const rows = jsonData.slice(1).map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        // Skip excluded columns
                        if (header && row[index] !== undefined && !excludedColumns.includes(header)) {
                            obj[header] = row[index];
                        }
                    });
                    return obj;
                });
                
                // Filter rows where Nom_Prénom is filled (not empty)
                const filteredRows = rows.filter(row => {
                    const nomPrenom = row['Nom_Prénom'] || row['Nom_Prenom'] || row['nom_prénom'] || row['nom_prenom'];
                    return nomPrenom && nomPrenom.toString().trim() !== '';
                });
                
                const totalRows = rows.length;
                const validRows = filteredRows.length;
                const skippedRows = totalRows - validRows;
                
                // Load data into table
                if (filteredRows.length > 0) {
                    loadDataIntoTable(filteredRows);
                    if (skippedRows > 0) {
                        showMessage(`Import réussi: ${validRows} ligne(s) importée(s), ${skippedRows} ligne(s) ignorée(s) (Nom_Prénom vide)`, 'success');
                    } else {
                        showMessage(`Import réussi: ${validRows} ligne(s)`, 'success');
                    }
                    log(`✅ Excel import completed: ${validRows} valid rows, ${skippedRows} skipped`);
                } else {
                    showMessage('Aucune ligne avec Nom_Prénom rempli trouvée', 'warning');
                }
                
            } catch (error) {
                log('❌ Excel processing failed: ' + error.message, 'error');
                showMessage('Erreur traitement Excel', 'error');
            }
        };
        
        reader.readAsArrayBuffer(file);
        
    } catch (error) {
        log('❌ Excel import failed: ' + error.message, 'error');
        showMessage('Erreur import Excel', 'error');
    }
}

// Manual save function
async function saveManually() {
    try {
        // Capture current focus before manual save
        captureFocusInfo();
        captureSimplePos();
        
        log('💾 Manual save requested...');
        updateSyncIndicator('syncing', 'Sauvegarde manuelle...');
        showMessage('Sauvegarde manuelle en cours...', 'info');
        
        const tableData = collectTableData();
        if (tableData.length === 0) {
            showMessage('Aucune donnée à sauvegarder', 'warning');
            updateSyncIndicator('error', 'Non synchronisé');
            return;
        }
        
        const result = await syncToSupabaseLocal(tableData, true);
        log('✅ Manual save successful:', result);
        updateSyncIndicator('synced', 'Synchronisé');
        showMessage('Sauvegarde manuelle réussie', 'success');
        
        // Update local state
        isDirty = false;
        appState.localData = tableData;
        
        // Restore focus after successful manual save
        setTimeout(() => {
            restoreFocus();
        }, 100);
        
    } catch (error) {
        log('❌ Manual save failed: ' + error.message, 'error');
        updateSyncIndicator('error', 'Non synchronisé');
        showMessage('Erreur de sauvegarde manuelle', 'error');
        
        // Restore focus even on error
        setTimeout(() => {
            restoreFocus();
        }, 100);
    }
}





// Enhanced error handling for Supabase operations
async function safeSupabaseOperation(operation, fallbackValue = null) {
    try {
        return await operation();
    } catch (error) {
        log('❌ Supabase operation failed: ' + error.message);
        showMessage('Erreur de connexion Supabase', 'error');
        return fallbackValue;
    }
}

// Simple session management using sessionStorage (clears when browser closes)
function saveLoginSession() {
    try {
        sessionStorage.setItem('staffTableLoggedIn', 'true');
        log('✅ Login session saved');
    } catch (error) {
        log('❌ Error saving login session: ' + error.message, 'error');
    }
}

function loadLoginSession() {
    try {
        const isLoggedIn = sessionStorage.getItem('staffTableLoggedIn');
        if (isLoggedIn === 'true') {
            log('✅ Valid login session found');
            return { isLoggedIn: true };
        }
        return null;
    } catch (error) {
        log('❌ Error loading login session: ' + error.message, 'error');
        return null;
    }
}

function clearLoginSession() {
    try {
        // Clean up real-time subscription
        cleanupRealtimeSubscription();
        
        sessionStorage.removeItem('staffTableLoggedIn');
        log('✅ Login session cleared');
    } catch (error) {
        log('❌ Error clearing login session: ' + error.message, 'error');
    }
}

// Password check
function checkPassword() {
    const password = document.getElementById('password-input').value;
    const errorMessage = document.getElementById('error-message');
    
    if (password === APP_CONFIG.password) {
        // Save login session
        saveLoginSession();
        
        // Hide login, show table
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('table-container').classList.remove('hidden');
        appState.isLoggedIn = true;
        
        // Initialize the application
        initializeApp();
        
    } else {
        // Show incorrect password in plain text
        const passwordInput = document.getElementById('password-input');
        passwordInput.type = 'text';
        passwordInput.style.color = 'red';
        passwordInput.style.fontWeight = 'bold';
        
        errorMessage.textContent = 'Mot de passe incorrect';
        errorMessage.classList.remove('hidden');
        
        // Reset password input after 3 seconds
        setTimeout(() => {
            passwordInput.type = 'password';
            passwordInput.style.color = '';
            passwordInput.style.fontWeight = '';
            passwordInput.value = '';
            errorMessage.classList.add('hidden');
        }, 3000);
    }
}

// Handle Enter key press in password input
function handlePasswordKeyPress(event) {
    if (event.key === 'Enter') {
        checkPassword();
    }
}

// Beforeunload warning for unsaved changes
window.addEventListener('beforeunload', function(e) {
    // Clean up real-time subscription
    cleanupRealtimeSubscription();
    
    if (isDirty) {
        e.preventDefault();
        e.returnValue = '⚠️ ATTENTION: Vous avez des modifications non sauvegardées !\n\nCliquez sur "Annuler" pour rester sur la page et sauvegarder vos données.\n\nCliquez sur "Quitter" pour perdre vos modifications.';
        return e.returnValue;
    }
});

// Also warn when navigating away (for single-page apps)
window.addEventListener('popstate', function(e) {
    if (isDirty) {
        if (!confirm('⚠️ Vous avez des modifications non sauvegardées !\n\nVoulez-vous vraiment quitter ? Vos données seront perdues.')) {
            e.preventDefault();
            history.pushState(null, null, window.location.href);
        }
    }
});

// Toggle password visibility
document.addEventListener('DOMContentLoaded', function() {
    
    // TOUJOURS afficher le formulaire de connexion à la page d'accueil
    // Ne pas restaurer automatiquement la session
    log('🔐 Affichage du formulaire de connexion...');
    
    // Show the login container when the page loads
    const loginContainer = document.getElementById('login-container');
    if (loginContainer) {
        loginContainer.classList.remove('hidden');
    } else {
        log('❌ Login container not found');
    }
    
    const togglePassword = document.getElementById('toggle-password');
    const password = document.getElementById('password-input');
    
    if (togglePassword && password) {
        togglePassword.addEventListener('change', function() {
            password.type = this.checked ? 'text' : 'password';
        });
        
        // Focus on password input for better UX
        password.focus();
        
    } else {
        log('❌ Password elements not found');
    }
    
});

// Initialize application
async function initializeApp() {
    try {
        log('🚀 Initializing application...');
        
        // Load data from Supabase
        const data = await loadFromSupabase();
        appState.localData = data;
        
        // Load images from localStorage
            // Gestion des images supprimée - galerie simplifiée gérée séparément
        
        // Load row colors
        const savedRowColors = localStorage.getItem('rowColorMap');
        if (savedRowColors) {
            rowColorMap = JSON.parse(savedRowColors);
        }
        
        // Load real-time sync preference
        const savedRealtimeEnabled = localStorage.getItem('realtimeSyncEnabled');
        if (savedRealtimeEnabled !== null) {
            isRealtimeEnabled = savedRealtimeEnabled === 'true';
        }
        
        // Load zoom factor
        updateZoom();
        
        // Start autosave
        startPeriodicSync();
        
        // Start clock and update immediately
        updateClock();
        setInterval(updateClock, 1000);
        

        
        // Initialize sync indicator as synced (green) - data already loaded from Supabase
        updateSyncIndicator('synced', 'Synchronisé');
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();

        // Update UI for paint mode and color filter buttons
        updatePaintModeButton();
        updateFilterColoredButton();
        
        // Load data into table or add initial row
        if (data && data.length > 0) {
            loadDataIntoTable(data);
        } else {
            addRow();
        }
        
        // Fix PEC placeholders after data is loaded
        setTimeout(() => {
            fixPecPlaceholders();
        }, 200);
        
        // Setup select-all checkbox functionality
        setTimeout(() => {
            setupSelectAllCheckbox();
        }, 300);
        
        // cleanupImagesColumn(); // Removed redundant call
        
        // Setup real-time synchronization
        await setupRealtimeSubscription();
        
        log('✅ Application initialization complete');
        showMessage('Application initialisée avec succès', 'success');
        
    } catch (error) {
        log('❌ Application initialization error:', error);
        showMessage('Erreur d\'initialisation', 'error');
        
        // Even if Supabase fails, show the table with initial row

        addRow();
    }
}

// Utility functions

function updateClock() {
    const currentTimeElement = document.getElementById('current-time');
    if (currentTimeElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        currentTimeElement.textContent = timeString;
    }
}



// Setup session extension on user activity
function setupSessionExtension() {
    // Extend session on various user activities
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    let activityTimeout;
    
    const handleActivity = () => {
        // Clear existing timeout
        if (activityTimeout) {
            clearTimeout(activityTimeout);
        }
        
        // Set new timeout to extend session after 5 minutes of inactivity
        activityTimeout = setTimeout(() => {
            extendSession();
        }, 5 * 60 * 1000); // 5 minutes
    };
    
    // Add event listeners for user activity
    activityEvents.forEach(event => {
        document.addEventListener(event, handleActivity, { passive: true });
    });
    
    log('✅ Session extension setup complete');
}

// Storage bucket creation
async function createStorageBucketLocal() {
    try {
        await createStorageBucket();
        showMessage('Bucket de stockage créé', 'success');
    } catch (error) {
        console.error('❌ Storage bucket creation error:', error);
        showMessage('Erreur création bucket', 'error');
    }
}

// Make functions globally available
window.checkPassword = checkPassword;
window.saveManually = saveManually;
window.undo = undo;
window.addRow = addRow;
window.downloadExcel = downloadExcel;
window.downloadPDF = downloadPDF;
window.downloadImage = downloadImage;
window.importExcelFromFile = importExcelFromFile;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.zoomReset = zoomReset;
window.clearAllRowColors = clearAllRowColors;
window.cyclePaintMode = cyclePaintMode;
window.toggleColoredFilter = toggleColoredFilter;
window.createStorageBucket = createStorageBucketLocal;
window.openImageGallery = openImageGallery;




window.collectTableData = collectTableData;
window.syncToSupabase = syncToSupabaseLocal;
window.showKeyboardShortcuts = showKeyboardShortcuts;
window.toggleKeyboardShortcuts = toggleKeyboardShortcuts;
window.handlePasswordKeyPress = handlePasswordKeyPress;
window.updateCurrentRowColor = updateCurrentRowColor;
window.cleanupImagesColumn = cleanupImagesColumn;
window.migrateDataStructure = migrateDataStructure;
window.testPecPlaceholderFunctionality = testPecPlaceholderFunctionality;
window.fixToBeDefinedText = fixToBeDefinedText;
window.ensurePecPlaceholderBehavior = ensurePecPlaceholderBehavior;
window.fixPecPlaceholders = fixPecPlaceholders;
window.setupSelectAllCheckbox = setupSelectAllCheckbox;
window.updateSelectAllState = updateSelectAllState;
window.clearAllSelections = clearAllSelections;
window.testSelectAllFunctionality = testSelectAllFunctionality;
window.testPlaceholderBoldness = testPlaceholderBoldness;
window.testConfirmationModal = testConfirmationModal;
window.setupRealtimeSubscription = setupRealtimeSubscription;
window.cleanupRealtimeSubscription = cleanupRealtimeSubscription;
window.showRealtimeUpdateNotification = showRealtimeUpdateNotification;



// Supabase sync function
async function syncToSupabaseLocal(data, isManualSave = false) {
    try {
        if (!data || data.length === 0) {
            log('⚠️ No data to sync');
            return [];
        }

        log('🔄 Syncing data to Supabase...');
        
        // Store timestamp before sync to prevent infinite loops
        lastSyncTimestamp = new Date().toISOString();
        
        const result = await syncToSupabase(data, isManualSave);
        
        log('✅ Data synchronized to Supabase:', result?.length || 0, 'rows');
        return result;
    } catch (error) {
        log('❌ Error syncing to Supabase:', error.message);
        throw error;
    }
}

// Keyboard shortcuts and navigation
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        const active = document.activeElement;
        const inCell = active && active.tagName === 'TD' && active.contentEditable === 'true';
        const inFormField = active && (
            active.tagName === 'INPUT' || 
            active.tagName === 'TEXTAREA' || 
            active.tagName === 'SELECT' || 
            active.contentEditable === 'true'
        );
        
        // Navigation dans le tableau
        if (inCell) {
            const row = active.parentElement;
            const idx = Array.from(row.cells).indexOf(active);
            let next = null;
            
            if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
                next = row.cells[idx + 1] || (row.nextElementSibling && row.nextElementSibling.cells[2]);
            } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
                next = row.cells[idx - 1];
                if ((!next || idx === 2) && row.previousElementSibling) {
                    next = row.previousElementSibling.cells[row.previousElementSibling.cells.length - 1];
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const nx = row.nextElementSibling;
                if (nx) {
                    next = nx.cells[idx];
                } else {
                    addRow();
                    setTimeout(() => {
                        const nr = document.querySelector('#table-body tr:last-child');
                        if (nr && nr.cells.length > idx) nr.cells[idx].focus();
                    }, 0);
                }
            } else if (e.key === 'ArrowDown') {
                const nx = row.nextElementSibling;
                if (nx) {
                    next = nx.cells[idx];
                } else {
                    addRow();
                    setTimeout(() => {
                        const nr = document.querySelector('#table-body tr:last-child');
                        if (nr && nr.cells.length > idx) nr.cells[idx].focus();
                    }, 0);
                }
            } else if (e.key === 'ArrowUp') {
                const pv = row.previousElementSibling;
                if (pv) {
                    next = pv.cells[idx];
                }
            }
            
            if (next) {
                e.preventDefault();
                next.focus();
            }
        }
        
        // Raccourcis clavier
        if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'p' || e.key === 'P') && !inFormField) {
            // P: Cycle paint mode
            e.preventDefault();
            cyclePaintMode();
            return;
        }
        
        if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D') && inCell) {
            // Ctrl+D: Dupliquer la ligne
            e.preventDefault();
            const row = active.closest('tr');
            if (row) {
                const clone = row.cloneNode(true);
                delete clone.dataset.key;
                clone.style.backgroundColor = '';
                
                // Corriger le numéro de ligne
                if (clone.cells[0]) {
                    clone.cells[0].textContent = document.querySelectorAll('#table-body tr').length + 1;
                }
                
                // Réattacher les gestionnaires d'événements
                Array.from(clone.cells).forEach((c, i) => {
                    if (i <= 1) return;
                    c.addEventListener('input', () => { 
                        saveStateToHistory(); 
                        markEdited(); 
                    });
                });
                
                row.after(clone);
                persistRowColors();
                saveStateToHistory(); 
                markEdited();
                showMessage('Ligne dupliquée', 'success');
            }
        }
        
        if ((e.ctrlKey || e.metaKey) && (e.key === 'Backspace' || e.key === 'Delete') && inCell) {
            // Ctrl+Backspace/Delete: Supprimer la ligne
            e.preventDefault();
            const row = active.closest('tr');
            if (row) {
                deleteRows([row]).catch(error => {
                    log('❌ Error deleting row: ' + error.message, 'error');
                });
            }
        }
        
        if ((e.ctrlKey || e.metaKey) && e.code === 'Space' && inCell) {
            // Ctrl+Espace: Effacer cellule PEC et restaurer placeholder
            e.preventDefault();
            const label = active.getAttribute('data-label');
            if (label === 'PEC finale' || label === 'PEC initiale') {
                active.textContent = '';
                active.classList.add('placeholder-text');
                active.textContent = 'À définir';
                showMessage('Placeholder restauré', 'info');
            }
        }
        
        if (e.key === 'Escape') {
            // Échap: Sortir du mode édition
            if (inCell) {
                active.blur();
            }
        }
    });
}



// Simple sync indicator management
function updateSyncIndicator(status, message = '') {
    const icon = document.getElementById('sync-status-icon');
    const text = document.getElementById('sync-status-text');
    
    if (!icon || !text) return;
    
    // Remove all status classes
    icon.classList.remove('syncing', 'synced', 'error', 'pending');
    
    // Add appropriate status class
    icon.classList.add(status);
    
    // Update text
    text.textContent = message || getStatusMessage(status);
}

function getStatusMessage(status) {
    switch (status) {
        case 'syncing': return 'Synchronisation...';
        case 'synced': return 'Synchronisé';
        case 'error': return 'Non synchronisé';
        case 'pending': return 'En attente...';
        default: return 'Non synchronisé';
    }
}

// Utility confirmation function
function promptKeyConfirm(message, onConfirm) {
    showConfirmationModal(message, onConfirm);
}

// Show keyboard shortcuts help
function showKeyboardShortcuts() {
    const shortcuts = [
        { key: 'P', description: 'Changer le mode de peinture' },
        { key: 'Ctrl+D', description: 'Dupliquer la ligne actuelle' },
        { key: 'Ctrl+Backspace', description: 'Supprimer la ligne actuelle' },
        { key: 'Ctrl+Delete', description: 'Supprimer la ligne actuelle' },
        { key: 'Flèches', description: 'Navigation entre cellules' },
        { key: 'Tab', description: 'Cellule suivante' },
        { key: 'Shift+Tab', description: 'Cellule précédente' },
        { key: 'Entrée', description: 'Ligne suivante (crée une nouvelle ligne si nécessaire)' },
        { key: 'Échap', description: 'Sortir du mode édition' }
    ];
    
    let message = '🎯 **Raccourcis Clavier Disponibles:**\n\n';
    shortcuts.forEach(shortcut => {
        message += `**${shortcut.key}** - ${shortcut.description}\n`;
    });
    
    message += '\n💡 **Conseil:** Cliquez sur une cellule pour l\'activer, puis utilisez les raccourcis !';
    
    showMessage(message, 'info');
}

// Toggle keyboard shortcuts modal
function toggleKeyboardShortcuts() {
    const modal = document.getElementById('keyboard-shortcuts-modal');
    const shortcutsList = document.getElementById('shortcuts-list');
    
    if (modal.classList.contains('hidden')) {
        // Show modal and populate shortcuts
        populateShortcutsList();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        // Hide modal
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Populate shortcuts list in modal
function populateShortcutsList() {
    const shortcutsList = document.getElementById('shortcuts-list');
    
    const shortcuts = [
        { key: 'P', description: 'Changer le mode de peinture', icon: 'fa-palette' },
        { key: 'Ctrl+D', description: 'Dupliquer la ligne actuelle', icon: 'fa-copy' },
        { key: 'Ctrl+Backspace', description: 'Supprimer la ligne actuelle', icon: 'fa-trash' },
        { key: 'Ctrl+Delete', description: 'Supprimer la ligne actuelle', icon: 'fa-trash' },
        { key: 'Flèches', description: 'Navigation entre cellules', icon: 'fa-arrows-alt' },
        { key: 'Tab', description: 'Cellule suivante', icon: 'fa-arrow-right' },
        { key: 'Shift+Tab', description: 'Cellule précédente', icon: 'fa-arrow-left' },
        { key: 'Entrée', description: 'Ligne suivante (crée une nouvelle ligne si nécessaire)', icon: 'fa-arrow-down' },
        { key: 'Échap', description: 'Sortir du mode édition', icon: 'fa-times' },
        { key: 'Ctrl+S', description: 'Sauvegarder manuellement', icon: 'fa-save' },
        { key: 'Ctrl+Z', description: 'Annuler la dernière action', icon: 'fa-undo' },
        { key: 'Ctrl+Y', description: 'Rétablir l\'action annulée', icon: 'fa-redo' },
        { key: 'Ctrl+F', description: 'Rechercher dans le tableau', icon: 'fa-search' },
        { key: 'Ctrl+A', description: 'Sélectionner toutes les lignes', icon: 'fa-check-square' },
        { key: 'Espace', description: 'Basculer la sélection de ligne', icon: 'fa-square' },
        { key: 'Ctrl+Espace', description: 'Effacer cellule PEC et restaurer placeholder', icon: 'fa-eraser' },
        { key: 'F1', description: 'Afficher cette aide', icon: 'fa-question-circle' }
    ];
    
    shortcutsList.innerHTML = '';
    
    shortcuts.forEach(shortcut => {
        const shortcutElement = document.createElement('div');
        shortcutElement.className = 'bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors';
        shortcutElement.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="flex-shrink-0">
                    <i class="fa-solid ${shortcut.icon} text-blue-600 text-lg"></i>
                </div>
                <div class="flex-grow">
                    <div class="flex items-center gap-2 mb-1">
                        <kbd class="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-mono rounded border border-blue-200">${shortcut.key}</kbd>
                        <span class="text-gray-800 font-medium">${shortcut.description}</span>
                    </div>
                </div>
            </div>
        `;
        shortcutsList.appendChild(shortcutElement);
    });
}





// Row management functions with batch deletion
let deletionQueue = [];
let deletionTimeout = null;

async function deleteRows(rows) {
    if (!rows || rows.length === 0) return;
    
    try {
        // Collect the row numbers (No) BEFORE deleting from DOM
        const rowNumbers = [];
        rows.forEach(row => {
            const noCell = row.querySelector('td:first-child');
            if (noCell && noCell.textContent && noCell.textContent.trim() !== '') {
                const rowNo = parseInt(noCell.textContent.trim());
                if (!isNaN(rowNo)) {
                    rowNumbers.push(rowNo);
                    log(`📝 Row ${rowNo} marked for deletion`);
                }
            }
        });
        
        log(`🗑️ Collected ${rowNumbers.length} row numbers for deletion: [${rowNumbers.join(', ')}]`);
        
        // Delete rows from DOM immediately
        rows.forEach(row => {
            if (row && row.parentNode) {
                row.remove();
            }
        });
        
        // DON'T renumber rows yet - wait for Supabase confirmation
        // This prevents the numbering conflict that causes deleted rows to reappear
        
        // Rebuild color map after deletions (but keep original numbering)
        rowColorMap = {};
        Array.from(document.querySelectorAll('#table-body tr')).forEach(tr => {
            const k = keyForRow(tr);
            const c = tr.style.backgroundColor;
            if (c && c !== '') rowColorMap[k] = c;
        });
        
        persistRowColors();
        saveStateToHistory();
        markEdited();
        
        // Update select-all checkbox state after deletion
        setTimeout(() => {
            updateSelectAllState();
            updateRowCounter();
        }, 100);
        
        // Add row numbers to deletion queue
        if (rowNumbers.length > 0) {
            deletionQueue.push(...rowNumbers);
            
            // Clear existing timeout
            if (deletionTimeout) {
                clearTimeout(deletionTimeout);
            }
            
            // Set new timeout for batch deletion
            deletionTimeout = setTimeout(async () => {
                await processBatchDeletion();
            }, 1000); // Reduced to 1 second for faster sync
            
            showMessage(`${rows.length} ligne(s) supprimée(s) - Synchronisation dans 1s...`, 'info');
            log(`⏳ Added ${rowNumbers.length} rows to deletion queue. Total in queue: ${deletionQueue.length}`);
        } else {
            showMessage(`${rows.length} ligne(s) supprimée(s)`, 'success');
            log(`⚠️ No valid row numbers collected for deletion`);
        }
        
    } catch (error) {
        log('❌ Error deleting rows: ' + error.message, 'error');
        showMessage('Erreur lors de la suppression', 'error');
    }
}

// Safely renumber table rows after Supabase confirms deletions
function renumberTableRows() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    
    log('🔄 Renumbering table rows after confirmed deletions...');
    
    Array.from(tbody.querySelectorAll('tr')).forEach((tr, idx) => {
        const noCell = tr.querySelector('td:first-child');
        if (noCell) {
            noCell.textContent = idx + 1;
        }
        tr.classList.remove('selected-row');
    });
    
    // Update select-all checkbox state after renumbering
    updateSelectAllState();
    
    log('✅ Table rows renumbered successfully');
}

// Process batch deletion to Supabase
async function processBatchDeletion() {
    if (deletionQueue.length === 0) {
        log('⚠️ No rows in deletion queue to process');
        return;
    }
    
    const rowsToDelete = [...deletionQueue];
    deletionQueue = []; // Clear queue
    
    log(`🚀 Starting batch deletion of ${rowsToDelete.length} rows: [${rowsToDelete.join(', ')}]`);
    
    try {
        updateSyncIndicator('syncing', `Suppression de ${rowsToDelete.length} ligne(s) de Supabase...`);
        
        // Call the imported deleteFromSupabase function
        log(`📡 Calling deleteFromSupabase with keys: [${rowsToDelete.join(', ')}]`);
        await deleteFromSupabase(rowsToDelete);
        
        // NOW it's safe to renumber rows since Supabase confirmed the deletion
        renumberTableRows();
        
        updateSyncIndicator('synced', 'Lignes supprimées de Supabase');
        showMessage(`${rowsToDelete.length} ligne(s) supprimée(s) de Supabase`, 'success');
        log(`✅ Batch deletion successful: ${rowsToDelete.length} rows deleted from Supabase`);
        
    } catch (error) {
        log('❌ Error in batch deletion from Supabase: ' + error.message, 'error');
        log('❌ Error details: ' + JSON.stringify(error, null, 2));
        updateSyncIndicator('error', 'Erreur suppression Supabase');
        showMessage('Erreur lors de la suppression de Supabase', 'error');
        
        // Re-add failed deletions to queue for retry
        deletionQueue.push(...rowsToDelete);
        log(`🔄 Re-added ${rowsToDelete.length} failed deletions to queue for retry`);
    }
}

function showConfirmationModal(message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    const messageEl = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    
    if (!modal || !messageEl || !confirmBtn || !cancelBtn) {
        console.error('❌ Modal elements not found');
        return;
    }
    
    console.log('🔧 Opening confirmation modal:', message);
    
    messageEl.textContent = message;
    modal.classList.remove('hidden');
    
    // Focus on the confirm button for better UX
    confirmBtn.focus();
    
    // Remove existing event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    // Function to confirm and close modal
    const confirmAction = () => {
        console.log('✅ Confirmation confirmed via Enter key or button click');
        modal.classList.add('hidden');
        if (onConfirm) onConfirm();
    };
    
    // Function to cancel and close modal
    const cancelAction = () => {
        console.log('❌ Confirmation cancelled via Escape key or button click');
        modal.classList.add('hidden');
    };
    
    // Add new event listeners
    newConfirmBtn.addEventListener('click', confirmAction);
    newCancelBtn.addEventListener('click', cancelAction);
    
    // Add keyboard event listeners to the document for global key handling
    const handleKeyDown = (e) => {
        console.log('🎹 Key pressed:', e.key);
        
        if (e.key === 'Enter') {
            console.log('⏎ Enter key pressed - confirming action');
            e.preventDefault();
            e.stopPropagation();
            confirmAction();
        } else if (e.key === 'Escape') {
            console.log('⎋ Escape key pressed - cancelling action');
            e.preventDefault();
            e.stopPropagation();
            cancelAction();
        }
    };
    
    // Add keyboard listener to the document (global)
    document.addEventListener('keydown', handleKeyDown);
    
    // Also add to the modal itself
    modal.addEventListener('keydown', handleKeyDown);
    
    // Clean up event listeners when modal is closed
    const cleanup = () => {
        console.log('🧹 Cleaning up modal event listeners');
        document.removeEventListener('keydown', handleKeyDown);
        modal.removeEventListener('keydown', handleKeyDown);
        newConfirmBtn.removeEventListener('click', confirmAction);
        newCancelBtn.removeEventListener('click', cancelAction);
    };
    
    // Add cleanup to both buttons
    newConfirmBtn.addEventListener('click', cleanup);
    newCancelBtn.addEventListener('click', cleanup);
    
    // Also cleanup when modal is hidden
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (modal.classList.contains('hidden')) {
                    cleanup();
                    observer.disconnect();
                }
            }
        });
    });
    
    observer.observe(modal, { attributes: true });
    
    console.log('✅ Modal opened with keyboard support (Enter = Confirm, Escape = Cancel)');
}

// Test function for confirmation modal keyboard functionality
function testConfirmationModal() {
    console.log('🧪 Testing confirmation modal keyboard functionality...');
    
    // Test the modal with a simple confirmation
    showConfirmationModal('Test de confirmation - Appuyez sur Entrée pour confirmer', () => {
        console.log('✅ Test confirmation successful!');
        showMessage('Test de confirmation réussi !', 'success');
    });
    
    console.log('📋 Modal de test ouverte. Utilisez :');
    console.log('   - Entrée pour confirmer');
    console.log('   - Échap pour annuler');
    console.log('   - Ou cliquez sur les boutons');
}

// Image gallery functions
function openImageGallery() {
    // Ouvrir la galerie simplifiée dans un nouvel onglet/fenêtre
    window.open('simple-gallery.html', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
}

























function updateCurrentRowColor(newColor) {
    currentRowColor = newColor;
    localStorage.setItem('rowColor', newColor);
    log(`Couleur de ligne actuelle mise à jour: ${newColor}`, 'info');
}

// Clean up existing data by removing Images column
function cleanupImagesColumn() {
    // Only run this once per session to avoid unnecessary processing
    if (window.imagesColumnCleanedUp) {
        return;
    }
    
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    let cleanupCount = 0;
    
    rows.forEach(row => {
        // Find and remove the Images column cell if it exists
        const imagesCell = row.querySelector('[data-label="Images"]');
        if (imagesCell) {
            imagesCell.remove();
            cleanupCount++;
        }
    });
    
    if (cleanupCount > 0) {

    }
    
    // Also clean up any stored data that might have Images column
    if (appState.localData && appState.localData.length > 0) {
        let dataCleanupCount = 0;
        appState.localData.forEach(rowData => {
            if (rowData.hasOwnProperty('Images')) {
                delete rowData.Images;
                dataCleanupCount++;
            }
        });
        
        if (dataCleanupCount > 0) {
    
        }
    }
    
    // Clean up localStorage if it contains Images column data
    try {
        const storedData = localStorage.getItem('tableData');
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            let localStorageCleanupCount = 0;
            
            if (Array.isArray(parsedData)) {
                parsedData.forEach(rowData => {
                    if (rowData && rowData.hasOwnProperty('Images')) {
                        delete rowData.Images;
                        localStorageCleanupCount++;
                    }
                });
                
                if (localStorageCleanupCount > 0) {
                    localStorage.setItem('tableData', JSON.stringify(parsedData));
            
                }
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not clean up localStorage Images column data:', error);
    }
    
    // Clear old localStorage data to force fresh start with new structure
    try {
        localStorage.removeItem('tableData');

    } catch (error) {
        console.warn('⚠️ Could not clear localStorage tableData:', error);
    }
    
    // Mark as cleaned up for this session
    window.imagesColumnCleanedUp = true;
    
}

// Migrate old data structure to new structure without Images column
function migrateDataStructure(data) {
    if (!Array.isArray(data)) return data;
    
    
    const migratedData = data.map((rowData, index) => {
        if (!rowData || typeof rowData !== 'object') return rowData;
        
        const migratedRow = {};
        const headers = getHeaders();
        
        // Copy only the headers that exist in the new structure
        headers.forEach(header => {
            if (rowData.hasOwnProperty(header)) {
                migratedRow[header] = rowData[header];
            } else {
                // Set default values for missing headers
                if (header === 'Date de saisie') {
                    migratedRow[header] = getFormattedDate();
                } else if (header === 'PEC finale' || header === 'PEC initiale') {
                    migratedRow[header] = 'À définir';
                } else if (header === 'Diagnostic_initial') {
                    migratedRow[header] = 'À préciser';
                } else {
                    migratedRow[header] = '';
                }
            }
        });
        
        // Remove any old Images column data
        if (migratedRow.hasOwnProperty('Images')) {
            delete migratedRow.Images;
        }
        
        // Preserve other important fields
        if (rowData.hasOwnProperty('key')) {
            migratedRow.key = rowData.key;
        }
        if (rowData.hasOwnProperty('supprimer')) {
            migratedRow.supprimer = rowData.supprimer;
        }
        
        
        return migratedRow;
    });
    
    
    return migratedData;
}

// Function to restore placeholder text for PEC columns
function restorePecPlaceholder(cell) {
    if (cell && (cell.getAttribute('data-label') === 'PEC finale' || cell.getAttribute('data-label') === 'PEC initiale')) {
        if (cell.textContent.trim() === '') {
            cell.textContent = 'À définir';
            cell.classList.add('placeholder-text');
        }
    }
}

// Function to clear placeholder text for PEC columns
function clearPecPlaceholder(cell) {
    if (cell && (cell.getAttribute('data-label') === 'PEC finale' || cell.getAttribute('data-label') === 'PEC initiale')) {
        if (cell.textContent === 'À définir') {
            cell.textContent = '';
            cell.classList.remove('placeholder-text');
        }
    }
}

// Function to fix "to be defined" text and convert it to proper placeholder
function fixToBeDefinedText() {
    const pecCells = document.querySelectorAll('#data-table td[data-label="PEC finale"], #data-table td[data-label="PEC initiale"]');
    const diagnosticCells = document.querySelectorAll('#data-table td[data-label="Diagnostic_initial"]');
    
    // Fix PEC cells
    pecCells.forEach(cell => {
        const label = cell.getAttribute('data-label');
        if (cell.textContent.trim().toLowerCase() === 'to be defined') {
            cell.textContent = 'À définir';
            cell.classList.add('placeholder-text');
            // Remove bold styling for placeholder
            if (BOLD_HEADERS.includes(label.toLowerCase())) {
                cell.style.fontWeight = 'normal';
                cell.style.color = '#9CA3AF';
            }
            console.log('🔧 Fixed "to be defined" → "À définir"');
        }
    });
    
    // Fix Diagnostic_initial cells if they have "to be defined"
    diagnosticCells.forEach(cell => {
        const label = cell.getAttribute('data-label');
        if (cell.textContent.trim().toLowerCase() === 'to be defined') {
            cell.textContent = 'À préciser';
            cell.classList.add('placeholder-text');
            // Remove bold styling for placeholder
            if (BOLD_HEADERS.includes(label.toLowerCase())) {
                cell.style.fontWeight = 'normal';
                cell.style.color = '#9CA3AF';
            }
            console.log('🔧 Fixed "to be defined" → "À préciser" in Diagnostic_initial');
        }
    });
}

// Function to ensure all PEC cells have proper placeholder behavior
function ensurePecPlaceholderBehavior() {
    const pecCells = document.querySelectorAll('#data-table td[data-label="PEC finale"], #data-table td[data-label="PEC initiale"]');
    const diagnosticCells = document.querySelectorAll('#data-table td[data-label="Diagnostic_initial"]');
    
    // Handle PEC cells
    pecCells.forEach(cell => {
        const text = cell.textContent.trim();
        const label = cell.getAttribute('data-label');
        
        // If cell is empty or contains "to be defined", set proper placeholder
        if (text === '' || text.toLowerCase() === 'to be defined') {
            cell.textContent = 'À définir';
            cell.classList.add('placeholder-text');
            // Remove bold styling for placeholder
            if (BOLD_HEADERS.includes(label.toLowerCase())) {
                cell.style.fontWeight = 'normal';
                cell.style.color = '#9CA3AF';
            }
        }
        
        // If cell has "À définir" but no placeholder class, add it
        if (text === 'À définir' && !cell.classList.contains('placeholder-text')) {
            cell.classList.add('placeholder-text');
            // Remove bold styling for placeholder
            if (BOLD_HEADERS.includes(label.toLowerCase())) {
                cell.style.fontWeight = 'normal';
                cell.style.color = '#9CA3AF';
            }
        }
        
        // If cell has content and is a bold header, ensure bold styling
        if (text !== 'À définir' && text !== '' && BOLD_HEADERS.includes(label.toLowerCase())) {
            cell.style.fontWeight = 'bold';
            cell.style.color = '#000';
        }
        
        // Force fix any bold placeholder text
        if (text === 'À définir' && cell.classList.contains('placeholder-text')) {
            const computedStyle = window.getComputedStyle(cell);
            if (computedStyle.fontWeight === 'bold' || computedStyle.fontWeight === '700') {
                cell.style.fontWeight = 'normal';
                cell.style.color = '#9CA3AF';
                console.log(`🔧 Force fixed bold placeholder in ${label}`);
            }
        }
    });
    
    // Handle Diagnostic_initial cells
    diagnosticCells.forEach(cell => {
        const text = cell.textContent.trim();
        const label = cell.getAttribute('data-label');
        
        // If cell is empty, set proper placeholder
        if (text === '') {
            cell.textContent = 'À préciser';
            cell.classList.add('placeholder-text');
            // Remove bold styling for placeholder
            if (BOLD_HEADERS.includes(label.toLowerCase())) {
                cell.style.fontWeight = 'normal';
                cell.style.color = '#9CA3AF';
            }
        }
        
        // If cell has "À préciser" but no placeholder class, add it
        if (text === 'À préciser' && !cell.classList.contains('placeholder-text')) {
            cell.classList.add('placeholder-text');
            // Remove bold styling for placeholder
            if (BOLD_HEADERS.includes(label.toLowerCase())) {
                cell.style.fontWeight = 'normal';
                cell.style.color = '#9CA3AF';
            }
        }
        
        // If cell has content and is a bold header, ensure bold styling
        if (text !== 'À préciser' && text !== '' && BOLD_HEADERS.includes(label.toLowerCase())) {
            cell.style.fontWeight = 'bold';
            cell.style.color = '#000';
        }
        
        // Force fix any bold placeholder text
        if (text === 'À préciser' && cell.classList.contains('placeholder-text')) {
            const computedStyle = window.getComputedStyle(cell);
            if (computedStyle.fontWeight === 'bold' || computedStyle.fontWeight === '700') {
                cell.style.fontWeight = 'normal';
                cell.style.color = '#9CA3AF';
                console.log(`🔧 Force fixed bold placeholder in ${label}`);
            }
        }
    });
}

// Test function for PEC placeholder functionality
function testPecPlaceholderFunctionality() {
    console.log('🧪 Testing PEC placeholder functionality...');
    
    // Find PEC cells
    const pecCells = document.querySelectorAll('#data-table td[data-label="PEC finale"], #data-table td[data-label="PEC initiale"]');
    const diagnosticCells = document.querySelectorAll('#data-table td[data-label="Diagnostic_initial"]');
    
    if (pecCells.length === 0 && diagnosticCells.length === 0) {
        console.log('❌ No placeholder cells found');
        return;
    }
    
    console.log(`✅ Found ${pecCells.length} PEC cells and ${diagnosticCells.length} Diagnostic_initial cells`);
    
    let issuesFound = 0;
    
    // Test PEC cells placeholder behavior
    pecCells.forEach((cell, index) => {
        const label = cell.getAttribute('data-label');
        const text = cell.textContent.trim();
        const hasPlaceholder = text === 'À définir';
        const hasPlaceholderClass = cell.classList.contains('placeholder-text');
        const hasToBeDefined = text.toLowerCase() === 'to be defined';
        const isBold = window.getComputedStyle(cell).fontWeight === 'bold' || window.getComputedStyle(cell).fontWeight === '700';
        const isBoldHeader = BOLD_HEADERS.includes(label.toLowerCase());
        
        console.log(`📝 ${label} ${index + 1}: text="${text}", placeholder="${hasPlaceholder}", class="${hasPlaceholderClass}", toBeDefined="${hasToBeDefined}", isBold="${isBold}", shouldBeBold="${isBoldHeader}"`);
        
        if (hasToBeDefined) {
            console.log(`⚠️  ISSUE: ${label} ${index + 1} contains "to be defined" instead of "À définir"`);
            issuesFound++;
        }
        
        if (hasPlaceholder && !hasPlaceholderClass) {
            console.log(`⚠️  ISSUE: ${label} ${index + 1} has placeholder text but missing CSS class`);
            issuesFound++;
        }
        
        if (hasPlaceholder && isBold) {
            console.log(`⚠️  ISSUE: ${label} ${index + 1} has placeholder text but is BOLD (should be normal)`);
            issuesFound++;
        }
        
        if (!hasPlaceholder && !hasToBeDefined && text === '') {
            console.log(`⚠️  ISSUE: ${label} ${index + 1} is empty but should have placeholder`);
            issuesFound++;
        }
        
        if (isBoldHeader && !hasPlaceholder && !isBold) {
            console.log(`⚠️  ISSUE: ${label} ${index + 1} should be bold but is not`);
            issuesFound++;
        }
    });
    
    // Test Diagnostic_initial cells placeholder behavior
    diagnosticCells.forEach((cell, index) => {
        const label = cell.getAttribute('data-label');
        const text = cell.textContent.trim();
        const hasPlaceholder = text === 'À préciser';
        const hasPlaceholderClass = cell.classList.contains('placeholder-text');
        const hasToBeDefined = text.toLowerCase() === 'to be defined';
        const isBold = window.getComputedStyle(cell).fontWeight === 'bold' || window.getComputedStyle(cell).fontWeight === '700';
        const isBoldHeader = BOLD_HEADERS.includes(label.toLowerCase());
        
        console.log(`📝 ${label} ${index + 1}: text="${text}", placeholder="${hasPlaceholder}", class="${hasPlaceholderClass}", toBeDefined="${hasToBeDefined}", isBold="${isBold}", shouldBeBold="${isBoldHeader}"`);
        
        if (hasToBeDefined) {
            console.log(`⚠️  ISSUE: ${label} ${index + 1} contains "to be defined" instead of "À préciser"`);
            issuesFound++;
        }
        
        if (hasPlaceholder && !hasPlaceholderClass) {
            console.log(`⚠️  ISSUE: ${label} ${index + 1} has placeholder text but missing CSS class`);
            issuesFound++;
        }
        
        if (hasPlaceholder && isBold) {
            console.log(`⚠️  ISSUE: ${label} ${index + 1} has placeholder text but is BOLD (should be normal)`);
            issuesFound++;
        }
        
        if (!hasPlaceholder && text === '') {
            console.log(`⚠️  ISSUE: ${label} ${index + 1} is empty but should have placeholder`);
            issuesFound++;
        }
        
        if (isBoldHeader && !hasPlaceholder && !isBold) {
            console.log(`⚠️  ISSUE: ${label} ${index + 1} should be bold but is not`);
            issuesFound++;
        }
    });
    
    if (issuesFound > 0) {
        console.log(`🔧 Found ${issuesFound} issues. Use fixPecPlaceholders() to fix them automatically.`);
    } else {
        console.log('✅ All placeholder cells are working correctly!');
    }
    
    console.log('✅ PEC placeholder test completed');
}

// Test function for select-all functionality
function testSelectAllFunctionality() {
    console.log('🧪 Testing Select-All functionality...');
    
    const selectAllCheckbox = document.getElementById('select-all');
    if (!selectAllCheckbox) {
        console.log('❌ Select-all checkbox not found');
        return;
    }
    
    const allRowCheckboxes = document.querySelectorAll('#table-body tr td[data-label="Effacer"] input[type="checkbox"]');
    const checkedCheckboxes = document.querySelectorAll('#table-body tr td[data-label="Effacer"] input[type="checkbox"]:checked');
    
    console.log(`✅ Select-all checkbox found`);
    console.log(`📊 Total row checkboxes: ${allRowCheckboxes.length}`);
    console.log(`🔘 Currently checked: ${checkedCheckboxes.length}`);
    console.log(`🎯 Select-all state: checked=${selectAllCheckbox.checked}, indeterminate=${selectAllCheckbox.indeterminate}`);
    
    // Test select-all functionality
    console.log('🧪 Testing select-all checkbox...');
    selectAllCheckbox.checked = true;
    selectAllCheckbox.dispatchEvent(new Event('change'));
    
    setTimeout(() => {
        const newCheckedCount = document.querySelectorAll('#table-body tr td[data-label="Effacer"] input[type="checkbox"]:checked').length;
        console.log(`✅ After select-all: ${newCheckedCount}/${allRowCheckboxes.length} rows selected`);
        
        if (newCheckedCount === allRowCheckboxes.length) {
            console.log('✅ Select-all functionality working correctly!');
        } else {
            console.log('❌ Select-all functionality has issues');
        }
        
        // Reset to original state
        selectAllCheckbox.checked = false;
        selectAllCheckbox.dispatchEvent(new Event('change'));
        console.log('🔄 Reset to original state');
    }, 100);
    
    console.log('✅ Select-All test completed');
}

// Main function to fix all PEC placeholder issues
function fixPecPlaceholders() {
    console.log('🔧 Fixing PEC placeholders...');
    
    // Fix "to be defined" text
    fixToBeDefinedText();
    
    // Ensure proper placeholder behavior
    ensurePecPlaceholderBehavior();
    
    // Show success message
    showMessage('Placeholders PEC corrigés !', 'success');
    
    console.log('✅ PEC placeholders fixed');
}

// Function to handle select-all checkbox functionality
function setupSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('select-all');
    if (!selectAllCheckbox) return;
    
    selectAllCheckbox.addEventListener('change', function() {
        const isChecked = this.checked;
        const allRowCheckboxes = document.querySelectorAll('#table-body tr td[data-label="Effacer"] input[type="checkbox"]');
        
        // Update all row checkboxes
        allRowCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
            const row = checkbox.closest('tr');
            if (row) {
                row.classList.toggle('selected-row', isChecked);
            }
        });
        
        // Update select-all checkbox state
        this.checked = isChecked;
        
        // Show feedback message
        const message = isChecked ? `Toutes les lignes sélectionnées (${allRowCheckboxes.length})` : 'Sélection annulée';
        showMessage(message, 'info');
        
        console.log(`🔘 Select-all: ${isChecked ? 'All selected' : 'All deselected'}`);
    });
    
    // Add click handler to update select-all state when individual checkboxes change
    document.addEventListener('change', function(e) {
        if (e.target.type === 'checkbox' && e.target.closest('#table-body')) {
            updateSelectAllState();
        }
    });
    
    console.log('✅ Select-all checkbox functionality initialized');
}

// Function to update select-all checkbox state based on individual selections
function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('select-all');
    if (!selectAllCheckbox) return;
    
    const allRowCheckboxes = document.querySelectorAll('#table-body tr td[data-label="Effacer"] input[type="checkbox"]');
    const checkedCheckboxes = document.querySelectorAll('#table-body tr td[data-label="Effacer"] input[type="checkbox"]:checked');
    
    if (checkedCheckboxes.length === 0) {
        // No rows selected
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCheckboxes.length === allRowCheckboxes.length) {
        // All rows selected
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        // Some rows selected
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
}

// Function to update row counter display
function updateRowCounter() {
    const rowCounter = document.getElementById('row-counter');
    if (!rowCounter) return;
    
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    
    const currentRows = tbody.children.length;
    rowCounter.textContent = currentRows;
    
    // Change color based on limit
    if (currentRows >= 100) {
        rowCounter.className = 'text-red-600 font-bold';
    } else if (currentRows >= 90) {
        rowCounter.className = 'text-orange-600 font-semibold';
    } else {
        rowCounter.className = 'text-gray-600';
    }
}

// Function to clear all selections
function clearAllSelections() {
    const allRowCheckboxes = document.querySelectorAll('#table-body tr td[data-label="Effacer"] input[type="checkbox"]');
    const selectAllCheckbox = document.getElementById('select-all');
    
    // Uncheck all row checkboxes
    allRowCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        const row = checkbox.closest('tr');
        if (row) {
            row.classList.remove('selected-row');
        }
    });
    
    // Update select-all checkbox
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
    
    showMessage('Toutes les sélections effacées', 'info');
    console.log('🔘 All selections cleared');
}

// Test function to ensure all placeholders are not bold
function testPlaceholderBoldness() {
    console.log('🧪 Testing placeholder boldness...');
    
    const allPlaceholderCells = document.querySelectorAll('.placeholder-text');
    
    if (allPlaceholderCells.length === 0) {
        console.log('❌ No placeholder cells found');
        return;
    }
    
    console.log(`✅ Found ${allPlaceholderCells.length} placeholder cells`);
    
    let boldPlaceholdersFound = 0;
    
    allPlaceholderCells.forEach((cell, index) => {
        const label = cell.getAttribute('data-label');
        const text = cell.textContent.trim();
        const computedStyle = window.getComputedStyle(cell);
        const isBold = computedStyle.fontWeight === 'bold' || computedStyle.fontWeight === '700';
        
        console.log(`📝 ${label} ${index + 1}: text="${text}", isBold="${isBold}"`);
        
        if (isBold) {
            console.log(`⚠️  ISSUE: ${label} ${index + 1} placeholder is BOLD (should be normal)`);
            boldPlaceholdersFound++;
            
            // Force fix the bold placeholder
            cell.style.fontWeight = 'normal';
            cell.style.color = '#9CA3AF';
            console.log(`🔧 Fixed bold placeholder in ${label}`);
        }
    });
    
    if (boldPlaceholdersFound > 0) {
        console.log(`🔧 Fixed ${boldPlaceholdersFound} bold placeholders. All placeholders should now be normal weight.`);
    } else {
        console.log('✅ All placeholders are correctly non-bold!');
    }
    
    console.log('✅ Placeholder boldness test completed');
}

// Real-time synchronization functions
async function setupRealtimeSubscription() {
    try {
        if (!supabase || !isRealtimeEnabled) {
            log('⚠️ Realtime subscription not available');
            return;
        }

        // Clean up existing subscription
        if (realtimeSubscription) {
            try {
                await realtimeSubscription.unsubscribe();
            } catch (e) {
                log('⚠️ Error cleaning up old subscription: ' + e.message);
            }
            realtimeSubscription = null;
        }

        log('🔄 Setting up real-time subscription...');
        
        // Subscribe to table changes with a unique channel name and debouncing
        const channelName = `staff-table-changes-${Date.now()}`;
        realtimeSubscription = supabase
            .channel(channelName)
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: supabaseConfig.tableName 
                }, 
                async (payload) => {
                    try {
                        // Add debouncing to prevent multiple rapid events
                        if (window.realtimeChangeTimeout) {
                            clearTimeout(window.realtimeChangeTimeout);
                        }
                        
                        window.realtimeChangeTimeout = setTimeout(async () => {
                            await handleRealtimeChange(payload);
                        }, 100); // 100ms debounce
                        
                    } catch (error) {
                        log('❌ Error in real-time change handler: ' + error.message, 'error');
                    }
                }
            )
            .subscribe((status) => {
                log('🔄 Real-time subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    log('✅ Real-time subscription active');
                    updateSyncIndicator('synced', 'Synchronisé en temps réel');
                } else if (status === 'CHANNEL_ERROR') {
                    log('❌ Real-time subscription error');
                    updateSyncIndicator('error', 'Erreur de synchronisation');
                } else if (status === 'TIMED_OUT') {
                    log('⚠️ Real-time subscription timed out, retrying...');
                    // Add delay before retry to prevent rapid retries
                    setTimeout(() => {
                        if (isRealtimeEnabled) {
                            setupRealtimeSubscription();
                        }
                    }, 10000); // Increased to 10 seconds
                } else if (status === 'CLOSED') {
                    log('⚠️ Real-time subscription closed');
                }
            });

    } catch (error) {
        log('❌ Error setting up real-time subscription: ' + error.message, 'error');
        updateSyncIndicator('error', 'Erreur de synchronisation');
    }
}

async function handleRealtimeChange(payload) {
    try {
        log('🔄 Real-time change received:', payload);
        
        // Prevent infinite loops by checking if this change was made by the current device
        if (payload.commit_timestamp === lastSyncTimestamp) {
            log('🔄 Ignoring own change in real-time update');
            return;
        }

        // Capture current focus before real-time update
        captureFocusInfo();
        captureSimplePos();

        log('🔄 Real-time change detected:', payload.event, payload.new?.No || payload.old?.No);
        
        // Update sync indicator
        updateSyncIndicator('syncing', 'Mise à jour en cours...');
        
        // Reload data from server to get the latest changes
        log('🔄 Reloading data from Supabase...');
        const newData = await loadFromSupabase();
        log('🔄 Data reloaded:', newData?.length || 0, 'rows');
        
        if (newData && newData.length > 0) {
            // Update local data without triggering save
            appState.localData = newData;
            
            // Refresh the table display
            log('🔄 Refreshing table display...');
            await refreshTableFromData(newData);
            
            // Update sync indicator
            updateSyncIndicator('synced', 'Synchronisé en temps réel');
            
            // Show notification
            showMessage('Tableau mis à jour automatiquement', 'info');
            
            // Show detailed notification for the change
            const changeType = payload.event === 'INSERT' ? 'Ajout' : 
                              payload.event === 'UPDATE' ? 'Modification' : 
                              payload.event === 'DELETE' ? 'Suppression' : 'Changement';
            const rowNumber = payload.new?.No || payload.old?.No || 'N/A';
            showRealtimeUpdateNotification(changeType, rowNumber);
            
            // Restore focus after real-time update
            setTimeout(() => {
                restoreFocus();
            }, 200);
            
            log('✅ Real-time update completed');
        } else {
            log('⚠️ No data received from Supabase');
            updateSyncIndicator('error', 'Aucune donnée reçue');
            
            // Restore focus even if no data received
            setTimeout(() => {
                restoreFocus();
            }, 200);
        }
        
    } catch (error) {
        log('❌ Error handling real-time change: ' + error.message, 'error');
        updateSyncIndicator('error', 'Erreur de mise à jour');
        
        // Restore focus even on error
        setTimeout(() => {
            restoreFocus();
        }, 200);
    }
}

async function refreshTableFromData(data) {
    try {
        // Use the existing loadDataIntoTable function which handles data properly
        loadDataIntoTable(data);
        
        // Update row colors if any
        if (Object.keys(rowColorMap).length > 0) {
            // Apply saved row colors to the refreshed table
            const tbody = document.getElementById('table-body');
            if (tbody) {
                Array.from(tbody.querySelectorAll('tr')).forEach((tr, index) => {
                    const rowKey = String(index + 1);
                    const color = rowColorMap[rowKey];
                    if (color) {
                        setRowColor(tr, color);
                    }
                });
            }
        }
        
        log('✅ Table refreshed from real-time data');
        
    } catch (error) {
        log('❌ Error refreshing table: ' + error.message, 'error');
    }
}

function cleanupRealtimeSubscription() {
    try {
        if (realtimeSubscription) {
            realtimeSubscription.unsubscribe();
            realtimeSubscription = null;
            log('✅ Real-time subscription cleaned up');
        }
    } catch (error) {
        log('❌ Error cleaning up real-time subscription: ' + error.message, 'error');
    }
}

// Show notification for real-time updates
function showRealtimeUpdateNotification(changeType, rowNumber) {
    try {
        // Create a temporary notification element with only icon
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg z-50 transform transition-all duration-300 translate-x-full';
        notification.innerHTML = `
            <i class="fa-solid fa-sync-alt text-white text-lg"></i>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Auto-remove after 3 seconds (shorter since it's just an icon)
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
    } catch (error) {
        log('❌ Error showing real-time notification: ' + error.message, 'error');
    }
}
