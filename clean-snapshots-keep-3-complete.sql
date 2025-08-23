-- =====================================================
-- SCRIPT COMPLET DE NETTOYAGE - TABLE + BUCKET
-- GARDER SEULEMENT 3 SNAPSHOTS
-- =====================================================
-- ATTENTION: Ce script supprime définitivement les données !

-- =====================================================
-- 1. IDENTIFIER LES SNAPSHOTS À SUPPRIMER
-- =====================================================

-- Créer une table temporaire avec les snapshots à supprimer
WITH snapshots_to_delete AS (
    SELECT 
        id,
        snapshot_date,
        object_path,
        created_at,
        file_size_bytes
    FROM table_snapshots_index
    ORDER BY created_at DESC
    OFFSET 3  -- Garder les 3 premiers (plus récents)
)
SELECT 
    'Snapshots à supprimer' as action,
    COUNT(*) as count,
    SUM(file_size_bytes) as total_size_bytes,
    ROUND(SUM(file_size_bytes) / 1024.0 / 1024.0, 2) as total_size_mb
FROM snapshots_to_delete;

-- =====================================================
-- 2. SUPPRIMER LES FICHIERS DU BUCKET DE STORAGE
-- =====================================================

-- Supprimer les fichiers qui ne sont plus référencés dans la base
-- (après avoir supprimé les enregistrements de la table)
DELETE FROM storage.objects 
WHERE bucket_id = 'table-snapshots'
AND name NOT IN (
    SELECT object_path 
    FROM table_snapshots_index
);

-- =====================================================
-- 3. SUPPRIMER LES ENREGISTREMENTS DE LA BASE
-- =====================================================

-- Supprimer les snapshots anciens (garder seulement les 3 plus récents)
DELETE FROM table_snapshots_index 
WHERE id IN (
    SELECT id FROM (
        SELECT id
        FROM table_snapshots_index
        ORDER BY created_at DESC
        OFFSET 3
    ) AS old_snapshots
);

-- =====================================================
-- 4. VÉRIFICATION DU NETTOYAGE
-- =====================================================

-- Vérifier combien de snapshots restent dans la base
SELECT 
    'Résultat du nettoyage - Base de données' as status,
    COUNT(*) as snapshots_remaining,
    SUM(file_size_bytes) as total_size_bytes,
    ROUND(SUM(file_size_bytes) / 1024.0 / 1024.0, 2) as total_size_mb,
    MIN(created_at) as oldest_snapshot,
    MAX(created_at) as newest_snapshot
FROM table_snapshots_index;

-- Vérifier combien de fichiers restent dans le bucket
SELECT 
    'Résultat du nettoyage - Bucket de stockage' as status,
    COUNT(*) as files_remaining,
    SUM(CAST(metadata->>'size' AS BIGINT)) as total_size_bytes,
    ROUND(SUM(CAST(metadata->>'size' AS BIGINT)) / 1024.0 / 1024.0, 2) as total_size_mb
FROM storage.objects 
WHERE bucket_id = 'table-snapshots';

-- Afficher les snapshots restants dans la base
SELECT 
    'Snapshots conservés dans la base' as action,
    snapshot_date,
    object_path,
    row_count,
    ROUND(file_size_bytes / 1024.0, 2) as size_kb,
    created_at
FROM table_snapshots_index
ORDER BY created_at DESC;

-- Afficher les fichiers restants dans le bucket
SELECT 
    'Fichiers conservés dans le bucket' as action,
    name as file_name,
    ROUND(CAST(metadata->>'size' AS BIGINT) / 1024.0, 2) as size_kb,
    created_at
FROM storage.objects 
WHERE bucket_id = 'table-snapshots'
ORDER BY created_at DESC;

-- =====================================================
-- 5. VÉRIFICATION DE LA COHÉRENCE
-- =====================================================

-- Vérifier que tous les snapshots de la base ont leurs fichiers dans le bucket
SELECT 
    'Vérification de cohérence' as action,
    COUNT(*) as total_snapshots,
    COUNT(CASE WHEN bucket_file.name IS NOT NULL THEN 1 END) as files_found,
    COUNT(CASE WHEN bucket_file.name IS NULL THEN 1 END) as files_missing
FROM table_snapshots_index base_snapshot
LEFT JOIN storage.objects bucket_file ON 
    bucket_file.bucket_id = 'table-snapshots' 
    AND bucket_file.name = base_snapshot.object_path;

-- =====================================================
-- RÉSUMÉ FINAL
-- =====================================================
SELECT 
    'NETTOYAGE COMPLET TERMINÉ' as final_status,
    '3 snapshots les plus récents conservés dans la base et le bucket' as description,
    CURRENT_TIMESTAMP as cleaned_at;
