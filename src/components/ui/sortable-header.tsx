"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: string | null;
  currentDirection: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDirection,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSort === sortKey;

  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-1 font-medium cursor-pointer hover:text-foreground transition-colors select-none",
        isActive ? "text-foreground" : "text-muted-foreground",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive ? (
        currentDirection === "asc" ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      )}
    </button>
  );
}

export function useSorting<T>(
  data: T[],
  sortKey: string | null,
  sortDirection: SortDirection,
  sortFn?: (a: T, b: T, key: string, direction: SortDirection) => number
): T[] {
  if (!Array.isArray(data)) return [];
  if (data.length === 0) return [];
  if (!sortKey || !sortDirection) return data;

  return [...data].sort((a: T, b: T) => {
    if (sortFn) {
      return sortFn(a, b, sortKey, sortDirection);
    }

    const aVal = (a as Record<string, unknown>)[sortKey];
    const bVal = (b as Record<string, unknown>)[sortKey];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    let comparison = 0;
    if (typeof aVal === "string" && typeof bVal === "string") {
      comparison = aVal.localeCompare(bVal, "fr");
    } else if (typeof aVal === "number" && typeof bVal === "number") {
      comparison = aVal - bVal;
    } else if (aVal instanceof Date && bVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime();
    } else {
      comparison = String(aVal).localeCompare(String(bVal), "fr");
    }

    return sortDirection === "desc" ? -comparison : comparison;
  });
}
