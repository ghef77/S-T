        // Keyboard navigation
        function setupKeyboardNavigation() {
            document.addEventListener('keydown', function(e) {
                const active = document.activeElement;
                if (active && active.tagName === 'TD' && active.contentEditable === 'true') {
                    const modal = document.getElementById('confirmation-modal');
                    if (modal && !modal.classList.contains('hidden')) return;
                    
                    // ✅ CORRECTION: Éviter le double traitement des touches de navigation
                    if (e.defaultPrevented) return;
                    
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
                            // Empêcher l'ajout en mode visualisation
                            if (isViewMode) {
                                showMessage('Impossible d\'ajouter des lignes en mode visualisation. Désactivez le mode visualisation pour modifier le tableau.', 'warning');
                                return;
                            }
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
                            // Empêcher l'ajout en mode visualisation
                            if (isViewMode) {
                                showMessage('Impossible d\'ajouter des lignes en mode visualisation. Désactivez le mode visualisation pour modifier le tableau.', 'warning');
                                return;
                            }
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
                        if (isMobile()) ensureCellVisible(next);
                    }
                }
            });
