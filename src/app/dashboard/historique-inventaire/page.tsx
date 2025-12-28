"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { sortItems } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCcw,
  RotateCcw,
  Plus,
  Package,
  Calendar,
  Loader2,
  History,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  User,
  DollarSign,
  AlertTriangle,
  Trash2,
  ShoppingCart,
  Truck,
  Settings,
} from "lucide-react";
import { formatDate } from "@/lib/constants";
import { toast } from "sonner";

const PAGE_SIZE = 25;

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
  numeroLot: string | null;
  quantiteDisponible: number;
  prixAchat: number;
  prixVente: number;
  produit: Produit;
  fournisseur: Fournisseur | null;
}

interface Historique {
  id: string;
  stockId: string;
  action: string;
  ancienneValeur: string | null;
  nouvelleValeur: string | null;
  quantite: number | null;
  motif: string | null;
  referenceId: string | null;
  utilisateurId: string | null;
  utilisateurNom: string | null;
  utilisateurEmail: string | null;
  createdAt: string;
  stock: Stock;
}

const ACTIONS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: "success" | "warning" | "info" | "neutral" }> = {
  entree_stock: { label: "Entrée stock", icon: ArrowUpCircle, variant: "success" },
  sortie_stock: { label: "Sortie stock", icon: ArrowDownCircle, variant: "warning" },
  ajustement_quantite: { label: "Ajustement quantité", icon: RefreshCcw, variant: "info" },
  retour_produit: { label: "Retour produit", icon: RotateCcw, variant: "neutral" },
  modification_prix_achat: { label: "Modification prix achat", icon: DollarSign, variant: "info" },
  modification_prix_vente: { label: "Modification prix vente", icon: DollarSign, variant: "info" },
  modification_seuil_alerte: { label: "Modification seuil alerte", icon: AlertTriangle, variant: "info" },
  modification_date_expiration: { label: "Modification expiration", icon: Calendar, variant: "info" },
  vente: { label: "Vente", icon: ShoppingCart, variant: "warning" },
  commande_recue: { label: "Commande reçue", icon: Truck, variant: "success" },
  correction_inventaire: { label: "Correction inventaire", icon: Settings, variant: "info" },
  perte: { label: "Perte", icon: Trash2, variant: "warning" },
  casse: { label: "Casse", icon: Trash2, variant: "warning" },
};

