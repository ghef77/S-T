-- =====================================================
-- NETTOYAGE SIMPLE DES SNAPSHOTS
-- =====================================================
-- Ce script nettoie UNIQUEMENT la table des snapshots
-- SANS modifier la configuration cron (permissions insuffisantes)

-- =====================================================
-- 1. NETTOYAGE COMPLET DE LA TABLE
-- =====================================================

-- Supprimer TOUS les snapshots existants
DELETE FROM table_snapshots_index;

-- Vérifier que la table est vide
SELECT 
    'Vérification nettoyage' as action,
    COUNT(*) as snapshots_restants
FROM table_snapshots_index;

-- =====================================================
-- 2. RÉINITIALISATION DES SÉQUENCES (si elles existent)
-- =====================================================

-- Réinitialiser la séquence d'ID si elle existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'table_snapshots_index_id_seq') THEN
        ALTER SEQUENCE table_snapshots_index_id_seq RESTART WITH 1;
        RAISE NOTICE 'Séquence ID réinitialisée';
    ELSE
        RAISE NOTICE 'Aucune séquence ID trouvée';
    END IF;
END $$;

-- =====================================================
-- 3. VÉRIFICATION DE L'ÉTAT FINAL
-- =====================================================

-- Résumé de l'opération
SELECT 
    'NETTOYAGE TERMINÉ' as section,
    'Table des snapshots vidée' as status,
    'Prête pour nouveaux snapshots quotidiens' as table_status,
    CURRENT_TIMESTAMP as cleaned_at;

-- Vérifier l'état final
SELECT 
    'État final' as check_type,
    COUNT(*) as snapshots_in_table
FROM table_snapshots_index;

-- =====================================================
-- 4. INSTRUCTIONS POST-NETTOYAGE
-- =====================================================

-- Note importante pour l'utilisateur
SELECT 
    'INSTRUCTIONS SUIVANTES' as section,
    '1. Supprimez la fonction Edge via Dashboard Supabase' as step_1,
    '2. Recréez la fonction avec cron "0 10 * * *"' as step_2,
    '3. Attendez le prochain snapshot à 10h00' as step_3,
    '4. Surveillez avec monitor-cron-fix.js' as step_4;
