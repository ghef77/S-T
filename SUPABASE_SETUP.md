# Configuration Supabase pour la Synchronisation des Associations Images-Patients

## Table `image_patient_associations`

Cette table permet de synchroniser en temps réel les associations entre images et patients sur tous les appareils.

### Structure de la Table

```sql
-- Créer la table pour les associations images-patients
CREATE TABLE IF NOT EXISTS image_patient_associations (
    id SERIAL PRIMARY KEY,
    image_name TEXT NOT NULL UNIQUE,
    patient_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_image_patient_associations_image_name 
ON image_patient_associations(image_name);

-- Créer un index pour les recherches par patient
CREATE INDEX IF NOT EXISTS idx_image_patient_associations_patient_name 
ON image_patient_associations(patient_name);

-- Activer Row Level Security (RLS)
ALTER TABLE image_patient_associations ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous les utilisateurs authentifiés
CREATE POLICY "Allow read access for all authenticated users" ON image_patient_associations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Politique pour permettre l'insertion/update aux utilisateurs authentifiés
CREATE POLICY "Allow insert/update for authenticated users" ON image_patient_associations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON image_patient_associations
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Politique pour permettre la suppression aux utilisateurs authentifiés
CREATE POLICY "Allow delete for authenticated users" ON image_patient_associations
    FOR DELETE USING (auth.role() = 'authenticated');

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Déclencheur pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_image_patient_associations_updated_at 
    BEFORE UPDATE ON image_patient_associations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Comment Exécuter

1. **Ouvrir Supabase Dashboard**
2. **Aller dans SQL Editor**
3. **Copier et coller le script SQL ci-dessus**
4. **Exécuter le script**

### Vérification

Après l'exécution, vous devriez voir :
- ✅ Table `image_patient_associations` créée
- ✅ Index créés pour les performances
- ✅ RLS activé avec les bonnes politiques
- ✅ Déclencheur pour `updated_at` configuré

### Fonctionnalités

- **Synchronisation en temps réel** des associations images-patients
- **Fallback vers localStorage** en cas d'erreur Supabase
- **Gestion des conflits** avec `onConflict: 'image_name'`
- **Horodatage automatique** des modifications
- **Sécurité** avec Row Level Security
