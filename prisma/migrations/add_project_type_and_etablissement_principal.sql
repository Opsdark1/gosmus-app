-- Add projectType to utilisateurs (PHARMACIE or PARAPHARMACIA)
ALTER TABLE utilisateurs 
ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'PHARMACIE';

-- Add isPrincipal to etablissements (one principal per project)
ALTER TABLE etablissements 
ADD COLUMN IF NOT EXISTS is_principal BOOLEAN DEFAULT FALSE;

-- Create index for project_type
CREATE INDEX IF NOT EXISTS idx_utilisateurs_project_type ON utilisateurs(project_type);

-- Create index for is_principal
CREATE INDEX IF NOT EXISTS idx_etablissements_is_principal ON etablissements(is_principal);
