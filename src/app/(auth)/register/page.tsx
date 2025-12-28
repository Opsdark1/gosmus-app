"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { firebaseAuth } from "@/lib/firebase-client";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight, ArrowLeft, Check, Loader2, Pill, Sparkles } from "lucide-react";
import { AuthFormLayout } from "@/components/auth-form-layout";
import { handleFirebaseError } from "@/lib/error-handler";
import { TRIAL_DAYS } from "@/lib/constants";

const projectTypes = ["PHARMACIE", "PARAPHARMACIA"] as const;
type ProjectType = typeof projectTypes[number];

const step1Schema = z.object({
  nom: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  nomProjet: z.string().min(2, "Nom de l'établissement requis"),
  projectType: z.enum(projectTypes, { message: "Sélectionnez le type d'établissement" }),
});

const step2Schema = z.object({
  adresse: z.string().min(5, "Adresse requise"),
  ville: z.string().min(2, "Ville requise"),
  pays: z.string().min(2, "Pays requis"),
  telephone: z.string().regex(/^\+\d{10,15}$/, "Format: +212600000000").or(z.literal("")),
});

const step3Schema = z.object({
  password: z.string().min(6, "Minimum 6 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type FormData = {
  nom: string;
  email: string;
  nomProjet: string;
  projectType: ProjectType;
  adresse: string;
  ville: string;
  pays: string;
  telephone: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    nom: "",
    email: "",
    nomProjet: "",
    projectType: "PHARMACIE",
    adresse: "",
    ville: "",
    pays: "Maroc",
    telephone: "",
  });
  const [isPending, startTransition] = useTransition();

  const step1Form = useForm({ 
    resolver: zodResolver(step1Schema), 
    defaultValues: { nom: "", email: "", nomProjet: "", projectType: "PHARMACIE" as ProjectType } 
  });
  const step2Form = useForm({ resolver: zodResolver(step2Schema), defaultValues: { adresse: "", ville: "", pays: "Maroc", telephone: "" } });
  const step3Form = useForm({ resolver: zodResolver(step3Schema), defaultValues: { password: "", confirmPassword: "" } });

  const selectedProjectType = step1Form.watch("projectType");

  const onStep1Submit = (values: z.infer<typeof step1Schema>) => {
    setFormData((prev) => ({ ...prev, ...values }));
    setStep(2);
  };

  const onStep2Submit = (values: z.infer<typeof step2Schema>) => {
    setFormData((prev) => ({ ...prev, ...values, telephone: values.telephone || "" }));
    setStep(3);
  };

  const createSession = async () => {
    const user = firebaseAuth.currentUser;
    if (!user) {
      toast.error("Utilisateur introuvable");
      return;
    }

    const idToken = await user.getIdToken(true);
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        idToken,
        profile: {
          email: formData.email,
          nom: formData.nom,
          telephone: formData.telephone || undefined,
          nomProjet: formData.nomProjet,
          adresse: formData.adresse,
          ville: formData.ville,
          pays: formData.pays,
          projectType: formData.projectType,
        },
      }),
    });

    const data = await res.json();

    if (res.status === 403) {
      toast.error("Période d'essai expirée");
      await firebaseAuth.signOut();
      return;
    }

    if (!res.ok) {
      toast.error(data.error || "Erreur lors de la création de la session");
      return;
    }

    toast.success(`Compte créé ! Vous avez ${TRIAL_DAYS} jours d'essai gratuit`);
    window.location.href = "/dashboard";
  };

  const onStep3Submit = (values: z.infer<typeof step3Schema>) => {
    startTransition(async () => {
      try {
        const cred = await createUserWithEmailAndPassword(firebaseAuth, formData.email, values.password);
        await updateProfile(cred.user, { displayName: formData.nom });
        await sendEmailVerification(cred.user, { url: `${window.location.origin}/verify-email` });
        await createSession();
      } catch (e) {
        const err = handleFirebaseError(e);
        toast.error(err.userMessage);
      }
    });
  };

  const steps = [1, 2, 3];
  const projectLabel = selectedProjectType === "PARAPHARMACIA" ? "parapharmacie" : "pharmacie";

  return (
    <AuthFormLayout title="Inscription" subtitle="Créez votre compte" width="md">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {steps.map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition ${
                s < step ? "bg-green-500" : s === step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">Étape {step} sur 3</p>
      </div>

      {step === 1 && (
        <form className="space-y-4" onSubmit={step1Form.handleSubmit(onStep1Submit)}>
          <div className="space-y-3">
            <Label>Type d&apos;établissement</Label>
            <RadioGroup
              value={step1Form.watch("projectType")}
              onValueChange={(value: ProjectType) => step1Form.setValue("projectType", value)}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="type-pharmacie"
                className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all hover:border-primary/50 ${
                  step1Form.watch("projectType") === "PHARMACIE"
                    ? "border-primary bg-primary/5"
                    : "border-muted"
                }`}
              >
                <RadioGroupItem value="PHARMACIE" id="type-pharmacie" className="sr-only" />
                <Pill className={`h-8 w-8 mb-2 ${step1Form.watch("projectType") === "PHARMACIE" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-medium">Pharmacie</span>
                <span className="text-xs text-muted-foreground text-center mt-1">Médicaments et produits pharmaceutiques</span>
              </Label>
              <Label
                htmlFor="type-parapharmacia"
                className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all hover:border-primary/50 ${
                  step1Form.watch("projectType") === "PARAPHARMACIA"
                    ? "border-primary bg-primary/5"
                    : "border-muted"
                }`}
              >
                <RadioGroupItem value="PARAPHARMACIA" id="type-parapharmacia" className="sr-only" />
                <Sparkles className={`h-8 w-8 mb-2 ${step1Form.watch("projectType") === "PARAPHARMACIA" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-medium">Parapharmacie</span>
                <span className="text-xs text-muted-foreground text-center mt-1">Cosmétiques, soins et hygiène</span>
              </Label>
            </RadioGroup>
            {step1Form.formState.errors.projectType && (
              <p className="text-xs text-destructive">{step1Form.formState.errors.projectType.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nom">Nom complet</Label>
            <Input id="nom" placeholder="Nom Prénom" {...step1Form.register("nom")} />
            {step1Form.formState.errors.nom && <p className="text-xs text-destructive">{step1Form.formState.errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="email@example.com" {...step1Form.register("email")} />
            {step1Form.formState.errors.email && <p className="text-xs text-destructive">{step1Form.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nomProjet">Nom de la {projectLabel}</Label>
            <Input 
              id="nomProjet" 
              placeholder="Nom de votre établissement" 
              {...step1Form.register("nomProjet")} 
            />
            {step1Form.formState.errors.nomProjet && <p className="text-xs text-destructive">{step1Form.formState.errors.nomProjet.message}</p>}
          </div>
          <Button type="submit" className="w-full">
            Continuer <ArrowRight size={18} className="ml-2" />
          </Button>
        </form>
      )}

      {step === 2 && (
        <form className="space-y-4" onSubmit={step2Form.handleSubmit(onStep2Submit)}>
          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input id="adresse" placeholder="Adresse complète" {...step2Form.register("adresse")} />
            {step2Form.formState.errors.adresse && <p className="text-xs text-destructive">{step2Form.formState.errors.adresse.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ville">Ville</Label>
              <Input id="ville" placeholder="Votre ville" {...step2Form.register("ville")} />
              {step2Form.formState.errors.ville && <p className="text-xs text-destructive">{step2Form.formState.errors.ville.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pays">Pays</Label>
              <Input id="pays" placeholder="Votre pays" {...step2Form.register("pays")} />
              {step2Form.formState.errors.pays && <p className="text-xs text-destructive">{step2Form.formState.errors.pays.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="telephone">Téléphone (optionnel)</Label>
            <PhoneInput
              id="telephone"
              value={step2Form.watch("telephone")}
              onChange={(value) => step2Form.setValue("telephone", value)}
            />
            {step2Form.formState.errors.telephone && <p className="text-xs text-destructive">{step2Form.formState.errors.telephone.message}</p>}
            <p className="text-xs text-muted-foreground">Numéro de contact uniquement.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
              <ArrowLeft size={18} className="mr-2" /> Retour
            </Button>
            <Button type="submit" className="flex-1">
              Continuer <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form className="space-y-4" onSubmit={step3Form.handleSubmit(onStep3Submit)}>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" placeholder="••••••••" {...step3Form.register("password")} />
            {step3Form.formState.errors.password && <p className="text-xs text-destructive">{step3Form.formState.errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input id="confirmPassword" type="password" placeholder="••••••••" {...step3Form.register("confirmPassword")} />
            {step3Form.formState.errors.confirmPassword && <p className="text-xs text-destructive">{step3Form.formState.errors.confirmPassword.message}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
              <ArrowLeft size={18} className="mr-2" /> Retour
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check size={18} className="mr-2" />}
              {isPending ? "Création..." : "Créer le compte"}
            </Button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthFormLayout>
  );
}
