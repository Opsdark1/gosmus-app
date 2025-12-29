import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getProjetUid, checkPermission } from "@/lib/api-auth";
import { createHistoriqueEntry } from "@/app/api/historique-general/route";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "confreres", "voir");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const statut = searchParams.get("statut") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;
    const mesConfreresRecus = searchParams.get("recus") === "true";

    const projetUid = getProjetUid(auth);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: any = { actif: true };

    if (mesConfreresRecus) {
      where.destinataireUid = auth.user.firebaseUid;
    } else {
      where.projetUid = projetUid;
    }

    if (search) {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { motif: { contains: search, mode: "insensitive" } },
        { etablissementSource: { nom: { contains: search, mode: "insensitive" } } },
        { etablissementDestination: { nom: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (statut && statut !== "all") {
      where.statut = statut;
    }

    const [confreres, total] = await Promise.all([
      prisma.confrere.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          etablissementSource: { select: { id: true, nom: true, type: true, isManuel: true, utilisateurLieUid: true } },
          etablissementDestination: { select: { id: true, nom: true, type: true, isManuel: true, utilisateurLieUid: true } },
          lignes: true,
          contreOffres: true,
        },
      }),
      prisma.confrere.count({ where }),
    ]);

    const countEnAttente = await prisma.confrere.count({
      where: {
        destinataireUid: auth.user.firebaseUid,
        statut: "en_attente_acceptation",
        actif: true,
      },
    });

    const countContreOffre = await prisma.confrere.count({
      where: {
        projetUid,
        statut: "en_attente_validation",
        actif: true,
      },
    });

    return NextResponse.json({
      confreres,
      counts: {
        enAttenteAcceptation: countEnAttente,
        enAttenteValidation: countContreOffre,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur GET confrères:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "confreres", "creer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await request.json();
    const { etablissementPartenaire, lignes, motif, note } = body;

    if (!etablissementPartenaire) {
      return NextResponse.json({ error: "Établissement partenaire requis" }, { status: 400 });
    }

    if (!lignes || !Array.isArray(lignes) || lignes.length === 0) {
      return NextResponse.json({ error: "Au moins un produit est requis" }, { status: 400 });
    }

    const projetUid = getProjetUid(auth);

    const etablissement = await prisma.etablissement.findFirst({
      where: { id: etablissementPartenaire, projetUid, actif: true },
    });

    if (!etablissement) {
      return NextResponse.json({ error: "Établissement non trouvé ou inactif" }, { status: 400 });
    }

    if (!etablissement.utilisateurLieUid) {
      return NextResponse.json({ error: "L'établissement n'est pas lié à un utilisateur de l'application" }, { status: 400 });
    }

    let totalArticles = lignes.length;
    let totalQuantite = 0;
    let valeurEstimee = 0;

    interface LigneData {
      stockId?: string;
      produitNom: string;
      produitCode?: string | null;
      numeroLot?: string | null;
      quantite: number;
      prixUnit: number;
      dateExpiration?: string | null;
    }

    const lignesData: LigneData[] = [];

    for (const ligne of lignes) {
      if (!ligne.produitNom || !ligne.quantite || ligne.quantite <= 0) {
        return NextResponse.json({ error: "Chaque ligne doit avoir un produit et une quantité positive" }, { status: 400 });
      }

      if (ligne.stockId) {
        const stock = await prisma.stock.findUnique({
          where: { id: ligne.stockId },
          include: { produit: true },
        });

        if (!stock || stock.projetUid !== projetUid) {
          return NextResponse.json({ error: `Stock non trouvé pour ${ligne.produitNom}` }, { status: 400 });
        }

        if (stock.quantiteDisponible < ligne.quantite) {
          return NextResponse.json({ 
            error: `Quantité insuffisante pour ${ligne.produitNom} (disponible: ${stock.quantiteDisponible})` 
          }, { status: 400 });
        }

        await prisma.stock.update({
          where: { id: stock.id },
          data: {
            quantiteDisponible: { decrement: ligne.quantite },
            modifiePar: auth.user.firebaseUid,
          },
        });

        await prisma.historiqueInventaire.create({
          data: {
            projetUid,
            stockId: stock.id,
            action: "sortie",
            quantite: ligne.quantite,
            ancienneValeur: String(stock.quantiteDisponible),
            nouvelleValeur: String(stock.quantiteDisponible - ligne.quantite),
            motif: `Échange confrère envoyé`,
            utilisateurId: auth.user.firebaseUid,
            utilisateurNom: auth.user.nom || auth.user.email || "Utilisateur",
            utilisateurEmail: auth.user.email,
          },
        });
      }

      const prixUnit = ligne.prixUnit || 0;
      totalQuantite += ligne.quantite;
      valeurEstimee += prixUnit * ligne.quantite;

      lignesData.push({
        stockId: ligne.stockId,
        produitNom: ligne.produitNom,
        produitCode: ligne.produitCode || null,
        numeroLot: ligne.numeroLot || null,
        quantite: ligne.quantite,
        prixUnit,
        dateExpiration: ligne.dateExpiration || null,
      });
    }

    const count = await prisma.confrere.count({ where: { projetUid } });
    const reference = `ECH-${String(count + 1).padStart(6, "0")}`;

    const confrere = await prisma.confrere.create({
      data: {
        projetUid,
        reference,
        etablissementDestinationId: etablissement.id,
        destinataireUid: etablissement.utilisateurLieUid,
        typeConfrere: "sortant",
        isManuel: false,
        statut: "en_attente_acceptation",
        dateEnvoi: new Date(),
        totalArticles,
        totalQuantite,
        valeurEstimee,
        motif: motif?.trim() || null,
        note: note?.trim() || null,
        creePar: auth.user.firebaseUid,
        validePar: auth.user.firebaseUid,
        lignes: {
          create: lignesData.map(l => ({
            produitNom: l.produitNom,
            produitCode: l.produitCode || null,
            numeroLot: l.numeroLot || null,
            quantite: l.quantite,
            prixUnit: l.prixUnit,
            total: l.prixUnit * l.quantite,
            dateExpiration: l.dateExpiration ? new Date(l.dateExpiration) : null,
          })),
        },
      },
      include: {
        etablissementDestination: { select: { nom: true } },
        lignes: true,
      },
    });

    await prisma.notification.create({
      data: {
        projetUid: etablissement.utilisateurLieUid,
        type: "echange_recu",
        titre: "Nouvel échange reçu",
        message: `Vous avez reçu un échange de ${totalQuantite} article(s) d'une valeur estimée de ${valeurEstimee.toFixed(2)} DH`,
        lienAction: `/dashboard/confreres?recus=true`,
        priorite: "haute",
        metadata: {
          confrereId: confrere.id,
          reference: confrere.reference,
          valeurEstimee,
          totalQuantite,
        },
      },
    });

    await createHistoriqueEntry({
      projetUid,
      module: "confreres",
      action: "creer",
      entiteId: confrere.id,
      entiteNom: confrere.reference,
      description: `Échange ${reference} envoyé à ${etablissement.nom} (${totalQuantite} unités, valeur ${valeurEstimee.toFixed(2)} DH)`,
      donneesApres: { reference, partenaire: etablissement.nom, totalQuantite, valeurEstimee },
      utilisateurId: auth.user.firebaseUid,
      utilisateurEmail: auth.user.email || undefined,
    });

    return NextResponse.json({ confrere }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST confrère:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { id, action, motifRefus, contreOffres } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const confrere = await prisma.confrere.findFirst({
      where: { 
        id, 
        actif: true,
        OR: [
          { creePar: auth.user.firebaseUid },
          { destinataireUid: auth.user.firebaseUid },
        ],
      },
      include: { 
        lignes: true,
        contreOffres: true,
        etablissementSource: { select: { nom: true } },
        etablissementDestination: { select: { nom: true } },
      },
    });

    if (!confrere) {
      return NextResponse.json({ error: "Échange non trouvé ou accès refusé" }, { status: 404 });
    }

    const isCreateur = confrere.creePar === auth.user.firebaseUid;
    const isDestinataire = confrere.destinataireUid === auth.user.firebaseUid;

    if (action === "accepter" && isDestinataire) {
      if (confrere.statut !== "en_attente_acceptation") {
        return NextResponse.json({ error: "Cet échange n'est pas en attente d'acceptation" }, { status: 400 });
      }

      if (!contreOffres || !Array.isArray(contreOffres) || contreOffres.length === 0) {
        return NextResponse.json({ error: "Vous devez proposer des produits en échange" }, { status: 400 });
      }

      const destinataireProjetUid = getProjetUid(auth);
      let contreValeurEstimee = 0;

      for (const co of contreOffres) {
        if (!co.produitNom || !co.quantite || co.quantite <= 0) {
          return NextResponse.json({ error: "Chaque contre-offre doit avoir un produit et une quantité" }, { status: 400 });
        }

        if (co.stockId) {
          const stock = await prisma.stock.findUnique({
            where: { id: co.stockId },
          });

          if (!stock || stock.projetUid !== destinataireProjetUid) {
            return NextResponse.json({ error: `Stock non trouvé pour ${co.produitNom}` }, { status: 400 });
          }

          if (stock.quantiteDisponible < co.quantite) {
            return NextResponse.json({ 
              error: `Quantité insuffisante pour ${co.produitNom} (disponible: ${stock.quantiteDisponible})` 
            }, { status: 400 });
          }

          await prisma.stock.update({
            where: { id: stock.id },
            data: {
              quantiteDisponible: { decrement: co.quantite },
              modifiePar: auth.user.firebaseUid,
            },
          });

          await prisma.historiqueInventaire.create({
            data: {
              projetUid: destinataireProjetUid,
              stockId: stock.id,
              action: "sortie",
              quantite: co.quantite,
              ancienneValeur: String(stock.quantiteDisponible),
              nouvelleValeur: String(stock.quantiteDisponible - co.quantite),
              motif: `Contre-offre échange ${confrere.reference}`,
              utilisateurId: auth.user.firebaseUid,
              utilisateurNom: auth.user.nom || auth.user.email || "Utilisateur",
              utilisateurEmail: auth.user.email,
            },
          });
        }

        contreValeurEstimee += (co.prixUnit || 0) * co.quantite;
      }

      const difference = Number(confrere.valeurEstimee) - contreValeurEstimee;

      await prisma.contreOffreConfrere.createMany({
        data: contreOffres.map((co: { produitNom: string; produitCode?: string; numeroLot?: string; quantite: number; prixUnit?: number; dateExpiration?: string }) => ({
          confrereId: confrere.id,
          produitNom: co.produitNom,
          produitCode: co.produitCode || null,
          numeroLot: co.numeroLot || null,
          quantite: co.quantite,
          prixUnit: co.prixUnit || 0,
          total: (co.prixUnit || 0) * co.quantite,
          dateExpiration: co.dateExpiration ? new Date(co.dateExpiration) : null,
          creePar: auth.user.firebaseUid,
        })),
      });

      await prisma.confrere.update({
        where: { id },
        data: {
          statut: "en_attente_validation",
          dateContreOffre: new Date(),
          contreValeurEstimee,
          differenceRemise: difference > 0 ? difference : 0,
          recuPar: auth.user.firebaseUid,
          modifiePar: auth.user.firebaseUid,
        },
      });

      await prisma.notification.create({
        data: {
          projetUid: confrere.projetUid,
          type: "contre_offre_recue",
          titre: "Contre-offre reçue",
          message: `Une contre-offre a été proposée pour l'échange ${confrere.reference} (valeur: ${contreValeurEstimee.toFixed(2)} DH)`,
          lienAction: `/dashboard/confreres`,
          priorite: "haute",
          metadata: {
            confrereId: confrere.id,
            reference: confrere.reference,
            contreValeurEstimee,
            difference,
          },
        },
      });

      await createHistoriqueEntry({
        projetUid: confrere.projetUid,
        module: "confreres",
        action: "contre_offre",
        entiteId: confrere.id,
        entiteNom: confrere.reference,
        description: `Contre-offre reçue pour ${confrere.reference} (${contreValeurEstimee.toFixed(2)} DH)`,
        donneesAvant: { statut: "en_attente_acceptation" },
        donneesApres: { statut: "en_attente_validation", contreValeurEstimee },
        utilisateurId: auth.user.firebaseUid,
        utilisateurEmail: auth.user.email || undefined,
      });

      return NextResponse.json({ message: "Contre-offre envoyée", statut: "en_attente_validation" });
    }

    if (action === "valider" && isCreateur) {
      if (confrere.statut !== "en_attente_validation") {
        return NextResponse.json({ error: "Cet échange n'est pas en attente de validation" }, { status: 400 });
      }

      const contreOffresData = await prisma.contreOffreConfrere.findMany({
        where: { confrereId: confrere.id },
      });

      for (const co of contreOffresData) {
        let produit = await prisma.produit.findFirst({
          where: {
            projetUid: confrere.projetUid,
            nom: { equals: co.produitNom, mode: "insensitive" },
          },
        });

        if (!produit) {
          produit = await prisma.produit.create({
            data: {
              projetUid: confrere.projetUid,
              nom: co.produitNom,
              codeBarre: co.produitCode || null,
              type: "medicament",
              actif: true,
              creePar: auth.user.firebaseUid,
            },
          });
        }

        const newStock = await prisma.stock.create({
          data: {
            projetUid: confrere.projetUid,
            produitId: produit.id,
            numeroLot: co.numeroLot || `ECH-${confrere.reference}-${Date.now()}`,
            quantiteDisponible: co.quantite,
            prixAchat: Number(co.prixUnit),
            prixVente: Number(co.prixUnit),
            dateExpiration: co.dateExpiration || null,
            actif: true,
            creePar: auth.user.firebaseUid,
          },
        });

        await prisma.historiqueInventaire.create({
          data: {
            projetUid: confrere.projetUid,
            stockId: newStock.id,
            action: "entree",
            quantite: co.quantite,
            ancienneValeur: "0",
            nouvelleValeur: String(co.quantite),
            motif: `Réception contre-offre ${confrere.reference}`,
            utilisateurId: auth.user.firebaseUid,
            utilisateurNom: auth.user.nom || auth.user.email || "Utilisateur",
            utilisateurEmail: auth.user.email,
          },
        });
      }

      for (const ligne of confrere.lignes) {
        let produit = await prisma.produit.findFirst({
          where: {
            projetUid: confrere.destinataireUid!,
            nom: { equals: ligne.produitNom, mode: "insensitive" },
          },
        });

        if (!produit) {
          produit = await prisma.produit.create({
            data: {
              projetUid: confrere.destinataireUid!,
              nom: ligne.produitNom,
              codeBarre: ligne.produitCode || null,
              type: "medicament",
              actif: true,
              creePar: auth.user.firebaseUid,
            },
          });
        }

        const newStock = await prisma.stock.create({
          data: {
            projetUid: confrere.destinataireUid!,
            produitId: produit.id,
            numeroLot: ligne.numeroLot || `ECH-${confrere.reference}-${Date.now()}`,
            quantiteDisponible: ligne.quantite,
            prixAchat: Number(ligne.prixUnit),
            prixVente: Number(ligne.prixUnit),
            dateExpiration: ligne.dateExpiration || null,
            actif: true,
            creePar: confrere.destinataireUid!,
          },
        });

        await prisma.historiqueInventaire.create({
          data: {
            projetUid: confrere.destinataireUid!,
            stockId: newStock.id,
            action: "entree",
            quantite: ligne.quantite,
            ancienneValeur: "0",
            nouvelleValeur: String(ligne.quantite),
            motif: `Réception échange ${confrere.reference}`,
            utilisateurId: auth.user.firebaseUid,
            utilisateurNom: auth.user.nom || auth.user.email || "Utilisateur",
            utilisateurEmail: auth.user.email,
          },
        });
      }

      await prisma.confrere.update({
        where: { id },
        data: {
          statut: "termine",
          dateValidation: new Date(),
          dateCloture: new Date(),
          modifiePar: auth.user.firebaseUid,
        },
      });

      await prisma.notification.create({
        data: {
          projetUid: confrere.destinataireUid!,
          type: "echange_termine",
          titre: "Échange terminé",
          message: `L'échange ${confrere.reference} a été validé et terminé avec succès`,
          lienAction: `/dashboard/confreres?recus=true`,
          priorite: "normale",
        },
      });

      await createHistoriqueEntry({
        projetUid: confrere.projetUid,
        module: "confreres",
        action: "valider",
        entiteId: confrere.id,
        entiteNom: confrere.reference,
        description: `Échange ${confrere.reference} validé et terminé`,
        donneesAvant: { statut: "en_attente_validation" },
        donneesApres: { statut: "termine" },
        utilisateurId: auth.user.firebaseUid,
        utilisateurEmail: auth.user.email || undefined,
      });

      return NextResponse.json({ message: "Échange validé et terminé", statut: "termine" });
    }

    if (action === "refuser") {
      if (!["en_attente_acceptation", "en_attente_validation"].includes(confrere.statut)) {
        return NextResponse.json({ error: "Cet échange ne peut pas être refusé" }, { status: 400 });
      }

      for (const ligne of confrere.lignes) {
        const stock = await prisma.stock.findFirst({
          where: {
            projetUid: confrere.projetUid,
            produit: { nom: ligne.produitNom },
            ...(ligne.numeroLot ? { numeroLot: ligne.numeroLot } : {}),
          },
        });

        if (stock) {
          await prisma.stock.update({
            where: { id: stock.id },
            data: { quantiteDisponible: { increment: ligne.quantite } },
          });

          await prisma.historiqueInventaire.create({
            data: {
              projetUid: confrere.projetUid,
              stockId: stock.id,
              action: "entree",
              quantite: ligne.quantite,
              motif: `Retour stock - Échange ${confrere.reference} refusé`,
              utilisateurId: auth.user.firebaseUid,
              utilisateurNom: auth.user.nom || auth.user.email || "Utilisateur",
              utilisateurEmail: auth.user.email,
            },
          });
        }
      }

      if (confrere.statut === "en_attente_validation") {
        for (const co of confrere.contreOffres) {
          const stock = await prisma.stock.findFirst({
            where: {
              projetUid: confrere.destinataireUid!,
              produit: { nom: co.produitNom },
              ...(co.numeroLot ? { numeroLot: co.numeroLot } : {}),
            },
          });

          if (stock) {
            await prisma.stock.update({
              where: { id: stock.id },
              data: { quantiteDisponible: { increment: co.quantite } },
            });
          }
        }
      }

      await prisma.confrere.update({
        where: { id },
        data: {
          statut: "refuse",
          dateRefus: new Date(),
          motifRefus: motifRefus || null,
          modifiePar: auth.user.firebaseUid,
        },
      });

      const notifDestinataire = isCreateur ? confrere.destinataireUid : confrere.projetUid;
      await prisma.notification.create({
        data: {
          projetUid: notifDestinataire!,
          type: "echange_refuse",
          titre: "Échange refusé",
          message: `L'échange ${confrere.reference} a été refusé${motifRefus ? `: ${motifRefus}` : ""}`,
          lienAction: `/dashboard/confreres`,
          priorite: "haute",
        },
      });

      await createHistoriqueEntry({
        projetUid: confrere.projetUid,
        module: "confreres",
        action: "refuser",
        entiteId: confrere.id,
        entiteNom: confrere.reference,
        description: `Échange ${confrere.reference} refusé${motifRefus ? `: ${motifRefus}` : ""}`,
        donneesApres: { statut: "refuse", motifRefus },
        utilisateurId: auth.user.firebaseUid,
        utilisateurEmail: auth.user.email || undefined,
      });

      return NextResponse.json({ message: "Échange refusé", statut: "refuse" });
    }

    if (action === "annuler" && isCreateur) {
      if (!["en_attente_acceptation"].includes(confrere.statut)) {
        return NextResponse.json({ error: "Cet échange ne peut pas être annulé" }, { status: 400 });
      }

      for (const ligne of confrere.lignes) {
        const stock = await prisma.stock.findFirst({
          where: {
            projetUid: confrere.projetUid,
            produit: { nom: ligne.produitNom },
            ...(ligne.numeroLot ? { numeroLot: ligne.numeroLot } : {}),
          },
        });

        if (stock) {
          await prisma.stock.update({
            where: { id: stock.id },
            data: { quantiteDisponible: { increment: ligne.quantite } },
          });
        }
      }

      await prisma.confrere.update({
        where: { id },
        data: {
          statut: "annule",
          modifiePar: auth.user.firebaseUid,
        },
      });

      await createHistoriqueEntry({
        projetUid: confrere.projetUid,
        module: "confreres",
        action: "annuler",
        entiteId: confrere.id,
        entiteNom: confrere.reference,
        description: `Échange ${confrere.reference} annulé`,
        donneesApres: { statut: "annule" },
        utilisateurId: auth.user.firebaseUid,
        utilisateurEmail: auth.user.email || undefined,
      });

      return NextResponse.json({ message: "Échange annulé", statut: "annule" });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (error) {
    console.error("Erreur PUT confrère:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "confreres", "supprimer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const projetUid = getProjetUid(auth);

    const confrere = await prisma.confrere.findFirst({
      where: { id, projetUid, actif: true },
    });

    if (!confrere) {
      return NextResponse.json({ error: "Échange non trouvé" }, { status: 404 });
    }

    if (!["annule", "refuse"].includes(confrere.statut)) {
      return NextResponse.json({ error: "Seul un échange annulé ou refusé peut être supprimé" }, { status: 400 });
    }

    await prisma.confrere.update({
      where: { id },
      data: { actif: false, modifiePar: auth.user.firebaseUid },
    });

    await createHistoriqueEntry({
      projetUid,
      module: "confreres",
      action: "supprimer",
      entiteId: confrere.id,
      entiteNom: confrere.reference,
      description: `Suppression de l'échange ${confrere.reference}`,
      utilisateurId: auth.user.firebaseUid,
      utilisateurEmail: auth.user.email || undefined,
    });

    return NextResponse.json({ message: "Échange supprimé" });
  } catch (error) {
    console.error("Erreur DELETE confrère:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
