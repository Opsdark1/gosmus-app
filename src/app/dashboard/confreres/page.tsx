"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
  ArrowLeftRight,
  Plus,
  Search,
  Eye,
  Loader2,
  Send,
  X,
  Package,
  Check,
  XCircle,
  Link2,
  Inbox,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Etablissement {
  id: string;
  nom: string;
  type: string;
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
}

interface ContreOffre {
  id: string;
  produitNom: string;
  produitCode: string | null;
  numeroLot: string | null;
  quantite: number;
  prixUnit: number;
  total: number;
  dateExpiration: string | null;
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
  contreValeurEstimee: number;
  differenceRemise: number;
  motif: string | null;
  note: string | null;
  motifRefus: string | null;
  dateEnvoi: string | null;
  dateContreOffre: string | null;
  dateValidation: string | null;
  dateRefus: string | null;
  dateCloture: string | null;
  createdAt: string;
  etablissementSource: Etablissement | null;
  etablissementDestination: Etablissement | null;
  lignes: LigneConfrere[];
  contreOffres: ContreOffre[];
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

const STATUTS: { value: string; label: string; color: "neutral" | "warning" | "info" | "success" }[] = [
  { value: "en_attente_acceptation", label: "En attente", color: "warning" },
  { value: "en_attente_validation", label: "Contre-offre", color: "info" },
  { value: "termine", label: "Terminé", color: "success" },
  { value: "refuse", label: "Refusé", color: "neutral" },
  { value: "annule", label: "Annulé", color: "neutral" },
];

const getStatutInfo = (statut: string) => {
  return STATUTS.find((s) => s.value === statut) || STATUTS[0];
};

interface AlerteEchange {
  id: string;
  reference: string;
  valeurEstimee: number;
  totalQuantite: number;
  createdAt: string;
}

export default function ConfreresPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("recus") === "true" ? "recus" : "envoyes";
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [confreres, setConfreres] = useState<Confrere[]>([]);
  const [confreresRecus, setConfreresRecus] = useState<Confrere[]>([]);
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  
  const [countEnvois, setCountEnvois] = useState(0);
  const [countRecus, setCountRecus] = useState(0);
  
