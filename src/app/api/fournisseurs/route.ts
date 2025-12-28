import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getProjetUid, checkPermission } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "fournisseurs", "voir");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const fournisseurs = await prisma.fournisseur.findMany({
      where: {
        projetUid: getProjetUid(auth),
        actif: true,
        ...(search && {
          OR: [
            { nom: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { telephone: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        _count: { select: { stocks: true, commandes: true } },
      },
      orderBy: { nom: "asc" },
    });

    return NextResponse.json({ fournisseurs });
  } catch (error) {
    console.error("Erreur GET /api/fournisseurs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "fournisseurs", "creer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await req.json();
    const { nom, telephone, email, adresse, ville, ice } = body;

    if (!nom) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const existing = await prisma.fournisseur.findFirst({
      where: {
        projetUid: getProjetUid(auth),
        nom: { equals: nom.trim(), mode: "insensitive" },
        actif: true,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Un fournisseur avec ce nom existe déjà" }, { status: 400 });
    }

    const fournisseur = await prisma.fournisseur.create({
      data: {
        projetUid: getProjetUid(auth),
        nom,
        telephone: telephone || null,
        email: email || null,
        adresse: adresse || null,
        ville: ville || null,
        ice: ice || null,
        creePar: auth.user.firebaseUid,
      },
    });

    return NextResponse.json({ fournisseur }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/fournisseurs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "fournisseurs", "modifier");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await req.json();
    const { id, nom, telephone, email, adresse, ville, ice } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.fournisseur.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Fournisseur non trouvé" }, { status: 404 });
    }

    const fournisseur = await prisma.fournisseur.update({
      where: { id },
      data: {
        nom: nom || existing.nom,
        telephone: telephone ?? existing.telephone,
        email: email ?? existing.email,
        adresse: adresse ?? existing.adresse,
        ville: ville ?? existing.ville,
        ice: ice ?? existing.ice,
        modifiePar: auth.user.firebaseUid,
      },
    });

    return NextResponse.json({ fournisseur });
  } catch (error) {
    console.error("Erreur PUT /api/fournisseurs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "fournisseurs", "supprimer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.fournisseur.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Fournisseur non trouvé" }, { status: 404 });
    }

    await prisma.fournisseur.update({
      where: { id },
      data: {
        actif: false,
        modifiePar: auth.user.firebaseUid,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/fournisseurs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
