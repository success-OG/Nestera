"use client";

import React from "react";
import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
}

/**
 * Reusable skeleton placeholder component.
 * Shimmer animation is automatically disabled when the user has `prefers-reduced-motion: reduce` set.
 * 
 * @example
 * ```tsx
 * <Skeleton className="h-4 w-24" />
 * ```
 * 
 * @param className - Tailwind classes to define dimensions and shape (e.g., 'h-4 w-full rounded-full').
 */
const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div
    aria-hidden="true"
    className={clsx("rounded bg-white/[0.06] skeleton-shimmer", className)}
  />
);

export default Skeleton;
