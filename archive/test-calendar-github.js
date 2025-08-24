// =====================================================
// SCRIPT DE TEST DU CALENDRIER - PROBLÈMES GITHUB
// =====================================================
// Ce script teste les fonctionnalités du calendrier qui posent problème sur GitHub

// Configuration du test
const TEST_TIMEOUT = 5000; // 5 secondes de timeout
let testResults = {
    zIndex: false,
    monthNavigation: false,
    cssClasses: false,
    eventHandlers: false,
    globalFunctions: false
};

// Fonction principale de test
async function testCalendarGitHub() {
    console.log('🧪 DÉMARRAGE DU TEST DU CALENDRIER GITHUB');
    console.log('⏱️  Timeout: 5 secondes');
    console.log('🎯 Objectif: Identifier les problèmes de compatibilité GitHub');
    console.log('=' .repeat(70));

    try {
        // Attendre que la page soit chargée
        await waitForPageLoad();
        
        // Lancer tous les tests
        await runAllTests();
        
        // Générer le rapport final
        generateTestReport();
        
    } catch (error) {
        console.error('❌ Erreur lors du test du calendrier:', error);
    }
}

// Attendre que la page soit chargée
function waitForPageLoad() {
    return new Promise((resolve) => {
        if (document.readyState === 'complete') {
            resolve();
        } else {
            window.addEventListener('load', resolve);
        }
    });
}

// Lancer tous les tests
async function runAllTests() {
    console.log('\n🔍 LANCEMENT DES TESTS...');
    
    // Test 1: Vérification des Z-Index
    testResults.zIndex = await testZIndex();
    
    // Test 2: Vérification de la Navigation par Mois
    testResults.monthNavigation = await testMonthNavigation();
    
    // Test 3: Vérification des Classes CSS
    testResults.cssClasses = await testCalendarCSS();
    
    // Test 4: Vérification des Gestionnaires d'Événements
    testResults.eventHandlers = await testEventHandlers();
    
    // Test 5: Vérification des Fonctions Globales
    testResults.globalFunctions = await testGlobalFunctions();
    
    console.log('\n📊 RÉSULTATS DES TESTS:');
    console.log(`   Z-Index: ${testResults.zIndex ? '✅' : '❌'}`);
    console.log(`   Navigation par mois: ${testResults.monthNavigation ? '✅' : '❌'}`);
    console.log(`   Classes CSS: ${testResults.cssClasses ? '✅' : '❌'}`);
    console.log(`   Gestionnaires d'événements: ${testResults.eventHandlers ? '✅' : '❌'}`);
    console.log(`   Fonctions globales: ${testResults.globalFunctions ? '✅' : '❌'}`);
}

