"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyActionCode } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");

  useEffect(() => {
    const code = searchParams.get("oobCode");
    if (!code) {
      setStatus("error");
      toast.error("Code de vérification manquant");
      return;
    }

    const verifyEmail = async () => {
      try {
        await applyActionCode(firebaseAuth, code);
        setStatus("success");
        toast.success("Email vérifié avec succès");
        setTimeout(() => router.push("/dashboard"), 1500);
      } catch {
        setStatus("error");
        toast.error("Impossible de vérifier l'email");
      }
    };

    verifyEmail();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {status === "pending" && (
          <div className="space-y-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <h2 className="text-2xl font-bold">Vérification en cours...</h2>
            <p className="text-muted-foreground">Nous validons votre adresse email</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">Email vérifié !</h2>
            <p className="text-muted-foreground">Votre adresse email a été confirmée avec succès</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">Erreur de vérification</h2>
            <p className="text-muted-foreground">Le lien est invalide ou expiré</p>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => router.push("/login")}>
                Retour à la connexion
              </Button>
              <Button onClick={() => router.push("/register")}>Créer un compte</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
