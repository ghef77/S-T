-- =====================================================
-- SCRIPT DE NETTOYAGE DES SNAPSHOTS - GARDER SEULEMENT 3
-- =====================================================
-- Ce script nettoie la table et le bucket en gardant seulement
-- les 3 snapshots les plus récents

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

-- Note: Cette partie nécessite des privilèges admin ou service_role
-- Les fichiers seront supprimés du bucket 'table-snapshots'

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

-- Vérifier combien de snapshots restent
SELECT 
    'Résultat du nettoyage' as status,
    COUNT(*) as snapshots_remaining,
    SUM(file_size_bytes) as total_size_bytes,
    ROUND(SUM(file_size_bytes) / 1024.0 / 1024.0, 2) as total_size_mb,
    MIN(created_at) as oldest_snapshot,
    MAX(created_at) as newest_snapshot
FROM table_snapshots_index;

-- Afficher les snapshots restants
SELECT 
    'Snapshots conservés' as action,
    snapshot_date,
    object_path,
    row_count,
    ROUND(file_size_bytes / 1024.0, 2) as size_kb,
    created_at
FROM table_snapshots_index
ORDER BY created_at DESC;

-- =====================================================
-- 5. OPTION: NETTOYAGE MANUEL DU BUCKET
-- =====================================================
-- Si vous voulez nettoyer manuellement le bucket, utilisez ce code :

/*
-- Lister tous les fichiers dans le bucket
SELECT 
    'Fichiers dans le bucket' as action,
    name as file_name,
    metadata->>'size' as file_size_bytes
FROM storage.objects 
WHERE bucket_id = 'table-snapshots'
ORDER BY created_at DESC;

-- Supprimer les fichiers qui ne sont plus référencés dans la base
DELETE FROM storage.objects 
WHERE bucket_id = 'table-snapshots'
AND name NOT IN (
    SELECT object_path 
    FROM table_snapshots_index
);
*/

-- =====================================================
-- RÉSUMÉ FINAL
-- =====================================================
SELECT 
    'NETTOYAGE TERMINÉ' as final_status,
    '3 snapshots les plus récents conservés' as description,
    CURRENT_TIMESTAMP as cleaned_at;
