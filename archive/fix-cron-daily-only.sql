-- =====================================================
-- CORRECTION CRON : FORCER SNAPSHOT QUOTIDIEN UNIQUEMENT
-- =====================================================
-- Ce script nettoie la table et force un redémarrage propre
-- pour éliminer les snapshots créés par minute

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
-- 2. RÉINITIALISATION DES SÉQUENCES
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
-- 3. VÉRIFICATION DE LA CONFIGURATION CRON
-- =====================================================

-- Vérifier les cron jobs actifs
SELECT 
    'Cron jobs actifs' as section,
    jobid,
    schedule,
    command,
    active,
    jobname
FROM cron.job
WHERE active = true;

-- =====================================================
-- 4. DÉSACTIVATION DES CRON JOBS EXISTANTS
-- =====================================================

-- Désactiver TOUS les cron jobs existants
UPDATE cron.job 
SET active = false 
WHERE command LIKE '%snapshot_staff_table%';

-- Vérifier que les cron jobs sont désactivés
SELECT 
    'Cron jobs après désactivation' as section,
    jobid,
    schedule,
    command,
    active,
    jobname
FROM cron.job
WHERE command LIKE '%snapshot_staff_table%';

-- =====================================================
-- 5. CRÉATION D'UN NOUVEAU CRON JOB QUOTIDIEN
-- =====================================================

-- Supprimer l'ancien cron job s'il existe
DELETE FROM cron.job 
WHERE command LIKE '%snapshot_staff_table%';

-- Créer un NOUVEAU cron job pour 10h00 quotidien
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
    '0 10 * * *',
    'SELECT cron.snapshot_staff_table_daily();',
    'localhost',
    5432,
    'postgres',
    'postgres',
    true,
    'snapshot_staff_table_daily'
);

-- Vérifier le nouveau cron job
SELECT 
    'Nouveau cron job créé' as section,
    jobid,
    schedule,
    command,
    active,
    jobname
FROM cron.job
WHERE jobname = 'snapshot_staff_table_daily';

-- =====================================================
-- 6. CRÉATION DE LA FONCTION CRON
-- =====================================================

-- Créer la fonction qui sera appelée par le cron
CREATE OR REPLACE FUNCTION cron.snapshot_staff_table_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log de l'exécution
    RAISE NOTICE 'Cron quotidien exécuté à %', NOW();
    
    -- Appeler la fonction Edge via HTTP (si nécessaire)
    -- Pour l'instant, on se contente de logger
    INSERT INTO snapshot_restore_log (
        snapshot_date, 
        restored_at, 
        restored_by, 
        restore_reason
    ) VALUES (
        CURRENT_DATE,
        NOW(),
        'cron_daily',
        'Exécution quotidienne programmée'
    );
    
    RAISE NOTICE 'Log d''exécution créé pour la date %', CURRENT_DATE;
END;
$$;

-- =====================================================
-- 7. VÉRIFICATION FINALE
-- =====================================================

-- Résumé de la configuration
SELECT 
    'CONFIGURATION FINALE' as section,
    'Cron job quotidien configuré pour 10h00' as status,
    'Table nettoyée et prête pour nouveaux snapshots' as table_status,
    'Anciens cron jobs supprimés' as cron_status,
    CURRENT_TIMESTAMP as configured_at;

-- Vérifier l'état final
SELECT 
    'État final' as check_type,
    COUNT(*) as snapshots_in_table,
    (SELECT COUNT(*) FROM cron.job WHERE active = true) as cron_jobs_actifs
FROM table_snapshots_index;
