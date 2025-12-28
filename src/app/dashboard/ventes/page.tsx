"use client";

import { useState, useEffect, useMemo } from "react";
import { sortItems } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import { SortableHeader, SortDirection } from "@/components/ui/sortable-header";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Receipt,
  TrendingUp,
  CreditCard,
  Eye,
  ShoppingCart,
  Loader2,
  Package,
  Calendar,
  User,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/constants";
import Link from "next/link";

const PAGE_SIZE = 10;

interface LigneVente {
  id: string;
  quantite: number;
  prixUnit: number;
  remise: number;
  total: number;
  stock: {
    produit: {
      nom: string;
      codeBarre: string | null;
    };
  };
}

interface Client {
  id: string;
  nom: string;
  prenom: string | null;
  telephone: string | null;
}

interface Vente {
  id: string;
  reference: string;
  clientId: string | null;
  client: Client | null;
  modePaiement: string | null;
  typePaiement: string | null;
  statut: string;
  sousTotal: number;
  remise: number;
  total: number;
  montantPaye: number;
  montantDu: number;
  montantSolde: number;
  montantCredit: number;
  vendeurNom: string | null;
  note: string | null;
  createdAt: string;
  lignes: LigneVente[];
  _count: {
    factures: number;
    avoirs: number;
  };
}

const MODES_PAIEMENT: Record<string, { label: string; variant: "success" | "info" | "warning" | "neutral" }> = {
  especes: { label: "Espèces", variant: "success" },
  carte: { label: "Carte", variant: "info" },
  cheque: { label: "Chèque", variant: "neutral" },
  credit: { label: "Crédit", variant: "warning" },
};

const TYPES_PAIEMENT: Record<string, { label: string; variant: "success" | "info" | "warning" | "neutral" }> = {
  espece: { label: "Espèce", variant: "success" },
  carte: { label: "Carte", variant: "info" },
  cheque: { label: "Chèque", variant: "neutral" },
  credit: { label: "Crédit", variant: "warning" },
  solde: { label: "Solde", variant: "info" },
};

const STATUTS: Record<string, { label: string; variant: "success" | "info" | "warning" | "neutral" }> = {
  en_cours: { label: "En cours", variant: "warning" },
  payee: { label: "Payée", variant: "success" },
  partielle: { label: "Partielle", variant: "info" },
  annulee: { label: "Annulée", variant: "neutral" },
  non_specifie: { label: "Non spécifié", variant: "neutral" },
  credit: { label: "À crédit", variant: "warning" },
};

