import { prisma } from "@/lib/prisma";
import { APP_NAME } from "@/lib/constants";

type NotificationType = 
  | "stock_bas"
  | "stock_expire"
  | "stock_expire_bientot"
  | "credit_rappel"
  | "trial_reminder"
  | "subscription_reminder"
  | "paiement_du";

interface CreateNotificationParams {
  projetUid: string;
  type: NotificationType;
  titre: string;
  message: string;
  priorite?: "basse" | "normale" | "haute" | "critique";
  module?: string;
  entiteId?: string;
  entiteNom?: string;
  lienAction?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

export async function createNotification(params: CreateNotificationParams) {
  const {
    projetUid,
    type,
    titre,
    message,
    priorite = "normale",
    module,
    entiteId,
    entiteNom,
    lienAction,
    metadata,
    expiresAt,
  } = params;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const existing = await prisma.notification.findFirst({
    where: {
      projetUid,
      type,
      entiteId: entiteId || undefined,
      createdAt: { gte: startOfDay },
      actif: true,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.notification.create({
    data: {
      projetUid,
      type,
      titre,
      message,
      priorite,
      module,
      entiteId,
      entiteNom,
      lienAction,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      expiresAt,
    },
  });
}

export async function generateStockBasNotifications(projetUid: string) {
  const stocksBas = await prisma.stock.findMany({
    where: {
      projetUid,
      actif: true,
      quantiteDisponible: {
        lte: prisma.stock.fields.seuilAlerte,
      },
    },
    include: {
      produit: true,
    },
  });

  const stocksBasRaw = await prisma.$queryRaw<Array<{
    id: string;
    produit_id: string;
    produit_nom: string;
    quantite_disponible: number;
    seuil_alerte: number;
  }>>`
    SELECT s.id, s.produit_id, p.nom as produit_nom, s.quantite_disponible, s.seuil_alerte
    FROM stocks s
    JOIN produits p ON s.produit_id = p.id
    WHERE s.projet_uid = ${projetUid}
      AND s.actif = true
      AND s.quantite_disponible <= s.seuil_alerte
      AND s.quantite_disponible > 0
  `;

  for (const stock of stocksBasRaw) {
    await createNotification({
      projetUid,
      type: "stock_bas",
      titre: "Stock bas",
      message: `Le produit "${stock.produit_nom}" est en stock bas (${stock.quantite_disponible}/${stock.seuil_alerte} unités)`,
      priorite: stock.quantite_disponible <= 5 ? "haute" : "normale",
      module: "stocks",
      entiteId: stock.id,
      entiteNom: stock.produit_nom,
      lienAction: "/dashboard/stock-bas",
      metadata: {
        quantite: stock.quantite_disponible,
        seuil: stock.seuil_alerte,
      },
    });
  }

  return stocksBasRaw.length;
}

export async function generateExpirationNotifications(projetUid: string) {
  const today = new Date();
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  const expirantBientot = await prisma.stock.findMany({
    where: {
      projetUid,
      actif: true,
      quantiteDisponible: { gt: 0 },
      dateExpiration: {
        gt: today,
        lte: in30Days,
      },
    },
    include: {
      produit: true,
    },
  });

  for (const stock of expirantBientot) {
    const daysUntilExpiry = Math.ceil(
      (new Date(stock.dateExpiration!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    await createNotification({
      projetUid,
      type: "stock_expire_bientot",
      titre: "Expiration proche",
      message: `Le produit "${stock.produit.nom}" expire dans ${daysUntilExpiry} jours (${stock.quantiteDisponible} unités)`,
      priorite: daysUntilExpiry <= 7 ? "haute" : "normale",
      module: "stocks",
      entiteId: stock.id,
      entiteNom: stock.produit.nom,
      lienAction: "/dashboard/expirations",
      metadata: {
        dateExpiration: stock.dateExpiration,
        joursRestants: daysUntilExpiry,
        quantite: stock.quantiteDisponible,
      },
    });
  }

  const expires = await prisma.stock.findMany({
    where: {
      projetUid,
      actif: true,
      quantiteDisponible: { gt: 0 },
      dateExpiration: {
        lte: today,
      },
    },
    include: {
      produit: true,
    },
  });

  for (const stock of expires) {
    await createNotification({
      projetUid,
      type: "stock_expire",
      titre: "Produit expiré",
      message: `Le produit "${stock.produit.nom}" est expiré et doit être retiré du stock (${stock.quantiteDisponible} unités)`,
      priorite: "critique",
      module: "stocks",
      entiteId: stock.id,
      entiteNom: stock.produit.nom,
      lienAction: "/dashboard/expirations",
      metadata: {
        dateExpiration: stock.dateExpiration,
        quantite: stock.quantiteDisponible,
      },
    });
  }

  return { expirantBientot: expirantBientot.length, expires: expires.length };
}

export async function generateCreditNotifications(projetUid: string) {
  const clientsAvecCredit = await prisma.client.findMany({
    where: {
      projetUid,
      actif: true,
      solde: { gt: 0 },
    },
  });

  for (const client of clientsAvecCredit) {
    const solde = parseFloat(client.solde.toString());
    
    await createNotification({
      projetUid,
      type: "credit_rappel",
      titre: "Crédit client",
      message: `Le client "${client.nom}${client.prenom ? ' ' + client.prenom : ''}" a un crédit de ${solde.toFixed(2)} MAD en cours`,
      priorite: solde > 1000 ? "haute" : "normale",
      module: "clients",
      entiteId: client.id,
      entiteNom: `${client.nom}${client.prenom ? ' ' + client.prenom : ''}`,
      lienAction: "/dashboard/clients",
      metadata: {
        solde: solde,
        telephone: client.telephone,
      },
    });
  }

  return clientsAvecCredit.length;
}

export async function generateTrialNotifications() {
  const reminderDays = [15, 10, 5, 1];

  for (const days of reminderDays) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const users = await prisma.utilisateur.findMany({
      where: {
        actif: true,
        isProprietaire: true,
        essaiFin: {
          gte: targetDate,
          lt: nextDay,
        },
        subscriptionStatus: null, // Pas encore abonné
      },
    });

    for (const user of users) {
      const priorite = days <= 5 ? "haute" : "normale";

      await createNotification({
        projetUid: user.firebaseUid,
        type: "trial_reminder",
        titre: days === 1 
          ? "Dernier jour d'essai"
          : `Essai gratuit - ${days} jours restants`,
        message: days === 1
          ? `Votre période d'essai se termine demain. Abonnez-vous pour continuer à utiliser ${APP_NAME}.`
          : `Votre période d'essai gratuit se termine dans ${days} jours. Pensez à vous abonner pour conserver vos données.`,
        priorite,
        lienAction: "/dashboard?subscription=true",
        metadata: {
          joursRestants: days,
          essaiFin: user.essaiFin,
        },
        expiresAt: user.essaiFin || undefined,
      });
    }
  }
}

export async function generateSubscriptionNotifications() {
  const reminderDays = [15, 10, 5, 1];

  for (const days of reminderDays) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const users = await prisma.utilisateur.findMany({
      where: {
        actif: true,
        isProprietaire: true,
        subscriptionStatus: "active",
        subscriptionEnd: {
          gte: targetDate,
          lt: nextDay,
        },
      },
    });

    for (const user of users) {
      const priorite = days <= 5 ? "haute" : "normale";
      const typeAbo = user.subscriptionType === "mensuel" ? "mensuel" 
        : user.subscriptionType === "annuel" ? "annuel"
        : user.subscriptionType === "mensuel_ia" ? "mensuel avec IA"
        : user.subscriptionType === "annuel_ia" ? "annuel avec IA"
        : "votre abonnement";

      await createNotification({
        projetUid: user.firebaseUid,
        type: "subscription_reminder",
        titre: days === 1 
          ? "Dernier jour d'abonnement"
          : `Abonnement expire dans ${days} jours`,
        message: days === 1
          ? `Votre abonnement ${typeAbo} expire demain. Renouvelez-le pour continuer à utiliser ${APP_NAME}.`
          : `Votre abonnement ${typeAbo} expire dans ${days} jours. Pensez à le renouveler.`,
        priorite,
        lienAction: "/dashboard?subscription=true",
        metadata: {
          joursRestants: days,
          subscriptionEnd: user.subscriptionEnd,
          subscriptionType: user.subscriptionType,
        },
        expiresAt: user.subscriptionEnd || undefined,
      });
    }
  }
}

export async function generateAllNotifications(projetUid: string) {
  const results = {
    stockBas: 0,
    expirations: { expirantBientot: 0, expires: 0 },
    credits: 0,
  };

  results.stockBas = await generateStockBasNotifications(projetUid);
  results.expirations = await generateExpirationNotifications(projetUid);
  results.credits = await generateCreditNotifications(projetUid);

  return results;
}

export async function cleanupOldNotifications(projetUid: string) {
  const recentNotifs = await prisma.notification.findMany({
    where: { projetUid },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true },
  });

  const recentIds = recentNotifs.map((n) => n.id);

  const deleted = await prisma.notification.deleteMany({
    where: {
      projetUid,
      id: { notIn: recentIds },
    },
  });

  return deleted.count;
}
