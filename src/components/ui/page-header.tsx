"use client";

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "ghost" | "destructive";
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: PageAction[];
  className?: string;
}

/**
 * En-tête de page standardisé avec titre, description et actions
 * Utilisé sur toutes les pages du dashboard pour une apparence cohérente
 */
export function PageHeader({ 
  title, 
  description, 
  icon: Icon,
  actions = [],
  className 
}: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
      className
    )}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {actions.map((action, index) => (
            <Button 
              key={index}
              variant={action.variant || "default"}
              onClick={action.onClick}
              className="cursor-pointer"
            >
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
