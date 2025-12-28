import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getProjetUid, checkPermission } from "@/lib/api-auth";

function generateReference(prefix: string = "V"): string {
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

    const permError = await checkPermission(auth, "ventes", "voir");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const statut = searchParams.get("statut") || "";
    const clientId = searchParams.get("clientId") || "";
    const sansFacture = searchParams.get("sansFacture") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    const ventes = await prisma.vente.findMany({
      where: {
        projetUid: getProjetUid(auth),
        actif: true,
        ...(search && {
          OR: [
            { reference: { contains: search, mode: "insensitive" } },
            { client: { nom: { contains: search, mode: "insensitive" } } },
          ],
        }),
        ...(statut && { statut }),
        ...(clientId && { clientId }),
        ...(sansFacture && {
          factures: {
            none: {}
          }
        }),
      },
      include: {
        client: { select: { id: true, nom: true, prenom: true, telephone: true } },
        lignes: {
          include: {
            stock: {
              include: {
                produit: { select: { nom: true, codeBarre: true } },
              },
            },
          },
        },
        _count: { select: { factures: true, avoirs: true } },
      },
      orderBy: { createdAt: "desc" },
      ...(limit && { take: limit }),
    });

    return NextResponse.json({ ventes });
  } catch (error) {
    console.error("Erreur GET /api/ventes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "ventes", "creer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await req.json();
    const {
      clientId,
      lignes,
      remise,
      montantPaye,
      modePaiement,
      typePaiement,
      note,
    } = body;

    if (!lignes || lignes.length === 0) {
      return NextResponse.json(
        { error: "Au moins une ligne de vente requise" },
        { status: 400 }
      );
    }

    let sousTotal = 0;
    const lignesData: {
      stockId: string;
      quantite: number;
      prixUnit: number;
      remise: number;
      total: number;
    }[] = [];

    for (const ligne of lignes) {
      const stock = await prisma.stock.findFirst({
        where: {
          id: ligne.stockId,
          projetUid: getProjetUid(auth),
          actif: true,
        },
      });

      if (!stock) {
        return NextResponse.json(
          { error: `Stock non trouvé: ${ligne.stockId}` },
          { status: 404 }
        );
      }

      if (stock.quantiteDisponible < ligne.quantite) {
        return NextResponse.json(
          { error: `Stock insuffisant pour le lot ${stock.numeroLot}` },
          { status: 400 }
        );
      }

      const ligneRemise = ligne.remise || 0;
      const ligneTotal = ligne.quantite * ligne.prixUnit - ligneRemise;
      sousTotal += ligneTotal;

      lignesData.push({
        stockId: ligne.stockId,
        quantite: ligne.quantite,
        prixUnit: ligne.prixUnit,
        remise: ligneRemise,
        total: ligneTotal,
      });
    }

    const venteRemise = remise || 0;
    const total = sousTotal - venteRemise;
    const type = typePaiement || "especes";
    
    let paye = 0;
    let du = total;
    let montantSolde = 0;
    let montantCredit = 0;

    if (type === "solde" && clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, projetUid: getProjetUid(auth), actif: true },
      });
      
      if (client) {
        const creditDisponible = Number(client.credit);
        if (creditDisponible >= total) {
          montantSolde = total;
          paye = total;
          du = 0;
        } else {
          montantSolde = creditDisponible;
          montantCredit = total - creditDisponible;
          paye = creditDisponible;
          du = montantCredit;
        }
      }
    } else if (type === "credit") {
      montantCredit = total;
      du = total;
      paye = 0;
    } else {
      paye = montantPaye ?? 0;
      du = total - paye;
    }

    let statut = "en_cours";
    if (type === "especes" && montantPaye === null) {
      statut = "payee";
      paye = total; // Consider as fully paid
      du = 0;
    } else if (paye >= total) {
      statut = "payee";
    } else if (paye > 0) {
      statut = "partielle";
    } else if (type === "credit") {
      statut = "credit";
    }

    let vendeurNom = auth.user.nom 
      ? `${auth.user.nom} (${auth.user.email || ""})`
      : auth.user.email || null;

    const vente = await prisma.$transaction(async (tx) => {
      const nouvelleVente = await tx.vente.create({
        data: {
          projetUid: getProjetUid(auth),
          clientId: clientId || null,
          reference: generateReference("V"),
          sousTotal,
          remise: venteRemise,
          total,
          montantPaye: paye,
          montantDu: du,
          montantSolde,
          montantCredit,
          modePaiement: modePaiement || null,
          typePaiement: type,
          vendeurNom,
          statut,
          note: note || null,
          creePar: auth.user.firebaseUid,
          lignes: {
            create: lignesData,
          },
        },
        include: {
          client: { select: { id: true, nom: true, prenom: true } },
          lignes: true,
        },
      });

      const utilisateurNom = auth.user.nom || auth.user.email || "Utilisateur";
      const utilisateurEmail = auth.user.email;

      for (const ligne of lignesData) {
        const stockAvant = await tx.stock.findUnique({ where: { id: ligne.stockId } });
        const ancienneQuantite = stockAvant?.quantiteDisponible || 0;

        await tx.stock.update({
          where: { id: ligne.stockId },
          data: {
            quantiteDisponible: { decrement: ligne.quantite },
            modifiePar: auth.user.firebaseUid,
          },
        });

        await tx.historiqueInventaire.create({
          data: {
            projetUid: getProjetUid(auth),
            stockId: ligne.stockId,
            action: "vente",
            ancienneValeur: String(ancienneQuantite),
            nouvelleValeur: String(ancienneQuantite - ligne.quantite),
            quantite: ligne.quantite,
            motif: `Vente ${nouvelleVente.reference}`,
            referenceId: nouvelleVente.id,
            utilisateurId: auth.user.firebaseUid,
            utilisateurNom,
            utilisateurEmail,
          },
        });
      }

      if (clientId) {
        if (montantSolde > 0) {
          await tx.client.update({
            where: { id: clientId },
            data: {
              credit: { decrement: montantSolde },
              modifiePar: auth.user.firebaseUid,
            },
          });
        }
        
        if (montantCredit > 0) {
          await tx.client.update({
            where: { id: clientId },
            data: {
              solde: { increment: montantCredit },
              modifiePar: auth.user.firebaseUid,
            },
          });
        }
      }

      return nouvelleVente;
    });

    return NextResponse.json({ vente }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/ventes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "ventes", "modifier");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await req.json();
    const { id, montantPaye, statut, note } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.vente.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
      include: { lignes: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Vente non trouvée" }, { status: 404 });
    }

    if (statut === "annulee" && existing.statut !== "annulee") {
      await prisma.$transaction(async (tx) => {
        for (const ligne of existing.lignes) {
          const stock = await tx.stock.findUnique({ where: { id: ligne.stockId } });
          const quantiteAvant = stock?.quantiteDisponible || 0;
          
          await tx.stock.update({
            where: { id: ligne.stockId },
            data: {
              quantiteDisponible: { increment: ligne.quantite },
              modifiePar: auth.user.firebaseUid,
            },
          });

          await tx.historiqueInventaire.create({
            data: {
              projetUid: getProjetUid(auth),
              stockId: ligne.stockId,
              action: "retour_produit",
              ancienneValeur: String(quantiteAvant),
              nouvelleValeur: String(quantiteAvant + ligne.quantite),
              quantite: ligne.quantite,
              motif: `Annulation vente ${existing.reference}`,
              referenceId: existing.id,
              utilisateurId: auth.user.firebaseUid,
              utilisateurNom: auth.user.nom || auth.user.email || "Utilisateur",
              utilisateurEmail: auth.user.email,
            },
          });
        }

        if (existing.clientId && Number(existing.montantDu) > 0) {
          await tx.client.update({
            where: { id: existing.clientId },
            data: {
              solde: { decrement: Number(existing.montantDu) },
              modifiePar: auth.user.firebaseUid,
            },
          });
        }
      });
    }

    let newStatut = statut || existing.statut;
    if (montantPaye !== undefined && statut !== "annulee") {
      const newPaye = montantPaye;
      const newDu = Number(existing.total) - newPaye;

      if (newPaye >= Number(existing.total)) {
        newStatut = "payee";
      } else if (newPaye > 0) {
        newStatut = "partielle";
      }
    }

    const vente = await prisma.vente.update({
      where: { id },
      data: {
        montantPaye: montantPaye ?? existing.montantPaye,
        montantDu: montantPaye !== undefined 
          ? Number(existing.total) - montantPaye 
          : existing.montantDu,
        statut: newStatut,
        note: note ?? existing.note,
        modifiePar: auth.user.firebaseUid,
      },
      include: {
        client: { select: { id: true, nom: true } },
        lignes: true,
      },
    });

    return NextResponse.json({ vente });
  } catch (error) {
    console.error("Erreur PUT /api/ventes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
