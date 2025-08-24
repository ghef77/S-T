// =====================================================
// SCRIPT DE DIAGNOSTIC COMPLET DES SNAPSHOTS
// =====================================================
// Ce script diagnostique pourquoi le site ne voit pas les snapshots
// et teste tous les aspects de la connexion Supabase

// Configuration Supabase
const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';

// Variables de diagnostic
let diagnosticResults = {
    connection: false,
    tableExists: false,
    tableAccess: false,
    snapshotsCount: 0,
    storageAccess: false,
    edgeFunction: false,
    errors: []
};

// Fonction principale de diagnostic
async function runFullSnapshotDiagnostic() {
    console.log('🔍 DÉMARRAGE DU DIAGNOSTIC COMPLET DES SNAPSHOTS');
    console.log('=' .repeat(60));
    
    try {
        // 1. Test de connexion de base
        await testBasicConnection();
        
        // 2. Test d'existence de la table
        await testTableExistence();
        
        // 3. Test d'accès à la table
        await testTableAccess();
        
        // 4. Test du stockage
        await testStorageAccess();
        
        // 5. Test de la fonction Edge
        await testEdgeFunction();
        
        // 6. Test de la fonction loadAvailableSnapshots
        await testLoadAvailableSnapshots();
        
        // 7. Générer le rapport final
        generateDiagnosticReport();
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
        diagnosticResults.errors.push(error.message);
        generateDiagnosticReport();
    }
}

// 1. Test de connexion de base
async function testBasicConnection() {
    console.log('\n🔌 1. TEST DE CONNEXION DE BASE');
    console.log('-'.repeat(30));
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            console.log('✅ Connexion de base réussie');
            diagnosticResults.connection = true;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur de connexion de base:', error.message);
        diagnosticResults.errors.push(`Connexion de base: ${error.message}`);
    }
}

// 2. Test d'existence de la table
async function testTableExistence() {
    console.log('\n📋 2. TEST D\'EXISTENCE DE LA TABLE');
    console.log('-'.repeat(30));
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=count`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            console.log('✅ Table table_snapshots_index existe');
            diagnosticResults.tableExists = true;
        } else if (response.status === 404) {
            console.error('❌ Table table_snapshots_index n\'existe pas');
            diagnosticResults.errors.push('Table table_snapshots_index n\'existe pas');
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test d\'existence:', error.message);
        diagnosticResults.errors.push(`Test existence table: ${error.message}`);
    }
}

// 3. Test d'accès à la table
async function testTableAccess() {
    console.log('\n🔓 3. TEST D\'ACCÈS À LA TABLE');
    console.log('-'.repeat(30));
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=id,created_at&limit=5`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Accès à la table réussi - ${data.length} snapshots trouvés`);
            diagnosticResults.tableAccess = true;
            diagnosticResults.snapshotsCount = data.length;
            
            if (data.length > 0) {
                console.log('📊 Exemples de snapshots:');
                data.forEach((snap, index) => {
                    console.log(`   ${index + 1}. ID: ${snap.id}, Créé: ${snap.created_at}`);
                });
            }
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test d\'accès:', error.message);
        diagnosticResults.errors.push(`Test accès table: ${error.message}`);
    }
}

// 4. Test du stockage
async function testStorageAccess() {
    console.log('\n🗄️ 4. TEST DU STOCKAGE');
    console.log('-'.repeat(30));
    
    try {
        const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket/table-snapshots`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            console.log('✅ Accès au bucket table-snapshots réussi');
            diagnosticResults.storageAccess = true;
            
            // Lister les fichiers
            const listResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/list/table-snapshots?limit=5`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            
            if (listResponse.ok) {
                const files = await listResponse.json();
                console.log(`📁 ${files.length} fichiers dans le bucket`);
                files.forEach((file, index) => {
                    console.log(`   ${index + 1}. ${file.name} (${file.metadata?.size || 'N/A'} bytes)`);
                });
            }
            
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test du stockage:', error.message);
        diagnosticResults.errors.push(`Test stockage: ${error.message}`);
    }
}

// 5. Test de la fonction Edge
async function testEdgeFunction() {
    console.log('\n⚡ 5. TEST DE LA FONCTION EDGE');
    console.log('-'.repeat(30));
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/snapshot_staff_table`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ test: true })
        });
        
        if (response.ok) {
            console.log('✅ Fonction Edge snapshot_staff_table accessible');
            diagnosticResults.edgeFunction = true;
            
            const result = await response.json();
            console.log('📊 Réponse de la fonction:', result);
            
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test de la fonction Edge:', error.message);
        diagnosticResults.errors.push(`Test fonction Edge: ${error.message}`);
    }
}

