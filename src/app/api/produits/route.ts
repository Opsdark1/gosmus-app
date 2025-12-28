import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getProjetUid, checkPermission } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "produits", "voir");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const categorie = searchParams.get("categorie") || "";

    const produits = await prisma.produit.findMany({
      where: {
        projetUid: getProjetUid(auth),
        actif: true,
        ...(search && {
          OR: [
            { nom: { contains: search, mode: "insensitive" } },
            { codeBarre: { contains: search, mode: "insensitive" } },
          ],
        }),
        ...(type && { type }),
        ...(categorie && { categorieId: categorie }),
      },
      include: {
        categorie: { select: { id: true, nom: true } },
        stocks: {
          where: { actif: true },
          select: { id: true, prixVente: true, quantiteDisponible: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ produits });
  } catch (error) {
    console.error("Erreur GET /api/produits:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "produits", "creer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await req.json();
    const { nom, codeBarre, categorieId, type, sousType, description } = body;

    if (!nom) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    if (codeBarre) {
      const existing = await prisma.produit.findFirst({
        where: {
          projetUid: getProjetUid(auth),
          codeBarre,
          actif: true,
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Un produit avec ce code-barres existe déjà" },
          { status: 400 }
        );
      }
    }

    const produit = await prisma.produit.create({
      data: {
        projetUid: getProjetUid(auth),
        nom,
        codeBarre: codeBarre || null,
        categorieId: categorieId || null,
        type: type || null,
        sousType: sousType || null,
        description: description || null,
        creePar: auth.user.firebaseUid,
      },
      include: {
        categorie: { select: { id: true, nom: true } },
      },
    });

    return NextResponse.json({ produit }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/produits:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "produits", "modifier");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await req.json();
    const { id, nom, codeBarre, categorieId, type, sousType, description } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.produit.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    if (codeBarre && codeBarre !== existing.codeBarre) {
      const duplicate = await prisma.produit.findFirst({
        where: {
          projetUid: getProjetUid(auth),
          codeBarre,
          actif: true,
          NOT: { id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Un produit avec ce code-barres existe déjà" },
          { status: 400 }
        );
      }
    }

    const produit = await prisma.produit.update({
      where: { id },
      data: {
        nom: nom || existing.nom,
        codeBarre: codeBarre ?? existing.codeBarre,
        categorieId: categorieId ?? existing.categorieId,
        type: type ?? existing.type,
        sousType: sousType ?? existing.sousType,
        description: description ?? existing.description,
        modifiePar: auth.user.firebaseUid,
      },
      include: {
        categorie: { select: { id: true, nom: true } },
      },
    });

    return NextResponse.json({ produit });
  } catch (error) {
    console.error("Erreur PUT /api/produits:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "produits", "supprimer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.produit.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    await prisma.produit.update({
      where: { id },
      data: {
        actif: false,
        modifiePar: auth.user.firebaseUid,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/produits:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
