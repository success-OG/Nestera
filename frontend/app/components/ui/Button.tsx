"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Props for the Button component
 * 
 * @param variant - Button style variant: 'primary', 'secondary', 'outline', 'ghost', 'danger'
 * @param size - Button size: 'sm', 'md', 'lg'
 * @param loading - Show loading spinner and disable interactions
 * @param leftIcon - Icon to display before children
 * @param rightIcon - Icon to display after children
 * @param fullWidth - Whether the button should take up 100% of the container width
 * @param disabled - Standard HTML disabled attribute
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

/**
 * Highly reusable button component supporting various themes, sizes, and states.
 * Follows WAI-ARIA patterns for accessible buttons.
 */

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[#061a1a] font-semibold hover:brightness-110 focus-visible:ring-[var(--color-accent)]",
  secondary:
    "bg-[var(--color-surface)] border border-[var(--color-border-strong)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] focus-visible:ring-[var(--color-accent)]",
  outline:
    "bg-transparent border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] focus-visible:ring-[var(--color-accent)]",
  ghost:
    "bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] focus-visible:ring-[var(--color-accent)]",
  danger:
    "bg-[var(--color-danger)] text-white font-semibold hover:brightness-110 focus-visible:ring-[var(--color-danger)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg min-h-8",
  md: "px-5 py-2.5 text-sm gap-2 rounded-xl min-h-10",
  lg: "px-7 py-3 text-base gap-2.5 rounded-xl min-h-12",
};

const spinnerSize: Record<ButtonSize, number> = { sm: 12, md: 14, lg: 16 };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        className={clsx(
          "inline-flex items-center justify-center font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
          "active:scale-[0.97] select-none",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={spinnerSize[size]} className="animate-spin shrink-0" aria-hidden="true" />
        ) : leftIcon ? (
          <span className="shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}
        <span>{children}</span>
        {!loading && rightIcon ? (
          <span className="shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        ) : null}
      </button>
    );
  },
);

Button.displayName = "Button";
