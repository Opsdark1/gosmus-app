"use client";

import { useState, useCallback } from "react";
import type { SortDirection } from "@/types/entities";

interface UseSortableTableOptions {
  defaultSortKey?: string | null;
  defaultSortDirection?: SortDirection;
  onSort?: () => void;
}

interface UseSortableTableReturn {
  sortKey: string | null;
  sortDirection: SortDirection;
  handleSort: (key: string) => void;
  setSortKey: (key: string | null) => void;
  setSortDirection: (direction: SortDirection) => void;
}

/**
 * Hook pour gérer le tri des tableaux
 * @param options - Options de configuration
 * @returns État et handlers pour le tri
 */
export function useSortableTable(
  options: UseSortableTableOptions = {}
): UseSortableTableReturn {
  const {
    defaultSortKey = null,
    defaultSortDirection = "asc",
    onSort,
  } = options;

  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    onSort?.();
  }, [sortKey, onSort]);

  return {
    sortKey,
    sortDirection,
    handleSort,
    setSortKey,
    setSortDirection,
  };
}
