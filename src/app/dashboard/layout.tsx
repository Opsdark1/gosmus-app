"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { PropsWithChildren, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  ClipboardList,
  Users,
  Truck,
  FileText,
  Shield,
  Settings,
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  Check,
  Receipt,
  ShoppingBag,
  ReceiptText,
  History,
  BarChart3,
  Building2,
  ArrowLeftRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  Loader2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDate, TRIAL_DAYS, SUBSCRIPTION_TYPES, APP_NAME } from "@/lib/constants";
import { AlertTriangle, PackageX, Bell } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NotificationItem {
  id: string;
  type: string;
  titre: string;
  message: string;
  priorite: string;
  module: string | null;
  entiteNom: string | null;
  lienAction: string | null;
  createdAt: string;
  lu: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return formatDate(date);
}

const nav = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { type: "separator", label: "Opérations" },
  { href: "/dashboard/vendre", label: "Vendre", icon: ShoppingCart, highlight: true, module: "ventes" },
  { href: "/dashboard/commander", label: "Commander", icon: ShoppingBag, highlight: true, module: "commandes" },
  { type: "separator", label: "Catalogue" },
  { href: "/dashboard/produits", label: "Produits", icon: Package, module: "produits" },
  { href: "/dashboard/inventaire", label: "Inventaire", icon: Warehouse, module: "stocks" },
  { href: "/dashboard/expirations", label: "Expirations", icon: AlertTriangle, module: "stocks" },
  { href: "/dashboard/stock-bas", label: "Stock bas", icon: PackageX, module: "stocks" },
  { type: "separator", label: "Confrères" },
  { href: "/dashboard/etablissements", label: "Partenaires", icon: Building2, module: "etablissements" },
  { href: "/dashboard/confreres", label: "Échanges", icon: ArrowLeftRight, module: "confreres" },
  { href: "/dashboard/historique-general", label: "Journal confrères", icon: History, module: "confreres" },
  { type: "separator", label: "Historique" },
  { href: "/dashboard/historique-inventaire", label: "Historique inventaire", icon: History, module: "stocks" },
  { href: "/dashboard/tickets", label: "Tickets de caisse", icon: Receipt, module: "ventes" },
  { href: "/dashboard/ventes", label: "Ventes", icon: Receipt, module: "ventes" },
  { href: "/dashboard/commandes", label: "Commandes", icon: ClipboardList, module: "commandes" },
  { type: "separator", label: "Partenaires" },
  { href: "/dashboard/clients", label: "Clients", icon: Users, module: "clients" },
  { href: "/dashboard/fournisseurs", label: "Fournisseurs", icon: Truck, module: "fournisseurs" },
  { href: "/dashboard/factures", label: "Factures", icon: FileText, module: "factures" },
  { href: "/dashboard/avoirs", label: "Avoirs", icon: ReceiptText, module: "avoirs" },
  { type: "separator", label: "Analyse" },
  { href: "/dashboard/rapports", label: "Rapports", icon: BarChart3, module: "rapports" },
  { type: "separator", label: "Équipe", ownerOnly: true },
  { href: "/dashboard/employes", label: "Employés", icon: Users, ownerOnly: true },
  { href: "/dashboard/roles", label: "Rôles", icon: Shield, ownerOnly: true },
];

