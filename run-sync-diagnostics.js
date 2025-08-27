/**
 * Script pour exécuter directement les diagnostics de synchronisation
 */

// Import des modules de diagnostic
const fs = require('fs');
const path = require('path');

// Fonction pour charger et exécuter les diagnostics dans un environnement Node.js
async function runSyncDiagnostics() {
    console.log('🔍 Démarrage des diagnostics de synchronisation...');
    
    try {
        // Simuler l'environnement navigateur pour les diagnostics
        global.window = {
            supabase: null,
            realtimeSubscription: null,
            isLocalSaveInProgress: false,
            isRestoringCursor: false,
            isExcelSaveInProgress: false,
            snapshotMode: 'live'
        };
        
        console.log('📋 Vérification des flags de blocage...');
        const blockingFlags = checkBlockingFlags();
        console.log('Flags de blocage:', blockingFlags);
        
        console.log('📊 Vérification de la structure des fichiers...');
        const fileStructure = await checkFileStructure();
        console.log('Structure des fichiers:', fileStructure);
        
        console.log('🔧 Vérification des outils de correction...');
        const fixTools = checkFixTools();
        console.log('Outils disponibles:', fixTools);
        
        console.log('✅ Diagnostic terminé!');
        
        return {
            blockingFlags,
            fileStructure,
            fixTools,
            status: 'COMPLETED',
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
        return {
            status: 'FAILED',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

function checkBlockingFlags() {
    return {
        isLocalSaveInProgress: global.window.isLocalSaveInProgress,
        isRestoringCursor: global.window.isRestoringCursor,
        isExcelSaveInProgress: global.window.isExcelSaveInProgress,
        snapshotMode: global.window.snapshotMode,
        hasBlockingFlags: false
    };
}

async function checkFileStructure() {
    const basePath = __dirname;
    const diagnosticFiles = [
        'realtime-sync-diagnostics.js',
        'realtime-sync-fix.js',
        'supabase-diagnostic.js',
        'supabase-connection.js'
    ];
    
    const results = {};
    
    for (const file of diagnosticFiles) {
        const filePath = path.join(basePath, file);
        try {
            const stats = fs.statSync(filePath);
            results[file] = {
                exists: true,
                size: stats.size,
                modified: stats.mtime.toISOString()
            };
        } catch (error) {
            results[file] = {
                exists: false,
                error: error.message
            };
        }
    }
    
    return results;
}

function checkFixTools() {
    const tools = [
        {
            name: 'Realtime Diagnostics',
            file: 'realtime-sync-diagnostics.js',
            functions: [
                'runComprehensiveDiagnostics',
                'testSupabaseConnection',
                'testRealtimeSubscription',
                'fixRealtimeSubscription'
            ]
        },
        {
            name: 'Realtime Fix',
            file: 'realtime-sync-fix.js',
            functions: [
                'forceReconnect',
                'clearBlockingFlags',
                'checkAndRecoverConnection'
            ]
        },
        {
            name: 'Supabase Diagnostic',
            file: 'supabase-diagnostic.js',
            functions: [
                'testConnection',
                'checkPermissions'
            ]
        }
    ];
    
    return tools;
}

// Fonction pour générer un rapport détaillé
function generateReport(diagnostics) {
    console.log('\n📋 RAPPORT DE DIAGNOSTIC COMPLET');
    console.log('=====================================');
    console.log(`Timestamp: ${diagnostics.timestamp}`);
    console.log(`Statut: ${diagnostics.status}`);
    
    if (diagnostics.status === 'FAILED') {
        console.log(`❌ Erreur: ${diagnostics.error}`);
        return;
    }
    
    console.log('\n🏁 FLAGS DE BLOCAGE:');
    Object.entries(diagnostics.blockingFlags).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
    });
    
    console.log('\n📁 STRUCTURE DES FICHIERS:');
    Object.entries(diagnostics.fileStructure).forEach(([file, info]) => {
        if (info.exists) {
            console.log(`  ✅ ${file} (${info.size} bytes, modifié: ${info.modified})`);
        } else {
            console.log(`  ❌ ${file} - MANQUANT (${info.error})`);
        }
    });
    
    console.log('\n🛠️ OUTILS DISPONIBLES:');
    diagnostics.fixTools.forEach(tool => {
        console.log(`  📦 ${tool.name} (${tool.file})`);
        tool.functions.forEach(func => {
            console.log(`    - ${func}()`);
        });
    });
    
    console.log('\n💡 RECOMMANDATIONS:');
    console.log('  1. Ouvrir le navigateur sur http://localhost:8001');
    console.log('  2. Ouvrir la console développeur (F12)');
    console.log('  3. Exécuter: window.diagnoseRealtime()');
    console.log('  4. Si des problèmes sont détectés: window.fixRealtime()');
    console.log('  5. Pour forcer une reconnexion: window.forceRealtimeReconnect()');
    
    console.log('\n🔧 COMMANDES RAPIDES:');
    console.log('  window.diagnoseRealtime()      - Diagnostic complet');
    console.log('  window.fixRealtime()           - Correction automatique');
    console.log('  window.forceRealtimeReconnect()- Reconnexion forcée');
    console.log('  window.getRealtimeStatus()     - État actuel');
    console.log('  window.clearRealtimeFlags()    - Vider les flags');
}

// Exécution du diagnostic
if (require.main === module) {
    runSyncDiagnostics().then(result => {
        generateReport(result);
        process.exit(result.status === 'COMPLETED' ? 0 : 1);
    });
}

module.exports = { runSyncDiagnostics, generateReport };