export default function HistoriqueInventairePage() {
  const [historiques, setHistoriques] = useState<Historique[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const [actionFilter, setActionFilter] = useState<string>("tous");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedHistorique, setSelectedHistorique] = useState<Historique | null>(null);
  const [stockSearch, setStockSearch] = useState("");
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  
  const [formData, setFormData] = useState({
    stockId: "",
    action: "entree_stock",
    quantite: "",
    motif: "",
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchHistoriques = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (actionFilter !== "tous") params.set("action", actionFilter);
      if (dateDebut) params.set("dateDebut", dateDebut);
      if (dateFin) params.set("dateFin", dateFin);
      
      const res = await fetch(`/api/historique-inventaire?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur chargement historique");
      const data = await res.json();
      setHistoriques(data.historiques || []);
    } catch {
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, actionFilter, dateDebut, dateFin]);

  const fetchStocks = async () => {
    try {
      const res = await fetch("/api/stocks");
      if (res.ok) {
        const data = await res.json();
        setStocks(data.stocks || []);
      }
    } catch {
      console.error("Erreur chargement stocks");
    }
  };

  useEffect(() => {
    fetchHistoriques();
  }, [fetchHistoriques]);

  useEffect(() => {
    fetchStocks();
  }, []);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const sortedHistoriques = useMemo(() => {
    return sortItems({
      items: historiques,
      sortKey,
      sortDirection,
      getValue: (item, key) => {
        switch (key) {
          case "produit": return item.stock.produit.nom;
          case "action": return item.action;
          case "quantite": return item.quantite;
          case "utilisateur": return item.utilisateurNom;
          case "createdAt": return new Date(item.createdAt).getTime();
          default: return null;
        }
      }
    });
  }, [historiques, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedHistoriques.length / PAGE_SIZE);
  const paginatedHistoriques = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedHistoriques.slice(start, start + PAGE_SIZE);
  }, [sortedHistoriques, currentPage]);

  const filteredStocks = useMemo(() => {
    if (!stockSearch.trim()) return stocks.slice(0, 10);
    const searchLower = stockSearch.toLowerCase();
    return stocks.filter(s =>
      s.produit.nom.toLowerCase().includes(searchLower) ||
      (s.produit.codeBarre && s.produit.codeBarre.toLowerCase().includes(searchLower)) ||
      (s.numeroLot && s.numeroLot.toLowerCase().includes(searchLower))
    ).slice(0, 10);
  }, [stocks, stockSearch]);

  const handleSelectStock = (stock: Stock) => {
    setSelectedStock(stock);
    setStockSearch(`${stock.produit.nom} - Lot: ${stock.numeroLot || "N/A"}`);
    setFormData({ ...formData, stockId: stock.id });
    setShowStockDropdown(false);
  };

  const resetForm = () => {
    setFormData({
      stockId: "",
      action: "entree_stock",
      quantite: "",
      motif: "",
    });
    setStockSearch("");
    setSelectedStock(null);
    setShowStockDropdown(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openDetailDialog = (h: Historique) => {
    setSelectedHistorique(h);
    setDetailDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.stockId) {
      toast.error("Sélectionnez un lot de stock");
      return;
    }
    
    const actionsNeedQuantity = ["entree_stock", "sortie_stock", "ajustement_quantite", "retour_produit", "commande_recue", "correction_inventaire", "perte", "casse"];
    if (actionsNeedQuantity.includes(formData.action)) {
      if (!formData.quantite || parseInt(formData.quantite) < 0) {
        toast.error("La quantité doit être positive ou nulle");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/historique-inventaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockId: formData.stockId,
          action: formData.action,
          quantite: formData.quantite ? parseInt(formData.quantite) : null,
          motif: formData.motif || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur création");
      }

      toast.success("Action enregistrée avec succès");
      setCreateDialogOpen(false);
      resetForm();
      fetchHistoriques();
      fetchStocks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayHistoriques = historiques.filter(h => new Date(h.createdAt) >= today);
    const entrees = todayHistoriques.filter(h => ["entree_stock", "retour_produit", "commande_recue"].includes(h.action));
    const sorties = todayHistoriques.filter(h => ["sortie_stock", "vente", "perte", "casse"].includes(h.action));
    const ajustements = todayHistoriques.filter(h => ["ajustement_quantite", "correction_inventaire"].includes(h.action));
    
    return {
      total: todayHistoriques.length,
      entrees: entrees.length,
      sorties: sorties.length,
      ajustements: ajustements.length,
    };
  }, [historiques]);

  const getActionConfig = (action: string) => {
    return ACTIONS_CONFIG[action] || { label: action, icon: Activity, variant: "neutral" as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historique Inventaire</h1>
          <p className="text-muted-foreground">Suivi complet de toutes les actions sur l&apos;inventaire</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle action
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions du jour</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrées</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.entrees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sorties</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.sorties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ajustements</CardTitle>
            <RefreshCcw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.ajustements}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Journal des actions
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4 mb-6 pb-6 border-b">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium">Recherche</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Produit, lot, utilisateur..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="min-w-[180px]">
              <Label className="text-sm font-medium">Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Filtrer par action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Toutes les actions</SelectItem>
                  {Object.entries(ACTIONS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[150px]">
              <Label className="text-sm font-medium">Date début</Label>
              <Input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="min-w-[150px]">
              <Label className="text-sm font-medium">Date fin</Label>
              <Input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="mt-1"
              />
            </div>
            {(debouncedSearch || actionFilter !== "tous" || dateDebut || dateFin) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setActionFilter("tous");
                  setDateDebut("");
                  setDateFin("");
                }}
                className="h-9 mt-auto"
              >
                Réinitialiser
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : paginatedHistoriques.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Aucune action enregistrée</h3>
              <p className="text-sm text-muted-foreground mt-1">
                L&apos;historique des actions sur l&apos;inventaire apparaîtra ici
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">
                        <SortableHeader
                          label="Date"
                          sortKey="createdAt"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="text-left py-3 px-4">
                        <SortableHeader
                          label="Produit"
                          sortKey="produit"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="text-left py-3 px-4">
                        <SortableHeader
                          label="Action"
                          sortKey="action"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Détails</th>
                      <th className="text-left py-3 px-4">
                        <SortableHeader
                          label="Utilisateur"
                          sortKey="utilisateur"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistoriques.map((h) => {
                      const config = getActionConfig(h.action);
                      const IconComponent = config.icon;
                      return (
                        <tr key={h.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{formatDate(h.createdAt)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{h.stock.produit.nom}</p>
                                <p className="text-xs text-muted-foreground">Lot: {h.stock.numeroLot || "N/A"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                              <IconComponent className="h-3 w-3" />
                              {config.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              {h.ancienneValeur && h.nouvelleValeur ? (
                                <span>
                                  <span className="text-muted-foreground">{h.ancienneValeur}</span>
                                  <span className="mx-1">→</span>
                                  <span className="font-medium">{h.nouvelleValeur}</span>
                                </span>
                              ) : h.quantite !== null ? (
                                <span className="font-medium">Qté: {h.quantite}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <span className="text-sm block">{h.utilisateurNom || h.utilisateurEmail || "Système"}</span>
                                {h.utilisateurEmail && h.utilisateurNom && (
                                  <span className="text-xs text-muted-foreground">{h.utilisateurEmail}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => openDetailDialog(h)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <PaginationInfo
                  currentPage={currentPage}
                  totalItems={sortedHistoriques.length}
                  pageSize={PAGE_SIZE}
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle action sur l&apos;inventaire</DialogTitle>
            <DialogDescription>
              Enregistrez une entrée, sortie, ajustement ou autre action sur un lot de stock.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <Label>Lot de stock *</Label>
                <div className="relative">
                  <Input
                    placeholder="Rechercher un produit ou lot..."
                    value={stockSearch}
                    onChange={(e) => {
                      setStockSearch(e.target.value);
                      setShowStockDropdown(true);
                    }}
                    onFocus={() => setShowStockDropdown(true)}
                  />
                  {showStockDropdown && filteredStocks.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredStocks.map((stock) => (
                        <button
                          key={stock.id}
                          type="button"
                          className="w-full px-4 py-2 text-left hover:bg-muted flex items-center justify-between"
                          onClick={() => handleSelectStock(stock)}
                        >
                          <div>
                            <p className="font-medium">{stock.produit.nom}</p>
                            <p className="text-xs text-muted-foreground">
                              Lot: {stock.numeroLot || "N/A"} | Stock: {stock.quantiteDisponible}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedStock && (
                  <p className="text-xs text-muted-foreground">
                    Stock actuel: {selectedStock.quantiteDisponible} unités
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Action *</Label>
                <Select
                  value={formData.action}
                  onValueChange={(value) => setFormData({ ...formData, action: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entree_stock">Entrée stock</SelectItem>
                    <SelectItem value="sortie_stock">Sortie stock</SelectItem>
                    <SelectItem value="ajustement_quantite">Ajustement quantité</SelectItem>
                    <SelectItem value="retour_produit">Retour produit</SelectItem>
                    <SelectItem value="correction_inventaire">Correction inventaire</SelectItem>
                    <SelectItem value="perte">Perte</SelectItem>
                    <SelectItem value="casse">Casse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Quantité {formData.action === "ajustement_quantite" || formData.action === "correction_inventaire" ? "(nouvelle valeur)" : ""}
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantite}
                  onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                  placeholder={formData.action === "ajustement_quantite" || formData.action === "correction_inventaire" ? "Nouvelle quantité totale" : "Quantité"}
                />
              </div>

              <div className="space-y-2">
                <Label>Motif / Commentaire</Label>
                <Textarea
                  value={formData.motif}
                  onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                  placeholder="Raison de cette action..."
                  rows={3}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails de l&apos;action</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {selectedHistorique && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(selectedHistorique.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Action</p>
                    <Badge variant={getActionConfig(selectedHistorique.action).variant}>
                      {getActionConfig(selectedHistorique.action).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Produit</p>
                    <p className="font-medium">{selectedHistorique.stock.produit.nom}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lot</p>
                    <p className="font-medium">{selectedHistorique.stock.numeroLot || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ancienne valeur</p>
                    <p className="font-medium">{selectedHistorique.ancienneValeur || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nouvelle valeur</p>
                    <p className="font-medium">{selectedHistorique.nouvelleValeur || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quantité</p>
                    <p className="font-medium">{selectedHistorique.quantite ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Utilisateur</p>
                    <p className="font-medium">{selectedHistorique.utilisateurNom || selectedHistorique.utilisateurEmail || "Système"}</p>
                    {selectedHistorique.utilisateurEmail && (
                      <p className="text-xs text-muted-foreground">{selectedHistorique.utilisateurEmail}</p>
                    )}
                  </div>
                </div>
                {selectedHistorique.motif && (
                  <div>
                    <p className="text-sm text-muted-foreground">Motif</p>
                    <p className="font-medium">{selectedHistorique.motif}</p>
                  </div>
                )}
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
