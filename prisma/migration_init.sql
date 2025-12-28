-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" UUID NOT NULL,
    "firebase_uid" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "nom" VARCHAR(255),
    "telephone" VARCHAR(50),
    "nom_projet" VARCHAR(255),
    "adresse" VARCHAR(255),
    "ville" VARCHAR(100),
    "pays" VARCHAR(100),
    "role" VARCHAR(50) NOT NULL DEFAULT 'proprietaire',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "whitelist" BOOLEAN NOT NULL DEFAULT false,
    "email_verifie" BOOLEAN NOT NULL DEFAULT false,
    "telephone_verifie" BOOLEAN NOT NULL DEFAULT false,
    "essai_fin" TIMESTAMP(3),
    "desactive_le" TIMESTAMP(3),
    "supprimer_apres" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "dernier_login" TIMESTAMP(3),

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "proprietaire_id" UUID,
    "nom" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employes" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "proprietaire_id" UUID,
    "role_id" UUID,
    "nom" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "firebase_uid" VARCHAR(255),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID,
    "action" VARCHAR(100),
    "module" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fournisseurs" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "info_contact" JSONB,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "info_contact" JSONB,
    "solde" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_clients" (
    "id" UUID NOT NULL,
    "client_id" UUID,
    "projet_uid" VARCHAR(255) NOT NULL,
    "ancien_data" JSONB,
    "nouveau_data" JSONB,
    "modifie_par" VARCHAR(255),
    "modifie_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produits" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "reference" VARCHAR(100) NOT NULL,
    "categorie_id" UUID,
    "fournisseur_id" UUID,
    "prix_achat" DECIMAL(12,2) NOT NULL,
    "prix_vente" DECIMAL(12,2) NOT NULL,
    "code_barre" VARCHAR(100),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventaire" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "produit_id" UUID,
    "quantite_disponible" INTEGER NOT NULL DEFAULT 0,
    "quantite_reservee" INTEGER NOT NULL DEFAULT 0,
    "prix_achat_moyen" DECIMAL(12,2),
    "valeur_totale" DECIMAL(12,2),
    "cree_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements_stock" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "produit_id" UUID,
    "quantite" INTEGER NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "reference_id" UUID,
    "note" TEXT,
    "cree_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mouvements_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventes" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "client_id" UUID,
    "reference" VARCHAR(100) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "statut" VARCHAR(50) NOT NULL DEFAULT 'en_cours',
    "note" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventes_produits" (
    "id" UUID NOT NULL,
    "vente_id" UUID,
    "produit_id" UUID,
    "reference" VARCHAR(100) NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prix_unitaire" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "cree_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventes_produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factures" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "vente_id" UUID,
    "numero_facture" VARCHAR(50),
    "reference" VARCHAR(100),
    "total" DECIMAL(12,2),
    "statut" VARCHAR(50) NOT NULL DEFAULT 'emise',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "modifie_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commandes" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "fournisseur_id" UUID,
    "total" DECIMAL(12,2),
    "statut" VARCHAR(20) NOT NULL DEFAULT 'en_attente',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commandes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifications_produits" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "produit_id" UUID,
    "ancien_data" JSONB,
    "nouveau_data" JSONB,
    "modifie_par" VARCHAR(255),
    "modifie_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modifications_produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avoirs" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "vente_id" UUID,
    "montant" DECIMAL(12,2) NOT NULL,
    "raison" TEXT,
    "cree_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avoirs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_firebase_uid_key" ON "utilisateurs"("firebase_uid");

-- CreateIndex
CREATE INDEX "idx_utilisateurs_firebase_uid" ON "utilisateurs"("firebase_uid");

-- CreateIndex
CREATE INDEX "idx_utilisateurs_email" ON "utilisateurs"("email");

-- CreateIndex
CREATE INDEX "idx_roles_projet_uid" ON "roles"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_roles_proprietaire_id" ON "roles"("proprietaire_id");

-- CreateIndex
CREATE UNIQUE INDEX "employes_firebase_uid_key" ON "employes"("firebase_uid");

-- CreateIndex
CREATE INDEX "idx_employes_projet_uid" ON "employes"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_employes_role_id" ON "employes"("role_id");

