"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  PackageX,
  AlertCircle,
  Package,
  Download,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";

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
  seuilAlerte: number;
  dateExpiration: string | null;
}

export default function StockBasPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [lowStocks, setLowStocks] = useState<Stock[]>([]);
  const [outOfStock, setOutOfStock] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "critical" | "out">("all");

  const fetchLowStocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stocks?lowStock=true");
      if (!res.ok) throw new Error("Erreur chargement");
      const data = await res.json();
      const stocks = data.stocks || [];
      setLowStocks(stocks.filter((s: Stock) => s.quantiteDisponible > 0));
      setOutOfStock(stocks.filter((s: Stock) => s.quantiteDisponible === 0));
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLowStocks();
  }, [fetchLowStocks]);

  const getStockPercentage = (stock: Stock): number => {
    if (stock.seuilAlerte === 0) return 100;
    return (stock.quantiteDisponible / stock.seuilAlerte) * 100;
  };

  const filteredLowStocks = lowStocks.filter((stock) => {
    const matchesSearch =
      stock.produit.nom.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (stock.produit.codeBarre && stock.produit.codeBarre.includes(debouncedSearch)) ||
      (stock.numeroLot && stock.numeroLot.toLowerCase().includes(debouncedSearch.toLowerCase()));

    if (filter === "critical") {
      const percentage = getStockPercentage(stock);
      return matchesSearch && percentage <= 30;
    }
    return matchesSearch;
  });

  const totalLowStock = lowStocks.length;
  const criticalCount = lowStocks.filter((s) => getStockPercentage(s) <= 30).length;
  const outOfStockCount = outOfStock.length;
  const totalMissingUnits = lowStocks.reduce(
    (sum, s) => sum + Math.max(0, s.seuilAlerte - s.quantiteDisponible),
    0
  );

  const getStockBadge = (stock: Stock) => {
    const percentage = getStockPercentage(stock);
    if (stock.quantiteDisponible === 0) return <Badge variant="warning">Épuisé</Badge>;
    if (percentage <= 30) return <Badge variant="warning">Critique</Badge>;
    if (percentage <= 60) return <Badge variant="info">Bas</Badge>;
    return <Badge variant="success">OK</Badge>;
  };

  const getStockLevel = (stock: Stock) => {
    const percentage = Math.min(getStockPercentage(stock), 100);
    let color = "bg-green-500";
    if (stock.quantiteDisponible === 0) {
      color = "bg-red-500";
    } else if (percentage <= 30) {
      color = "bg-red-500";
    } else if (percentage <= 60) {
      color = "bg-amber-500";
    }

    return (
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stock bas</h1>
          <p className="text-muted-foreground">Surveillez les stocks en dessous du seuil d&apos;alerte</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900">
              <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{totalLowStock}</p>
            <p className="text-sm text-muted-foreground">Stock bas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{criticalCount}</p>
            <p className="text-sm text-muted-foreground">Critique (&lt; 30%)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <PackageX className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{outOfStockCount}</p>
            <p className="text-sm text-muted-foreground">Épuisés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{totalMissingUnits}</p>
            <p className="text-sm text-muted-foreground">Unités manquantes</p>
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
              <Button variant={filter === "out" ? "default" : "outline"} size="sm" onClick={() => setFilter("out")}>
                Épuisés
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
      ) : filter === "out" ? (
        <Card>
          <CardContent className="p-0">
            {outOfStock.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Aucun stock épuisé"
                message="Tous vos produits sont en stock"
              />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Produit</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Lot</th>
                    <th className="p-4 text-right text-sm font-medium text-muted-foreground">Seuil</th>
                    <th className="p-4 text-right text-sm font-medium text-muted-foreground">Prix</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {outOfStock.map((stock) => (
                    <tr key={stock.id} className="border-b bg-red-50 dark:bg-red-950/20">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{stock.produit.nom}</p>
                          <p className="text-sm text-muted-foreground">{stock.produit.codeBarre || "-"}</p>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{stock.numeroLot || "-"}</td>
                      <td className="p-4 text-right">{stock.seuilAlerte}</td>
                      <td className="p-4 text-right">{formatCurrency(parseFloat(stock.prixVente))}</td>
                      <td className="p-4">
                        <Badge variant="warning">Épuisé</Badge>
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
            {filteredLowStocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
                  <Package className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold mb-1">Aucun stock bas</h3>
                <p className="text-sm text-muted-foreground">Tous vos stocks sont au-dessus du seuil d&apos;alerte</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Produit</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Lot</th>
                    <th className="p-4 text-right text-sm font-medium text-muted-foreground">Quantité</th>
                    <th className="p-4 text-right text-sm font-medium text-muted-foreground">Seuil</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Niveau</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLowStocks.map((stock) => {
                    const percentage = getStockPercentage(stock);
                    return (
                      <tr key={stock.id} className={`border-b ${percentage <= 30 ? "bg-red-50 dark:bg-red-950/20" : percentage <= 60 ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{stock.produit.nom}</p>
                            <p className="text-sm text-muted-foreground">{stock.produit.codeBarre || "-"}</p>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{stock.numeroLot || "-"}</td>
                        <td className="p-4 text-right font-medium">{stock.quantiteDisponible}</td>
                        <td className="p-4 text-right text-muted-foreground">{stock.seuilAlerte}</td>
                        <td className="p-4 w-32">{getStockLevel(stock)}</td>
                        <td className="p-4">{getStockBadge(stock)}</td>
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
