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

    const permError = await checkPermission(auth, "etablissements", "voir");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const actif = searchParams.get("actif");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;
    
    // Recherche d'utilisateurs existants dans l'app
    const searchUsers = searchParams.get("searchUsers") === "true";

    const projetUid = getProjetUid(auth);

    // Si on cherche des utilisateurs existants (pour ajouter un confrère)
    if (searchUsers && search && search.length >= 2) {
      const utilisateurs = await prisma.utilisateur.findMany({
        where: {
          firebaseUid: { not: projetUid }, // Exclure le projet actuel (pas soi-même ni son propre établissement)
          actif: true,
          OR: [
            { nomProjet: { contains: search, mode: "insensitive" } },
            { nom: { contains: search, mode: "insensitive" } },
            { ville: { contains: search, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          firebaseUid: true,
          nomProjet: true,
          nom: true,
          email: true,
          telephone: true,
          adresse: true,
          ville: true,
          projectType: true,
        },
        take: 8,
      });

      return NextResponse.json({ utilisateurs });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { projetUid };

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: "insensitive" } },
        { adresse: { contains: search, mode: "insensitive" } },
        { ville: { contains: search, mode: "insensitive" } },
        { telephone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type && type !== "all") {
      where.type = type;
    }

    if (actif !== null && actif !== "" && actif !== "all") {
      where.actif = actif === "true";
    }

    const [etablissements, total] = await Promise.all([
      prisma.etablissement.findMany({
        where,
        orderBy: [{ isPrincipal: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              confreresSortants: true,
              confreresEntrants: true,
            },
          },
        },
      }),
      prisma.etablissement.count({ where }),
    ]);

    return NextResponse.json({
      etablissements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur GET établissements:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "etablissements", "creer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await request.json();
    const { 
      nom, type, adresse, ville, telephone, email, responsable, note,
      // Nouveaux champs pour utilisateur existant
      utilisateurLieId, utilisateurLieUid, isManuel = true 
    } = body;

    const projetUid = getProjetUid(auth);

    // Si c'est un utilisateur existant de l'app
    if (!isManuel && utilisateurLieUid) {
      // Vérifier que l'utilisateur existe
      const utilisateurLie = await prisma.utilisateur.findUnique({
        where: { firebaseUid: utilisateurLieUid },
      });

      if (!utilisateurLie) {
        return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
      }

      // Vérifier qu'on n'a pas déjà cet utilisateur comme établissement
      const existingLie = await prisma.etablissement.findFirst({
        where: { projetUid, utilisateurLieUid, actif: true },
      });

      if (existingLie) {
        return NextResponse.json({ error: "Cet utilisateur est déjà dans vos confrères" }, { status: 400 });
      }

      // Créer l'établissement lié à l'utilisateur
      const etablissement = await prisma.etablissement.create({
        data: {
          projetUid,
          nom: utilisateurLie.nomProjet || utilisateurLie.nom || "Confrère",
          type: utilisateurLie.projectType === "PARAPHARMACIA" ? "parapharmacie" : "pharmacie",
          utilisateurLieId: utilisateurLie.id,
          utilisateurLieUid: utilisateurLie.firebaseUid,
          isManuel: false,
          adresse: utilisateurLie.adresse || null,
          ville: utilisateurLie.ville || null,
          telephone: utilisateurLie.telephone || null,
          email: utilisateurLie.email || null,
          responsable: utilisateurLie.nom || null,
          actif: true,
          creePar: auth.user.firebaseUid,
        },
      });

      await createHistoriqueEntry({
        projetUid,
        module: "etablissements",
        action: "creer",
        entiteId: etablissement.id,
        entiteNom: etablissement.nom,
        description: `Ajout du confrère "${etablissement.nom}" (utilisateur de l'application)`,
        donneesApres: etablissement,
        utilisateurId: auth.user.firebaseUid,
        utilisateurEmail: auth.user.email || undefined,
      });

      return NextResponse.json({ etablissement }, { status: 201 });
    }

    // Création manuelle (établissement externe)
    if (!nom?.trim()) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ error: "Le type est requis" }, { status: 400 });
    }

    const validTypes = ["pharmacie", "parapharmacie", "depot", "grossiste", "hopital", "autre"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Type invalide" }, { status: 400 });
    }

    const existing = await prisma.etablissement.findFirst({
      where: {
        projetUid,
        nom: { equals: nom.trim(), mode: "insensitive" },
        isManuel: true,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Un établissement avec ce nom existe déjà" }, { status: 400 });
    }

    const etablissement = await prisma.etablissement.create({
      data: {
        projetUid,
        nom: nom.trim(),
        type,
        isManuel: true,
        adresse: adresse?.trim() || null,
        ville: ville?.trim() || null,
        telephone: telephone?.trim() || null,
        email: email?.trim()?.toLowerCase() || null,
        responsable: responsable?.trim() || null,
        note: note?.trim() || null,
        actif: true,
        creePar: auth.user.firebaseUid,
      },
    });

    await createHistoriqueEntry({
      projetUid,
      module: "etablissements",
      action: "creer",
      entiteId: etablissement.id,
      entiteNom: etablissement.nom,
      description: `Création de l'établissement "${etablissement.nom}" (${type}) - Manuel`,
      donneesApres: etablissement,
      utilisateurId: auth.user.firebaseUid,
      utilisateurEmail: auth.user.email || undefined,
    });

    return NextResponse.json({ etablissement }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST établissement:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "etablissements", "modifier");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await request.json();
    const { id, nom, type, adresse, ville, telephone, email, responsable, note, actif } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const projetUid = getProjetUid(auth);

    const existing = await prisma.etablissement.findFirst({
      where: { id, projetUid },
    });

    if (!existing) {
      return NextResponse.json({ error: "Établissement non trouvé" }, { status: 404 });
    }

    if (nom && nom.trim() !== existing.nom) {
      const duplicate = await prisma.etablissement.findFirst({
        where: {
          projetUid,
          nom: { equals: nom.trim(), mode: "insensitive" },
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json({ error: "Un établissement avec ce nom existe déjà" }, { status: 400 });
      }
    }

    const validTypes = ["pharmacie", "parapharmacie", "depot", "grossiste", "hopital", "autre"];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: "Type invalide" }, { status: 400 });
    }

    const etablissement = await prisma.etablissement.update({
      where: { id },
      data: {
        ...(nom !== undefined && { nom: nom.trim() }),
        ...(type !== undefined && { type }),
        ...(adresse !== undefined && { adresse: adresse?.trim() || null }),
        ...(ville !== undefined && { ville: ville?.trim() || null }),
        ...(telephone !== undefined && { telephone: telephone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim()?.toLowerCase() || null }),
        ...(responsable !== undefined && { responsable: responsable?.trim() || null }),
        ...(note !== undefined && { note: note?.trim() || null }),
        ...(actif !== undefined && { actif }),
        modifiePar: auth.user.firebaseUid,
      },
    });

    const modifications: string[] = [];
    if (nom !== undefined && nom !== existing.nom) modifications.push(`nom: "${existing.nom}" → "${nom}"`);
    if (type !== undefined && type !== existing.type) modifications.push(`type: ${existing.type} → ${type}`);
    if (actif !== undefined && actif !== existing.actif) modifications.push(`statut: ${existing.actif ? "actif" : "inactif"} → ${actif ? "actif" : "inactif"}`);

    await createHistoriqueEntry({
      projetUid,
      module: "etablissements",
      action: "modifier",
      entiteId: etablissement.id,
      entiteNom: etablissement.nom,
      description: `Modification de l'établissement "${etablissement.nom}"${modifications.length > 0 ? ` (${modifications.join(", ")})` : ""}`,
      donneesAvant: existing,
      donneesApres: etablissement,
      utilisateurId: auth.user.firebaseUid,
      utilisateurEmail: auth.user.email || undefined,
    });

    return NextResponse.json({ etablissement });
  } catch (error) {
    console.error("Erreur PUT établissement:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "etablissements", "supprimer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const projetUid = getProjetUid(auth);

    const etablissement = await prisma.etablissement.findFirst({
      where: { id, projetUid },
      include: {
        _count: {
          select: {
            confreresSortants: true,
            confreresEntrants: true,
          },
        },
      },
    });

    if (!etablissement) {
      return NextResponse.json({ error: "Établissement non trouvé" }, { status: 404 });
    }

    if (etablissement.isPrincipal) {
      return NextResponse.json({ error: "L'établissement principal ne peut pas être supprimé" }, { status: 400 });
    }

    const totalConfreres = etablissement._count.confreresSortants + etablissement._count.confreresEntrants;
    if (totalConfreres > 0) {
      await prisma.etablissement.update({
        where: { id },
        data: { actif: false, modifiePar: auth.user.firebaseUid },
      });

      await createHistoriqueEntry({
        projetUid,
        module: "etablissements",
        action: "desactiver",
        entiteId: etablissement.id,
        entiteNom: etablissement.nom,
        description: `Désactivation de l'établissement "${etablissement.nom}" (${totalConfreres} confrères liés)`,
        donneesAvant: { actif: true },
        donneesApres: { actif: false },
        utilisateurId: auth.user.firebaseUid,
        utilisateurEmail: auth.user.email || undefined,
      });

      return NextResponse.json({ 
        message: "Établissement désactivé (des confrères sont liés)",
        desactive: true 
      });
    }

    await prisma.etablissement.update({
      where: { id },
      data: { actif: false, modifiePar: auth.user.firebaseUid },
    });

    await createHistoriqueEntry({
      projetUid,
      module: "etablissements",
      action: "supprimer",
      entiteId: etablissement.id,
      entiteNom: etablissement.nom,
      description: `Suppression de l'établissement "${etablissement.nom}"`,
      donneesAvant: { ...etablissement, actif: true },
      donneesApres: { actif: false },
      utilisateurId: auth.user.firebaseUid,
      utilisateurEmail: auth.user.email || undefined,
    });

    return NextResponse.json({ message: "Établissement supprimé" });
  } catch (error) {
    console.error("Erreur DELETE établissement:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
