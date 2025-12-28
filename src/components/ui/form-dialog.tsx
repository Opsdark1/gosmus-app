"use client";

import { ReactNode, FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: (e: FormEvent) => void;
  loading?: boolean;
  submitLabel?: string;
  loadingLabel?: string;
  cancelLabel?: string;
  submitVariant?: "default" | "destructive";
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const maxWidthClasses = {
  sm: "sm:max-w-[400px]",
  md: "sm:max-w-[500px]",
  lg: "sm:max-w-[600px]",
  xl: "sm:max-w-[700px]",
  "2xl": "sm:max-w-[800px]",
};

/**
 * Dialog de formulaire standardisé avec gestion du submit et états de chargement
 * Utilisé pour tous les formulaires de création et modification
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  loading = false,
  submitLabel = "Enregistrer",
  loadingLabel = "Enregistrement...",
  cancelLabel = "Annuler",
  submitVariant = "default",
  maxWidth = "md",
  className,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(maxWidthClasses[maxWidth], className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <DialogBody>
            <div className="space-y-4">
              {children}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="cursor-pointer"
            >
              {cancelLabel}
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              variant={submitVariant}
              className="cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {loadingLabel}
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
