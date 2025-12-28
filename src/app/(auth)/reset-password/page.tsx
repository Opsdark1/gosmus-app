"use client";

import { useTransition } from "react";
import Link from "next/link";
import { firebaseAuth } from "@/lib/firebase-client";
import { sendPasswordResetEmail } from "firebase/auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { AuthFormLayout } from "@/components/auth-form-layout";

const resetSchema = z.object({
  email: z.string().email("Email invalide"),
});

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (values: ResetFormValues) => {
    startTransition(async () => {
      try {
        await sendPasswordResetEmail(firebaseAuth, values.email);
        toast.success("Email de réinitialisation envoyé");
        form.reset();
      } catch {
        toast.error("Erreur lors de l'envoi de l'email");
      }
    });
  };

  return (
    <AuthFormLayout title="Mot de passe oublié" subtitle="Entrez votre email pour recevoir un lien de réinitialisation">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Adresse email</Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="email@example.com"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isPending ? "Envoi..." : "Envoyer le lien"}
          {!isPending && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </form>

      <div className="text-center text-sm mt-6">
        <Link href="/login" className="inline-flex items-center text-primary hover:underline font-medium">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Retour à la connexion
        </Link>
      </div>
    </AuthFormLayout>
  );
}
