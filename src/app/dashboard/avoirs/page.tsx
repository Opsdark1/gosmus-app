"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Search, FileText, Eye, Loader2, Trash2, Plus, RotateCcw, CreditCard, RefreshCcw, Package, ShoppingCart, Truck, CheckCircle, Banknote, Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/constants";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PAGE_SIZE = 10;

interface Client {
  id: string;
  nom: string;
  prenom: string | null;
}

interface Fournisseur {
  id: string;
  nom: string;
}

interface LigneVente {
  id: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  stock: {
    id: string;
    produit: {
      id: string;
      nom: string;
      codeBarre: string | null;
    };
  };
}

interface Vente {
  id: string;
  reference: string;
  total?: number;
  lignes?: LigneVente[];
  client?: Client | null;
}

interface Commande {
  id: string;
  reference: string;
  total?: number;
  fournisseur?: Fournisseur | null;
}

interface Avoir {
  id: string;
  reference: string;
  client: Client | null;
  fournisseur: Fournisseur | null;
  vente: Vente | null;
  commande: Commande | null;
  montant: number;
  montantUtilise: number;
  type: string;
  statut: string;
  motif: string | null;
  dateValidite: string | null;
  createdAt: string;
}

const TYPES_AVOIR = [
  { value: "retour_produit", label: "Retour produit", icon: RotateCcw },
  { value: "remboursement", label: "Remboursement", icon: RefreshCcw },
  { value: "credit_commercial", label: "Crédit commercial", icon: CreditCard },
];

const STATUTS_AVOIR: Record<string, { label: string; variant: "success" | "warning" | "info" | "neutral" }> = {
  actif: { label: "Actif", variant: "success" },
  utilise: { label: "Utilisé", variant: "info" },
  expire: { label: "Expiré", variant: "warning" },
  annule: { label: "Annulé", variant: "neutral" },
};

