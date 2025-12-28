DROP TABLE IF EXISTS mouvements_stock CASCADE;

CREATE TABLE historique_inventaire (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projet_uid VARCHAR(255) NOT NULL,
    stock_id UUID NOT NULL REFERENCES stocks(id),
    action VARCHAR(50) NOT NULL,
    ancienne_valeur TEXT,
    nouvelle_valeur TEXT,
    quantite INTEGER,
    motif TEXT,
    reference_id UUID,
    utilisateur_id VARCHAR(255),
    utilisateur_nom VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_historique_inventaire_projet_uid ON historique_inventaire(projet_uid);
CREATE INDEX idx_historique_inventaire_stock_id ON historique_inventaire(stock_id);
CREATE INDEX idx_historique_inventaire_action ON historique_inventaire(action);
CREATE INDEX idx_historique_inventaire_created_at ON historique_inventaire(created_at);