// 6. Test de la fonction loadAvailableSnapshots
async function testLoadAvailableSnapshots() {
    console.log('\n🔄 6. TEST DE LA FONCTION LOADAVAILABLESNAPSHOTS');
    console.log('-'.repeat(30));
    
    try {
        if (typeof window.loadAvailableSnapshots === 'function') {
            console.log('✅ Fonction loadAvailableSnapshots trouvée dans window');
            
            // Tester l'exécution
            console.log('🔄 Exécution de loadAvailableSnapshots...');
            await window.loadAvailableSnapshots();
            
            // Vérifier le résultat
            if (window.availableSnapshots && Array.isArray(window.availableSnapshots)) {
                console.log(`✅ loadAvailableSnapshots exécutée avec succès - ${window.availableSnapshots.length} snapshots`);
            } else {
                console.log('⚠️ loadAvailableSnapshots exécutée mais availableSnapshots non défini');
            }
            
        } else {
            console.error('❌ Fonction loadAvailableSnapshots non trouvée dans window');
            diagnosticResults.errors.push('Fonction loadAvailableSnapshots non trouvée');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test de loadAvailableSnapshots:', error.message);
        diagnosticResults.errors.push(`Test loadAvailableSnapshots: ${error.message}`);
    }
}

// 7. Générer le rapport final
function generateDiagnosticReport() {
    console.log('\n📊 RAPPORT DE DIAGNOSTIC FINAL');
    console.log('=' .repeat(60));
    
    // Résumé des tests
    console.log('🔍 RÉSUMÉ DES TESTS:');
    console.log(`   ✅ Connexion de base: ${diagnosticResults.connection ? 'OK' : '❌'}`);
    console.log(`   ✅ Table existe: ${diagnosticResults.tableExists ? 'OK' : '❌'}`);
    console.log(`   ✅ Accès table: ${diagnosticResults.tableAccess ? 'OK' : '❌'}`);
    console.log(`   ✅ Stockage: ${diagnosticResults.storageAccess ? 'OK' : '❌'}`);
    console.log(`   ✅ Fonction Edge: ${diagnosticResults.edgeFunction ? 'OK' : '❌'}`);
    console.log(`   📊 Snapshots trouvés: ${diagnosticResults.snapshotsCount}`);
    
    // Diagnostic principal
    if (diagnosticResults.errors.length === 0) {
        console.log('\n🎉 DIAGNOSTIC: TOUT FONCTIONNE CORRECTEMENT');
        console.log('Le site devrait voir les snapshots. Vérifiez:');
        console.log('   1. La console du navigateur pour les erreurs JavaScript');
        console.log('   2. Les politiques RLS dans Supabase');
        console.log('   3. La fonction loadAvailableSnapshots est-elle appelée?');
        
    } else {
        console.log('\n🚨 DIAGNOSTIC: PROBLÈMES DÉTECTÉS');
        console.log('Erreurs trouvées:');
        diagnosticResults.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
        
        console.log('\n🔧 SOLUTIONS RECOMMANDÉES:');
        
        if (!diagnosticResults.connection) {
            console.log('   1. Vérifiez SUPABASE_URL et SUPABASE_ANON_KEY');
        }
        
        if (!diagnosticResults.tableExists) {
            console.log('   2. Exécutez simple-recreate-table.sql pour créer la table');
        }
        
        if (!diagnosticResults.tableAccess) {
            console.log('   3. Vérifiez les politiques RLS dans Supabase Dashboard');
        }
        
        if (!diagnosticResults.storageAccess) {
            console.log('   4. Vérifiez les permissions du bucket table-snapshots');
        }
        
        if (!diagnosticResults.edgeFunction) {
            console.log('   5. Redéployez la fonction Edge Function');
        }
    }
    
    // Informations supplémentaires
    console.log('\n📋 INFORMATIONS SUPPLÉMENTAIRES:');
    console.log(`   🌐 URL Supabase: ${SUPABASE_URL}`);
    console.log(`   🔑 Clé Anon: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
    console.log(`   📅 Diagnostic exécuté: ${new Date().toLocaleString('fr-FR')}`);
    
    // Afficher dans l'interface si possible
    if (typeof showMessage === 'function') {
        if (diagnosticResults.errors.length === 0) {
            showMessage('✅ Diagnostic terminé - Tout fonctionne correctement', 'success');
        } else {
            showMessage(`❌ Diagnostic terminé - ${diagnosticResults.errors.length} problème(s) détecté(s)`, 'error');
        }
    }
}

// Fonctions utilitaires pour les tests
function quickConnectionTest() {
    console.log('🚀 Test de connexion rapide...');
    testBasicConnection();
}

function testTableOnly() {
    console.log('📋 Test de la table uniquement...');
    testTableExistence();
    testTableAccess();
}

function testStorageOnly() {
    console.log('🗄️ Test du stockage uniquement...');
    testStorageAccess();
}

// Fonctions exportées
window.runFullSnapshotDiagnostic = runFullSnapshotDiagnostic;
window.quickConnectionTest = quickConnectionTest;
window.testTableOnly = testTableOnly;
window.testStorageOnly = testStorageOnly;

// Instructions d'utilisation
console.log('🔍 SCRIPT DE DIAGNOSTIC DES SNAPSHOTS CHARGÉ');
console.log('==============================================');
console.log('🚀 Utilisation:');
console.log('   runFullSnapshotDiagnostic() - Diagnostic complet');
console.log('   quickConnectionTest() - Test de connexion rapide');
console.log('   testTableOnly() - Test de la table uniquement');
console.log('   testStorageOnly() - Test du stockage uniquement');
console.log('');
console.log('💡 Commencez par: runFullSnapshotDiagnostic()');
console.log('✅ Nouvelle clé API configurée!');
