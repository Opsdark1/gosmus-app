"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Search, FileText, Eye, Loader2, Trash2, Printer, ShoppingCart, Package, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/constants";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LigneVente {
  id: string;
  quantite: number;
  prixUnitaire: number;
  remise: number;
  total: number;
  stock: {
    produit: {
      nom: string;
      codeBarre: string | null;
    };
  };
}

interface FactureDetails {
  id: string;
  numeroFacture: string;
  reference: string | null;
  sousTotal: number;
  tva: number;
  total: number;
  statut: string;
  createdAt: string;
  vente: {
    id: string;
    reference: string;
    total: number;
    lignes: LigneVente[];
    client: {
      id: string;
      nom: string;
      prenom: string | null;
      adresse: string | null;
      telephone: string | null;
    } | null;
  } | null;
}

interface ProjetInfo {
  nomProjet: string | null;
  adresse: string | null;
  ville: string | null;
  pays: string | null;
  telephone: string | null;
  email: string | null;
}

interface Facture {
  id: string;
  reference: string;
  client: {
    id: string;
    nom: string;
  } | null;
  montant: number;
  statut: "non_payee" | "partiellement_payee" | "payee";
  dateEmission: string;
  dateEcheance: string | null;
  actif: boolean;
}

const statutLabels: Record<Facture["statut"], string> = {
  non_payee: "Non payée",
  partiellement_payee: "Partiellement payée",
  payee: "Payée",
};

interface VenteDisponible {
  id: string;
  reference: string;
  total: number;
  montantPaye: number;
  montantDu: number;
  statut: string;
  createdAt: string;
  client: { id: string; nom: string; prenom: string | null } | null;
}

interface Stock {
  id: string;
  quantiteDisponible: number;
  prixVente: number;
  numeroLot: string | null;
  produit: { id: string; nom: string; codeBarre: string | null };
}

interface LigneManuelle {
  stockId: string;
  produitNom: string;
  quantite: number;
  prixUnitaire: number;
  remise: number;
  total: number;
}

const statutColors: Record<Facture["statut"], "info" | "success" | "warning" | "neutral"> = {
  non_payee: "neutral",
  partiellement_payee: "warning",
  payee: "success",
};

