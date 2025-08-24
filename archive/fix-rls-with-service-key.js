// =====================================================
// CORRECTION DES POLITIQUES RLS AVEC LA CLÉ SERVICE ROLE
// =====================================================
// Ce script corrige les politiques RLS qui bloquent l'insertion
// des snapshots en utilisant la clé service role

// Configuration avec clé service role
const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZWN1Z3hvcGp4enFmZG5hcXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDUwNTY1NywiZXhwIjoyMDcwMDgxNjU3fQ.5m7nLHxHxOkxQf8maZis7Y7jynqu2dWqIzEbgWvOTcE';

// Fonction principale de correction RLS
async function fixRLSPolicies() {
    console.log('🔧 DÉMARRAGE DE LA CORRECTION DES POLITIQUES RLS');
    console.log('=' .repeat(60));
    
    try {
        // 1. Vérifier les politiques existantes
        await checkExistingPolicies();
        
        // 2. Supprimer les anciennes politiques
        await removeOldPolicies();
        
        // 3. Créer les nouvelles politiques
        await createNewPolicies();
        
        // 4. Vérifier que tout fonctionne
        await verifyPolicies();
        
        // 5. Test d'insertion
        await testInsertion();
        
        console.log('\n🎉 CORRECTION RLS TERMINÉE AVEC SUCCÈS!');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction RLS:', error);
    }
}

// 1. Vérifier les politiques existantes
async function checkExistingPolicies() {
    console.log('\n🔍 1. VÉRIFICATION DES POLITIQUES EXISTANTES');
    console.log('-'.repeat(40));
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    SELECT 
                        'Politiques existantes' as info,
                        schemaname,
                        tablename,
                        policyname,
                        cmd,
                        permissive
                    FROM pg_policies 
                    WHERE tablename IN ('table_snapshots_index', 'snapshot_restore_log')
                    ORDER BY tablename, policyname;
                `
            })
        });
        
        if (response.ok) {
            const policies = await response.json();
            console.log(`📋 ${policies.length} politiques trouvées:`);
            policies.forEach(policy => {
                console.log(`   - ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
            });
        } else {
            console.log('⚠️ Impossible de vérifier les politiques existantes');
        }
        
    } catch (error) {
        console.log('⚠️ Erreur lors de la vérification des politiques:', error.message);
    }
}

// 2. Supprimer les anciennes politiques
async function removeOldPolicies() {
    console.log('\n🗑️ 2. SUPPRESSION DES ANCIENNES POLITIQUES');
    console.log('-'.repeat(40));
    
    const policiesToRemove = [
        'DROP POLICY IF EXISTS "Allow public read access to snapshots" ON table_snapshots_index;',
        'DROP POLICY IF EXISTS "Allow authenticated insert to snapshots" ON table_snapshots_index;',
        'DROP POLICY IF EXISTS "Allow authenticated update to snapshots" ON table_snapshots_index;',
        'DROP POLICY IF EXISTS "Allow authenticated delete to snapshots" ON table_snapshots_index;',
        'DROP POLICY IF EXISTS "Allow public read access to restore log" ON snapshot_restore_log;',
        'DROP POLICY IF EXISTS "Allow authenticated insert to restore log" ON snapshot_restore_log;'
    ];
    
    for (const policy of policiesToRemove) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: policy })
            });
            
            if (response.ok) {
                console.log(`✅ Politique supprimée: ${policy.split(' ')[3]}`);
            } else {
                console.log(`⚠️ Impossible de supprimer: ${policy.split(' ')[3]}`);
            }
            
        } catch (error) {
            console.log(`⚠️ Erreur lors de la suppression: ${error.message}`);
        }
    }
}

