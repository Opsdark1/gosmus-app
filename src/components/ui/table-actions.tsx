"use client";

import { ReactNode } from "react";
import { LucideIcon, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Iconos predefinidos
const ICON_MAP = {
  eye: Eye,
  pencil: Pencil,
  trash: Trash2,
};

type IconType = keyof typeof ICON_MAP | "custom";

interface ActionButton {
  icon: IconType | LucideIcon;
  customIcon?: ReactNode;
  tooltip: string;
  onClick: () => void;
  variant?: "default" | "ghost" | "destructive";
  className?: string;
  disabled?: boolean;
}

interface TableActionsProps {
  actions: ActionButton[];
  className?: string;
}

/**
 * Actions de table standardisées avec tooltips
 * Utilisé dans toutes les tables pour les actions par ligne
 */
export function TableActions({ actions, className }: TableActionsProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {actions.map((action, index) => {
        // Resolver el icono
        let IconComponent: LucideIcon | null = null;
        let customIconElement: ReactNode = null;

        if (action.icon === "custom" && action.customIcon) {
          customIconElement = action.customIcon;
        } else if (typeof action.icon === "string" && action.icon in ICON_MAP) {
          IconComponent = ICON_MAP[action.icon as keyof typeof ICON_MAP];
        } else if (typeof action.icon === "function") {
          IconComponent = action.icon as LucideIcon;
        }

        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 cursor-pointer",
                  action.variant === "destructive" && "text-destructive hover:text-destructive",
                  action.className
                )}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {customIconElement || (IconComponent && <IconComponent className="h-4 w-4" />)}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{action.tooltip}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// Interfaz para compatibilidad legacy con el antiguo formato
interface LegacyActionButton {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "default" | "ghost" | "destructive";
  className?: string;
  disabled?: boolean;
}

/**
 * Actions CRUD prédéfinies (Voir, Modifier, Supprimer)
 */
interface CrudActionsProps<T> {
  item: T;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  extraActions?: LegacyActionButton[];
  className?: string;
}

export function CrudActions<T>({ 
  item, 
  onView, 
  onEdit, 
  onDelete, 
  extraActions = [],
  className 
}: CrudActionsProps<T>) {
  const actions: ActionButton[] = [];

  if (onView) {
    actions.push({
      icon: "eye",
      tooltip: "Voir les détails",
      onClick: () => onView(item),
    });
  }

  if (onEdit) {
    actions.push({
      icon: "pencil",
      tooltip: "Modifier",
      onClick: () => onEdit(item),
    });
  }

  // Convertir acciones extra al nuevo formato
  extraActions.forEach(extra => {
    actions.push({
      icon: extra.icon,
      tooltip: extra.label,
      onClick: extra.onClick,
      variant: extra.variant,
      className: extra.className,
      disabled: extra.disabled,
    });
  });

  if (onDelete) {
    actions.push({
      icon: "trash",
      tooltip: "Supprimer",
      onClick: () => onDelete(item),
      variant: "destructive",
    });
  }

  return <TableActions actions={actions} className={className} />;
}
