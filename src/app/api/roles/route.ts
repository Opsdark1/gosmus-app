import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req, { requireProprietaire: true });
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const roles = await prisma.role.findMany({
      where: { projetUid: auth.user.firebaseUid, actif: true },
      include: {
        permissions: true,
        _count: { select: { employes: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Erreur GET /api/roles:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req, { requireProprietaire: true });
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { nom, description, permissions } = body;

    if (!nom) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const filteredPermissions = (permissions || []).filter(
      (p: { action: string; module: string }) => 
        p.module !== "employes" && p.module !== "roles"
    );

    const role = await prisma.role.create({
      data: {
        projetUid: auth.user.firebaseUid,
        nom,
        description,
        creePar: auth.user.firebaseUid,
        permissions: {
          create: filteredPermissions.map((p: { action: string; module: string }) => ({
            action: p.action,
            module: p.module,
          })),
        },
      },
      include: { permissions: true },
    });

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Erreur POST /api/roles:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req, { requireProprietaire: true });
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { id, nom, description, permissions } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    if (!nom) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const existingRole = await prisma.role.findUnique({
      where: { id, projetUid: auth.user.firebaseUid },
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Rôle non trouvé" }, { status: 404 });
    }

    const filteredPermissions = (permissions || []).filter(
      (p: { action: string; module: string }) => 
        p.module !== "employes" && p.module !== "roles"
    );

    const role = await prisma.$transaction(async (tx) => {
      await tx.permission.deleteMany({
        where: { roleId: id },
      });

      return tx.role.update({
        where: { id },
        data: {
          nom,
          description,
          modifiePar: auth.user.firebaseUid,
          permissions: {
            create: filteredPermissions.map((p: { action: string; module: string }) => ({
              action: p.action,
              module: p.module,
            })),
          },
        },
        include: { 
          permissions: true,
          _count: { select: { employes: true } },
        },
      });
    });

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Erreur PATCH /api/roles:", error);
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
    const roleId = searchParams.get("id");

    if (!roleId) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    await prisma.role.update({
      where: { id: roleId, projetUid: auth.user.firebaseUid },
      data: { actif: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/roles:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
