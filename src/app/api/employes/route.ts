import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { adminAuth } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req, { requireProprietaire: true });
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const employes = await prisma.employe.findMany({
      where: { projetUid: auth.user.firebaseUid, actif: true },
      include: {
        role: { select: { id: true, nom: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ employes });
  } catch (error) {
    console.error("Erreur GET /api/employes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let createdFirebaseUid: string | null = null;

  try {
    const auth = await getAuthenticatedUser(req, { requireProprietaire: true });
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { user } = auth;

    const body = await req.json();
    const { nom, email, password, roleId } = body;

    if (!nom || typeof nom !== "string" || nom.trim().length === 0) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 6 caractères" }, { status: 400 });
    }

    if (!roleId) {
      return NextResponse.json({ error: "Le rôle est obligatoire" }, { status: 400 });
    }

    const employeCount = await prisma.employe.count({
      where: { projetUid: user.firebaseUid, actif: true },
    });

    if (employeCount >= 5) {
      return NextResponse.json({ error: "Limite de 5 employés atteinte" }, { status: 400 });
    }

    const existingEmploye = await prisma.employe.findFirst({
      where: { email: email.toLowerCase().trim(), projetUid: user.firebaseUid },
    });

    if (existingEmploye) {
      return NextResponse.json({ error: "Un employé avec cet email existe déjà" }, { status: 400 });
    }

    let firebaseUserExists = false;
    try {
      await adminAuth.getUserByEmailWithTimeout(email);
      firebaseUserExists = true;
    } catch (err) {
      if (err instanceof Error && err.message === "Firebase operation timeout") {
        return NextResponse.json({ error: "Le serveur Firebase ne répond pas. Réessayez plus tard." }, { status: 503 });
      }
      firebaseUserExists = false;
    }

    if (firebaseUserExists) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 });
    }

    const existingUtilisateur = await prisma.utilisateur.findFirst({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUtilisateur) {
      if (!firebaseUserExists) {
        console.log(`Nettoyage orphelin utilisateur: ${existingUtilisateur.firebaseUid}`);
        await prisma.$transaction(async (tx) => {
          await tx.employe.deleteMany({
            where: { firebaseUid: existingUtilisateur.firebaseUid },
          });
          await tx.utilisateur.delete({
            where: { firebaseUid: existingUtilisateur.firebaseUid },
          });
        });
      } else {
        return NextResponse.json({ error: "Cet email est déjà utilisé par un autre compte" }, { status: 400 });
      }
    }

    let firebaseUser;
    try {
      firebaseUser = await adminAuth.createUserWithTimeout({
        email: email.toLowerCase().trim(),
        password,
        displayName: nom.trim(),
      });
    } catch (err) {
      if (err instanceof Error && err.message === "Firebase operation timeout") {
        return NextResponse.json({ error: "Le serveur Firebase ne répond pas. Réessayez plus tard." }, { status: 503 });
      }
      throw err;
    }

    createdFirebaseUid = firebaseUser.uid;

    const proprietaire = await prisma.utilisateur.findUnique({
      where: { firebaseUid: user.firebaseUid },
      select: { nomProjet: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      const newEmploye = await tx.employe.create({
        data: {
          projetUid: user.firebaseUid,
          nom: nom.trim(),
          email: email.toLowerCase().trim(),
          firebaseUid: firebaseUser.uid,
          roleId: roleId,
          creePar: user.firebaseUid,
          actif: true,
        },
        include: { role: { select: { id: true, nom: true } } },
      });

      await tx.utilisateur.create({
        data: {
          firebaseUid: firebaseUser.uid,
          email: email.toLowerCase().trim(),
          nom: nom.trim(),
          role: "employe",
          isProprietaire: false,
          nomProjet: proprietaire?.nomProjet || null,
          actif: true,
        },
      });

      return newEmploye;
    });

    createdFirebaseUid = null;

    return NextResponse.json({ employe: result });
  } catch (error) {
    console.error("Erreur POST /api/employes:", error);

    if (createdFirebaseUid) {
      try {
        await adminAuth.deleteUserWithTimeout(createdFirebaseUid);
      } catch (deleteError) {
        console.error("Erreur suppression Firebase après échec:", deleteError);
      }
    }

    if (error instanceof Error) {
      if (error.message.includes("auth/email-already-exists")) {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 });
      }
      if (error.message.includes("auth/invalid-email")) {
        return NextResponse.json({ error: "Format email invalide" }, { status: 400 });
      }
      if (error.message.includes("auth/weak-password")) {
        return NextResponse.json({ error: "Mot de passe trop faible" }, { status: 400 });
      }
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json({ error: "Un employé avec cet email existe déjà" }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Erreur lors de la création de l'employé" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req, { requireProprietaire: true });
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { id, nom, roleId, action } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const employe = await prisma.employe.findFirst({
      where: { id, projetUid: auth.user.firebaseUid, actif: true },
    });

    if (!employe) {
      return NextResponse.json({ error: "Employé non trouvé" }, { status: 404 });
    }

    if (action === "reset_password") {
      if (!employe.email) {
        return NextResponse.json({ error: "L'employé n'a pas d'email" }, { status: 400 });
      }

      try {
        const resetLink = await adminAuth.generatePasswordResetLinkWithTimeout(employe.email);
        return NextResponse.json({ 
          success: true, 
          message: "Email de réinitialisation envoyé",
          ...(process.env.NODE_ENV === "development" && { resetLink })
        });
      } catch (firebaseError) {
        console.error("Erreur génération lien reset:", firebaseError);
        return NextResponse.json({ error: "Erreur lors de l'envoi de l'email" }, { status: 500 });
      }
    }

    const updatedEmploye = await prisma.employe.update({
      where: { id, projetUid: auth.user.firebaseUid },
      data: {
        ...(nom && { nom: nom.trim() }),
        ...(roleId !== undefined && { roleId: roleId || null }),
        modifiePar: auth.user.firebaseUid,
      },
      include: { role: { select: { id: true, nom: true } } },
    });

    if (nom && employe.firebaseUid) {
      await prisma.utilisateur.update({
        where: { firebaseUid: employe.firebaseUid },
        data: { nom: nom.trim() },
      }).catch(err => console.error("Erreur update utilisateur:", err));

      try {
        await adminAuth.updateUserWithTimeout(employe.firebaseUid, { displayName: nom.trim() });
      } catch (firebaseError) {
        console.error("Erreur mise à jour Firebase:", firebaseError);
      }
    }

    return NextResponse.json({ employe: updatedEmploye });
  } catch (error) {
    console.error("Erreur PATCH /api/employes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req, { requireProprietaire: true });
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const employeId = searchParams.get("id");

    if (!employeId) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const employe = await prisma.employe.findUnique({
      where: { id: employeId, projetUid: auth.user.firebaseUid },
    });

    if (!employe) {
      return NextResponse.json({ error: "Employé non trouvé" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.employe.delete({
        where: { id: employeId },
      });

      if (employe.firebaseUid) {
        await tx.utilisateur.delete({
          where: { firebaseUid: employe.firebaseUid },
        });
      }
    });

    if (employe.firebaseUid) {
      try {
        await adminAuth.deleteUserWithTimeout(employe.firebaseUid);
      } catch (firebaseError) {
        console.error("Erreur suppression Firebase:", firebaseError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/employes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
