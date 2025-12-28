-- Migration: Añadir tablas para gestión de establecimientos y transferencias
-- Date: 2025-12-23

-- Tabla de Établissements Partenaires
CREATE TABLE IF NOT EXISTS etablissements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projet_uid VARCHAR(255) NOT NULL,
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    telephone VARCHAR(50),
    email VARCHAR(255),
    adresse TEXT,
    ville VARCHAR(100),
    responsable VARCHAR(255),
    note TEXT,
    actif BOOLEAN DEFAULT true,
    cree_par VARCHAR(255),
    modifie_par VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_etablissements_projet_uid ON etablissements(projet_uid);
CREATE INDEX IF NOT EXISTS idx_etablissements_type ON etablissements(type);

-- Tabla de Transferts
CREATE TABLE IF NOT EXISTS transferts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projet_uid VARCHAR(255) NOT NULL,
    reference VARCHAR(100) NOT NULL,
    etablissement_source_id UUID REFERENCES etablissements(id),
    etablissement_destination_id UUID REFERENCES etablissements(id),
    type_transfert VARCHAR(50) NOT NULL,
    statut VARCHAR(50) DEFAULT 'en_attente',
    date_envoi TIMESTAMP,
    date_reception TIMESTAMP,
    motif TEXT,
    note TEXT,
    total_articles INTEGER DEFAULT 0,
    total_quantite INTEGER DEFAULT 0,
    valeur_estimee DECIMAL(12, 2) DEFAULT 0,
    actif BOOLEAN DEFAULT true,
    cree_par VARCHAR(255),
    modifie_par VARCHAR(255),
    valide_par VARCHAR(255),
    recu_par VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(projet_uid, reference)
);

CREATE INDEX IF NOT EXISTS idx_transferts_projet_uid ON transferts(projet_uid);
CREATE INDEX IF NOT EXISTS idx_transferts_statut ON transferts(statut);
CREATE INDEX IF NOT EXISTS idx_transferts_created_at ON transferts(created_at);

-- Tabla de Lignes Transfert
CREATE TABLE IF NOT EXISTS lignes_transfert (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfert_id UUID NOT NULL REFERENCES transferts(id) ON DELETE CASCADE,
    produit_nom VARCHAR(255) NOT NULL,
    produit_code VARCHAR(100),
    numero_lot VARCHAR(100),
    quantite INTEGER NOT NULL,
    prix_unitaire DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    date_expiration TIMESTAMP,
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_lignes_transfert_transfert_id ON lignes_transfert(transfert_id);
