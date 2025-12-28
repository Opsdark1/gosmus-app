"use client";

import { ReactNode } from "react";
import { Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  placeholder: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  width?: string;
}

interface SearchFiltersProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: FilterConfig[];
  onReset?: () => void;
  showResetButton?: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * Composant de recherche et filtres standardisé
 * Utilisé dans toutes les pages avec des listes filtrables
 */
export function SearchFilters({
  search,
  filters = [],
  onReset,
  showResetButton = true,
  children,
  className,
}: SearchFiltersProps) {
  const hasActiveFilters = filters.some(f => f.value !== "all" && f.value !== "");
  const hasSearch = search && search.value.trim() !== "";
  const shouldShowReset = showResetButton && (hasActiveFilters || hasSearch);

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Barre de recherche */}
          {search && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={search.placeholder || "Rechercher..."}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {/* Filtres */}
          {(filters.length > 0 || children) && (
            <div className="flex flex-wrap items-center gap-3">
              {filters.map((filter) => (
                <Select 
                  key={filter.key} 
                  value={filter.value} 
                  onValueChange={filter.onChange}
                >
                  <SelectTrigger className={cn("w-full sm:w-auto", filter.width || "sm:w-[160px]")}>
                    <SelectValue placeholder={filter.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
              
              {children}

              {shouldShowReset && onReset && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onReset}
                  className="cursor-pointer"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Réinitialiser
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