-- CreateIndex
CREATE INDEX "idx_employes_proprietaire_id" ON "employes"("proprietaire_id");

-- CreateIndex
CREATE INDEX "idx_permissions_role_id" ON "permissions"("role_id");

-- CreateIndex
CREATE INDEX "idx_categories_projet_uid" ON "categories"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_categories_nom" ON "categories"("nom");

-- CreateIndex
CREATE INDEX "idx_fournisseurs_projet_uid" ON "fournisseurs"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_fournisseurs_nom" ON "fournisseurs"("nom");

-- CreateIndex
CREATE INDEX "idx_clients_projet_uid" ON "clients"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_clients_nom" ON "clients"("nom");

-- CreateIndex
CREATE INDEX "idx_historique_clients_client_id" ON "historique_clients"("client_id");

-- CreateIndex
CREATE INDEX "idx_produits_projet_uid" ON "produits"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_produits_nom" ON "produits"("nom");

-- CreateIndex
CREATE INDEX "idx_produits_categorie_id" ON "produits"("categorie_id");

-- CreateIndex
CREATE INDEX "idx_produits_fournisseur_id" ON "produits"("fournisseur_id");

-- CreateIndex
CREATE INDEX "idx_produits_code_barre" ON "produits"("code_barre");

-- CreateIndex
CREATE UNIQUE INDEX "produits_projet_uid_reference_key" ON "produits"("projet_uid", "reference");

-- CreateIndex
CREATE INDEX "idx_inventaire_projet_uid" ON "inventaire"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_inventaire_produit_id" ON "inventaire"("produit_id");

-- CreateIndex
CREATE INDEX "idx_mouvements_stock_projet_uid" ON "mouvements_stock"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_mouvements_stock_produit_id" ON "mouvements_stock"("produit_id");

-- CreateIndex
CREATE INDEX "idx_ventes_projet_uid" ON "ventes"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_ventes_client_id" ON "ventes"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "ventes_projet_uid_reference_key" ON "ventes"("projet_uid", "reference");

-- CreateIndex
CREATE INDEX "idx_ventes_produits_vente_id" ON "ventes_produits"("vente_id");

-- CreateIndex
CREATE INDEX "idx_ventes_produits_produit_id" ON "ventes_produits"("produit_id");

-- CreateIndex
CREATE INDEX "idx_ventes_produits_reference" ON "ventes_produits"("reference");

-- CreateIndex
CREATE INDEX "idx_factures_projet_uid" ON "factures"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_factures_vente_id" ON "factures"("vente_id");

-- CreateIndex
CREATE INDEX "idx_factures_reference" ON "factures"("reference");

-- CreateIndex
CREATE INDEX "idx_commandes_projet_uid" ON "commandes"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_commandes_fournisseur_id" ON "commandes"("fournisseur_id");

-- CreateIndex
CREATE INDEX "idx_modifications_produits_projet_uid" ON "modifications_produits"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_modifications_produits_produit_id" ON "modifications_produits"("produit_id");

-- CreateIndex
CREATE INDEX "idx_avoirs_projet_uid" ON "avoirs"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_avoirs_vente_id" ON "avoirs"("vente_id");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_proprietaire_id_fkey" FOREIGN KEY ("proprietaire_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employes" ADD CONSTRAINT "employes_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employes" ADD CONSTRAINT "employes_proprietaire_id_fkey" FOREIGN KEY ("proprietaire_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_clients" ADD CONSTRAINT "historique_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_fournisseur_id_fkey" FOREIGN KEY ("fournisseur_id") REFERENCES "fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventaire" ADD CONSTRAINT "inventaire_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventes" ADD CONSTRAINT "ventes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventes_produits" ADD CONSTRAINT "ventes_produits_vente_id_fkey" FOREIGN KEY ("vente_id") REFERENCES "ventes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventes_produits" ADD CONSTRAINT "ventes_produits_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_vente_id_fkey" FOREIGN KEY ("vente_id") REFERENCES "ventes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_fournisseur_id_fkey" FOREIGN KEY ("fournisseur_id") REFERENCES "fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifications_produits" ADD CONSTRAINT "modifications_produits_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoirs" ADD CONSTRAINT "avoirs_vente_id_fkey" FOREIGN KEY ("vente_id") REFERENCES "ventes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

