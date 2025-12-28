"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  value: string | number;
  label: string;
  className?: string;
}

export function StatsCard({
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  value,
  label,
  className,
}: StatsCardProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card",
      "sm:flex-col sm:items-start sm:gap-0",
      className
    )}>
      <div className={cn(
        "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg shrink-0",
        iconBg
      )}>
        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)} />
      </div>
      <div className="flex-1 min-w-0 sm:mt-3">
        <p className="text-lg sm:text-2xl font-semibold truncate">{value}</p>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}

interface StatsGridProps {
  children: React.ReactNode;
  className?: string;
}

export function StatsGrid({ children, className }: StatsGridProps) {
  return (
    <div className={cn(
      "grid gap-2 sm:gap-4 grid-cols-2 sm:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
}
