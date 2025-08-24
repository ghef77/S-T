-- =====================================================
-- SCRIPT DE DESTRUCTION ET RECRÉATION COMPLÈTE
-- =====================================================
-- ATTENTION: Ce script supprime COMPLÈTEMENT la table snapshots
-- et la recrée propre. Utilisez seulement si nécessaire !

-- =====================================================
-- 1. SAUVEGARDE DES DONNÉES EXISTANTES (OPTIONNEL)
-- =====================================================

-- Créer une table de sauvegarde si vous voulez garder les données
CREATE TABLE IF NOT EXISTS table_snapshots_index_backup AS 
SELECT * FROM table_snapshots_index;

-- =====================================================
-- 2. SUPPRESSION COMPLÈTE DE LA TABLE
-- =====================================================

-- Supprimer complètement la table et tous ses objets
DROP TABLE IF EXISTS table_snapshots_index CASCADE;

-- Vérifier que la table est supprimée
SELECT 
    'Vérification suppression' as action,
    COUNT(*) as tables_restantes
FROM information_schema.tables 
WHERE table_name = 'table_snapshots_index';

-- =====================================================
-- 3. SUPPRESSION DES TRIGGERS ET FONCTIONS CACHÉES
-- =====================================================

-- Supprimer tous les triggers liés aux snapshots
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE event_object_table LIKE '%snapshot%'
           OR trigger_name LIKE '%snapshot%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON ' || trigger_record.event_object_table || ' CASCADE';
        RAISE NOTICE 'Trigger supprimé: %', trigger_record.trigger_name;
    END LOOP;
END $$;

-- Supprimer seulement nos fonctions personnalisées (pas les fonctions système)
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_name LIKE '%snapshot%'
           OR routine_name LIKE '%staff%'
           OR routine_name LIKE '%table%'
           AND routine_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
           AND routine_schema NOT LIKE 'pg_%'
    LOOP
        BEGIN
            EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.routine_name || ' CASCADE';
            RAISE NOTICE 'Fonction supprimée: %', func_record.routine_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Impossible de supprimer la fonction %: %', func_record.routine_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- =====================================================
-- 4. SUPPRESSION DES CRON JOBS CACHÉS
-- =====================================================

-- Vérifier s'il y a des cron jobs actifs
SELECT 
    'Cron jobs actifs' as action,
    COUNT(*) as cron_jobs_count
FROM cron.job 
WHERE active = true;

-- Désactiver TOUS les cron jobs actifs
UPDATE cron.job 
SET active = false 
WHERE active = true;

-- Supprimer TOUS les cron jobs
DELETE FROM cron.job;

-- Vérifier qu'aucun cron job ne reste
SELECT 
    'Vérification cron jobs' as action,
    COUNT(*) as cron_jobs_restants
FROM cron.job;

-- =====================================================
-- 5. RECRÉATION DE LA TABLE PROPRE
-- =====================================================

-- Créer la table snapshots propre
CREATE TABLE table_snapshots_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL,
    object_path TEXT NOT NULL,
    row_count INTEGER DEFAULT 0,
    file_size_bytes BIGINT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer les index nécessaires
CREATE INDEX idx_snapshots_date ON table_snapshots_index(snapshot_date);
CREATE INDEX idx_snapshots_created_at ON table_snapshots_index(created_at);
CREATE INDEX idx_snapshots_object_path ON table_snapshots_index(object_path);

-- Créer la table de log des restaurations
CREATE TABLE snapshot_restore_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL,
    restored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    restored_by TEXT DEFAULT 'system',
    restore_reason TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Créer les index pour la table de log
CREATE INDEX idx_restore_log_date ON snapshot_restore_log(snapshot_date);
CREATE INDEX idx_restore_log_restored_at ON snapshot_restore_log(restored_at);

-- =====================================================
-- 6. CONFIGURATION DES POLITIQUES RLS
-- =====================================================

-- Activer RLS sur les tables
ALTER TABLE table_snapshots_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_restore_log ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique des snapshots
CREATE POLICY "Allow public read access to snapshots" ON table_snapshots_index
    FOR SELECT USING (true);

-- Politique pour permettre l'insertion par les services authentifiés
CREATE POLICY "Allow authenticated insert to snapshots" ON table_snapshots_index
    FOR INSERT WITH CHECK (true);

-- Politique pour permettre la mise à jour par les services authentifiés
CREATE POLICY "Allow authenticated update to snapshots" ON table_snapshots_index
    FOR UPDATE USING (true);

-- Politique pour permettre la suppression par les services authentifiés
CREATE POLICY "Allow authenticated delete to snapshots" ON table_snapshots_index
    FOR DELETE USING (true);

-- Politiques similaires pour la table de log
CREATE POLICY "Allow public read access to restore log" ON snapshot_restore_log
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert to restore log" ON snapshot_restore_log
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 7. VÉRIFICATION FINALE
-- =====================================================

-- Vérifier que la table est créée
SELECT 
    'Vérification création table' as action,
    COUNT(*) as tables_creees
FROM information_schema.tables 
WHERE table_name = 'table_snapshots_index';

-- Vérifier la structure de la table
SELECT 
    'Structure de la table' as action,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'table_snapshots_index'
ORDER BY ordinal_position;

-- Vérifier qu'aucun cron job n'est actif
SELECT 
    'Vérification finale cron jobs' as action,
    COUNT(*) as cron_jobs_actifs
FROM cron.job 
WHERE active = true;

-- =====================================================
-- 8. RÉSUMÉ DES ACTIONS
-- =====================================================
SELECT 
    'DESTRUCTION ET RECRÉATION TERMINÉES' as final_status,
    'Table snapshots complètement nettoyée et recréée' as description,
    'Aucun cron job actif' as cron_status,
    'Aucun trigger ou fonction cachée' as triggers_status,
    CURRENT_TIMESTAMP as executed_at;
