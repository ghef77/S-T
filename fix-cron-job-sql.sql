-- =====================================================
-- SCRIPT SQL POUR CORRIGER LE CRON JOB
-- =====================================================
-- Ce script modifie directement la configuration du cron job
-- pour arrêter l'exécution toutes les minutes

-- =====================================================
-- 1. VÉRIFIER LA CONFIGURATION ACTUELLE DU CRON
-- =====================================================

-- Vérifier les jobs cron actifs
SELECT 
    'Configuration actuelle des cron jobs' as action,
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job 
WHERE command LIKE '%snapshot_staff_table%' 
   OR command LIKE '%snapshot%'
   OR command LIKE '%staffTable%';

-- =====================================================
-- 2. ARRÊTER TOUS LES CRON JOBS ACTIFS
-- =====================================================

-- Désactiver tous les cron jobs liés aux snapshots
UPDATE cron.job 
SET active = false 
WHERE command LIKE '%snapshot_staff_table%' 
   OR command LIKE '%snapshot%'
   OR command LIKE '%staffTable%';

-- =====================================================
-- 3. SUPPRIMER LES ANCIENS CRON JOBS
-- =====================================================

-- Supprimer complètement les anciens cron jobs
DELETE FROM cron.job 
WHERE command LIKE '%snapshot_staff_table%' 
   OR command LIKE '%snapshot%'
   OR command LIKE '%staffTable%';

-- =====================================================
-- 4. CRÉER UN NOUVEAU CRON JOB CORRECT
-- =====================================================

-- Insérer un nouveau cron job qui tourne seulement à 10h00
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
    'SELECT cron.snapshot_staff_table();',  -- Appel de la fonction
    'localhost',    -- Nœud local
    5432,          -- Port par défaut
    'postgres',    -- Base de données
    'postgres',    -- Utilisateur
    true,          -- Actif
    'snapshot_staff_table_daily'  -- Nom du job
);

-- =====================================================
-- 5. VÉRIFIER LA NOUVELLE CONFIGURATION
-- =====================================================

-- Vérifier que le nouveau cron job est créé
SELECT 
    'Nouveau cron job créé' as action,
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobname
FROM cron.job 
WHERE jobname = 'snapshot_staff_table_daily';

-- =====================================================
-- 6. VÉRIFIER QU'AUCUN AUTRE CRON JOB N'EST ACTIF
-- =====================================================

-- Lister tous les cron jobs actifs
SELECT 
    'Tous les cron jobs actifs' as action,
    jobid,
    schedule,
    command,
    jobname,
    active
FROM cron.job 
WHERE active = true
ORDER BY jobid;

-- =====================================================
-- 7. OPTION: SUPPRIMER COMPLÈTEMENT L'EXTENSION CRON
-- =====================================================
-- Si le problème persiste, vous pouvez supprimer complètement l'extension cron

/*
-- ATTENTION: Cette commande supprime TOUS les cron jobs
-- Utilisez seulement si nécessaire

-- Supprimer l'extension cron complètement
DROP EXTENSION IF EXISTS cron CASCADE;

-- Puis recréer l'extension
CREATE EXTENSION cron;
*/

-- =====================================================
-- 8. VÉRIFICATION FINALE
-- =====================================================

-- Vérifier qu'aucun cron job ne tourne toutes les minutes
SELECT 
    'Vérification des cron jobs problématiques' as action,
    COUNT(*) as problematic_jobs
FROM cron.job 
WHERE active = true 
  AND (schedule LIKE '%* * * * *%'  -- Toutes les minutes
    OR schedule LIKE '%*/1 * * * *%'  -- Toutes les minutes
    OR schedule LIKE '%* * * * * *%'); -- Toutes les secondes

-- =====================================================
-- RÉSUMÉ DES ACTIONS
-- =====================================================
SELECT 
    'RÉSUMÉ DES ACTIONS EFFECTUÉES' as summary,
    '1. Anciens cron jobs supprimés' as action1,
    '2. Nouveau cron job créé (10h00 quotidien)' as action2,
    '3. Vérification de la configuration' as action3,
    CURRENT_TIMESTAMP as executed_at;
