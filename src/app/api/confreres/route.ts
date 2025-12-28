import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getProjetUid, checkPermission } from "@/lib/api-auth";
import { createHistoriqueEntry } from "@/app/api/historique-general/route";

// Statuts des confrères:
// en_cours - Créé, en cours de préparation
// en_attente_acceptation - Envoyé, en attente de réponse (utilisateur app uniquement)
// accepte - Le destinataire a accepté
// refuse - Le destinataire a refusé  
// en_attente_paiement - Produits reçus/livrés, en attente du paiement
// paiement_confirme - Paiement reçu et confirmé
// termine - Confrère complètement clôturé
// annule - Confrère annulé

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
    const etablissementId = searchParams.get("etablissementId") || "";
    const typeConfrere = searchParams.get("typeConfrere") || "";
    const dateDebut = searchParams.get("dateDebut") || "";
    const dateFin = searchParams.get("dateFin") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;
    
    // Récupérer les confrères reçus (où je suis le destinataire)
    const mesConfreresRecus = searchParams.get("recus") === "true";

    const projetUid = getProjetUid(auth);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: any = { actif: true };

    if (mesConfreresRecus) {
      // Confrères où je suis le destinataire (via destinataireUid)
      where.destinataireUid = auth.user.firebaseUid;
    } else {
      // Mes confrères créés
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

    if (typeConfrere && typeConfrere !== "all") {
      where.typeConfrere = typeConfrere;
    }

    if (etablissementId) {
      where.OR = [
        { etablissementSourceId: etablissementId },
        { etablissementDestinationId: etablissementId },
      ];
    }

    if (dateDebut || dateFin) {
      where.createdAt = {};
      if (dateDebut) {
        where.createdAt.gte = new Date(dateDebut);
      }
      if (dateFin) {
        const fin = new Date(dateFin);
        fin.setHours(23, 59, 59, 999);
        where.createdAt.lte = fin;
      }
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
        },
      }),
      prisma.confrere.count({ where }),
    ]);

    return NextResponse.json({
      confreres,
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
    const {
      etablissementPartenaire,
      typeConfrere = "sortant",
      lignes,
      motif,
      note,
    } = body;

    if (!etablissementPartenaire) {
      return NextResponse.json({ error: "Établissement partenaire requis" }, { status: 400 });
    }

    if (!lignes || !Array.isArray(lignes) || lignes.length === 0) {
      return NextResponse.json({ error: "Au moins un produit est requis" }, { status: 400 });
    }

    const projetUid = getProjetUid(auth);

    // Récupérer l'établissement partenaire
    const etablissement = await prisma.etablissement.findFirst({
      where: { id: etablissementPartenaire, projetUid, actif: true },
    });

    if (!etablissement) {
      return NextResponse.json({ error: "Établissement non trouvé ou inactif" }, { status: 400 });
    }

    // Définir source et destination selon le type
    let etablissementSourceId: string | null = null;
    let etablissementDestinationId: string | null = null;
    let destinataireUid: string | null = null;

    if (typeConfrere === "sortant") {
      // J'envoie: destination = partenaire
      etablissementDestinationId = etablissement.id;
      destinataireUid = etablissement.utilisateurLieUid;
    } else {
      // Je reçois: source = partenaire
      etablissementSourceId = etablissement.id;
    }

    // Calculer totaux
    let totalArticles = lignes.length;
    let totalQuantite = 0;
    let valeurEstimee = 0;

    interface LigneData {
      stockId?: string;
      produitId?: string;
      produitNom: string;
      produitCode?: string | null;
      numeroLot?: string | null;
      quantite: number;
      prixUnit?: number;
      dateExpiration?: string | null;
      note?: string | null;
    }

    const lignesData: LigneData[] = [];

    for (const ligne of lignes) {
      if (!ligne.produitNom || !ligne.quantite || ligne.quantite <= 0) {
        return NextResponse.json({ error: "Chaque ligne doit avoir un produit et une quantité positive" }, { status: 400 });
      }

      if (typeConfrere === "sortant" && ligne.stockId) {
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
      }

      const prixUnit = ligne.prixUnit || 0;
      totalQuantite += ligne.quantite;
      valeurEstimee += prixUnit * ligne.quantite;

      lignesData.push({
        stockId: ligne.stockId,
        produitId: ligne.produitId,
        produitNom: ligne.produitNom,
        produitCode: ligne.produitCode || null,
        numeroLot: ligne.numeroLot || null,
        quantite: ligne.quantite,
        prixUnit,
        dateExpiration: ligne.dateExpiration || null,
        note: ligne.note || null,
      });
    }

    // Générer référence
    const count = await prisma.confrere.count({ where: { projetUid } });
    const reference = `CFR-${String(count + 1).padStart(6, "0")}`;

    // Créer le confrère
    const confrere = await prisma.confrere.create({
      data: {
        projetUid,
        reference,
        etablissementSourceId,
        etablissementDestinationId,
        destinataireUid,
        typeConfrere,
        isManuel: etablissement.isManuel,
        statut: "en_cours",
        totalArticles,
        totalQuantite,
        valeurEstimee,
        montantDu: valeurEstimee,
        motif: motif?.trim() || null,
        note: note?.trim() || null,
        creePar: auth.user.firebaseUid,
        lignes: {
          create: lignesData.map(l => ({
            produitNom: l.produitNom,
            produitCode: l.produitCode || null,
            numeroLot: l.numeroLot || null,
            quantite: l.quantite,
            prixUnit: l.prixUnit || 0,
            total: (l.prixUnit || 0) * l.quantite,
            dateExpiration: l.dateExpiration ? new Date(l.dateExpiration) : null,
            note: l.note || null,
          })),
        },
      },
      include: {
        etablissementSource: { select: { nom: true } },
        etablissementDestination: { select: { nom: true } },
        lignes: true,
      },
    });

    const partenaireNom = etablissement.nom;

    await createHistoriqueEntry({
      projetUid,
      module: "confreres",
      action: "creer",
      entiteId: confrere.id,
      entiteNom: confrere.reference,
      description: `Création du confrère ${reference} avec ${partenaireNom} (${totalQuantite} unités, ${totalArticles} articles)`,
      donneesApres: { reference, partenaire: partenaireNom, totalQuantite, totalArticles },
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
    const { id, action, motifRefus, montantPaye, modePaiement, notePaiement } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    // Vérifier si c'est un confrère créé par l'utilisateur ou reçu
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
        etablissementSource: { select: { nom: true, isManuel: true } },
        etablissementDestination: { select: { nom: true, isManuel: true } },
      },
    });

    if (!confrere) {
      return NextResponse.json({ error: "Confrère non trouvé ou accès refusé" }, { status: 404 });
    }

    const isCreateur = confrere.creePar === auth.user.firebaseUid;
    const isDestinataire = confrere.destinataireUid === auth.user.firebaseUid;
    const projetUid = isCreateur ? confrere.projetUid : getProjetUid(auth);

    // ========================================
    // Actions du CRÉATEUR (émetteur)
    // ========================================
    
    // Envoyer le confrère
    if (action === "envoyer" && isCreateur) {
      if (confrere.statut !== "en_cours") {
        return NextResponse.json({ error: "Seul un confrère en cours peut être envoyé" }, { status: 400 });
      }

      const nouveauStatut = confrere.isManuel ? "en_attente_paiement" : "en_attente_acceptation";

      if (confrere.typeConfrere === "sortant") {
        for (const ligne of confrere.lignes) {
          const stock = await prisma.stock.findFirst({
            where: {
              projetUid,
              produit: { nom: ligne.produitNom },
              ...(ligne.numeroLot ? { numeroLot: ligne.numeroLot } : {}),
              quantiteDisponible: { gte: ligne.quantite },
            },
          });

          if (stock) {
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
                motif: `Envoi confrère ${confrere.reference}`,
                utilisateurId: auth.user.firebaseUid,
              },
            });
          }
        }
      }

      await prisma.confrere.update({
        where: { id },
        data: {
          statut: nouveauStatut,
          dateEnvoi: new Date(),
          validePar: auth.user.firebaseUid,
          modifiePar: auth.user.firebaseUid,
        },
      });

      // Créer notification pour le destinataire si c'est un utilisateur app
      if (!confrere.isManuel && confrere.destinataireUid) {
        await prisma.notification.create({
          data: {
            projetUid: confrere.destinataireUid, // projetUid du destinataire
            type: "confrere_recu",
            titre: "Nouveau confrère reçu",
            message: `${confrere.etablissementDestination?.nom || "Un confrère"} vous a envoyé ${confrere.totalQuantite} articles. Accepter ou refuser?`,
            lienAction: `/dashboard/confreres?recus=true`,
            priorite: "haute",
          },
        });
      }

      await createHistoriqueEntry({
        projetUid,
        module: "confreres",
        action: "envoyer",
        entiteId: confrere.id,
        entiteNom: confrere.reference,
        description: `Envoi du confrère ${confrere.reference}`,
        donneesAvant: { statut: "en_cours" },
        donneesApres: { statut: nouveauStatut, dateEnvoi: new Date() },
        utilisateurId: auth.user.firebaseUid,
        utilisateurEmail: auth.user.email || undefined,
      });

      return NextResponse.json({ message: "Confrère envoyé", statut: nouveauStatut });
    }

    // Confirmer paiement reçu (créateur - clôture le confrère)
    if (action === "confirmer_paiement" && isCreateur) {
      if (confrere.statut !== "en_attente_paiement") {
        return NextResponse.json({ error: "Le confrère n'est pas en attente de paiement" }, { status: 400 });
      }

      await prisma.confrere.update({
        where: { id },
        data: {
          statut: "paiement_confirme",
          datePaiement: new Date(),
          montantPaye: montantPaye || confrere.montantDu,
          modePaiement: modePaiement || null,
          notePaiement: notePaiement || null,
          modifiePar: auth.user.firebaseUid,
        },
      });

      await createHistoriqueEntry({
        projetUid,
        module: "confreres",
        action: "paiement_confirme",
        entiteId: confrere.id,
        entiteNom: confrere.reference,
        description: `Paiement confirmé pour le confrère ${confrere.reference} (${montantPaye || confrere.montantDu} MAD)`,
        donneesAvant: { statut: "en_attente_paiement" },
        donneesApres: { statut: "paiement_confirme", montantPaye: montantPaye || confrere.montantDu },
        utilisateurId: auth.user.firebaseUid,
        utilisateurEmail: auth.user.email || undefined,
      });

      return NextResponse.json({ message: "Paiement confirmé", statut: "paiement_confirme" });
    }

    // Clôturer manuellement (pour établissements manuels)
    if (action === "cloturer" && isCreateur) {
      if (!["en_attente_paiement", "paiement_confirme", "accepte"].includes(confrere.statut)) {
        return NextResponse.json({ error: "Le confrère ne peut pas être clôturé dans cet état" }, { status: 400 });
      }

      await prisma.confrere.update({
        where: { id },
        data: {
          statut: "termine",
          dateCloture: new Date(),
          modifiePar: auth.user.firebaseUid,
        },
      });

      await createHistoriqueEntry({
        projetUid,
        module: "confreres",
        action: "cloturer",
        entiteId: confrere.id,
        entiteNom: confrere.reference,
        description: `Clôture du confrère ${confrere.reference}`,
        donneesAvant: { statut: confrere.statut },
        donneesApres: { statut: "termine", dateCloture: new Date() },
        utilisateurId: auth.user.firebaseUid,
        utilisateurEmail: auth.user.email || undefined,
      });

      return NextResponse.json({ message: "Confrère clôturé", statut: "termine" });
    }

    // ========================================
    // Actions du DESTINATAIRE (récepteur)
    // ========================================

    // Accepter le confrère
    if (action === "accepter" && isDestinataire) {
      if (confrere.statut !== "en_attente_acceptation") {
        return NextResponse.json({ error: "Ce confrère n'est pas en attente d'acceptation" }, { status: 400 });
      }

      const destinataireProjetUid = getProjetUid(auth);

      for (const ligne of confrere.lignes) {
        let produit = await prisma.produit.findFirst({
          where: {
            projetUid: destinataireProjetUid,
            nom: { equals: ligne.produitNom, mode: "insensitive" },
          },
        });

        if (!produit) {
          produit = await prisma.produit.create({
            data: {
              projetUid: destinataireProjetUid,
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
            projetUid: destinataireProjetUid,
            produitId: produit.id,
            numeroLot: ligne.numeroLot || `CFR-${confrere.reference}-${Date.now()}`,
            quantiteDisponible: ligne.quantite,
            prixAchat: Number(ligne.prixUnit),
            prixVente: Number(ligne.prixUnit),
            dateExpiration: ligne.dateExpiration || null,
            actif: true,
            creePar: auth.user.firebaseUid,
          },
        });

        await prisma.historiqueInventaire.create({
          data: {
            projetUid: destinataireProjetUid,
            stockId: newStock.id,
            action: "entree",
            quantite: ligne.quantite,
            ancienneValeur: "0",
            nouvelleValeur: String(ligne.quantite),
            motif: `Réception confrère ${confrere.reference}`,
            utilisateurId: auth.user.firebaseUid,
          },
        });
      }

      await prisma.confrere.update({
        where: { id },
        data: {
          statut: "en_attente_paiement",
          dateAcceptation: new Date(),
          dateReception: new Date(),
          recuPar: auth.user.firebaseUid,
          modifiePar: auth.user.firebaseUid,
        },
      });

      // Notifier le créateur
      await prisma.notification.create({
        data: {
          projetUid: confrere.projetUid,
          type: "confrere_accepte",
          titre: "Confrère accepté",
          message: `Votre confrère ${confrere.reference} a été accepté. En attente du paiement.`,
          lienAction: `/dashboard/confreres`,
          priorite: "haute",
        },
      });

      await createHistoriqueEntry({
        projetUid: confrere.projetUid,
        module: "confreres",
        action: "accepter",
        entiteId: confrere.id,
        entiteNom: confrere.reference,
        description: `Confrère ${confrere.reference} accepté par le destinataire`,
        donneesAvant: { statut: "en_attente_acceptation" },
        donneesApres: { statut: "en_attente_paiement", dateAcceptation: new Date() },
        utilisateurId: auth.user.firebaseUid,
        utilisateurEmail: auth.user.email || undefined,
      });

      return NextResponse.json({ message: "Confrère accepté", statut: "en_attente_paiement" });
    }

    // Refuser le confrère
    if (action === "refuser" && isDestinataire) {
      if (confrere.statut !== "en_attente_acceptation") {
        return NextResponse.json({ error: "Ce confrère n'est pas en attente d'acceptation" }, { status: 400 });
      }

      if (confrere.typeConfrere === "sortant") {
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
              data: {
                quantiteDisponible: { increment: ligne.quantite },
              },
            });

            await prisma.historiqueInventaire.create({
              data: {
                projetUid: confrere.projetUid,
                stockId: stock.id,
                action: "entree",
                quantite: ligne.quantite,
                ancienneValeur: String(stock.quantiteDisponible),
                nouvelleValeur: String(stock.quantiteDisponible + ligne.quantite),
                motif: `Retour stock - Confrère ${confrere.reference} refusé`,
                utilisateurId: auth.user.firebaseUid,
              },
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

      // Notifier le créateur
      await prisma.notification.create({
        data: {
          projetUid: confrere.projetUid,
          type: "confrere_refuse",
          titre: "Confrère refusé",
          message: `Votre confrère ${confrere.reference} a été refusé.${motifRefus ? ` Motif: ${motifRefus}` : ""}`,
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
        description: `Confrère ${confrere.reference} refusé${motifRefus ? `: ${motifRefus}` : ""}`,
        donneesAvant: { statut: "en_attente_acceptation" },
        donneesApres: { statut: "refuse", motifRefus },
        utilisateurId: auth.user.firebaseUid,
        utilisateurEmail: auth.user.email || undefined,
      });

      return NextResponse.json({ message: "Confrère refusé", statut: "refuse" });
    }

    // ========================================
    // Actions communes
    // ========================================

    // Annuler
    if (action === "annuler") {
      if (["termine", "annule"].includes(confrere.statut)) {
        return NextResponse.json({ error: "Confrère déjà terminé ou annulé" }, { status: 400 });
      }

      if (!isCreateur && confrere.statut !== "refuse") {
        return NextResponse.json({ error: "Seul le créateur peut annuler ce confrère" }, { status: 403 });
      }

      const ancienStatut = confrere.statut;

      if (confrere.typeConfrere === "sortant" && ["en_attente_acceptation", "en_attente_paiement"].includes(ancienStatut)) {
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
              data: {
                quantiteDisponible: { increment: ligne.quantite },
              },
            });

            await prisma.historiqueInventaire.create({
              data: {
                projetUid: confrere.projetUid,
                stockId: stock.id,
                action: "entree",
                quantite: ligne.quantite,
                ancienneValeur: String(stock.quantiteDisponible),
                nouvelleValeur: String(stock.quantiteDisponible + ligne.quantite),
                motif: `Retour stock - Confrère ${confrere.reference} annulé`,
                utilisateurId: auth.user.firebaseUid,
              },
            });
          }
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
        description: `Annulation du confrère ${confrere.reference} (était: ${ancienStatut})`,
        donneesAvant: { statut: ancienStatut },
        donneesApres: { statut: "annule" },
        utilisateurId: auth.user.firebaseUid,
        utilisateurEmail: auth.user.email || undefined,
      });

      return NextResponse.json({ message: "Confrère annulé", statut: "annule" });
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
      include: {
        etablissementSource: { select: { nom: true } },
        etablissementDestination: { select: { nom: true } },
      },
    });

    if (!confrere) {
      return NextResponse.json({ error: "Confrère non trouvé" }, { status: 404 });
    }

    if (confrere.statut !== "en_cours") {
      return NextResponse.json({ error: "Seul un confrère en cours peut être supprimé" }, { status: 400 });
    }

    await prisma.confrere.update({
      where: { id },
      data: { actif: false, modifiePar: auth.user.firebaseUid },
    });

    const partenaireNom = confrere.etablissementDestination?.nom || confrere.etablissementSource?.nom || "Partenaire";

    await createHistoriqueEntry({
      projetUid,
      module: "confreres",
      action: "supprimer",
      entiteId: confrere.id,
      entiteNom: confrere.reference,
      description: `Suppression du confrère ${confrere.reference} avec ${partenaireNom}`,
      donneesAvant: confrere,
      utilisateurId: auth.user.firebaseUid,
      utilisateurEmail: auth.user.email || undefined,
    });

    return NextResponse.json({ message: "Confrère supprimé" });
  } catch (error) {
    console.error("Erreur DELETE confrère:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
