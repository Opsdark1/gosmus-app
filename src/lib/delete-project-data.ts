import { prisma } from "@/lib/prisma";

/**
 * Elimina todos los datos de un proyecto/usuario de las 23 tablas de la base de datos.
 * Debe ejecutarse en orden para respetar las foreign keys.
 * 
 * Tablas afectadas (23 total):
 * 1. notification_lecture - lecturas de notificaciones
 * 2. notifications - notificaciones del proyecto
 * 3. lignes_transfert - líneas de transferencia
 * 4. transferts - transferencias entre establecimientos
 * 5. etablissements - establecimientos del proyecto
 * 6. historique_general - historial general
 * 7. historique_inventaire - historial de inventario
 * 8. lignes_vente - líneas de venta
 * 9. avoirs - notas de crédito
 * 10. ventes - ventas
 * 11. lignes_commande - líneas de comandas
 * 12. factures - facturas
 * 13. commandes - comandas
 * 14. stocks - inventario
 * 15. produits - productos
 * 16. categories - categorías
 * 17. clients - clientes
 * 18. fournisseurs - proveedores
 * 19. permissions - permisos de roles
 * 20. roles - roles del proyecto
 * 21. employes - relación empleados
 * 22. audit_logs - logs de auditoría
 * 23. utilisateurs - usuarios (propietario y empleados)
 */
