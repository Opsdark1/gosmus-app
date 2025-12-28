"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function Dialog({ children, ...props }: RadixDialog.DialogProps) {
  return <RadixDialog.Root {...props}>{children}</RadixDialog.Root>;
}

function DialogTrigger({ className, ...props }: RadixDialog.DialogTriggerProps) {
  return <RadixDialog.Trigger className={cn("cursor-pointer", className)} {...props} />;
}

function DialogPortal({ children }: { children?: React.ReactNode }) {
  return <RadixDialog.Portal>{children}</RadixDialog.Portal>;
}

function DialogOverlay({ className, ...props }: RadixDialog.DialogOverlayProps) {
  return (
    <RadixDialog.Overlay 
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )} 
      {...props} 
    />
  );
}

function DialogContent({ className, children, ...props }: RadixDialog.DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
          "flex flex-col max-h-[85vh] p-0 gap-0",
          "rounded-xl border border-border bg-background shadow-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          "duration-200 focus:outline-none",
          "[&>form]:contents",
          className
        )}
        {...props}
      >
        {children}
        <RadixDialog.Close className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer z-10">
          <X className="h-4 w-4" />
          <span className="sr-only">Fermer</span>
        </RadixDialog.Close>
      </RadixDialog.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "flex flex-col gap-1.5 p-6 pb-4 border-b shrink-0", 
        className
      )} 
      {...props} 
    />
  );
}

function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "flex-1 overflow-y-auto p-6", 
        className
      )} 
      {...props} 
    />
  );
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "flex flex-col-reverse gap-2 p-4 border-t shrink-0 sm:flex-row sm:justify-end", 
        className
      )} 
      {...props} 
    />
  );
}

function DialogTitle({ className, ...props }: RadixDialog.DialogTitleProps) {
  return <RadixDialog.Title className={cn("text-lg font-semibold text-foreground", className)} {...props} />;
}

function DialogDescription({ className, ...props }: RadixDialog.DialogDescriptionProps) {
  return <RadixDialog.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogBody,
  DialogFooter, 
  DialogTitle, 
  DialogDescription 
};
