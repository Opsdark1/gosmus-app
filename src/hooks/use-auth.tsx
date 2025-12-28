"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

export type UserProfile = {
  id: string;
  nom: string | null;
  email: string | null;
  role: string;
  actif: boolean;
  essaiFin: string | null;
  telephone?: string | null;
  nomProjet?: string | null;
  adresse?: string | null;
  ville?: string | null;
  pays?: string | null;
  projetUid?: string | null;
  subscriptionType?: string | null;
  subscriptionStart?: string | null;
};

export type Permission = {
  module: string | null;
  action: string | null;
};

export type PermissionsState = {
  isProprietaire: boolean;
  permissions: Permission[];
  roleId: string | null;
  roleName: string | null;
};

export type AuthState = {
  authenticated: boolean;
  status?: "active" | "expired" | "purge";
  emailVerified?: boolean;
  user?: UserProfile;
};

type AuthContextValue = {
  auth: AuthState | null;
  permissions: PermissionsState | null;
  loading: boolean;
  initialized: boolean;
  refresh: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  setAuth: (auth: AuthState | null) => void;
  logout: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
  canAccessModule: (module: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PUBLIC_PATHS = ["/login", "/register", "/reset-password", "/verify-email"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuthState] = useState<AuthState | null>(null);
  const [permissions, setPermissions] = useState<PermissionsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p);
  const isDashboard = pathname?.startsWith("/dashboard");

  const refreshPermissions = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/permissions", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setPermissions(data);
      }
    } catch (error) {
      console.error("Erreur chargement permissions:", error);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();

      if (data.authenticated && data.status === "active") {
        setAuthState(data);
        await refreshPermissions();
        return data;
      } else {
        setAuthState({ authenticated: false });
        setPermissions(null);
        return { authenticated: false };
      }
    } catch {
      setAuthState({ authenticated: false });
      setPermissions(null);
      return { authenticated: false };
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [refreshPermissions]);

  const setAuth = useCallback((newAuth: AuthState | null) => {
    setAuthState(newAuth);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setAuthState({ authenticated: false });
      setPermissions(null);
      router.replace("/login");
    } catch {
      setAuthState({ authenticated: false });
      setPermissions(null);
      router.replace("/login");
    }
  }, [router]);

  const hasPermission = useCallback((module: string, action: string): boolean => {
    if (!permissions) return false;
    
    if (permissions.isProprietaire) return true;
    
    return permissions.permissions.some(
      p => p.module === module && p.action === action
    );
  }, [permissions]);

  const canAccessModule = useCallback((module: string): boolean => {
    if (!permissions) return false;
    
    if (permissions.isProprietaire) return true;
    
    return permissions.permissions.some(
      p => p.module === module && p.action === "voir"
    );
  }, [permissions]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (auth?.authenticated && !permissions?.isProprietaire) {
      const interval = setInterval(refreshPermissions, 30000);
      return () => clearInterval(interval);
    }
  }, [auth?.authenticated, permissions?.isProprietaire, refreshPermissions]);

  useEffect(() => {
    if (!initialized) return;

    const isAuthenticated = auth?.authenticated && auth?.status === "active";

    if (isAuthenticated && isPublicPath) {
      router.replace("/dashboard");
    } else if (!isAuthenticated && isDashboard) {
      router.replace("/login");
    }
  }, [auth, initialized, isPublicPath, isDashboard, router]);

  const shouldRenderChildren = () => {
    if (!initialized) return false;
    
    const isAuthenticated = auth?.authenticated && auth?.status === "active";
    
    if (isPublicPath && isAuthenticated) return false;
    if (isDashboard && !isAuthenticated) return false;
    
    return true;
  };

  if (!shouldRenderChildren()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      auth, 
      permissions,
      loading, 
      initialized, 
      refresh, 
      refreshPermissions,
      setAuth, 
      logout,
      hasPermission,
      canAccessModule,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}
