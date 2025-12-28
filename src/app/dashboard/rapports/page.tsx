"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  AlertTriangle,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  FileText,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatCurrencyCompact, formatCurrencyShort, formatDateShort } from "@/lib/constants";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";

interface DashboardStats {
  ventesToday: { total: number; count: number };
  ventesMonth: { total: number; paye: number; du: number; count: number };
  clients: number;
  produits: number;
  stocks: { total: number; quantite: number; bas: number; expires: number };
  ventesRecentes: Array<{
    id: string;
    reference: string;
    total: number;
    statut: string;
    createdAt: string;
    client: { nom: string; prenom: string } | null;
  }>;
  topProduits: Array<{
    produitNom: string;
    quantiteVendue: number;
    chiffreAffaires: number;
  }>;
  ventesByDay: Array<{ date: string; count: number; total: number }>;
}

interface VentesReport {
  resume: {
    totalVentes: number;
    totalPaye: number;
    totalDu: number;
    totalRemise: number;
    nombreVentes: number;
    moyenneVente: number;
  };
  parStatut: Array<{ statut: string; count: number; total: number }>;
  parTypePaiement: Array<{ type: string; count: number; total: number }>;
  parVendeur: Array<{ vendeur: string; count: number; total: number }>;
  evolution: Array<{ date: string; count: number; total: number }>;
  topClients: Array<{ clientNom: string; nbVentes: number; totalAchats: number }>;
}

interface StocksReport {
  resume: {
    totalArticles: number;
    totalQuantite: number;
    valeurAchat: number;
    valeurVente: number;
    margeEstimee: number;
  };
  alertes: {
    stocksBas: Array<{ id: string; produit: string; codeBarre: string; fournisseur: string; quantite: number; seuil: number }>;
    expires: Array<{ id: string; produit: string; dateExpiration: string; quantite: number }>;
    expirantBientot: Array<{ id: string; produit: string; dateExpiration: string; quantite: number }>;
  };
  parType: Array<{ type: string; count: number; quantite: number }>;
}

interface FinancierReport {
  resume: {
    chiffreAffaires: number;
    coutAchats: number;
    margeBrute: number;
    tauxMarge: number;
  };
  encaissements: { total: number; enAttente: number; remises: number };
  factures: { count: number; total: number; tva: number };
  avoirs: { count: number; total: number };
  dettes: { clients: number };
}

const COLORS = {
  primary: "#2563eb",
  secondary: "#8b5cf6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
};

