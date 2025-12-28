import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.user.isProprietaire) {
      return NextResponse.json({
        isProprietaire: true,
        permissions: [],
        roleId: null,
        roleName: null,
      });
    }

    if (auth.employe?.roleId) {
      const permissions = await prisma.permission.findMany({
        where: { roleId: auth.employe.roleId },
        select: { module: true, action: true },
      });

      return NextResponse.json({
        isProprietaire: false,
        permissions: permissions.map(p => ({ module: p.module, action: p.action })),
        roleId: auth.employe.roleId,
        roleName: auth.employe.roleName,
      });
    }

    return NextResponse.json({
      isProprietaire: false,
      permissions: [],
      roleId: null,
      roleName: null,
    });
  } catch (error) {
    console.error("Erreur GET /api/auth/permissions:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