export async function deleteProjectData(projetUid: string): Promise<{
  success: boolean;
  deletedCounts: Record<string, number>;
  error?: string;
}> {
  const deletedCounts: Record<string, number> = {};

  try {
    // Ejecutar en una transacción para garantizar consistencia
    await prisma.$transaction(async (tx) => {
      // 1. notification_lecture (depende de notifications)
      const notificationIds = await tx.notification.findMany({
        where: { projetUid },
        select: { id: true },
      });
      if (notificationIds.length > 0) {
        const result = await tx.notificationLecture.deleteMany({
          where: { notificationId: { in: notificationIds.map((n) => n.id) } },
        });
        deletedCounts["notification_lecture"] = result.count;
      }

      // 2. notifications
      const notifResult = await tx.notification.deleteMany({
        where: { projetUid },
      });
      deletedCounts["notifications"] = notifResult.count;

      // 3. lignes_confrere (depende de confreres)
      const confrereIds = await tx.confrere.findMany({
        where: { projetUid },
        select: { id: true },
      });
      if (confrereIds.length > 0) {
        const result = await tx.ligneConfrere.deleteMany({
          where: { confrereId: { in: confrereIds.map((c) => c.id) } },
        });
        deletedCounts["lignes_confrere"] = result.count;
      }

      // 4. confreres
      const confreresResult = await tx.confrere.deleteMany({
        where: { projetUid },
      });
      deletedCounts["confreres"] = confreresResult.count;

      // 5. etablissements
      const etablissementsResult = await tx.etablissement.deleteMany({
        where: { projetUid },
      });
      deletedCounts["etablissements"] = etablissementsResult.count;

      // 6. historique_general
      const histGenResult = await tx.historiqueGeneral.deleteMany({
        where: { projetUid },
      });
      deletedCounts["historique_general"] = histGenResult.count;

      // 7. historique_inventaire
      const histInvResult = await tx.historiqueInventaire.deleteMany({
        where: { projetUid },
      });
      deletedCounts["historique_inventaire"] = histInvResult.count;

      // 8. lignes_vente (depende de ventes)
      const venteIds = await tx.vente.findMany({
        where: { projetUid },
        select: { id: true },
      });
      if (venteIds.length > 0) {
        const result = await tx.ligneVente.deleteMany({
          where: { venteId: { in: venteIds.map((v) => v.id) } },
        });
        deletedCounts["lignes_vente"] = result.count;
      }

      // 9. avoirs (depende de ventes para venteOriginaleId)
      const avoirsResult = await tx.avoir.deleteMany({
        where: { projetUid },
      });
      deletedCounts["avoirs"] = avoirsResult.count;

      // 10. ventes
      const ventesResult = await tx.vente.deleteMany({
        where: { projetUid },
      });
      deletedCounts["ventes"] = ventesResult.count;

      // 11. lignes_commande (depende de commandes)
      const commandeIds = await tx.commande.findMany({
        where: { projetUid },
        select: { id: true },
      });
      if (commandeIds.length > 0) {
        const result = await tx.ligneCommande.deleteMany({
          where: { commandeId: { in: commandeIds.map((c) => c.id) } },
        });
        deletedCounts["lignes_commande"] = result.count;
      }

      // 12. factures
      const facturesResult = await tx.facture.deleteMany({
        where: { projetUid },
      });
      deletedCounts["factures"] = facturesResult.count;

      // 13. commandes
      const commandesResult = await tx.commande.deleteMany({
        where: { projetUid },
      });
      deletedCounts["commandes"] = commandesResult.count;

      // 14. stocks
      const stocksResult = await tx.stock.deleteMany({
        where: { projetUid },
      });
      deletedCounts["stocks"] = stocksResult.count;

      // 15. produits
      const produitsResult = await tx.produit.deleteMany({
        where: { projetUid },
      });
      deletedCounts["produits"] = produitsResult.count;

      // 16. categories
      const categoriesResult = await tx.categorie.deleteMany({
        where: { projetUid },
      });
      deletedCounts["categories"] = categoriesResult.count;

      // 17. clients
      const clientsResult = await tx.client.deleteMany({
        where: { projetUid },
      });
      deletedCounts["clients"] = clientsResult.count;

      // 18. fournisseurs
      const fournisseursResult = await tx.fournisseur.deleteMany({
        where: { projetUid },
      });
      deletedCounts["fournisseurs"] = fournisseursResult.count;

      // 19. permissions (depende de roles)
      const roleIds = await tx.role.findMany({
        where: { projetUid },
        select: { id: true },
      });
      if (roleIds.length > 0) {
        const result = await tx.permission.deleteMany({
          where: { roleId: { in: roleIds.map((r) => r.id) } },
        });
        deletedCounts["permissions"] = result.count;
      }

      // 20. roles
      const rolesResult = await tx.role.deleteMany({
        where: { projetUid },
      });
      deletedCounts["roles"] = rolesResult.count;

      // 21. employes - encontrar los firebase_uid de empleados para eliminar usuarios
      const employesData = await tx.employe.findMany({
        where: { creePar: projetUid },
        select: { firebaseUid: true },
      });
      const employeFirebaseUids = employesData.filter((e) => e.firebaseUid).map((e) => e.firebaseUid!);

      // Eliminar registros de employes
      const employesResult = await tx.employe.deleteMany({
        where: { creePar: projetUid },
      });
      deletedCounts["employes"] = employesResult.count;

      // 22. audit_logs
      const auditResult = await tx.auditLog.deleteMany({
        where: { projetUid },
      });
      deletedCounts["audit_logs"] = auditResult.count;

      // 23a. Eliminar usuarios empleados (no propietarios)
      if (employeFirebaseUids.length > 0) {
        const employeUsersResult = await tx.utilisateur.deleteMany({
          where: {
            firebaseUid: { in: employeFirebaseUids },
            isProprietaire: false,
          },
        });
        deletedCounts["utilisateurs_employes"] = employeUsersResult.count;
      }

      // 23b. Finalmente eliminar el propietario
      const propResult = await tx.utilisateur.deleteMany({
        where: { firebaseUid: projetUid },
      });
      deletedCounts["utilisateurs_propietario"] = propResult.count;
    });

    return { success: true, deletedCounts };
  } catch (error) {
    console.error("Error eliminando datos del proyecto:", error);
    return {
      success: false,
      deletedCounts,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Elimina solo los datos de un empleado (sin tocar los datos del proyecto)
 */
export async function deleteEmployeeData(employeFirebaseUid: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await prisma.$transaction(async (tx) => {
      // Encontrar el usuario empleado
      const empleado = await tx.utilisateur.findUnique({
        where: { firebaseUid: employeFirebaseUid },
      });

      if (!empleado) {
        throw new Error("Empleado no encontrado");
      }

      if (empleado.isProprietaire) {
        throw new Error("No se puede eliminar un propietario con esta función");
      }

      // Eliminar registro de employe usando firebaseUid
      await tx.employe.deleteMany({
        where: { firebaseUid: employeFirebaseUid },
      });

      // Eliminar el usuario empleado
      await tx.utilisateur.delete({
        where: { id: empleado.id },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error eliminando empleado:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Limpia usuarios huérfanos que ya no existen en Firebase.
 * Útil para ejecutar como cron job o mantenimiento.
 */
export async function cleanupOrphanedUsers(validFirebaseUids: string[]): Promise<{
  success: boolean;
  deletedProjects: number;
  error?: string;
}> {
  try {
    // Encontrar usuarios propietarios que no están en la lista de válidos
    const orphanedUsers = await prisma.utilisateur.findMany({
      where: {
        isProprietaire: true,
        firebaseUid: { notIn: validFirebaseUids },
      },
      select: { firebaseUid: true },
    });

    let deletedProjects = 0;
    for (const user of orphanedUsers) {
      const result = await deleteProjectData(user.firebaseUid);
      if (result.success) {
        deletedProjects++;
      }
    }

    return { success: true, deletedProjects };
  } catch (error) {
    console.error("Error limpiando usuarios huérfanos:", error);
    return {
      success: false,
      deletedProjects: 0,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
