"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeftRight,
  Plus,
  Search,
  Eye,
  Trash2,
  Loader2,
  Send,
  PackageCheck,
  X,
  Building2,
  Package,
  Filter,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/constants";

interface Etablissement {
  id: string;
  nom: string;
  type: string;
  isPrincipal?: boolean;
}

interface Stock {
  id: string;
  quantiteDisponible: number;
  prixAchat: number | null;
  prixVente: number | null;
  produit: {
    id: string;
    nom: string;
    codeBarre: string | null;
  };
}

interface LigneTransfert {
  id: string;
  produitNom: string;
  produitCode: string | null;
  numeroLot: string | null;
  quantite: number;
  prixUnit: number;
  total: number;
  dateExpiration: string | null;
  note: string | null;
}

interface Transfert {
  id: string;
  reference: string;
  typeTransfert: string;
  statut: string;
  totalArticles: number;
  totalQuantite: number;
  valeurEstimee: number;
  motif: string | null;
  note: string | null;
  dateEnvoi: string | null;
  dateReception: string | null;
  createdAt: string;
  etablissementSource: Etablissement | null;
  etablissementDestination: Etablissement | null;
  lignes: LigneTransfert[];
}

const STATUTS = [
  { value: "en_attente", label: "En attente", color: "neutral" as const },
  { value: "en_transit", label: "En transit", color: "info" as const },
  { value: "recu", label: "Reçu", color: "success" as const },
  { value: "annule", label: "Annulé", color: "warning" as const },
];

