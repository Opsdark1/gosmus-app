"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Search,
  Receipt,
  Eye,
  Printer,
  Loader2,
  Calendar,
  User,
  CreditCard,
  Banknote,
  Wallet,
  FileText,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, formatDate } from "@/lib/constants";
import { toast } from "sonner";

const PAGE_SIZE = 20;

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
}

const MODES_PAIEMENT: Record<string, { label: string; icon: typeof Banknote }> = {
  especes: { label: "Espèces", icon: Banknote },
  carte: { label: "Carte", icon: CreditCard },
  cheque: { label: "Chèque", icon: FileText },
  credit: { label: "Crédit", icon: Wallet },
  solde: { label: "Solde", icon: Wallet },
};

export default function TicketsPage() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<string>("");
  const [dateDebut, setDateDebut] = useState<string>("");
  const [dateFin, setDateFin] = useState<string>("");
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [projetInfo, setProjetInfo] = useState<{
    nomProjet: string | null;
    adresse: string | null;
    ville: string | null;
    telephone: string | null;
  } | null>(null);
  
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchProjetInfo() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setProjetInfo({
            nomProjet: data.user?.nomProjet || null,
            adresse: data.user?.adresse || null,
            ville: data.user?.ville || null,
            telephone: data.user?.telephone || null,
          });
        }
      } catch {
      }
    }
    fetchProjetInfo();
  }, []);

  useEffect(() => {
    async function fetchVentes() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/ventes");
        
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des tickets");
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

  const ventesFiltrees = useMemo(() => {
    return ventes.filter((v) => {
      const matchSearch =
        !search ||
        v.reference.toLowerCase().includes(search.toLowerCase()) ||
        v.client?.nom?.toLowerCase().includes(search.toLowerCase()) ||
        v.client?.prenom?.toLowerCase().includes(search.toLowerCase());

      const matchMode = !filterMode || v.modePaiement === filterMode || v.typePaiement === filterMode;

      const venteDate = new Date(v.createdAt).toISOString().split("T")[0];
      const matchDateDebut = !dateDebut || venteDate >= dateDebut;
      const matchDateFin = !dateFin || venteDate <= dateFin;

      return matchSearch && matchMode && matchDateDebut && matchDateFin;
    });
  }, [ventes, search, filterMode, dateDebut, dateFin]);

  const totalPages = Math.ceil(ventesFiltrees.length / PAGE_SIZE);
  const paginatedVentes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return ventesFiltrees.slice(start, start + PAGE_SIZE);
  }, [ventesFiltrees, currentPage]);

  const statsJour = useMemo(() => {
    const today = new Date().toDateString();
    const ventesAujourdhui = ventes.filter(
      (v) => new Date(v.createdAt).toDateString() === today
    );
    return {
      count: ventesAujourdhui.length,
      total: ventesAujourdhui.reduce((acc, v) => acc + Number(v.total), 0),
    };
  }, [ventes]);

  const openTicket = (vente: Vente) => {
    setSelectedVente(vente);
    setTicketDialogOpen(true);
  };

  const getPaiementLabel = (vente: Vente) => {
    const mode = vente.typePaiement || vente.modePaiement || "especes";
    if ((mode === "especes" || mode === "espece") && Number(vente.montantPaye) === 0) {
      return "Espèces (montant non spécifié)";
    }
    return MODES_PAIEMENT[mode]?.label || mode;
  };

  const printTicket = () => {
    if (!selectedVente) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression");
      return;
    }

    const montantNonSpecifie = (selectedVente.typePaiement === "especes" || selectedVente.typePaiement === "espece") && Number(selectedVente.montantPaye) === 0;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket de caisse - ${selectedVente.reference}</title>
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
          .non-specifie { font-style: italic; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          ${projetInfo?.nomProjet ? `<h1>${projetInfo.nomProjet}</h1>` : ""}
          ${projetInfo?.adresse ? `<p>${projetInfo.adresse}</p>` : ""}
          ${projetInfo?.ville ? `<p>${projetInfo.ville}</p>` : ""}
          ${projetInfo?.telephone ? `<p>Tél: ${projetInfo.telephone}</p>` : ""}
        </div>

        <div class="info">
          <div><span>N° Ticket:</span><span>${selectedVente.reference}</span></div>
          <div><span>Date:</span><span>${new Date(selectedVente.createdAt).toLocaleString("fr-FR")}</span></div>
          ${selectedVente.client ? `<div><span>Client:</span><span>${selectedVente.client.nom} ${selectedVente.client.prenom || ""}</span></div>` : ""}
          ${selectedVente.vendeurNom ? `<div><span>Vendeur:</span><span>${selectedVente.vendeurNom}</span></div>` : ""}
        </div>

        <div class="items">
          ${selectedVente.lignes.map((ligne) => `
            <div class="item">
              <div class="item-name">${ligne.stock.produit.nom}</div>
              <div class="item-details">
                <span>${ligne.quantite} x ${formatCurrency(Number(ligne.prixUnit))}</span>
                <span>${formatCurrency(ligne.quantite * Number(ligne.prixUnit) * (1 - (ligne.remise || 0) / 100))}</span>
              </div>
            </div>
          `).join("")}
        </div>

        <div class="totals">
          ${Number(selectedVente.remise) > 0 ? `
            <div>
              <span>Remise (${selectedVente.remise}%)</span>
              <span>-${formatCurrency(Number(selectedVente.total) * Number(selectedVente.remise) / 100 / (1 - Number(selectedVente.remise) / 100))}</span>
            </div>
          ` : ""}
          <div class="total-final">
            <span>TOTAL</span>
            <span>${formatCurrency(Number(selectedVente.total))}</span>
          </div>
          ${montantNonSpecifie ? `
            <div class="non-specifie">
              <span>Montant payé</span>
              <span>Non spécifié</span>
            </div>
          ` : Number(selectedVente.montantPaye) > 0 && (selectedVente.typePaiement === "especes" || selectedVente.typePaiement === "espece") ? `
            <div>
              <span>Montant reçu</span>
              <span>${formatCurrency(Number(selectedVente.montantPaye))}</span>
            </div>
            <div>
              <span>Monnaie</span>
              <span>${formatCurrency(Number(selectedVente.montantPaye) - Number(selectedVente.total))}</span>
            </div>
          ` : ""}
          <div>
            <span>Mode de paiement</span>
            <span>${getPaiementLabel(selectedVente)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Merci de votre visite !</p>
          <p>À bientôt</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p>Chargement des tickets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-destructive">
        <p className="text-lg font-medium">Erreur</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Tickets de caisse
          </h1>
          <p className="text-muted-foreground">
            Consultez et réimprimez vos tickets de caisse
          </p>
        </div>
        
        <div className="w-full sm:w-auto p-4 rounded-lg border bg-card flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aujourd&apos;hui</p>
              <p className="text-lg sm:text-xl font-bold">{statsJour.count} tickets</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{formatCurrency(statsJour.total)}</p>
            </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence ou client..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9"
              />
            </div>
            <Select
              value={filterMode || "all"}
              onValueChange={(v) => {
                setFilterMode(v === "all" ? "" : v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Mode paiement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les modes</SelectItem>
                {Object.entries(MODES_PAIEMENT).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateDebut}
              onChange={(e) => {
                setDateDebut(e.target.value);
                setCurrentPage(1);
              }}
              className="w-[150px] h-9"
              placeholder="Date début"
            />
            <Input
              type="date"
              value={dateFin}
              onChange={(e) => {
                setDateFin(e.target.value);
                setCurrentPage(1);
              }}
              className="w-[150px] h-9"
              placeholder="Date fin"
            />
          </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-base font-medium">
            {ventesFiltrees.length} ticket{ventesFiltrees.length > 1 ? "s" : ""} trouvé{ventesFiltrees.length > 1 ? "s" : ""}
          </h3>
        </div>
        <div className="p-0">
          {ventesFiltrees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-4 opacity-50" />
              <p>Aucun ticket trouvé</p>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {paginatedVentes.map((vente) => {
                  const mode = vente.typePaiement || vente.modePaiement || "especes";
                  const ModeIcon = MODES_PAIEMENT[mode]?.icon || Banknote;
                  const montantNonSpecifie = (mode === "especes" || mode === "espece") && Number(vente.montantPaye) === 0;
                  
                  return (
                    <div
                      key={vente.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => openTicket(vente)}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{vente.reference}</span>
                          {montantNonSpecifie && (
                            <Badge variant="neutral" className="text-xs">
                              Montant non spécifié
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(vente.createdAt)}
                          </span>
                          {vente.client && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {vente.client.nom}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <ModeIcon className="h-3 w-3" />
                            {MODES_PAIEMENT[mode]?.label || mode}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold">{formatCurrency(Number(vente.total))}</p>
                        <p className="text-xs text-muted-foreground">
                          {vente.lignes.length} article{vente.lignes.length > 1 ? "s" : ""}
                        </p>
                      </div>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                openTicket(vente);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Voir le ticket</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                  <PaginationInfo
                    currentPage={currentPage}
                    totalItems={ventesFiltrees.length}
                    pageSize={PAGE_SIZE}
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

      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Ticket de caisse
            </DialogTitle>
            <DialogDescription>
              {selectedVente?.reference} - {selectedVente && formatDate(selectedVente.createdAt)}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {selectedVente && (
              <div ref={ticketRef} className="bg-white text-black p-4 rounded-lg border font-mono text-sm">
                <div className="text-center border-b border-dashed pb-3 mb-3">
                  {projetInfo?.nomProjet && <h1 className="font-bold text-lg">{projetInfo.nomProjet}</h1>}
                  {projetInfo?.adresse && <p className="text-xs">{projetInfo.adresse}</p>}
                  {projetInfo?.ville && <p className="text-xs">{projetInfo.ville}</p>}
                  {projetInfo?.telephone && <p className="text-xs">Tél: {projetInfo.telephone}</p>}
                </div>

                <div className="text-xs space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span>N° Ticket:</span>
                    <span className="font-medium">{selectedVente.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(selectedVente.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                  {selectedVente.client && (
                    <div className="flex justify-between">
                      <span>Client:</span>
                      <span>{selectedVente.client.nom} {selectedVente.client.prenom || ""}</span>
                    </div>
                  )}
                  {selectedVente.vendeurNom && (
                    <div className="flex justify-between">
                      <span>Vendeur:</span>
                      <span>{selectedVente.vendeurNom}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-b border-dashed py-3 my-3 space-y-2">
                  {selectedVente.lignes.map((ligne, idx) => (
                    <div key={idx}>
                      <div className="text-xs font-medium">{ligne.stock.produit.nom}</div>
                      <div className="flex justify-between text-xs">
                        <span>{ligne.quantite} x {formatCurrency(Number(ligne.prixUnit))}</span>
                        <span>{formatCurrency(ligne.quantite * Number(ligne.prixUnit) * (1 - (ligne.remise || 0) / 100))}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  {Number(selectedVente.remise) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>Remise ({selectedVente.remise}%)</span>
                      <span>-{formatCurrency(Number(selectedVente.total) * Number(selectedVente.remise) / 100 / (1 - Number(selectedVente.remise) / 100))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t border-dashed pt-2 mt-2">
                    <span>TOTAL</span>
                    <span>{formatCurrency(Number(selectedVente.total))}</span>
                  </div>
                  
                  {(() => {
                    const mode = selectedVente.typePaiement || selectedVente.modePaiement || "especes";
                    const montantNonSpecifie = (mode === "especes" || mode === "espece") && Number(selectedVente.montantPaye) === 0;
                    
                    if (montantNonSpecifie) {
                      return (
                        <div className="flex justify-between text-xs italic text-gray-500 mt-1">
                          <span>Montant payé</span>
                          <span>Non spécifié</span>
                        </div>
                      );
                    } else if ((mode === "especes" || mode === "espece") && Number(selectedVente.montantPaye) > 0) {
                      return (
                        <>
                          <div className="flex justify-between text-xs">
                            <span>Montant reçu</span>
                            <span>{formatCurrency(Number(selectedVente.montantPaye))}</span>
                          </div>
                          <div className="flex justify-between text-xs font-medium">
                            <span>Monnaie</span>
                            <span>{formatCurrency(Number(selectedVente.montantPaye) - Number(selectedVente.total))}</span>
                          </div>
                        </>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="flex justify-between text-xs mt-2">
                    <span>Mode de paiement</span>
                    <span className="capitalize">{getPaiementLabel(selectedVente)}</span>
                  </div>
                </div>

                <div className="text-center mt-4 pt-3 border-t border-dashed text-xs">
                  <p>Merci de votre visite !</p>
                  <p className="mt-1 text-gray-500">À bientôt</p>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTicketDialogOpen(false)}>
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
