import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import {
  verifyIdToken,
  createSessionCookie,
  getSessionFromCookie,
  verifySessionCookie,
  getTrialStatus,
  checkFirebaseUserExists,
  TRIAL_DAYS,
  PURGE_DAYS,
  SESSION_MAX_AGE,
} from "@/lib/auth-utils";

interface SessionRequest {
  idToken: string;
  profile?: {
    email?: string;
    nom?: string;
    telephone?: string;
    nomProjet?: string;
    adresse?: string;
    ville?: string;
    pays?: string;
    projectType?: "PHARMACIE" | "PARAPHARMACIA";
  };
}

async function seedInitialData(
  firebaseUid: string, 
  projectType: "PHARMACIE" | "PARAPHARMACIA" = "PHARMACIE",
  nomProjet?: string,
  adresse?: string,
  ville?: string
) {
  try {
    const existingRoles = await prisma.role.findMany({
      where: { projetUid: firebaseUid },
    });

    if (existingRoles.length === 0) {
      const caissier = await prisma.role.create({
        data: {
          projetUid: firebaseUid,
          nom: "Caissier",
          description: "Accès aux ventes, commandes et consultation des stocks",
          creePar: firebaseUid,
        },
      });

      await prisma.permission.createMany({
        data: [
          { roleId: caissier.id, action: "voir", module: "ventes" },
          { roleId: caissier.id, action: "creer", module: "ventes" },
          { roleId: caissier.id, action: "voir", module: "commandes" },
          { roleId: caissier.id, action: "creer", module: "commandes" },
          { roleId: caissier.id, action: "voir", module: "stocks" },
          { roleId: caissier.id, action: "voir", module: "produits" },
          { roleId: caissier.id, action: "voir", module: "clients" },
          { roleId: caissier.id, action: "creer", module: "clients" },
        ],
      });

      const gestionnaire = await prisma.role.create({
        data: {
          projetUid: firebaseUid,
          nom: "Gestionnaire",
          description: "Accès complet sauf gestion des employés et rôles",
          creePar: firebaseUid,
        },
      });

      const gestionnaireModules = [
        "produits", 
        "stocks", 
        "ventes", 
        "commandes", 
        "clients", 
        "fournisseurs", 
        "factures",
        "avoirs",
        "rapports",
        "etablissements",
        "transferts"
      ];
      const actions = ["voir", "creer", "modifier", "supprimer"];
      const gestionnairePermissions: { roleId: string; action: string; module: string }[] = [];

      for (const mod of gestionnaireModules) {
        for (const action of actions) {
          gestionnairePermissions.push({ roleId: gestionnaire.id, action, module: mod });
        }
      }

      await prisma.permission.createMany({ data: gestionnairePermissions });
    }

    const existingEtablissement = await prisma.etablissement.findFirst({
      where: { projetUid: firebaseUid, isPrincipal: true },
    });

    if (!existingEtablissement) {
      const etablissementType = projectType === "PHARMACIE" ? "pharmacie" : "parapharmacie";
      await prisma.etablissement.create({
        data: {
          projetUid: firebaseUid,
          nom: nomProjet || (projectType === "PHARMACIE" ? "Ma Pharmacie" : "Ma Parapharmacie"),
          type: etablissementType,
          isPrincipal: true,
          adresse: adresse || null,
          ville: ville || null,
          actif: true,
          creePar: firebaseUid,
        },
      });
    }

    const existingCategories = await prisma.categorie.findMany({
      where: { projetUid: firebaseUid },
    });

    let categoriesPrincipal: { id: string } | null = null;
    let categoriesSecondaire: { id: string } | null = null;

    if (existingCategories.length === 0) {
      const categoriesForType = projectType === "PHARMACIE" ? [
        { nom: "Médicaments", description: "Produits pharmaceutiques" },
        { nom: "Parapharmaceutique", description: "Produits de parapharmacie" },
        { nom: "Cosmétiques", description: "Produits cosmétiques" },
        { nom: "Hygiène", description: "Produits d'hygiène" },
        { nom: "Matériel médical", description: "Équipement médical" },
      ] : [
        { nom: "Cosmétiques", description: "Produits cosmétiques" },
        { nom: "Soins du visage", description: "Crèmes, sérums, masques" },
        { nom: "Soins du corps", description: "Lotions, huiles, gommages" },
        { nom: "Hygiène", description: "Produits d'hygiène quotidienne" },
        { nom: "Capillaire", description: "Shampoings, après-shampoings, masques" },
        { nom: "Solaire", description: "Protection et soin solaire" },
        { nom: "Bébé & Maman", description: "Produits pour bébé et femme enceinte" },
        { nom: "Compléments alimentaires", description: "Vitamines et compléments" },
      ];

      for (const cat of categoriesForType) {
        const created = await prisma.categorie.create({
          data: {
            ...cat,
            projetUid: firebaseUid,
            creePar: firebaseUid,
          },
        });
        if (projectType === "PHARMACIE") {
          if (cat.nom === "Médicaments") categoriesPrincipal = created;
          if (cat.nom === "Parapharmaceutique") categoriesSecondaire = created;
        } else {
          if (cat.nom === "Cosmétiques") categoriesPrincipal = created;
          if (cat.nom === "Soins du visage") categoriesSecondaire = created;
        }
      }
    } else {
      if (projectType === "PHARMACIE") {
        categoriesPrincipal = existingCategories.find((c) => c.nom === "Médicaments") || null;
        categoriesSecondaire = existingCategories.find((c) => c.nom === "Parapharmaceutique") || null;
      } else {
        categoriesPrincipal = existingCategories.find((c) => c.nom === "Cosmétiques") || null;
        categoriesSecondaire = existingCategories.find((c) => c.nom === "Soins du visage") || null;
      }
    }

    const existingProduits = await prisma.produit.findMany({
      where: { projetUid: firebaseUid },
    });

    if (existingProduits.length === 0 && categoriesPrincipal) {
      const produitsExemples = projectType === "PHARMACIE" ? [
        {
          nom: "Doliprane 1000mg",
          codeBarre: "3400935628893",
          type: "pharmaceutique",
          sousType: "antalgique",
          description: "Paracétamol 1000mg - Antalgique et antipyrétique",
          categorieId: categoriesPrincipal.id,
          prixAchat: 15.50,
          prixVente: 22.00,
          quantite: 100,
          seuilAlerte: 20,
        },
        {
          nom: "Aspro 500mg",
          codeBarre: "6111079001234",
          type: "pharmaceutique",
          sousType: "antalgique",
          description: "Acide acétylsalicylique 500mg - Antalgique",
          categorieId: categoriesPrincipal.id,
          prixAchat: 12.00,
          prixVente: 18.50,
          quantite: 80,
          seuilAlerte: 15,
        },
        {
          nom: "Augmentin 1g",
          codeBarre: "6111079005678",
          type: "pharmaceutique",
          sousType: "antibiotique",
          description: "Amoxicilline + Acide clavulanique - Antibiotique",
          categorieId: categoriesPrincipal.id,
          prixAchat: 45.00,
          prixVente: 65.00,
          quantite: 50,
          seuilAlerte: 10,
        },
        {
          nom: "Smecta Orange",
          codeBarre: "3400930001234",
          type: "pharmaceutique",
          sousType: "antidiarrheique",
          description: "Diosmectite 3g - Traitement des diarrhées",
          categorieId: categoriesSecondaire?.id || categoriesPrincipal.id,
          prixAchat: 28.00,
          prixVente: 42.00,
          quantite: 60,
          seuilAlerte: 12,
        },
      ] : [
        {
          nom: "Crème Hydratante Nivea",
          codeBarre: "4005900009012",
          type: "cosmetique",
          sousType: "hydratant",
          description: "Crème hydratante multi-usage pour le visage et le corps",
          categorieId: categoriesPrincipal.id,
          prixAchat: 35.00,
          prixVente: 55.00,
          quantite: 50,
          seuilAlerte: 10,
        },
        {
          nom: "Sérum Vitamine C",
          codeBarre: "6111079101234",
          type: "cosmetique",
          sousType: "soin_visage",
          description: "Sérum éclat à la vitamine C pure - Anti-taches",
          categorieId: categoriesSecondaire?.id || categoriesPrincipal.id,
          prixAchat: 85.00,
          prixVente: 130.00,
          quantite: 30,
          seuilAlerte: 8,
        },
        {
          nom: "Huile d'Argan Bio",
          codeBarre: "6111079201234",
          type: "cosmetique",
          sousType: "soin_corps",
          description: "Huile d'argan pure du Maroc - Soin cheveux et corps",
          categorieId: categoriesPrincipal.id,
          prixAchat: 120.00,
          prixVente: 180.00,
          quantite: 25,
          seuilAlerte: 5,
        },
        {
          nom: "Shampoing Argane Kerasoin",
          codeBarre: "6111079301234",
          type: "hygiene",
          sousType: "hygiene_capillaire",
          description: "Shampoing nourrissant à l'huile d'argan",
          categorieId: categoriesPrincipal.id,
          prixAchat: 45.00,
          prixVente: 70.00,
          quantite: 40,
          seuilAlerte: 10,
        },
        {
          nom: "Crème Solaire SPF50 Bioderma",
          codeBarre: "3401598765432",
          type: "parapharmaceutique",
          sousType: "soin_solaire",
          description: "Protection solaire très haute protection",
          categorieId: categoriesPrincipal.id,
          prixAchat: 150.00,
          prixVente: 220.00,
          quantite: 35,
          seuilAlerte: 8,
        },
      ];

      for (const prod of produitsExemples) {
        const produit = await prisma.produit.create({
          data: {
            projetUid: firebaseUid,
            nom: prod.nom,
            codeBarre: prod.codeBarre,
            type: prod.type,
            sousType: prod.sousType,
            description: prod.description,
            categorieId: prod.categorieId,
            creePar: firebaseUid,
          },
        });

        await prisma.stock.create({
          data: {
            projetUid: firebaseUid,
            produitId: produit.id,
            numeroLot: `LOT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            quantiteDisponible: prod.quantite,
            seuilAlerte: prod.seuilAlerte,
            prixAchat: prod.prixAchat,
            prixVente: prod.prixVente,
            dateExpiration: addDays(new Date(), 365),
            creePar: firebaseUid,
          },
        });
      }
    }
  } catch (error) {
    console.error("Erreur création données initiales:", error);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as SessionRequest;
    const { idToken, profile } = body;

    if (!idToken) {
      return NextResponse.json({ error: "Token manquant" }, { status: 400 });
    }

    const decoded = await verifyIdToken(idToken);
    const sessionCookie = await createSessionCookie(idToken);
    const now = new Date();

    const email = profile?.email ?? decoded.email ?? null;
    const telephone = profile?.telephone ?? decoded.phone_number ?? null;
    const nom = profile?.nom ?? decoded.name ?? null;

    const existingUser = await prisma.utilisateur.findUnique({
      where: { firebaseUid: decoded.uid },
    });
    const isNewUser = !existingUser;

    const projectType = profile?.projectType ?? "PHARMACIE";

    let user = await prisma.utilisateur.upsert({
      where: { firebaseUid: decoded.uid },
      update: {
        email,
        nom,
        telephone,
        nomProjet: profile?.nomProjet,
        adresse: profile?.adresse,
        ville: profile?.ville,
        pays: profile?.pays,
        emailVerifie: Boolean(decoded.email_verified),
        dernierLogin: now,
        updatedAt: now,
      },
      create: {
        firebaseUid: decoded.uid,
        email,
        nom,
        telephone,
        nomProjet: profile?.nomProjet ?? null,
        adresse: profile?.adresse ?? null,
        ville: profile?.ville ?? null,
        pays: profile?.pays ?? null,
        projectType: projectType,
        role: "proprietaire",
        isProprietaire: true,
        actif: true,
        emailVerifie: Boolean(decoded.email_verified),
        essaiFin: addDays(now, TRIAL_DAYS),
        desactiveLe: null,
        supprimerApres: null,
        createdAt: now,
        updatedAt: now,
      },
    });

    if (isNewUser) {
      await seedInitialData(
        decoded.uid, 
        projectType, 
        profile?.nomProjet, 
        profile?.adresse, 
        profile?.ville
      );
    }

    const status = getTrialStatus(user.essaiFin, user.supprimerApres);

    if (status === "expired" && user.actif) {
      user = await prisma.utilisateur.update({
        where: { id: user.id },
        data: {
          actif: false,
          desactiveLe: now,
          supprimerApres: addDays(now, PURGE_DAYS),
          updatedAt: now,
        },
      });
    }

    if (status === "expired") {
      return NextResponse.json(
        { status: "expired", message: "Votre période d'essai de 14 jours a expiré" },
        { status: 403 }
      );
    }

    if (status === "purge") {
      return NextResponse.json(
        { status: "purge", message: "Votre compte a été supprimé après 30 jours d'inactivité" },
        { status: 410 }
      );
    }

    if (user.role === "employe") {
      const employe = await prisma.employe.findUnique({
        where: { firebaseUid: decoded.uid },
        include: { proprietaire: true, role: true },
      });

      if (!employe) {
        return NextResponse.json({ error: "Compte employé introuvable" }, { status: 404 });
      }

      if (!employe.actif) {
        return NextResponse.json(
          { error: "Votre compte employé a été désactivé par le propriétaire" },
          { status: 403 }
        );
      }

      const proprietaire = employe.proprietaire;
      if (!proprietaire) {
        return NextResponse.json({ error: "Propriétaire du compte introuvable" }, { status: 404 });
      }

      if (!proprietaire.actif) {
        return NextResponse.json(
          { error: "Le compte du propriétaire est inactif. Veuillez contacter votre employeur." },
          { status: 403 }
        );
      }

      const ownerStatus = getTrialStatus(proprietaire.essaiFin, proprietaire.supprimerApres);
      if (ownerStatus === "expired" || ownerStatus === "purge") {
        return NextResponse.json(
          { error: "L'abonnement du propriétaire a expiré. Veuillez contacter votre employeur." },
          { status: 403 }
        );
      }

      const response = NextResponse.json({
        authenticated: true,
        status: "active",
        user: {
          id: user.id,
          nom: user.nom,
          email: user.email,
          role: user.role,
          actif: user.actif,
          telephone: user.telephone,
          employeId: employe.id,
          roleName: employe.role?.nom ?? null,
          projetUid: employe.projetUid,
          proprietaireNom: proprietaire.nom,
          nomProjet: proprietaire.nomProjet,
        },
      });
      response.cookies.set("__session", sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      });

      return response;
    }

    const response = NextResponse.json({
      authenticated: true,
      status: "active",
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        actif: user.actif,
        essaiFin: user.essaiFin,
        telephone: user.telephone,
        nomProjet: user.nomProjet,
        adresse: user.adresse,
        ville: user.ville,
        pays: user.pays,
        emailVerifie: user.emailVerifie,
      },
    });
    response.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("Erreur création session:", error);
    return NextResponse.json({ error: "Erreur lors de la création de la session" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie = getSessionFromCookie(cookieHeader);

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const decoded = await verifySessionCookie(sessionCookie);
    if (!decoded?.uid) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const firebaseUserExists = await checkFirebaseUserExists(decoded.uid);
    if (!firebaseUserExists) {
      // El usuario fue eliminado de Firebase - limpiar datos de la DB automáticamente
      const orphanedUser = await prisma.utilisateur.findUnique({
        where: { firebaseUid: decoded.uid },
        select: { id: true, isProprietaire: true },
      });

      if (orphanedUser) {
        try {
          if (orphanedUser.isProprietaire) {
            // Eliminar todos los datos del proyecto en segundo plano
            cleanupOrphanedProjectData(decoded.uid, orphanedUser.id).catch((e) =>
              console.error("Error limpiando datos huérfanos:", e)
            );
          } else {
            // Eliminar solo los datos del empleado
            await prisma.$transaction(async (tx) => {
              await tx.employe.deleteMany({ where: { firebaseUid: decoded.uid } });
              await tx.utilisateur.delete({ where: { id: orphanedUser.id } });
            });
          }
        } catch (e) {
          console.error("Error limpiando usuario huérfano:", e);
        }
      }

      const response = NextResponse.json({ authenticated: false, reason: "user_deleted" }, { status: 200 });
      response.cookies.set("__session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    const user = await prisma.utilisateur.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const status = getTrialStatus(user.essaiFin, user.supprimerApres);

    if (user.role === "employe") {
      const employe = await prisma.employe.findUnique({
        where: { firebaseUid: decoded.uid },
        include: { proprietaire: true, role: true },
      });

      if (!employe || !employe.actif) {
        return NextResponse.json({ authenticated: false }, { status: 200 });
      }

      const proprietaire = employe.proprietaire;
      if (!proprietaire || !proprietaire.actif) {
        return NextResponse.json({ authenticated: false, reason: "owner_inactive" }, { status: 200 });
      }

      const ownerStatus = getTrialStatus(proprietaire.essaiFin, proprietaire.supprimerApres);
      if (ownerStatus === "expired" || ownerStatus === "purge") {
        return NextResponse.json({ authenticated: false, reason: "owner_expired" }, { status: 200 });
      }

      return NextResponse.json({
        authenticated: true,
        status: "active",
        user: {
          id: user.id,
          nom: user.nom,
          email: user.email,
          role: user.role,
          actif: user.actif,
          telephone: user.telephone,
          employeId: employe.id,
          roleName: employe.role?.nom ?? null,
          projetUid: employe.projetUid,
          proprietaireNom: proprietaire.nom,
          nomProjet: proprietaire.nomProjet,
        },
      });
    }

    return NextResponse.json({
      authenticated: true,
      status,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        actif: user.actif,
        essaiFin: user.essaiFin,
        telephone: user.telephone,
        nomProjet: user.nomProjet,
        adresse: user.adresse,
        ville: user.ville,
        pays: user.pays,
        emailVerifie: user.emailVerifie,
      },
    });
  } catch (error) {
    console.error("Erreur vérification session:", error);
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}

/**
 * Limpia todos los datos de un proyecto huérfano (usuario eliminado de Firebase).
 * Se ejecuta en segundo plano para no bloquear la respuesta.
 */
async function cleanupOrphanedProjectData(firebaseUid: string, userId: string): Promise<void> {
  console.log(`Iniciando limpieza de proyecto huérfano: ${firebaseUid}`);
  
  try {
    await prisma.$transaction(async (tx) => {
      // 1. notification_lecture
      const notificationIds = await tx.notification.findMany({
        where: { projetUid: firebaseUid },
        select: { id: true },
      });
      if (notificationIds.length > 0) {
        await tx.notificationLecture.deleteMany({
          where: { notificationId: { in: notificationIds.map((n) => n.id) } },
        });
      }

      // 2. notifications
      await tx.notification.deleteMany({ where: { projetUid: firebaseUid } });

      // 3. lignes_confrere
      const confreres = await tx.confrere.findMany({
        where: { projetUid: firebaseUid },
        select: { id: true },
      });
      if (confreres.length > 0) {
        await tx.ligneConfrere.deleteMany({
          where: { confrereId: { in: confreres.map((c) => c.id) } },
        });
      }

      // 4. confreres
      await tx.confrere.deleteMany({ where: { projetUid: firebaseUid } });

      // 5. etablissements
      await tx.etablissement.deleteMany({ where: { projetUid: firebaseUid } });

      // 6. historique_general
      await tx.historiqueGeneral.deleteMany({ where: { projetUid: firebaseUid } });

      // 7. historique_inventaire
      await tx.historiqueInventaire.deleteMany({ where: { projetUid: firebaseUid } });

      // 8. lignes_vente
      const ventes = await tx.vente.findMany({
        where: { projetUid: firebaseUid },
        select: { id: true },
      });
      if (ventes.length > 0) {
        await tx.ligneVente.deleteMany({
          where: { venteId: { in: ventes.map((v) => v.id) } },
        });
      }

      // 9. avoirs
      await tx.avoir.deleteMany({ where: { projetUid: firebaseUid } });

      // 10. ventes
      await tx.vente.deleteMany({ where: { projetUid: firebaseUid } });

      // 11. lignes_commande
      const commandes = await tx.commande.findMany({
        where: { projetUid: firebaseUid },
        select: { id: true },
      });
      if (commandes.length > 0) {
        await tx.ligneCommande.deleteMany({
          where: { commandeId: { in: commandes.map((c) => c.id) } },
        });
      }

      // 12. factures
      await tx.facture.deleteMany({ where: { projetUid: firebaseUid } });

      // 13. commandes
      await tx.commande.deleteMany({ where: { projetUid: firebaseUid } });

      // 14. stocks
      await tx.stock.deleteMany({ where: { projetUid: firebaseUid } });

      // 15. produits
      await tx.produit.deleteMany({ where: { projetUid: firebaseUid } });

      // 16. categories
      await tx.categorie.deleteMany({ where: { projetUid: firebaseUid } });

      // 17. clients
      await tx.client.deleteMany({ where: { projetUid: firebaseUid } });

      // 18. fournisseurs
      await tx.fournisseur.deleteMany({ where: { projetUid: firebaseUid } });

      // 19. permissions
      const roles = await tx.role.findMany({
        where: { projetUid: firebaseUid },
        select: { id: true },
      });
      if (roles.length > 0) {
        await tx.permission.deleteMany({
          where: { roleId: { in: roles.map((r) => r.id) } },
        });
      }

      // 20. roles
      await tx.role.deleteMany({ where: { projetUid: firebaseUid } });

      // 21. employes y usuarios empleados
      const employes = await tx.employe.findMany({
        where: { creePar: firebaseUid },
        select: { firebaseUid: true },
      });
      await tx.employe.deleteMany({ where: { creePar: firebaseUid } });
      
      const employeUids = employes.filter((e) => e.firebaseUid).map((e) => e.firebaseUid!);
      if (employeUids.length > 0) {
        await tx.utilisateur.deleteMany({
          where: { firebaseUid: { in: employeUids } },
        });
      }

      // 22. audit_logs
      await tx.auditLog.deleteMany({ where: { projetUid: firebaseUid } });

      // 23. propietario
      await tx.utilisateur.delete({ where: { id: userId } });
    });

    console.log(`Proyecto huérfano limpiado exitosamente: ${firebaseUid}`);
  } catch (error) {
    console.error(`Error limpiando proyecto huérfano ${firebaseUid}:`, error);
    throw error;
  }
}
