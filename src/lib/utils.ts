import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SortDirection = "asc" | "desc" | null;

export interface SortOptions<T> {
  items: T[];
  sortKey: string | null;
  sortDirection: SortDirection;
  getValue: (item: T, key: string) => string | number | null | undefined;
}

export function sortItems<T>(options: SortOptions<T>): T[] {
  const { items, sortKey, sortDirection, getValue } = options;
  
  if (!sortKey || !sortDirection || items.length === 0) {
    return items;
  }

  return [...items].sort((a, b) => {
    const aVal = getValue(a, sortKey);
    const bVal = getValue(b, sortKey);

    if (aVal === null || aVal === undefined || aVal === "") return 1;
    if (bVal === null || bVal === undefined || bVal === "") return -1;

    let comparison = 0;

    if (typeof aVal === "string" && typeof bVal === "string") {
      comparison = aVal.localeCompare(bVal, "fr");
    } else if (typeof aVal === "number" && typeof bVal === "number") {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal), "fr");
    }

    return sortDirection === "desc" ? -comparison : comparison;
  });
}
