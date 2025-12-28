import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getProjetUid, checkPermission } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "rapports", "voir");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "dashboard";
    const dateDebut = searchParams.get("dateDebut");
    const dateFin = searchParams.get("dateFin");
    const periode = searchParams.get("periode") || "mois"; // jour, semaine, mois, annee, tout

    const projetUid = getProjetUid(auth);

    let dateFilter: { gte?: Date; lte?: Date } = {};
    
    if (dateDebut && dateFin) {
      dateFilter = {
        gte: new Date(dateDebut),
        lte: new Date(dateFin + "T23:59:59"),
      };
    } else {
      const now = new Date();
      switch (periode) {
        case "jour":
          dateFilter = {
            gte: new Date(now.setHours(0, 0, 0, 0)),
            lte: new Date(),
          };
          break;
        case "semaine":
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          dateFilter = {
            gte: new Date(weekStart.setHours(0, 0, 0, 0)),
            lte: new Date(),
          };
          break;
        case "mois":
          dateFilter = {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lte: new Date(),
          };
          break;
        case "annee":
          dateFilter = {
            gte: new Date(now.getFullYear(), 0, 1),
            lte: new Date(),
          };
          break;
        case "tout":
          break;
      }
    }

    let rapport;

    switch (type) {
      case "dashboard":
        rapport = await getDashboardStats(projetUid, dateFilter);
        break;
      case "ventes":
        rapport = await getVentesReport(projetUid, dateFilter);
        break;
      case "stocks":
        rapport = await getStocksReport(projetUid);
        break;
      case "clients":
        rapport = await getClientsReport(projetUid, dateFilter);
        break;
      case "fournisseurs":
        rapport = await getFournisseursReport(projetUid, dateFilter);
        break;
      case "produits":
        rapport = await getProduitsReport(projetUid, dateFilter);
        break;
      case "financier":
        rapport = await getFinancierReport(projetUid, dateFilter);
        break;
      case "tendances":
        rapport = await getTendancesReport(projetUid);
        break;
      default:
        return NextResponse.json({ error: "Type de rapport invalide" }, { status: 400 });
    }

    return NextResponse.json({ rapport, type, periode, dateDebut, dateFin });
  } catch (error) {
    console.error("Erreur GET /api/rapports:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

async function getDashboardStats(projetUid: string, dateFilter: { gte?: Date; lte?: Date }) {
  const [
    ventesToday,
    ventesMonth,
    totalClients,
    totalProduits,
    totalStocks,
    stocksBas,
    stocksExpires,
    ventesRecentes,
    topProduits,
    ventesByDay,
  ] = await Promise.all([
    prisma.vente.aggregate({
      where: {
        projetUid,
        actif: true,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.vente.aggregate({
      where: {
        projetUid,
        actif: true,
        ...(dateFilter.gte && { createdAt: dateFilter }),
      },
      _sum: { total: true, montantPaye: true, montantDu: true },
      _count: true,
    }),
    prisma.client.count({
      where: { projetUid, actif: true },
    }),
    prisma.produit.count({
      where: { projetUid, actif: true },
    }),
    prisma.stock.aggregate({
      where: { projetUid, actif: true },
      _sum: { quantiteDisponible: true },
      _count: true,
    }),
    prisma.stock.count({
      where: {
        projetUid,
        actif: true,
        quantiteDisponible: { lte: prisma.stock.fields.seuilAlerte },
      },
    }),
    prisma.stock.count({
      where: {
        projetUid,
        actif: true,
        dateExpiration: { lte: new Date() },
      },
    }),
    prisma.vente.findMany({
      where: { projetUid, actif: true },
      select: {
        id: true,
        reference: true,
        total: true,
        statut: true,
        createdAt: true,
        client: { select: { nom: true, prenom: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.ligneVente.groupBy({
      by: ["stockId"],
      where: {
        vente: { projetUid, actif: true, ...(dateFilter.gte && { createdAt: dateFilter }) },
      },
      _sum: { quantite: true, total: true },
      orderBy: { _sum: { quantite: "desc" } },
      take: 10,
    }),
    getVentesByDay(projetUid, 7),
  ]);

  const topProduitsEnriched = await Promise.all(
    topProduits.map(async (item) => {
      const stock = await prisma.stock.findUnique({
        where: { id: item.stockId },
        include: { produit: { select: { nom: true } } },
      });
      return {
        produitNom: stock?.produit?.nom || "Produit inconnu",
        quantiteVendue: item._sum.quantite || 0,
        chiffreAffaires: item._sum.total || 0,
      };
    })
  );

  return {
    ventesToday: {
      total: Number(ventesToday._sum.total) || 0,
      count: ventesToday._count,
    },
    ventesMonth: {
      total: Number(ventesMonth._sum.total) || 0,
      paye: Number(ventesMonth._sum.montantPaye) || 0,
      du: Number(ventesMonth._sum.montantDu) || 0,
      count: ventesMonth._count,
    },
    clients: totalClients,
    produits: totalProduits,
    stocks: {
      total: totalStocks._count,
      quantite: totalStocks._sum.quantiteDisponible || 0,
      bas: stocksBas,
      expires: stocksExpires,
    },
    ventesRecentes,
    topProduits: topProduitsEnriched,
    ventesByDay,
  };
}

async function getVentesReport(projetUid: string, dateFilter: { gte?: Date; lte?: Date }) {
  const [stats, parStatut, parTypePaiement, parVendeur, parJour, parClient] = await Promise.all([
    prisma.vente.aggregate({
      where: { projetUid, actif: true, ...(dateFilter.gte && { createdAt: dateFilter }) },
      _sum: { total: true, montantPaye: true, montantDu: true, remise: true },
      _count: true,
      _avg: { total: true },
    }),
    prisma.vente.groupBy({
      by: ["statut"],
      where: { projetUid, actif: true, ...(dateFilter.gte && { createdAt: dateFilter }) },
      _count: true,
      _sum: { total: true },
    }),
    prisma.vente.groupBy({
      by: ["typePaiement"],
      where: { projetUid, actif: true, ...(dateFilter.gte && { createdAt: dateFilter }) },
      _count: true,
      _sum: { total: true },
    }),
    prisma.vente.groupBy({
      by: ["vendeurNom"],
      where: { projetUid, actif: true, ...(dateFilter.gte && { createdAt: dateFilter }) },
      _count: true,
      _sum: { total: true },
    }),
    getVentesByDay(projetUid, 30, dateFilter),
    prisma.vente.groupBy({
      by: ["clientId"],
      where: { projetUid, actif: true, clientId: { not: null }, ...(dateFilter.gte && { createdAt: dateFilter }) },
      _count: true,
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 10,
    }),
  ]);

  const topClients = await Promise.all(
    parClient.map(async (item) => {
      const client = await prisma.client.findUnique({
        where: { id: item.clientId! },
        select: { nom: true, prenom: true },
      });
      return {
        clientNom: client ? `${client.nom} ${client.prenom || ""}`.trim() : "Client inconnu",
        nbVentes: item._count,
        totalAchats: Number(item._sum.total) || 0,
      };
    })
  );

  return {
    resume: {
      totalVentes: Number(stats._sum.total) || 0,
      totalPaye: Number(stats._sum.montantPaye) || 0,
      totalDu: Number(stats._sum.montantDu) || 0,
      totalRemise: Number(stats._sum.remise) || 0,
      nombreVentes: stats._count,
      moyenneVente: Number(stats._avg.total) || 0,
    },
    parStatut: parStatut.map((s) => ({
      statut: s.statut,
      count: s._count,
      total: Number(s._sum.total) || 0,
    })),
    parTypePaiement: parTypePaiement.map((t) => ({
      type: t.typePaiement,
      count: t._count,
      total: Number(t._sum.total) || 0,
    })),
    parVendeur: parVendeur
      .filter((v) => v.vendeurNom)
      .map((v) => ({
        vendeur: v.vendeurNom,
        count: v._count,
        total: Number(v._sum.total) || 0,
      })),
    evolution: parJour,
    topClients,
  };
}

async function getStocksReport(projetUid: string) {
  const [stats, stocksBas, stocksExpires, stocksExpirantBientot, parCategorie, valeurStock] = await Promise.all([
    prisma.stock.aggregate({
      where: { projetUid, actif: true },
      _sum: { quantiteDisponible: true },
      _count: true,
    }),
    prisma.stock.findMany({
      where: {
        projetUid,
        actif: true,
        quantiteDisponible: { lte: 10 },
      },
      include: {
        produit: { select: { nom: true, codeBarre: true } },
        fournisseur: { select: { nom: true } },
      },
      orderBy: { quantiteDisponible: "asc" },
      take: 20,
    }),
    prisma.stock.findMany({
      where: {
        projetUid,
        actif: true,
        dateExpiration: { lte: new Date() },
      },
      include: {
        produit: { select: { nom: true } },
      },
      take: 20,
    }),
    prisma.stock.findMany({
      where: {
        projetUid,
        actif: true,
        dateExpiration: {
          gt: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        produit: { select: { nom: true } },
      },
      orderBy: { dateExpiration: "asc" },
      take: 20,
    }),
    prisma.stock.findMany({
      where: { projetUid, actif: true },
      include: {
        produit: {
          select: { type: true, categorieId: true, categorie: { select: { nom: true } } },
        },
      },
    }),
    prisma.stock.findMany({
      where: { projetUid, actif: true },
      select: { quantiteDisponible: true, prixAchat: true, prixVente: true },
    }),
  ]);

  const valeurAchat = valeurStock.reduce(
    (sum, s) => sum + s.quantiteDisponible * Number(s.prixAchat),
    0
  );
  const valeurVente = valeurStock.reduce(
    (sum, s) => sum + s.quantiteDisponible * Number(s.prixVente),
    0
  );

  const parType: Record<string, { count: number; quantite: number }> = {};
  parCategorie.forEach((s) => {
    const type = s.produit.type || "Non classé";
    if (!parType[type]) parType[type] = { count: 0, quantite: 0 };
    parType[type].count++;
    parType[type].quantite += s.quantiteDisponible;
  });

  return {
    resume: {
      totalArticles: stats._count,
      totalQuantite: stats._sum.quantiteDisponible || 0,
      valeurAchat,
      valeurVente,
      margeEstimee: valeurVente - valeurAchat,
    },
    alertes: {
      stocksBas: stocksBas.map((s) => ({
        id: s.id,
        produit: s.produit?.nom,
        codeBarre: s.produit?.codeBarre,
        fournisseur: s.fournisseur?.nom,
        quantite: s.quantiteDisponible,
        seuil: s.seuilAlerte,
      })),
      expires: stocksExpires.map((s) => ({
        id: s.id,
        produit: s.produit?.nom,
        dateExpiration: s.dateExpiration,
        quantite: s.quantiteDisponible,
      })),
      expirantBientot: stocksExpirantBientot.map((s) => ({
        id: s.id,
        produit: s.produit?.nom,
        dateExpiration: s.dateExpiration,
        quantite: s.quantiteDisponible,
      })),
    },
    parType: Object.entries(parType).map(([type, data]) => ({
      type,
      ...data,
    })),
  };
}

async function getClientsReport(projetUid: string, dateFilter: { gte?: Date; lte?: Date }) {
  const [stats, topClients, clientsAvecDettes, nouveauxClients] = await Promise.all([
    prisma.client.aggregate({
      where: { projetUid, actif: true },
      _sum: { solde: true, credit: true },
      _count: true,
    }),
    prisma.vente.groupBy({
      by: ["clientId"],
      where: { projetUid, actif: true, clientId: { not: null }, ...(dateFilter.gte && { createdAt: dateFilter }) },
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: "desc" } },
      take: 20,
    }),
    prisma.client.findMany({
      where: { projetUid, actif: true, solde: { gt: 0 } },
      orderBy: { solde: "desc" },
      take: 20,
    }),
    prisma.client.count({
      where: { projetUid, actif: true, ...(dateFilter.gte && { createdAt: dateFilter }) },
    }),
  ]);

  const topClientsEnriched = await Promise.all(
    topClients.map(async (item) => {
      const client = await prisma.client.findUnique({
        where: { id: item.clientId! },
      });
      return {
        id: item.clientId,
        nom: client ? `${client.nom} ${client.prenom || ""}`.trim() : "Inconnu",
        telephone: client?.telephone,
        nbVentes: item._count,
        totalAchats: Number(item._sum.total) || 0,
        solde: Number(client?.solde) || 0,
      };
    })
  );

  return {
    resume: {
      totalClients: stats._count,
      totalDettes: Number(stats._sum.solde) || 0,
      totalCredits: Number(stats._sum.credit) || 0,
      nouveauxClients,
    },
    topClients: topClientsEnriched,
    clientsAvecDettes: clientsAvecDettes.map((c) => ({
      id: c.id,
      nom: `${c.nom} ${c.prenom || ""}`.trim(),
      telephone: c.telephone,
      solde: Number(c.solde),
    })),
  };
}

async function getFournisseursReport(projetUid: string, dateFilter: { gte?: Date; lte?: Date }) {
  const [stats, topFournisseurs, commandesEnAttente] = await Promise.all([
    prisma.fournisseur.count({
      where: { projetUid, actif: true },
    }),
    prisma.stock.groupBy({
      by: ["fournisseurId"],
      where: { projetUid, actif: true, fournisseurId: { not: null } },
      _sum: { quantiteDisponible: true },
      _count: true,
    }),
    prisma.commande.findMany({
      where: { projetUid, actif: true, statut: { in: ["en_attente", "confirmee"] } },
      include: { fournisseur: { select: { nom: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const topFournisseursEnriched = await Promise.all(
    topFournisseurs.map(async (item) => {
      const fournisseur = await prisma.fournisseur.findUnique({
        where: { id: item.fournisseurId! },
      });
      return {
        id: item.fournisseurId,
        nom: fournisseur?.nom || "Inconnu",
        nbArticles: item._count,
        quantiteTotale: item._sum.quantiteDisponible || 0,
      };
    })
  );

  return {
    resume: {
      totalFournisseurs: stats,
      commandesEnAttente: commandesEnAttente.length,
    },
    topFournisseurs: topFournisseursEnriched.sort((a, b) => b.quantiteTotale - a.quantiteTotale).slice(0, 10),
    commandesEnAttente: commandesEnAttente.map((c) => ({
      id: c.id,
      reference: c.reference,
      fournisseur: c.fournisseur?.nom,
      total: Number(c.total),
      statut: c.statut,
      createdAt: c.createdAt,
    })),
  };
}

async function getProduitsReport(projetUid: string, dateFilter: { gte?: Date; lte?: Date }) {
  const [stats, topVendus, moinsVendus, parType] = await Promise.all([
    prisma.produit.count({
      where: { projetUid, actif: true },
    }),
    prisma.ligneVente.groupBy({
      by: ["stockId"],
      where: { vente: { projetUid, actif: true, ...(dateFilter.gte && { createdAt: dateFilter }) } },
      _sum: { quantite: true, total: true },
      orderBy: { _sum: { quantite: "desc" } },
      take: 20,
    }),
    prisma.stock.findMany({
      where: {
        projetUid,
        actif: true,
        quantiteDisponible: { gt: 0 },
      },
      include: {
        produit: { select: { nom: true, type: true } },
        _count: { select: { lignesVente: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.produit.groupBy({
      by: ["type"],
      where: { projetUid, actif: true },
      _count: true,
    }),
  ]);

  const topVendusEnriched = await Promise.all(
    topVendus.map(async (item) => {
      const stock = await prisma.stock.findUnique({
        where: { id: item.stockId },
        include: { produit: { select: { nom: true, type: true } } },
      });
      return {
        produit: stock?.produit?.nom || "Inconnu",
        type: stock?.produit?.type,
        quantiteVendue: item._sum.quantite || 0,
        chiffreAffaires: Number(item._sum.total) || 0,
      };
    })
  );

  const peuVendus = moinsVendus
    .filter((s) => s._count.lignesVente === 0)
    .map((s) => ({
      id: s.id,
      produit: s.produit?.nom,
      type: s.produit?.type,
      quantite: s.quantiteDisponible,
    }))
    .slice(0, 20);

  return {
    resume: {
      totalProduits: stats,
      produitsVendus: topVendus.length,
      produitsNonVendus: peuVendus.length,
    },
    topVendus: topVendusEnriched,
    peuVendus,
    parType: parType.map((t) => ({
      type: t.type || "Non classé",
      count: t._count,
    })),
  };
}

async function getFinancierReport(projetUid: string, dateFilter: { gte?: Date; lte?: Date }) {
  const [ventes, achats, factures, avoirs, dettesClients] = await Promise.all([
    prisma.vente.aggregate({
      where: { projetUid, actif: true, ...(dateFilter.gte && { createdAt: dateFilter }) },
      _sum: { total: true, montantPaye: true, montantDu: true, remise: true },
    }),
    prisma.commande.aggregate({
      where: { projetUid, actif: true, statut: "livree", ...(dateFilter.gte && { createdAt: dateFilter }) },
      _sum: { total: true },
    }),
    prisma.facture.aggregate({
      where: { projetUid, actif: true, ...(dateFilter.gte && { createdAt: dateFilter }) },
      _sum: { total: true, tva: true },
      _count: true,
    }),
    prisma.avoir.aggregate({
      where: { projetUid, actif: true, ...(dateFilter.gte && { createdAt: dateFilter }) },
      _sum: { montant: true },
      _count: true,
    }),
    prisma.client.aggregate({
      where: { projetUid, actif: true },
      _sum: { solde: true },
    }),
  ]);

  const chiffreAffaires = Number(ventes._sum.total) || 0;
  const coutAchats = Number(achats._sum.total) || 0;
  const margeBrute = chiffreAffaires - coutAchats;

  return {
    resume: {
      chiffreAffaires,
      coutAchats,
      margeBrute,
      tauxMarge: chiffreAffaires > 0 ? ((margeBrute / chiffreAffaires) * 100).toFixed(2) : 0,
    },
    encaissements: {
      total: Number(ventes._sum.montantPaye) || 0,
      enAttente: Number(ventes._sum.montantDu) || 0,
      remises: Number(ventes._sum.remise) || 0,
    },
    factures: {
      count: factures._count,
      total: Number(factures._sum.total) || 0,
      tva: Number(factures._sum.tva) || 0,
    },
    avoirs: {
      count: avoirs._count,
      total: Number(avoirs._sum.montant) || 0,
    },
    dettes: {
      clients: Number(dettesClients._sum.solde) || 0,
    },
  };
}

async function getTendancesReport(projetUid: string) {
  const now = new Date();
  const moisActuel = await getVentesByDay(projetUid, 30);
  const moisPrecedent = await getVentesByDay(projetUid, 30, {
    gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    lte: new Date(now.getFullYear(), now.getMonth(), 0),
  });

  const totalMoisActuel = moisActuel.reduce((sum, d) => sum + d.total, 0);
  const totalMoisPrecedent = moisPrecedent.reduce((sum, d) => sum + d.total, 0);
  const evolution = totalMoisPrecedent > 0 
    ? ((totalMoisActuel - totalMoisPrecedent) / totalMoisPrecedent * 100).toFixed(2)
    : 0;

  return {
    moisActuel: {
      total: totalMoisActuel,
      jours: moisActuel,
    },
    moisPrecedent: {
      total: totalMoisPrecedent,
      jours: moisPrecedent,
    },
    evolution: Number(evolution),
  };
}

async function getVentesByDay(
  projetUid: string,
  days: number,
  dateFilter?: { gte?: Date; lte?: Date }
) {
  const endDate = dateFilter?.lte || new Date();
  const startDate = dateFilter?.gte || new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const ventes = await prisma.vente.findMany({
    where: {
      projetUid,
      actif: true,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      total: true,
      createdAt: true,
    },
  });

  const parJour: Record<string, { count: number; total: number }> = {};
  ventes.forEach((v) => {
    const jour = v.createdAt.toISOString().split("T")[0];
    if (!parJour[jour]) parJour[jour] = { count: 0, total: 0 };
    parJour[jour].count++;
    parJour[jour].total += Number(v.total);
  });

  return Object.entries(parJour)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
