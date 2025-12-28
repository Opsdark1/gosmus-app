import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getProjetUid } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const categories = await prisma.categorie.findMany({
      where: {
        projetUid: getProjetUid(auth),
        actif: true,
        ...(search && {
          OR: [
            { nom: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        _count: { select: { produits: true } },
      },
      orderBy: { nom: "asc" },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Erreur GET /api/categories:", error);
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
    const { nom, description } = body;

    if (!nom || nom.trim() === "") {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const existing = await prisma.categorie.findFirst({
      where: {
        projetUid: getProjetUid(auth),
        nom: { equals: nom, mode: "insensitive" },
        actif: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Une catégorie avec ce nom existe déjà" },
        { status: 400 }
      );
    }

    const categorie = await prisma.categorie.create({
      data: {
        projetUid: getProjetUid(auth),
        nom: nom.trim(),
        description: description?.trim() || null,
        creePar: auth.user.firebaseUid,
      },
    });

    return NextResponse.json({ categorie }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/categories:", error);
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
    const { id, nom, description } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.categorie.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Catégorie non trouvée" }, { status: 404 });
    }

    if (nom && nom !== existing.nom) {
      const duplicate = await prisma.categorie.findFirst({
        where: {
          projetUid: getProjetUid(auth),
          nom: { equals: nom, mode: "insensitive" },
          actif: true,
          NOT: { id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Une catégorie avec ce nom existe déjà" },
          { status: 400 }
        );
      }
    }

    const categorie = await prisma.categorie.update({
      where: { id },
      data: {
        nom: nom?.trim() ?? existing.nom,
        description: description !== undefined ? description?.trim() || null : existing.description,
        modifiePar: auth.user.firebaseUid,
      },
    });

    return NextResponse.json({ categorie });
  } catch (error) {
    console.error("Erreur PUT /api/categories:", error);
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

    const existing = await prisma.categorie.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
      include: { _count: { select: { produits: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Catégorie non trouvée" }, { status: 404 });
    }

    if (existing._count.produits > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer: ${existing._count.produits} produit(s) associé(s)` },
        { status: 400 }
      );
    }

    await prisma.categorie.update({
      where: { id },
      data: {
        actif: false,
        modifiePar: auth.user.firebaseUid,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/categories:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