// Test 1: Vérification des Z-Index
async function testZIndex() {
    console.log('\n🔍 Test 1: Vérification des Z-Index...');
    
    try {
        // Vérifier le calendrier principal
        const calendar = document.querySelector('#snapshot-calendar-dropdown');
        if (!calendar) {
            console.log('❌ Élément calendrier non trouvé');
            return false;
        }
        
        const computedStyle = window.getComputedStyle(calendar);
        const zIndex = computedStyle.zIndex;
        console.log(`📊 Z-Index du calendrier: ${zIndex}`);
        
        // Vérifier les autres éléments avec z-index
        const elementsWithZIndex = document.querySelectorAll('[style*="z-index"], [class*="z-"]');
        console.log(`📊 Éléments avec z-index trouvés: ${elementsWithZIndex.length}`);
        
        // Vérifier la hiérarchie
        const calendarZ = parseInt(zIndex) || 0;
        const tableZ = parseInt(window.getComputedStyle(document.querySelector('table')).zIndex) || 0;
        
        if (calendarZ > tableZ) {
            console.log('✅ Hiérarchie z-index correcte (calendrier > table)');
            return true;
        } else {
            console.log('❌ Hiérarchie z-index incorrecte');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test des z-index:', error);
        return false;
    }
}

// Test 2: Vérification de la Navigation par Mois
async function testMonthNavigation() {
    console.log('\n🔍 Test 2: Vérification de la Navigation par Mois...');
    
    try {
        // Vérifier que la fonction existe
        if (typeof window.showMonthSnapshots !== 'function') {
            console.log('❌ Fonction showMonthSnapshots non trouvée');
            return false;
        }
        
        console.log('✅ Fonction showMonthSnapshots trouvée');
        
        // Vérifier que populateSnapshotCalendar existe
        if (typeof window.populateSnapshotCalendar !== 'function') {
            console.log('❌ Fonction populateSnapshotCalendar non trouvée');
            return false;
        }
        
        console.log('✅ Fonction populateSnapshotCalendar trouvée');
        
        // Vérifier les boutons de navigation par mois
        const monthButtons = document.querySelectorAll('.month-nav-btn');
        console.log(`📊 Boutons de navigation par mois trouvés: ${monthButtons.length}`);
        
        if (monthButtons.length > 0) {
            console.log('✅ Boutons de navigation par mois trouvés');
            return true;
        } else {
            console.log('❌ Aucun bouton de navigation par mois trouvé');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test de la navigation par mois:', error);
        return false;
    }
}

// Test 3: Vérification des Classes CSS
async function testCalendarCSS() {
    console.log('\n🔍 Test 3: Vérification des Classes CSS...');
    
    try {
        const requiredClasses = [
            '.month-nav-btn',
            '.month-content',
            '.week-header',
            '.snapshot-item',
            '.sticky-month-nav'
        ];
        
        let foundClasses = 0;
        
        for (const className of requiredClasses) {
            const elements = document.querySelectorAll(className);
            if (elements.length > 0) {
                console.log(`✅ Classe ${className} trouvée (${elements.length} éléments)`);
                foundClasses++;
            } else {
                console.log(`❌ Classe ${className} non trouvée`);
            }
        }
        
        const successRate = foundClasses / requiredClasses.length;
        console.log(`📊 Taux de réussite CSS: ${Math.round(successRate * 100)}%`);
        
        return successRate >= 0.8; // Au moins 80% des classes doivent être trouvées
        
    } catch (error) {
        console.error('❌ Erreur lors du test des classes CSS:', error);
        return false;
    }
}

// Test 4: Vérification des Gestionnaires d'Événements
async function testEventHandlers() {
    console.log('\n🔍 Test 4: Vérification des Gestionnaires d\'Événements...');
    
    try {
        // Vérifier les onclick
        const elementsWithOnclick = document.querySelectorAll('[onclick]');
        console.log(`📊 Éléments avec onclick trouvés: ${elementsWithOnclick.length}`);
        
        if (elementsWithOnclick.length > 0) {
            console.log('⚠️  Éléments avec onclick détectés (peuvent poser problème sur GitHub)');
            
            // Vérifier les onclick du calendrier
            const calendarOnclicks = Array.from(elementsWithOnclick).filter(el => 
                el.onclick.toString().includes('showMonthSnapshots')
            );
            
            console.log(`📊 Onclick du calendrier trouvés: ${calendarOnclicks.length}`);
            
            if (calendarOnclicks.length > 0) {
                console.log('❌ Onclick du calendrier détectés (problématique sur GitHub)');
                return false;
            }
        }
        
        // Vérifier les addEventListener
        const calendarButton = document.querySelector('#snapshot-calendar-btn');
        if (calendarButton) {
            console.log('✅ Bouton du calendrier trouvé');
            return true;
        } else {
            console.log('❌ Bouton du calendrier non trouvé');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test des gestionnaires d\'événements:', error);
        return false;
    }
}

// Test 5: Vérification des Fonctions Globales
async function testGlobalFunctions() {
    console.log('\n🔍 Test 5: Vérification des Fonctions Globales...');
    
    try {
        const requiredFunctions = [
            'showMonthSnapshots',
            'populateSnapshotCalendar',
            'toggleSnapshotCalendar'
        ];
        
        let foundFunctions = 0;
        
        for (const funcName of requiredFunctions) {
            if (typeof window[funcName] === 'function') {
                console.log(`✅ Fonction ${funcName} trouvée`);
                foundFunctions++;
            } else {
                console.log(`❌ Fonction ${funcName} non trouvée`);
            }
        }
        
        const successRate = foundFunctions / requiredFunctions.length;
        console.log(`📊 Taux de réussite des fonctions: ${Math.round(successRate * 100)}%`);
        
        return successRate >= 0.8; // Au moins 80% des fonctions doivent être trouvées
        
    } catch (error) {
        console.error('❌ Erreur lors du test des fonctions globales:', error);
        return false;
    }
}

// Générer le rapport final
function generateTestReport() {
    console.log('\n📋 RAPPORT FINAL DU TEST CALENDRIER');
    console.log('=' .repeat(50));
    
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const successRate = (passedTests / totalTests) * 100;
    
    console.log(`📊 Résultats: ${passedTests}/${totalTests} tests réussis (${Math.round(successRate)}%)`);
    
    if (successRate >= 80) {
        console.log('🎉 SUCCÈS: Le calendrier semble fonctionner correctement !');
        console.log('✅ Compatibilité GitHub probable');
    } else if (successRate >= 60) {
        console.log('⚠️  ATTENTION: Le calendrier a des problèmes mineurs');
        console.log('🔧 Corrections recommandées avant déploiement GitHub');
    } else {
        console.log('❌ PROBLÈME: Le calendrier a des problèmes majeurs');
        console.log('🚨 Corrections obligatoires avant déploiement GitHub');
    }
    
    console.log('\n🔍 Détail des problèmes:');
    
    if (!testResults.zIndex) {
        console.log('   ❌ Z-Index: Problèmes de hiérarchie ou de valeurs');
    }
    
    if (!testResults.monthNavigation) {
        console.log('   ❌ Navigation par mois: Fonctions manquantes ou boutons non trouvés');
    }
    
    if (!testResults.cssClasses) {
        console.log('   ❌ Classes CSS: Styles du calendrier non appliqués');
    }
    
    if (!testResults.eventHandlers) {
        console.log('   ❌ Gestionnaires d\'événements: Onclick problématiques détectés');
    }
    
    if (!testResults.globalFunctions) {
        console.log('   ❌ Fonctions globales: Fonctions du calendrier non accessibles');
    }
    
    console.log('\n🚀 Actions recommandées:');
    
    if (successRate < 80) {
        console.log('   1. Corriger les z-index problématiques');
        console.log('   2. Remplacer les onclick par addEventListener');
        console.log('   3. Vérifier que toutes les classes CSS sont appliquées');
        console.log('   4. S\'assurer que les fonctions globales sont définies');
        console.log('   5. Tester localement avant déploiement GitHub');
    } else {
        console.log('   1. Déployer sur GitHub');
        console.log('   2. Tester le calendrier sur GitHub Pages');
        console.log('   3. Vérifier que la navigation par mois fonctionne');
    }
}

// Fonction pour démarrer le test
function startCalendarTest() {
    console.log('🧪 Démarrage du test du calendrier GitHub...');
    testCalendarGitHub();
}

// Exposer la fonction globalement
if (typeof window !== 'undefined') {
    window.testCalendarGitHub = startCalendarTest;
} else {
    // Mode Node.js
    startCalendarTest();
}

// Auto-démarrage si exécuté directement
if (typeof require !== 'undefined' && require.main === module) {
    startCalendarTest();
}

