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
    const action = searchParams.get("action") || "";
    const stockId = searchParams.get("stockId") || "";
    const dateDebut = searchParams.get("dateDebut") || "";
    const dateFin = searchParams.get("dateFin") || "";
    const limit = parseInt(searchParams.get("limit") || "500");

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (dateDebut) {
      dateFilter.gte = new Date(dateDebut);
    }
    if (dateFin) {
      const endDate = new Date(dateFin);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.lte = endDate;
    }

    const historiques = await prisma.historiqueInventaire.findMany({
      where: {
        projetUid: getProjetUid(auth),
        ...(action && { action }),
        ...(stockId && { stockId }),
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        ...(search && {
          OR: [
            { motif: { contains: search, mode: "insensitive" } },
            { utilisateurNom: { contains: search, mode: "insensitive" } },
            { stock: { produit: { nom: { contains: search, mode: "insensitive" } } } },
            { stock: { numeroLot: { contains: search, mode: "insensitive" } } },
          ],
        }),
      },
      include: {
        stock: {
          include: {
            produit: { select: { id: true, nom: true, codeBarre: true } },
            fournisseur: { select: { id: true, nom: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ historiques });
  } catch (error) {
    console.error("Erreur GET /api/historique-inventaire:", error);
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
    const { stockId, action, quantite, motif } = body;

    if (!stockId || !action) {
      return NextResponse.json(
        { error: "stockId et action sont requis" },
        { status: 400 }
      );
    }

    const actionsValides = [
      "entree_stock",
      "sortie_stock",
      "ajustement_quantite",
      "retour_produit",
      "modification_prix_achat",
      "modification_prix_vente",
      "modification_seuil_alerte",
      "modification_date_expiration",
      "vente",
      "commande_recue",
      "correction_inventaire",
      "perte",
      "casse",
    ];

    if (!actionsValides.includes(action)) {
      return NextResponse.json(
        { error: "Action invalide" },
        { status: 400 }
      );
    }

    const stock = await prisma.stock.findFirst({
      where: {
        id: stockId,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!stock) {
      return NextResponse.json({ error: "Stock non trouvé" }, { status: 404 });
    }

    const utilisateurNom = auth.user.nom || auth.user.email || "Utilisateur";
    const utilisateurEmail = auth.user.email;

    let nouvelleQuantite = stock.quantiteDisponible;
    
    if (action === "entree_stock" || action === "retour_produit" || action === "commande_recue") {
      if (!quantite || quantite <= 0) {
        return NextResponse.json({ error: "Quantité positive requise" }, { status: 400 });
      }
      nouvelleQuantite += quantite;
    } else if (action === "sortie_stock" || action === "perte" || action === "casse") {
      if (!quantite || quantite <= 0) {
        return NextResponse.json({ error: "Quantité positive requise" }, { status: 400 });
      }
      nouvelleQuantite -= quantite;
      if (nouvelleQuantite < 0) {
        return NextResponse.json({ error: "Stock insuffisant" }, { status: 400 });
      }
    } else if (action === "ajustement_quantite" || action === "correction_inventaire") {
      if (quantite === undefined || quantite < 0) {
        return NextResponse.json({ error: "Quantité requise (>= 0)" }, { status: 400 });
      }
      nouvelleQuantite = quantite;
    }

    const result = await prisma.$transaction(async (tx) => {
      const historique = await tx.historiqueInventaire.create({
        data: {
          projetUid: getProjetUid(auth),
          stockId,
          action,
          ancienneValeur: String(stock.quantiteDisponible),
          nouvelleValeur: String(nouvelleQuantite),
          quantite: quantite || null,
          motif: motif || null,
          utilisateurId: auth.user.firebaseUid,
          utilisateurNom,
          utilisateurEmail,
        },
        include: {
          stock: {
            include: {
              produit: { select: { nom: true } },
            },
          },
        },
      });

      if (["entree_stock", "sortie_stock", "ajustement_quantite", "retour_produit", "commande_recue", "correction_inventaire", "perte", "casse"].includes(action)) {
        await tx.stock.update({
          where: { id: stockId },
          data: {
            quantiteDisponible: nouvelleQuantite,
            modifiePar: auth.user.firebaseUid,
          },
        });
      }

      return historique;
    });

    return NextResponse.json({ historique: result }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/historique-inventaire:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
