"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Check,
  XCircle,
  CreditCard,
  Link2,
  Clock,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/constants";

interface Etablissement {
  id: string;
  nom: string;
  type: string;
  isPrincipal?: boolean;
  isManuel?: boolean;
  utilisateurLieUid?: string | null;
}

interface LigneConfrere {
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

interface Confrere {
  id: string;
  reference: string;
  typeConfrere: string;
  isManuel: boolean;
  statut: string;
  totalArticles: number;
  totalQuantite: number;
  valeurEstimee: number;
  montantDu: number;
  montantPaye: number;
  modePaiement: string | null;
  motif: string | null;
  note: string | null;
  motifRefus: string | null;
  dateEnvoi: string | null;
  dateReception: string | null;
  dateAcceptation: string | null;
  dateRefus: string | null;
  datePaiement: string | null;
  dateCloture: string | null;
  createdAt: string;
  etablissementSource: Etablissement | null;
  etablissementDestination: Etablissement | null;
  lignes: LigneConfrere[];
}

interface Stock {
  id: string;
  quantiteDisponible: number;
  prixAchat: number;
  prixVente: number;
  numeroLot: string | null;
  dateExpiration: string | null;
  produit: {
    id: string;
    nom: string;
    codeBarre: string | null;
  };
}

interface Produit {
  id: string;
  nom: string;
  codeBarre: string | null;
}

const STATUTS: { value: string; label: string; color: "neutral" | "warning" | "info" | "success" }[] = [
  { value: "en_cours", label: "En cours", color: "neutral" },
  { value: "en_attente_acceptation", label: "En attente d'acceptation", color: "warning" },
  { value: "accepte", label: "Accepté", color: "info" },
  { value: "refuse", label: "Refusé", color: "warning" },
  { value: "en_attente_paiement", label: "En attente de paiement", color: "warning" },
  { value: "paiement_confirme", label: "Paiement confirmé", color: "success" },
  { value: "termine", label: "Terminé", color: "success" },
  { value: "annule", label: "Annulé", color: "neutral" },
];

const getStatutInfo = (statut: string) => {
  return STATUTS.find((s) => s.value === statut) || STATUTS[0];
};

const MODES_PAIEMENT = [
  { value: "especes", label: "Espèces" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement bancaire" },
  { value: "mobile", label: "Paiement mobile" },
  { value: "compensation", label: "Compensation / Échange" },
  { value: "autre", label: "Autre" },
];

export default function ConfreresPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("recus") === "true" ? "recus" : "envoyes";
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [confreres, setConfreres] = useState<Confrere[]>([]);
  const [confreresRecus, setConfreresRecus] = useState<Confrere[]>([]);
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageRecus, setPageRecus] = useState(1);
  const [totalPagesRecus, setTotalPagesRecus] = useState(1);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [paiementDialogOpen, setPaiementDialogOpen] = useState(false);
  const [selectedConfrere, setSelectedConfrere] = useState<Confrere | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [produitSearch, setProduitSearch] = useState("");

  interface LigneForm {
    stockId?: string;
    produitId?: string;
    produitNom: string;
    quantite: number;
    prixUnit: number;
    produitCode?: string;
    numeroLot?: string;
    dateExpiration?: string;
    maxQuantite?: number;
    lotExistantId?: string;
  }

  const [form, setForm] = useState({
    typeConfrere: "sortant" as "sortant" | "entrant",
    etablissementPartenaire: "",
    motif: "",
    note: "",
    lignes: [] as LigneForm[],
  });

  const [paiementForm, setPaiementForm] = useState({
    montantPaye: 0,
    modePaiement: "especes",
    notePaiement: "",
  });

  const [motifRefus, setMotifRefus] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const [showStockResults, setShowStockResults] = useState(false);
  const [showProduitResults, setShowProduitResults] = useState(false);

  const fetchConfreres = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (search) params.set("search", search);
      if (statutFilter && statutFilter !== "all") params.set("statut", statutFilter);

