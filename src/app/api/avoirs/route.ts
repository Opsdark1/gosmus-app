import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getProjetUid } from "@/lib/api-auth";

function generateReference(prefix: string = "AV"): string {
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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const statut = searchParams.get("statut") || "";
    const clientId = searchParams.get("clientId") || "";
    const fournisseurId = searchParams.get("fournisseurId") || "";
    const type = searchParams.get("type") || "";
    const contexte = searchParams.get("contexte") || "";

    const avoirs = await prisma.avoir.findMany({
      where: {
        projetUid: getProjetUid(auth),
        actif: true,
        ...(search && {
          OR: [
            { reference: { contains: search, mode: "insensitive" } },
            { client: { nom: { contains: search, mode: "insensitive" } } },
            { fournisseur: { nom: { contains: search, mode: "insensitive" } } },
          ],
        }),
        ...(statut && { statut }),
        ...(clientId && { clientId }),
        ...(fournisseurId && { fournisseurId }),
        ...(type && { type }),
        ...(contexte === "client" && { clientId: { not: null } }),
        ...(contexte === "fournisseur" && { fournisseurId: { not: null } }),
      },
      include: {
        client: { select: { id: true, nom: true, prenom: true } },
        fournisseur: { select: { id: true, nom: true } },
        vente: { select: { id: true, reference: true } },
        commande: { select: { id: true, reference: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ avoirs });
  } catch (error) {
    console.error("Erreur GET /api/avoirs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { clientId, fournisseurId, venteId, commandeId, montant, motif, type, dateValidite } = body;

    if (!montant || montant <= 0) {
      return NextResponse.json(
        { error: "Montant requis et doit être positif" },
        { status: 400 }
      );
    }

    if (!type || !["retour_produit", "remboursement", "credit_commercial"].includes(type)) {
      return NextResponse.json(
        { error: "Type d'avoir invalide" },
        { status: 400 }
      );
    }

    if (!clientId && !fournisseurId) {
      return NextResponse.json(
        { error: "Un client ou un fournisseur est requis" },
        { status: 400 }
      );
    }

    if (clientId) {
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          projetUid: getProjetUid(auth),
          actif: true,
        },
      });
      if (!client) {
        return NextResponse.json({ error: "Client non trouvé" }, { status: 404 });
      }
    }

    if (fournisseurId) {
      const fournisseur = await prisma.fournisseur.findFirst({
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

    if (venteId) {
      const vente = await prisma.vente.findFirst({
        where: {
          id: venteId,
          projetUid: getProjetUid(auth),
          actif: true,
        },
      });
      if (!vente) {
        return NextResponse.json({ error: "Vente non trouvée" }, { status: 404 });
      }
    }

    if (commandeId) {
      const commande = await prisma.commande.findFirst({
        where: {
          id: commandeId,
          projetUid: getProjetUid(auth),
          actif: true,
        },
      });
      if (!commande) {
        return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 });
      }
    }

    const prefix = fournisseurId ? "AVF" : "AVC";

    const avoir = await prisma.avoir.create({
      data: {
        projetUid: getProjetUid(auth),
        clientId: clientId || null,
        fournisseurId: fournisseurId || null,
        venteId: venteId || null,
        commandeId: commandeId || null,
        reference: generateReference(prefix),
        montant,
        motif: motif || null,
        type,
        statut: "en_attente",
        dateValidite: dateValidite ? new Date(dateValidite) : null,
        creePar: auth.user.firebaseUid,
      },
      include: {
        client: { select: { id: true, nom: true } },
        fournisseur: { select: { id: true, nom: true } },
        vente: { select: { id: true, reference: true } },
        commande: { select: { id: true, reference: true } },
      },
    });

    return NextResponse.json({ avoir }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/avoirs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { id, statut, motif } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.avoir.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Avoir non trouvé" }, { status: 404 });
    }

    if (statut && !["en_attente", "valide", "utilise", "annule"].includes(statut)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    if (statut === "valide" && existing.statut === "en_attente" && existing.clientId) {
      await prisma.client.update({
        where: { id: existing.clientId },
        data: {
          credit: { increment: Number(existing.montant) },
          modifiePar: auth.user.firebaseUid,
        },
      });
    }

    if (statut === "utilise" && existing.statut === "valide" && existing.clientId) {
      await prisma.client.update({
        where: { id: existing.clientId },
        data: {
          credit: { decrement: Number(existing.montant) },
          modifiePar: auth.user.firebaseUid,
        },
      });
    }

    const avoir = await prisma.avoir.update({
      where: { id },
      data: {
        statut: statut || existing.statut,
        motif: motif ?? existing.motif,
        modifiePar: auth.user.firebaseUid,
      },
      include: {
        client: { select: { id: true, nom: true } },
        fournisseur: { select: { id: true, nom: true } },
        vente: { select: { id: true, reference: true } },
        commande: { select: { id: true, reference: true } },
      },
    });

    return NextResponse.json({ avoir });
  } catch (error) {
    console.error("Erreur PUT /api/avoirs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.avoir.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Avoir non trouvé" }, { status: 404 });
    }

    await prisma.avoir.update({
      where: { id },
      data: {
        actif: false,
        modifiePar: auth.user.firebaseUid,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/avoirs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
