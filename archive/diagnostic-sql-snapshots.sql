-- ========================================
-- DIAGNOSTIC COMPLET DES SNAPSHOTS
-- ========================================

-- 1. VÉRIFIER L'ÉTAT ACTUEL DE LA BASE DE DONNÉES
SELECT 
    '=== ÉTAT ACTUEL DE LA BASE DE DONNÉES ===' as info;

SELECT 
    id,
    snapshot_date,
    created_at,
    object_path,
    row_count,
    file_size_bytes,
    metadata
FROM table_snapshots_index 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. VÉRIFIER LES SNAPSHOTS DU 23 AOÛT
SELECT 
    '=== SNAPSHOTS DU 23 AOÛT ===' as info;

SELECT 
    snapshot_date,
    created_at,
    object_path,
    row_count,
    file_size_bytes,
    CASE 
        WHEN object_path LIKE '%08-55%' THEN '❌ FICHIER INEXISTANT (08-55)'
        WHEN object_path LIKE '%08-58%' THEN '❌ FICHIER INEXISTANT (08-58)'
        WHEN object_path LIKE '%09-00%' THEN '❌ FICHIER INEXISTANT (09-00)'
        WHEN object_path LIKE '%06-%' THEN '✅ FICHIER EXISTANT (06-XX)'
        WHEN object_path LIKE '%07-%' THEN '✅ FICHIER EXISTANT (07-XX)'
        ELSE '❓ NOM INCONNU'
    END as statut_fichier
FROM table_snapshots_index 
WHERE snapshot_date = '2025-08-23'
ORDER BY created_at DESC;

-- 3. VÉRIFIER LES INCONSISTANCES DE NOMS
SELECT 
    '=== INCONSISTANCES DE NOMS ===' as info;

SELECT 
    object_path,
    CASE 
        WHEN object_path ~ '^staffTable_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$' 
        THEN '✅ FORMAT CORRECT'
        ELSE '❌ FORMAT INCORRECT'
    END as format_validation,
    CASE 
        WHEN object_path LIKE '%08-55%' OR object_path LIKE '%08-58%' OR object_path LIKE '%09-00%'
        THEN '⚠️ NOM PROBLÉMATIQUE'
        ELSE '✅ NOM OK'
    END as nom_validation
FROM table_snapshots_index 
WHERE snapshot_date = '2025-08-23'
ORDER BY created_at DESC;

-- 4. VÉRIFIER LES DOUBLONS ET CONFLITS
SELECT 
    '=== DOUBLONS ET CONFLITS ===' as info;

SELECT 
    snapshot_date,
    COUNT(*) as nombre_snapshots,
    COUNT(DISTINCT object_path) as chemins_uniques,
    COUNT(DISTINCT row_count) as comptes_lignes_uniques,
    CASE 
        WHEN COUNT(*) > COUNT(DISTINCT object_path) THEN '⚠️ DOUBLONS DÉTECTÉS'
        ELSE '✅ PAS DE DOUBLONS'
    END as statut_doublons
FROM table_snapshots_index 
WHERE snapshot_date = '2025-08-23'
GROUP BY snapshot_date;

-- 5. VÉRIFIER LA SÉQUENCE TEMPORELLE
SELECT 
    '=== SÉQUENCE TEMPORELLE ===' as info;

SELECT 
    created_at,
    object_path,
    row_count,
    LAG(row_count) OVER (ORDER BY created_at) as lignes_precedentes,
    LAG(created_at) OVER (ORDER BY created_at) as temps_precedent,
    EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) as difference_secondes
FROM table_snapshots_index 
WHERE snapshot_date = '2025-08-23'
ORDER BY created_at DESC
LIMIT 15;

-- 6. VÉRIFIER LES MÉTADONNÉES
SELECT 
    '=== MÉTADONNÉES ===' as info;

SELECT 
    object_path,
    metadata,
    CASE 
        WHEN metadata->>'rowCount' IS NOT NULL THEN '✅ MÉTADONNÉES COMPLÈTES'
        ELSE '❌ MÉTADONNÉES MANQUANTES'
    END as statut_metadata
FROM table_snapshots_index 
WHERE snapshot_date = '2025-08-23'
ORDER BY created_at DESC
LIMIT 10;

-- 7. VÉRIFIER LES CONTRAINTES
SELECT 
    '=== CONTRAINTES ===' as info;

SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'table_snapshots_index';

-- 8. RÉSUMÉ DU PROBLÈME
SELECT 
    '=== RÉSUMÉ DU PROBLÈME ===' as info;

SELECT 
    'PROBLÈME IDENTIFIÉ:' as diagnostic,
    'Les snapshots 08-55, 08-58, 09-00 ont des entrées en base mais pas de fichiers correspondants' as description,
    'CAUSE: Décalage entre la base de données et le storage' as cause,
    'SOLUTION: Synchroniser la création des fichiers avec les entrées en base' as solution;



