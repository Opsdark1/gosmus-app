-- Migration: Renommer transferts en confrères et ajouter les nouveaux champs
-- Date: 2024-12-27

-- ========================================
-- 1. Ajouter les nouveaux champs à etablissements
-- ========================================
ALTER TABLE etablissements 
ADD COLUMN IF NOT EXISTS utilisateur_lie_id UUID,
ADD COLUMN IF NOT EXISTS utilisateur_lie_uid VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_manuel BOOLEAN DEFAULT true;

-- Index pour recherche par utilisateur lié
CREATE INDEX IF NOT EXISTS idx_etablissements_utilisateur_lie ON etablissements(utilisateur_lie_uid);

-- ========================================
-- 2. Renommer la table transferts en confreres
-- ========================================
ALTER TABLE transferts RENAME TO confreres;

-- Renommer les colonnes
ALTER TABLE confreres RENAME COLUMN type_transfert TO type_confrere;

-- Ajouter les nouveaux champs pour le système de confrères
ALTER TABLE confreres 
ADD COLUMN IF NOT EXISTS destinataire_uid VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_manuel BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS date_acceptation TIMESTAMP,
ADD COLUMN IF NOT EXISTS date_refus TIMESTAMP,
ADD COLUMN IF NOT EXISTS date_paiement TIMESTAMP,
ADD COLUMN IF NOT EXISTS date_cloture TIMESTAMP,
ADD COLUMN IF NOT EXISTS motif_refus TEXT,
ADD COLUMN IF NOT EXISTS montant_du DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS montant_paye DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS mode_paiement VARCHAR(50),
ADD COLUMN IF NOT EXISTS note_paiement TEXT;

-- Mettre à jour les statuts existants
UPDATE confreres SET statut = 'termine' WHERE statut = 'recu';
UPDATE confreres SET statut = 'en_cours' WHERE statut = 'en_attente';
UPDATE confreres SET statut = 'en_cours' WHERE statut = 'en_transit';

-- Créer les index pour la nouvelle table
CREATE INDEX IF NOT EXISTS idx_confreres_destinataire ON confreres(destinataire_uid);

-- Renommer les index existants
ALTER INDEX IF EXISTS idx_transferts_projet_reference RENAME TO idx_confreres_projet_reference;
ALTER INDEX IF EXISTS idx_transferts_projet_uid RENAME TO idx_confreres_projet_uid;
ALTER INDEX IF EXISTS idx_transferts_statut RENAME TO idx_confreres_statut;
ALTER INDEX IF EXISTS idx_transferts_created_at RENAME TO idx_confreres_created_at;

-- ========================================
-- 3. Renommer la table lignes_transfert en lignes_confrere
-- ========================================
ALTER TABLE lignes_transfert RENAME TO lignes_confrere;

-- Renommer la colonne de clé étrangère
ALTER TABLE lignes_confrere RENAME COLUMN transfert_id TO confrere_id;

-- Renommer l'index
ALTER INDEX IF EXISTS idx_lignes_transfert_transfert_id RENAME TO idx_lignes_confrere_confrere_id;

-- ========================================
-- 4. Mettre à jour les contraintes de clé étrangère
-- ========================================
-- Supprimer l'ancienne contrainte
ALTER TABLE lignes_confrere DROP CONSTRAINT IF EXISTS lignes_transfert_transfert_id_fkey;

-- Ajouter la nouvelle contrainte
ALTER TABLE lignes_confrere 
ADD CONSTRAINT lignes_confrere_confrere_id_fkey 
FOREIGN KEY (confrere_id) REFERENCES confreres(id) ON DELETE CASCADE;

-- ========================================
-- 5. Mettre à jour les établissements existants comme manuels
-- ========================================
UPDATE etablissements SET is_manuel = true WHERE utilisateur_lie_uid IS NULL;

-- ========================================
-- Commentaires sur les nouveaux statuts:
-- en_cours: Créé, en attente d'envoi
-- en_attente_acceptation: Envoyé, en attente de réponse du destinataire (si utilisateur app)
-- accepte: Le destinataire a accepté
-- refuse: Le destinataire a refusé
-- en_attente_paiement: Produits reçus, en attente du paiement
-- paiement_confirme: Paiement reçu et confirmé
-- termine: Confrère complètement clôturé
-- annule: Confrère annulé
-- ========================================
