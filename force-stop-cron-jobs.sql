-- =====================================================
-- SCRIPT SQL AGGRESSIF POUR ARRÊTER TOUS LES CRON JOBS
-- =====================================================
-- ATTENTION: Ce script arrête TOUS les cron jobs actifs
-- Utilisez seulement si le problème persiste

-- =====================================================
-- 1. ARRÊTER IMMÉDIATEMENT TOUS LES CRON JOBS
-- =====================================================

-- Désactiver TOUS les cron jobs actifs
UPDATE cron.job 
SET active = false 
WHERE active = true;

-- =====================================================
-- 2. SUPPRIMER TOUS LES CRON JOBS EXISTANTS
-- =====================================================

-- Supprimer TOUS les cron jobs
DELETE FROM cron.job;

-- =====================================================
-- 3. VÉRIFIER QUE TOUT EST SUPPRIMÉ
-- =====================================================

-- Vérifier qu'aucun cron job ne reste
SELECT 
    'Vérification après suppression' as action,
    COUNT(*) as remaining_jobs
FROM cron.job;

-- =====================================================
-- 4. OPTION: SUPPRIMER COMPLÈTEMENT L'EXTENSION CRON
-- =====================================================

-- Si le problème persiste, supprimer l'extension cron
-- DÉCOMMENTEZ LES LIGNES CI-DESSOUS SEULEMENT SI NÉCESSAIRE

/*
-- Supprimer l'extension cron et tous ses objets
DROP EXTENSION IF EXISTS cron CASCADE;

-- Recréer l'extension cron propre
CREATE EXTENSION cron;

-- Vérifier que l'extension est recréée
SELECT 
    'Extension cron recréée' as action,
    extname,
    extversion
FROM pg_extension 
WHERE extname = 'cron';
*/

-- =====================================================
-- 5. VÉRIFICATION FINALE
-- =====================================================

-- Vérifier qu'aucun processus cron n'est actif
SELECT 
    'Vérification des processus actifs' as action,
    COUNT(*) as active_processes
FROM pg_stat_activity 
WHERE query LIKE '%cron%' 
   OR query LIKE '%snapshot%'
   OR query LIKE '%staffTable%';

-- =====================================================
-- 6. RÉINITIALISATION COMPLÈTE (OPTIONNELLE)
-- =====================================================

-- Si vous voulez recréer un cron job propre plus tard
-- DÉCOMMENTEZ ET MODIFIEZ SELON VOS BESOINS

/*
-- Créer un nouveau cron job propre
INSERT INTO cron.job (
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobname
) VALUES (
    '0 10 * * *',  -- Tous les jours à 10h00
    'SELECT cron.snapshot_staff_table();',
    'localhost',
    5432,
    'postgres',
    'postgres',
    true,
    'snapshot_staff_table_clean'
);
*/

-- =====================================================
-- RÉSUMÉ FINAL
-- =====================================================
SELECT 
    'ARRÊT FORCÉ TERMINÉ' as final_status,
    'Tous les cron jobs ont été arrêtés et supprimés' as description,
    'L''extension cron peut être recréée si nécessaire' as note,
    CURRENT_TIMESTAMP as stopped_at;
