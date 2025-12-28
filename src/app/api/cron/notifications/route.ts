import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateStockBasNotifications,
  generateExpirationNotifications,
  generateCreditNotifications,
  generateTrialNotifications,
  cleanupOldNotifications,
} from "@/lib/notifications";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const vercelCron = req.headers.get("x-vercel-cron");
  const cronSecret = process.env.CRON_SECRET;
  
  const isVercelCron = vercelCron === "1";
  const hasValidToken = cronSecret && authHeader === `Bearer ${cronSecret}`;
  
  if (!isVercelCron && !hasValidToken) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const results = {
    processed: 0,
    stockBas: 0,
    expirations: 0,
    credits: 0,
    trialReminders: 0,
    cleaned: 0,
    errors: [] as string[],
  };

  try {
    const projets = await prisma.utilisateur.findMany({
      where: {
        isProprietaire: true,
        actif: true,
      },
      select: {
        firebaseUid: true,
        essaiFin: true,
        subscriptionStatus: true,
      },
    });

    for (const projet of projets) {
      const projetUid = projet.firebaseUid;
      
      try {
        const stockBasCount = await generateStockBasNotifications(projetUid);
        results.stockBas += stockBasCount;
        
        const expirationResult = await generateExpirationNotifications(projetUid);
        results.expirations += expirationResult.expirantBientot + expirationResult.expires;
        
        const creditCount = await generateCreditNotifications(projetUid);
        results.credits += creditCount;
        
        const cleaned = await cleanupOldNotifications(projetUid);
        results.cleaned += cleaned;
        
        results.processed++;
      } catch (error) {
        const msg = `Erreur génération notifications ${projetUid}: ${error}`;
        console.error(msg);
        results.errors.push(msg);
      }
    }

    try {
      await generateTrialNotifications();
    } catch (error) {
      console.error("Erreur génération notifications trial:", error);
      results.errors.push(`Erreur trial notifications: ${error}`);
    }

    console.log("Génération notifications terminée:", results);
    
    return NextResponse.json({
      success: true,
      message: `${results.processed} projets traités`,
      results,
    });
  } catch (error) {
    console.error("Erreur CRON notifications:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération des notifications" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Utilisez POST en production" }, { status: 405 });
  }
  
  const newReq = new Request(req.url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET || "test"}`,
    },
  });
  
  return POST(newReq);
}
