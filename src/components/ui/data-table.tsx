"use client";

import { ReactNode, useMemo } from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import { SortableHeader, SortDirection } from "@/components/ui/sortable-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  key: string;
  header: string | ReactNode;
  sortable?: boolean;
  sortKey?: string;
  align?: "left" | "center" | "right";
  hidden?: "sm" | "md" | "lg" | "xl";
  width?: string;
  render: (item: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  error?: string | null;
  
  // Identifiant unique pour chaque ligne
  getRowKey: (item: T) => string;
  
  // Pagination
  currentPage?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  
  // Tri
  sortKey?: string | null;
  sortDirection?: SortDirection;
  onSort?: (key: string) => void;
  
  // États vides
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  
  // Style
  className?: string;
  cardTitle?: string;
  showPaginationInfo?: boolean;
}

const hiddenClasses = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

const alignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/**
 * Table de données standardisée avec pagination, tri et états de chargement
 * Utilisé dans toutes les pages avec des listes de données
 */
export function DataTable<T>({
  data,
  columns,
  loading = false,
  error = null,
  getRowKey,
  currentPage = 1,
  pageSize = 10,
  totalItems,
  onPageChange,
  sortKey,
  sortDirection,
  onSort,
  emptyIcon,
  emptyTitle = "Aucune donnée",
  emptyMessage,
  emptyAction,
  className,
  cardTitle,
  showPaginationInfo = true,
}: DataTableProps<T>) {
  const total = totalItems ?? data.length;
  const totalPages = Math.ceil(total / pageSize);
  const showPagination = totalPages > 1 && onPageChange;

  // État de chargement
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <LoadingState />
        </CardContent>
      </Card>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive text-center">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // État vide
  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          {emptyIcon ? (
            <EmptyState
              icon={emptyIcon}
              title={emptyTitle}
              message={emptyMessage}
              action={emptyAction}
            />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <h3 className="font-semibold mb-1">{emptyTitle}</h3>
              {emptyMessage && (
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {emptyMessage}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {cardTitle && (
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>{cardTitle} ({total})</span>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      col.hidden && hiddenClasses[col.hidden],
                      alignClasses[col.align || "left"],
                      col.width
                    )}
                  >
                    {col.sortable && onSort ? (
                      <SortableHeader
                        label={typeof col.header === "string" ? col.header : ""}
                        sortKey={col.sortKey || col.key}
                        currentSort={sortKey || null}
                        currentDirection={sortDirection || "asc"}
                        onSort={onSort}
                        className={col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : undefined}
                      />
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">
                        {col.header}
                      </span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={getRowKey(item)} className="hover:bg-muted/50">
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        col.hidden && hiddenClasses[col.hidden],
                        alignClasses[col.align || "left"]
                      )}
                    >
                      {col.render(item, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {showPagination && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
            {showPaginationInfo && (
              <PaginationInfo
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={total}
              />
            )}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