      const res = await fetch(`/api/confreres?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur de chargement");

      const data = await res.json();
      setConfreres(data.confreres);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [page, search, statutFilter]);

  const fetchConfreresRecus = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: pageRecus.toString(), recus: "true" });
      if (search) params.set("search", search);
      if (statutFilter && statutFilter !== "all") params.set("statut", statutFilter);

      const res = await fetch(`/api/confreres?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur de chargement");

      const data = await res.json();
      setConfreresRecus(data.confreres);
      setTotalPagesRecus(data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    }
  }, [pageRecus, search, statutFilter]);

  const fetchEtablissements = async () => {
    try {
      const res = await fetch("/api/etablissements?limit=100&actif=true");
      if (res.ok) {
        const data = await res.json();
        setEtablissements(data.etablissements.filter((e: Etablissement) => !e.isPrincipal));
      }
    } catch {
      console.error("Erreur chargement établissements");
    }
  };

  const fetchStocks = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setStocks([]);
      setShowStockResults(false);
      return;
    }
    setLoadingStocks(true);
    try {
      const res = await fetch(`/api/stocks?search=${encodeURIComponent(searchTerm)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setStocks(data.stocks.filter((s: Stock) => s.quantiteDisponible > 0));
        setShowStockResults(true);
      }
    } catch {
      console.error("Erreur chargement stocks");
    } finally {
      setLoadingStocks(false);
    }
  }, []);

  const fetchProduits = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setProduits([]);
      setShowProduitResults(false);
      return;
    }
    setLoadingStocks(true);
    try {
      const res = await fetch(`/api/produits?search=${encodeURIComponent(searchTerm)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setProduits(data.produits || []);
        setShowProduitResults(true);
      }
    } catch {
      console.error("Erreur chargement produits");
    } finally {
      setLoadingStocks(false);
    }
  }, []);

  const fetchLotsForProduit = async (produitId: string) => {
    try {
      const res = await fetch(`/api/stocks?produitId=${produitId}`);
      if (res.ok) {
        const data = await res.json();
        return data.stocks || [];
      }
    } catch {
      console.error("Erreur chargement lots");
    }
    return [];
  };

  useEffect(() => {
    fetchConfreres();
  }, [fetchConfreres]);

  useEffect(() => {
    fetchConfreresRecus();
  }, [fetchConfreresRecus]);

  useEffect(() => {
    fetchEtablissements();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (form.typeConfrere === "sortant") {
        fetchStocks(stockSearch);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [stockSearch, fetchStocks, form.typeConfrere]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (form.typeConfrere === "entrant") {
        fetchProduits(produitSearch);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [produitSearch, fetchProduits, form.typeConfrere]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowStockResults(false);
        setShowProduitResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setPageRecus(1);
    fetchConfreres();
    fetchConfreresRecus();
  };

  const openCreateDialog = () => {
    setForm({
      typeConfrere: "sortant",
      etablissementPartenaire: "",
      motif: "",
      note: "",
      lignes: [],
    });
    setStockSearch("");
    setProduitSearch("");
    setStocks([]);
    setProduits([]);
    setCreateDialogOpen(true);
  };

  const addStockToLignes = (stock: Stock, quantite: number = 1) => {
    const existingIndex = form.lignes.findIndex(l => l.stockId === stock.id);
    if (existingIndex >= 0) {
      toast.error("Ce lot est déjà dans la liste");
      return;
    }

    const qty = Math.min(quantite, stock.quantiteDisponible);
    setForm({
      ...form,
      lignes: [...form.lignes, {
        stockId: stock.id,
        produitNom: stock.produit.nom,
        produitCode: stock.produit.codeBarre || undefined,
        numeroLot: stock.numeroLot || undefined,
        quantite: qty,
        prixUnit: Number(stock.prixVente),
        maxQuantite: stock.quantiteDisponible,
        dateExpiration: stock.dateExpiration || undefined,
      }],
    });
    setStockSearch("");
    setShowStockResults(false);
  };

  const addProduitToLignes = async (produit: Produit, quantite: number, prixUnit: number, lotExistantId?: string) => {
    setForm({
      ...form,
      lignes: [...form.lignes, {
        produitId: produit.id,
        produitNom: produit.nom,
        produitCode: produit.codeBarre || undefined,
        quantite,
        prixUnit,
        lotExistantId,
      }],
    });
    setProduitSearch("");
    setShowProduitResults(false);
  };

  const removeLigne = (index: number) => {
    setForm({
      ...form,
      lignes: form.lignes.filter((_, i) => i !== index),
    });
  };

  const updateLigneQuantite = (index: number, quantite: number) => {
    const lignes = [...form.lignes];
    const ligne = lignes[index];
    if (ligne.maxQuantite && quantite > ligne.maxQuantite) {
      toast.error(`Quantité max disponible: ${ligne.maxQuantite}`);
      quantite = ligne.maxQuantite;
    }
    lignes[index] = { ...ligne, quantite: Math.max(1, quantite) };
    setForm({ ...form, lignes });
  };

  const handleCreate = async () => {
    if (!form.etablissementPartenaire) {
      toast.error("Sélectionnez un établissement partenaire");
      return;
    }

    if (form.lignes.length === 0) {
      toast.error("Ajoutez au moins un produit");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/confreres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etablissementPartenaire: form.etablissementPartenaire,
          typeConfrere: form.typeConfrere,
          motif: form.motif,
          note: form.note,
          lignes: form.lignes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      toast.success("Confrère créé avec succès");
      setCreateDialogOpen(false);
      fetchConfreres();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const executeAction = async () => {
    if (!selectedConfrere || !pendingAction) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = { id: selectedConfrere.id, action: pendingAction };
      
      if (pendingAction === "refuser") {
        body.motifRefus = motifRefus;
      }

      const res = await fetch("/api/confreres", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      const actionLabels: Record<string, string> = {
        envoyer: "Confrère envoyé",
        accepter: "Confrère accepté",
        refuser: "Confrère refusé",
        cloturer: "Confrère clôturé",
        annuler: "Confrère annulé",
      };

      toast.success(actionLabels[pendingAction] || "Action effectuée");
      setActionDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedConfrere(null);
      setPendingAction(null);
      setMotifRefus("");
      fetchConfreres();
      fetchConfreresRecus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmerPaiement = async () => {
    if (!selectedConfrere) return;

    setSaving(true);
    try {
      const res = await fetch("/api/confreres", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedConfrere.id,
          action: "confirmer_paiement",
          montantPaye: paiementForm.montantPaye,
          modePaiement: paiementForm.modePaiement,
          notePaiement: paiementForm.notePaiement,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      toast.success("Paiement confirmé");
      setPaiementDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedConfrere(null);
      fetchConfreres();
      fetchConfreresRecus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedConfrere) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/confreres?id=${selectedConfrere.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      toast.success("Confrère supprimé");
      setActionDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedConfrere(null);
      fetchConfreres();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const openViewDialog = (confrere: Confrere) => {
    setSelectedConfrere(confrere);
    setViewDialogOpen(true);
  };

  const openPaiementDialog = (confrere: Confrere) => {
    setSelectedConfrere(confrere);
    setPaiementForm({
      montantPaye: Number(confrere.montantDu) - Number(confrere.montantPaye),
      modePaiement: "especes",
      notePaiement: "",
    });
    setPaiementDialogOpen(true);
  };

  const renderConfrereTable = (items: Confrere[], isRecus: boolean = false) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{isRecus ? "Aucun confrère reçu" : "Aucun confrère trouvé"}</p>
        </div>
      );
    }

    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Partenaire</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Articles</TableHead>
              <TableHead className="text-right">Valeur</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((confrere) => {
              const partenaire = isRecus 
                ? confrere.etablissementSource 
                : (confrere.typeConfrere === "sortant" ? confrere.etablissementDestination : confrere.etablissementSource);
              const statutInfo = getStatutInfo(confrere.statut);

              return (
                <TableRow key={confrere.id}>
                  <TableCell className="font-medium">{confrere.reference}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{partenaire?.nom || "N/A"}</span>
                      {!confrere.isManuel && (
                        <Badge variant="success" className="text-xs">
                          <Link2 className="h-3 w-3 mr-1" />
                          App
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isRecus ? "info" : (confrere.typeConfrere === "sortant" ? "warning" : "info")}>
                      {isRecus ? "Reçu" : (confrere.typeConfrere === "sortant" ? "Envoi" : "Réception")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statutInfo.color}>
                      {statutInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {confrere.totalQuantite} ({confrere.totalArticles} art.)
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(confrere.valeurEstimee))}
                  </TableCell>
                  <TableCell>{formatDateTime(confrere.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openViewDialog(confrere)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderActions = () => {
    if (!selectedConfrere) return null;

    const isRecus = activeTab === "recus";
    const canSend = !isRecus && selectedConfrere.statut === "en_cours";
    const canAccept = isRecus && selectedConfrere.statut === "en_attente_acceptation";
    const canRefuse = isRecus && selectedConfrere.statut === "en_attente_acceptation";
    const canConfirmPayment = !isRecus && ["en_attente_paiement", "accepte"].includes(selectedConfrere.statut);
    const canClose = !isRecus && selectedConfrere.statut === "paiement_confirme";
    const canCancel = !isRecus && ["en_cours", "en_attente_acceptation"].includes(selectedConfrere.statut);
    const canDelete = !isRecus && selectedConfrere.statut === "en_cours";

    return (
      <div className="flex flex-wrap gap-2">
        {canSend && (
          <Button
            onClick={() => {
              setPendingAction("envoyer");
              setActionDialogOpen(true);
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            Envoyer
          </Button>
        )}
        {canAccept && (
          <Button
            variant="default"
            onClick={() => {
              setPendingAction("accepter");
              setActionDialogOpen(true);
            }}
          >
            <Check className="h-4 w-4 mr-2" />
            Accepter
          </Button>
        )}
        {canRefuse && (
          <Button
            variant="destructive"
            onClick={() => {
              setPendingAction("refuser");
              setActionDialogOpen(true);
            }}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Refuser
          </Button>
        )}
        {canConfirmPayment && (
          <Button
            variant="default"
            onClick={() => openPaiementDialog(selectedConfrere)}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Confirmer paiement
          </Button>
        )}
        {canClose && (
          <Button
            variant="outline"
            onClick={() => {
              setPendingAction("cloturer");
              setActionDialogOpen(true);
            }}
          >
            <PackageCheck className="h-4 w-4 mr-2" />
            Clôturer
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outline"
            onClick={() => {
              setPendingAction("annuler");
              setActionDialogOpen(true);
            }}
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            onClick={() => {
              setPendingAction("supprimer");
              setActionDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2 text-destructive" />
            Supprimer
          </Button>
        )}
      </div>
    );
  };

  const totalValeur = form.lignes.reduce((acc, l) => acc + l.prixUnit * l.quantite, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6" />
            Échanges Confrères
          </h1>
          <p className="text-muted-foreground">
            Gérez les échanges de produits avec vos confrères et partenaires
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel échange
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4 sm:pt-6">
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Référence, partenaire..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-[200px]">
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
      </div>

      <div className="rounded-lg border bg-card p-4 sm:pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="envoyes" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Mes échanges</span>
                <span className="sm:hidden">Envoyés</span>
              </TabsTrigger>
              <TabsTrigger value="recus" className="flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                Reçus
                {confreresRecus.filter(c => c.statut === "en_attente_acceptation").length > 0 && (
                  <Badge variant="warning" className="ml-1">
                    {confreresRecus.filter(c => c.statut === "en_attente_acceptation").length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="envoyes">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  {renderConfrereTable(confreres, false)}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-2 mt-4">
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
            </TabsContent>

            <TabsContent value="recus">
              {renderConfrereTable(confreresRecus, true)}
              {totalPagesRecus > 1 && (
                <div className="flex flex-col sm:flex-row justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageRecus <= 1}
                    onClick={() => setPageRecus(pageRecus - 1)}
                  >
                    Précédent
                  </Button>
                  <span className="flex items-center px-4 text-sm">
                    Page {pageRecus} / {totalPagesRecus}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageRecus >= totalPagesRecus}
                    onClick={() => setPageRecus(pageRecus + 1)}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
      </div>

      {/* Dialog de création */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Nouvel échange confrère</DialogTitle>
            <DialogDescription>
              {form.typeConfrere === "sortant" 
                ? "Sélectionnez les produits de votre inventaire à envoyer"
                : "Ajoutez les produits que vous allez recevoir"}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="flex-1 overflow-y-auto">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type d&apos;échange</Label>
                  <Select
                    value={form.typeConfrere}
                    onValueChange={(v) => {
                      setForm({ ...form, typeConfrere: v as "sortant" | "entrant", lignes: [] });
                      setStockSearch("");
                      setProduitSearch("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sortant">Envoi (je donne)</SelectItem>
                      <SelectItem value="entrant">Réception (je reçois)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Partenaire *</Label>
                  <Select
                    value={form.etablissementPartenaire}
                    onValueChange={(v) => setForm({ ...form, etablissementPartenaire: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {etablissements.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          <div className="flex items-center gap-2">
                            <span>{e.nom}</span>
                            {!e.isManuel && (
                              <Badge variant="success" className="text-xs">
                                <Link2 className="h-3 w-3 mr-1" />
                                App
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Motif</Label>
                <Input
                  value={form.motif}
                  onChange={(e) => setForm({ ...form, motif: e.target.value })}
                  placeholder="Motif de l'échange..."
                />
              </div>

              <div className="space-y-4">
                <Label>Produits</Label>
                
                {form.typeConfrere === "sortant" ? (
                  <div className="space-y-2" ref={searchRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un produit dans votre inventaire..."
                        value={stockSearch}
                        onChange={(e) => setStockSearch(e.target.value)}
                        onFocus={() => stockSearch.length >= 2 && setShowStockResults(true)}
                        className="pl-10"
                      />
                      {loadingStocks && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}

                      {showStockResults && stocks.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-64 overflow-auto">
                          {stocks.map((stock) => (
                            <button
                              key={stock.id}
                              type="button"
                              className="w-full px-4 py-3 text-left hover:bg-accent flex items-center justify-between gap-4 border-b last:border-b-0 transition-colors cursor-pointer"
                              onClick={() => addStockToLignes(stock, 1)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{stock.produit.nom}</p>
                                <p className="text-xs text-muted-foreground">
                                  {stock.numeroLot && `Lot: ${stock.numeroLot} • `}
                                  Dispo: {stock.quantiteDisponible} • {formatCurrency(Number(stock.prixVente))}
                                </p>
                              </div>
                              <Badge variant="info" className="shrink-0">
                                <Package className="h-3 w-3 mr-1" />
                                {stock.quantiteDisponible}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}

                      {showStockResults && stockSearch.length >= 2 && stocks.length === 0 && !loadingStocks && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
                          <p className="text-sm">Aucun produit disponible trouvé</p>
                        </div>
                      )}
                    </div>
                    {stockSearch.length > 0 && stockSearch.length < 2 && (
                      <p className="text-xs text-muted-foreground">
                        Tapez au moins 2 caractères pour rechercher
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2" ref={searchRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un produit dans votre catalogue..."
                        value={produitSearch}
                        onChange={(e) => setProduitSearch(e.target.value)}
                        onFocus={() => produitSearch.length >= 2 && setShowProduitResults(true)}
                        className="pl-10"
                      />
                      {loadingStocks && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}

                      {showProduitResults && produits.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-64 overflow-auto">
                          {produits.map((produit) => (
                            <button
                              key={produit.id}
                              type="button"
                              className="w-full px-4 py-3 text-left hover:bg-accent flex items-center justify-between gap-4 border-b last:border-b-0 transition-colors cursor-pointer"
                              onClick={() => addProduitToLignes(produit, 1, 0)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{produit.nom}</p>
                                {produit.codeBarre && (
                                  <p className="text-xs text-muted-foreground">Code: {produit.codeBarre}</p>
                                )}
                              </div>
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      )}

                      {showProduitResults && produitSearch.length >= 2 && produits.length === 0 && !loadingStocks && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
                          <p className="text-sm">Aucun produit trouvé dans votre catalogue</p>
                        </div>
                      )}
                    </div>
                    {produitSearch.length > 0 && produitSearch.length < 2 && (
                      <p className="text-xs text-muted-foreground">
                        Tapez au moins 2 caractères pour rechercher
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Les produits reçus seront ajoutés à votre inventaire comme nouveaux lots
                    </p>
                  </div>
                )}

                {form.lignes.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          {form.typeConfrere === "sortant" && <TableHead>Lot</TableHead>}
                          <TableHead className="text-right w-[100px]">Qté</TableHead>
                          <TableHead className="text-right">Prix</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.lignes.map((ligne, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{ligne.produitNom}</p>
                                {ligne.produitCode && (
                                  <p className="text-xs text-muted-foreground">{ligne.produitCode}</p>
                                )}
                              </div>
                            </TableCell>
                            {form.typeConfrere === "sortant" && (
                              <TableCell>
                                {ligne.numeroLot || "-"}
                                {ligne.maxQuantite && (
                                  <p className="text-xs text-muted-foreground">Max: {ligne.maxQuantite}</p>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min={1}
                                max={ligne.maxQuantite}
                                value={ligne.quantite}
                                onChange={(e) => updateLigneQuantite(index, parseInt(e.target.value) || 1)}
                                className="w-20 text-right"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {form.typeConfrere === "entrant" ? (
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={ligne.prixUnit}
                                  onChange={(e) => {
                                    const lignes = [...form.lignes];
                                    lignes[index] = { ...lignes[index], prixUnit: parseFloat(e.target.value) || 0 };
                                    setForm({ ...form, lignes });
                                  }}
                                  className="w-24 text-right"
                                />
                              ) : (
                                formatCurrency(ligne.prixUnit)
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(ligne.prixUnit * ligne.quantite)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLigne(index)}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="p-3 bg-muted border-t flex justify-between items-center">
                      <span className="font-medium">Total estimé</span>
                      <span className="font-bold text-lg">{formatCurrency(totalValeur)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Notes supplémentaires..."
                  rows={2}
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de visualisation */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              Détails du confrère {selectedConfrere?.reference}
            </DialogTitle>
          </DialogHeader>

          {selectedConfrere && (
            <DialogBody>
              <div className="space-y-6">
                {/* Informations générales */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <Badge variant={getStatutInfo(selectedConfrere.statut).color} className="mt-1">
                      {getStatutInfo(selectedConfrere.statut).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{selectedConfrere.typeConfrere === "sortant" ? "Envoi" : "Réception"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Partenaire</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {(selectedConfrere.typeConfrere === "sortant" 
                          ? selectedConfrere.etablissementDestination?.nom 
                          : selectedConfrere.etablissementSource?.nom) || "N/A"}
                      </p>
                      {!selectedConfrere.isManuel && (
                        <Badge variant="success" className="text-xs">
                          <Link2 className="h-3 w-3 mr-1" />
                          App
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Créé le</p>
                    <p className="font-medium">{formatDateTime(selectedConfrere.createdAt)}</p>
                  </div>
                </div>

                {/* Dates importantes */}
                {(selectedConfrere.dateEnvoi || selectedConfrere.dateAcceptation || selectedConfrere.dateRefus || selectedConfrere.datePaiement) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedConfrere.dateEnvoi && (
                      <div>
                        <p className="text-sm text-muted-foreground">Date d&apos;envoi</p>
                        <p className="font-medium">{formatDateTime(selectedConfrere.dateEnvoi)}</p>
                      </div>
                    )}
                    {selectedConfrere.dateAcceptation && (
                      <div>
                        <p className="text-sm text-muted-foreground">Date d&apos;acceptation</p>
                        <p className="font-medium">{formatDateTime(selectedConfrere.dateAcceptation)}</p>
                      </div>
                    )}
                    {selectedConfrere.dateRefus && (
                      <div>
                        <p className="text-sm text-muted-foreground">Date de refus</p>
                        <p className="font-medium">{formatDateTime(selectedConfrere.dateRefus)}</p>
                      </div>
                    )}
                    {selectedConfrere.datePaiement && (
                      <div>
                        <p className="text-sm text-muted-foreground">Date de paiement</p>
                        <p className="font-medium">{formatDateTime(selectedConfrere.datePaiement)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Motif de refus */}
                {selectedConfrere.motifRefus && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive">Motif du refus</p>
                    <p className="text-sm">{selectedConfrere.motifRefus}</p>
                  </div>
                )}

                {/* Informations financières */}
                <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted">
                  <div>
                    <p className="text-sm text-muted-foreground">Valeur totale</p>
                    <p className="font-bold text-lg">{formatCurrency(Number(selectedConfrere.valeurEstimee))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Montant payé</p>
                    <p className="font-bold text-lg text-success">{formatCurrency(Number(selectedConfrere.montantPaye))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reste à payer</p>
                    <p className="font-bold text-lg text-destructive">
                      {formatCurrency(Number(selectedConfrere.montantDu) - Number(selectedConfrere.montantPaye))}
                    </p>
                  </div>
                </div>

                {/* Produits */}
                <div className="space-y-2">
                  <Label>Produits ({selectedConfrere.totalArticles} articles, {selectedConfrere.totalQuantite} unités)</Label>
                  <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead className="text-right">Qté</TableHead>
                          <TableHead className="text-right">Prix</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedConfrere.lignes.map((ligne) => (
                          <TableRow key={ligne.id}>
                            <TableCell>{ligne.produitNom}</TableCell>
                            <TableCell>{ligne.produitCode || "-"}</TableCell>
                            <TableCell className="text-right">{ligne.quantite}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(ligne.prixUnit))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(ligne.total))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Notes */}
                {(selectedConfrere.motif || selectedConfrere.note) && (
                  <div className="space-y-2">
                    {selectedConfrere.motif && (
                      <div>
                        <p className="text-sm text-muted-foreground">Motif</p>
                        <p>{selectedConfrere.motif}</p>
                      </div>
                    )}
                    {selectedConfrere.note && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p>{selectedConfrere.note}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {renderActions()}
              </div>
            </DialogBody>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation d'action */}
      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "supprimer" && "Supprimer ce confrère ?"}
              {pendingAction === "envoyer" && "Envoyer ce confrère ?"}
              {pendingAction === "accepter" && "Accepter ce confrère ?"}
              {pendingAction === "refuser" && "Refuser ce confrère ?"}
              {pendingAction === "cloturer" && "Clôturer ce confrère ?"}
              {pendingAction === "annuler" && "Annuler ce confrère ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "supprimer" && "Cette action est irréversible."}
              {pendingAction === "envoyer" && (
                selectedConfrere?.isManuel 
                  ? "L'échange passera en attente de paiement."
                  : "Le partenaire recevra une notification pour accepter ou refuser."
              )}
              {pendingAction === "accepter" && "Vous confirmez avoir reçu les produits."}
              {pendingAction === "refuser" && (
                <div className="space-y-2 mt-2">
                  <p>Indiquez le motif du refus:</p>
                  <Textarea
                    value={motifRefus}
                    onChange={(e) => setMotifRefus(e.target.value)}
                    placeholder="Motif du refus..."
                    rows={3}
                  />
                </div>
              )}
              {pendingAction === "cloturer" && "L'échange sera marqué comme terminé."}
              {pendingAction === "annuler" && "L'échange sera annulé."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={pendingAction === "supprimer" ? handleDelete : executeAction}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmation de paiement */}
      <Dialog open={paiementDialogOpen} onOpenChange={setPaiementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le paiement</DialogTitle>
            <DialogDescription>
              Enregistrez le paiement reçu pour ce confrère
            </DialogDescription>
          </DialogHeader>

          {selectedConfrere && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Montant dû</p>
                <p className="font-bold text-lg">
                  {formatCurrency(Number(selectedConfrere.montantDu) - Number(selectedConfrere.montantPaye))}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="montantPaye">Montant reçu</Label>
                <Input
                  id="montantPaye"
                  type="number"
                  min={0}
                  step="0.01"
                  value={paiementForm.montantPaye}
                  onChange={(e) => setPaiementForm({ ...paiementForm, montantPaye: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modePaiement">Mode de paiement</Label>
                <Select
                  value={paiementForm.modePaiement}
                  onValueChange={(v) => setPaiementForm({ ...paiementForm, modePaiement: v })}
                >
                  <SelectTrigger id="modePaiement">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODES_PAIEMENT.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notePaiement">Note</Label>
                <Textarea
                  id="notePaiement"
                  value={paiementForm.notePaiement}
                  onChange={(e) => setPaiementForm({ ...paiementForm, notePaiement: e.target.value })}
                  placeholder="Référence du chèque, détails..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaiementDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleConfirmerPaiement} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
