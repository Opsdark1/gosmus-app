"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { firebaseAuth } from "@/lib/firebase-client";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Chrome, ArrowRight, Loader2 } from "lucide-react";
import { AuthFormLayout } from "@/components/auth-form-layout";
import { ErrorMessage } from "@/components/error-message";
import { toast } from "sonner";
import { handleFirebaseError } from "@/lib/error-handler";
import { TRIAL_DAYS, APP_NAME } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const createSession = async (idToken: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (res.status === 403) {
        setError(`Votre période d'essai de ${TRIAL_DAYS} jours a expiré. Contactez le support.`);
        await firebaseAuth.signOut();
        return false;
      }

      if (res.status === 410) {
        setError("Votre compte a été supprimé après 30 jours d'inactivité.");
        await firebaseAuth.signOut();
        return false;
      }

      if (!res.ok) {
        setError(data.error || "Erreur lors de la connexion");
        return false;
      }

      setAuth({
        authenticated: true,
        status: data.status,
        user: data.user,
      });
      
      toast.success("Connexion réussie");
      
      window.location.href = "/dashboard";
      return true;
    } catch {
      setError("Erreur de connexion au serveur");
      return false;
    }
  };

  const onSubmit = (values: LoginFormValues) => {
    startTransition(async () => {
      setError(null);
      try {
        const cred = await signInWithEmailAndPassword(firebaseAuth, values.email, values.password);
        const idToken = await cred.user.getIdToken(true);
        await createSession(idToken);
      } catch (e) {
        const err = handleFirebaseError(e);
        setError(err.userMessage);
      }
    });
  };

  const handleGoogle = () => {
    startTransition(async () => {
      setError(null);
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(firebaseAuth, provider);
        const idToken = await result.user.getIdToken(true);
        await createSession(idToken);
      } catch (e: unknown) {
        if ((e as { code?: string }).code !== "auth/popup-closed-by-user") {
          const err = handleFirebaseError(e);
          setError(err.userMessage);
        }
      }
    });
  };

  return (
    <AuthFormLayout title="Connexion" subtitle={`Accédez à votre compte ${APP_NAME}`}>
      <ErrorMessage message={error} className="mb-6" />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="email@example.com" {...form.register("email")} />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link href="/reset-password" className="text-xs font-medium text-primary hover:underline">
              Oublié ?
            </Link>
          </div>
          <Input id="password" type="password" placeholder="••••••••" {...form.register("password")} />
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isPending ? "Connexion..." : "Se connecter"}
          {!isPending && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2 text-muted-foreground">ou continuer avec</span>
        </div>
      </div>

      <Button type="button" variant="outline" onClick={handleGoogle} disabled={isPending} className="w-full">
        <Chrome className="mr-2 h-5 w-5" />
        Google
      </Button>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Créer un compte
        </Link>
      </p>
    </AuthFormLayout>
  );
}