const PIE_COLORS = ["#2563eb", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#14b8a6"];

const CustomTooltip = ({ active, payload, label, formatter }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string; formatter?: (v: number) => string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-muted-foreground" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

export default function RapportsPage() {
  const [activeTab, setActiveTab] = useState("ventes");
  const [periode, setPeriode] = useState("mois");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [ventesData, setVentesData] = useState<VentesReport | null>(null);
  const [stocksData, setStocksData] = useState<StocksReport | null>(null);
  const [financierData, setFinancierData] = useState<FinancierReport | null>(null);

  const fetchRapport = useCallback(async (type: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type, periode });
      if (dateDebut) params.set("dateDebut", dateDebut);
      if (dateFin) params.set("dateFin", dateFin);

      const res = await fetch(`/api/rapports?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur de chargement");
      }

      const data = await res.json();

      switch (type) {
        case "dashboard":
          setDashboardData(data.rapport);
          break;
        case "ventes":
          setVentesData(data.rapport);
          break;
        case "stocks":
          setStocksData(data.rapport);
          break;
        case "financier":
          setFinancierData(data.rapport);
          break;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [periode, dateDebut, dateFin]);

  useEffect(() => {
    if (activeTab !== "dashboard") {
      fetchRapport("dashboard");
    }
    fetchRapport(activeTab);
  }, [activeTab, fetchRapport]);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === "ventes" && ventesData?.evolution) {
      headers = ["Date", "Nombre Ventes", "Total"];
      rows = ventesData.evolution.map(v => [
        v.date,
        String(v.count),
        String(v.total)
      ]);
    } else if (activeTab === "stocks" && stocksData?.alertes?.stocksBas) {
      headers = ["Produit", "Code Barre", "Fournisseur", "Quantité", "Seuil"];
      rows = stocksData.alertes.stocksBas.map(s => [
        s.produit,
        s.codeBarre || "",
        s.fournisseur || "",
        String(s.quantite),
        String(s.seuil)
      ]);
    } else if (activeTab === "financier" && financierData?.resume) {
      headers = ["Métrique", "Valeur"];
      rows = [
        ["Chiffre d'affaires", formatCurrencyCompact(financierData.resume.chiffreAffaires)],
        ["Coût d'achats", formatCurrencyCompact(financierData.resume.coutAchats)],
        ["Marge brute", formatCurrencyCompact(financierData.resume.margeBrute)],
        ["Taux de marge", formatPercent(financierData.resume.tauxMarge)],
        ["Encaissements", formatCurrencyCompact(financierData.encaissements?.total || 0)],
        ["Factures", String(financierData.factures?.count || 0)],
        ["Avoirs", String(financierData.avoirs?.count || 0)]
      ];
    }

    if (rows.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export réussi");
  };

  const getEvolutionChartData = () => {
    if (!ventesData?.evolution) return [];
    return ventesData.evolution.slice(-30).map(item => ({
      date: formatDateShort(item.date),
      ventes: item.count,
      total: item.total,
    }));
  };

  const getStatutPieData = () => {
    if (!ventesData?.parStatut) return [];
    return ventesData.parStatut.map(item => ({
      name: item.statut.replace("_", " "),
      value: item.total,
      count: item.count,
    }));
  };

  const getPaiementPieData = () => {
    if (!ventesData?.parTypePaiement) return [];
    return ventesData.parTypePaiement.map(item => ({
      name: item.type,
      value: item.total,
      count: item.count,
    }));
  };

  const getTopVendeursData = () => {
    if (!ventesData?.parVendeur) return [];
    return ventesData.parVendeur.slice(0, 6).map(item => ({
      name: item.vendeur.split(" ")[0],
      total: item.total,
      count: item.count,
    }));
  };

  const getTopProduitsData = () => {
    if (!dashboardData?.topProduits) return [];
    return dashboardData.topProduits.slice(0, 8).map(item => ({
      name: item.produitNom.length > 15 ? item.produitNom.slice(0, 15) + "..." : item.produitNom,
      quantite: item.quantiteVendue,
      ca: item.chiffreAffaires,
    }));
  };

  const getStocksByTypeData = () => {
    if (!stocksData?.parType) return [];
    return stocksData.parType.map(item => ({
      name: item.type,
      articles: item.count,
      quantite: item.quantite,
    }));
  };

  const getFinanceGaugeData = () => {
    if (!financierData?.resume) return [];
    const tauxMarge = financierData.resume.tauxMarge || 0;
    return [{
      name: "Marge",
      value: tauxMarge,
      fill: tauxMarge >= 30 ? COLORS.success : tauxMarge >= 20 ? COLORS.warning : COLORS.danger,
    }];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            Rapports & Statistiques
          </h1>
          <p className="text-muted-foreground mt-1">Analysez vos données commerciales en temps réel</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchRapport(activeTab)} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button variant="default" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {dashboardData && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-green-500/20 to-transparent rounded-bl-full" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CA Aujourd&apos;hui</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrencyCompact(dashboardData.ventesToday.total)}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Badge variant="success" className="gap-1 text-xs">
                      <ArrowUpRight className="h-3 w-3" />
                      {dashboardData.ventesToday.count} ventes
                    </Badge>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-bl-full" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CA Période</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrencyCompact(dashboardData.ventesMonth.total)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-green-600 font-medium">{formatCurrencyCompact(dashboardData.ventesMonth.paye)} payé</span>
                    <span className="text-xs text-orange-600 font-medium">{formatCurrencyCompact(dashboardData.ventesMonth.du)} dû</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-bl-full" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Clients actifs</p>
                  <p className="text-2xl font-bold mt-1">{dashboardData.clients}</p>
                  <p className="text-xs text-muted-foreground mt-2">Base clientèle</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-orange-500/20 to-transparent rounded-bl-full" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Stock total</p>
                  <p className="text-2xl font-bold mt-1">{dashboardData.stocks.quantite.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {dashboardData.stocks.bas > 0 && (
                      <Badge variant="warning" className="text-xs">{dashboardData.stocks.bas} bas</Badge>
                    )}
                    {dashboardData.stocks.expires > 0 && (
                      <Badge variant="warning" className="text-xs">{dashboardData.stocks.expires} exp</Badge>
                    )}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Package className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Période d&apos;analyse</Label>
              <Select value={periode} onValueChange={setPeriode}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jour">Aujourd&apos;hui</SelectItem>
                  <SelectItem value="semaine">Cette semaine</SelectItem>
                  <SelectItem value="mois">Ce mois</SelectItem>
                  <SelectItem value="annee">Cette année</SelectItem>
                  <SelectItem value="tout">Tout</SelectItem>
                  <SelectItem value="personnalise">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {periode === "personnalise" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Date début</Label>
                  <Input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Date fin</Label>
                  <Input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
              </>
            )}
            <Button onClick={() => fetchRapport(activeTab)} className="gap-2">
              <Activity className="h-4 w-4" />
              Analyser
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid h-12">
          <TabsTrigger value="ventes" className="gap-2 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Ventes</span>
          </TabsTrigger>
          <TabsTrigger value="stocks" className="gap-2 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Stocks</span>
          </TabsTrigger>
          <TabsTrigger value="financier" className="gap-2 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Financier</span>
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <span className="text-muted-foreground">Chargement des données...</span>
            </CardContent>
          </Card>
        ) : (
          <>
            <TabsContent value="ventes" className="space-y-6 mt-6">
              {ventesData && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Ventes</p>
                            <p className="text-xl font-bold">{formatCurrencyCompact(ventesData.resume.totalVentes)}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{ventesData.resume.nombreVentes} transactions</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Encaissé</p>
                            <p className="text-xl font-bold">{formatCurrencyCompact(ventesData.resume.totalPaye)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-orange-500 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">À encaisser</p>
                            <p className="text-xl font-bold">{formatCurrencyCompact(ventesData.resume.totalDu)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
                            <Target className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Panier moyen</p>
                            <p className="text-xl font-bold">{formatCurrencyCompact(ventesData.resume.moyenneVente)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Évolution des ventes
                      </CardTitle>
                      <CardDescription>Tendance des ventes sur la période sélectionnée</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={getEvolutionChartData()}>
                            <defs>
                              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
                            <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 12 }} stroke="#6b7280" />
                            <RechartsTooltip content={<CustomTooltip formatter={formatCurrency} />} />
                            <Area
                              type="monotone"
                              dataKey="total"
                              name="Chiffre d'affaires"
                              stroke={COLORS.primary}
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorTotal)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PieChartIcon className="h-5 w-5 text-primary" />
                          Répartition par statut
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[280px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={getStatutPieData()}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {getStatutPieData().map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip content={<CustomTooltip formatter={formatCurrency} />} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-primary" />
                          Répartition par paiement
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[280px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={getPaiementPieData()}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {getPaiementPieData().map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip content={<CustomTooltip formatter={formatCurrency} />} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          Performance des vendeurs
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[280px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getTopVendeursData()} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis type="number" tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11 }} stroke="#6b7280" />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#6b7280" width={80} />
                              <RechartsTooltip content={<CustomTooltip formatter={formatCurrency} />} />
                              <Bar dataKey="total" name="CA" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary" />
                          Top produits vendus
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[280px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getTopProduitsData()}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={70} stroke="#6b7280" />
                              <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" />
                              <RechartsTooltip />
                              <Bar dataKey="quantite" name="Quantité vendue" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          Meilleurs clients
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {ventesData.topClients.slice(0, 6).map((client, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold ${
                                idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-amber-700" : "bg-primary/70"
                              }`}>
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{client.clientNom}</p>
                                <p className="text-sm text-muted-foreground">{client.nbVentes} achats</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-primary">{formatCurrencyCompact(client.totalAchats)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="stocks" className="space-y-6 mt-6">
              {stocksData && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground font-medium">Articles</p>
                            <p className="text-xl font-bold">{stocksData.resume.totalArticles}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{stocksData.resume.totalQuantite.toLocaleString()} unités</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-red-500 flex items-center justify-center">
                            <ArrowDownRight className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground font-medium">Valeur achat</p>
                            <p className="text-xl font-bold">{formatCurrencyCompact(stocksData.resume.valeurAchat)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
                            <ArrowUpRight className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground font-medium">Valeur vente</p>
                            <p className="text-xl font-bold">{formatCurrencyCompact(stocksData.resume.valeurVente)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground font-medium">Marge estimée</p>
                            <p className="text-xl font-bold text-green-600">{formatCurrencyCompact(stocksData.resume.margeEstimee)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Répartition par type de produit
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getStocksByTypeData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#6b7280" />
                            <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="articles" name="Nb articles" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="quantite" name="Quantité" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="border-red-200 dark:border-red-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="h-5 w-5" />
                          Stocks bas ({stocksData.alertes.stocksBas.length})
                        </CardTitle>
                        <CardDescription>Produits en dessous du seuil d&apos;alerte</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-[350px] overflow-auto">
                          {stocksData.alertes.stocksBas.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">Aucun stock bas</p>
                          ) : (
                            stocksData.alertes.stocksBas.map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900">
                                <div>
                                  <p className="font-medium text-sm">{item.produit}</p>
                                  <p className="text-xs text-muted-foreground">{item.fournisseur}</p>
                                </div>
                                <Badge variant="warning" className="font-mono">
                                  {item.quantite} / {item.seuil}
                                </Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-orange-200 dark:border-orange-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-orange-600">
                          <Calendar className="h-5 w-5" />
                          Expirent bientôt ({stocksData.alertes.expirantBientot.length})
                        </CardTitle>
                        <CardDescription>Produits expirant dans les 30 prochains jours</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-[350px] overflow-auto">
                          {stocksData.alertes.expirantBientot.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">Aucune expiration proche</p>
                          ) : (
                            stocksData.alertes.expirantBientot.map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900">
                                <div>
                                  <p className="font-medium text-sm">{item.produit}</p>
                                  <p className="text-xs text-muted-foreground">{item.quantite} unités</p>
                                </div>
                                <Badge variant="warning">{formatDateShort(item.dateExpiration)}</Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 border-destructive/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="h-5 w-5" />
                          Produits expirés ({stocksData.alertes.expires.length})
                        </CardTitle>
                        <CardDescription>À retirer du stock immédiatement</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {stocksData.alertes.expires.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">Aucun produit expiré</p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {stocksData.alertes.expires.slice(0, 9).map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
                                <div>
                                  <p className="font-medium text-sm">{item.produit}</p>
                                  <p className="text-xs text-destructive">{item.quantite} unités</p>
                                </div>
                                <Badge variant="warning">{formatDateShort(item.dateExpiration)}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="financier" className="space-y-6 mt-6">
              {financierData && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                      <CardContent className="p-6">
                        <p className="text-sm text-blue-100 font-medium">Chiffre d&apos;affaires</p>
                        <p className="text-3xl font-bold mt-2">{formatCurrencyCompact(financierData.resume.chiffreAffaires)}</p>
                        <div className="flex items-center gap-1 mt-3">
                          <TrendingUp className="h-4 w-4 text-blue-200" />
                          <span className="text-xs text-blue-100">Total période</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                      <CardContent className="p-6">
                        <p className="text-sm text-red-100 font-medium">Coût des achats</p>
                        <p className="text-3xl font-bold mt-2">{formatCurrencyCompact(financierData.resume.coutAchats)}</p>
                        <div className="flex items-center gap-1 mt-3">
                          <ArrowDownRight className="h-4 w-4 text-red-200" />
                          <span className="text-xs text-red-100">Dépenses stock</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                      <CardContent className="p-6">
                        <p className="text-sm text-green-100 font-medium">Marge brute</p>
                        <p className="text-3xl font-bold mt-2">{formatCurrencyCompact(financierData.resume.margeBrute)}</p>
                        <div className="flex items-center gap-1 mt-3">
                          <ArrowUpRight className="h-4 w-4 text-green-200" />
                          <span className="text-xs text-green-100">Bénéfice estimé</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground font-medium">Taux de marge</p>
                        <p className="text-3xl font-bold mt-2">{formatPercent(Number(financierData.resume.tauxMarge))}</p>
                        <div className="w-full bg-muted rounded-full h-2 mt-3">
                          <div 
                            className={`h-2 rounded-full ${financierData.resume.tauxMarge >= 30 ? "bg-green-500" : financierData.resume.tauxMarge >= 20 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(financierData.resume.tauxMarge, 100)}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5 text-primary" />
                          Performance de marge
                        </CardTitle>
                        <CardDescription>Objectif: 30% minimum</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart 
                              cx="50%" 
                              cy="50%" 
                              innerRadius="60%" 
                              outerRadius="90%" 
                              data={getFinanceGaugeData()}
                              startAngle={180}
                              endAngle={0}
                            >
                              <RadialBar
                                dataKey="value"
                                cornerRadius={10}
                                background={{ fill: "#e5e7eb" }}
                              />
                            </RadialBarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="text-center -mt-16">
                          <p className="text-4xl font-bold">{formatPercent(Number(financierData.resume.tauxMarge))}</p>
                          <p className="text-sm text-muted-foreground">Taux de marge actuel</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PieChartIcon className="h-5 w-5 text-primary" />
                          Répartition financière
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: "Coût achats", value: financierData.resume.coutAchats, fill: COLORS.danger },
                                  { name: "Marge brute", value: financierData.resume.margeBrute, fill: COLORS.success },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={4}
                                dataKey="value"
                              >
                              </Pie>
                              <RechartsTooltip content={<CustomTooltip formatter={formatCurrency} />} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <CreditCard className="h-5 w-5 text-green-600" />
                          Encaissements
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                          <span className="text-muted-foreground">Encaissé</span>
                          <span className="font-bold text-green-600">{formatCurrencyCompact(financierData.encaissements.total)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                          <span className="text-muted-foreground">En attente</span>
                          <span className="font-bold text-orange-600">{formatCurrencyCompact(financierData.encaissements.enAttente)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">Remises</span>
                          <span className="font-bold">{formatCurrencyCompact(financierData.encaissements.remises)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                          Factures
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                          <span className="text-muted-foreground">Nombre</span>
                          <span className="font-bold text-blue-600">{financierData.factures.count}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">Total HT</span>
                          <span className="font-bold">{formatCurrencyCompact(financierData.factures.total - financierData.factures.tva)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">TVA</span>
                          <span className="font-bold">{formatCurrencyCompact(financierData.factures.tva)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Wallet className="h-5 w-5 text-purple-600" />
                          Créances & Avoirs
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                          <span className="text-muted-foreground">Dettes clients</span>
                          <span className="font-bold text-red-600">{formatCurrencyCompact(financierData.dettes.clients)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                          <span className="text-muted-foreground">Avoirs émis</span>
                          <span className="font-bold text-purple-600">{financierData.avoirs.count}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">Total avoirs</span>
                          <span className="font-bold">{formatCurrencyCompact(financierData.avoirs.total)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
