"use client";

import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuthFormLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
  width?: "xs" | "sm" | "md" | "lg";
}

const widthClasses = {
  xs: "w-full max-w-[400px]",
  sm: "w-full max-w-[480px]",
  md: "w-full max-w-[520px]",
  lg: "w-full max-w-[600px]",
};

export function AuthFormLayout({ children, title, subtitle, className, width = "sm" }: AuthFormLayoutProps) {
  return (
    <Card className={cn(widthClasses[width], "p-6 shadow-xl", className)}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}
