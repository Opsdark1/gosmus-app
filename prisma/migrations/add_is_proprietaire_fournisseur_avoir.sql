-- Migration: Add isProprietaire to utilisateurs and fournisseurId/commandeId to avoirs
-- Run this migration manually if Prisma migrate is not available

-- 1. Add is_proprietaire column to utilisateurs
ALTER TABLE utilisateurs 
ADD COLUMN IF NOT EXISTS is_proprietaire BOOLEAN DEFAULT false;

-- 2. Update existing proprietaire users to have is_proprietaire = true
UPDATE utilisateurs 
SET is_proprietaire = true 
WHERE role = 'proprietaire';

-- 3. Add fournisseur_id and commande_id columns to avoirs
ALTER TABLE avoirs 
ADD COLUMN IF NOT EXISTS fournisseur_id UUID,
ADD COLUMN IF NOT EXISTS commande_id UUID;

-- 4. Add foreign key constraints
ALTER TABLE avoirs
ADD CONSTRAINT fk_avoirs_fournisseur 
FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id);

ALTER TABLE avoirs
ADD CONSTRAINT fk_avoirs_commande 
FOREIGN KEY (commande_id) REFERENCES commandes(id);

-- 5. Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_avoirs_fournisseur_id ON avoirs(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_avoirs_commande_id ON avoirs(commande_id);

-- Verify the changes
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'utilisateurs';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'avoirs';
