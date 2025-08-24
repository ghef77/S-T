-- =====================================================
-- SCRIPT DE VÉRIFICATION DES TEMPS D'EXÉCUTION CRON
-- =====================================================
-- Ce script permet de vérifier quand les cron jobs s'exécutent
-- et d'analyser leurs patterns d'exécution

-- =====================================================
-- 1. VÉRIFICATION DES CRON JOBS ACTIFS
-- =====================================================

-- Lister tous les cron jobs configurés
SELECT 
    'Cron Jobs Configurés' as section,
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
ORDER BY jobid;

-- =====================================================
-- 2. ANALYSE DES INSERTIONS RÉCENTES DANS LA TABLE
-- =====================================================

-- Vérifier les insertions récentes pour détecter le pattern d'exécution
SELECT 
    'Insertions Récentes (Dernières 24h)' as section,
    snapshot_date,
    created_at,
    object_path,
    row_count,
    -- Calculer la différence entre les insertions
    EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) / 60 as minutes_since_last
FROM table_snapshots_index 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 50;

-- =====================================================
-- 3. PATTERN D'EXÉCUTION PAR HEURE
-- =====================================================

-- Analyser les heures d'exécution pour identifier les patterns
SELECT 
    'Pattern d''Exécution par Heure' as section,
    EXTRACT(HOUR FROM created_at) as hour_of_day,
    EXTRACT(MINUTE FROM created_at) as minute_of_hour,
    COUNT(*) as execution_count,
    MIN(created_at) as first_execution,
    MAX(created_at) as last_execution
FROM table_snapshots_index 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at), EXTRACT(MINUTE FROM created_at)
ORDER BY hour_of_day, minute_of_hour;

-- =====================================================
-- 4. FRÉQUENCE D'EXÉCUTION (DERNIÈRES 2 HEURES)
-- =====================================================

-- Vérifier si le cron s'exécute chaque minute
SELECT 
    'Fréquence d''Exécution (2 dernières heures)' as section,
    DATE_TRUNC('minute', created_at) as execution_minute,
    COUNT(*) as snapshots_per_minute
FROM table_snapshots_index 
WHERE created_at >= NOW() - INTERVAL '2 hours'
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY execution_minute DESC;

-- =====================================================
-- 5. DÉTECTION DE CRON CHAQUE MINUTE
-- =====================================================

-- Compter les exécutions par minute pour détecter un cron "minute"
WITH minute_counts AS (
    SELECT 
        DATE_TRUNC('minute', created_at) as minute_slot,
        COUNT(*) as count_per_minute
    FROM table_snapshots_index 
    WHERE created_at >= NOW() - INTERVAL '1 hour'
    GROUP BY DATE_TRUNC('minute', created_at)
)
SELECT 
    'Diagnostic: Cron chaque minute?' as section,
    COUNT(*) as total_minutes_with_snapshots,
    AVG(count_per_minute) as avg_snapshots_per_minute,
    MAX(count_per_minute) as max_snapshots_per_minute,
    CASE 
        WHEN COUNT(*) > 50 THEN '🚨 CRON CHAQUE MINUTE DÉTECTÉ!'
        WHEN COUNT(*) > 10 THEN '⚠️ Fréquence élevée détectée'
        ELSE '✅ Fréquence normale'
    END as diagnostic
FROM minute_counts;

-- =====================================================
-- 6. DERNIÈRES EXÉCUTIONS AVEC DÉTAILS
-- =====================================================

-- Afficher les 10 dernières exécutions avec métadonnées
SELECT 
    'Dernières Exécutions' as section,
    id,
    snapshot_date,
    created_at,
    object_path,
    row_count,
    file_size_bytes,
    -- Extraire les métadonnées si disponibles
    metadata->>'executionType' as execution_type,
    metadata->>'scheduledTime' as scheduled_time,
    -- Calculer le temps depuis la dernière exécution
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as minutes_ago
FROM table_snapshots_index 
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 7. VÉRIFICATION DES HORAIRES D'EXÉCUTION
-- =====================================================

-- Analyser si les exécutions correspondent à 10h00 comme prévu
SELECT 
    'Vérification Horaire 10h00' as section,
    DATE(created_at) as execution_date,
    EXTRACT(HOUR FROM created_at) as hour,
    EXTRACT(MINUTE FROM created_at) as minute,
    COUNT(*) as executions_count,
    CASE 
        WHEN EXTRACT(HOUR FROM created_at) = 10 AND EXTRACT(MINUTE FROM created_at) = 0 
        THEN '✅ Exécution à 10h00 comme prévu'
        WHEN EXTRACT(HOUR FROM created_at) = 10 
        THEN '⚠️ Exécution à 10h mais pas exactement à 00 minutes'
        ELSE '❌ Exécution hors horaire prévu (10h00)'
    END as horaire_status
FROM table_snapshots_index 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), EXTRACT(HOUR FROM created_at), EXTRACT(MINUTE FROM created_at)
ORDER BY execution_date DESC, hour, minute;

-- =====================================================
-- 8. RÉSUMÉ DIAGNOSTIC FINAL
-- =====================================================

-- Résumé global pour diagnostic rapide
WITH recent_stats AS (
    SELECT 
        COUNT(*) as total_snapshots_24h,
        COUNT(DISTINCT DATE_TRUNC('hour', created_at)) as hours_with_snapshots,
        COUNT(DISTINCT DATE_TRUNC('minute', created_at)) as minutes_with_snapshots,
        MIN(created_at) as oldest_snapshot,
        MAX(created_at) as newest_snapshot
    FROM table_snapshots_index 
    WHERE created_at >= NOW() - INTERVAL '24 hours'
)
SELECT 
    'DIAGNOSTIC FINAL' as section,
    total_snapshots_24h,
    hours_with_snapshots,
    minutes_with_snapshots,
    EXTRACT(EPOCH FROM (newest_snapshot - oldest_snapshot)) / 60 / 60 as hours_span,
    CASE 
        WHEN minutes_with_snapshots > 1000 THEN '🚨 CRON CHAQUE MINUTE CONFIRMÉ!'
        WHEN minutes_with_snapshots > 100 THEN '⚠️ Fréquence très élevée'
        WHEN minutes_with_snapshots > 24 THEN '⚠️ Plus d''une exécution par heure'
        WHEN minutes_with_snapshots <= 2 THEN '✅ Cron quotidien normal'
        ELSE '🤔 Pattern d''exécution à analyser'
    END as diagnostic_final,
    ROUND(total_snapshots_24h::numeric / 24, 2) as avg_snapshots_per_hour
FROM recent_stats;

-- =====================================================
-- 9. RECOMMANDATIONS
-- =====================================================

SELECT 
    'RECOMMANDATIONS' as section,
    'Si le diagnostic montre "CRON CHAQUE MINUTE":' as action_1,
    '1. Vérifiez la configuration cron.json (doit être "0 10 * * *")' as step_1,
    '2. Redéployez la fonction Edge avec: supabase functions deploy' as step_2,
    '3. Vérifiez qu''il n''y a pas de cron jobs dupliqués' as step_3,
    '4. Utilisez le script simple-recreate-table.sql pour nettoyer' as step_4,
    CURRENT_TIMESTAMP as generated_at;
