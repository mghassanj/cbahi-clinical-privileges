"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LiquidGlassCard,
  LiquidGlassCardContent,
  LiquidGlassCardHeader,
  LiquidGlassCardTitle,
} from "@/components/custom/liquid-glass-card";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  X,
} from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  headerAr?: string;
  cell?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  searchPlaceholder?: string;
  searchKey?: keyof T;
  isLoading?: boolean;
  pageSize?: number;
  showPagination?: boolean;
  showSearch?: boolean;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  onRowClick?: (item: T) => void;
  className?: string;
  actions?: React.ReactNode;
}

function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  title,
  searchPlaceholder,
  searchKey,
  isLoading = false,
  pageSize = 10,
  showPagination = true,
  showSearch = true,
  emptyMessage,
  emptyAction,
  onRowClick,
  className,
  actions,
}: DataTableProps<T>) {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(pageSize);

  // Filter data based on search
  const filteredData = React.useMemo(() => {
    if (!searchTerm || !searchKey) return data;

    return data.filter((item) => {
      const value = item[searchKey];
      if (typeof value === "string") {
        return value.toLowerCase().includes(searchTerm.toLowerCase());
      }
      if (typeof value === "number") {
        return value.toString().includes(searchTerm);
      }
      return false;
    });
  }, [data, searchTerm, searchKey]);

  // Paginate data
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getColumnHeader = (column: Column<T>) => {
    return isRTL && column.headerAr ? column.headerAr : column.header;
  };

  const getCellValue = (item: T, column: Column<T>, index: number) => {
    if (column.cell) {
      return column.cell(item, index);
    }
    const value = (item as Record<string, unknown>)[column.key];
    return value as React.ReactNode;
  };

  if (isLoading) {
    return (
      <LiquidGlassCard className={className}>
        {title && (
          <LiquidGlassCardHeader>
            <LiquidGlassCardTitle>{title}</LiquidGlassCardTitle>
          </LiquidGlassCardHeader>
        )}
        <LiquidGlassCardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </LiquidGlassCardContent>
      </LiquidGlassCard>
    );
  }

  return (
    <LiquidGlassCard className={className}>
      {(title || showSearch || actions) && (
        <LiquidGlassCardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {title && <LiquidGlassCardTitle>{title}</LiquidGlassCardTitle>}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {showSearch && searchKey && (
              <div className="relative">
                <Input
                  placeholder={searchPlaceholder || t("common.actions.search")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                  className="w-full sm:w-64"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600",
                      isRTL ? "left-3" : "right-3"
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            {actions}
          </div>
        </LiquidGlassCardHeader>
      )}
      <LiquidGlassCardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400",
                      isRTL && "text-right",
                      column.width && `w-[${column.width}]`,
                      column.className
                    )}
                  >
                    {getColumnHeader(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {emptyMessage || t("common.messages.noData")}
                      </p>
                      {emptyAction && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={emptyAction.onClick}
                        >
                          {emptyAction.label}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => (
                  <tr
                    key={item.id ?? index}
                    className={cn(
                      "transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          "px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300",
                          isRTL && "text-right",
                          column.className
                        )}
                      >
                        {getCellValue(item, column, index)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {showPagination && filteredData.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <span>
                {t("common.pagination.showing", {
                  from: (currentPage - 1) * itemsPerPage + 1,
                  to: Math.min(currentPage * itemsPerPage, filteredData.length),
                  total: filteredData.length,
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={itemsPerPage.toString()}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-20"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8"
                >
                  {isRTL ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8"
                >
                  {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>

                <span className="px-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {t("common.pagination.page", {
                    current: currentPage,
                    total: totalPages,
                  })}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8"
                >
                  {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8"
                >
                  {isRTL ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </LiquidGlassCardContent>
    </LiquidGlassCard>
  );
}

export { DataTable };
