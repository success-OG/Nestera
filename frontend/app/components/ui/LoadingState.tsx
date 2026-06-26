import React from "react";
import { Loader2 } from "lucide-react";

// Respects prefers-reduced-motion via Tailwind's motion-safe modifier
const pulse = "motion-safe:animate-pulse";

/**
 * Standard spinner component for small loading states.
 * 
 * @example
 * ```tsx
 * <Spinner text="Fetching data..." className="my-4" />
 * ```
 * 
 * @param text - Optional text to display next to the spinner. Defaults to "Loading...".
 * @param className - Additional CSS classes.
 */
export function Spinner({
  text = "Loading...",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={text}
      className={`inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] ${className}`}
    >
      <Loader2 size={16} className="animate-spin text-[var(--color-accent)]" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

/**
 * Simple skeleton line component.
 * 
 * @param className - Additional CSS classes to control width, height, etc.
 */
export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`${pulse} rounded-md bg-white/10 ${className}`}
    />
  );
}

/**
 * Skeleton placeholder for a dashboard metric card.
 */
export function DashboardCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading card"
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
    >
      <SkeletonLine className="mb-4 h-5 w-40" />
      <SkeletonLine className="mb-3 h-10 w-full" />
      <SkeletonLine className="h-4 w-2/3" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Skeleton placeholder for a table row.
 * 
 * @param cols - Number of columns to display.
 */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div
      aria-hidden="true"
      className={`grid gap-4 px-5 py-4 border-b border-white/5 ${pulse}`}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-4 rounded-md bg-white/10" />
      ))}
    </div>
  );
}

/**
 * Skeleton placeholder for a savings pool card.
 */
export function PoolCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className={`${pulse} rounded-2xl border border-white/5 bg-white/5 p-5 space-y-3`}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-white/10" />
          <div className="h-3 w-20 rounded bg-white/10" />
        </div>
      </div>
      <div className="h-3 w-full rounded bg-white/10" />
      <div className="h-3 w-3/4 rounded bg-white/10" />
      <div className="h-9 w-full rounded-xl bg-white/10" />
    </div>
  );
}

/**
 * Skeleton placeholder for a transaction history row.
 */
export function TransactionRowSkeleton() {
  return (
    <div
      aria-hidden="true"
      className={`${pulse} grid grid-cols-6 gap-4 px-5 py-4 border-b border-white/5`}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-4 rounded-md bg-white/10" />
      ))}
    </div>
  );
}

/**
 * Skeleton placeholder for a chart.
 * 
 * @param height - Tailwind height class (e.g., 'h-48').
 */
export function ChartSkeleton({ height = "h-48" }: { height?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      className={`${pulse} ${height} w-full rounded-2xl bg-white/5`}
    >
      <span className="sr-only">Loading chart...</span>
    </div>
  );
}

/**
 * Full page loading fallback component.
 * 
 * @param message - Optional message to display under the spinner.
 */
export function PageLoadingFallback({ message = "Loading..." }: { message?: string }) {
  return (
    <div
      role="status"
      aria-label={message}
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[var(--color-text-muted)]"
    >
      <Loader2 size={32} className="animate-spin text-[var(--color-accent)]" aria-hidden="true" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

/**
 * Timeout message for long-running operations.
 */
export function LoadingTimeout({ message = "This is taking longer than expected..." }: { message?: string }) {
  return (
    <p role="status" className="text-xs text-[var(--color-text-muted)] text-center py-4">
      {message}
    </p>
  );
}