export default function VentesPage() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<string>("");
  const [filterStatut, setFilterStatut] = useState<string>("");
  const [dateDebut, setDateDebut] = useState<string>("");
  const [dateFin, setDateFin] = useState<string>("");
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    async function fetchVentes() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/ventes");
        
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des ventes");
        }
        
        const data = await response.json();
        setVentes(data.ventes || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }

    fetchVentes();
  }, []);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const ventesFiltrees = useMemo(() => {
    return ventes.filter((v) => {
      const matchSearch =
        !search ||
        v.reference.toLowerCase().includes(search.toLowerCase()) ||
        v.client?.nom?.toLowerCase().includes(search.toLowerCase()) ||
        v.client?.prenom?.toLowerCase().includes(search.toLowerCase());

      const matchMode = !filterMode || v.modePaiement === filterMode;
      const matchStatut = !filterStatut || v.statut === filterStatut;

      const venteDate = new Date(v.createdAt).toISOString().split("T")[0];
      const matchDateDebut = !dateDebut || venteDate >= dateDebut;
      const matchDateFin = !dateFin || venteDate <= dateFin;

      return matchSearch && matchMode && matchStatut && matchDateDebut && matchDateFin;
    });
  }, [ventes, search, filterMode, filterStatut, dateDebut, dateFin]);

  const sortedVentes = useMemo(() => {
    return sortItems({
      items: ventesFiltrees,
      sortKey,
      sortDirection,
      getValue: (v, key) => {
        switch (key) {
          case "reference": return v.reference;
          case "client": return v.client ? `${v.client.nom} ${v.client.prenom || ""}` : "";
          case "createdAt": return new Date(v.createdAt).getTime();
          case "total": return Number(v.total);
          default: return null;
        }
      },
    });
  }, [ventesFiltrees, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedVentes.length / PAGE_SIZE);
  const paginatedVentes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedVentes.slice(start, start + PAGE_SIZE);
  }, [sortedVentes, currentPage]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    
    const ventesAujourdhui = ventes.filter(
      (v) => new Date(v.createdAt).toDateString() === today
    );
    
    const totalJour = ventesAujourdhui.reduce(
      (acc, v) => acc + Number(v.total),
      0
    );
    
    const nbTransactions = ventes.length;
    
    const totalCredits = ventes
      .filter((v) => v.modePaiement === "credit" || v.statut === "partielle")
      .reduce((acc, v) => acc + Number(v.montantDu), 0);

    return { totalJour, nbTransactions, totalCredits };
  }, [ventes]);

  const formatClientNom = (client: Client | null): string => {
    if (!client) return "Client anonyme";
    const parts = [client.nom, client.prenom].filter(Boolean);
    return parts.join(" ") || "Client anonyme";
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des ventes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Receipt className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold">Erreur de chargement</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Historique des ventes</h1>
            <p className="text-muted-foreground">
              Consultez l&apos;historique de vos ventes
            </p>
          </div>
          <Link href="/dashboard/vendre">
            <Button className="cursor-pointer">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Nouvelle vente
            </Button>
          </Link>
        </div>

        <div className="grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card sm:flex-col sm:items-start sm:gap-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900 shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0 sm:mt-3">
              <p className="text-lg sm:text-2xl font-semibold truncate">{formatCurrency(stats.totalJour)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Ventes du jour</p>
            </div>
            <span className="text-xs font-medium text-green-600 dark:text-green-400 sm:hidden">Aujourd&apos;hui</span>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card sm:flex-col sm:items-start sm:gap-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900 shrink-0">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0 sm:mt-3">
              <p className="text-lg sm:text-2xl font-semibold">{stats.nbTransactions}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Transactions</p>
            </div>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 sm:hidden">Total</span>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card sm:flex-col sm:items-start sm:gap-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900 shrink-0">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0 sm:mt-3">
              <p className="text-lg sm:text-2xl font-semibold truncate">{formatCurrency(stats.totalCredits)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Crédits clients</p>
            </div>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 sm:hidden">En attente</span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par référence ou client..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
                <Select
                  value={filterMode || "all"}
                  onValueChange={(v) => { setFilterMode(v === "all" ? "" : v); setCurrentPage(1); }}
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Mode paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="carte">Carte</SelectItem>
                    <SelectItem value="cheque">Chèque</SelectItem>
                    <SelectItem value="credit">Crédit</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filterStatut || "all"}
                  onValueChange={(v) => { setFilterStatut(v === "all" ? "" : v); setCurrentPage(1); }}
                >
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="payee">Payée</SelectItem>
                    <SelectItem value="partielle">Partielle</SelectItem>
                    <SelectItem value="credit">À crédit</SelectItem>
                    <SelectItem value="annulee">Annulée</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                  <span className="text-sm text-muted-foreground">Du</span>
                  <Input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => { setDateDebut(e.target.value); setCurrentPage(1); }}
                    className="w-[150px]"
                  />
                  <span className="text-sm text-muted-foreground">au</span>
                  <Input
                    type="date"
                    value={dateFin}
                    onChange={(e) => { setDateFin(e.target.value); setCurrentPage(1); }}
                    className="w-[150px]"
                  />
                </div>
                {(search || filterMode || filterStatut || dateDebut || dateFin) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setFilterMode("");
                      setFilterStatut("");
                      setDateDebut("");
                      setDateFin("");
                    }}
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
            </div>
        </div>

        {ventesFiltrees.length === 0 ? (
          <div className="rounded-lg border bg-card">
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Aucune vente trouvée</h3>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {ventes.length === 0
                  ? "Vous n'avez pas encore effectué de ventes."
                  : "Aucune vente ne correspond à vos critères de recherche."}
              </p>
              {ventes.length === 0 && (
                <Link href="/dashboard/vendre" className="mt-4">
                  <Button>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Effectuer une vente
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm">
                        <SortableHeader
                          label="Référence"
                          sortKey="reference"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm hidden md:table-cell">
                        <SortableHeader
                          label="Client"
                          sortKey="client"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm hidden lg:table-cell">
                        <SortableHeader
                          label="Date"
                          sortKey="createdAt"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell">
                        Paiement
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-right text-sm">
                        <SortableHeader
                          label="Total"
                          sortKey="total"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                          className="justify-end"
                        />
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedVentes.map((vente) => (
                      <tr key={vente.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-medium">
                            {vente.reference}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm">
                            {formatClientNom(vente.client)}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(vente.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {vente.typePaiement ? (
                            <Badge
                              variant={
                                TYPES_PAIEMENT[vente.typePaiement]?.variant ||
                                "neutral"
                              }
                            >
                              {TYPES_PAIEMENT[vente.typePaiement]?.label ||
                                vente.typePaiement}
                            </Badge>
                          ) : vente.modePaiement ? (
                            <Badge
                              variant={
                                MODES_PAIEMENT[vente.modePaiement]?.variant ||
                                "neutral"
                              }
                            >
                              {MODES_PAIEMENT[vente.modePaiement]?.label ||
                                vente.modePaiement}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={STATUTS[vente.statut]?.variant || "neutral"}
                          >
                            {STATUTS[vente.statut]?.label || vente.statut}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold">
                            {formatCurrency(Number(vente.total))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 cursor-pointer"
                                onClick={() => setSelectedVente(vente)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Voir les détails</TooltipContent>
                          </Tooltip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
                  <PaginationInfo
                    currentPage={currentPage}
                    pageSize={PAGE_SIZE}
                    totalItems={sortedVentes.length}
                  />
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <Dialog
          open={!!selectedVente}
          onOpenChange={() => setSelectedVente(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Détails de la vente</DialogTitle>
              <DialogDescription>
                Référence : {selectedVente?.reference}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">
                    {formatClientNom(selectedVente?.client || null)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {formatDate(selectedVente?.createdAt || null)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type de paiement</p>
                  <p className="font-medium">
                    {selectedVente?.typePaiement
                      ? TYPES_PAIEMENT[selectedVente.typePaiement]?.label ||
                        selectedVente.typePaiement
                      : selectedVente?.modePaiement
                      ? MODES_PAIEMENT[selectedVente.modePaiement]?.label ||
                        selectedVente.modePaiement
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  {selectedVente && (
                    <Badge variant={STATUTS[selectedVente.statut]?.variant || "neutral"}>
                      {STATUTS[selectedVente.statut]?.label || selectedVente.statut}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-200 dark:border-blue-900">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Vendeur</p>
                </div>
                <p className="mt-1 text-blue-700 dark:text-blue-400">
                  {selectedVente?.vendeurNom || "Non spécifié"}
                </p>
              </div>

              <div>
                <h4 className="mb-2 font-medium">Produits vendus</h4>
                <div className="rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Produit</th>
                        <th className="px-3 py-2 text-center font-medium">Qté</th>
                        <th className="px-3 py-2 text-right font-medium">
                          Prix unit.
                        </th>
                        <th className="px-3 py-2 text-right font-medium">Remise</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedVente?.lignes.map((ligne) => (
                        <tr key={ligne.id}>
                          <td className="px-3 py-2">
                            {ligne.stock?.produit?.nom || "Produit inconnu"}
                          </td>
                          <td className="px-3 py-2 text-center">{ligne.quantite}</td>
                          <td className="px-3 py-2 text-right">
                            {formatCurrency(Number(ligne.prixUnit))}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {Number(ligne.remise) > 0
                              ? formatCurrency(Number(ligne.remise))
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {formatCurrency(Number(ligne.total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex justify-between text-sm">
                  <span>Sous-total</span>
                  <span>{formatCurrency(Number(selectedVente?.sousTotal || 0))}</span>
                </div>
                {Number(selectedVente?.remise || 0) > 0 && (
                  <div className="mt-1 flex justify-between text-sm text-green-600">
                    <span>Remise</span>
                    <span>-{formatCurrency(Number(selectedVente?.remise || 0))}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(Number(selectedVente?.total || 0))}</span>
                </div>
                {Number(selectedVente?.montantSolde || 0) > 0 && (
                  <div className="mt-1 flex justify-between text-sm text-blue-600">
                    <span>Payé via solde</span>
                    <span>{formatCurrency(Number(selectedVente?.montantSolde || 0))}</span>
                  </div>
                )}
                {Number(selectedVente?.montantCredit || 0) > 0 && (
                  <div className="mt-1 flex justify-between text-sm text-amber-600">
                    <span>Mis en crédit</span>
                    <span>{formatCurrency(Number(selectedVente?.montantCredit || 0))}</span>
                  </div>
                )}
                {Number(selectedVente?.montantDu || 0) > 0 && (
                  <div className="mt-1 flex justify-between text-sm text-red-600">
                    <span>Reste à payer</span>
                    <span>{formatCurrency(Number(selectedVente?.montantDu || 0))}</span>
                  </div>
                )}
              </div>

              {selectedVente?.note && (
                <div>
                  <p className="text-sm text-muted-foreground">Note</p>
                  <p className="text-sm">{selectedVente.note}</p>
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedVente(null)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