export default function FacturesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printData, setPrintData] = useState<{ facture: FactureDetails; projetInfo: ProjetInfo } | null>(null);
  const [loadingPrint, setLoadingPrint] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"ventes" | "manuel">("ventes");
  const [ventesDisponibles, setVentesDisponibles] = useState<VenteDisponible[]>([]);
  const [selectedVentes, setSelectedVentes] = useState<string[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [lignesManuelles, setLignesManuelles] = useState<LigneManuelle[]>([]);
  const [stockSearch, setStockSearch] = useState("");
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const [tva, setTva] = useState("0");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingVentes, setLoadingVentes] = useState(false);
  const [venteSearch, setVenteSearch] = useState("");

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (search.trim() || statusFilter !== "tous") {
        fetchFactures();
      } else {
        setFactures([]);
        setHasSearched(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [search, statusFilter]);

  const fetchFactures = async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.append("search", search.trim());
      }
      if (statusFilter !== "tous") {
        params.append("statut", statusFilter);
      }

      const response = await fetch(`/api/factures?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des factures");
      }

      const data = await response.json();
      setFactures(data.factures || data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVentesDisponibles = async (searchTerm: string = "") => {
    setLoadingVentes(true);
    try {
      const params = new URLSearchParams({
        sansFacture: "true",
        limit: searchTerm.trim() ? "50" : "5",
      });
      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim());
      }
      const res = await fetch(`/api/ventes?${params}`);
      if (!res.ok) throw new Error("Erreur chargement ventes");
      const data = await res.json();
      setVentesDisponibles(data.ventes || []);
    } catch (err) {
      toast.error("Erreur lors du chargement des ventes");
    } finally {
      setLoadingVentes(false);
    }
  };

  const fetchStocks = async () => {
    try {
      const res = await fetch("/api/stocks?limit=100");
      if (!res.ok) throw new Error("Erreur chargement stocks");
      const data = await res.json();
      setStocks(data.stocks || []);
    } catch {
      console.error("Erreur chargement stocks");
    }
  };

  const openCreateDialog = () => {
    setCreateMode("ventes");
    setSelectedVentes([]);
    setLignesManuelles([]);
    setTva("0");
    setReference("");
    setVenteSearch("");
    setCreateDialogOpen(true);
    fetchVentesDisponibles();
    fetchStocks();
  };

  useEffect(() => {
    if (!createDialogOpen || createMode !== "ventes") return;
    
    const timer = setTimeout(() => {
      fetchVentesDisponibles(venteSearch);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [venteSearch, createDialogOpen, createMode]);

  const filteredStocks = useMemo(() => {
    if (!stockSearch.trim()) return stocks.slice(0, 10);
    const searchLower = stockSearch.toLowerCase();
    return stocks.filter(s =>
      s.produit.nom.toLowerCase().includes(searchLower) ||
      (s.produit.codeBarre && s.produit.codeBarre.toLowerCase().includes(searchLower)) ||
      (s.numeroLot && s.numeroLot.toLowerCase().includes(searchLower))
    ).slice(0, 10);
  }, [stocks, stockSearch]);

  const addLigneManuelle = (stock: Stock) => {
    if (lignesManuelles.find(l => l.stockId === stock.id)) {
      toast.error("Ce produit est déjà ajouté");
      return;
    }
    setLignesManuelles([...lignesManuelles, {
      stockId: stock.id,
      produitNom: stock.produit.nom,
      quantite: 1,
      prixUnitaire: Number(stock.prixVente),
      remise: 0,
      total: Number(stock.prixVente),
    }]);
    setStockSearch("");
    setShowStockDropdown(false);
  };

  const updateLigneManuelle = (index: number, field: keyof LigneManuelle, value: number) => {
    const newLignes = [...lignesManuelles];
    newLignes[index] = { ...newLignes[index], [field]: value };
    newLignes[index].total = (newLignes[index].quantite * newLignes[index].prixUnitaire) - newLignes[index].remise;
    setLignesManuelles(newLignes);
  };

  const removeLigneManuelle = (index: number) => {
    setLignesManuelles(lignesManuelles.filter((_, i) => i !== index));
  };

  const sousTotal = useMemo(() => {
    if (createMode === "ventes") {
      return ventesDisponibles
        .filter(v => selectedVentes.includes(v.id))
        .reduce((sum, v) => sum + Number(v.total), 0);
    }
    return lignesManuelles.reduce((sum, l) => sum + l.total, 0);
  }, [createMode, selectedVentes, ventesDisponibles, lignesManuelles]);

  const totalTTC = sousTotal + Number(tva || 0);

  const handleCreateFacture = async () => {
    if (createMode === "ventes" && selectedVentes.length === 0) {
      toast.error("Sélectionnez au moins une vente");
      return;
    }
    if (createMode === "manuel" && lignesManuelles.length === 0) {
      toast.error("Ajoutez au moins un produit");
      return;
    }

    setSubmitting(true);
    try {
      if (createMode === "ventes") {
        for (const venteId of selectedVentes) {
          const res = await fetch("/api/factures", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              venteId,
              tva: Number(tva) / selectedVentes.length,
              reference: reference || null,
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Erreur création facture");
          }
        }
        toast.success(`${selectedVentes.length} facture(s) créée(s) avec succès`);
      } else {
        const venteRes = await fetch("/api/ventes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lignes: lignesManuelles.map(l => ({
              stockId: l.stockId,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              remise: l.remise,
            })),
            typePaiement: "especes",
            montantPaye: 0,
            statut: "credit",
          }),
        });
        if (!venteRes.ok) {
          const data = await venteRes.json();
          throw new Error(data.error || "Erreur création vente");
        }
        const venteData = await venteRes.json();

        const factureRes = await fetch("/api/factures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            venteId: venteData.vente.id,
            tva: Number(tva),
            reference: reference || null,
          }),
        });
        if (!factureRes.ok) {
          const data = await factureRes.json();
          throw new Error(data.error || "Erreur création facture");
        }
        toast.success("Facture créée avec succès");
      }

      setCreateDialogOpen(false);
      fetchFactures();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (facture: Facture) => {
    setSelectedFacture(facture);
    setDetailsOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedFacture) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/factures?id=${selectedFacture.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      toast.success("Facture supprimée avec succès");
      setDeleteDialogOpen(false);
      setDetailsOpen(false);
      setSelectedFacture(null);
      fetchFactures();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la suppression";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const getPaymentStatusMessage = (statut: Facture["statut"]) => {
    switch (statut) {
      case "payee":
        return "Cette facture a été entièrement réglée.";
      case "partiellement_payee":
        return "Cette facture a été partiellement réglée. Un solde reste à payer.";
      case "non_payee":
        return "Cette facture n'a pas encore été réglée.";
    }
  };

  const handlePrint = async (factureId: string) => {
    setLoadingPrint(true);
    try {
      const response = await fetch(`/api/factures?id=${factureId}`);
      if (!response.ok) {
        throw new Error("Erreur lors du chargement de la facture");
      }
      const data = await response.json();
      setPrintData(data);
      setPrintDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoadingPrint(false);
    }
  };

  const printFacture = () => {
    const printContent = document.getElementById("facture-print-content");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Veuillez autoriser les popups pour imprimer");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture ${printData?.facture.numeroFacture}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .company { }
          .company h1 { font-size: 24px; margin-bottom: 5px; }
          .company p { color: #666; }
          .invoice-info { text-align: right; }
          .invoice-info h2 { font-size: 20px; color: #333; }
          .invoice-info p { margin: 3px 0; }
          .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .party { width: 45%; }
          .party h3 { font-size: 14px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .party p { margin: 3px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .totals { width: 300px; margin-left: auto; }
          .totals tr td { padding: 8px; }
          .totals .total-row { font-weight: bold; font-size: 14px; border-top: 2px solid #333; }
          .footer { margin-top: 50px; text-align: center; color: #666; font-size: 10px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Factures</h1>
          <p className="text-muted-foreground">
            Gérez vos factures et suivez les paiements
          </p>
        </div>
        <Button className="cursor-pointer" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle facture
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence ou client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] cursor-pointer">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous" className="cursor-pointer">
                  Tous
                </SelectItem>
                <SelectItem value="non_payee" className="cursor-pointer">
                  Non payée
                </SelectItem>
                <SelectItem value="partiellement_payee" className="cursor-pointer">
                  Partiellement payée
                </SelectItem>
                <SelectItem value="payee" className="cursor-pointer">
                  Payée
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-card">
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              Chargement des factures...
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border bg-card">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <FileText className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="font-semibold mb-1">Erreur</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              {error}
            </p>
            <Button
              onClick={fetchFactures}
              variant="outline"
              className="cursor-pointer"
            >
              Réessayer
            </Button>
          </div>
        </div>
      ) : !hasSearched ? (
        <div className="rounded-lg border bg-card">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Recherchez une facture</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Utilisez la barre de recherche ou les filtres pour trouver vos
              factures
            </p>
          </div>
        </div>
      ) : factures.length === 0 ? (
        <div className="rounded-lg border bg-card">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Aucune facture trouvée</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Aucune facture ne correspond à votre recherche
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                      Référence
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                      Client
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                      Montant
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                      Statut
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                      Date Émission
                    </th>
                    <th className="p-4 text-right text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {factures.map((facture) => (
                    <tr key={facture.id} className="border-b last:border-0">
                      <td className="p-4 font-medium">{facture.reference}</td>
                      <td className="p-4 text-muted-foreground">
                        {facture.client?.nom || "—"}
                      </td>
                      <td className="p-4">{formatCurrency(facture.montant)}</td>
                      <td className="p-4">
                        <Badge
                          variant={statutColors[facture.statut]}
                        >
                          {statutLabels[facture.statut]}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {formatDate(facture.dateEmission)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handlePrint(facture.id)}
                                disabled={loadingPrint}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Imprimer</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewDetails(facture)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Voir détails</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setSelectedFacture(facture);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Supprimer</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Détails de la facture</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {selectedFacture && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Référence</p>
                    <p className="font-medium">{selectedFacture.reference}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">
                      {selectedFacture.client?.nom || "—"}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Montant</p>
                    <p className="font-medium text-lg">
                      {formatCurrency(selectedFacture.montant)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <Badge
                      variant={statutColors[selectedFacture.statut]}
                    >
                      {statutLabels[selectedFacture.statut]}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Date d&apos;émission
                    </p>
                    <p className="font-medium">
                      {formatDate(selectedFacture.dateEmission)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Date d&apos;échéance
                    </p>
                    <p className="font-medium">
                      {formatDate(selectedFacture.dateEcheance)}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border p-4 bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">
                    Statut de paiement
                  </p>
                  <p className="text-sm">
                    {getPaymentStatusMessage(selectedFacture.statut)}
                  </p>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Supprimer
                  </Button>
                </div>
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Confirmer la suppression"
        description={<>Êtes-vous sûr de vouloir supprimer la facture <strong>{selectedFacture?.reference}</strong> ? Cette action est irréversible.</>}
        confirmLabel="Supprimer"
        loadingLabel="Suppression..."
        onConfirm={handleDelete}
        loading={deleting}
      />

      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aperçu de la facture</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {printData && (
              <>
                <div id="facture-print-content" className="bg-white text-black p-6">
                  <div className="header">
                    <div className="company">
                      <h1>{printData.projetInfo?.nomProjet || "Mon Entreprise"}</h1>
                      {printData.projetInfo?.adresse && <p>{printData.projetInfo.adresse}</p>}
                      {(printData.projetInfo?.ville || printData.projetInfo?.pays) && (
                        <p>{[printData.projetInfo.ville, printData.projetInfo.pays].filter(Boolean).join(", ")}</p>
                      )}
                      {printData.projetInfo?.telephone && <p>Tél: {printData.projetInfo.telephone}</p>}
                      {printData.projetInfo?.email && <p>Email: {printData.projetInfo.email}</p>}
                    </div>
                    <div className="invoice-info">
                      <h2>FACTURE</h2>
                      <p><strong>N°:</strong> {printData.facture.numeroFacture}</p>
                      {printData.facture.reference && <p><strong>Réf:</strong> {printData.facture.reference}</p>}
                      <p><strong>Date:</strong> {formatDate(printData.facture.createdAt)}</p>
                      <p><strong>Statut:</strong> {printData.facture.statut}</p>
                    </div>
                  </div>

                  <div className="parties">
                    <div className="party">
                      <h3>Client</h3>
                      {printData.facture.vente?.client ? (
                        <>
                          <p><strong>{printData.facture.vente.client.nom} {printData.facture.vente.client.prenom || ""}</strong></p>
                          {printData.facture.vente.client.adresse && <p>{printData.facture.vente.client.adresse}</p>}
                          {printData.facture.vente.client.telephone && <p>Tél: {printData.facture.vente.client.telephone}</p>}
                        </>
                      ) : (
                        <p>Client comptoir</p>
                      )}
                    </div>
                    <div className="party">
                      <h3>Vente</h3>
                      <p><strong>Référence:</strong> {printData.facture.vente?.reference || "-"}</p>
                    </div>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>Produit</th>
                        <th className="text-right">Qté</th>
                        <th className="text-right">Prix unit.</th>
                        <th className="text-right">Remise</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printData.facture.vente?.lignes.map((ligne) => (
                        <tr key={ligne.id}>
                          <td>{ligne.stock.produit.nom}</td>
                          <td className="text-right">{ligne.quantite}</td>
                          <td className="text-right">{formatCurrency(Number(ligne.prixUnitaire))}</td>
                          <td className="text-right">{ligne.remise > 0 ? formatCurrency(Number(ligne.remise)) : "-"}</td>
                          <td className="text-right">{formatCurrency(Number(ligne.total))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <table className="totals">
                    <tbody>
                      <tr>
                        <td>Sous-total HT</td>
                        <td className="text-right">{formatCurrency(Number(printData.facture.sousTotal))}</td>
                      </tr>
                      <tr>
                        <td>TVA</td>
                        <td className="text-right">{formatCurrency(Number(printData.facture.tva))}</td>
                      </tr>
                      <tr className="total-row">
                        <td>Total TTC</td>
                        <td className="text-right">{formatCurrency(Number(printData.facture.total))}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="footer">
                    <p>Merci pour votre confiance</p>
                    <p>{printData.projetInfo?.nomProjet || "Mon Entreprise"}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
                    Fermer
                  </Button>
                  <Button onClick={printFacture}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimer
                  </Button>
                </div>
              </>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Nouvelle facture
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as "ventes" | "manuel")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="ventes" className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Depuis ventes existantes
                </TabsTrigger>
                <TabsTrigger value="manuel" className="gap-2">
                  <Package className="h-4 w-4" />
                  Création manuelle
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ventes" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sélectionnez une ou plusieurs ventes pour générer des factures.
                </p>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par référence ou client..."
                    value={venteSearch}
                    onChange={(e) => setVenteSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {loadingVentes ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : ventesDisponibles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Aucune vente disponible (sans facture)</p>
                    {venteSearch && <p className="text-xs mt-1">Essayez une autre recherche</p>}
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {!venteSearch && ventesDisponibles.length >= 5 
                        ? "5 dernières ventes affichées - utilisez la recherche pour en voir plus" 
                        : venteSearch && ventesDisponibles.length >= 50 
                        ? "50+ résultats - affinez votre recherche"
                        : `${ventesDisponibles.length} vente(s) disponible(s)`
                      }
                    </p>
                    <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-3 text-left w-10"></th>
                            <th className="p-3 text-left">Référence</th>
                            <th className="p-3 text-left">Client</th>
                            <th className="p-3 text-right">Montant</th>
                            <th className="p-3 text-left">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ventesDisponibles.map((vente) => (
                            <tr 
                              key={vente.id} 
                              className="border-t hover:bg-muted/50 cursor-pointer"
                              onClick={() => {
                                if (selectedVentes.includes(vente.id)) {
                                  setSelectedVentes(selectedVentes.filter(id => id !== vente.id));
                                } else {
                                  setSelectedVentes([...selectedVentes, vente.id]);
                                }
                              }}
                            >
                              <td className="p-3">
                                <Checkbox
                                  checked={selectedVentes.includes(vente.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedVentes([...selectedVentes, vente.id]);
                                    } else {
                                      setSelectedVentes(selectedVentes.filter(id => id !== vente.id));
                                    }
                                  }}
                                />
                              </td>
                              <td className="p-3 font-medium">{vente.reference}</td>
                              <td className="p-3">{vente.client ? `${vente.client.nom} ${vente.client.prenom || ""}` : "Client comptoir"}</td>
                              <td className="p-3 text-right font-medium">{formatCurrency(Number(vente.total))}</td>
                              <td className="p-3 text-muted-foreground">{formatDate(vente.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                {selectedVentes.length > 0 && (
                  <p className="text-sm text-primary font-medium">
                    {selectedVentes.length} vente(s) sélectionnée(s)
                  </p>
                )}
              </TabsContent>

              <TabsContent value="manuel" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Ajoutez des produits manuellement pour créer une facture.
                </p>

                <div className="relative">
                  <Label>Ajouter un produit</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom ou code barre..."
                      value={stockSearch}
                      onChange={(e) => {
                        setStockSearch(e.target.value);
                        setShowStockDropdown(true);
                      }}
                      onFocus={() => setShowStockDropdown(true)}
                      className="pl-9"
                    />
                  </div>
                  {showStockDropdown && stockSearch && (
                    <div className="absolute z-10 w-full mt-1 border rounded-lg bg-popover shadow-lg max-h-48 overflow-y-auto">
                      {filteredStocks.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">Aucun produit trouvé</p>
                      ) : (
                        filteredStocks.map((stock) => (
                          <button
                            key={stock.id}
                            type="button"
                            className="w-full p-3 text-left hover:bg-muted flex justify-between items-center"
                            onClick={() => addLigneManuelle(stock)}
                          >
                            <span className="font-medium">{stock.produit.nom}</span>
                            <span className="text-muted-foreground">{formatCurrency(Number(stock.prixVente))}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {lignesManuelles.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-3 text-left">Produit</th>
                          <th className="p-3 text-center w-20">Qté</th>
                          <th className="p-3 text-right w-28">Prix unit.</th>
                          <th className="p-3 text-right w-24">Remise</th>
                          <th className="p-3 text-right w-28">Total</th>
                          <th className="p-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lignesManuelles.map((ligne, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-3 font-medium">{ligne.produitNom}</td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min={1}
                                value={ligne.quantite}
                                onChange={(e) => updateLigneManuelle(idx, "quantite", parseInt(e.target.value) || 1)}
                                className="w-16 text-center h-8"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={ligne.prixUnitaire}
                                onChange={(e) => updateLigneManuelle(idx, "prixUnitaire", parseFloat(e.target.value) || 0)}
                                className="w-24 text-right h-8"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={ligne.remise}
                                onChange={(e) => updateLigneManuelle(idx, "remise", parseFloat(e.target.value) || 0)}
                                className="w-20 text-right h-8"
                              />
                            </td>
                            <td className="p-3 text-right font-medium">{formatCurrency(ligne.total)}</td>
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeLigneManuelle(idx)}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t mt-4">
              <div>
                <Label>Référence (optionnel)</Label>
                <Input
                  placeholder="Ex: REF-001"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>TVA</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={tva}
                  onChange={(e) => setTva(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total HT</span>
                <span className="font-medium">{formatCurrency(sousTotal)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">TVA</span>
                <span className="font-medium">{formatCurrency(Number(tva || 0))}</span>
              </div>
              <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
                <span>Total TTC</span>
                <span className="text-primary">{formatCurrency(totalTTC)}</span>
              </div>
            </div>
          </DialogBody>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleCreateFacture} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer facture
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
