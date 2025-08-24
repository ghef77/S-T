#!/usr/bin/env node

/**
 * Script de vérification du déploiement de la fonction snapshot
 * Vérifie si la fonction est accessible et fonctionnelle
 */

const https = require('https');

// Configuration
const SUPABASE_URL = 'https://fiecugxopjxzqfdnaqsu.supabase.co';
const FUNCTION_NAME = 'snapshot_staff_table';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`;

console.log('🔍 Vérification du déploiement de la fonction snapshot...\n');

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

// Test 1: Vérifier l'accessibilité de la fonction
async function testFunctionAccessibility() {
    console.log('📡 Test 1: Accessibilité de la fonction...');
    
    try {
        const response = await makeRequest(FUNCTION_URL, {
            method: 'OPTIONS'
        });

        if (response.statusCode === 200) {
            console.log('✅ Fonction accessible (CORS OK)');
            return true;
        } else {
            console.log(`⚠️ Fonction accessible mais statut: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Erreur de connexion: ${error.message}`);
        return false;
    }
}

// Test 2: Vérifier la réponse de la fonction
async function testFunctionResponse() {
    console.log('\n🧪 Test 2: Réponse de la fonction...');
    
    try {
        const response = await makeRequest(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`📊 Statut HTTP: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
            console.log('✅ Fonction répond correctement');
            try {
                const result = JSON.parse(response.data);
                console.log('📋 Réponse JSON:', JSON.stringify(result, null, 2));
            } catch (e) {
                console.log('📋 Réponse brute:', response.data);
            }
            return true;
        } else if (response.statusCode === 401) {
            console.log('🔐 Authentification requise (normal)');
            return true;
        } else {
            console.log(`⚠️ Statut inattendu: ${response.statusCode}`);
            console.log('📋 Réponse:', response.data);
            return false;
        }
    } catch (error) {
        console.log(`❌ Erreur lors du test: ${error.message}`);
        return false;
    }
}

// Test 3: Vérifier la configuration cron
async function checkCronConfiguration() {
    console.log('\n⏰ Test 3: Configuration Cron...');
    
    try {
        // Vérifier le fichier cron.json local
        const fs = require('fs');
        const path = require('path');
        
        const cronFile = path.join(__dirname, 'supabase', 'functions', 'snapshot_staff_table', 'cron.json');
        
        if (fs.existsSync(cronFile)) {
            const cronConfig = JSON.parse(fs.readFileSync(cronFile, 'utf8'));
            console.log('📁 Configuration cron locale:', cronConfig);
            
            if (cronConfig.cron === '* * * * *') {
                console.log('✅ Configuration cron correcte: chaque minute');
            } else {
                console.log(`⚠️ Configuration cron différente: ${cronConfig.cron}`);
            }
        } else {
            console.log('❌ Fichier cron.json non trouvé localement');
        }
    } catch (error) {
        console.log(`❌ Erreur lors de la vérification cron: ${error.message}`);
    }
}

// Test 4: Vérifier les logs Supabase
async function checkSupabaseLogs() {
    console.log('\n📝 Test 4: Logs Supabase...');
    console.log('ℹ️ Pour vérifier les logs, allez sur:');
    console.log(`   Dashboard Supabase → Functions → ${FUNCTION_NAME} → Logs`);
    console.log('ℹ️ Ou utilisez la CLI:');
    console.log(`   supabase functions logs ${FUNCTION_NAME} --follow`);
}

// Test principal
async function runAllTests() {
    console.log('🚀 Démarrage des tests de déploiement...\n');
    
    const test1 = await testFunctionAccessibility();
    const test2 = await testFunctionResponse();
    await checkCronConfiguration();
    await checkSupabaseLogs();
    
    console.log('\n📊 Résumé des tests:');
    console.log(`   Accessibilité: ${test1 ? '✅' : '❌'}`);
    console.log(`   Réponse: ${test2 ? '✅' : '❌'}`);
    
    if (test1 && test2) {
        console.log('\n🎉 La fonction semble correctement déployée!');
        console.log('💡 Vérifiez les logs Supabase pour confirmer l\'exécution automatique.');
    } else {
        console.log('\n⚠️ Problèmes détectés avec le déploiement.');
        console.log('🔧 Solutions possibles:');
        console.log('   1. Déployer la fonction: supabase functions deploy snapshot_staff_table');
        console.log('   2. Vérifier les variables d\'environnement');
        console.log('   3. Vérifier les permissions Supabase');
    }
}

// Exécuter les tests
runAllTests().catch(console.error);