export default function AvoirsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const [avoirs, setAvoirs] = useState<Avoir[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAvoir, setSelectedAvoir] = useState<Avoir | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("tous");
  const [statutFilter, setStatutFilter] = useState<string>("tous");
  const [contexteFilter, setContexteFilter] = useState<string>("tous");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [venteSearch, setVenteSearch] = useState("");
  const [commandeSearch, setCommandeSearch] = useState("");
  const [showVenteDropdown, setShowVenteDropdown] = useState(false);
  const [showCommandeDropdown, setShowCommandeDropdown] = useState(false);
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);

  const [formData, setFormData] = useState({
    contexte: "client" as "client" | "fournisseur",
    clientId: "",
    fournisseurId: "",
    venteId: "",
    commandeId: "",
    montant: "",
    type: "",
    motif: "",
    dateValidite: "",
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchAvoirs = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      if (typeFilter !== "tous") params.append("type", typeFilter);
      if (statutFilter !== "tous") params.append("statut", statutFilter);
      if (contexteFilter !== "tous") params.append("contexte", contexteFilter);

      const response = await fetch(`/api/avoirs?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors du chargement");
      }

      const data = await response.json();
      setAvoirs(data.avoirs || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setAvoirs([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter, statutFilter, contexteFilter]);

  const fetchClients = async (search: string) => {
    if (!search.trim()) {
      setClients([]);
      return;
    }
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data || []);
      }
    } catch {
      console.error("Erreur chargement clients");
    }
  };

  const fetchFournisseurs = async (search: string) => {
    if (!search.trim()) {
      setFournisseurs([]);
      return;
    }
    try {
      const res = await fetch(`/api/fournisseurs?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setFournisseurs(data.fournisseurs || []);
      }
    } catch {
      console.error("Erreur chargement fournisseurs");
    }
  };

  const fetchVentes = async (search: string) => {
    if (!search.trim()) {
      setVentes([]);
      return;
    }
    try {
      const res = await fetch(`/api/ventes?search=${encodeURIComponent(search)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setVentes(data.ventes || []);
      }
    } catch {
      console.error("Erreur chargement ventes");
    }
  };

  const fetchCommandes = async (search: string) => {
    if (!search.trim()) {
      setCommandes([]);
      return;
    }
    try {
      const res = await fetch(`/api/commandes?search=${encodeURIComponent(search)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setCommandes(data.commandes || []);
      }
    } catch {
      console.error("Erreur chargement commandes");
    }
  };

  useEffect(() => {
    fetchAvoirs();
  }, [fetchAvoirs]);

  const resetForm = () => {
    setFormData({
      contexte: "client",
      clientId: "",
      fournisseurId: "",
      venteId: "",
      commandeId: "",
      montant: "",
      type: "",
      motif: "",
      dateValidite: "",
    });
    setClients([]);
    setFournisseurs([]);
    setVentes([]);
    setCommandes([]);
    setVenteSearch("");
    setCommandeSearch("");
    setSelectedVente(null);
    setSelectedCommande(null);
    setShowVenteDropdown(false);
    setShowCommandeDropdown(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.montant || parseFloat(formData.montant) <= 0) {
      toast.error("Le montant doit être positif");
      return;
    }
    if (!formData.type) {
      toast.error("Le type est requis");
      return;
    }
    if (formData.contexte === "client" && !formData.clientId) {
      toast.error("Le client est requis");
      return;
    }
    if (formData.contexte === "fournisseur" && !formData.fournisseurId) {
      toast.error("Le fournisseur est requis");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/avoirs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: formData.contexte === "client" ? formData.clientId : null,
          fournisseurId: formData.contexte === "fournisseur" ? formData.fournisseurId : null,
          venteId: formData.contexte === "client" && formData.venteId ? formData.venteId : null,
          commandeId: formData.contexte === "fournisseur" && formData.commandeId ? formData.commandeId : null,
          montant: parseFloat(formData.montant),
          type: formData.type,
          motif: formData.motif.trim() || null,
          dateValidite: formData.dateValidite || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur création");
      }

      toast.success("Avoir créé avec succès");
      setCreateDialogOpen(false);
      resetForm();
      fetchAvoirs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAvoir) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/avoirs?id=${selectedAvoir.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur suppression");
      }

      toast.success("Avoir annulé avec succès");
      setDeleteDialogOpen(false);
      setDialogOpen(false);
      setSelectedAvoir(null);
      fetchAvoirs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const openDetails = (avoir: Avoir) => {
    setSelectedAvoir(avoir);
    setDialogOpen(true);
  };

  const getTypeLabel = (type: string): string => {
    const found = TYPES_AVOIR.find((t) => t.value === type);
    return found ? found.label : type;
  };

  const soldeRestant = (avoir: Avoir): number => {
    return avoir.montant - avoir.montantUtilise;
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const sortedAvoirs = useMemo(() => {
    return sortItems({
      items: avoirs,
      sortKey,
      sortDirection,
      getValue: (item, key) => {
        switch (key) {
          case "reference": return item.reference;
          case "client": return item.client ? `${item.client.nom} ${item.client.prenom || ""}` : (item.fournisseur?.nom || "");
          case "montant": return item.montant;
          case "solde": return soldeRestant(item);
          case "createdAt": return new Date(item.createdAt).getTime();
          default: return null;
        }
      }
    });
  }, [avoirs, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedAvoirs.length / PAGE_SIZE);
  const paginatedAvoirs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedAvoirs.slice(start, start + PAGE_SIZE);
  }, [sortedAvoirs, currentPage]);

  const stats = {
    total: avoirs.length,
    actifs: avoirs.filter((a) => a.statut === "actif").length,
    montantTotal: avoirs.reduce((sum, a) => sum + a.montant, 0),
    montantDisponible: avoirs.filter((a) => a.statut === "actif").reduce((sum, a) => sum + (a.montant - a.montantUtilise), 0),
  };

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Avoirs</h1>
          <p className="text-muted-foreground">Gérez les avoirs clients et fournisseurs</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel avoir
        </Button>
      </div>

      <div className="grid gap-2 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card sm:flex-col sm:items-start sm:gap-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 sm:mt-3">
              <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground truncate">Total avoirs</p>
            </div>
        </div>
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card sm:flex-col sm:items-start sm:gap-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900 shrink-0">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0 sm:mt-3">
              <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.actifs}</p>
              <p className="text-xs text-muted-foreground truncate">Avoirs actifs</p>
            </div>
        </div>
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card sm:flex-col sm:items-start sm:gap-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900 shrink-0">
              <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0 sm:mt-3">
              <p className="text-lg sm:text-2xl font-bold truncate">{formatCurrency(stats.montantTotal)}</p>
              <p className="text-xs text-muted-foreground truncate">Montant émis</p>
            </div>
        </div>
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card sm:flex-col sm:items-start sm:gap-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900 shrink-0">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0 sm:mt-3">
              <p className="text-lg sm:text-2xl font-bold text-blue-600 truncate">{formatCurrency(stats.montantDisponible)}</p>
              <p className="text-xs text-muted-foreground truncate">Disponible</p>
            </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 sm:pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence ou client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les types</SelectItem>
                {TYPES_AVOIR.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                {Object.entries(STATUTS_AVOIR).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={contexteFilter} onValueChange={setContexteFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Contexte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous</SelectItem>
                <SelectItem value="fournisseur">Fournisseurs</SelectItem>
                <SelectItem value="client">Clients</SelectItem>
              </SelectContent>
            </Select>
          </div>
      </div>

      {loading && (
        <div className="rounded-lg border bg-card p-6">
            <LoadingState />
        </div>
      )}

      {!loading && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Avoirs ({avoirs.length})</h3>
          </div>
          <div className="p-0">
            {avoirs.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Aucun avoir trouvé"
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">
                          <SortableHeader
                            label="Référence"
                            sortKey="reference"
                            currentSort={sortKey}
                            currentDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="text-left py-3 px-4">
                          <SortableHeader
                            label="Bénéficiaire"
                            sortKey="client"
                            currentSort={sortKey}
                            currentDirection={sortDirection}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                        <th className="text-right py-3 px-4">
                          <SortableHeader
                            label="Montant"
                            sortKey="montant"
                            currentSort={sortKey}
                            currentDirection={sortDirection}
                            onSort={handleSort}
                            className="justify-end"
                          />
                        </th>
                        <th className="text-right py-3 px-4">
                          <SortableHeader
                            label="Solde"
                            sortKey="solde"
                            currentSort={sortKey}
                            currentDirection={sortDirection}
                            onSort={handleSort}
                            className="justify-end"
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Statut</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAvoirs.map((avoir) => {
                        const statutInfo = STATUTS_AVOIR[avoir.statut] || { label: avoir.statut, variant: "neutral" as const };
                        return (
                          <tr key={avoir.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="font-medium">{avoir.reference}</div>
                              <div className="text-xs text-muted-foreground">{formatDate(avoir.createdAt)}</div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {avoir.fournisseur ? (
                                <span className="flex items-center gap-1">
                                  <Badge variant="info" className="text-xs">F</Badge>
                                  {avoir.fournisseur.nom}
                                </span>
                              ) : avoir.client ? (
                                <span className="flex items-center gap-1">
                                  <Badge variant="success" className="text-xs">C</Badge>
                                  {`${avoir.client.nom} ${avoir.client.prenom || ""}`.trim()}
                                </span>
                              ) : "—"}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="info">{getTypeLabel(avoir.type)}</Badge>
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              {formatCurrency(avoir.montant)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={soldeRestant(avoir) > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                                {formatCurrency(soldeRestant(avoir))}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={statutInfo.variant}>{statutInfo.label}</Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetails(avoir)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Voir détails</TooltipContent>
                                </Tooltip>
                                {avoir.statut === "actif" && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                        setSelectedAvoir(avoir);
                                        setDeleteDialogOpen(true);
                                      }}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Annuler</TooltipContent>
                                  </Tooltip>
                                )}
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
                      totalItems={sortedAvoirs.length}
                    />
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvel avoir</DialogTitle>
            <DialogDescription>Créez un avoir pour un fournisseur ou un client.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <DialogBody>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Type de bénéficiaire *</Label>
                  <Select 
                    value={formData.contexte} 
                    onValueChange={(value: "client" | "fournisseur") => {
                      setFormData({ ...formData, contexte: value, clientId: "", fournisseurId: "", venteId: "", commandeId: "" });
                      setClients([]);
                      setFournisseurs([]);
                      setVentes([]);
                      setCommandes([]);
                      setSelectedVente(null);
                      setSelectedCommande(null);
                      setVenteSearch("");
                      setCommandeSearch("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fournisseur">Fournisseur</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.contexte === "fournisseur" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Fournisseur *</Label>
                      <Input
                        placeholder="Rechercher un fournisseur..."
                        onChange={(e) => fetchFournisseurs(e.target.value)}
                      />
                      {fournisseurs.length > 0 && (
                        <div className="border rounded-md max-h-32 overflow-y-auto">
                          {fournisseurs.map((fournisseur) => (
                            <button
                              key={fournisseur.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                              onClick={() => {
                                setFormData({ ...formData, fournisseurId: fournisseur.id });
                                setFournisseurs([]);
                              }}
                            >
                              {fournisseur.nom}
                            </button>
                          ))}
                        </div>
                      )}
                      {formData.fournisseurId && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Truck className="h-3 w-3" /> Fournisseur sélectionné
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Commande associée (optionnel)</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher par référence..."
                          value={commandeSearch}
                          onChange={(e) => {
                            setCommandeSearch(e.target.value);
                            setShowCommandeDropdown(true);
                            fetchCommandes(e.target.value);
                            if (!e.target.value) {
                              setSelectedCommande(null);
                              setFormData({ ...formData, commandeId: "" });
                            }
                          }}
                          onFocus={() => setShowCommandeDropdown(true)}
                          className="pl-9"
                        />
                        {showCommandeDropdown && commandes.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                            {commandes.map((commande) => (
                              <button
                                key={commande.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCommande(commande);
                                  setCommandeSearch(commande.reference);
                                  setFormData({ ...formData, commandeId: commande.id });
                                  setShowCommandeDropdown(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3"
                              >
                                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{commande.reference}</p>
                                  {commande.fournisseur && (
                                    <p className="text-xs text-muted-foreground">
                                      {commande.fournisseur.nom}
                                    </p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedCommande && (
                        <p className="text-sm text-green-600 flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3" /> Commande liée : {selectedCommande.reference}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Client *</Label>
                      <Input
                        placeholder="Rechercher un client..."
                        onChange={(e) => fetchClients(e.target.value)}
                      />
                      {clients.length > 0 && (
                        <div className="border rounded-md max-h-32 overflow-y-auto">
                          {clients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                              onClick={() => {
                                setFormData({ ...formData, clientId: client.id });
                                setClients([]);
                              }}
                            >
                              {client.nom} {client.prenom || ""}
                            </button>
                          ))}
                        </div>
                      )}
                      {formData.clientId && (
                        <p className="text-sm text-muted-foreground">Client sélectionné</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Vente associée (optionnel)</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher par référence..."
                          value={venteSearch}
                          onChange={(e) => {
                            setVenteSearch(e.target.value);
                            setShowVenteDropdown(true);
                            fetchVentes(e.target.value);
                            if (!e.target.value) {
                              setSelectedVente(null);
                              setFormData({ ...formData, venteId: "" });
                            }
                          }}
                          onFocus={() => setShowVenteDropdown(true)}
                          className="pl-9"
                        />
                        {showVenteDropdown && ventes.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                            {ventes.map((vente) => (
                              <button
                                key={vente.id}
                                type="button"
                                onClick={() => {
                                  setSelectedVente(vente);
                                  setVenteSearch(vente.reference);
                                  setFormData({ ...formData, venteId: vente.id });
                                  setShowVenteDropdown(false);
                                  if (vente.total && !formData.montant) {
                                    setFormData(prev => ({ ...prev, venteId: vente.id, montant: String(vente.total) }));
                                  }
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3"
                              >
                                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{vente.reference}</p>
                                  {vente.client && (
                                    <p className="text-xs text-muted-foreground">
                                      {vente.client.nom} {vente.client.prenom || ""}
                                    </p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedVente && (
                        <div className="p-2 bg-muted/50 rounded-md">
                          <p className="text-sm text-green-600 flex items-center gap-1 mb-1">
                            <ShoppingCart className="h-3 w-3" /> Vente liée : {selectedVente.reference}
                          </p>
                          {selectedVente.lignes && selectedVente.lignes.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <p className="font-medium mb-1">Produits :</p>
                              {selectedVente.lignes.slice(0, 3).map((ligne) => (
                                <p key={ligne.id} className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {ligne.stock.produit.nom} x{ligne.quantite}
                                </p>
                              ))}
                              {selectedVente.lignes.length > 3 && (
                                <p className="italic">+{selectedVente.lignes.length - 3} autres...</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Type d&apos;avoir *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES_AVOIR.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Montant (MAD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.montant}
                    onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Motif</Label>
                  <Textarea
                    placeholder="Raison de l'avoir..."
                    value={formData.motif}
                    onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date de validité (optionnel)</Label>
                  <Input
                    type="date"
                    value={formData.dateValidite}
                    onChange={(e) => setFormData({ ...formData, dateValidite: e.target.value })}
                  />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Créer l&apos;avoir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails de l&apos;avoir</DialogTitle>
          </DialogHeader>
          {selectedAvoir && (
            <DialogBody>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Référence</p>
                    <p className="text-sm font-mono">{selectedAvoir.reference}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date de création</p>
                    <p className="text-sm">{formatDate(selectedAvoir.createdAt)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <Badge variant="info">{getTypeLabel(selectedAvoir.type)}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Statut</p>
                    <Badge variant={STATUTS_AVOIR[selectedAvoir.statut]?.variant || "neutral"}>
                      {STATUTS_AVOIR[selectedAvoir.statut]?.label || selectedAvoir.statut}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Montant initial</p>
                    <p className="text-sm font-medium">{formatCurrency(selectedAvoir.montant)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Solde restant</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(soldeRestant(selectedAvoir))}</p>
                  </div>
                </div>
                {selectedAvoir.fournisseur && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fournisseur</p>
                    <p className="text-sm">{selectedAvoir.fournisseur.nom}</p>
                  </div>
                )}
                {selectedAvoir.client && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Client</p>
                    <p className="text-sm">{selectedAvoir.client.nom} {selectedAvoir.client.prenom || ""}</p>
                  </div>
                )}
                {selectedAvoir.commande && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Commande associée</p>
                    <p className="text-sm">{selectedAvoir.commande.reference}</p>
                  </div>
                )}
                {selectedAvoir.vente && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Vente associée</p>
                    <p className="text-sm">{selectedAvoir.vente.reference}</p>
                  </div>
                )}
                {selectedAvoir.motif && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Motif</p>
                    <p className="text-sm">{selectedAvoir.motif}</p>
                  </div>
                )}
                {selectedAvoir.dateValidite && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date de validité</p>
                    <p className="text-sm">{formatDate(selectedAvoir.dateValidite)}</p>
                  </div>
                )}
              </div>
            </DialogBody>
          )}
          <DialogFooter>
            {selectedAvoir?.statut === "actif" && (
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Annuler l&apos;avoir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler l&apos;avoir</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir annuler l&apos;avoir {selectedAvoir?.reference} ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Non, garder
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Oui, annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
