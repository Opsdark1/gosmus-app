"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "animate-pulse rounded-md bg-muted/60",
        className
      )} 
    />
  );
}

/**
 * Skeleton pour le header de page
 */
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Skeleton className="hidden sm:block h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-10 w-40" />
    </div>
  );
}

/**
 * Skeleton pour la barre de recherche et filtres
 */
export function SearchFiltersSkeleton({ filtersCount = 2 }: { filtersCount?: number }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: filtersCount }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-[160px]" />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton pour une ligne de table
 */
export function TableRowSkeleton({ columnsCount = 5 }: { columnsCount?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columnsCount }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-5 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton pour une table complète
 */
export function TableSkeleton({ 
  rowsCount = 5, 
  columnsCount = 5 
}: { 
  rowsCount?: number;
  columnsCount?: number;
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {Array.from({ length: columnsCount }).map((_, i) => (
                <th key={i} className="p-4 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowsCount }).map((_, i) => (
              <TableRowSkeleton key={i} columnsCount={columnsCount} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton para una página completa (header + stats + filters + table)
 */
export function PageSkeleton({
  hasFilters = true,
  filtersCount = 2,
  rowsCount = 8,
  columnsCount = 5,
  showStats = false,
  statsCount = 4,
}: {
  hasFilters?: boolean;
  filtersCount?: number;
  rowsCount?: number;
  columnsCount?: number;
  showStats?: boolean;
  statsCount?: number;
}) {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <PageHeaderSkeleton />
      {showStats && (
        <div className={cn(
          "grid gap-4",
          statsCount <= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"
        )}>
          {Array.from({ length: statsCount }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}
      {hasFilters && <SearchFiltersSkeleton filtersCount={filtersCount} />}
      <TableSkeleton rowsCount={rowsCount} columnsCount={columnsCount} />
    </div>
  );
}

/**
 * Skeleton pour cards de statistiques
 */
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20 mb-1" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/**
 * Grille de cards statistiques skeleton
 */
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton pour formulaire
 */
export function FormSkeleton({ fieldsCount = 4 }: { fieldsCount?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fieldsCount }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
