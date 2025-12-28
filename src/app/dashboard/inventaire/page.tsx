"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn, sortItems } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import { SortableHeader, SortDirection } from "@/components/ui/sortable-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Plus,
  Search,
  Warehouse,
  Download,
  Package,
  Pencil,
  Trash2,
  Calendar,
  AlertTriangle,
  Loader2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PAGE_SIZE = 10;

interface Produit {
  id: string;
  nom: string;
  codeBarre: string | null;
}

interface Fournisseur {
  id: string;
  nom: string;
}

interface Stock {
  id: string;
  produit: Produit;
  fournisseur: Fournisseur | null;
  numeroLot: string | null;
  prixAchat: string;
  prixVente: string;
  quantiteDisponible: number;
  quantiteReservee: number;
  seuilAlerte: number;
  dateExpiration: string | null;
  createdAt: string;
}

export default function InventairePage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>("produit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  const [filterFournisseur, setFilterFournisseur] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");
  
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Produit | null>(null);
  
  const [formData, setFormData] = useState({
    produitId: "",
    fournisseurId: "",
    numeroLot: "",
    prixAchat: "",
    prixVente: "",
    quantiteDisponible: "",
    seuilAlerte: "10",
    dateExpiration: "",
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/stocks?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur chargement stocks");
      const data = await res.json();
      setStocks(data.stocks || []);
    } catch {
      toast.error("Erreur lors du chargement des stocks");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  const fetchProduits = async () => {
    try {
      const res = await fetch("/api/produits");
      if (res.ok) {
        const data = await res.json();
        setProduits(data.produits || []);
      }
    } catch {
      console.error("Erreur chargement produits");
    }
  };

  const fetchFournisseurs = async () => {
    try {
      const res = await fetch("/api/fournisseurs");
      if (res.ok) {
        const data = await res.json();
        setFournisseurs(data.fournisseurs || []);
      }
    } catch {
      console.error("Erreur chargement fournisseurs");
    }
  };

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  useEffect(() => {
    fetchProduits();
    fetchFournisseurs();
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

  const getStockStatus = (stock: Stock) => {
    const today = new Date();
    if (stock.dateExpiration) {
      const expDate = new Date(stock.dateExpiration);
      const daysUntilExp = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExp <= 0) return { label: "Expiré", variant: "warning" as const, key: "expire" };
      if (daysUntilExp <= 30) return { label: "Expire bientôt", variant: "warning" as const, key: "expire_soon" };
    }
    if (stock.quantiteDisponible === 0) return { label: "Épuisé", variant: "warning" as const, key: "epuise" };
    if (stock.quantiteDisponible <= stock.seuilAlerte) return { label: "Stock bas", variant: "warning" as const, key: "stock_bas" };
    return { label: "Normal", variant: "success" as const, key: "normal" };
  };

  const getMargin = (prixAchat: string, prixVente: string) => {
    const achat = parseFloat(prixAchat);
    const vente = parseFloat(prixVente);
    if (achat === 0 || vente === 0) return 0;
    return ((vente - achat) / vente) * 100;
  };

  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      if (filterFournisseur !== "all" && stock.fournisseur?.id !== filterFournisseur) {
        return false;
      }
      if (filterStatut !== "all") {
        const status = getStockStatus(stock);
        if (filterStatut === "alerte" && status.key === "normal") return false;
        if (filterStatut === "normal" && status.key !== "normal") return false;
        if (filterStatut === "stock_bas" && status.key !== "stock_bas") return false;
        if (filterStatut === "epuise" && status.key !== "epuise") return false;
        if (filterStatut === "expire" && status.key !== "expire" && status.key !== "expire_soon") return false;
      }
      return true;
    });
  }, [stocks, filterFournisseur, filterStatut]);

  const sortedStocks = useMemo(() => {
    return sortItems({
      items: filteredStocks,
      sortKey,
      sortDirection,
      getValue: (stock, key) => {
        switch (key) {
          case "produit": return stock.produit.nom;
          case "numeroLot": return stock.numeroLot || "";
          case "fournisseur": return stock.fournisseur?.nom || "";
          case "prixAchat": return parseFloat(stock.prixAchat);
          case "prixVente": return parseFloat(stock.prixVente);
          case "marge": return getMargin(stock.prixAchat, stock.prixVente);
          case "quantite": return stock.quantiteDisponible;
          case "expiration": return stock.dateExpiration ? new Date(stock.dateExpiration).getTime() : 0;
          default: return null;
        }
      },
    });
  }, [filteredStocks, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedStocks.length / PAGE_SIZE);
  const paginatedStocks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedStocks.slice(start, start + PAGE_SIZE);
  }, [sortedStocks, currentPage]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return produits.slice(0, 5);
    const searchLower = productSearch.toLowerCase();
    return produits.filter(p => 
      p.nom.toLowerCase().includes(searchLower) || 
      (p.codeBarre && p.codeBarre.toLowerCase().includes(searchLower))
    ).slice(0, 5);
  }, [produits, productSearch]);

  const handleSelectProduct = (product: Produit) => {
    setSelectedProduct(product);
    setProductSearch(product.nom);
    setFormData({ ...formData, produitId: product.id });
    setShowProductDropdown(false);
  };

  const resetForm = () => {
    setFormData({
      produitId: "",
      fournisseurId: "",
      numeroLot: "",
      prixAchat: "",
      prixVente: "",
      quantiteDisponible: "",
      seuilAlerte: "10",
      dateExpiration: "",
    });
    setProductSearch("");
    setSelectedProduct(null);
    setShowProductDropdown(false);
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (stock: Stock) => {
    setSelectedStock(stock);
    setSelectedProduct(stock.produit);
    setProductSearch(stock.produit.nom);
    setFormData({
      produitId: stock.produit.id,
      fournisseurId: stock.fournisseur?.id || "",
      numeroLot: stock.numeroLot || "",
      prixAchat: parseFloat(stock.prixAchat).toString(),
      prixVente: parseFloat(stock.prixVente).toString(),
      quantiteDisponible: stock.quantiteDisponible.toString(),
      seuilAlerte: stock.seuilAlerte.toString(),
      dateExpiration: stock.dateExpiration ? stock.dateExpiration.split("T")[0] : "",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (stock: Stock) => {
    setSelectedStock(stock);
    setDeleteDialogOpen(true);
  };

  const openDetailsDialog = (stock: Stock) => {
    setSelectedStock(stock);
    setDetailsDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.produitId || !formData.prixAchat || !formData.prixVente) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produitId: formData.produitId,
          fournisseurId: formData.fournisseurId || null,
          numeroLot: formData.numeroLot || null,
          prixAchat: parseFloat(formData.prixAchat),
          prixVente: parseFloat(formData.prixVente),
          quantiteDisponible: parseInt(formData.quantiteDisponible) || 0,
          seuilAlerte: parseInt(formData.seuilAlerte) || 10,
          dateExpiration: formData.dateExpiration || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur création");
      }

      toast.success("Lot de stock créé avec succès");
      setDialogOpen(false);
      resetForm();
      fetchStocks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/stocks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedStock.id,
          fournisseurId: formData.fournisseurId || null,
          numeroLot: formData.numeroLot || null,
          prixAchat: parseFloat(formData.prixAchat),
          prixVente: parseFloat(formData.prixVente),
          quantiteDisponible: parseInt(formData.quantiteDisponible) || 0,
          seuilAlerte: parseInt(formData.seuilAlerte) || 10,
          dateExpiration: formData.dateExpiration || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur modification");
      }

      toast.success("Stock modifié avec succès");
      setEditDialogOpen(false);
      setSelectedStock(null);
      fetchStocks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStock) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/stocks?id=${selectedStock.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur suppression");
      }

      toast.success("Stock supprimé avec succès");
      setDeleteDialogOpen(false);
      setSelectedStock(null);
      fetchStocks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const totalValue = stocks.reduce((sum, s) => sum + parseFloat(s.prixVente) * s.quantiteDisponible, 0);
  const lowStockCount = stocks.filter((s) => s.quantiteDisponible <= s.seuilAlerte).length;
  const totalUnits = stocks.reduce((sum, s) => sum + s.quantiteDisponible, 0);

  const handleExportCSV = () => {
    if (sortedStocks.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const headers = ["Produit", "Code Barre", "N° Lot", "Fournisseur", "Prix Achat", "Prix Vente", "Quantité", "Seuil Alerte", "Date Expiration"];
    const rows = sortedStocks.map(s => [
      s.produit.nom,
      s.produit.codeBarre || "",
      s.numeroLot || "",
      s.fournisseur?.nom || "",
      s.prixAchat,
      s.prixVente,
      s.quantiteDisponible,
      s.seuilAlerte,
      s.dateExpiration ? new Date(s.dateExpiration).toLocaleDateString("fr-FR") : ""
    ]);

    const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventaire_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export réussi");
  };

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventaire</h1>
          <p className="text-muted-foreground">Gérez vos lots de stock avec prix, quantités et dates d&apos;expiration</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau lot
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card sm:flex-col sm:items-start sm:gap-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 sm:mt-3">
              <p className="text-lg sm:text-2xl font-semibold">{stocks.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Lots en stock</p>
            </div>
        </div>
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card sm:flex-col sm:items-start sm:gap-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900 shrink-0">
              <Warehouse className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0 sm:mt-3">
              <p className="text-lg sm:text-2xl font-semibold">{totalUnits}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Unités totales</p>
            </div>
        </div>
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card sm:flex-col sm:items-start sm:gap-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900 shrink-0">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0 sm:mt-3">
              <p className="text-lg sm:text-2xl font-semibold">{lowStockCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Alertes stock</p>
            </div>
        </div>
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card sm:flex-col sm:items-start sm:gap-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900 shrink-0">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0 sm:mt-3">
              <p className="text-lg sm:text-2xl font-semibold truncate">{formatCurrency(totalValue)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Valeur totale</p>
            </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par produit, lot, fournisseur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <Select value={filterFournisseur} onValueChange={(v) => { setFilterFournisseur(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous fournisseurs</SelectItem>
                  {fournisseurs.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatut} onValueChange={(v) => { setFilterStatut(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alerte">En alerte</SelectItem>
                  <SelectItem value="stock_bas">Stock bas</SelectItem>
                  <SelectItem value="epuise">Épuisé</SelectItem>
                  <SelectItem value="expire">Expire / Expiré</SelectItem>
                </SelectContent>
              </Select>
              {(filterFournisseur !== "all" || filterStatut !== "all") && (
                <Button variant="ghost" size="sm" className="col-span-2 sm:col-span-1" onClick={() => { setFilterFournisseur("all"); setFilterStatut("all"); }}>
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-card">
          <div className="p-6">
            <LoadingState />
          </div>
        </div>
      ) : stocks.length === 0 ? (
        <div className="rounded-lg border bg-card">
          <div className="p-6">
            <EmptyState
              icon={Warehouse}
              title="Aucun stock"
              message="Ajoutez des lots de stock pour suivre vos produits"
            />
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un lot
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left text-sm">
                      <SortableHeader
                        label="Produit"
                        sortKey="produit"
                        currentSort={sortKey}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="p-4 text-left text-sm hidden lg:table-cell">
                      <SortableHeader
                        label="N° Lot"
                        sortKey="numeroLot"
                        currentSort={sortKey}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="p-4 text-left text-sm hidden xl:table-cell">
                      <SortableHeader
                        label="Fournisseur"
                        sortKey="fournisseur"
                        currentSort={sortKey}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="p-4 text-right text-sm hidden md:table-cell">
                      <SortableHeader
                        label="Prix achat"
                        sortKey="prixAchat"
                        currentSort={sortKey}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                        className="justify-end"
                      />
                    </th>
                    <th className="p-4 text-right text-sm">
                      <SortableHeader
                        label="Prix vente"
                        sortKey="prixVente"
                        currentSort={sortKey}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                        className="justify-end"
                      />
                    </th>
                    <th className="p-4 text-right text-sm hidden lg:table-cell">
                      <SortableHeader
                        label="Marge"
                        sortKey="marge"
                        currentSort={sortKey}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                        className="justify-end"
                      />
                    </th>
                    <th className="p-4 text-right text-sm">
                      <SortableHeader
                        label="Quantité"
                        sortKey="quantite"
                        currentSort={sortKey}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                        className="justify-end"
                      />
                    </th>
                    <th className="p-4 text-left text-sm hidden md:table-cell">
                      <SortableHeader
                        label="Expiration"
                        sortKey="expiration"
                        currentSort={sortKey}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Statut</th>
                    <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStocks.map((stock) => {
                    const status = getStockStatus(stock);
                    return (
                      <tr 
                        key={stock.id} 
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('.actions-cell')) return;
                          openDetailsDialog(stock);
                        }}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{stock.produit.nom}</p>
                              <p className="text-xs text-muted-foreground">{stock.produit.codeBarre || "-"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-sm hidden lg:table-cell">{stock.numeroLot || "-"}</td>
                        <td className="p-4 text-muted-foreground hidden xl:table-cell">{stock.fournisseur?.nom || "-"}</td>
                        <td className="p-4 text-right hidden md:table-cell">{formatCurrency(parseFloat(stock.prixAchat))}</td>
                        <td className="p-4 text-right font-medium">{formatCurrency(parseFloat(stock.prixVente))}</td>
                        <td className="p-4 text-right hidden lg:table-cell">
                          {(() => {
                            const margin = getMargin(stock.prixAchat, stock.prixVente);
                            return (
                              <span className={cn(
                                "font-medium",
                                margin < 10 ? "text-red-600 dark:text-red-400" :
                                margin < 20 ? "text-amber-600 dark:text-amber-400" :
                                "text-green-600 dark:text-green-400"
                              )}>
                                {margin.toFixed(1)}%
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-4 text-right">
                          <span className={stock.quantiteDisponible <= stock.seuilAlerte ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                            {stock.quantiteDisponible}
                          </span>
                          {stock.quantiteReservee > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">({stock.quantiteReservee} rés.)</span>
                          )}
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          {stock.dateExpiration ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{new Date(stock.dateExpiration).toLocaleDateString("fr-FR")}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="p-4 text-right actions-cell">
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetailsDialog(stock)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Voir les détails</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(stock)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Modifier</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeleteDialog(stock)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Supprimer</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
                <PaginationInfo
                  currentPage={currentPage}
                  pageSize={PAGE_SIZE}
                  totalItems={sortedStocks.length}
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

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setShowProductDropdown(false);
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ajouter un lot de stock</DialogTitle>
            <DialogDescription>Enregistrez un nouveau lot avec ses informations de prix, quantité et expiration.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <DialogBody>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Produit *</Label>
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Rechercher un produit..." 
                          value={productSearch}
                          onChange={(e) => {
                            setProductSearch(e.target.value);
                            setShowProductDropdown(true);
                            if (!e.target.value) {
                              setSelectedProduct(null);
                              setFormData({ ...formData, produitId: "" });
                            }
                          }}
                          onFocus={() => setShowProductDropdown(true)}
                          className="pl-9"
                        />
                      </div>
                      {showProductDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((p) => (
                              <div
                                key={p.id}
                                className="px-3 py-2 cursor-pointer hover:bg-accent text-sm"
                                onClick={() => handleSelectProduct(p)}
                              >
                                <div className="font-medium">{p.nom}</div>
                                {p.codeBarre && (
                                  <div className="text-xs text-muted-foreground">{p.codeBarre}</div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              Aucun produit trouvé
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedProduct && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" />
                        <span>Sélectionné: {selectedProduct.nom}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Fournisseur</Label>
                    <Select value={formData.fournisseurId} onValueChange={(value) => setFormData({ ...formData, fournisseurId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un fournisseur" />
                      </SelectTrigger>
                      <SelectContent>
                        {fournisseurs.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Numéro de lot</Label>
                  <Input placeholder="Ex: LOT-2024-001" value={formData.numeroLot} onChange={(e) => setFormData({ ...formData, numeroLot: e.target.value })} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Prix d&apos;achat (MAD) *</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={formData.prixAchat} onChange={(e) => setFormData({ ...formData, prixAchat: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Prix de vente (MAD) *</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={formData.prixVente} onChange={(e) => setFormData({ ...formData, prixVente: e.target.value })} required />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Quantité</Label>
                    <Input type="number" placeholder="0" value={formData.quantiteDisponible} onChange={(e) => setFormData({ ...formData, quantiteDisponible: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Seuil d&apos;alerte</Label>
                    <Input type="number" placeholder="10" value={formData.seuilAlerte} onChange={(e) => setFormData({ ...formData, seuilAlerte: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date d&apos;expiration</Label>
                  <Input type="date" value={formData.dateExpiration} onChange={(e) => setFormData({ ...formData, dateExpiration: e.target.value })} />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier le lot de stock</DialogTitle>
            <DialogDescription>Modifiez les informations du lot sélectionné.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <DialogBody>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Produit</Label>
                  <Input value={selectedStock?.produit.nom || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Fournisseur</Label>
                  <Select value={formData.fournisseurId} onValueChange={(value) => setFormData({ ...formData, fournisseurId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      {fournisseurs.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Numéro de lot</Label>
                  <Input value={formData.numeroLot || "Généré automatiquement"} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Le numéro de lot ne peut pas être modifié après création</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Prix d&apos;achat (MAD) *</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={formData.prixAchat} onChange={(e) => setFormData({ ...formData, prixAchat: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Prix de vente (MAD) *</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={formData.prixVente} onChange={(e) => setFormData({ ...formData, prixVente: e.target.value })} required />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Quantité</Label>
                    <Input type="number" placeholder="0" value={formData.quantiteDisponible} onChange={(e) => setFormData({ ...formData, quantiteDisponible: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Seuil d&apos;alerte</Label>
                    <Input type="number" placeholder="10" value={formData.seuilAlerte} onChange={(e) => setFormData({ ...formData, seuilAlerte: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date d&apos;expiration</Label>
                  <Input type="date" value={formData.dateExpiration} onChange={(e) => setFormData({ ...formData, dateExpiration: e.target.value })} />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le lot</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce lot de {selectedStock?.produit.nom} ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Détails du stock
            </DialogTitle>
            <DialogDescription>
              Informations complètes sur le lot sélectionné
            </DialogDescription>
          </DialogHeader>
          {selectedStock && (
            <DialogBody>
              <div className="grid gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Produit</h4>
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Nom</p>
                      <p className="font-medium">{selectedStock.produit.nom}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Code-barres</p>
                      <p className="font-mono">{selectedStock.produit.codeBarre || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Lot</h4>
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Numéro de lot</p>
                      <p className="font-mono">{selectedStock.numeroLot || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Fournisseur</p>
                      <p>{selectedStock.fournisseur?.nom || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date d&apos;expiration</p>
                      <p>{selectedStock.dateExpiration ? new Date(selectedStock.dateExpiration).toLocaleDateString("fr-FR") : "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Statut</p>
                      <Badge variant={getStockStatus(selectedStock).variant}>
                        {getStockStatus(selectedStock).label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Quantités</h4>
                  <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Disponible</p>
                      <p className={cn("text-lg font-bold", selectedStock.quantiteDisponible <= selectedStock.seuilAlerte && "text-amber-600 dark:text-amber-400")}>
                        {selectedStock.quantiteDisponible}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Réservée</p>
                      <p className="text-lg font-bold">{selectedStock.quantiteReservee}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Seuil d&apos;alerte</p>
                      <p className="text-lg font-bold">{selectedStock.seuilAlerte}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Prix</h4>
                  <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Prix d&apos;achat</p>
                      <p className="text-lg font-bold">{formatCurrency(parseFloat(selectedStock.prixAchat))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Prix de vente</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(parseFloat(selectedStock.prixVente))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Marge</p>
                      <p className={cn(
                        "text-lg font-bold",
                        getMargin(selectedStock.prixAchat, selectedStock.prixVente) < 10 ? "text-red-600 dark:text-red-400" :
                        getMargin(selectedStock.prixAchat, selectedStock.prixVente) < 20 ? "text-amber-600 dark:text-amber-400" :
                        "text-green-600 dark:text-green-400"
                      )}>
                        {getMargin(selectedStock.prixAchat, selectedStock.prixVente).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>Fermer</Button>
            <Button onClick={() => { setDetailsDialogOpen(false); openEditDialog(selectedStock!); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
