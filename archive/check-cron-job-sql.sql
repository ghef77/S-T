-- ========================================
-- VÉRIFICATION DU CRON JOB
-- ========================================

-- 1. VÉRIFIER LES EXTENSIONS ACTIVÉES
SELECT 
    'EXTENSIONS ACTIVÉES' as info;

SELECT 
    extname,
    extversion,
    CASE 
        WHEN extname = 'pg_cron' THEN '✅ CRON ACTIVÉ'
        WHEN extname = 'http' THEN '✅ HTTP ACTIVÉ'
        ELSE '❓ AUTRE EXTENSION'
    END as statut
FROM pg_extension 
WHERE extname IN ('pg_cron', 'http');

-- 2. VÉRIFIER LES JOBS CRON ACTIFS
SELECT 
    'JOBS CRON ACTIFS' as info;

SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active,
    CASE 
        WHEN active = true THEN '✅ ACTIF'
        ELSE '❌ INACTIF'
    END as statut_activation
FROM cron.job 
WHERE jobname LIKE '%snapshot%' OR command LIKE '%snapshot%';

-- 3. VÉRIFIER L'HISTORIQUE D'EXÉCUTION
SELECT 
    'HISTORIQUE D EXÉCUTION' as info;

SELECT 
    jobid,
    runid,
    status,
    return_message,
    start_time,
    end_time,
    CASE 
        WHEN status = 'succeeded' THEN '✅ SUCCÈS'
        WHEN status = 'failed' THEN '❌ ÉCHEC'
        ELSE '⚠️ AUTRE STATUT'
    END as statut_execution
FROM cron.job_run_details 
WHERE jobid IN (
    SELECT jobid FROM cron.job 
    WHERE jobname LIKE '%snapshot%' OR command LIKE '%snapshot%'
)
ORDER BY start_time DESC 
LIMIT 10;

-- 4. VÉRIFIER LES SNAPSHOTS CRÉÉS PAR CRON
SELECT 
    'SNAPSHOTS CRÉÉS PAR CRON' as info;

SELECT 
    snapshot_date,
    created_at,
    object_path,
    row_count,
    CASE 
        WHEN created_at::time BETWEEN '06:00:00' AND '07:59:59' THEN '✅ CRÉÉ PAR CRON (06-07h)'
        WHEN created_at::time BETWEEN '08:00:00' AND '09:59:59' THEN '❌ PROBLÉMATIQUE (08-09h)'
        ELSE '⚠️ AUTRE HEURE'
    END as source_creation
FROM table_snapshots_index 
WHERE snapshot_date = '2025-08-23'
ORDER BY created_at DESC;

-- 5. VÉRIFIER LES INCONSISTANCES
SELECT 
    'INCONSISTANCES IDENTIFIÉES' as info;

SELECT 
    'PROBLÈME 1:' as type_probleme,
    'Entrées en base sans fichiers correspondants' as description,
    COUNT(*) as nombre_entrees_problematiques
FROM table_snapshots_index 
WHERE snapshot_date = '2025-08-23' 
AND (object_path LIKE '%08-55%' OR object_path LIKE '%08-58%' OR object_path LIKE '%09-00%')

UNION ALL

SELECT 
    'PROBLÈME 2:' as type_probleme,
    'Fichiers créés par fonction Edge mais pas par cron' as description,
    COUNT(*) as nombre_entrees_correctes
FROM table_snapshots_index 
WHERE snapshot_date = '2025-08-23' 
AND (object_path LIKE '%06-%' OR object_path LIKE '%07-%');

-- 6. SOLUTION PROPOSÉE
SELECT 
    'SOLUTION PROPOSÉE' as info;

SELECT 
    'ÉTAPE 1:' as etape,
    'Supprimer les entrées problématiques (08-55, 08-58, 09-00)' as action

UNION ALL

SELECT 
    'ÉTAPE 2:' as etape,
    'S assurer que le cron job appelle la fonction Edge et non pas des INSERT directs'

UNION ALL

SELECT 
    'ÉTAPE 3:' as etape,
    'Vérifier que la fonction Edge est bien appelée par le cron job automatique';