export default function TransfertsPage() {
  const [transferts, setTransferts] = useState<Transfert[]>([]);
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [projetInfo, setProjetInfo] = useState<{
    nomProjet: string | null;
    adresse: string | null;
    ville: string | null;
  } | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedTransfert, setSelectedTransfert] = useState<Transfert | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    typeTransfert: "sortant" as "sortant" | "entrant", // sortant = envoi vers partenaire, entrant = réception de partenaire
    etablissementPartenaire: "",
    notes: "",
    lignes: [] as { stockId: string; quantite: number; produitNom?: string; stockDispo?: number; prixUnit?: number }[],
  });

  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [ligneQuantite, setLigneQuantite] = useState(1);

  const fetchTransferts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (search) params.set("search", search);
      if (statutFilter && statutFilter !== "all") params.set("statut", statutFilter);

      const res = await fetch(`/api/transferts?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur de chargement");

      const data = await res.json();
      setTransferts(data.transferts);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [page, search, statutFilter]);

  const fetchEtablissements = async () => {
    try {
      const res = await fetch("/api/etablissements?limit=100&actif=true");
      if (res.ok) {
        const data = await res.json();
        setEtablissements(data.etablissements);
      }
    } catch {
      console.error("Erreur chargement établissements");
    }
  };

  useEffect(() => {
    const searchStocks = async () => {
      if (!productSearch || productSearch.length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setSearchLoading(true);
      try {
        const res = await fetch(`/api/stocks?search=${encodeURIComponent(productSearch)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          const filtered = data.stocks.filter((s: Stock) => 
            s.quantiteDisponible > 0 && !form.lignes.some(l => l.stockId === s.id)
          );
          setSearchResults(filtered);
          setShowResults(true);
        }
      } catch {
        console.error("Erreur recherche stocks");
      } finally {
        setSearchLoading(false);
      }
    };

    const debounce = setTimeout(searchStocks, 300);
    return () => clearTimeout(debounce);
  }, [productSearch, form.lignes]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchTransferts();
  }, [fetchTransferts]);

  useEffect(() => {
    fetchEtablissements();
    fetchProjetInfo();
  }, []);

  const fetchProjetInfo = async () => {
    try {
      const res = await fetch("/api/auth/profile");
      const data = await res.json();
      if (data.user) {
        setProjetInfo({
          nomProjet: data.user.nomProjet,
          adresse: data.user.adresse,
          ville: data.user.ville,
        });
      }
    } catch (error) {
      console.error("Erreur chargement infos projet:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransferts();
  };

  const openCreateDialog = () => {
    setForm({
      typeTransfert: "sortant",
      etablissementPartenaire: "",
      notes: "",
      lignes: [],
    });
    setProductSearch("");
    setSearchResults([]);
    setLigneQuantite(1);
    setCreateDialogOpen(true);
  };

  const addProductToList = (stock: Stock) => {
    if (ligneQuantite <= 0) {
      toast.error("Quantité invalide");
      return;
    }

    if (ligneQuantite > stock.quantiteDisponible) {
      toast.error(`Stock insuffisant: ${stock.quantiteDisponible} disponibles`);
      return;
    }

    setForm({
      ...form,
      lignes: [
        ...form.lignes,
        {
          stockId: stock.id,
          quantite: ligneQuantite,
          produitNom: stock.produit.nom,
          stockDispo: stock.quantiteDisponible,
          prixUnit: Number(stock.prixVente || stock.prixAchat || 0),
        },
      ],
    });

    setProductSearch("");
    setSearchResults([]);
    setShowResults(false);
    setLigneQuantite(1);
  };

  const updateLigneQuantite = (stockId: string, newQuantite: number) => {
    setForm({
      ...form,
      lignes: form.lignes.map((l) =>
        l.stockId === stockId
          ? { ...l, quantite: Math.min(Math.max(1, newQuantite), l.stockDispo || 999) }
          : l
      ),
    });
  };

  const removeLigne = (stockId: string) => {
    setForm({
      ...form,
      lignes: form.lignes.filter((l) => l.stockId !== stockId),
    });
  };

  const handleCreate = async () => {
    if (!form.etablissementPartenaire) {
      toast.error("Sélectionnez un établissement partenaire");
      return;
    }

    if (form.lignes.length === 0) {
      toast.error("Ajoutez au moins un produit à transférer");
      return;
    }

    setSaving(true);
    try {
      // Si sortant: source = null (mon stock), destination = partenaire
      // Si entrant: source = partenaire, destination = null (mon stock)
      const payload = {
        etablissementSourceId: form.typeTransfert === "entrant" ? form.etablissementPartenaire : null,
        etablissementDestinationId: form.typeTransfert === "sortant" ? form.etablissementPartenaire : null,
        notes: form.notes,
        lignes: form.lignes,
      };

      const res = await fetch("/api/transferts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      toast.success("Transfert créé avec succès");
      setCreateDialogOpen(false);
      fetchTransferts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async () => {
    if (!selectedTransfert || !pendingAction) return;

    setSaving(true);
    try {
      const res = await fetch("/api/transferts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTransfert.id, action: pendingAction }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      const actionLabels: Record<string, string> = {
        envoyer: "envoyé",
        recevoir: "reçu",
        annuler: "annulé",
      };

      toast.success(`Transfert ${actionLabels[pendingAction]}`);
      setActionDialogOpen(false);
      setSelectedTransfert(null);
      setPendingAction(null);
      fetchTransferts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce brouillon ?")) return;

    try {
      const res = await fetch(`/api/transferts?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      toast.success("Transfert supprimé");
      fetchTransferts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const getStatutBadge = (statut: string) => {
    const s = STATUTS.find((st) => st.value === statut);
    return <Badge variant={s?.color || "neutral"}>{s?.label || statut}</Badge>;
  };

  const totalTransfert = form.lignes.reduce(
    (sum, l) => sum + l.quantite * (l.prixUnit || 0),
    0
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ArrowLeftRight className="h-6 w-6" />
              Transferts de Stock
            </h1>
            <p className="text-muted-foreground">
              Gérez les transferts de marchandises entre établissements
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau transfert
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label>Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Référence, établissement..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-[150px]">
                <Label>Statut</Label>
                <Select value={statutFilter} onValueChange={setStatutFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {STATUTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit">
                <Filter className="h-4 w-4 mr-2" />
                Filtrer
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liste des transferts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : transferts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Aucun transfert trouvé</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Référence</TableHead>
                        <TableHead>Trajet</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Valeur</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transferts.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.reference}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">{t.etablissementSource?.nom || (projetInfo?.nomProjet || "Mon stock")}</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{t.etablissementDestination?.nom || (projetInfo?.nomProjet || "Mon stock")}</span>
                            </div>
                          </TableCell>
                          <TableCell>{t.totalQuantite} articles</TableCell>
                          <TableCell>{formatCurrency(Number(t.valeurEstimee))}</TableCell>
                          <TableCell>{getStatutBadge(t.statut)}</TableCell>
                          <TableCell className="text-sm">
                            {t.dateReception
                              ? formatDateTime(t.dateReception)
                              : t.dateEnvoi
                              ? formatDateTime(t.dateEnvoi)
                              : formatDateTime(t.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedTransfert(t);
                                      setViewDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Voir détails</TooltipContent>
                              </Tooltip>

                              {t.statut === "en_attente" && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setSelectedTransfert(t);
                                          setPendingAction("envoyer");
                                          setActionDialogOpen(true);
                                        }}
                                      >
                                        <Send className="h-4 w-4 text-blue-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Envoyer</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(t.id)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Supprimer</TooltipContent>
                                  </Tooltip>
                                </>
                              )}

                              {t.statut === "en_transit" && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setSelectedTransfert(t);
                                          setPendingAction("recevoir");
                                          setActionDialogOpen(true);
                                        }}
                                      >
                                        <PackageCheck className="h-4 w-4 text-green-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Confirmer réception</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setSelectedTransfert(t);
                                          setPendingAction("annuler");
                                          setActionDialogOpen(true);
                                        }}
                                      >
                                        <X className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Annuler</TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Précédent
                    </Button>
                    <span className="flex items-center px-4 text-sm">
                      Page {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Suivant
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[650px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5" />
                Nouveau transfert
              </DialogTitle>
              <DialogDescription>
                Transférez des produits de votre inventaire vers un autre établissement
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              <div className="space-y-6">
                {/* Type de transfert */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Type de transfert</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, typeTransfert: "sortant" })}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        form.typeTransfert === "sortant"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      <Send className={`h-5 w-5 ${form.typeTransfert === "sortant" ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="text-left">
                        <p className={`font-medium ${form.typeTransfert === "sortant" ? "text-primary" : ""}`}>Envoi</p>
                        <p className="text-xs text-muted-foreground">Vers un partenaire</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, typeTransfert: "entrant" })}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        form.typeTransfert === "entrant"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      <PackageCheck className={`h-5 w-5 ${form.typeTransfert === "entrant" ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="text-left">
                        <p className={`font-medium ${form.typeTransfert === "entrant" ? "text-primary" : ""}`}>Réception</p>
                        <p className="text-xs text-muted-foreground">Depuis un partenaire</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Établissement partenaire */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {form.typeTransfert === "sortant" ? "Établissement destinataire" : "Établissement expéditeur"}
                  </Label>
                  <Select
                    value={form.etablissementPartenaire}
                    onValueChange={(v) => setForm({ ...form, etablissementPartenaire: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un établissement partenaire..." />
                    </SelectTrigger>
                    <SelectContent>
                      {etablissements.filter(e => !e.isPrincipal).map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nom} ({e.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {etablissements.filter(e => !e.isPrincipal).length === 0 && (
                    <p className="text-xs text-amber-600">
                      Aucun établissement partenaire. Créez-en un dans la section Établissements.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Ajouter des produits de l&apos;inventaire
                  </Label>

                  <div className="flex gap-2" ref={searchRef}>
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par nom ou code-barre..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        onFocus={() => productSearch.length >= 2 && setShowResults(true)}
                        className="pl-10"
                      />
                      {searchLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}

                    {showResults && searchResults.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-64 overflow-auto">
                        {searchResults.map((stock) => (
                          <button
                            key={stock.id}
                            type="button"
                            className="w-full px-4 py-3 text-left hover:bg-accent flex items-center justify-between gap-4 border-b last:border-b-0 transition-colors"
                            onClick={() => addProductToList(stock)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{stock.produit.nom}</p>
                              {stock.produit.codeBarre && (
                                <p className="text-xs text-muted-foreground">{stock.produit.codeBarre}</p>
                              )}
                            </div>
                            <Badge variant="neutral" className="shrink-0">
                              {stock.quantiteDisponible} dispo
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}

                    {showResults && productSearch.length >= 2 && searchResults.length === 0 && !searchLoading && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
                        <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                        <p className="text-sm">Aucun produit trouvé</p>
                      </div>
                    )}
                  </div>

                  <Input
                    type="number"
                    min={1}
                    value={ligneQuantite}
                    onChange={(e) => setLigneQuantite(parseInt(e.target.value) || 1)}
                    className="w-20 h-11 text-center"
                    placeholder="Qté"
                  />
                </div>

                {productSearch.length > 0 && productSearch.length < 2 && (
                  <p className="text-xs text-muted-foreground">
                    Tapez au moins 2 caractères pour rechercher
                  </p>
                )}
              </div>

              {form.lignes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Produits à transférer ({form.lignes.length})
                    </Label>
                    <span className="text-sm font-semibold text-primary">
                      Total: {formatCurrency(totalTransfert)}
                    </span>
                  </div>

                  <div className="rounded-lg border divide-y">
                    {form.lignes.map((ligne) => (
                      <div
                        key={ligne.stockId}
                        className="flex items-center gap-4 p-3 hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{ligne.produitNom}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(ligne.prixUnit || 0)} / unité • {ligne.stockDispo} en stock
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateLigneQuantite(ligne.stockId, ligne.quantite - 1)}
                            disabled={ligne.quantite <= 1}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            max={ligne.stockDispo}
                            value={ligne.quantite}
                            onChange={(e) =>
                              updateLigneQuantite(ligne.stockId, parseInt(e.target.value) || 1)
                            }
                            className="w-16 h-8 text-center"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateLigneQuantite(ligne.stockId, ligne.quantite + 1)}
                            disabled={ligne.quantite >= (ligne.stockDispo || 999)}
                          >
                            +
                          </Button>
                        </div>

                        <div className="text-right w-24">
                          <p className="font-medium">
                            {formatCurrency(ligne.quantite * (ligne.prixUnit || 0))}
                          </p>
                        </div>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeLigne(ligne.stockId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Retirer</TooltipContent>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notes (optionnel)
                </Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Informations supplémentaires..."
                  rows={2}
                  className="resize-none"
                />
              </div>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                disabled={saving || !form.etablissementPartenaire || form.lignes.length === 0}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer le transfert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[650px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Transfert {selectedTransfert?.reference}
                {selectedTransfert && (
                  <span className="ml-2">{getStatutBadge(selectedTransfert.statut)}</span>
                )}
              </DialogTitle>
            </DialogHeader>

            {selectedTransfert && (
              <DialogBody>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Source</p>
                      <p className="font-medium text-sm">{selectedTransfert.etablissementSource?.nom || (projetInfo?.nomProjet || "Mon stock")}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Destination</p>
                      <p className="font-medium text-sm">{selectedTransfert.etablissementDestination?.nom || (projetInfo?.nomProjet || "Mon stock")}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Articles</p>
                      <p className="font-medium text-sm">{selectedTransfert.totalQuantite}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Valeur</p>
                      <p className="font-medium text-sm">{formatCurrency(Number(selectedTransfert.valeurEstimee))}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">
                      Produits ({selectedTransfert.lignes.length})
                    </p>
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead className="text-right">Qté</TableHead>
                            <TableHead className="text-right">P.U.</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedTransfert.lignes.map((ligne) => (
                            <TableRow key={ligne.id}>
                              <TableCell className="font-medium">{ligne.produitNom}</TableCell>
                              <TableCell className="text-right">{ligne.quantite}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(Number(ligne.prixUnit))}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(Number(ligne.total))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {selectedTransfert.note && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{selectedTransfert.note}</p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
                    <p>Créé le {formatDateTime(selectedTransfert.createdAt)}</p>
                    {selectedTransfert.dateEnvoi && (
                      <p>Envoyé le {formatDateTime(selectedTransfert.dateEnvoi)}</p>
                    )}
                    {selectedTransfert.dateReception && (
                      <p>Reçu le {formatDateTime(selectedTransfert.dateReception)}</p>
                    )}
                  </div>
                </div>
              </DialogBody>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingAction === "envoyer" && "Envoyer ce transfert ?"}
                {pendingAction === "recevoir" && "Confirmer la réception ?"}
                {pendingAction === "annuler" && "Annuler ce transfert ?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingAction === "envoyer" &&
                  "Le stock sera déduit de l'établissement source. Cette action est irréversible."}
                {pendingAction === "recevoir" &&
                  "Confirmez que les produits ont bien été reçus par l'établissement destination."}
                {pendingAction === "annuler" &&
                  "Le stock sera restauré dans l'établissement source si déjà envoyé."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleAction} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
