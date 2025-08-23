-- =====================================================
-- SCRIPT SQL POUR CORRIGER LE CRON JOB VIA L'API SUPABASE
-- =====================================================
-- Ce script utilise les fonctions intégrées de Supabase
-- au lieu d'accéder directement à la table cron.job

-- =====================================================
-- 1. VÉRIFIER LES FONCTIONS CRON DISPONIBLES
-- =====================================================

-- Vérifier les fonctions cron disponibles
SELECT 
    'Fonctions cron disponibles' as action,
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname LIKE '%cron%'
   OR prosrc LIKE '%cron%'
ORDER BY proname;

-- =====================================================
-- 2. VÉRIFIER LES EXTENSIONS INSTALLÉES
-- =====================================================

-- Vérifier les extensions installées
SELECT 
    'Extensions installées' as action,
    extname,
    extversion,
    extrelocatable
FROM pg_extension 
WHERE extname IN ('cron', 'pg_cron')
ORDER BY extname;

-- =====================================================
-- 3. VÉRIFIER LES RÔLES ET PERMISSIONS
-- =====================================================

-- Vérifier votre rôle actuel
SELECT 
    'Rôle actuel' as action,
    current_user as current_user,
    session_user as session_user,
    current_setting('role') as current_role;

-- Vérifier les permissions sur les schémas
SELECT 
    'Permissions sur les schémas' as action,
    schema_name,
    schema_owner
FROM information_schema.schemata
WHERE schema_name IN ('cron', 'public', 'extensions')
ORDER BY schema_name;

-- =====================================================
-- 4. VÉRIFIER LES TABLES ACCESSIBLES
-- =====================================================

-- Vérifier les tables auxquelles vous avez accès
SELECT 
    'Tables accessibles' as action,
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema IN ('public', 'cron', 'extensions')
  AND table_name LIKE '%cron%'
ORDER BY table_schema, table_name;

-- =====================================================
-- 5. VÉRIFIER LES VUES ACCESSIBLES
-- =====================================================

-- Vérifier les vues auxquelles vous avez accès
SELECT 
    'Vues accessibles' as action,
    table_schema,
    table_name
FROM information_schema.views
WHERE table_schema IN ('public', 'cron', 'extensions')
  AND table_name LIKE '%cron%'
ORDER BY table_schema, table_name;

-- =====================================================
-- 6. VÉRIFIER LES FONCTIONS ACCESSIBLES
-- =====================================================

-- Vérifier les fonctions auxquelles vous avez accès
SELECT 
    'Fonctions accessibles' as action,
    routine_schema,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema IN ('public', 'cron', 'extensions')
  AND routine_name LIKE '%cron%'
ORDER BY routine_schema, routine_name;

-- =====================================================
-- 7. SOLUTION ALTERNATIVE : VÉRIFIER LA FONCTION EDGE
-- =====================================================

-- Vérifier si votre fonction Edge Function existe
SELECT 
    'Fonction Edge Function' as action,
    'snapshot_staff_table' as function_name,
    'Vérifiez dans le dashboard Supabase > Edge Functions' as note;

-- =====================================================
-- 8. RECOMMANDATIONS
-- =====================================================

-- Afficher les recommandations
SELECT 
    'RECOMMANDATIONS POUR CORRIGER LE CRON JOB' as title,
    '1. Utilisez le dashboard Supabase > Edge Functions' as rec1,
    '2. Supprimez la fonction snapshot_staff_table' as rec2,
    '3. Recréez-la avec le bon cron.json' as rec3,
    '4. Ou contactez l''admin de votre projet' as rec4,
    CURRENT_TIMESTAMP as generated_at;
