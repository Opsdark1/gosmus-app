import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSessionFromCookie, verifySessionCookie, getTrialStatus } from "@/lib/auth-utils";
import { SUBSCRIPTION_TYPES } from "@/lib/constants";

const profileSchema = z.object({
  nom: z.string().min(2, "Nom requis"),
  telephone: z.string().optional(),
  nomProjet: z.string().min(2, "Nom de pharmacie requis"),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const sessionCookie = getSessionFromCookie(req.headers.get("cookie") || "");
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const decoded = await verifySessionCookie(sessionCookie);
    if (!decoded?.uid) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const user = await prisma.utilisateur.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const status = getTrialStatus(user.essaiFin, user.supprimerApres);

    return NextResponse.json({
      authenticated: true,
      status,
      emailVerified: user.emailVerifie,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        actif: user.actif,
        essaiFin: user.essaiFin,
        telephone: user.telephone,
        nomProjet: user.nomProjet,
        adresse: user.adresse,
        ville: user.ville,
        pays: user.pays,
        subscriptionType: user.subscriptionType,
        subscriptionStart: user.subscriptionStart,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const sessionCookie = getSessionFromCookie(req.headers.get("cookie") || "");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const decoded = await verifySessionCookie(sessionCookie);
    if (!decoded?.uid) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const existingUser = await prisma.utilisateur.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const user = await prisma.utilisateur.update({
      where: { firebaseUid: decoded.uid },
      data: {
        nom: parsed.data.nom,
        telephone: parsed.data.telephone || null,
        nomProjet: parsed.data.nomProjet,
        adresse: parsed.data.adresse || null,
        ville: parsed.data.ville || null,
        pays: parsed.data.pays || null,
        updatedAt: new Date(),
      },
    });

    if (parsed.data.nom !== existingUser.nom) {
      try {
        await adminAuth.updateUser(decoded.uid, {
          displayName: parsed.data.nom,
        });
      } catch (e) {
        console.error("Erreur mise à jour nom Firebase:", e);
      }
    }

    const status = getTrialStatus(user.essaiFin, user.supprimerApres);

    return NextResponse.json({
      authenticated: true,
      status,
      emailVerified: user.emailVerifie,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        actif: user.actif,
        essaiFin: user.essaiFin,
        telephone: user.telephone,
        nomProjet: user.nomProjet,
        adresse: user.adresse,
        ville: user.ville,
        pays: user.pays,
        subscriptionType: user.subscriptionType,
        subscriptionStart: user.subscriptionStart,
      },
    });
  } catch (error) {
    console.error("Erreur mise à jour profil:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
