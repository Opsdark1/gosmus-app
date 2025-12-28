"use client";

import { useState } from "react";
import { toast } from "sonner";
import { firebaseAuth } from "@/lib/firebase-client";
import { sendEmailVerification } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { formatDate, formatCurrency, TRIAL_DAYS } from "@/lib/constants";
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Mail,
  X,
} from "lucide-react";
import Link from "next/link";

const stats = [
  {
    label: "Produits",
    value: "0",
    change: "+0%",
    trend: "up",
    icon: Package,
    href: "/dashboard/produits",
  },
  {
    label: "Ventes du jour",
    value: formatCurrency(0),
    change: "+0%",
    trend: "up",
    icon: ShoppingCart,
    href: "/dashboard/ventes",
  },
  {
    label: "Clients",
    value: "0",
    change: "+0%",
    trend: "up",
    icon: Users,
    href: "/dashboard/clients",
  },
  {
    label: "Chiffre d'affaires",
    value: formatCurrency(0),
    change: "+0%",
    trend: "up",
    icon: TrendingUp,
    href: "/dashboard/factures",
  },
];

const quickActions = [
  { label: "Nouvelle vente", href: "/dashboard/ventes", color: "bg-blue-500" },
  { label: "Ajouter produit", href: "/dashboard/produits", color: "bg-green-500" },
  { label: "Nouveau client", href: "/dashboard/clients", color: "bg-purple-500" },
  { label: "Commander stock", href: "/dashboard/commandes", color: "bg-orange-500" },
];

export default function DashboardPage() {
  const { auth } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const handleResendEmail = async () => {
    const user = firebaseAuth.currentUser;
    if (!user) {
      toast.error("Session introuvable");
      return;
    }
    try {
      await sendEmailVerification(user, { url: `${window.location.origin}/verify-email` });
      toast.success("Email de vérification envoyé");
    } catch {
      toast.error("Erreur lors de l'envoi");
    }
  };

  if (!auth?.user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Bonjour, {auth.user.nom?.split(" ")[0] || "Utilisateur"}</h1>
        <p className="text-muted-foreground">
          Bienvenue sur votre tableau de bord {auth.user.nomProjet ? `— ${auth.user.nomProjet}` : ""}
        </p>
      </div>

      {!auth.emailVerified && !dismissed && (
        <div className="flex items-center gap-4 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900 shrink-0">
              <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-amber-900 dark:text-amber-100">Vérifiez votre email</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Confirmez votre adresse pour sécuriser votre compte
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={handleResendEmail} className="cursor-pointer">
                Renvoyer
              </Button>
              <button onClick={() => setDismissed(true)} className="p-1 hover:bg-amber-200 rounded dark:hover:bg-amber-800 cursor-pointer">
                <X className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </button>
            </div>
        </div>
      )}

      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card transition-all hover:shadow-md hover:border-primary/20 cursor-pointer sm:flex-col sm:items-start sm:gap-0">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 sm:mt-3">
                  <div className="flex items-center gap-2">
                    <p className="text-lg sm:text-2xl font-semibold truncate">{stat.value}</p>
                    <span className={`hidden sm:flex items-center gap-1 text-xs font-medium ${stat.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                      {stat.change}
                      {stat.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.label}</p>
                </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border bg-card p-4 sm:p-5">
            <h3 className="font-semibold mb-4">Actions rapides</h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href}>
                  <div className="flex items-center gap-3 rounded-lg border p-3 sm:p-4 transition-all hover:shadow-sm hover:border-primary/20 cursor-pointer">
                    <div className={`h-2 w-2 rounded-full ${action.color} shrink-0`} />
                    <span className="text-xs sm:text-sm font-medium truncate">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-5">
            <h3 className="font-semibold mb-4">Informations compte</h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-xs sm:text-sm text-muted-foreground">Rôle</span>
                <span className="text-xs sm:text-sm font-medium capitalize">{auth.user.role === "proprietaire" ? "Propriétaire" : auth.user.role}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-xs sm:text-sm text-muted-foreground">Statut</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs sm:text-sm font-medium">Actif</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs sm:text-sm text-muted-foreground">Essai ({TRIAL_DAYS}j)</span>
                <span className="text-xs sm:text-sm font-medium">{formatDate(auth.user.essaiFin)}</span>
              </div>
            </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-foreground">Aucune alerte</p>
              <p className="text-xs sm:text-sm truncate">Votre inventaire est à jour. Aucun produit en rupture de stock.</p>
            </div>
          </div>
      </div>
    </div>
  );
}
