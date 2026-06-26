"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Columns } from "lucide-react";
import { clsx } from "clsx";

export interface TableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  visibleByDefault?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (item: T) => React.ReactNode;
  sortValue?: (item: T) => string | number;
}

export interface ResponsiveTableProps<T> {
  items: T[];
  columns: TableColumn<T>[];
  rowKey: (item: T) => string;
  renderDesktopRow?: (item: T, visibleColumns: string[]) => React.ReactNode;
  renderDesktopHeader?: (visibleColumns: string[]) => React.ReactNode;
  renderMobileCard: (item: T, visibleColumns: string[]) => React.ReactNode;
  pageSize?: number;
  initialSortKey?: string;
  initialSortDirection?: "asc" | "desc";
  showColumnVisibility?: boolean;
  className?: string;
  noDataMessage?: string;
}

function defaultSortValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
}

function defaultSort<T>(items: T[], columns: TableColumn<T>[], sortKey: string, direction: "asc" | "desc") {
  const column = columns.find((column) => column.key === sortKey);
  if (!column) return items;

  return [...items].sort((a, b) => {
    const aValue = column.sortValue ? column.sortValue(a) : (a as any)[sortKey];
    const bValue = column.sortValue ? column.sortValue(b) : (b as any)[sortKey];
    const aSort = defaultSortValue(aValue);
    const bSort = defaultSortValue(bValue);

    if (aSort < bSort) return direction === "asc" ? -1 : 1;
    if (aSort > bSort) return direction === "asc" ? 1 : -1;
    return 0;
  });
}

export function ResponsiveTable<T>({
  items,
  columns,
  rowKey,
  renderDesktopRow,
  renderDesktopHeader,
  renderMobileCard,
  pageSize = 6,
  initialSortKey,
  initialSortDirection = "asc",
  showColumnVisibility = false,
  className,
  noDataMessage = "No items found.",
}: ResponsiveTableProps<T>) {
  const [sortKey, setSortKey] = useState(initialSortKey || columns[0]?.key || "");
  const [sortDirection, setSortDirection] = useState(initialSortDirection);
  const [visibleColumns, setVisibleColumns] = useState(
    columns.filter((column) => column.visibleByDefault !== false).map((column) => column.key),
  );
  const [page, setPage] = useState(1);

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    return defaultSort(items, columns, sortKey, sortDirection);
  }, [items, sortKey, sortDirection, columns]);

  const pageCount = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const currentItems = sortedItems.slice((page - 1) * pageSize, page * pageSize);

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns((current) =>
      current.includes(columnKey)
        ? current.filter((key) => key !== columnKey)
        : [...current, columnKey],
    );
  };

  const handleSort = (columnKey: string) => {
    if (sortKey === columnKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(columnKey);
    setSortDirection("asc");
  };

  return (
    <div className={clsx("rounded-3xl border border-white/10 bg-[#0f2c2c] overflow-hidden", className)}>
      <div className="flex flex-col gap-3 p-4 border-b border-white/10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 text-sm text-[#8cc0c7]">
          <p className="font-semibold text-white">{sortedItems.length} items</p>
          <p>{`Page ${page} of ${pageCount}`}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showColumnVisibility ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8cc0c7] transition hover:border-white/20 hover:bg-white/10"
              aria-expanded="false"
            >
              <Columns size={14} />
              Columns
            </button>
          ) : null}

          <span className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-[#8cc0c7]">
            Sort by {columns.find((col) => col.key === sortKey)?.label ?? ""}
            {sortDirection === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          </span>
        </div>
      </div>

      {showColumnVisibility ? (
        <div className="px-4 pb-4 border-b border-white/10">
          <div className="flex flex-wrap gap-2">
            {columns.map((column) => (
              <button
                type="button"
                key={column.key}
                className={clsx(
                  "rounded-full border px-3 py-2 text-xs font-medium transition",
                  visibleColumns.includes(column.key)
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-200"
                    : "border-white/10 bg-white/5 text-[#94b9bf] hover:border-white/20 hover:bg-white/10",
                )}
                onClick={() => toggleColumn(column.key)}
              >
                {column.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-8 pointer-events-none bg-gradient-to-r from-[#0f2c2c] to-transparent" />
        <div className="absolute inset-y-0 right-0 w-8 pointer-events-none bg-gradient-to-l from-[#0f2c2c] to-transparent" />

        <div className="relative overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="hidden md:block">
              <div className="sticky top-0 z-10 bg-[#0f2c2c]">
                {renderDesktopHeader
                  ? renderDesktopHeader(visibleColumns)
                  : (
                    <div className="grid gap-4 px-5 py-3 text-xs uppercase tracking-widest text-[#5e8c96]">
                      {columns.filter((column) => visibleColumns.includes(column.key)).map((column) => (
                        <div key={column.key} className={clsx(column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left")}>{column.label}</div>
                      ))}
                    </div>
                  )}
              </div>
              <div className="divide-y divide-white/10">
                {currentItems.map((item) => (
                  <div key={rowKey(item)}>{renderDesktopRow ? renderDesktopRow(item, visibleColumns) : null}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="block md:hidden space-y-3 p-4">
        {currentItems.length > 0 ? (
          currentItems.map((item) => (
            <div
              key={rowKey(item)}
              className="rounded-3xl border border-white/10 bg-[#0b1f23] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
            >
              {renderMobileCard(item, visibleColumns)}
            </div>
          ))
        ) : (
          <div className="rounded-3xl bg-[#091318] p-6 text-center text-sm text-[#94b9bf]">
            {noDataMessage}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4 border-t border-white/10 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-[#94b9bf]">Showing {currentItems.length} of {sortedItems.length} results</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-[#c5e7e7] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          >
            Prev
          </button>
          <span className="text-sm text-[#94b9bf]">{page} / {pageCount}</span>
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-[#c5e7e7] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page >= pageCount}
            onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
