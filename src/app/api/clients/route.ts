import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getProjetUid, checkPermission } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "clients", "voir");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const withDebt = searchParams.get("withDebt") === "true";

    const clients = await prisma.client.findMany({
      where: {
        projetUid: getProjetUid(auth),
        actif: true,
        ...(search && {
          OR: [
            { nom: { contains: search, mode: "insensitive" } },
            { prenom: { contains: search, mode: "insensitive" } },
            { telephone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }),
        ...(withDebt && {
          solde: { gt: 0 },
        }),
      },
      include: {
        _count: { select: { ventes: true, avoirs: true } },
      },
      orderBy: { nom: "asc" },
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Erreur GET /api/clients:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "clients", "creer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await req.json();
    const { nom, prenom, telephone, email, adresse, ville, cin, credit, solde, forceCreate } = body;

    if (!nom) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const existingClient = await prisma.client.findFirst({
      where: {
        projetUid: getProjetUid(auth),
        nom: { equals: nom.trim(), mode: "insensitive" },
        ...(prenom && { prenom: { equals: prenom.trim(), mode: "insensitive" } }),
        actif: true,
      },
    });

    if (existingClient && !forceCreate) {
      return NextResponse.json({ 
        error: "Un client avec ce nom et prénom existe déjà",
        existingClient: {
          id: existingClient.id,
          nom: existingClient.nom,
          prenom: existingClient.prenom,
          telephone: existingClient.telephone,
        },
        requireConfirmation: true,
      }, { status: 409 });
    }

    const client = await prisma.client.create({
      data: {
        projetUid: getProjetUid(auth),
        nom,
        prenom: prenom || null,
        telephone: telephone || null,
        email: email || null,
        adresse: adresse || null,
        ville: ville || null,
        cin: cin || null,
        credit: credit || 0,
        solde: solde || 0,
        creePar: auth.user.firebaseUid,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/clients:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "clients", "modifier");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await req.json();
    const { id, nom, prenom, telephone, email, adresse, ville, cin, credit, solde } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.client.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 });
    }

    const changes: string[] = [];
    if (nom && nom !== existing.nom) changes.push(`nom: ${existing.nom} → ${nom}`);
    if (telephone !== undefined && telephone !== existing.telephone) 
      changes.push(`téléphone: ${existing.telephone} → ${telephone}`);
    if (credit !== undefined && Number(credit) !== Number(existing.credit))
      changes.push(`crédit: ${existing.credit} → ${credit}`);
    if (solde !== undefined && Number(solde) !== Number(existing.solde))
      changes.push(`solde: ${existing.solde} → ${solde}`);

    const client = await prisma.client.update({
      where: { id },
      data: {
        nom: nom || existing.nom,
        prenom: prenom ?? existing.prenom,
        telephone: telephone ?? existing.telephone,
        email: email ?? existing.email,
        adresse: adresse ?? existing.adresse,
        ville: ville ?? existing.ville,
        cin: cin ?? existing.cin,
        credit: credit ?? existing.credit,
        solde: solde ?? existing.solde,
        modifiePar: auth.user.firebaseUid,
      },
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error("Erreur PUT /api/clients:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "clients", "supprimer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.client.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 });
    }

    await prisma.client.update({
      where: { id },
      data: {
        actif: false,
        modifiePar: auth.user.firebaseUid,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/clients:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
