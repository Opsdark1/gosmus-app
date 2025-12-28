import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/firebase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

/**
 * DELETE /api/auth/delete-account
 * 
 * Elimina completamente la cuenta del propietario y todos sus datos asociados.
 * Esto incluye:
 * - Todos los empleados y sus cuentas Firebase
 * - Todos los datos de las 23 tablas del proyecto
 * - La cuenta Firebase del propietario
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req, { requireProprietaire: true });
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const firebaseUid = auth.user.firebaseUid;
    const userId = auth.user.id;

    console.log(`Iniciando eliminación completa de cuenta: ${firebaseUid}`);

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
            console.log(`Empleado Firebase eliminado: ${employe.firebaseUid}`);
          } catch (e) {
            console.warn(`No se pudo eliminar empleado Firebase ${employe.firebaseUid}:`, e);
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

      console.log(`Todos los datos eliminados para: ${firebaseUid}`);
    });

    // Eliminar usuario de Firebase
    try {
      await adminAuth.deleteUser(firebaseUid);
      console.log(`Usuario Firebase eliminado: ${firebaseUid}`);
    } catch (e) {
      console.warn(`No se pudo eliminar usuario Firebase ${firebaseUid}:`, e);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Compte et toutes les données supprimés avec succès" 
    });
  } catch (error) {
    console.error("Erreur DELETE /api/auth/delete-account:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du compte" },
      { status: 500 }
    );
  }
}
