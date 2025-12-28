import { toast } from "sonner";

export interface ErrorResponse {
  code: string;
  message: string;
  userMessage: string;
  statusCode: number;
}

const firebaseErrorMap: Record<string, { userMessage: string; statusCode: number }> = {
  "auth/email-already-in-use": { userMessage: "Cet email est déjà enregistré", statusCode: 409 },
  "auth/weak-password": { userMessage: "Le mot de passe doit contenir au moins 6 caractères", statusCode: 400 },
  "auth/invalid-email": { userMessage: "Adresse email invalide", statusCode: 400 },
  "auth/user-not-found": { userMessage: "Email ou mot de passe incorrect", statusCode: 401 },
  "auth/wrong-password": { userMessage: "Email ou mot de passe incorrect", statusCode: 401 },
  "auth/invalid-credential": { userMessage: "Identifiants invalides", statusCode: 401 },
  "auth/too-many-requests": { userMessage: "Trop de tentatives, veuillez réessayer plus tard", statusCode: 429 },
  "auth/operation-not-allowed": { userMessage: "Cette méthode d'authentification n'est pas disponible", statusCode: 403 },
  "auth/admin-restricted-operation": { userMessage: "L'inscription par email est désactivée dans Firebase", statusCode: 403 },
};

export function handleFirebaseError(error: unknown): ErrorResponse {
  const e = error as { code?: string; message?: string };
  const code = e.code || "unknown_error";
  const message = e.message || String(error);

  const mapped = firebaseErrorMap[code];

  return {
    code,
    message,
    userMessage: mapped?.userMessage || "Une erreur s'est produite, veuillez réessayer",
    statusCode: mapped?.statusCode || 500,
  };
}

export function toastError(message: string, details?: string) {
  toast.error(message, { description: details, duration: 4000 });
}

export function toastSuccess(message: string, details?: string) {
  toast.success(message, { description: details, duration: 3000 });
}
