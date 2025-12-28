export interface Produit {
  id: string;
  nom: string;
  codeBarre: string | null;
  type: string | null;
  sousType?: string | null;
  description?: string | null;
  categorieId?: string | null;
}

export interface Categorie {
  id: string;
  nom: string;
  description: string | null;
}

export interface Stock {
  id: string;
  quantiteDisponible: number;
  seuilAlerte: number;
  prixAchat: number | string;
  prixVente: number | string;
  produit: Produit;
  fournisseur?: Fournisseur | null;
  numeroLot?: string | null;
  dateExpiration?: string | null;
  quantiteReservee?: number;
}

export interface Fournisseur {
  id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse?: string | null;
  ville?: string | null;
}

export interface Client {
  id: string;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  solde: number;
  credit: number;
  email?: string | null;
}

export interface LignePanier {
  stock: Stock;
  quantite: number;
  prixUnitaire: number;
  remise: number;
}

export interface LigneCommande {
  stock: Stock;
  quantite: number;
  prixUnitaire: number;
}

export interface Employe {
  id: string;
  nom: string;
  prenom: string | null;
  email: string;
  telephone: string | null;
  role: {
    id: string;
    nom: string;
  } | null;
  actif: boolean;
}

export interface Etablissement {
  id: string;
  nom: string;
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
}

export interface VenteResult {
  id: string;
  reference: string;
  total: number;
  remise: number;
  montantDu: number;
  montantPaye: number | null;
  typePaiement: string;
  createdAt: string;
  client: { nom: string; prenom: string | null } | null;
  lignes: Array<{
    quantite: number;
    prixUnitaire: number;
    remise: number;
    stock: { produit: { nom: string } };
  }>;
}

export type SortDirection = "asc" | "desc";

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
}
