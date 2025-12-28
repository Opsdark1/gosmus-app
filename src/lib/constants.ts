export const APP_NAME = "Gosmus";

export const TRIAL_DAYS = 14;
export const PURGE_DAYS_TRIAL = 90;
export const PURGE_DAYS_SUBSCRIPTION = 180;
export const PURGE_DAYS = 90;
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export const SUBSCRIPTION_TYPES = {
  mensuel: { label: "Mensuel", duration: 30 },
  annuel: { label: "Annuel", duration: 365 },
  mensuel_ia: { label: "Mensuel avec IA", duration: 30 },
  annuel_ia: { label: "Annuel avec IA", duration: 365 },
} as const;

export type SubscriptionType = keyof typeof SUBSCRIPTION_TYPES;
export type TrialStatus = "active" | "expired" | "purge";

export function getTrialStatus(essaiFin: Date | null, supprimerApres: Date | null): TrialStatus {
  const now = new Date();
  if (supprimerApres && now > supprimerApres) return "purge";
  if (essaiFin && now > essaiFin) return "expired";
  return "active";
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyShort(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value}`;
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}