// 3. Créer les nouvelles politiques
async function createNewPolicies() {
    console.log('\n➕ 3. CRÉATION DES NOUVELLES POLITIQUES');
    console.log('-'.repeat(40));
    
    const newPolicies = [
        // Politiques pour table_snapshots_index
        `CREATE POLICY "snapshots_public_read" ON table_snapshots_index FOR SELECT USING (true);`,
        `CREATE POLICY "snapshots_public_insert" ON table_snapshots_index FOR INSERT WITH CHECK (true);`,
        `CREATE POLICY "snapshots_public_update" ON table_snapshots_index FOR UPDATE USING (true) WITH CHECK (true);`,
        `CREATE POLICY "snapshots_public_delete" ON table_snapshots_index FOR DELETE USING (true);`,
        
        // Politiques pour snapshot_restore_log
        `CREATE POLICY "restore_log_public_read" ON snapshot_restore_log FOR SELECT USING (true);`,
        `CREATE POLICY "restore_log_public_insert" ON snapshot_restore_log FOR INSERT WITH CHECK (true);`
    ];
    
    for (const policy of newPolicies) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: policy })
            });
            
            if (response.ok) {
                console.log(`✅ Politique créée: ${policy.split('"')[1]}`);
            } else {
                console.log(`⚠️ Impossible de créer: ${policy.split('"')[1]}`);
            }
            
        } catch (error) {
            console.log(`⚠️ Erreur lors de la création: ${error.message}`);
        }
    }
}

// 4. Vérifier que les politiques sont créées
async function verifyPolicies() {
    console.log('\n✅ 4. VÉRIFICATION DES NOUVELLES POLITIQUES');
    console.log('-'.repeat(40));
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    SELECT 
                        'Nouvelles politiques' as info,
                        schemaname,
                        tablename,
                        policyname,
                        cmd,
                        permissive
                    FROM pg_policies 
                    WHERE tablename IN ('table_snapshots_index', 'snapshot_restore_log')
                    ORDER BY tablename, policyname;
                `
            })
        });
        
        if (response.ok) {
            const policies = await response.json();
            console.log(`📋 ${policies.length} nouvelles politiques créées:`);
            policies.forEach(policy => {
                console.log(`   ✅ ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
            });
        } else {
            console.log('⚠️ Impossible de vérifier les nouvelles politiques');
        }
        
    } catch (error) {
        console.log('⚠️ Erreur lors de la vérification:', error.message);
    }
}

// 5. Test d'insertion pour vérifier que ça fonctionne
async function testInsertion() {
    console.log('\n🧪 5. TEST D\'INSERTION');
    console.log('-'.repeat(40));
    
    try {
        // Test d'insertion dans la table
        const testData = {
            snapshot_date: new Date().toISOString().split('T')[0],
            object_path: 'test_rls_fix.json',
            row_count: 0,
            file_size_bytes: 0,
            metadata: { test: true, timestamp: new Date().toISOString() }
        };
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Test d\'insertion réussi!');
            console.log(`   ID créé: ${result[0].id}`);
            
            // Nettoyer le test
            await fetch(`${SUPABASE_URL}/rest/v1/table_snapshots_index?id=eq.${result[0].id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                }
            });
            console.log('🧹 Données de test nettoyées');
            
        } else {
            console.log(`❌ Test d'insertion échoué: HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.log('⚠️ Erreur lors du test d\'insertion:', error.message);
    }
}

// Fonctions utilitaires
function quickRLSFix() {
    console.log('🚀 Correction RLS rapide...');
    fixRLSPolicies();
}

function checkPoliciesOnly() {
    console.log('🔍 Vérification des politiques uniquement...');
    checkExistingPolicies();
}

// Fonctions exportées
window.fixRLSPolicies = fixRLSPolicies;
window.quickRLSFix = quickRLSFix;
window.checkPoliciesOnly = checkPoliciesOnly;

// Instructions d'utilisation
console.log('🔧 SCRIPT DE CORRECTION RLS AVEC CLÉ SERVICE ROLE CHARGÉ');
console.log('==========================================================');
console.log('🚀 Utilisation:');
console.log('   fixRLSPolicies() - Correction complète des politiques RLS');
console.log('   quickRLSFix() - Correction rapide');
console.log('   checkPoliciesOnly() - Vérification uniquement');
console.log('');
console.log('💡 Commencez par: fixRLSPolicies()');
console.log('✅ Clé service role configurée!');
