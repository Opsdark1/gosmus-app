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
    "is_proprietaire" BOOLEAN NOT NULL DEFAULT false,
    "project_type" VARCHAR(50) NOT NULL DEFAULT 'PHARMACIE',
    "subscription_status" VARCHAR(50),
    "subscription_type" VARCHAR(50),
    "subscription_start" TIMESTAMP(3),
    "subscription_end" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "email_verifie" BOOLEAN NOT NULL DEFAULT false,
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
    "nom" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "modifie_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employes" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "role_id" UUID,
    "nom" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "firebase_uid" VARCHAR(255),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "modifie_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
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
    "modifie_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produits" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "code_barre" VARCHAR(100),
    "categorie_id" UUID,
    "type" VARCHAR(100),
    "sous_type" VARCHAR(100),
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "modifie_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fournisseurs" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "telephone" VARCHAR(50),
    "email" VARCHAR(255),
    "adresse" TEXT,
    "ville" VARCHAR(100),
    "ice" VARCHAR(50),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "modifie_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "produit_id" UUID NOT NULL,
    "fournisseur_id" UUID,
    "numero_lot" VARCHAR(100),
    "prix_achat" DECIMAL(12,2) NOT NULL,
    "prix_vente" DECIMAL(12,2) NOT NULL,
    "quantite_disponible" INTEGER NOT NULL DEFAULT 0,
    "quantite_reservee" INTEGER NOT NULL DEFAULT 0,
    "seuil_alerte" INTEGER NOT NULL DEFAULT 10,
    "date_expiration" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "modifie_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_inventaire" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "stock_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "ancienne_valeur" TEXT,
    "nouvelle_valeur" TEXT,
    "quantite" INTEGER,
    "motif" TEXT,
    "reference_id" UUID,
    "utilisateur_id" VARCHAR(255),
    "utilisateur_nom" VARCHAR(255),
    "utilisateur_email" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_inventaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "prenom" VARCHAR(255),
    "telephone" VARCHAR(50),
    "email" VARCHAR(255),
    "adresse" TEXT,
    "ville" VARCHAR(100),
    "cin" VARCHAR(50),
    "solde" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "modifie_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventes" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "client_id" UUID,
    "reference" VARCHAR(100) NOT NULL,
    "sous_total" DECIMAL(12,2) NOT NULL,
    "remise" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "montant_paye" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montant_du" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montant_solde" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montant_credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "mode_paiement" VARCHAR(50),
    "type_paiement" VARCHAR(50) NOT NULL DEFAULT 'espece',
    "statut" VARCHAR(50) NOT NULL DEFAULT 'en_cours',
    "note" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "vendeur_id" UUID,
    "vendeur_nom" VARCHAR(255),
    "cree_par" VARCHAR(255),
    "modifie_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_vente" (
    "id" UUID NOT NULL,
    "vente_id" UUID NOT NULL,
    "stock_id" UUID NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prix_unitaire" DECIMAL(12,2) NOT NULL,
    "remise" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "lignes_vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avoirs" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "client_id" UUID,
    "fournisseur_id" UUID,
    "vente_id" UUID,
    "commande_id" UUID,
    "reference" VARCHAR(100) NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "motif" TEXT,
    "type" VARCHAR(50) NOT NULL,
    "statut" VARCHAR(50) NOT NULL DEFAULT 'en_attente',
    "date_validite" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "modifie_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avoirs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factures" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "vente_id" UUID,
    "numero_facture" VARCHAR(50) NOT NULL,
    "reference" VARCHAR(100),
    "sous_total" DECIMAL(12,2) NOT NULL,
    "tva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
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
    "reference" VARCHAR(100) NOT NULL,
    "sous_total" DECIMAL(12,2) NOT NULL,
    "frais_livraison" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "statut" VARCHAR(50) NOT NULL DEFAULT 'en_attente',
    "date_livraison" TIMESTAMP(3),
    "note" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "modifie_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commandes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_commande" (
    "id" UUID NOT NULL,
    "commande_id" UUID NOT NULL,
    "produit_nom" VARCHAR(255) NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prix_unitaire" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "lignes_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "utilisateur" VARCHAR(255) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "entite_id" VARCHAR(255),
    "details" TEXT,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etablissements" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "is_principal" BOOLEAN NOT NULL DEFAULT false,
    "utilisateur_lie_id" UUID,
    "utilisateur_lie_uid" VARCHAR(255),
    "is_manuel" BOOLEAN NOT NULL DEFAULT true,
    "telephone" VARCHAR(50),
    "email" VARCHAR(255),
    "adresse" TEXT,
    "ville" VARCHAR(100),
    "responsable" VARCHAR(255),
    "note" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "modifie_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etablissements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confreres" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "reference" VARCHAR(100) NOT NULL,
    "etablissement_source_id" UUID,
    "etablissement_destination_id" UUID,
    "destinataire_uid" VARCHAR(255),
    "type_confrere" VARCHAR(50) NOT NULL,
    "is_manuel" BOOLEAN NOT NULL DEFAULT true,
    "statut" VARCHAR(50) NOT NULL DEFAULT 'en_cours',
    "date_envoi" TIMESTAMP(3),
    "date_reception" TIMESTAMP(3),
    "date_acceptation" TIMESTAMP(3),
    "date_refus" TIMESTAMP(3),
    "date_paiement" TIMESTAMP(3),
    "date_cloture" TIMESTAMP(3),
    "motif_refus" TEXT,
    "motif" TEXT,
    "note" TEXT,
    "montant_du" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montant_paye" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "mode_paiement" VARCHAR(50),
    "note_paiement" TEXT,
    "total_articles" INTEGER NOT NULL DEFAULT 0,
    "total_quantite" INTEGER NOT NULL DEFAULT 0,
    "valeur_estimee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_par" VARCHAR(255),
    "modifie_par" VARCHAR(255),
    "valide_par" VARCHAR(255),
    "recu_par" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "confreres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_confrere" (
    "id" UUID NOT NULL,
    "confrere_id" UUID NOT NULL,
    "produit_nom" VARCHAR(255) NOT NULL,
    "produit_code" VARCHAR(100),
    "numero_lot" VARCHAR(100),
    "quantite" INTEGER NOT NULL,
    "prix_unitaire" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "date_expiration" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "lignes_confrere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_general" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "entite_id" VARCHAR(255) NOT NULL,
    "entite_nom" VARCHAR(255),
    "description" TEXT NOT NULL,
    "donnees_avant" JSONB,
    "donnees_apres" JSONB,
    "utilisateur_id" VARCHAR(255) NOT NULL,
    "utilisateur_email" VARCHAR(255),
    "ip_address" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_general_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "projet_uid" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "priorite" VARCHAR(50) NOT NULL DEFAULT 'normale',
    "module" VARCHAR(100),
    "entite_id" VARCHAR(255),
    "entite_nom" VARCHAR(255),
    "lien_action" VARCHAR(500),
    "metadata" JSONB,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications_lectures" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "utilisateur_id" VARCHAR(255) NOT NULL,
    "lu_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_lectures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_firebase_uid_key" ON "utilisateurs"("firebase_uid");

-- CreateIndex
CREATE INDEX "idx_utilisateurs_firebase_uid" ON "utilisateurs"("firebase_uid");

-- CreateIndex
CREATE INDEX "idx_utilisateurs_email" ON "utilisateurs"("email");

-- CreateIndex
CREATE INDEX "idx_utilisateurs_project_type" ON "utilisateurs"("project_type");

-- CreateIndex
CREATE INDEX "idx_roles_projet_uid" ON "roles"("projet_uid");

-- CreateIndex
CREATE UNIQUE INDEX "employes_firebase_uid_key" ON "employes"("firebase_uid");

-- CreateIndex
CREATE INDEX "idx_employes_projet_uid" ON "employes"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_employes_role_id" ON "employes"("role_id");

-- CreateIndex
CREATE INDEX "idx_permissions_role_id" ON "permissions"("role_id");

-- CreateIndex
CREATE INDEX "idx_categories_projet_uid" ON "categories"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_produits_projet_uid" ON "produits"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_produits_nom" ON "produits"("nom");

-- CreateIndex
CREATE INDEX "idx_produits_categorie_id" ON "produits"("categorie_id");

-- CreateIndex
CREATE INDEX "idx_produits_type" ON "produits"("type");

-- CreateIndex
CREATE UNIQUE INDEX "produits_projet_uid_code_barre_key" ON "produits"("projet_uid", "code_barre");

-- CreateIndex
CREATE INDEX "idx_fournisseurs_projet_uid" ON "fournisseurs"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_stocks_projet_uid" ON "stocks"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_stocks_produit_id" ON "stocks"("produit_id");

-- CreateIndex
CREATE INDEX "idx_stocks_fournisseur_id" ON "stocks"("fournisseur_id");

-- CreateIndex
CREATE INDEX "idx_stocks_date_expiration" ON "stocks"("date_expiration");

-- CreateIndex
CREATE INDEX "idx_stocks_quantite_disponible" ON "stocks"("quantite_disponible");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_projet_uid_numero_lot_key" ON "stocks"("projet_uid", "numero_lot");

-- CreateIndex
CREATE INDEX "idx_historique_inventaire_projet_uid" ON "historique_inventaire"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_historique_inventaire_stock_id" ON "historique_inventaire"("stock_id");

-- CreateIndex
CREATE INDEX "idx_historique_inventaire_action" ON "historique_inventaire"("action");

-- CreateIndex
CREATE INDEX "idx_historique_inventaire_created_at" ON "historique_inventaire"("created_at");

-- CreateIndex
CREATE INDEX "idx_clients_projet_uid" ON "clients"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_clients_telephone" ON "clients"("telephone");

-- CreateIndex
CREATE INDEX "idx_ventes_projet_uid" ON "ventes"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_ventes_client_id" ON "ventes"("client_id");

-- CreateIndex
CREATE INDEX "idx_ventes_created_at" ON "ventes"("created_at");

-- CreateIndex
CREATE INDEX "idx_ventes_statut" ON "ventes"("statut");

-- CreateIndex
CREATE INDEX "idx_ventes_vendeur_id" ON "ventes"("vendeur_id");

-- CreateIndex
CREATE UNIQUE INDEX "ventes_projet_uid_reference_key" ON "ventes"("projet_uid", "reference");

-- CreateIndex
CREATE INDEX "idx_lignes_vente_vente_id" ON "lignes_vente"("vente_id");

-- CreateIndex
CREATE INDEX "idx_lignes_vente_stock_id" ON "lignes_vente"("stock_id");

-- CreateIndex
CREATE INDEX "idx_avoirs_projet_uid" ON "avoirs"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_avoirs_client_id" ON "avoirs"("client_id");

-- CreateIndex
CREATE INDEX "idx_avoirs_fournisseur_id" ON "avoirs"("fournisseur_id");

-- CreateIndex
CREATE INDEX "idx_avoirs_vente_id" ON "avoirs"("vente_id");

-- CreateIndex
CREATE UNIQUE INDEX "avoirs_projet_uid_reference_key" ON "avoirs"("projet_uid", "reference");

-- CreateIndex
CREATE INDEX "idx_factures_projet_uid" ON "factures"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_factures_vente_id" ON "factures"("vente_id");

-- CreateIndex
CREATE UNIQUE INDEX "factures_projet_uid_numero_facture_key" ON "factures"("projet_uid", "numero_facture");

-- CreateIndex
CREATE INDEX "idx_commandes_projet_uid" ON "commandes"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_commandes_fournisseur_id" ON "commandes"("fournisseur_id");

-- CreateIndex
CREATE UNIQUE INDEX "commandes_projet_uid_reference_key" ON "commandes"("projet_uid", "reference");

-- CreateIndex
CREATE INDEX "idx_lignes_commande_commande_id" ON "lignes_commande"("commande_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_projet_uid" ON "audit_logs"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_audit_logs_utilisateur" ON "audit_logs"("utilisateur");

-- CreateIndex
CREATE INDEX "idx_audit_logs_module" ON "audit_logs"("module");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_etablissements_projet_uid" ON "etablissements"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_etablissements_type" ON "etablissements"("type");

-- CreateIndex
CREATE INDEX "idx_etablissements_is_principal" ON "etablissements"("is_principal");

-- CreateIndex
CREATE INDEX "idx_etablissements_utilisateur_lie" ON "etablissements"("utilisateur_lie_uid");

-- CreateIndex
CREATE INDEX "idx_confreres_projet_uid" ON "confreres"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_confreres_statut" ON "confreres"("statut");

-- CreateIndex
CREATE INDEX "idx_confreres_destinataire" ON "confreres"("destinataire_uid");

-- CreateIndex
CREATE INDEX "idx_confreres_created_at" ON "confreres"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "confreres_projet_uid_reference_key" ON "confreres"("projet_uid", "reference");

-- CreateIndex
CREATE INDEX "idx_lignes_confrere_confrere_id" ON "lignes_confrere"("confrere_id");

-- CreateIndex
CREATE INDEX "idx_historique_general_projet" ON "historique_general"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_historique_general_module" ON "historique_general"("module");

-- CreateIndex
CREATE INDEX "idx_historique_general_entite" ON "historique_general"("entite_id");

-- CreateIndex
CREATE INDEX "idx_historique_general_created_at" ON "historique_general"("created_at");

-- CreateIndex
CREATE INDEX "idx_notifications_projet_uid" ON "notifications"("projet_uid");

-- CreateIndex
CREATE INDEX "idx_notifications_type" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "idx_notifications_actif" ON "notifications"("actif");

-- CreateIndex
CREATE INDEX "idx_notifications_lectures_utilisateur" ON "notifications_lectures"("utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_lectures_notification_id_utilisateur_id_key" ON "notifications_lectures"("notification_id", "utilisateur_id");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_cree_par_fkey" FOREIGN KEY ("cree_par") REFERENCES "utilisateurs"("firebase_uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employes" ADD CONSTRAINT "employes_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employes" ADD CONSTRAINT "employes_cree_par_fkey" FOREIGN KEY ("cree_par") REFERENCES "utilisateurs"("firebase_uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_fournisseur_id_fkey" FOREIGN KEY ("fournisseur_id") REFERENCES "fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_inventaire" ADD CONSTRAINT "historique_inventaire_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventes" ADD CONSTRAINT "ventes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_vente" ADD CONSTRAINT "lignes_vente_vente_id_fkey" FOREIGN KEY ("vente_id") REFERENCES "ventes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_vente" ADD CONSTRAINT "lignes_vente_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoirs" ADD CONSTRAINT "avoirs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoirs" ADD CONSTRAINT "avoirs_fournisseur_id_fkey" FOREIGN KEY ("fournisseur_id") REFERENCES "fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoirs" ADD CONSTRAINT "avoirs_vente_id_fkey" FOREIGN KEY ("vente_id") REFERENCES "ventes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoirs" ADD CONSTRAINT "avoirs_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_vente_id_fkey" FOREIGN KEY ("vente_id") REFERENCES "ventes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_fournisseur_id_fkey" FOREIGN KEY ("fournisseur_id") REFERENCES "fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confreres" ADD CONSTRAINT "confreres_etablissement_source_id_fkey" FOREIGN KEY ("etablissement_source_id") REFERENCES "etablissements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confreres" ADD CONSTRAINT "confreres_etablissement_destination_id_fkey" FOREIGN KEY ("etablissement_destination_id") REFERENCES "etablissements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_confrere" ADD CONSTRAINT "lignes_confrere_confrere_id_fkey" FOREIGN KEY ("confrere_id") REFERENCES "confreres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications_lectures" ADD CONSTRAINT "notifications_lectures_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
