"use client";

import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const paddingClasses = {
  sm: "py-6",
  md: "py-12",
  lg: "py-16",
};

/**
 * Spinner simple et unifié - utilisé partout dans l'app
 */
export function Spinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <div className={cn(
      "animate-spin rounded-full border-3 border-primary/30 border-t-primary",
      sizeClasses[size],
      className
    )} />
  );
}

/**
 * Composant générique pour afficher un état de chargement
 */
export function LoadingState({ 
  message, 
  className,
  size = "md",
}: LoadingStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3",
      paddingClasses[size],
      className
    )}>
      <Spinner size={size} />
      {message && (
        <p className={cn(
          "text-muted-foreground text-center",
          size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
        )}>
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Chargement plein écran - UNIQUE pour toute l'app
 * Utilisé pour: auth, dashboard loading, transitions de page
 */
export function FullPageLoader({ className }: { className?: string }) {
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-background",
      className
    )}>
      <Spinner size="lg" />
    </div>
  );
}

/**
 * Overlay de chargement avec backdrop
 * Utilisé pour les actions modales
 */
export function LoadingOverlay({ className }: { className?: string }) {
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
      className
    )}>
      <Spinner size="lg" />
    </div>
  );
}

/**
 * Indicateur de chargement inline
 * Utilisé pour les boutons ou petits éléments
 */
export function InlineLoader({ className }: { className?: string }) {
  return <Spinner size="sm" className={className} />;
}
