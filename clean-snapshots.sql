-- =====================================================
-- SCRIPT DE NETTOYAGE COMPLET DES SNAPSHOTS
-- =====================================================
-- Ce script nettoie complètement le système de snapshots
-- ATTENTION: Cette opération est IRREVERSIBLE !

-- =====================================================
-- 1. NETTOYAGE DE LA TABLE D'INDEX DES SNAPSHOTS
-- =====================================================

-- Supprimer tous les enregistrements de la table d'index
DELETE FROM table_snapshots_index;

-- Réinitialiser la séquence d'auto-incrémentation (si applicable)
-- Note: UUID n'a pas de séquence, mais on peut vérifier
SELECT 'Table d''index des snapshots nettoyée' as status;

-- =====================================================
-- 2. NETTOYAGE DE LA TABLE DE LOG DES RESTAURATIONS
-- =====================================================

-- Supprimer tous les logs de restauration
DELETE FROM snapshot_restore_log;

-- Réinitialiser la séquence d'auto-incrémentation (si applicable)
SELECT 'Table de log des restaurations nettoyée' as status;

-- =====================================================
-- 3. NETTOYAGE DU BUCKET DE STOCKAGE
-- =====================================================

-- Supprimer tous les fichiers du bucket table-snapshots
-- Note: Cette opération nécessite des privilèges admin ou service_role
DELETE FROM storage.objects 
WHERE bucket_id = 'table-snapshots';

SELECT 'Fichiers du bucket table-snapshots supprimés' as status;

-- =====================================================
-- 4. VÉRIFICATION DU NETTOYAGE
-- =====================================================

-- Vérifier que les tables sont vides
SELECT 
    'Vérification du nettoyage' as operation,
    (SELECT COUNT(*) FROM table_snapshots_index) as snapshots_remaining,
    (SELECT COUNT(*) FROM snapshot_restore_log) as logs_remaining,
    (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'table-snapshots') as files_remaining;

-- =====================================================
-- 5. OPTION: SUPPRESSION COMPLÈTE DES TABLES
-- =====================================================
-- DÉCOMMENTEZ LES LIGNES CI-DESSOUS SEULEMENT SI VOUS VOULEZ
-- SUPPRIMER COMPLÈTEMENT LES TABLES (ATTENTION: IRREVERSIBLE!)

/*
-- Supprimer complètement les tables
DROP TABLE IF EXISTS snapshot_restore_log CASCADE;
DROP TABLE IF EXISTS table_snapshots_index CASCADE;

-- Supprimer les index associés
-- (automatiquement supprimés avec DROP TABLE CASCADE)

SELECT 'Tables complètement supprimées' as status;
*/

-- =====================================================
-- 6. OPTION: SUPPRESSION DU BUCKET
-- =====================================================
-- DÉCOMMENTEZ LES LIGNES CI-DESSOUS SEULEMENT SI VOUS VOULEZ
-- SUPPRIMER COMPLÈTEMENT LE BUCKET (ATTENTION: IRREVERSIBLE!)

/*
-- Supprimer complètement le bucket
-- Note: Cette opération nécessite des privilèges admin
DELETE FROM storage.buckets WHERE id = 'table-snapshots';

SELECT 'Bucket table-snapshots supprimé' as status;
*/

-- =====================================================
-- 7. RÉINITIALISATION (OPTIONNEL)
-- =====================================================
-- Si vous voulez recréer un snapshot initial après le nettoyage

/*
-- Insérer un snapshot initial vide
INSERT INTO table_snapshots_index (snapshot_date, object_path, row_count, file_size_bytes, metadata)
VALUES (
    CURRENT_DATE,
    'snapshots/staff_table_' || CURRENT_DATE || '_initial.json',
    0,
    0,
    '{"table": "staffTable", "version": "1.0.0", "description": "Snapshot initial après nettoyage"}'
);

SELECT 'Snapshot initial recréé' as status;
*/

-- =====================================================
-- RÉSUMÉ FINAL
-- =====================================================
SELECT 
    'NETTOYAGE TERMINÉ' as final_status,
    'Toutes les données de snapshots ont été supprimées' as description,
    CURRENT_TIMESTAMP as cleaned_at;
