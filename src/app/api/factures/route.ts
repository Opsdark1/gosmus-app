import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getProjetUid, checkPermission } from "@/lib/api-auth";

function generateNumeroFacture(): string {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `FAC-${year}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "factures", "voir");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const statut = searchParams.get("statut") || "";
    const venteId = searchParams.get("venteId") || "";
    const id = searchParams.get("id") || "";

    if (id) {
      const facture = await prisma.facture.findFirst({
        where: {
          id,
          projetUid: getProjetUid(auth),
          actif: true,
        },
        include: {
          vente: {
            include: {
              client: true,
              lignes: {
                include: {
                  stock: {
                    include: {
                      produit: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!facture) {
        return NextResponse.json({ error: "Facture non trouvée" }, { status: 404 });
      }

      const projetInfo = await prisma.utilisateur.findFirst({
        where: { firebaseUid: auth.user.firebaseUid },
        select: {
          nomProjet: true,
          adresse: true,
          ville: true,
          pays: true,
          telephone: true,
          email: true,
        },
      });

      return NextResponse.json({ facture, projetInfo });
    }

    const factures = await prisma.facture.findMany({
      where: {
        projetUid: getProjetUid(auth),
        actif: true,
        ...(search && {
          OR: [
            { numeroFacture: { contains: search, mode: "insensitive" } },
            { reference: { contains: search, mode: "insensitive" } },
            { vente: { client: { nom: { contains: search, mode: "insensitive" } } } },
          ],
        }),
        ...(statut && { statut }),
        ...(venteId && { venteId }),
      },
      include: {
        vente: {
          select: {
            id: true,
            reference: true,
            total: true,
            client: { select: { id: true, nom: true, prenom: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ factures });
  } catch (error) {
    console.error("Erreur GET /api/factures:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "factures", "creer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await req.json();
    const { venteId, tva, reference } = body;

    if (!venteId) {
      return NextResponse.json({ error: "Vente requise" }, { status: 400 });
    }

    const vente = await prisma.vente.findFirst({
      where: {
        id: venteId,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!vente) {
      return NextResponse.json({ error: "Vente non trouvée" }, { status: 404 });
    }

    const existingFacture = await prisma.facture.findFirst({
      where: {
        venteId,
        actif: true,
      },
    });

    if (existingFacture) {
      return NextResponse.json(
        { error: "Une facture existe déjà pour cette vente" },
        { status: 400 }
      );
    }

    const sousTotal = Number(vente.total);
    const tvaAmount = tva || 0;
    const total = sousTotal + tvaAmount;

    const facture = await prisma.facture.create({
      data: {
        projetUid: getProjetUid(auth),
        venteId,
        numeroFacture: generateNumeroFacture(),
        reference: reference || null,
        sousTotal,
        tva: tvaAmount,
        total,
        statut: Number(vente.montantDu) === 0 ? "payee" : "emise",
        creePar: auth.user.firebaseUid,
      },
      include: {
        vente: {
          select: {
            id: true,
            reference: true,
            total: true,
            client: { select: { id: true, nom: true } },
          },
        },
      },
    });

    return NextResponse.json({ facture }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/factures:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "factures", "modifier");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const body = await req.json();
    const { id, statut, reference, tva } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.facture.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
      include: { vente: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Facture non trouvée" }, { status: 404 });
    }

    const statutsValides = ["emise", "payee", "annulee"];
    if (statut && !statutsValides.includes(statut)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    if (statut === "payee" && existing.statut !== "payee" && existing.vente) {
      await prisma.$transaction(async (tx) => {
        await tx.vente.update({
          where: { id: existing.venteId! },
          data: {
            montantPaye: existing.vente!.total,
            montantDu: 0,
            statut: "payee",
            modifiePar: auth.user.firebaseUid,
          },
        });

        if (existing.vente!.clientId) {
          await tx.client.update({
            where: { id: existing.vente!.clientId },
            data: {
              solde: { decrement: Number(existing.total) },
              modifiePar: auth.user.firebaseUid,
            },
          });
        }

        await tx.facture.update({
          where: { id },
          data: {
            statut: "payee",
            modifiePar: auth.user.firebaseUid,
          },
        });
      });

      const updated = await prisma.facture.findUnique({
        where: { id },
        include: {
          vente: {
            select: {
              id: true,
              reference: true,
              total: true,
              client: { select: { id: true, nom: true } },
            },
          },
        },
      });

      return NextResponse.json({ facture: updated });
    }

    let updateData: {
      statut?: string;
      reference?: string | null;
      tva?: number;
      total?: number;
      modifiePar: string;
    } = {
      modifiePar: auth.user.firebaseUid,
    };

    if (statut) updateData.statut = statut;
    if (reference !== undefined) updateData.reference = reference;
    if (tva !== undefined) {
      updateData.tva = tva;
      updateData.total = Number(existing.sousTotal) + tva;
    }

    const facture = await prisma.facture.update({
      where: { id },
      data: updateData,
      include: {
        vente: {
          select: {
            id: true,
            reference: true,
            total: true,
            client: { select: { id: true, nom: true } },
          },
        },
      },
    });

    return NextResponse.json({ facture });
  } catch (error) {
    console.error("Erreur PUT /api/factures:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const permError = await checkPermission(auth, "factures", "supprimer");
    if (permError) {
      return NextResponse.json({ error: permError.error }, { status: permError.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.facture.findFirst({
      where: {
        id,
        projetUid: getProjetUid(auth),
        actif: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Facture non trouvée" }, { status: 404 });
    }

    if (existing.statut === "payee") {
      return NextResponse.json(
        { error: "Impossible de supprimer une facture déjà payée" },
        { status: 400 }
      );
    }

    await prisma.facture.update({
      where: { id },
      data: {
        actif: false,
        statut: "annulee",
        modifiePar: auth.user.firebaseUid,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/factures:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
