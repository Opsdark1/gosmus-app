"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  AlertTriangle,
  Calendar,
  Package,
  Download,
  Loader2,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { formatCurrency, formatDateShort } from "@/lib/constants";

interface Produit {
  id: string;
  nom: string;
  codeBarre: string | null;
}

interface Stock {
  id: string;
  produit: Produit;
  numeroLot: string | null;
  prixVente: string;
  quantiteDisponible: number;
  dateExpiration: string | null;
}

export default function ExpirationsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [expiringStocks, setExpiringStocks] = useState<Stock[]>([]);
  const [expiredStocks, setExpiredStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "critical" | "soon" | "expired">("all");

  const fetchExpiringStocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stocks?expiringSoon=true");
      if (!res.ok) throw new Error("Erreur chargement");
      const data = await res.json();
      setExpiringStocks(data.stocks || []);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExpiredStocks = useCallback(async () => {
    try {
      const res = await fetch("/api/stocks?expired=true");
      if (!res.ok) throw new Error("Erreur chargement");
      const data = await res.json();
      setExpiredStocks(data.stocks || []);
    } catch {
      console.error("Erreur chargement stocks expirés");
    }
  }, []);

  useEffect(() => {
    fetchExpiringStocks();
    fetchExpiredStocks();
  }, [fetchExpiringStocks, fetchExpiredStocks]);

  const getDaysUntilExpiration = (dateExp: string | null): number => {
    if (!dateExp) return 999;
    const today = new Date();
    const expDate = new Date(dateExp);
    return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filteredExpiring = expiringStocks.filter((stock) => {
    const matchesSearch =
      stock.produit.nom.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (stock.produit.codeBarre && stock.produit.codeBarre.includes(debouncedSearch)) ||
      (stock.numeroLot && stock.numeroLot.toLowerCase().includes(debouncedSearch.toLowerCase()));

    const days = getDaysUntilExpiration(stock.dateExpiration);
    if (filter === "critical") return matchesSearch && days <= 7;
    if (filter === "soon") return matchesSearch && days <= 14;
    return matchesSearch;
  });

  const totalExpiring = expiringStocks.length;
  const criticalCount = expiringStocks.filter((s) => getDaysUntilExpiration(s.dateExpiration) <= 7).length;
  const expiredCount = expiredStocks.length;
  const totalValue = expiringStocks.reduce(
    (sum, s) => sum + s.quantiteDisponible * parseFloat(s.prixVente),
    0
  );

  const getExpirationBadge = (days: number) => {
    if (days <= 0) return <Badge variant="warning">Expiré</Badge>;
    if (days <= 7) return <Badge variant="warning">Critique - {days}j</Badge>;
    if (days <= 14) return <Badge variant="warning">{days} jours</Badge>;
    return <Badge variant="info">{days} jours</Badge>;
  };

  const handleExportCSV = () => {
    const dataToExport = filter === "expired" ? expiredStocks : filteredExpiring;
    if (dataToExport.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const headers = ["Produit", "N° Lot", "Quantité", "Prix Vente", "Date Expiration", "Jours Restants", "Valeur"];
    const rows = dataToExport.map((s: Stock) => {
      const days = getDaysUntilExpiration(s.dateExpiration);
      return [
        s.produit.nom,
        s.numeroLot || "",
        String(s.quantiteDisponible),
        s.prixVente,
        formatDateShort(s.dateExpiration),
        String(days),
        String(Number(s.prixVente) * s.quantiteDisponible)
      ];
    });

    const csvContent = [headers.join(";"), ...rows.map((r: string[]) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expirations_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export réussi");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expirations</h1>
          <p className="text-muted-foreground">Suivez les stocks proche de leur date d&apos;expiration</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{totalExpiring}</p>
            <p className="text-sm text-muted-foreground">Expirent bientôt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900">
              <Calendar className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{criticalCount}</p>
            <p className="text-sm text-muted-foreground">Critique (&lt; 7j)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{expiredCount}</p>
            <p className="text-sm text-muted-foreground">Déjà expirés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{formatCurrency(totalValue)}</p>
            <p className="text-sm text-muted-foreground">Valeur à risque</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par produit, code-barres, lot..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
                Tous
              </Button>
              <Button variant={filter === "critical" ? "default" : "outline"} size="sm" onClick={() => setFilter("critical")}>
                Critique
              </Button>
              <Button variant={filter === "soon" ? "default" : "outline"} size="sm" onClick={() => setFilter("soon")}>
                &lt; 14 jours
              </Button>
              <Button variant={filter === "expired" ? "default" : "outline"} size="sm" onClick={() => setFilter("expired")}>
                Expirés
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent>
            <LoadingState />
          </CardContent>
        </Card>
      ) : filter === "expired" ? (
        <Card>
          <CardContent className="p-0">
            {expiredStocks.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Aucun stock expiré"
                message="Tous vos stocks sont dans les délais"
              />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Produit</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Lot</th>
                    <th className="p-4 text-right text-sm font-medium text-muted-foreground">Quantité</th>
                    <th className="p-4 text-right text-sm font-medium text-muted-foreground">Prix</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Expiré le</th>
                  </tr>
                </thead>
                <tbody>
                  {expiredStocks.map((stock) => (
                    <tr key={stock.id} className="border-b bg-red-50 dark:bg-red-950/20">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{stock.produit.nom}</p>
                          <p className="text-sm text-muted-foreground">{stock.produit.codeBarre || "-"}</p>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{stock.numeroLot || "-"}</td>
                      <td className="p-4 text-right">{stock.quantiteDisponible}</td>
                      <td className="p-4 text-right">{formatCurrency(parseFloat(stock.prixVente))}</td>
                      <td className="p-4">
                        <Badge variant="warning">Expiré</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {filteredExpiring.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
                  <Package className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold mb-1">Aucun stock proche d&apos;expiration</h3>
                <p className="text-sm text-muted-foreground">Tous vos stocks ont des dates d&apos;expiration confortables</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Produit</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Lot</th>
                    <th className="p-4 text-right text-sm font-medium text-muted-foreground">Quantité</th>
                    <th className="p-4 text-right text-sm font-medium text-muted-foreground">Prix</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Expire le</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpiring.map((stock) => {
                    const days = getDaysUntilExpiration(stock.dateExpiration);
                    return (
                      <tr key={stock.id} className={`border-b ${days <= 7 ? "bg-red-50 dark:bg-red-950/20" : days <= 14 ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{stock.produit.nom}</p>
                            <p className="text-sm text-muted-foreground">{stock.produit.codeBarre || "-"}</p>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{stock.numeroLot || "-"}</td>
                        <td className="p-4 text-right">{stock.quantiteDisponible}</td>
                        <td className="p-4 text-right">{formatCurrency(parseFloat(stock.prixVente))}</td>
                        <td className="p-4">{formatDateShort(stock.dateExpiration)}</td>
                        <td className="p-4">{getExpirationBadge(days)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
