import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { getSessionFromCookie, verifySessionCookie, getTrialStatus, type TrialStatus } from "./auth-utils";

export type AuthResult = 
  | { user: AuthenticatedUser; employe?: EmployeInfo }
  | { error: string; status: number };

export interface AuthenticatedUser {
  id: string;
  firebaseUid: string;
  email: string | null;
  nom: string | null;
  telephone: string | null;
  role: string;
  isProprietaire: boolean;
  actif: boolean;
  essaiFin: Date | null;
  supprimerApres: Date | null;
  subscriptionStatus: string | null;
}

export interface EmployeInfo {
  id: string;
  projetUid: string;
  roleId: string | null;
  roleName: string | null;
  proprietaireUid: string;
}

export async function getAuthenticatedUser(
  req: NextRequest,
  options: {
    requireProprietaire?: boolean;
    requireActive?: boolean;
    checkTrialStatus?: boolean;
  } = {}
): Promise<AuthResult> {
  const { 
    requireProprietaire = false, 
    requireActive = true,
    checkTrialStatus = true 
  } = options;

  try {
    const cookie = req.headers.get("cookie") || "";
    const sessionCookie = getSessionFromCookie(cookie);
    
    if (!sessionCookie) {
      return { error: "Non authentifié", status: 401 };
    }

    const decoded = await verifySessionCookie(sessionCookie);
    if (!decoded?.uid) {
      return { error: "Session invalide", status: 401 };
    }

    const user = await prisma.utilisateur.findUnique({
      where: { firebaseUid: decoded.uid },
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        nom: true,
        telephone: true,
        role: true,
        isProprietaire: true,
        actif: true,
        essaiFin: true,
        supprimerApres: true,
        subscriptionStatus: true,
      },
    });

    if (!user) {
      return { error: "Utilisateur non trouvé", status: 404 };
    }

    if (requireActive && !user.actif) {
      return { error: "Compte désactivé", status: 403 };
    }

    if (checkTrialStatus && user.isProprietaire) {
      const status = getTrialStatus(user.essaiFin, user.supprimerApres);
      
      if (status === "purge") {
        return { error: "Compte supprimé", status: 410 };
      }
      
      if (status === "expired" && user.subscriptionStatus !== "active") {
        return { error: "Période d'essai expirée", status: 403 };
      }
    }

    if (requireProprietaire && !user.isProprietaire) {
      return { error: "Accès réservé au propriétaire", status: 403 };
    }

    if (!user.isProprietaire && user.role === "employe") {
      const employe = await prisma.employe.findUnique({
        where: { firebaseUid: decoded.uid },
        include: {
          proprietaire: {
            select: {
              firebaseUid: true,
              actif: true,
              essaiFin: true,
              supprimerApres: true,
              subscriptionStatus: true,
            },
          },
          role: { select: { id: true, nom: true } },
        },
      });

      if (!employe) {
        return { error: "Compte employé introuvable", status: 404 };
      }

      if (!employe.actif) {
        return { error: "Compte employé désactivé", status: 403 };
      }

      const proprietaire = employe.proprietaire;
      if (!proprietaire || !proprietaire.actif) {
        return { error: "Le compte du propriétaire est inactif", status: 403 };
      }

      const ownerStatus = getTrialStatus(proprietaire.essaiFin, proprietaire.supprimerApres);
      if (ownerStatus === "expired" && proprietaire.subscriptionStatus !== "active") {
        return { error: "L'abonnement du propriétaire a expiré", status: 403 };
      }
      if (ownerStatus === "purge") {
        return { error: "Le compte du propriétaire a été supprimé", status: 410 };
      }

      return {
        user: user as AuthenticatedUser,
        employe: {
          id: employe.id,
          projetUid: employe.projetUid,
          roleId: employe.roleId,
          roleName: employe.role?.nom ?? null,
          proprietaireUid: proprietaire.firebaseUid,
        },
      };
    }

    return { user: user as AuthenticatedUser };
  } catch (error) {
    console.error("Erreur authentification:", error);
    return { error: "Erreur d'authentification", status: 500 };
  }
}

export function getProjetUid(auth: { user: AuthenticatedUser; employe?: EmployeInfo }): string {
  if (auth.employe) {
    return auth.employe.projetUid;
  }
  return auth.user.firebaseUid;
}

export async function hasPermission(
  auth: { user: AuthenticatedUser; employe?: EmployeInfo },
  module: string,
  action: string
): Promise<boolean> {
  if (auth.user.isProprietaire) {
    return true;
  }

  if (auth.employe?.roleId) {
    const permission = await prisma.permission.findFirst({
      where: {
        roleId: auth.employe.roleId,
        module,
        action,
      },
    });
    return !!permission;
  }

  return false;
}

export async function checkPermission(
  auth: { user: AuthenticatedUser; employe?: EmployeInfo },
  module: string,
  action: string
): Promise<{ error: string; status: number } | null> {
  const allowed = await hasPermission(auth, module, action);
  if (!allowed) {
    return { error: `Permission refusée: ${action} ${module}`, status: 403 };
  }
  return null;
}
