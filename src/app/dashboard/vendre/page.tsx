"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  DialogFooter,
  DialogDescription,
  DialogBody,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  User,
  X,
  Calculator,
  Package,
  Percent,
  Loader2,
  FileCheck,
  Wallet,
  Printer,
  Receipt,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { TYPES_PRODUIT, SOUS_TYPES_PRODUIT } from "@/lib/product-constants";
import { toast } from "sonner";

interface Produit {
  id: string;
  nom: string;
  codeBarre: string | null;
  type: string | null;
}

interface Stock {
  id: string;
  quantiteDisponible: number;
  seuilAlerte: number;
  prixAchat: number;
  prixVente: number;
  produit: Produit;
  fournisseur?: { id: string; nom: string } | null;
}

interface LignePanier {
  stock: Stock;
  quantite: number;
  prixUnitaire: number;
  remise: number;
}

interface Client {
  id: string;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  solde: number;
  credit: number;
}

interface VenteResult {
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

interface Categorie {
  id: string;
  nom: string;
}

export default function VendrePage() {
  const [searchCode, setSearchCode] = useState("");
  const [searchNom, setSearchNom] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [sousTypeFilter, setSousTypeFilter] = useState<string>("");
  const [categorieFilter, setCategorieFilter] = useState<string>("");
  const [quantiteAjout, setQuantiteAjout] = useState<number>(1);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [clientSelectionne, setClientSelectionne] = useState<Client | null>(null);
  const [modePaiement, setModePaiement] = useState<"especes" | "carte" | "cheque" | "credit" | "solde">("especes");
  const [dialogPaiement, setDialogPaiement] = useState(false);
  const [dialogClient, setDialogClient] = useState(false);
  const [montantRecu, setMontantRecu] = useState("");
  const [remiseGlobale, setRemiseGlobale] = useState(0);
  
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [lastVente, setLastVente] = useState<VenteResult | null>(null);
  const [projetInfo, setProjetInfo] = useState<{
    nomProjet: string | null;
    adresse: string | null;
    ville: string | null;
    telephone: string | null;
  } | null>(null);
  
  const [scanCooldown, setScanCooldown] = useState(false);
  
  const searchCodeRef = useRef<HTMLInputElement>(null);
  const searchNomRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchCodeRef.current?.focus();
    fetchClients();
    fetchCategories();
    fetchProjetInfo();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Erreur chargement catégories:", error);
    }
  };

  const fetchProjetInfo = async () => {
    try {
      const res = await fetch("/api/auth/profile");
      const data = await res.json();
      if (data.user) {
        setProjetInfo({
          nomProjet: data.user.nomProjet,
          adresse: data.user.adresse,
          ville: data.user.ville,
          telephone: data.user.telephone,
        });
      }
    } catch (error) {
      console.error("Erreur chargement infos projet:", error);
    }
  };

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (data.clients) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error("Erreur chargement clients:", error);
    } finally {
      setLoadingClients(false);
    }
  };

  const ajouterAuPanier = useCallback((stock: Stock, qte: number = 1) => {
    setPanier((prev) => {
      const existant = prev.find((l) => l.stock.id === stock.id);
      if (existant) {
        const newQte = existant.quantite + qte;
        if (newQte > stock.quantiteDisponible) {
          toast.error("Stock insuffisant");
          return prev;
        }
        return prev.map((l) =>
          l.stock.id === stock.id
            ? { ...l, quantite: newQte }
            : l
        );
      }
      if (qte > stock.quantiteDisponible) {
        toast.error("Stock insuffisant");
        return prev;
      }
      return [...prev, { stock, quantite: qte, prixUnitaire: Number(stock.prixVente), remise: 0 }];
    });
    setSearchCode("");
    setSearchNom("");
    setQuantiteAjout(1);
    searchCodeRef.current?.focus();
  }, []);

  useEffect(() => {
    const searchStocks = async () => {
      if (!searchCode && !searchNom && !typeFilter && !sousTypeFilter && !categorieFilter) {
        setStocks([]);
        return;
      }
      
      setLoadingStocks(true);
      try {
        const params = new URLSearchParams();
        if (searchCode) {
          params.set("codeBarre", searchCode);
        } else if (searchNom) {
          params.set("search", searchNom);
        }
        if (typeFilter) params.set("type", typeFilter);
        if (sousTypeFilter) params.set("sousType", sousTypeFilter);
        if (categorieFilter) params.set("categorieId", categorieFilter);
        params.set("limit", "12");
        
        const res = await fetch(`/api/stocks?${params}`);
        const data = await res.json();
        if (data.stocks) {
          const filteredStocks = data.stocks.filter((s: Stock) => s.quantiteDisponible > 0).slice(0, 12);
          setStocks(filteredStocks);
          
          if (searchCode && filteredStocks.length === 1 && !scanCooldown) {
            const stock = filteredStocks[0];
            setScanCooldown(true);
            ajouterAuPanier(stock, quantiteAjout);
            setTimeout(() => setScanCooldown(false), 500);
          }
        }
      } catch (error) {
        console.error("Erreur recherche stocks:", error);
      } finally {
        setLoadingStocks(false);
      }
    };

    const debounce = setTimeout(searchStocks, 300);
    return () => clearTimeout(debounce);
  }, [searchCode, searchNom, typeFilter, sousTypeFilter, categorieFilter, scanCooldown, ajouterAuPanier, quantiteAjout]);

  const modifierQuantite = (stockId: string, delta: number) => {
    setPanier((prev) =>
      prev
        .map((l) => {
          if (l.stock.id === stockId) {
            const nouvelleQte = l.quantite + delta;
            if (nouvelleQte <= 0) return null;
            if (nouvelleQte > l.stock.quantiteDisponible) {
              toast.error("Stock insuffisant");
              return l;
            }
            return { ...l, quantite: nouvelleQte };
          }
          return l;
        })
        .filter(Boolean) as LignePanier[]
    );
  };

  const supprimerDuPanier = (stockId: string) => {
    setPanier((prev) => prev.filter((l) => l.stock.id !== stockId));
  };

  const sousTotal = panier.reduce(
    (acc, l) => acc + l.prixUnitaire * l.quantite * (1 - l.remise / 100),
    0
  );
  const total = sousTotal * (1 - remiseGlobale / 100);
  const monnaie = montantRecu ? parseFloat(montantRecu) - total : 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, isCodeBarre: boolean) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isCodeBarre && searchCode) {
        if (stocks.length === 1) {
          ajouterAuPanier(stocks[0], quantiteAjout);
        }
      } else if (!isCodeBarre && searchNom && stocks.length === 1) {
        ajouterAuPanier(stocks[0], quantiteAjout);
      }
    }
  };
  
  const handleSearchCodeChange = (value: string) => {
    setSearchCode(value);
    if (value) setSearchNom("");
  };
  
  const handleSearchNomChange = (value: string) => {
    setSearchNom(value);
    if (value) setSearchCode("");
  };
  
  const handleTypeChange = (value: string) => {
    setTypeFilter(value === "all" ? "" : value);
    setSousTypeFilter("");
  };

  const validerVente = async () => {
    if (panier.length === 0) {
      toast.error("Le panier est vide");
      return;
    }
    
    if (modePaiement === "solde" && !clientSelectionne) {
      toast.error("Sélectionnez un client pour utiliser le solde");
      return;
    }

    setSubmitting(true);
    try {
      let montantPaye: number | null = null;
      if (modePaiement === "especes" && montantRecu) {
        montantPaye = parseFloat(montantRecu) || null;
      } else if (modePaiement === "carte" || modePaiement === "cheque") {
        montantPaye = total;
      } else if (modePaiement === "credit") {
        montantPaye = null;
      } else if (modePaiement === "solde") {
        montantPaye = null;
      }

      const res = await fetch("/api/ventes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientSelectionne?.id || null,
          lignes: panier.map((l) => ({
            stockId: l.stock.id,
            quantite: l.quantite,
            prixUnit: l.prixUnitaire,
            remise: l.remise,
          })),
          remise: remiseGlobale,
          modePaiement,
          typePaiement: modePaiement,
          montantPaye,
          note: null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la vente");
      }

      const result = await res.json();
      
      setLastVente({
        ...result.vente,
        lignes: panier.map((l) => ({
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          remise: l.remise,
          stock: { produit: { nom: l.stock.produit.nom } },
        })),
        client: clientSelectionne ? { nom: clientSelectionne.nom, prenom: clientSelectionne.prenom } : null,
        total,
        remise: remiseGlobale,
        montantPaye: modePaiement === "especes" && montantRecu ? parseFloat(montantRecu) : null,
        typePaiement: modePaiement,
      });

      toast.success("Vente enregistrée avec succès !");
      setTicketDialogOpen(true);
      
      setDialogPaiement(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la vente");
    } finally {
      setSubmitting(false);
    }
  };

  const viderPanier = () => {
    setPanier([]);
    setClientSelectionne(null);
    setRemiseGlobale(0);
  };

  const handleCloseTicket = () => {
    setTicketDialogOpen(false);
    setPanier([]);
    setClientSelectionne(null);
    setModePaiement("especes");
    setMontantRecu("");
    setRemiseGlobale(0);
    fetchClients();
    searchCodeRef.current?.focus();
  };

  const printTicket = () => {
    const printContent = document.getElementById("ticket-content");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket de caisse</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 10px;
            max-width: 80mm;
          }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .header h1 { font-size: 16px; margin-bottom: 4px; }
          .header p { font-size: 11px; color: #444; }
          .info { margin: 10px 0; font-size: 11px; }
          .info div { display: flex; justify-content: space-between; }
          .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; margin: 10px 0; }
          .item { margin-bottom: 6px; }
          .item-name { font-weight: bold; }
          .item-details { display: flex; justify-content: space-between; font-size: 11px; }
          .totals { padding: 8px 0; }
          .totals div { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .total-final { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 8px; margin-top: 8px; }
          .footer { text-align: center; margin-top: 15px; font-size: 11px; color: #666; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-4">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <Card>
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchCodeRef}
                    placeholder="Code-barres..."
                    value={searchCode}
                    onChange={(e) => handleSearchCodeChange(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, true)}
                    className="pl-8 h-9 font-mono text-sm"
                    autoComplete="off"
                  />
                </div>
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchNomRef}
                    placeholder="Nom du produit..."
                    value={searchNom}
                    onChange={(e) => handleSearchNomChange(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, false)}
                    className="pl-8 h-9 text-sm"
                    autoComplete="off"
                  />
                </div>
                <Input
                  type="number"
                  min={1}
                  value={quantiteAjout}
                  onChange={(e) => setQuantiteAjout(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full sm:w-20 h-9 text-center text-sm"
                  placeholder="Qté"
                />
              </div>
              <div className="grid grid-cols-2 sm:flex gap-2">
                <Select value={typeFilter || "all"} onValueChange={handleTypeChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {TYPES_PRODUIT.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={sousTypeFilter || "all"} 
                  onValueChange={(v) => setSousTypeFilter(v === "all" ? "" : v)}
                  disabled={!typeFilter}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Sous-type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les sous-types</SelectItem>
                    {typeFilter && SOUS_TYPES_PRODUIT[typeFilter]?.map((st) => (
                      <SelectItem key={st.value} value={st.value}>
                        {st.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="col-span-2 sm:col-span-1">
                  <Select 
                    value={categorieFilter || "all"} 
                    onValueChange={(v) => setCategorieFilter(v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes catégories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden min-h-[300px]">
          <CardContent className="p-0 h-full overflow-auto">
            {loadingStocks ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                <Loader2 className="h-8 w-8 mb-3 animate-spin" />
                <p>Recherche...</p>
              </div>
            ) : !searchCode && !searchNom && !typeFilter && !sousTypeFilter && !categorieFilter ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                <Search className="h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">Recherchez un produit</p>
                <p className="text-sm text-center px-4">Scannez un code-barres ou tapez le nom du produit</p>
              </div>
            ) : stocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                <Package className="h-12 w-12 mb-3 opacity-50" />
                <p>Aucun produit trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 p-4">
                {stocks.map((stock) => (
                  <button
                    key={stock.id}
                    onClick={() => ajouterAuPanier(stock, quantiteAjout)}
                    className="flex flex-col p-3 rounded-lg border border-border bg-card hover:border-primary hover:shadow-md transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <Badge variant={stock.quantiteDisponible > 10 ? "success" : stock.quantiteDisponible > 0 ? "warning" : "warning"} className="text-xs">
                        {stock.quantiteDisponible}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">{stock.produit.nom}</h3>
                    {stock.produit.codeBarre && (
                      <p className="text-xs text-muted-foreground mb-1 font-mono truncate">
                        {stock.produit.codeBarre}
                      </p>
                    )}
                    <p className="text-base font-bold text-primary mt-auto">
                      {formatCurrency(Number(stock.prixVente))}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="w-full lg:w-[420px] flex flex-col shrink-0">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Panier</h2>
            {panier.length > 0 && (
              <Badge variant="neutral">{panier.length} article(s)</Badge>
            )}
          </div>
          {panier.length > 0 && (
            <Button variant="ghost" size="sm" onClick={viderPanier} className="text-destructive hover:text-destructive cursor-pointer">
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Vider</span>
            </Button>
          )}
        </div>

        <div className="p-3 border-b">
          <Button
            variant="outline"
            className="w-full justify-start cursor-pointer"
            onClick={() => setDialogClient(true)}
          >
            <User className="h-4 w-4 mr-2" />
            {clientSelectionne ? clientSelectionne.nom : "Client (optionnel)"}
            {clientSelectionne && (
              <X
                className="h-4 w-4 ml-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  setClientSelectionne(null);
                }}
              />
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-3">
          {panier.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-center">Scannez ou recherchez un produit pour commencer</p>
            </div>
          ) : (
            <div className="space-y-2">
              {panier.map((ligne) => (
                <div
                  key={ligne.stock.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ligne.stock.produit.nom}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(ligne.prixUnitaire)} × {ligne.quantite}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 cursor-pointer"
                      onClick={() => modifierQuantite(ligne.stock.id, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{ligne.quantite}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 cursor-pointer"
                      onClick={() => modifierQuantite(ligne.stock.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="font-semibold">
                      {formatCurrency(ligne.prixUnitaire * ligne.quantite)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                    onClick={() => supprimerDuPanier(ligne.stock.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t space-y-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Remise globale</span>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={remiseGlobale || ""}
                onChange={(e) => setRemiseGlobale(parseFloat(e.target.value) || 0)}
                className="w-16 h-8 text-right"
                min={0}
                max={100}
              />
              <span className="text-sm">%</span>
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sous-total</span>
              <span>{formatCurrency(sousTotal)}</span>
            </div>
            {remiseGlobale > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Remise ({remiseGlobale}%)</span>
                <span>-{formatCurrency(sousTotal * remiseGlobale / 100)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
          </div>

          <Button
            className="w-full h-12 text-lg"
            onClick={() => setDialogPaiement(true)}
            disabled={panier.length === 0}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Procéder au paiement
          </Button>
        </div>
      </Card>

      <Dialog open={dialogPaiement} onOpenChange={setDialogPaiement}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Paiement</DialogTitle>
            <DialogDescription>
              Total à payer: <span className="font-bold text-primary">{formatCurrency(total)}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  <Button
                    variant={modePaiement === "especes" ? "default" : "outline"}
                    onClick={() => setModePaiement("especes")}
                    className="flex-col h-16 sm:h-20 gap-1 cursor-pointer"
                  >
                    <Banknote className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-xs">Espèces</span>
                  </Button>
                  <Button
                    variant={modePaiement === "carte" ? "default" : "outline"}
                    onClick={() => setModePaiement("carte")}
                    className="flex-col h-16 sm:h-20 gap-1 cursor-pointer"
                  >
                    <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-xs">Carte</span>
                  </Button>
                  <Button
                    variant={modePaiement === "cheque" ? "default" : "outline"}
                    onClick={() => setModePaiement("cheque")}
                    className="flex-col h-16 sm:h-20 gap-1 cursor-pointer"
                  >
                    <FileCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-xs">Chèque</span>
                  </Button>
                  <Button
                    variant={modePaiement === "credit" ? "default" : "outline"}
                    onClick={() => setModePaiement("credit")}
                    className="flex-col h-16 sm:h-20 gap-1 cursor-pointer"
                  >
                    <User className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-xs">Crédit</span>
                  </Button>
                  <Button
                    variant={modePaiement === "solde" ? "default" : "outline"}
                    onClick={() => setModePaiement("solde")}
                    className="flex-col h-16 sm:h-20 gap-1 cursor-pointer col-span-3 sm:col-span-1"
                    disabled={!clientSelectionne}
                  >
                    <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-xs">Solde</span>
                  </Button>
                </div>
              </div>

              {modePaiement === "especes" && (
                <div className="space-y-2">
                  <Label>Montant reçu (MAD) - Optionnel</Label>
                  <Input
                    type="number"
                    value={montantRecu}
                    onChange={(e) => setMontantRecu(e.target.value)}
                    className="text-2xl h-14 text-right font-bold"
                    placeholder="Non spécifié"
                    autoFocus
                  />
                  <div className="grid grid-cols-4 gap-2">
                    {[20, 50, 100, 200].map((val) => (
                      <Button
                        key={val}
                        variant="outline"
                        onClick={() => setMontantRecu(val.toString())}
                      >
                        {val} MAD
                      </Button>
                    ))}
                  </div>
                  {montantRecu && parseFloat(montantRecu) >= total && (
                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="font-medium">Monnaie à rendre</span>
                      <span className="text-xl font-bold text-green-600">{formatCurrency(monnaie)}</span>
                    </div>
                  )}
                  {!montantRecu && (
                    <p className="text-sm text-muted-foreground">
                      Si aucun montant n&apos;est spécifié, la vente sera enregistrée comme &quot;non spécifié&quot;
                    </p>
                  )}
                </div>
              )}

              {modePaiement === "credit" && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg space-y-2">
                  {clientSelectionne ? (
                    <>
                      <p className="font-medium">{clientSelectionne.nom} {clientSelectionne.prenom || ""}</p>
                      <p className="text-sm text-muted-foreground">{clientSelectionne.telephone}</p>
                      <div className="flex justify-between text-sm pt-2 border-t border-amber-200">
                        <span>Solde actuel dû</span>
                        <span className="font-medium text-red-600">{formatCurrency(Number(clientSelectionne.solde))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Nouveau crédit</span>
                        <span className="font-medium text-amber-600">+{formatCurrency(total)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Vente à crédit sans client associé. Le montant sera enregistré comme crédit non attribué.
                    </p>
                  )}
                </div>
              )}

              {modePaiement === "solde" && clientSelectionne && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-2">
                  <p className="font-medium">{clientSelectionne.nom} {clientSelectionne.prenom || ""}</p>
                  <p className="text-sm text-muted-foreground">{clientSelectionne.telephone}</p>
                  <div className="flex justify-between text-sm pt-2 border-t border-green-200">
                    <span>Crédit disponible</span>
                    <span className="font-medium text-green-600">{formatCurrency(Number(clientSelectionne.credit))}</span>
                  </div>
                  {Number(clientSelectionne.credit) >= total ? (
                    <div className="flex justify-between text-sm">
                      <span>Déduction du solde</span>
                      <span className="font-medium">-{formatCurrency(total)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Déduction du solde</span>
                        <span className="font-medium">-{formatCurrency(Number(clientSelectionne.credit))}</span>
                      </div>
                      <div className="flex justify-between text-sm text-amber-600">
                        <span>Reste à crédit</span>
                        <span className="font-medium">+{formatCurrency(total - Number(clientSelectionne.credit))}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPaiement(false)} className="cursor-pointer">
              Annuler
            </Button>
            <Button onClick={validerVente} disabled={submitting} className="cursor-pointer">
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4 mr-2" />
              )}
              Valider la vente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogClient} onOpenChange={setDialogClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sélectionner un client</DialogTitle>
            <DialogDescription>
              Choisissez un client ou continuez sans client
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {loadingClients ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun client enregistré</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      setClientSelectionne(client);
                      setDialogClient(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-primary hover:bg-muted/50 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{client.nom} {client.prenom || ""}</p>
                      <p className="text-sm text-muted-foreground">{client.telephone || "—"}</p>
                    </div>
                    <div className="text-right text-xs">
                      {Number(client.credit) > 0 && (
                        <p className="text-green-600">Crédit: {formatCurrency(Number(client.credit))}</p>
                      )}
                      {Number(client.solde) > 0 && (
                        <p className="text-red-600">Dû: {formatCurrency(Number(client.solde))}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogClient(false)} className="cursor-pointer">
              Continuer sans client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ticketDialogOpen} onOpenChange={(open) => !open && handleCloseTicket()}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Ticket de caisse
            </DialogTitle>
            <DialogDescription>
              Vente enregistrée avec succès
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {lastVente && (
              <div id="ticket-content" className="bg-white text-black p-4 rounded-lg border font-mono text-sm">
                <div className="header text-center border-b border-dashed pb-3 mb-3">
                  {projetInfo?.nomProjet && <h1 className="font-bold text-lg">{projetInfo.nomProjet}</h1>}
                  {projetInfo?.adresse && <p className="text-xs">{projetInfo.adresse}</p>}
                  {projetInfo?.ville && <p className="text-xs">{projetInfo.ville}</p>}
                  {projetInfo?.telephone && <p className="text-xs">Tél: {projetInfo.telephone}</p>}
                </div>

                <div className="info text-xs space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span>N° Ticket:</span>
                    <span className="font-medium">{lastVente.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date().toLocaleString("fr-FR")}</span>
                  </div>
                  {lastVente.client && (
                    <div className="flex justify-between">
                      <span>Client:</span>
                      <span>{lastVente.client.nom} {lastVente.client.prenom || ""}</span>
                    </div>
                  )}
                </div>

                <div className="items border-t border-b border-dashed py-3 my-3 space-y-2">
                  {lastVente.lignes.map((ligne, idx) => (
                    <div key={idx} className="item">
                      <div className="item-name text-xs font-medium">{ligne.stock.produit.nom}</div>
                      <div className="item-details flex justify-between text-xs">
                        <span>{ligne.quantite} x {formatCurrency(Number(ligne.prixUnitaire))}</span>
                        <span>{formatCurrency(ligne.quantite * Number(ligne.prixUnitaire) * (1 - (ligne.remise || 0) / 100))}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="totals space-y-1">
                  {lastVente.remise > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>Remise ({lastVente.remise}%)</span>
                      <span>-{formatCurrency(lastVente.total * lastVente.remise / 100 / (1 - lastVente.remise / 100))}</span>
                    </div>
                  )}
                  <div className="total-final flex justify-between font-bold text-base border-t border-dashed pt-2 mt-2">
                    <span>TOTAL</span>
                    <span>{formatCurrency(Number(lastVente.total))}</span>
                  </div>
                  {lastVente.typePaiement === "especes" && lastVente.montantPaye ? (
                    <>
                      <div className="flex justify-between text-xs">
                        <span>Montant reçu</span>
                        <span>{formatCurrency(Number(lastVente.montantPaye))}</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium">
                        <span>Monnaie</span>
                        <span>{formatCurrency(Number(lastVente.montantPaye) - Number(lastVente.total))}</span>
                      </div>
                    </>
                  ) : lastVente.typePaiement === "especes" && !lastVente.montantPaye ? (
                    <div className="flex justify-between text-xs italic text-gray-500">
                      <span>Montant payé</span>
                      <span>Non spécifié</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-xs mt-2">
                    <span>Mode de paiement</span>
                    <span className="capitalize">{lastVente.typePaiement}{lastVente.typePaiement === "especes" && !lastVente.montantPaye ? " (non spécifié)" : ""}</span>
                  </div>
                </div>

                <div className="footer text-center mt-4 pt-3 border-t border-dashed text-xs">
                  <p>Merci de votre visite !</p>
                  <p className="mt-1 text-gray-500">À bientôt</p>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseTicket}>
              Fermer
            </Button>
            <Button onClick={printTicket}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
