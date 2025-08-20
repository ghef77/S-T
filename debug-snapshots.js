// Script de débogage pour les snapshots - À exécuter dans la console du navigateur
console.log('🔍 Script de débogage des snapshots chargé');

// Fonction de diagnostic complète
async function debugSnapshots() {
    console.log('🚀 Début du diagnostic des snapshots...');
    
    try {
        // 1. Vérifier que supabase est initialisé
        if (!window.supabase) {
            console.error('❌ Client Supabase non initialisé');
            console.log('État de window.supabase:', window.supabase);
            return;
        }
        
        console.log('✅ Client Supabase trouvé:', window.supabase);
        
        // 2. Tester la connexion de base
        console.log('🔄 Test de connexion de base...');
        const { data: testData, error: testError } = await window.supabase
            .from('staffTable')
            .select('count')
            .limit(1);
        
        if (testError) {
            console.error('❌ Erreur de connexion de base:', testError);
            return;
        }
        
        console.log('✅ Connexion de base réussie');
        
        // 3. Vérifier la table des snapshots
        console.log('🔄 Vérification de la table table_snapshots_index...');
        const { data: snapshots, error: snapshotsError } = await window.supabase
            .from('table_snapshots_index')
            .select('*');
        
        if (snapshotsError) {
            console.error('❌ Erreur d\'accès à la table des snapshots:', snapshotsError);
            
            // Analyser le type d'erreur
            if (snapshotsError.code === 'PGRST301') {
                console.error('❌ Table table_snapshots_index n\'existe pas');
                console.log('💡 Solution: Exécutez le script SQL de configuration dans Supabase');
            } else if (snapshotsError.message.includes('permission')) {
                console.error('❌ Problème de permissions (RLS)');
                console.log('💡 Solution: Vérifiez les politiques RLS dans Supabase');
            }
            return;
        }
        
        console.log(`✅ Table des snapshots accessible - ${snapshots.length} snapshots trouvés`);
        
        if (snapshots.length > 0) {
            console.log('📋 Détails des snapshots:');
            snapshots.forEach((snapshot, index) => {
                console.log(`  ${index + 1}. Date: ${snapshot.snapshot_date}, Lignes: ${snapshot.row_count}, Taille: ${snapshot.file_size_bytes} bytes`);
            });
        } else {
            console.log('⚠️ Aucun snapshot dans la base de données');
        }
        
        // 4. Vérifier le stockage
        console.log('🔄 Vérification du bucket de stockage...');
        try {
            const { data: storageFiles, error: storageError } = await window.supabase.storage
                .from('table-snapshots')
                .list('', { limit: 10 });
            
            if (storageError) {
                console.error('❌ Erreur d\'accès au stockage:', storageError);
            } else {
                console.log(`✅ Stockage accessible - ${storageFiles.length} fichiers trouvés`);
                if (storageFiles.length > 0) {
                    console.log('📁 Fichiers dans le bucket:');
                    storageFiles.forEach((file, index) => {
                        console.log(`  ${index + 1}. ${file.name}`);
                    });
                }
            }
        } catch (storageError) {
            console.error('❌ Erreur lors de l\'accès au stockage:', storageError);
        }
        
        // 5. Vérifier la variable globale availableSnapshots
        console.log('🔄 Vérification de la variable availableSnapshots...');
        if (window.availableSnapshots) {
            console.log(`✅ availableSnapshots: ${window.availableSnapshots.length} snapshots`);
            console.log('Contenu:', window.availableSnapshots);
        } else {
            console.log('⚠️ availableSnapshots n\'est pas définie');
        }
        
        // 6. Vérifier l'état du bouton calendrier
        console.log('🔄 Vérification du bouton calendrier...');
        const calendarBtn = document.getElementById('snapshot-calendar-btn');
        const calendarBtnText = document.getElementById('calendar-btn-text');
        
        if (calendarBtn) {
            console.log('✅ Bouton calendrier trouvé');
            console.log('Texte actuel:', calendarBtnText ? calendarBtnText.textContent : 'Non trouvé');
        } else {
            console.log('❌ Bouton calendrier non trouvé');
        }
        
        console.log('✅ Diagnostic terminé');
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    }
}

// Fonction pour forcer le rechargement des snapshots
async function forceReloadSnapshots() {
    console.log('🔄 Forçage du rechargement des snapshots...');
    
    try {
        if (typeof window.loadAvailableSnapshots === 'function') {
            await window.loadAvailableSnapshots();
            console.log('✅ Rechargement forcé terminé');
        } else {
            console.error('❌ Fonction loadAvailableSnapshots non trouvée');
        }
    } catch (error) {
        console.error('❌ Erreur lors du rechargement forcé:', error);
    }
}

// Fonction pour créer un snapshot de test
async function createTestSnapshot() {
    console.log('🔄 Création d\'un snapshot de test...');
    
    try {
        if (typeof window.createDemoSnapshot === 'function') {
            await window.createDemoSnapshot();
            console.log('✅ Snapshot de test créé');
        } else {
            console.error('❌ Fonction createDemoSnapshot non trouvée');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la création du snapshot de test:', error);
    }
}

// Exposer les fonctions globalement
window.debugSnapshots = debugSnapshots;
window.forceReloadSnapshots = forceReloadSnapshots;
window.createTestSnapshot = createTestSnapshot;

console.log('📚 Fonctions disponibles:');
console.log('  - debugSnapshots() : Diagnostic complet');
console.log('  - forceReloadSnapshots() : Forcer le rechargement');
console.log('  - createTestSnapshot() : Créer un snapshot de test');
console.log('💡 Tapez debugSnapshots() dans la console pour commencer le diagnostic');
