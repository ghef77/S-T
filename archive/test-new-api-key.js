// =====================================================
// TEST AVEC NOUVELLE CLÉ API SUPABASE
// =====================================================
// Ce script permet de tester avec une nouvelle clé API
// pour résoudre le problème d'authentification HTTP 401

// Configuration à mettre à jour
let SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDU2NTcsImV4cCI6MjA3MDA4MTY1N30.xd9Thasg4r8Nrwxx5nFwyGB_ufPIvok4XB-78dilpsw';

// Fonction pour configurer la nouvelle clé
function setNewApiKey(newKey) {
    SUPABASE_ANON_KEY = newKey;
    console.log('🔑 Nouvelle clé API configurée');
    console.log('Clé:', newKey.substring(0, 20) + '...');
}

// Test de connexion avec la nouvelle clé
async function testWithNewKey() {
    if (!SUPABASE_ANON_KEY) {
        console.error('❌ Veuillez d\'abord configurer la clé API avec setNewApiKey()');
        return;
    }
    
    console.log('🔍 Test avec la nouvelle clé API...');
    
    try {
        // Test de base
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            console.log('✅ Connexion réussie avec la nouvelle clé!');
            
            // Test de la table
            await testTableAccess();
            
        } else {
            console.error(`❌ Erreur HTTP ${response.status}: ${response.statusText}`);
            if (response.status === 401) {
                console.log('🔑 La clé API est toujours invalide');
                console.log('💡 Vérifiez dans Supabase Dashboard → Settings → API');
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur de connexion:', error.message);
    }
}

// Test d'accès à la table
async function testTableAccess() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=count`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            console.log('✅ Accès à la table réussi!');
            
            // Compter les snapshots
            const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?select=*&limit=5`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            
            if (countResponse.ok) {
                const snapshots = await countResponse.json();
                console.log(`📊 ${snapshots.length} snapshots trouvés dans la table`);
                
                if (snapshots.length > 0) {
                    console.log('📋 Derniers snapshots:');
                    snapshots.forEach((snap, index) => {
                        console.log(`   ${index + 1}. ${snap.snapshot_date} - ${snap.row_count} lignes`);
                    });
                }
            }
            
        } else {
            console.error(`❌ Erreur d'accès à la table: HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test de la table:', error.message);
    }
}

// Test du stockage
async function testStorage() {
    try {
        const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket/table-snapshots`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            console.log('✅ Accès au stockage réussi!');
            
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
                    console.log(`   ${index + 1}. ${file.name}`);
                });
            }
            
        } else {
            console.error(`❌ Erreur d'accès au stockage: HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test du stockage:', error.message);
    }
}

// Test de la fonction Edge
async function testEdgeFunction() {
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
            console.log('✅ Fonction Edge accessible!');
            const result = await response.json();
            console.log('📊 Réponse:', result);
        } else {
            console.error(`❌ Erreur d'accès à la fonction Edge: HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test de la fonction Edge:', error.message);
    }
}

// Test complet avec la nouvelle clé
async function fullTestWithNewKey() {
    console.log('🚀 Test complet avec la nouvelle clé API...');
    
    if (!SUPABASE_ANON_KEY) {
        console.error('❌ Configurez d\'abord la clé API avec setNewApiKey()');
        return;
    }
    
    await testWithNewKey();
    await testStorage();
    await testEdgeFunction();
    
    console.log('\n🎯 Test complet terminé!');
}

// Instructions d'utilisation
console.log('🔑 SCRIPT DE TEST AVEC NOUVELLE CLÉ API CHARGÉ');
console.log('================================================');
console.log('🚀 Utilisation:');
console.log('   1. setNewApiKey("votre-nouvelle-clé")');
console.log('   2. testWithNewKey() - Test de base');
console.log('   3. fullTestWithNewKey() - Test complet');
console.log('');
console.log('💡 Exemple:');
console.log('   setNewApiKey("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")');
console.log('   testWithNewKey()');
console.log('');
console.log('🔍 Obtenez votre nouvelle clé dans:');
console.log('   Supabase Dashboard → Settings → API → anon public');
console.log('');
console.log('✅ Clé API déjà configurée!');
console.log('🚀 Tapez testWithNewKey() pour commencer le test');
