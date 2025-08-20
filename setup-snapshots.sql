-- Configuration complète du système de snapshots pour Supabase
-- Exécutez ce script dans l'éditeur SQL de votre projet Supabase

-- 1. Créer la table des snapshots
CREATE TABLE IF NOT EXISTS table_snapshots_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    object_path TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON table_snapshots_index(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON table_snapshots_index(created_at);

-- 3. Créer la table de log des restaurations
CREATE TABLE IF NOT EXISTS snapshot_restore_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restored_at TIMESTAMPTZ DEFAULT now(),
    snapshot_date DATE NOT NULL,
    restored_by TEXT,
    notes TEXT,
    row_count INTEGER NOT NULL,
    restore_strategy TEXT NOT NULL DEFAULT 'replace-all'
);

-- 4. Créer les index pour la table de log
CREATE INDEX IF NOT EXISTS idx_restore_log_date ON snapshot_restore_log(restored_at);
CREATE INDEX IF NOT EXISTS idx_restore_log_snapshot_date ON snapshot_restore_log(snapshot_date);

-- 5. Configurer RLS (Row Level Security)
ALTER TABLE table_snapshots_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_restore_log ENABLE ROW LEVEL SECURITY;

-- 6. Créer les politiques RLS pour permettre l'accès public
-- Politique pour table_snapshots_index - Lecture publique
CREATE POLICY "Allow public read access to snapshots" ON table_snapshots_index
    FOR SELECT USING (true);

-- Politique pour table_snapshots_index - Écriture publique (pour la création de snapshots)
CREATE POLICY "Allow public insert access to snapshots" ON table_snapshots_index
    FOR INSERT WITH CHECK (true);

-- Politique pour table_snapshots_index - Mise à jour publique
CREATE POLICY "Allow public update access to snapshots" ON table_snapshots_index
    FOR UPDATE USING (true);

-- Politique pour table_snapshots_index - Suppression publique
CREATE POLICY "Allow public delete access to snapshots" ON table_snapshots_index
    FOR DELETE USING (true);

-- Politiques pour snapshot_restore_log
CREATE POLICY "Allow public read access to restore logs" ON snapshot_restore_log
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to restore logs" ON snapshot_restore_log
    FOR INSERT WITH CHECK (true);

-- 7. Accorder les permissions nécessaires
GRANT ALL ON table_snapshots_index TO anon;
GRANT ALL ON snapshot_restore_log TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- 8. Créer le bucket de stockage (si il n'existe pas)
-- Note: Cette commande peut nécessiter des privilèges admin
-- Vous devrez peut-être créer le bucket manuellement dans l'interface Supabase

-- 9. Insérer un snapshot de test initial
INSERT INTO table_snapshots_index (snapshot_date, object_path, row_count, file_size_bytes, metadata)
VALUES (
    CURRENT_DATE,
    'snapshots/staff_table_' || CURRENT_DATE || '_test.json',
    0,
    0,
    '{"table": "staffTable", "version": "1.0.0", "description": "Snapshot de test initial"}'
) ON CONFLICT (snapshot_date) DO NOTHING;

-- 10. Vérifier que tout est configuré
SELECT 
    'Configuration terminée' as status,
    COUNT(*) as snapshots_count,
    'table_snapshots_index' as table_name
FROM table_snapshots_index;

-- 11. Afficher la structure de la table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'table_snapshots_index'
ORDER BY ordinal_position;

-- 12. Vérifier les politiques RLS
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
