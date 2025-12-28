import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getProjetUid, checkPermission } from "@/lib/api-auth";

function generateReference(prefix: string = "CMD"): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${year}${month}${day}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "commandes", "voir");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const statut = searchParams.get("statut") || "";
    const fournisseurId = searchParams.get("fournisseurId") || "";

    const commandes = await prisma.commande.findMany({
      where: {
        projetUid: getProjetUid(auth),
        actif: true,
        ...(search && {
          OR: [
            { reference: { contains: search, mode: "insensitive" } },
            { fournisseur: { nom: { contains: search, mode: "insensitive" } } },
          ],
        }),
        ...(statut && { statut }),
        ...(fournisseurId && { fournisseurId }),
      },
      include: {
        fournisseur: { select: { id: true, nom: true } },
        lignes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ commandes });
  } catch (error) {
    console.error("Erreur GET /api/commandes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "commandes", "creer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await req.json();
    const { fournisseurId, lignes, dateLivraison, fraisLivraison, note } = body;

    if (!lignes || lignes.length === 0) {
      return NextResponse.json(
        { error: "Au moins une ligne de commande requise" },
        { status: 400 }
      );
    }

    let fournisseur = null;
    if (fournisseurId) {
      fournisseur = await prisma.fournisseur.findFirst({
        where: {
          id: fournisseurId,
          projetUid: getProjetUid(auth),
          actif: true,
        },
      });

      if (!fournisseur) {
        return NextResponse.json({ error: "Fournisseur non trouvé" }, { status: 404 });
      }
    }

    let sousTotal = 0;
    const lignesData: {
      produitNom: string;
      quantite: number;
      prixUnit: number;
      total: number;
    }[] = [];

    for (const ligne of lignes) {
      const ligneTotal = ligne.quantite * ligne.prixUnit;
      sousTotal += ligneTotal;

      lignesData.push({
        produitNom: ligne.produitNom,
        quantite: ligne.quantite,
        prixUnit: ligne.prixUnit,
        total: ligneTotal,
      });
    }

    const frais = fraisLivraison || 0;
    const total = sousTotal + frais;

    const creePar = auth.user.nom 
      ? `${auth.user.nom} (${auth.user.email || ""})`
      : auth.user.email || auth.user.firebaseUid;

    const commande = await prisma.commande.create({
      data: {
        projetUid: getProjetUid(auth),
        fournisseurId: fournisseurId || null,
        reference: generateReference("CMD"),
        sousTotal,
        fraisLivraison: frais,
        total,
        statut: "en_attente",
        dateLivraison: dateLivraison ? new Date(dateLivraison) : null,
        note: note || null,
        creePar,
        lignes: {
          create: lignesData,
        },
      },
      include: {
        fournisseur: { select: { id: true, nom: true } },
        lignes: true,
      },
    });

    return NextResponse.json({ commande }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/commandes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "commandes", "modifier");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await req.json();
    const { id, statut, dateLivraison, note } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.commande.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
      include: {
        lignes: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 });
    }

    const statutsValides = ["en_attente", "confirmee", "livree", "annulee"];
    if (statut && !statutsValides.includes(statut)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const commande = await prisma.commande.update({
      where: { id },
      data: {
        statut: statut || existing.statut,
        dateLivraison: dateLivraison ? new Date(dateLivraison) : existing.dateLivraison,
        note: note !== undefined ? note : existing.note,
        modifiePar: auth.user.firebaseUid,
      },
      include: {
        fournisseur: { select: { id: true, nom: true } },
        lignes: true,
      },
    });

    return NextResponse.json({ commande });
  } catch (error) {
    console.error("Erreur PUT /api/commandes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "commandes", "supprimer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.commande.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 });
    }

    if (existing.statut === "livree") {
      return NextResponse.json(
        { error: "Impossible de supprimer une commande déjà livrée" },
        { status: 400 }
      );
    }

    await prisma.commande.update({
      where: { id },
      data: {
        actif: false,
        statut: "annulee",
        modifiePar: auth.user.firebaseUid,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/commandes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
