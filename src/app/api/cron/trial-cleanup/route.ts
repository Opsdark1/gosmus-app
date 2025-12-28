import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/firebase-admin";
import { addDays } from "date-fns";
import { PURGE_DAYS_TRIAL, PURGE_DAYS_SUBSCRIPTION } from "@/lib/constants";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const vercelCron = req.headers.get("x-vercel-cron");
  const cronSecret = process.env.CRON_SECRET;
  
  const isVercelCron = vercelCron === "1";
  const hasValidToken = cronSecret && authHeader === `Bearer ${cronSecret}`;
  
  if (!isVercelCron && !hasValidToken) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();
  const results = {
    trialExpiredDeactivated: 0,
    subscriptionExpiredDeactivated: 0,
    trialPurged: 0,
    subscriptionPurged: 0,
    orphanedCleaned: 0,
    employeesDeactivated: 0,
    errors: [] as string[],
  };

  try {
    const allProprietaires = await prisma.utilisateur.findMany({
      where: { isProprietaire: true },
      select: { id: true, firebaseUid: true, email: true },
    });

    for (const prop of allProprietaires) {
      try {
        await adminAuth.getUser(prop.firebaseUid);
      } catch (firebaseError) {
        const errorMessage = firebaseError instanceof Error ? firebaseError.message : String(firebaseError);
        if (errorMessage.includes("no user record") || errorMessage.includes("user-not-found")) {
          try {
            console.log(`Nettoyage compte orphelin: ${prop.firebaseUid} (${prop.email})`);
            await deleteUserCompletely(prop.firebaseUid, prop.id, true);
            results.orphanedCleaned++;
          } catch (cleanupError) {
            const msg = `Erreur nettoyage orphelin ${prop.firebaseUid}: ${cleanupError}`;
            console.error(msg);
            results.errors.push(msg);
          }
        }
      }
    }

    const trialExpired = await prisma.utilisateur.findMany({
      where: {
        actif: true,
        isProprietaire: true,
        essaiFin: { lt: now },
        subscriptionStatus: null,
      },
      select: { id: true, firebaseUid: true, email: true },
    });

    if (trialExpired.length > 0) {
      await prisma.utilisateur.updateMany({
        where: { id: { in: trialExpired.map((u) => u.id) } },
        data: {
          actif: false,
          desactiveLe: now,
          supprimerApres: addDays(now, PURGE_DAYS_TRIAL),
          updatedAt: now,
        },
      });

      for (const user of trialExpired) {
        try {
          await adminAuth.updateUser(user.firebaseUid, { disabled: true });
          results.trialExpiredDeactivated++;
        } catch (e) {
          results.errors.push(`Erreur désactivation trial Firebase ${user.firebaseUid}: ${e}`);
        }
        const employesCount = await deactivateEmployeesForOwner(user.firebaseUid, now);
        results.employeesDeactivated += employesCount;
      }
    }

    const subscriptionExpired = await prisma.utilisateur.findMany({
      where: {
        actif: true,
        isProprietaire: true,
        subscriptionEnd: { lt: now },
        subscriptionStatus: { in: ["active", "expired"] },
      },
      select: { id: true, firebaseUid: true, email: true },
    });

    if (subscriptionExpired.length > 0) {
      await prisma.utilisateur.updateMany({
        where: { id: { in: subscriptionExpired.map((u) => u.id) } },
        data: {
          actif: false,
          subscriptionStatus: "expired",
          desactiveLe: now,
          supprimerApres: addDays(now, PURGE_DAYS_SUBSCRIPTION),
          updatedAt: now,
        },
      });

      for (const user of subscriptionExpired) {
        try {
          await adminAuth.updateUser(user.firebaseUid, { disabled: true });
          results.subscriptionExpiredDeactivated++;
        } catch (e) {
          results.errors.push(`Erreur désactivation subscription Firebase ${user.firebaseUid}: ${e}`);
        }
        const employesCount = await deactivateEmployeesForOwner(user.firebaseUid, now);
        results.employeesDeactivated += employesCount;
      }
    }

    const trialToDelete = await prisma.utilisateur.findMany({
      where: {
        supprimerApres: { lt: now },
        isProprietaire: true,
        subscriptionStatus: null,
      },
      select: { id: true, firebaseUid: true, email: true },
    });

    for (const user of trialToDelete) {
      try {
        await deleteUserCompletely(user.firebaseUid, user.id, false);
        results.trialPurged++;
      } catch (e) {
        results.errors.push(`Erreur suppression trial ${user.firebaseUid}: ${e}`);
      }
    }

    const subscriptionToDelete = await prisma.utilisateur.findMany({
      where: {
        supprimerApres: { lt: now },
        isProprietaire: true,
        subscriptionStatus: "expired",
      },
      select: { id: true, firebaseUid: true, email: true },
    });

    for (const user of subscriptionToDelete) {
      try {
        await deleteUserCompletely(user.firebaseUid, user.id, false);
        results.subscriptionPurged++;
      } catch (e) {
        results.errors.push(`Erreur suppression subscription ${user.firebaseUid}: ${e}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      purgeDaysTrial: PURGE_DAYS_TRIAL,
      purgeDaysSubscription: PURGE_DAYS_SUBSCRIPTION,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Erreur CRON trial-cleanup:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: String(error) },
      { status: 500 }
    );
  }
}

async function deactivateEmployeesForOwner(ownerFirebaseUid: string, now: Date): Promise<number> {
  const employes = await prisma.employe.findMany({
    where: { projetUid: ownerFirebaseUid, actif: true },
    select: { id: true, firebaseUid: true },
  });

  if (employes.length === 0) return 0;

  await prisma.employe.updateMany({
    where: { 
      projetUid: ownerFirebaseUid,
      actif: true,
    },
    data: {
      actif: false,
      modifiePar: "system",
      updatedAt: now,
    },
  });

  await prisma.utilisateur.updateMany({
    where: {
      firebaseUid: { in: employes.filter(e => e.firebaseUid).map(e => e.firebaseUid!) },
      actif: true,
    },
    data: {
      actif: false,
      desactiveLe: now,
      updatedAt: now,
    },
  });

  for (const emp of employes) {
    if (emp.firebaseUid) {
      try {
        await adminAuth.updateUser(emp.firebaseUid, { disabled: true });
      } catch (e) {
        console.warn(`Impossible de désactiver Firebase employé ${emp.firebaseUid}:`, e);
      }
    }
  }

  return employes.length;
}

/**
 * Elimina completamente un usuario propietario y todos sus datos de las 23 tablas.
 * También elimina los empleados asociados de Firebase.
 */
async function deleteUserCompletely(firebaseUid: string, userId: string, skipFirebaseOwnerDelete: boolean = false): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Encontrar y eliminar empleados de Firebase
    const employes = await tx.employe.findMany({
      where: { creePar: firebaseUid },
      select: { id: true, firebaseUid: true },
    });

    for (const employe of employes) {
      if (employe.firebaseUid) {
        try {
          await adminAuth.deleteUser(employe.firebaseUid);
        } catch (e) {
          console.warn(`Impossible de supprimer Firebase employé ${employe.firebaseUid}:`, e);
        }
      }
    }

    // 2. notification_lecture (depende de notifications)
    const notificationIds = await tx.notification.findMany({
      where: { projetUid: firebaseUid },
      select: { id: true },
    });
    if (notificationIds.length > 0) {
      await tx.notificationLecture.deleteMany({
        where: { notificationId: { in: notificationIds.map((n) => n.id) } },
      });
    }

    // 3. notifications
    await tx.notification.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 4. lignes_confrere (depende de confreres)
    const confreres = await tx.confrere.findMany({
      where: { projetUid: firebaseUid },
      select: { id: true },
    });
    if (confreres.length > 0) {
      await tx.ligneConfrere.deleteMany({
        where: { confrereId: { in: confreres.map((c) => c.id) } },
      });
    }

    // 5. confreres
    await tx.confrere.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 6. etablissements
    await tx.etablissement.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 7. historique_general
    await tx.historiqueGeneral.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 8. historique_inventaire
    await tx.historiqueInventaire.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 9. lignes_vente (depende de ventes)
    const ventes = await tx.vente.findMany({
      where: { projetUid: firebaseUid },
      select: { id: true },
    });
    if (ventes.length > 0) {
      await tx.ligneVente.deleteMany({
        where: { venteId: { in: ventes.map((v) => v.id) } },
      });
    }

    // 10. avoirs
    await tx.avoir.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 11. ventes
    await tx.vente.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 12. lignes_commande (depende de commandes)
    const commandes = await tx.commande.findMany({
      where: { projetUid: firebaseUid },
      select: { id: true },
    });
    if (commandes.length > 0) {
      await tx.ligneCommande.deleteMany({
        where: { commandeId: { in: commandes.map((c) => c.id) } },
      });
    }

    // 13. factures
    await tx.facture.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 14. commandes
    await tx.commande.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 15. stocks
    await tx.stock.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 16. produits
    await tx.produit.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 17. categories
    await tx.categorie.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 18. clients
    await tx.client.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 19. fournisseurs
    await tx.fournisseur.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 20. permissions (depende de roles)
    const roles = await tx.role.findMany({
      where: { projetUid: firebaseUid },
      select: { id: true },
    });
    if (roles.length > 0) {
      await tx.permission.deleteMany({
        where: { roleId: { in: roles.map((r) => r.id) } },
      });
    }

    // 21. roles
    await tx.role.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 22. employes - eliminar registros de la tabla employes
    await tx.employe.deleteMany({
      where: { creePar: firebaseUid },
    });

    // 23a. Eliminar usuarios empleados
    const employeFirebaseUids = employes.filter((e) => e.firebaseUid).map((e) => e.firebaseUid!);
    if (employeFirebaseUids.length > 0) {
      await tx.utilisateur.deleteMany({
        where: { firebaseUid: { in: employeFirebaseUids } },
      });
    }

    // 23b. audit_logs
    await tx.auditLog.deleteMany({
      where: { projetUid: firebaseUid },
    });

    // 23c. Finalmente eliminar el propietario
    await tx.utilisateur.delete({
      where: { id: userId },
    });
  });

  // Eliminar usuario de Firebase si es necesario
  if (!skipFirebaseOwnerDelete) {
    try {
      await adminAuth.deleteUser(firebaseUid);
    } catch (e) {
      console.warn(`Impossible de supprimer Firebase user ${firebaseUid}:`, e);
    }
  }
}
