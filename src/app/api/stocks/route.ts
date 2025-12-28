import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getProjetUid, checkPermission } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "stocks", "voir");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const codeBarre = searchParams.get("codeBarre") || "";
    const lowStock = searchParams.get("lowStock") === "true";
    const expiringSoon = searchParams.get("expiringSoon") === "true";
    const expired = searchParams.get("expired") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const categorieId = searchParams.get("categorieId") || "";
    const sousType = searchParams.get("sousType") || "";

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const stocks = await prisma.stock.findMany({
      where: {
        projetUid: getProjetUid(auth),
        actif: true,
        ...(codeBarre && {
          produit: { codeBarre: { equals: codeBarre } },
        }),
        ...(!codeBarre && search && {
          OR: [
            { produit: { nom: { contains: search, mode: "insensitive" } } },
            { numeroLot: { contains: search, mode: "insensitive" } },
            { fournisseur: { nom: { contains: search, mode: "insensitive" } } },
          ],
        }),
        ...(categorieId && {
          produit: { categorieId },
        }),
        ...(sousType && {
          produit: { sousType },
        }),
        ...(lowStock && {
          quantiteDisponible: { lte: prisma.stock.fields.seuilAlerte },
        }),
        ...(expiringSoon && {
          dateExpiration: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        }),
        ...(expired && {
          dateExpiration: { lt: now },
        }),
      },
      include: {
        produit: { select: { id: true, nom: true, codeBarre: true, type: true } },
        fournisseur: { select: { id: true, nom: true } },
      },
      orderBy: { createdAt: "desc" },
      ...(limit && { take: limit }),
    });

    return NextResponse.json({ stocks });
  } catch (error) {
    console.error("Erreur GET /api/stocks:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "stocks", "creer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await req.json();
    const {
      produitId,
      fournisseurId,
      numeroLot,
      prixAchat,
      prixVente,
      quantiteDisponible,
      seuilAlerte,
      dateExpiration,
    } = body;

    if (!produitId || prixAchat === undefined || prixVente === undefined) {
      return NextResponse.json(
        { error: "Produit, prix d'achat et prix de vente requis" },
        { status: 400 }
      );
    }

    const produit = await prisma.produit.findFirst({
      where: {
        id: produitId,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!produit) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    let finalNumeroLot = numeroLot?.trim();
    
    if (finalNumeroLot) {
      const existingLot = await prisma.stock.findFirst({
        where: {
          projetUid: getProjetUid(auth),
          numeroLot: finalNumeroLot,
        },
      });
      
      if (existingLot) {
        return NextResponse.json(
          { error: `Le numéro de lot "${finalNumeroLot}" existe déjà` },
          { status: 400 }
        );
      }
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      let attempts = 0;
      let isUnique = false;
      
      while (!isUnique && attempts < 10) {
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        finalNumeroLot = `LOT-${year}${month}-${random}`;
        
        const existingLot = await prisma.stock.findFirst({
          where: {
            projetUid: getProjetUid(auth),
            numeroLot: finalNumeroLot,
          },
        });
        
        if (!existingLot) {
          isUnique = true;
        }
        attempts++;
      }
      
      if (!isUnique) {
        const timestamp = Date.now().toString(36).toUpperCase();
        finalNumeroLot = `LOT-${year}${month}-${timestamp}`;
      }
    }

    const stock = await prisma.stock.create({
      data: {
        projetUid: getProjetUid(auth),
        produitId,
        fournisseurId: fournisseurId || null,
        numeroLot: finalNumeroLot,
        prixAchat,
        prixVente,
        quantiteDisponible: quantiteDisponible || 0,
        seuilAlerte: seuilAlerte || 10,
        dateExpiration: dateExpiration ? new Date(dateExpiration) : null,
        creePar: auth.user.firebaseUid,
      },
      include: {
        produit: { select: { id: true, nom: true, codeBarre: true } },
        fournisseur: { select: { id: true, nom: true } },
      },
    });

    if (quantiteDisponible > 0) {
      await prisma.historiqueInventaire.create({
        data: {
          projetUid: getProjetUid(auth),
          stockId: stock.id,
          action: "entree_stock",
          ancienneValeur: "0",
          nouvelleValeur: String(quantiteDisponible),
          quantite: quantiteDisponible,
          motif: "Stock initial",
          utilisateurId: auth.user.firebaseUid,
          utilisateurNom: auth.user.nom || auth.user.email || "Utilisateur",
          utilisateurEmail: auth.user.email,
        },
      });
    }

    return NextResponse.json({ stock }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/stocks:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "stocks", "modifier");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await req.json();
    const {
      id,
      fournisseurId,
      numeroLot,
      prixAchat,
      prixVente,
      quantiteDisponible,
      seuilAlerte,
      dateExpiration,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.stock.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Stock non trouvé" }, { status: 404 });
    }

    const oldQuantite = existing.quantiteDisponible;
    const newQuantite = quantiteDisponible ?? oldQuantite;
    const difference = newQuantite - oldQuantite;

    const stock = await prisma.stock.update({
      where: { id },
      data: {
        fournisseurId: fournisseurId ?? existing.fournisseurId,
        prixAchat: prixAchat ?? existing.prixAchat,
        prixVente: prixVente ?? existing.prixVente,
        quantiteDisponible: newQuantite,
        seuilAlerte: seuilAlerte ?? existing.seuilAlerte,
        dateExpiration: dateExpiration ? new Date(dateExpiration) : existing.dateExpiration,
        modifiePar: auth.user.firebaseUid,
      },
      include: {
        produit: { select: { id: true, nom: true, codeBarre: true } },
        fournisseur: { select: { id: true, nom: true } },
      },
    });

    const utilisateurNom = auth.user.nom || auth.user.email || "Utilisateur";
    const utilisateurEmail = auth.user.email;
    const historiqueData = [];

    if (difference !== 0) {
      historiqueData.push({
        projetUid: getProjetUid(auth),
        stockId: stock.id,
        action: difference > 0 ? "entree_stock" : "sortie_stock",
        ancienneValeur: String(oldQuantite),
        nouvelleValeur: String(newQuantite),
        quantite: Math.abs(difference),
        motif: "Ajustement manuel",
        utilisateurId: auth.user.firebaseUid,
        utilisateurNom,
        utilisateurEmail,
      });
    }

    if (prixAchat !== undefined && Number(prixAchat) !== Number(existing.prixAchat)) {
      historiqueData.push({
        projetUid: getProjetUid(auth),
        stockId: stock.id,
        action: "modification_prix_achat",
        ancienneValeur: String(existing.prixAchat),
        nouvelleValeur: String(prixAchat),
        quantite: null,
        motif: "Modification prix d'achat",
        utilisateurId: auth.user.firebaseUid,
        utilisateurNom,
        utilisateurEmail,
      });
    }

    if (prixVente !== undefined && Number(prixVente) !== Number(existing.prixVente)) {
      historiqueData.push({
        projetUid: getProjetUid(auth),
        stockId: stock.id,
        action: "modification_prix_vente",
        ancienneValeur: String(existing.prixVente),
        nouvelleValeur: String(prixVente),
        quantite: null,
        motif: "Modification prix de vente",
        utilisateurId: auth.user.firebaseUid,
        utilisateurNom,
        utilisateurEmail,
      });
    }

    if (seuilAlerte !== undefined && seuilAlerte !== existing.seuilAlerte) {
      historiqueData.push({
        projetUid: getProjetUid(auth),
        stockId: stock.id,
        action: "modification_seuil_alerte",
        ancienneValeur: String(existing.seuilAlerte),
        nouvelleValeur: String(seuilAlerte),
        quantite: null,
        motif: "Modification seuil d'alerte",
        utilisateurId: auth.user.firebaseUid,
        utilisateurNom,
        utilisateurEmail,
      });
    }

    if (dateExpiration !== undefined) {
      const oldDate = existing.dateExpiration?.toISOString().split('T')[0] || "Non défini";
      const newDate = dateExpiration || "Non défini";
      if (oldDate !== newDate) {
        historiqueData.push({
          projetUid: getProjetUid(auth),
          stockId: stock.id,
          action: "modification_date_expiration",
          ancienneValeur: oldDate,
          nouvelleValeur: newDate,
          quantite: null,
          motif: "Modification date d'expiration",
          utilisateurId: auth.user.firebaseUid,
          utilisateurNom,
          utilisateurEmail,
        });
      }
    }

    if (historiqueData.length > 0) {
      await prisma.historiqueInventaire.createMany({
        data: historiqueData,
      });
    }

    return NextResponse.json({ stock });
  } catch (error) {
    console.error("Erreur PUT /api/stocks:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "stocks", "supprimer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.stock.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Stock non trouvé" }, { status: 404 });
    }

    await prisma.stock.update({
      where: { id },
      data: {
        actif: false,
        modifiePar: auth.user.firebaseUid,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/stocks:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
