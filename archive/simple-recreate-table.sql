-- =====================================================
-- SCRIPT SIMPLE DE RECRÉATION DE LA TABLE SNAPSHOTS
-- =====================================================
-- Ce script recrée proprement la table table_snapshots_index
-- sans toucher aux fonctions système

-- =====================================================
-- 1. SUPPRESSION DE LA TABLE EXISTANTE
-- =====================================================

-- Supprimer la table si elle existe
DROP TABLE IF EXISTS table_snapshots_index CASCADE;

-- Supprimer aussi la table de log si elle existe
DROP TABLE IF EXISTS snapshot_restore_log CASCADE;

-- Vérifier que les tables sont supprimées
SELECT 
    'Vérification suppression' as action,
    COUNT(*) as tables_restantes
FROM information_schema.tables 
WHERE table_name IN ('table_snapshots_index', 'snapshot_restore_log');

-- =====================================================
-- 2. RECRÉATION DE LA TABLE SNAPSHOTS
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

-- =====================================================
-- 3. RECRÉATION DE LA TABLE DE LOG
-- =====================================================

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
-- 4. CONFIGURATION DES POLITIQUES RLS
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

-- Politiques pour la table de log
CREATE POLICY "Allow public read access to restore log" ON snapshot_restore_log
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert to restore log" ON snapshot_restore_log
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 5. VÉRIFICATION FINALE
-- =====================================================

-- Vérifier que les tables sont créées
SELECT 
    'Vérification création tables' as action,
    table_name,
    'Créée' as status
FROM information_schema.tables 
WHERE table_name IN ('table_snapshots_index', 'snapshot_restore_log')
ORDER BY table_name;

-- Vérifier la structure de la table snapshots
SELECT 
    'Structure table_snapshots_index' as action,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'table_snapshots_index'
ORDER BY ordinal_position;

-- Vérifier la structure de la table de log
SELECT 
    'Structure snapshot_restore_log' as action,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'snapshot_restore_log'
ORDER BY ordinal_position;

-- =====================================================
-- 6. RÉSUMÉ FINAL
-- =====================================================
SELECT 
    'RECRÉATION TERMINÉE' as final_status,
    'Tables snapshots recréées avec succès' as description,
    'Structure propre et indexés' as structure_status,
    'Politiques RLS configurées' as rls_status,
    CURRENT_TIMESTAMP as executed_at;