  const [alertes, setAlertes] = useState<AlerteEchange[]>([]);
  const previousRecusRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [contreOffreDialogOpen, setContreOffreDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedConfrere, setSelectedConfrere] = useState<Confrere | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [showStockResults, setShowStockResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  interface LigneForm {
    stockId?: string;
    produitNom: string;
    quantite: number;
    prixUnit: number;
    produitCode?: string;
    numeroLot?: string;
    dateExpiration?: string;
    maxQuantite?: number;
  }

  const [form, setForm] = useState({
    etablissementPartenaire: "",
    motif: "",
    note: "",
    lignes: [] as LigneForm[],
  });

  const [contreOffreForm, setContreOffreForm] = useState<LigneForm[]>([]);
  const [motifRefus, setMotifRefus] = useState("");

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading || isFirstLoadRef.current) {
      setInitialLoading(true);
    }
    
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statutFilter && statutFilter !== "all") params.set("statut", statutFilter);

      const [resEnvois, resRecus] = await Promise.all([
        fetch(`/api/confreres?${params.toString()}`),
        fetch(`/api/confreres?recus=true&${params.toString()}`),
      ]);

      if (resEnvois.ok) {
        const data = await resEnvois.json();
        setConfreres(data.confreres);
        setCountEnvois(data.counts?.enAttenteValidation || 0);
      }

      if (resRecus.ok) {
        const data = await resRecus.json();
        setConfreresRecus(data.confreres);
        
        // Solo mostrar alertas si no es la primera carga
        if (!isFirstLoadRef.current) {
          const newRecus = data.confreres.filter(
            (c: Confrere) => c.statut === "en_attente_acceptation"
          );
          
          const currentIds = new Set<string>(newRecus.map((c: Confrere) => c.id));
          const newAlertes: AlerteEchange[] = [];
          
          for (const c of newRecus) {
            if (!previousRecusRef.current.has(c.id)) {
              newAlertes.push({
                id: c.id,
                reference: c.reference,
                valeurEstimee: c.valeurEstimee,
                totalQuantite: c.totalQuantite,
                createdAt: c.createdAt,
              });
            }
          }
          
          if (newAlertes.length > 0) {
            setAlertes(prev => [...prev, ...newAlertes]);
          }
          
          previousRecusRef.current = currentIds;
        } else {
          // Primera carga: solo guardar los IDs actuales sin mostrar alertas
          const currentRecus = data.confreres.filter(
            (c: Confrere) => c.statut === "en_attente_acceptation"
          );
          previousRecusRef.current = new Set(currentRecus.map((c: Confrere) => c.id));
        }
        
        setCountRecus(data.counts?.enAttenteAcceptation || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoading(false);
      isFirstLoadRef.current = false;
    }
  }, [search, statutFilter]);

  const fetchEtablissements = async () => {
    try {
      const res = await fetch("/api/etablissements?limit=100&actif=true");
      if (res.ok) {
        const data = await res.json();
        setEtablissements(
          data.etablissements.filter(
            (e: Etablissement) => !e.isManuel && e.utilisateurLieUid
          )
        );
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

  useEffect(() => {
    fetchData(true);
    fetchEtablissements();
  }, []);

  // Polling silencioso cada 30 segundos (sin mostrar loading)
  useEffect(() => {
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);
  
  // Refrescar cuando cambian los filtros
  useEffect(() => {
    if (!isFirstLoadRef.current) {
      fetchData(true);
    }
  }, [search, statutFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchStocks(stockSearch);
    }, 300);
    return () => clearTimeout(debounce);
  }, [stockSearch, fetchStocks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowStockResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (alertes.length > 0) {
      const timer = setTimeout(() => {
        setAlertes(prev => prev.slice(1));
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [alertes]);

  const dismissAlerte = (id: string) => {
    setAlertes(prev => prev.filter(a => a.id !== id));
  };

  const openCreateDialog = () => {
    setForm({
      etablissementPartenaire: "",
      motif: "",
      note: "",
      lignes: [],
    });
    setStockSearch("");
    setStocks([]);
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

  const addStockToContreOffre = (stock: Stock, quantite: number = 1) => {
    const existingIndex = contreOffreForm.findIndex(l => l.stockId === stock.id);
    if (existingIndex >= 0) {
      toast.error("Ce lot est déjà dans la liste");
      return;
    }

    const qty = Math.min(quantite, stock.quantiteDisponible);
    setContreOffreForm([...contreOffreForm, {
      stockId: stock.id,
      produitNom: stock.produit.nom,
      produitCode: stock.produit.codeBarre || undefined,
      numeroLot: stock.numeroLot || undefined,
      quantite: qty,
      prixUnit: Number(stock.prixVente),
      maxQuantite: stock.quantiteDisponible,
      dateExpiration: stock.dateExpiration || undefined,
    }]);
    setStockSearch("");
    setShowStockResults(false);
  };

  const removeLigne = (index: number, isContreOffre: boolean = false) => {
    if (isContreOffre) {
      setContreOffreForm(contreOffreForm.filter((_, i) => i !== index));
    } else {
      setForm({ ...form, lignes: form.lignes.filter((_, i) => i !== index) });
    }
  };

  const updateLigneQuantite = (index: number, quantite: number, isContreOffre: boolean = false) => {
    if (isContreOffre) {
      const lignes = [...contreOffreForm];
      const ligne = lignes[index];
      if (ligne.maxQuantite && quantite > ligne.maxQuantite) {
        quantite = ligne.maxQuantite;
      }
      lignes[index] = { ...ligne, quantite: Math.max(1, quantite) };
      setContreOffreForm(lignes);
    } else {
      const lignes = [...form.lignes];
      const ligne = lignes[index];
      if (ligne.maxQuantite && quantite > ligne.maxQuantite) {
        quantite = ligne.maxQuantite;
      }
      lignes[index] = { ...ligne, quantite: Math.max(1, quantite) };
      setForm({ ...form, lignes });
    }
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
          motif: form.motif,
          note: form.note,
          lignes: form.lignes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      toast.success("Échange envoyé avec succès");
      setCreateDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleAccepter = async () => {
    if (!selectedConfrere) return;

    if (contreOffreForm.length === 0) {
      toast.error("Ajoutez au moins un produit en contre-offre");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/confreres", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedConfrere.id,
          action: "accepter",
          contreOffres: contreOffreForm,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      toast.success("Contre-offre envoyée");
      setContreOffreDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedConfrere(null);
      setContreOffreForm([]);
      fetchData();
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
        method: pendingAction === "supprimer" ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        ...(pendingAction === "supprimer" ? {} : { body: JSON.stringify(body) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      const messages: Record<string, string> = {
        valider: "Échange validé et terminé",
        refuser: "Échange refusé",
        annuler: "Échange annulé",
        supprimer: "Échange supprimé",
      };

      toast.success(messages[pendingAction] || "Action effectuée");
      setActionDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedConfrere(null);
      setPendingAction(null);
      setMotifRefus("");
      fetchData();
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

  const openContreOffreDialog = (confrere: Confrere) => {
    setSelectedConfrere(confrere);
    setContreOffreForm([]);
    setStockSearch("");
    setContreOffreDialogOpen(true);
  };

  const totalValeur = form.lignes.reduce((acc, l) => acc + l.prixUnit * l.quantite, 0);
  const contreOffreTotalValeur = contreOffreForm.reduce((acc, l) => acc + l.prixUnit * l.quantite, 0);

  const renderTable = (items: Confrere[], isRecus: boolean) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">{isRecus ? "Aucun échange reçu" : "Aucun échange envoyé"}</p>
          <p className="text-sm mt-1">
            {isRecus 
              ? "Les échanges de vos partenaires apparaîtront ici"
              : "Créez un nouvel échange pour commencer"}
          </p>
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
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Valeur</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((confrere) => {
              const partenaire = isRecus 
                ? confrere.etablissementSource 
                : confrere.etablissementDestination;
              const statutInfo = getStatutInfo(confrere.statut);

              return (
                <TableRow key={confrere.id}>
                  <TableCell className="font-medium">{confrere.reference}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{partenaire?.nom || "—"}</span>
                      <Badge variant="success" className="text-xs">
                        <Link2 className="h-3 w-3 mr-1" />
                        App
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statutInfo.color}>
                      {statutInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <span className="font-medium">{formatCurrency(Number(confrere.valeurEstimee))}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({confrere.totalQuantite} art.)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(confrere.createdAt)}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <div className="flex justify-end gap-1">
                        {isRecus && confrere.statut === "en_attente_acceptation" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openContreOffreDialog(confrere)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accepter
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedConfrere(confrere);
                                    setPendingAction("refuser");
                                    setActionDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Refuser</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {!isRecus && confrere.statut === "en_attente_validation" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setSelectedConfrere(confrere);
                                setPendingAction("valider");
                                setActionDialogOpen(true);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Valider
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedConfrere(confrere);
                                    setPendingAction("refuser");
                                    setActionDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Refuser</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {!isRecus && confrere.statut === "en_attente_acceptation" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedConfrere(confrere);
                                  setPendingAction("annuler");
                                  setActionDialogOpen(true);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Annuler</TooltipContent>
                          </Tooltip>
                        )}
                        {["annule", "refuse"].includes(confrere.statut) && !isRecus && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedConfrere(confrere);
                                  setPendingAction("supprimer");
                                  setActionDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Supprimer</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openViewDialog(confrere)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Voir les détails</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {alertes.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {alertes.map((alerte) => (
            <div
              key={alerte.id}
              className="bg-primary text-primary-foreground p-4 rounded-lg shadow-lg animate-in slide-in-from-right-5 duration-300 cursor-pointer"
              onClick={() => {
                dismissAlerte(alerte.id);
                setActiveTab("recus");
              }}
            >
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 animate-bounce shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">Nouvel échange reçu !</p>
                  <p className="text-sm opacity-90">
                    {alerte.reference} • {formatCurrency(alerte.valeurEstimee)}
                  </p>
                  <p className="text-xs opacity-75 mt-1">
                    {alerte.totalQuantite} article(s) • Cliquez pour voir
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissAlerte(alerte.id);
                  }}
                  className="shrink-0 hover:opacity-75"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 h-1 bg-primary-foreground/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-foreground"
                  style={{ 
                    width: "100%",
                    animation: "shrink-bar 10s linear forwards" 
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}


      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6" />
            Échanges
          </h1>
          <p className="text-muted-foreground">
            Échangez des produits avec vos confrères
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel échange
        </Button>
      </div>

      <div className="bg-muted/50 rounded-t-lg p-1 inline-flex gap-1 border border-b-0">
        <button
          onClick={() => setActiveTab("envoyes")}
          className={`relative px-5 py-2.5 text-sm font-medium transition-all cursor-pointer rounded-md ${
            activeTab === "envoyes"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span>Mes envois</span>
            {countEnvois > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-sm">
                {countEnvois}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("recus")}
          className={`relative px-5 py-2.5 text-sm font-medium transition-all cursor-pointer rounded-md ${
            activeTab === "recus"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            <span>Reçus</span>
            {countRecus > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground animate-pulse shadow-sm">
                {countRecus}
              </span>
            )}
          </div>
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
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
        <div className="w-full sm:w-[180px]">
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
      </div>

      <div className="rounded-lg rounded-tl-none border bg-card">
        {initialLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === "envoyes" ? (
          renderTable(confreres, false)
        ) : (
          renderTable(confreresRecus, true)
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Nouvel échange</DialogTitle>
            <DialogDescription>
              Sélectionnez les produits à échanger et le partenaire destinataire
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="flex-1 overflow-y-auto">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Partenaire destinataire *</Label>
                <Select
                  value={form.etablissementPartenaire}
                  onValueChange={(v) => setForm({ ...form, etablissementPartenaire: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un partenaire..." />
                  </SelectTrigger>
                  <SelectContent>
                    {etablissements.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Aucun partenaire lié à l'application
                      </div>
                    ) : (
                      etablissements.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          <div className="flex items-center gap-2">
                            <span>{e.nom}</span>
                            <Badge variant="success" className="text-xs">
                              <Link2 className="h-3 w-3 mr-1" />
                              App
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Motif de l'échange</Label>
                <Input
                  value={form.motif}
                  onChange={(e) => setForm({ ...form, motif: e.target.value })}
                  placeholder="Ex: Besoin urgent de Doliprane..."
                />
              </div>

              <div className="space-y-4">
                <Label>Produits à échanger</Label>
                
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
                  </div>
                </div>

                {form.lignes.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead className="text-right w-[100px]">Qté</TableHead>
                          <TableHead className="text-right">Prix unit.</TableHead>
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
                                {ligne.numeroLot && (
                                  <p className="text-xs text-muted-foreground">Lot: {ligne.numeroLot}</p>
                                )}
                              </div>
                            </TableCell>
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
                              {formatCurrency(ligne.prixUnit)}
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
                      <span className="font-medium">Valeur estimée totale</span>
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
            <Button onClick={handleCreate} disabled={saving || form.lignes.length === 0}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Envoyer l'échange
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contreOffreDialogOpen} onOpenChange={setContreOffreDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Proposer une contre-offre</DialogTitle>
            <DialogDescription>
              Sélectionnez les produits que vous proposez en échange
            </DialogDescription>
          </DialogHeader>

          {selectedConfrere && (
            <DialogBody className="flex-1 overflow-y-auto">
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-muted space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Échange reçu</span>
                    <Badge variant="info">{selectedConfrere.reference}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Valeur à compenser</span>
                    <span className="font-bold text-lg">{formatCurrency(Number(selectedConfrere.valeurEstimee))}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedConfrere.totalQuantite} article(s) • {selectedConfrere.lignes.map(l => l.produitNom).join(", ")}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Vos produits en contre-offre</Label>
                  
                  <div className="space-y-2" ref={searchRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un produit..."
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
                              onClick={() => addStockToContreOffre(stock, 1)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{stock.produit.nom}</p>
                                <p className="text-xs text-muted-foreground">
                                  Dispo: {stock.quantiteDisponible} • {formatCurrency(Number(stock.prixVente))}
                                </p>
                              </div>
                              <Plus className="h-4 w-4" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {contreOffreForm.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead className="text-right w-[100px]">Qté</TableHead>
                            <TableHead className="text-right">Prix</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contreOffreForm.map((ligne, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{ligne.produitNom}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min={1}
                                  max={ligne.maxQuantite}
                                  value={ligne.quantite}
                                  onChange={(e) => updateLigneQuantite(index, parseInt(e.target.value) || 1, true)}
                                  className="w-20 text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(ligne.prixUnit)}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(ligne.prixUnit * ligne.quantite)}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => removeLigne(index, true)}>
                                  <X className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="p-3 bg-muted border-t">
                        <div className="flex justify-between items-center">
                          <span>Votre contre-offre</span>
                          <span className="font-bold">{formatCurrency(contreOffreTotalValeur)}</span>
                        </div>
                        {Number(selectedConfrere.valeurEstimee) !== contreOffreTotalValeur && (
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed">
                            <span className="text-sm text-muted-foreground">
                              Différence (remise)
                            </span>
                            <span className={`font-medium ${
                              Number(selectedConfrere.valeurEstimee) > contreOffreTotalValeur 
                                ? "text-amber-600" 
                                : "text-green-600"
                            }`}>
                              {formatCurrency(Math.abs(Number(selectedConfrere.valeurEstimee) - contreOffreTotalValeur))}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {contreOffreForm.length > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-medium">Échange de valeurs estimées</p>
                      <p className="text-xs mt-1 opacity-75">
                        La différence de {formatCurrency(Math.abs(Number(selectedConfrere.valeurEstimee) - contreOffreTotalValeur))} sera considérée comme une remise commerciale entre vous.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </DialogBody>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setContreOffreDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAccepter} disabled={saving || contreOffreForm.length === 0}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <ArrowRight className="h-4 w-4 mr-2" />
              Envoyer ma contre-offre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Détails de l'échange {selectedConfrere?.reference}
            </DialogTitle>
          </DialogHeader>

          {selectedConfrere && (
            <DialogBody>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <Badge variant={getStatutInfo(selectedConfrere.statut).color} className="mt-1">
                      {getStatutInfo(selectedConfrere.statut).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Partenaire</p>
                    <p className="font-medium">
                      {(selectedConfrere.typeConfrere === "sortant" 
                        ? selectedConfrere.etablissementDestination?.nom 
                        : selectedConfrere.etablissementSource?.nom) || "—"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted">
                  <div>
                    <p className="text-sm text-muted-foreground">Valeur proposée</p>
                    <p className="font-bold text-lg">{formatCurrency(Number(selectedConfrere.valeurEstimee))}</p>
                    <p className="text-xs text-muted-foreground">{selectedConfrere.totalQuantite} article(s)</p>
                  </div>
                  {Number(selectedConfrere.contreValeurEstimee) > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Contre-offre</p>
                      <p className="font-bold text-lg">{formatCurrency(Number(selectedConfrere.contreValeurEstimee))}</p>
                      {Number(selectedConfrere.differenceRemise) > 0 && (
                        <p className="text-xs text-amber-600">Remise: {formatCurrency(Number(selectedConfrere.differenceRemise))}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Produits proposés</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead className="text-right">Qté</TableHead>
                          <TableHead className="text-right">Valeur</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedConfrere.lignes.map((ligne) => (
                          <TableRow key={ligne.id}>
                            <TableCell>{ligne.produitNom}</TableCell>
                            <TableCell className="text-right">{ligne.quantite}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(ligne.total))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {selectedConfrere.contreOffres.length > 0 && (
                  <div className="space-y-2">
                    <Label>Contre-offre reçue</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead className="text-right">Qté</TableHead>
                            <TableHead className="text-right">Valeur</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedConfrere.contreOffres.map((co) => (
                            <TableRow key={co.id}>
                              <TableCell>{co.produitNom}</TableCell>
                              <TableCell className="text-right">{co.quantite}</TableCell>
                              <TableCell className="text-right">{formatCurrency(Number(co.total))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {selectedConfrere.motifRefus && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive">Motif du refus</p>
                    <p className="text-sm">{selectedConfrere.motifRefus}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Créé le {formatDateTime(selectedConfrere.createdAt)}</span>
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
              {pendingAction === "supprimer" && "Supprimer cet échange ?"}
              {pendingAction === "valider" && "Valider cette contre-offre ?"}
              {pendingAction === "refuser" && "Refuser cet échange ?"}
              {pendingAction === "annuler" && "Annuler cet échange ?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {pendingAction === "supprimer" && "Cette action est irréversible."}
                {pendingAction === "valider" && (
                  <div className="space-y-2">
                    <p>En validant, les produits seront échangés entre les deux parties.</p>
                    {selectedConfrere && (
                      <div className="p-3 rounded-lg bg-muted text-sm">
                        <p>Vous recevrez: {selectedConfrere.contreOffres.map(c => `${c.quantite}x ${c.produitNom}`).join(", ")}</p>
                        <p className="font-medium mt-1">Valeur: {formatCurrency(Number(selectedConfrere.contreValeurEstimee))}</p>
                      </div>
                    )}
                  </div>
                )}
                {pendingAction === "refuser" && (
                  <div className="space-y-3 mt-2">
                    <p>Les stocks seront restitués aux propriétaires.</p>
                    <div>
                      <Label htmlFor="motifRefus">Motif du refus (optionnel)</Label>
                      <Textarea
                        id="motifRefus"
                        value={motifRefus}
                        onChange={(e) => setMotifRefus(e.target.value)}
                        placeholder="Raison du refus..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
                {pendingAction === "annuler" && "Les produits seront restitués à votre stock."}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