const profileSchema = z.object({
  nom: z.string().min(2, "Nom requis"),
  telephone: z.string().optional(),
  nomProjet: z.string().min(2, "Nom requis"),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const themes = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
];

function SettingsDialog({ onLogout }: { onLogout: () => void }) {
  const { auth, setAuth, refresh } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "appearance" | "notifications">("profile");
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const notificationsFetchedRef = useRef(false);

  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingNotifications(true);
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setNotificationsLoaded(true);
      }
    } catch (error) {
      console.error("Erreur chargement notifications:", error);
    } finally {
      if (showLoading) setLoadingNotifications(false);
    }
  }, []);

  const userId = auth?.user?.id;

  useEffect(() => {
    if (!userId || notificationsFetchedRef.current) return;
    
    notificationsFetchedRef.current = true;
    fetchNotifications();
    
    const interval = setInterval(() => fetchNotifications(), 30000);
    return () => {
      clearInterval(interval);
      notificationsFetchedRef.current = false;
    };
  }, [userId, fetchNotifications]);

  useEffect(() => {
    if (open && activeTab === "notifications" && !notificationsLoaded) {
      fetchNotifications(true);
    }
  }, [open, activeTab, notificationsLoaded, fetchNotifications]);

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notificationIds }),
      });
      setNotifications((prev) =>
        prev.map((n) =>
          notificationIds.includes(n.id) ? { ...n, lu: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - notificationIds.length));
    } catch (error) {
      console.error("Erreur marquage notifications:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Erreur marquage notifications:", error);
    }
  };



  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      nom: auth?.user?.nom || "",
      telephone: auth?.user?.telephone || "",
      nomProjet: auth?.user?.nomProjet || "",
      adresse: auth?.user?.adresse || "",
      ville: auth?.user?.ville || "",
      pays: auth?.user?.pays || "Maroc",
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    await saveProfile(values);
  };

  const saveProfile = async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Mise à jour impossible");
        return;
      }
      
      toast.success("Profil mis à jour");
      
      setAuth(data);
      refresh();
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };



  const initials = useMemo(() => {
    const name = auth?.user?.nom || "U";
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  }, [auth?.user?.nom]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent cursor-pointer relative">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-primary-foreground">
            {initials}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{auth?.user?.nom || "Utilisateur"}</p>
            <p className="text-xs text-muted-foreground truncate">{auth?.user?.email}</p>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && <Bell className="h-4 w-4 text-destructive animate-pulse" />}
            <Settings className="h-4 w-4 text-muted-foreground" />
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Paramètres</DialogTitle>
          <DialogDescription>Gérez votre profil et vos préférences</DialogDescription>
        </DialogHeader>

        <div className="flex border-b shrink-0">
          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors cursor-pointer",
              activeTab === "profile"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Profil
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors cursor-pointer relative",
              activeTab === "notifications"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center justify-center gap-1">
              Notifications
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("appearance")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors cursor-pointer",
              activeTab === "appearance"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Apparence
          </button>
        </div>

        <DialogBody>
          {activeTab === "profile" && (
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-lg font-bold text-primary-foreground">
                  {initials}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{auth?.user?.nom || "Utilisateur"}</p>
                  <p className="text-sm text-muted-foreground">{auth?.user?.role === "proprietaire" ? "Propriétaire" : "Employé"}</p>
                  {auth?.user?.subscriptionType ? (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {SUBSCRIPTION_TYPES[auth.user.subscriptionType as keyof typeof SUBSCRIPTION_TYPES]?.label || auth.user.subscriptionType}
                      </span>
                      {auth.user.subscriptionStart && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Expire le {formatDate(new Date(new Date(auth.user.subscriptionStart).getTime() + (SUBSCRIPTION_TYPES[auth.user.subscriptionType as keyof typeof SUBSCRIPTION_TYPES]?.duration || 30) * 24 * 60 * 60 * 1000).toISOString())}
                        </p>
                      )}
                    </div>
                  ) : auth?.user?.essaiFin ? (
                    <p className="text-xs text-primary mt-1">
                      Essai jusqu'au {formatDate(auth.user.essaiFin)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom complet</Label>
                  <Input id="nom" {...form.register("nom")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nomProjet">Pharmacie</Label>
                  <Input id="nomProjet" {...form.register("nomProjet")} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={auth?.user?.email || ""} 
                    disabled 
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pour changer l&apos;email, contactez le support.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone (optionnel)</Label>
                  <Input 
                    id="telephone" 
                    {...form.register("telephone")} 
                    placeholder="0XXXXXXXXX" 
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input id="adresse" {...form.register("adresse")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input id="ville" {...form.register("ville")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pays">Pays</Label>
                  <Input id="pays" {...form.register("pays")} />
                </div>
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </form>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Vos notifications</h4>
                  <p className="text-xs text-muted-foreground">
                    {unreadCount > 0 
                      ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` 
                      : "Aucune notification non lue"
                    }
                  </p>
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Tout marquer comme lu
                  </Button>
                )}
              </div>

              {loadingNotifications ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Aucune notification</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vous serez notifié des alertes importantes ici
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto -mx-2 px-2">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                        notif.lu 
                          ? "bg-background border-border opacity-70" 
                          : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                      )}
                      onClick={() => {
                        if (!notif.lu) markAsRead([notif.id]);
                        if (notif.lienAction) {
                          setOpen(false);
                          window.location.href = notif.lienAction;
                        }
                      }}
                    >
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        notif.priorite === "haute" 
                          ? "bg-destructive/10 text-destructive" 
                          : notif.priorite === "moyenne"
                          ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {notif.type === "stock_bas" && <PackageX className="h-4 w-4" />}
                        {notif.type === "stock_expire" && <AlertTriangle className="h-4 w-4" />}
                        {notif.type === "stock_expire_bientot" && <AlertTriangle className="h-4 w-4" />}
                        {notif.type === "credit_rappel" && <Receipt className="h-4 w-4" />}
                        {notif.type === "trial_reminder" && <Bell className="h-4 w-4" />}
                        {notif.type === "subscription_reminder" && <Bell className="h-4 w-4" />}
                        {notif.type === "echange_recu" && <ArrowLeftRight className="h-4 w-4" />}
                        {notif.type === "contre_offre_recue" && <ArrowLeftRight className="h-4 w-4" />}
                        {notif.type === "echange_termine" && <Check className="h-4 w-4" />}
                        {notif.type === "echange_refuse" && <AlertTriangle className="h-4 w-4" />}
                        {!["stock_bas", "stock_expire", "stock_expire_bientot", "credit_rappel", "trial_reminder", "subscription_reminder", "echange_recu", "contre_offre_recue", "echange_termine", "echange_refuse"].includes(notif.type) && (
                          <Bell className="h-4 w-4" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            "text-sm truncate",
                            notif.lu ? "font-normal" : "font-medium"
                          )}>
                            {notif.titre}
                          </p>
                          {!notif.lu && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {notif.entiteNom && (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                              {notif.entiteNom}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      {notif.lienAction && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Thème</h4>
                <div className="grid grid-cols-3 gap-2">
                  {themes.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors cursor-pointer",
                        theme === t.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <t.icon className={cn("h-5 w-5", theme === t.value ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("text-xs font-medium", theme === t.value ? "text-primary" : "text-muted-foreground")}>
                        {t.label}
                      </span>
                      {theme === t.value && <Check className="h-3 w-3 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Période d'essai</h4>
                <div className="rounded-lg bg-primary/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{TRIAL_DAYS} jours gratuits</p>
                      <p className="text-xs text-muted-foreground">
                        {auth?.user?.essaiFin ? `Expire le ${formatDate(auth.user.essaiFin)}` : "Actif"}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onLogout} className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { auth, logout, permissions, canAccessModule, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const filteredNav = useMemo(() => {
    if (!permissions) return [];
    
    const isOwner = permissions.isProprietaire;
    
    const filteredLinks = nav.filter((item) => {
      if ('type' in item && item.type === "separator") {
        return false;
      }
      
      if ('ownerOnly' in item && item.ownerOnly) {
        return isOwner;
      }
      
      if (!('module' in item) || !item.module) {
        return true;
      }
      
      return canAccessModule(item.module);
    });

    const result: typeof nav = [];
    let currentSeparator: typeof nav[number] | null = null;
    let hasItemsInSection = false;

    for (const item of nav) {
      if ('type' in item && item.type === "separator") {
        if (currentSeparator && hasItemsInSection) {
          result.push(currentSeparator);
        }
        if ('ownerOnly' in item && item.ownerOnly && !isOwner) {
          currentSeparator = null;
        } else {
          currentSeparator = item;
        }
        hasItemsInSection = false;
      } else {
        if (filteredLinks.includes(item)) {
          hasItemsInSection = true;
          if (currentSeparator) {
            result.push(currentSeparator);
            currentSeparator = null;
          }
          result.push(item);
        }
      }
    }

    return result;
  }, [permissions, canAccessModule]);

  const routeToModule: Record<string, string | null> = useMemo(() => ({
    "/dashboard": null,
    "/dashboard/vendre": "ventes",
    "/dashboard/commander": "commandes",
    "/dashboard/produits": "produits",
    "/dashboard/inventaire": "stocks",
    "/dashboard/expirations": "stocks",
    "/dashboard/stock-bas": "stocks",
    "/dashboard/etablissements": "etablissements",
    "/dashboard/confreres": "confreres",
    "/dashboard/transferts": "confreres",
    "/dashboard/historique-inventaire": "stocks",
    "/dashboard/tickets": "ventes",
    "/dashboard/ventes": "ventes",
    "/dashboard/commandes": "commandes",
    "/dashboard/historique-general": "confreres",
    "/dashboard/clients": "clients",
    "/dashboard/fournisseurs": "fournisseurs",
    "/dashboard/factures": "factures",
    "/dashboard/avoirs": "avoirs",
    "/dashboard/rapports": "rapports",
    "/dashboard/employes": null,
    "/dashboard/roles": null,
  }), []);

  const ownerOnlyRoutes = ["/dashboard/employes", "/dashboard/roles"];

  const canAccessCurrentRoute = useMemo(() => {
    if (!permissions) return true;
    
    if (ownerOnlyRoutes.includes(pathname || "")) {
      return permissions.isProprietaire;
    }
    
    const module = routeToModule[pathname || ""];
    
    if (module === null || module === undefined) {
      return true;
    }
    
    return canAccessModule(module);
  }, [permissions, pathname, routeToModule, canAccessModule]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <TooltipProvider>
    <div className="flex min-h-screen bg-muted/30">
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-background",
          "transition-[width,transform] duration-200 ease-out",
          "md:translate-x-0",
          sidebarOpen ? "md:w-64" : "md:w-16",
          mobileMenuOpen ? "translate-x-0 w-[85vw] max-w-80" : "-translate-x-full w-[85vw] max-w-80"
        )}
      >
        <div className={cn(
          "flex h-14 items-center border-b px-4 shrink-0",
          sidebarOpen || mobileMenuOpen ? "justify-between" : "md:justify-center"
        )}>
          <Link href="/dashboard" className={cn(
            "flex items-center gap-2 font-semibold cursor-pointer overflow-hidden",
            !sidebarOpen && !mobileMenuOpen && "md:hidden"
          )}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold shrink-0">
              {APP_NAME.charAt(0)}
            </div>
            <span className={cn(
              "whitespace-nowrap",
              !sidebarOpen && !mobileMenuOpen ? "md:hidden" : ""
            )}>{APP_NAME}</span>
          </Link>
          
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-accent cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "hidden md:flex p-2 rounded-lg hover:bg-accent cursor-pointer shrink-0",
              !sidebarOpen && "w-full justify-center"
            )}
            title={sidebarOpen ? "Réduire le menu" : "Agrandir le menu"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5 text-muted-foreground" />
            ) : (
              <PanelLeft className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-y-auto overflow-x-hidden">
          {filteredNav.map((item, index) => {
            if ('type' in item && item.type === "separator") {
              return (
                <div key={index} className={cn(
                  "pt-4 pb-1 px-3 first:pt-0 overflow-hidden",
                  !sidebarOpen && !mobileMenuOpen && "md:hidden"
                )}>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              );
            }
            
            const isActive = pathname === item.href;
            const highlight = 'highlight' in item && item.highlight;
            
            const linkContent = (
              <Link
                href={item.href!}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer overflow-hidden",
                  !sidebarOpen && !mobileMenuOpen && "md:justify-center md:px-2",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : highlight
                    ? "text-primary hover:bg-primary/10 border border-primary/30"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                <span className={cn(
                  "whitespace-nowrap",
                  !sidebarOpen && !mobileMenuOpen ? "md:hidden" : ""
                )}>{item.label}</span>
                {isActive && (sidebarOpen || mobileMenuOpen) && <ChevronRight className="ml-auto h-4 w-4 shrink-0" />}
              </Link>
            );
            
            if (!sidebarOpen && !mobileMenuOpen) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }
            
            return <div key={item.href}>{linkContent}</div>;
          })}
        </nav>

        <div className="border-t p-3 shrink-0">
          {sidebarOpen || mobileMenuOpen ? (
            <SettingsDialog onLogout={logout} />
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="flex w-full items-center justify-center p-2 rounded-lg hover:bg-accent cursor-pointer"
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Paramètres
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>

      <main className={cn(
        "flex-1 overflow-x-hidden transition-[padding] duration-200 ease-out",
        sidebarOpen ? "md:pl-64" : "md:pl-16",
        "pl-0"
      )}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">{APP_NAME}</span>
        </header>

        {!canAccessCurrentRoute ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] p-6 text-center">
            <div className="rounded-full bg-destructive/10 p-6 mb-4">
              <Shield className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Accès refusé</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
              Contactez votre administrateur si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
            </p>
            <Link href="/dashboard">
              <Button>Retour au tableau de bord</Button>
            </Link>
          </div>
        ) : (
          <div className="p-4 md:p-6">
            {children}
          </div>
        )}
      </main>
    </div>
    </TooltipProvider>
  );
}
