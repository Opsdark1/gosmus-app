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
  Download,
  ClipboardList,
  Clock,
  CheckCircle,
  Eye,
  ShoppingBag,
  Loader2,
  User,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/constants";
import Link from "next/link";
import { toast } from "sonner";

const PAGE_SIZE = 10;

interface LigneCommande {
  id: string;
  produitNom: string;
  quantite: number;
  prixUnit: number;
  total: number;
}

interface Fournisseur {
  id: string;
  nom: string;
}

interface Commande {
  id: string;
  reference: string;
  fournisseur: Fournisseur;
  statut: string;
  sousTotal: number;
  fraisLivraison: number;
  total: number;
  dateLivraison: string | null;
  note: string | null;
  creePar: string | null;
  createdAt: string;
  lignes: LigneCommande[];
}

const STATUTS: Record<string, { label: string; variant: "success" | "info" | "warning" | "neutral" }> = {
  en_attente: { label: "En attente", variant: "warning" },
  confirmee: { label: "Confirmée", variant: "info" },
  expediee: { label: "Expédiée", variant: "info" },
  livree: { label: "Livrée", variant: "success" },
  annulee: { label: "Annulée", variant: "neutral" },
};

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>("");
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    const fetchCommandes = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (filterStatut) params.set("statut", filterStatut);
        
        const res = await fetch(`/api/commandes?${params}`);
        const data = await res.json();
        if (data.commandes) {
          setCommandes(data.commandes);
        }
      } catch (err) {
        console.error("Erreur chargement commandes:", err);
        setError("Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchCommandes, 300);
    return () => clearTimeout(debounce);
  }, [search, filterStatut]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const sortedCommandes = useMemo(() => {
    return sortItems({
      items: commandes,
      sortKey,
      sortDirection,
      getValue: (c, key) => {
        switch (key) {
          case "reference": return c.reference;
          case "fournisseur": return c.fournisseur.nom;
          case "createdAt": return new Date(c.createdAt).getTime();
          case "total": return Number(c.total);
          default: return null;
        }
      },
    });
  }, [commandes, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedCommandes.length / PAGE_SIZE);
  const paginatedCommandes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedCommandes.slice(start, start + PAGE_SIZE);
  }, [sortedCommandes, currentPage]);

  const enAttente = commandes.filter((c) => c.statut === "en_attente").length;
  const livrees = commandes.filter((c) => c.statut === "livree").length;
  const totalMois = commandes.reduce((acc, c) => acc + Number(c.total), 0);

  const handleExportCSV = () => {
    if (sortedCommandes.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const headers = ["Référence", "Fournisseur", "Statut", "Total", "Date"];
    const rows = sortedCommandes.map(c => [
      c.reference,
      c.fournisseur.nom,
      c.statut,
      c.total,
      new Date(c.createdAt).toLocaleDateString("fr-FR")
    ]);

    const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `commandes_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export réussi");
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Historique des commandes</h1>
            <p className="text-muted-foreground">Suivez vos commandes fournisseurs</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="cursor-pointer" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            <Link href="/dashboard/commander">
              <Button className="cursor-pointer">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Nouvelle commande
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card sm:flex-col sm:items-start sm:gap-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900 shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0 sm:mt-3">
              <p className="text-lg sm:text-2xl font-semibold">{enAttente}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">En attente</p>
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium sm:hidden">En cours</span>
          </div>
          <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card sm:flex-col sm:items-start sm:gap-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900 shrink-0">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0 sm:mt-3">
              <p className="text-lg sm:text-2xl font-semibold">{livrees}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Livrées</p>
            </div>
            <span className="text-xs text-green-600 dark:text-green-400 font-medium sm:hidden">Ce mois</span>
          </div>
          <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card sm:flex-col sm:items-start sm:gap-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 sm:mt-3">
              <p className="text-lg sm:text-2xl font-semibold truncate">{formatCurrency(totalMois)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total ce mois</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par référence ou fournisseur..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatut} onValueChange={(v) => setFilterStatut(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="confirmee">Confirmée</SelectItem>
                  <SelectItem value="expediee">Expédiée</SelectItem>
                  <SelectItem value="livree">Livrée</SelectItem>
                  <SelectItem value="annulee">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
        </div>

        {loading ? (
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-center py-16">
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : commandes.length === 0 ? (
          <div className="rounded-lg border bg-card">
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <ClipboardList className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Aucune commande</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                Passez vos premières commandes fournisseurs pour approvisionner votre stock
              </p>
              <Link href="/dashboard/commander">
                <Button className="cursor-pointer">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Nouvelle commande
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b">
                      <th className="p-4 text-left text-sm">
                        <SortableHeader
                          label="Référence"
                          sortKey="reference"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="p-4 text-left text-sm hidden md:table-cell">
                        <SortableHeader
                          label="Fournisseur"
                          sortKey="fournisseur"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="p-4 text-left text-sm font-medium text-muted-foreground">Statut</th>
                      <th className="p-4 text-left text-sm hidden lg:table-cell">
                        <SortableHeader
                          label="Livraison"
                          sortKey="createdAt"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="p-4 text-right text-sm">
                        <SortableHeader
                          label="Total"
                          sortKey="total"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                          className="justify-end"
                        />
                      </th>
                      <th className="p-4 text-center text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCommandes.map((commande) => (
                      <tr key={commande.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                            {commande.reference}
                          </code>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          {commande.fournisseur.nom}
                        </td>
                        <td className="p-4">
                          <Badge variant={STATUTS[commande.statut]?.variant || "neutral"}>
                            {STATUTS[commande.statut]?.label || commande.statut}
                          </Badge>
                        </td>
                        <td className="p-4 text-muted-foreground hidden lg:table-cell">
                          {commande.dateLivraison ? formatDate(commande.dateLivraison) : "—"}
                        </td>
                        <td className="p-4 text-right font-semibold">
                          {formatCurrency(Number(commande.total))}
                        </td>
                        <td className="p-4 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 cursor-pointer"
                                onClick={() => setSelectedCommande(commande)}
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
                    totalItems={sortedCommandes.length}
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

        <Dialog open={!!selectedCommande} onOpenChange={() => setSelectedCommande(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Détails de la commande</DialogTitle>
              <DialogDescription>
                {selectedCommande?.reference}
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              {selectedCommande && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm text-muted-foreground">Fournisseur</p>
                      <p className="font-medium">{selectedCommande.fournisseur.nom}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date commande</p>
                      <p className="font-medium">{formatDate(selectedCommande.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Statut</p>
                      <Badge variant={STATUTS[selectedCommande.statut]?.variant || "neutral"}>
                        {STATUTS[selectedCommande.statut]?.label || selectedCommande.statut}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Livraison prévue</p>
                      <p className="font-medium">
                        {selectedCommande.dateLivraison 
                          ? formatDate(selectedCommande.dateLivraison) 
                          : "Non définie"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-200 dark:border-blue-900">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Créée par</p>
                    </div>
                    <p className="mt-1 text-blue-700 dark:text-blue-400">
                      {selectedCommande.creePar || "Non spécifié"}
                    </p>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 border-b">
                      <span className="font-medium">{selectedCommande.lignes.length} produit(s)</span>
                    </div>
                    <div className="divide-y">
                      {selectedCommande.lignes.map((ligne) => (
                        <div key={ligne.id} className="flex justify-between items-center p-3">
                          <div className="flex-1">
                            <p className="font-medium">{ligne.produitNom}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(Number(ligne.prixUnit))} × {ligne.quantite}
                            </p>
                          </div>
                          <p className="font-semibold">
                            {formatCurrency(Number(ligne.total))}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="border-t bg-muted/50 p-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Sous-total</span>
                        <span>{formatCurrency(Number(selectedCommande.sousTotal))}</span>
                      </div>
                      {Number(selectedCommande.fraisLivraison) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Frais de livraison</span>
                          <span>{formatCurrency(Number(selectedCommande.fraisLivraison))}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold pt-1 border-t">
                        <span>Total</span>
                        <span className="text-primary">{formatCurrency(Number(selectedCommande.total))}</span>
                      </div>
                    </div>
                  </div>

                  {selectedCommande.note && (
                    <div>
                      <p className="text-sm text-muted-foreground">Note</p>
                      <p className="text-sm">{selectedCommande.note}</p>
                    </div>
                  )}
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedCommande(null)} className="cursor-pointer">
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
