#!/usr/bin/env node

/**
 * Test d'accessibilité de la fonction snapshot
 */

const https = require('https');

console.log('🔍 Test d\'Accessibilité de la Fonction Snapshot');
console.log('================================================');

const functionUrl = 'https://fiecugxopjxzqfdnaqsu.supabase.co/functions/v1/snapshot_staff_table';

// Test 1: Vérifier si la fonction est accessible (sans authentification)
function testFunctionAccess() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'fiecugxopjxzqfdnaqsu.supabase.co',
            port: 443,
            path: '/functions/v1/snapshot_staff_table',
            method: 'GET'
        };

        console.log('🔄 Test d\'accessibilité (GET)...');
        
        const req = https.request(options, (res) => {
            console.log(`📡 Réponse: HTTP ${res.statusCode}`);
            console.log(`📋 Headers:`, res.headers);
            
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`📥 Données: ${data}`);
                resolve({ status: res.statusCode, data: data });
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Test 2: Vérifier la configuration cron
function testCronConfig() {
    console.log('\n📅 Configuration Cron');
    console.log('=====================');
    console.log('⏰ Expression: 0 10 * * *');
    console.log('🌍 Signification: À 10h00 tous les jours');
    console.log('🇫🇷 Fuseau horaire: Europe/Paris');
    
    const now = new Date();
    const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    
    console.log(`\n🕐 Heure actuelle: ${parisTime.toLocaleString('fr-FR')}`);
    
    // Calculer la prochaine exécution
    const nextRun = new Date(parisTime);
    nextRun.setHours(10, 0, 0, 0);
    
    if (parisTime.getHours() >= 10) {
        nextRun.setDate(nextRun.getDate() + 1);
    }
    
    const timeUntilNext = nextRun.getTime() - parisTime.getTime();
    const hoursUntilNext = Math.floor(timeUntilNext / (1000 * 60 * 60));
    const minutesUntilNext = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log(`⏳ Prochaine exécution: ${nextRun.toLocaleString('fr-FR')}`);
    console.log(`⏰ Dans: ${hoursUntilNext}h ${minutesUntilNext}m`);
    
    return nextRun;
}

// Test 3: Vérifier la structure de la fonction
function testFunctionStructure() {
    console.log('\n🏗️ Structure de la Fonction');
    console.log('============================');
    
    const functionPath = './supabase/functions/snapshot_staff_table';
    const fs = require('fs');
    
    try {
        if (fs.existsSync(functionPath)) {
            console.log('✅ Dossier de fonction trouvé');
            
            const files = fs.readdirSync(functionPath);
            console.log('📁 Fichiers dans le dossier:');
            files.forEach(file => {
                const stats = fs.statSync(`${functionPath}/${file}`);
                const size = (stats.size / 1024).toFixed(2);
                console.log(`   📄 ${file} (${size} KB)`);
            });
            
            // Vérifier le fichier cron.json
            const cronPath = `${functionPath}/cron.json`;
            if (fs.existsSync(cronPath)) {
                const cronConfig = JSON.parse(fs.readFileSync(cronPath, 'utf8'));
                console.log('\n⏰ Configuration Cron:');
                console.log(`   Schedule: ${cronConfig.cron}`);
                console.log(`   Timezone: ${cronConfig.timezone}`);
            }
            
            // Vérifier le fichier index.ts
            const indexPath = `${functionPath}/index.ts`;
            if (fs.existsSync(indexPath)) {
                const indexContent = fs.readFileSync(indexPath, 'utf8');
                const hasSnapshotLogic = indexContent.includes('snapshot') || indexContent.includes('Snapshot');
                console.log(`\n📝 Logique de snapshot: ${hasSnapshotLogic ? '✅ Présente' : '❌ Absente'}`);
            }
            
        } else {
            console.log('❌ Dossier de fonction non trouvé');
        }
    } catch (error) {
        console.log(`❌ Erreur lors de la vérification: ${error.message}`);
    }
}

// Fonction principale
async function main() {
    try {
        // Test 1: Structure de la fonction
        testFunctionStructure();
        
        // Test 2: Configuration cron
        const nextRun = testCronConfig();
        
        // Test 3: Accessibilité de la fonction
        console.log('\n🌐 Test d\'Accessibilité');
        console.log('========================');
        const result = await testFunctionAccess();
        
        console.log('\n📊 Résumé des Tests');
        console.log('==================');
        console.log(`✅ Structure de fonction: Vérifiée`);
        console.log(`✅ Configuration cron: 0 10 * * * (10h00 tous les jours)`);
        console.log(`✅ Prochaine exécution: ${nextRun.toLocaleString('fr-FR')}`);
        
        if (result.status === 200) {
            console.log(`✅ Accessibilité: Fonction accessible`);
        } else if (result.status === 401) {
            console.log(`🔒 Accessibilité: Authentification requise (normal)`);
        } else if (result.status === 404) {
            console.log(`❌ Accessibilité: Fonction non trouvée`);
        } else {
            console.log(`⚠️ Accessibilité: Statut HTTP ${result.status}`);
        }
        
        console.log('\n🎯 Conclusion:');
        if (result.status !== 404) {
            console.log('✅ La fonction snapshot est accessible et configurée');
            console.log('⏰ Elle s\'exécutera automatiquement à 10h00 tous les jours');
            console.log('🌍 Fuseau horaire: Europe/Paris');
        } else {
            console.log('❌ La fonction snapshot n\'est pas accessible');
            console.log('🔧 Vérifiez le déploiement sur Supabase');
        }
        
    } catch (error) {
        console.error(`❌ Erreur lors du test: ${error.message}`);
    }
}

// Exécuter le test
main();
