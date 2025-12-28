"use client";

import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface DetailItem {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
}

interface DetailSection {
  title?: string;
  items: DetailItem[];
  columns?: 1 | 2 | 3;
}

interface DetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  sections?: DetailSection[];
  children?: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const maxWidthClasses = {
  sm: "sm:max-w-[400px]",
  md: "sm:max-w-[500px]",
  lg: "sm:max-w-[600px]",
  xl: "sm:max-w-[700px]",
};

const gridClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
};

/**
 * Dialog de détails standardisé pour afficher les informations d'une entité
 * Utilisé pour afficher les détails de clients, fournisseurs, produits, etc.
 */
export function DetailsDialog({
  open,
  onOpenChange,
  title,
  description,
  sections = [],
  children,
  footer,
  maxWidth = "md",
  className,
}: DetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(maxWidthClasses[maxWidth], className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogBody>
          <div className="space-y-6">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-3">
                {section.title && (
                  <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                    {section.title}
                  </h4>
                )}
                <div className={cn("grid gap-4", gridClasses[section.columns || 2])}>
                  {section.items.map((item, itemIndex) => (
                    <div 
                      key={itemIndex} 
                      className={cn(item.fullWidth && "col-span-full")}
                    >
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <div className="font-medium mt-0.5">
                        {item.value ?? "-"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {children}
            {footer}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Composant d'aide pour afficher un élément de détail simple
 */
export function DetailField({ 
  label, 
  value, 
  className 
}: { 
  label: string; 
  value: ReactNode; 
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="font-medium mt-0.5">{value ?? "-"}</div>
    </div>
  );
}
