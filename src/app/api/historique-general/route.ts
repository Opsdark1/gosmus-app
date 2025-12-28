import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getProjetUid, checkPermission } from "@/lib/api-auth";
import { Prisma } from "@prisma/client";

export async function createHistoriqueEntry(params: {
  projetUid: string;
  module: string;
  action: string;
  entiteId: string;
  entiteNom?: string;
  description: string;
  donneesAvant?: object | null;
  donneesApres?: object | null;
  utilisateurId: string;
  utilisateurEmail?: string;
  ipAddress?: string;
}) {
  try {
    await prisma.historiqueGeneral.create({
      data: {
        projetUid: params.projetUid,
        module: params.module,
        action: params.action,
        entiteId: params.entiteId,
        entiteNom: params.entiteNom || null,
        description: params.description,
        donneesAvant: params.donneesAvant ?? Prisma.JsonNull,
        donneesApres: params.donneesApres ?? Prisma.JsonNull,
        utilisateurId: params.utilisateurId,
        utilisateurEmail: params.utilisateurEmail || null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Erreur création historique:", error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permEtab = await checkPermission(auth, "etablissements", "voir");
    const permTransfert = await checkPermission(auth, "transferts", "voir");
    
    if (permEtab && permTransfert) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const module = searchParams.get("module") || "";
    const action = searchParams.get("action") || "";
    const entiteId = searchParams.get("entiteId") || "";
    const search = searchParams.get("search") || "";
    const dateDebut = searchParams.get("dateDebut") || "";
    const dateFin = searchParams.get("dateFin") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const projetUid = getProjetUid(auth);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { projetUid };

    if (module) {
      where.module = module;
    }

    if (action) {
      where.action = action;
    }

    if (entiteId) {
      where.entiteId = entiteId;
    }

    if (search) {
      where.OR = [
        { entiteNom: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { utilisateurEmail: { contains: search, mode: "insensitive" } },
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

    const [historique, total] = await Promise.all([
      prisma.historiqueGeneral.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.historiqueGeneral.count({ where }),
    ]);

    return NextResponse.json({
      historique,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur GET historique:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
