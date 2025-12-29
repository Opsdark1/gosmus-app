"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogBody,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { formatDateTime } from "@/lib/constants";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import {
  History,
  Search,
  Filter,
  Eye,
  Loader2,
  Building2,
  ArrowLeftRight,
  Plus,
  Pencil,
  Trash2,
  Send,
  PackageCheck,
  X,
  Calendar,
  User,
  Download,
  CreditCard,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HistoriqueEntry {
  id: string;
  module: string;
  action: string;
  entiteId: string;
  entiteNom: string | null;
  description: string;
  donneesAvant: Record<string, unknown> | null;
  donneesApres: Record<string, unknown> | null;
  utilisateurId: string;
  utilisateurEmail: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const MODULES = [
  { value: "all", label: "Tous les modules" },
  { value: "etablissements", label: "Établissements" },
  { value: "confreres", label: "Confrères" },
];

const ACTIONS = [
  { value: "all", label: "Toutes les actions" },
  { value: "creer", label: "Création" },
  { value: "modifier", label: "Modification" },
  { value: "supprimer", label: "Suppression" },
  { value: "desactiver", label: "Désactivation" },
  { value: "envoyer", label: "Envoi" },
  { value: "accepter", label: "Acceptation" },
  { value: "refuser", label: "Refus" },
  { value: "paiement", label: "Paiement" },
  { value: "terminer", label: "Terminé" },
  { value: "annuler", label: "Annulation" },
];

const getActionIcon = (action: string) => {
  switch (action) {
    case "creer": return <Plus className="h-4 w-4" />;
    case "modifier": return <Pencil className="h-4 w-4" />;
    case "supprimer": return <Trash2 className="h-4 w-4" />;
    case "desactiver": return <X className="h-4 w-4" />;
    case "envoyer": return <Send className="h-4 w-4" />;
    case "accepter": return <PackageCheck className="h-4 w-4" />;
    case "refuser": return <X className="h-4 w-4" />;
    case "paiement": return <CreditCard className="h-4 w-4" />;
    case "terminer": return <Check className="h-4 w-4" />;
    case "annuler": return <X className="h-4 w-4" />;
    default: return <History className="h-4 w-4" />;
  }
};

const getActionBadge = (action: string) => {
  const variants: Record<string, "success" | "warning" | "info" | "neutral"> = {
    creer: "success",
    modifier: "info",
    supprimer: "warning",
    desactiver: "warning",
    envoyer: "info",
    accepter: "success",
    refuser: "warning",
    paiement: "success",
    terminer: "success",
    annuler: "warning",
  };
  const labels: Record<string, string> = {
    creer: "Création",
    modifier: "Modification",
    supprimer: "Suppression",
    desactiver: "Désactivation",
    envoyer: "Envoi",
    accepter: "Accepté",
    refuser: "Refusé",
    paiement: "Paiement",
    terminer: "Terminé",
    annuler: "Annulation",
  };
  return <Badge variant={variants[action] || "neutral"}>{labels[action] || action}</Badge>;
};

const getModuleIcon = (module: string) => {
  switch (module) {
    case "etablissements": return <Building2 className="h-4 w-4" />;
    case "confreres": return <ArrowLeftRight className="h-4 w-4" />;
    default: return <History className="h-4 w-4" />;
  }
};

export default function HistoriqueGeneralPage() {
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoriqueEntry | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchHistorique = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "30" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (moduleFilter !== "all") params.set("module", moduleFilter);
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (dateDebut) params.set("dateDebut", dateDebut);
      if (dateFin) params.set("dateFin", dateFin);

      const res = await fetch(`/api/historique-general?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur de chargement");

      const data = await res.json();
      setHistorique(data.historique || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, moduleFilter, actionFilter, dateDebut, dateFin]);

  useEffect(() => {
    fetchHistorique();
  }, [fetchHistorique]);

  const handleExport = () => {
    if (historique.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const headers = ["Date", "Module", "Action", "Entité", "Description", "Utilisateur"];
    const rows = historique.map(h => [
      formatDateTime(h.createdAt),
      h.module,
      h.action,
      h.entiteNom || h.entiteId,
      h.description,
      h.utilisateurEmail || h.utilisateurId,
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historique_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export réussi");
  };

  const resetFilters = () => {
    setSearch("");
    setModuleFilter("all");
    setActionFilter("all");
    setDateDebut("");
    setDateFin("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Journal d&apos;activité
          </h1>
          <p className="text-muted-foreground">
            Suivi des modifications sur les établissements et confrères
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-[160px]">
              <Label>Module</Label>
              <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[160px]">
              <Label>Action</Label>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <Label>Date début</Label>
              <Input
                type="date"
                value={dateDebut}
                onChange={(e) => { setDateDebut(e.target.value); setPage(1); }}
                className="cursor-pointer"
              />
            </div>
            <div className="w-[140px]">
              <Label>Date fin</Label>
              <Input
                type="date"
                value={dateFin}
                onChange={(e) => { setDateFin(e.target.value); setPage(1); }}
                className="cursor-pointer"
              />
            </div>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent>
            <LoadingState />
          </CardContent>
        </Card>
      ) : historique.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={History}
              title="Aucun historique"
              message="Les modifications sur les établissements et confrères apparaîtront ici"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span>Historique ({total} entrées)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entité</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead className="text-right">Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historique.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDateTime(entry.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getModuleIcon(entry.module)}
                          <span className="capitalize">{entry.module}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(entry.action)}
                          {getActionBadge(entry.action)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.entiteNom || entry.entiteId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {entry.description}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{entry.utilisateurEmail || "Utilisateur"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedEntry(entry);
                                  setDetailDialogOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Voir les détails</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="p-4 border-t flex items-center justify-between">
              <PaginationInfo
                currentPage={page}
                pageSize={30}
                totalItems={total}
              />
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEntry && getModuleIcon(selectedEntry.module)}
              Détails de l&apos;entrée
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <DialogBody>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Module</p>
                    <p className="font-medium capitalize">{selectedEntry.module}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Action</p>
                    {getActionBadge(selectedEntry.action)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date</p>
                    <p className="text-sm">{formatDateTime(selectedEntry.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Entité</p>
                    <p className="font-medium">{selectedEntry.entiteNom || selectedEntry.entiteId}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{selectedEntry.description}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Utilisateur</p>
                  <p className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedEntry.utilisateurEmail || selectedEntry.utilisateurId}
                  </p>
                </div>

                {selectedEntry.donneesAvant && Object.keys(selectedEntry.donneesAvant).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Données avant</p>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[150px]">
                      {JSON.stringify(selectedEntry.donneesAvant, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedEntry.donneesApres && Object.keys(selectedEntry.donneesApres).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Données après</p>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[150px]">
                      {JSON.stringify(selectedEntry.donneesApres, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </DialogBody>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
