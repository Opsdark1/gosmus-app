import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getProjetUid } from "@/lib/api-auth";

interface NotificationWithLectures {
  id: string;
  type: string;
  titre: string;
  message: string;
  priorite: string;
  module: string | null;
  entiteId: string | null;
  entiteNom: string | null;
  lienAction: string | null;
  metadata: unknown;
  createdAt: Date;
  lectures: { luLe: Date }[];
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { user, employe } = auth;
    const projetUid = getProjetUid(auth);

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const onlyUnread = url.searchParams.get("unread") === "true";

    let userModules: string[] = [];
    if (!user.isProprietaire && employe?.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: employe.roleId },
        include: { permissions: true },
      });
      if (role?.permissions) {
        userModules = role.permissions
          .filter((p) => p.module)
          .map((p) => p.module!);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      projetUid,
      actif: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    if (!user.isProprietaire && userModules.length > 0) {
      whereClause.AND = [
        {
          OR: [
            { module: null },
            { module: { in: userModules } },
          ],
        },
      ];
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      include: {
        lectures: {
          where: {
            utilisateurId: user.firebaseUid,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }) as NotificationWithLectures[];

    const result = notifications.map((notif) => ({
      id: notif.id,
      type: notif.type,
      titre: notif.titre,
      message: notif.message,
      priorite: notif.priorite,
      module: notif.module,
      entiteId: notif.entiteId,
      entiteNom: notif.entiteNom,
      lienAction: notif.lienAction,
      metadata: notif.metadata,
      createdAt: notif.createdAt,
      lu: notif.lectures.length > 0,
      luLe: notif.lectures[0]?.luLe || null,
    }));

    const finalResult = onlyUnread
      ? result.filter((n) => !n.lu)
      : result;

    const unreadCount = result.filter((n) => !n.lu).length;

    return NextResponse.json({
      notifications: finalResult,
      unreadCount,
      total: result.length,
    });
  } catch (error) {
    console.error("Erreur récupération notifications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { user } = auth;
    const projetUid = getProjetUid(auth);

    const body = await req.json().catch(() => ({}));
    const { notificationIds, markAll } = body;

    if (markAll) {
      const unreadNotifs = await prisma.notification.findMany({
        where: {
          projetUid,
          actif: true,
          lectures: {
            none: {
              utilisateurId: user.firebaseUid,
            },
          },
        },
        select: { id: true },
      });

      const lecturesData = unreadNotifs.map((notif) => ({
        notificationId: notif.id,
        utilisateurId: user.firebaseUid,
      }));

      if (lecturesData.length > 0) {
        await prisma.notificationLecture.createMany({
          data: lecturesData,
          skipDuplicates: true,
        });
      }

      return NextResponse.json({ success: true, markedCount: lecturesData.length });
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: "IDs de notifications requis" }, { status: 400 });
    }

    const lecturesData = notificationIds.map((notifId: string) => ({
      notificationId: notifId,
      utilisateurId: user.firebaseUid,
    }));

    await prisma.notificationLecture.createMany({
      data: lecturesData,
      skipDuplicates: true,
    });

    return NextResponse.json({ success: true, markedCount: notificationIds.length });
  } catch (error) {
    console.error("Erreur marquage notifications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
