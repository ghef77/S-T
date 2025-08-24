-- Configuration complète du système de snapshots pour Supabase (Version corrigée)
-- Exécutez ce script dans l'éditeur SQL de votre projet Supabase

-- 1. Créer la table des snapshots (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS table_snapshots_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    object_path TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Créer les index pour les performances (s'ils n'existent pas)
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON table_snapshots_index(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON table_snapshots_index(created_at);

-- 3. Créer la table de log des restaurations (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS snapshot_restore_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restored_at TIMESTAMPTZ DEFAULT now(),
    snapshot_date DATE NOT NULL,
    restored_by TEXT,
    notes TEXT,
    row_count INTEGER NOT NULL,
    restore_strategy TEXT NOT NULL DEFAULT 'replace-all'
);

-- 4. Créer les index pour la table de log (s'ils n'existent pas)
CREATE INDEX IF NOT EXISTS idx_restore_log_date ON snapshot_restore_log(restored_at);
CREATE INDEX IF NOT EXISTS idx_restore_log_snapshot_date ON snapshot_restore_log(snapshot_date);

-- 5. Configurer RLS (Row Level Security)
ALTER TABLE table_snapshots_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_restore_log ENABLE ROW LEVEL SECURITY;

-- 6. Supprimer les anciennes politiques RLS existantes (pour éviter les conflits)
DROP POLICY IF EXISTS "Allow authenticated users to read snapshots index" ON table_snapshots_index;
DROP POLICY IF EXISTS "Allow service role to manage snapshots" ON table_snapshots_index;
DROP POLICY IF EXISTS "Allow authenticated users to read restore logs" ON table_snapshots_index;
DROP POLICY IF EXISTS "Allow service role to write restore logs" ON table_snapshots_index;

-- 7. Créer les nouvelles politiques RLS pour permettre l'accès public
-- Politique pour table_snapshots_index - Lecture publique
DROP POLICY IF EXISTS "Allow public read access to snapshots" ON table_snapshots_index;
CREATE POLICY "Allow public read access to snapshots" ON table_snapshots_index
    FOR SELECT USING (true);

-- Politique pour table_snapshots_index - Écriture publique (pour la création de snapshots)
DROP POLICY IF EXISTS "Allow public insert access to snapshots" ON table_snapshots_index;
CREATE POLICY "Allow public insert access to snapshots" ON table_snapshots_index
    FOR INSERT WITH CHECK (true);

-- Politique pour table_snapshots_index - Mise à jour publique
DROP POLICY IF EXISTS "Allow public update access to snapshots" ON table_snapshots_index;
CREATE POLICY "Allow public update access to snapshots" ON table_snapshots_index
    FOR UPDATE USING (true);

-- Politique pour table_snapshots_index - Suppression publique
DROP POLICY IF EXISTS "Allow public delete access to snapshots" ON table_snapshots_index;
CREATE POLICY "Allow public delete access to snapshots" ON table_snapshots_index
    FOR DELETE USING (true);

-- Politiques pour snapshot_restore_log
DROP POLICY IF EXISTS "Allow public read access to restore logs" ON snapshot_restore_log;
CREATE POLICY "Allow public read access to restore logs" ON snapshot_restore_log
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access to restore logs" ON snapshot_restore_log;
CREATE POLICY "Allow public insert access to restore logs" ON snapshot_restore_log
    FOR INSERT WITH CHECK (true);

-- 8. Accorder les permissions nécessaires
GRANT ALL ON table_snapshots_index TO anon;
GRANT ALL ON snapshot_restore_log TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- 9. Supprimer les anciennes fonctions si elles existent
DROP FUNCTION IF EXISTS get_available_snapshot_dates();
DROP FUNCTION IF EXISTS get_snapshot_info(DATE);

-- 10. Créer les nouvelles fonctions
CREATE OR REPLACE FUNCTION get_available_snapshot_dates()
RETURNS TABLE(snapshot_date DATE, created_at TIMESTAMPTZ, row_count INTEGER)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT snapshot_date, created_at, row_count
    FROM table_snapshots_index
    ORDER BY snapshot_date DESC;
$$;

CREATE OR REPLACE FUNCTION get_snapshot_info(target_date DATE)
RETURNS TABLE(id UUID, snapshot_date DATE, created_at TIMESTAMPTZ, object_path TEXT, row_count INTEGER, file_size_bytes BIGINT, metadata JSONB)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id, snapshot_date, created_at, object_path, row_count, file_size_bytes, metadata
    FROM table_snapshots_index
    WHERE snapshot_date = target_date;
$$;

-- 11. Accorder les permissions sur les fonctions
GRANT EXECUTE ON FUNCTION get_available_snapshot_dates() TO anon;
GRANT EXECUTE ON FUNCTION get_snapshot_info(DATE) TO anon;

-- 12. Insérer un snapshot de test initial (seulement si aucun n'existe)
INSERT INTO table_snapshots_index (snapshot_date, object_path, row_count, file_size_bytes, metadata)
SELECT 
    CURRENT_DATE,
    'snapshots/staff_table_' || CURRENT_DATE || '_test.json',
    0,
    0,
    '{"table": "staffTable", "version": "1.0.0", "description": "Snapshot de test initial"}'
WHERE NOT EXISTS (
    SELECT 1 FROM table_snapshots_index WHERE snapshot_date = CURRENT_DATE
);

-- 13. Vérifier que tout est configuré
SELECT 
    'Configuration terminée' as status,
    COUNT(*) as snapshots_count,
    'table_snapshots_index' as table_name
FROM table_snapshots_index;

-- 14. Afficher la structure de la table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'table_snapshots_index'
ORDER BY ordinal_position;

-- 15. Vérifier les politiques RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('table_snapshots_index', 'snapshot_restore_log');

-- 16. Vérifier les permissions
SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.role_table_grants 
WHERE table_name IN ('table_snapshots_index', 'snapshot_restore_log')
AND grantee = 'anon';