-- Script to truncate ALL tables in the database
-- Run with: psql -h localhost -U your_user -d your_db -f truncate_all.sql

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Truncate all tables in order (respecting dependencies)
-- Audit and history tables
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE historique_general CASCADE;
TRUNCATE TABLE historique_inventaire CASCADE;

-- Transfer tables
TRUNCATE TABLE lignes_transfert CASCADE;
TRUNCATE TABLE transferts CASCADE;
TRUNCATE TABLE etablissements CASCADE;

-- Sales related tables
TRUNCATE TABLE lignes_vente CASCADE;
TRUNCATE TABLE factures CASCADE;
TRUNCATE TABLE avoirs CASCADE;
TRUNCATE TABLE ventes CASCADE;

-- Purchase/Command related tables
TRUNCATE TABLE lignes_commande CASCADE;
TRUNCATE TABLE commandes CASCADE;

-- Stock and product tables
TRUNCATE TABLE stocks CASCADE;
TRUNCATE TABLE produits CASCADE;
TRUNCATE TABLE categories CASCADE;

-- Client and supplier tables
TRUNCATE TABLE clients CASCADE;
TRUNCATE TABLE fournisseurs CASCADE;

-- User and permission tables
TRUNCATE TABLE permissions CASCADE;
TRUNCATE TABLE employes CASCADE;
TRUNCATE TABLE roles CASCADE;
TRUNCATE TABLE utilisateurs CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Verify tables are empty
SELECT 'utilisateurs' as table_name, COUNT(*) as count FROM utilisateurs
UNION ALL SELECT 'employes', COUNT(*) FROM employes
UNION ALL SELECT 'roles', COUNT(*) FROM roles
UNION ALL SELECT 'produits', COUNT(*) FROM produits
UNION ALL SELECT 'stocks', COUNT(*) FROM stocks
UNION ALL SELECT 'ventes', COUNT(*) FROM ventes
UNION ALL SELECT 'factures', COUNT(*) FROM factures
UNION ALL SELECT 'commandes', COUNT(*) FROM commandes
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'fournisseurs', COUNT(*) FROM fournisseurs
UNION ALL SELECT 'etablissements', COUNT(*) FROM etablissements
UNION ALL SELECT 'transferts', COUNT(*) FROM transferts;
