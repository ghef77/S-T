#!/usr/bin/env node

/**
 * Script de surveillance des logs de la fonction snapshot
 * Surveille l'exécution automatique de la fonction
 */

const https = require('https');

// Configuration
const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
const FUNCTION_NAME = 'snapshot_staff_table';

console.log('🔍 Surveillance des logs de la fonction snapshot...\n');
console.log('⏰ Configuration cron: * * * * * (chaque minute)');
console.log('🕐 Heure actuelle:', new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }));
console.log('📊 URL de la fonction:', `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`);
console.log('\n📝 Pour voir les logs en temps réel, utilisez:');
console.log(`   supabase functions logs ${FUNCTION_NAME} --follow`);
console.log('\n🔍 Ou allez sur le dashboard Supabase:');
console.log(`   Functions → ${FUNCTION_NAME} → Logs`);
console.log('\n⏳ Surveillance en cours... (Ctrl+C pour arrêter)');

// Fonction pour vérifier périodiquement l'activité
async function checkFunctionActivity() {
    const now = new Date();
    const parisTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
    
    console.log(`\n🕐 [${parisTime.toLocaleTimeString('fr-FR')}] Vérification de l'activité...`);
    
    try {
        // Test simple d'accessibilité
        const response = await makeRequest(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`, {
            method: 'OPTIONS'
        });
        
        if (response.statusCode === 200) {
            console.log('✅ Fonction accessible');
        } else {
            console.log(`⚠️ Statut: ${response.statusCode}`);
        }
    } catch (error) {
        console.log(`❌ Erreur: ${error.message}`);
    }
}

// Fonction pour faire une requête HTTPS
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Vérification toutes les 30 secondes
const checkInterval = setInterval(checkFunctionActivity, 30000);

// Arrêt propre
process.on('SIGINT', () => {
    console.log('\n\n🛑 Arrêt de la surveillance...');
    clearInterval(checkInterval);
    console.log('✅ Surveillance arrêtée');
    process.exit(0);
});

// Première vérification immédiate
checkFunctionActivity();
