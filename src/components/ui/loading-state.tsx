"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "dots" | "pulse";
}

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

const paddingClasses = {
  sm: "py-6",
  md: "py-12",
  lg: "py-16",
};

/**
 * Composant générique pour afficher un état de chargement
 * Variantes: spinner (défaut), dots, pulse
 */
export function LoadingState({ 
  message, 
  className,
  size = "md",
  variant = "spinner"
}: LoadingStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3",
      paddingClasses[size],
      className
    )}>
      {variant === "spinner" && (
        <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      )}
      
      {variant === "dots" && (
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "rounded-full bg-primary animate-bounce",
                size === "sm" ? "h-2 w-2" : size === "md" ? "h-3 w-3" : "h-4 w-4"
              )}
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      )}
      
      {variant === "pulse" && (
        <div className={cn(
          "rounded-full bg-primary/20 animate-pulse",
          size === "sm" ? "h-10 w-10" : size === "md" ? "h-16 w-16" : "h-20 w-20"
        )}>
          <div className={cn(
            "rounded-full bg-primary/40 animate-ping",
            size === "sm" ? "h-10 w-10" : size === "md" ? "h-16 w-16" : "h-20 w-20"
          )} />
        </div>
      )}
      
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
 * Overlay de chargement plein écran
 * Utilisé pour les chargements globaux de page
 */
export function LoadingOverlay({ 
  message = "Chargement...",
  className 
}: { 
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
      className
    )}>
      <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-card border shadow-lg animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
          <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-primary" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Indicateur de chargement inline
 * Utilisé pour les boutons ou petits éléments
 */
export function InlineLoader({ className }: { className?: string }) {
  return (
    <Loader2 className={cn("h-4 w-4 animate-spin", className)} />
  );
}
