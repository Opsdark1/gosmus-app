-- Migration: add_vente_audit_fields
-- Description: Add audit fields for ventes (solde, credit, vendeur tracking)

-- Add new columns to ventes table
ALTER TABLE ventes ADD COLUMN IF NOT EXISTS montant_solde DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE ventes ADD COLUMN IF NOT EXISTS montant_credit DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE ventes ADD COLUMN IF NOT EXISTS type_paiement VARCHAR(50) DEFAULT 'espece';
ALTER TABLE ventes ADD COLUMN IF NOT EXISTS vendeur_id UUID;
ALTER TABLE ventes ADD COLUMN IF NOT EXISTS vendeur_nom VARCHAR(255);

-- Create index for vendeur
CREATE INDEX IF NOT EXISTS idx_ventes_vendeur_id ON ventes(vendeur_id);

-- Update existing records to have default type_paiement based on mode_paiement
UPDATE ventes 
SET type_paiement = COALESCE(mode_paiement, 'espece')
WHERE type_paiement IS NULL;
