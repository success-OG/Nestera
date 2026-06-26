"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import { Button } from '@/app/components/ui/Button';
import { type Theme, useTheme } from "../context/ThemeContext";

const themeOptions: Array<{
  value: Theme;
  label: string;
  description: string;
  Icon: typeof Sun;
}> = [
  {
    value: "light",
    label: "Light",
    description: "Bright interface for daytime use",
    Icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Low-glare theme for focused sessions",
    Icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device appearance",
    Icon: Monitor,
  },
];

/**
 * Props for the ThemeToggle component
 * 
 * @param compact - If true, only shows the icon without text label.
 * @param fullWidth - If true, the toggle takes up the full width of its container.
 * @param className - Additional CSS classes.
 */
interface ThemeToggleProps {
  compact?: boolean;
  fullWidth?: boolean;
  className?: string;
}

/**
 * A theme switcher component that allows users to choose between Light, Dark, and System themes.
 * Uses `ThemeContext` to manage and persist theme preferences.
 * 
 * @example
 * ```tsx
 * <ThemeToggle compact={false} />
 * ```
 */
export default function ThemeToggle({
  compact = false,
  fullWidth = false,
  className,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  // Arrow-key navigation inside the open menu
  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? []
    );
    const focused = document.activeElement as HTMLElement;
    const idx = items.indexOf(focused as HTMLButtonElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  const activeOption = useMemo(
    () => themeOptions.find((option) => option.value === theme) ?? themeOptions[2],
    [theme]
  );

  const ActiveIcon = activeOption.Icon;
  const resolvedLabel = resolvedTheme === "dark" ? "Dark" : "Light";

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <Button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setIsOpen(true); }
        }}
        aria-label={`Theme: ${activeOption.label}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        variant="ghost"
        size={compact ? "sm" : "md"}
        className={clsx(
          "inline-flex items-center",
          "shadow-sm hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
          compact
            ? "h-10 w-10 justify-center"
            : "gap-2 px-3.5 py-2.5 text-sm font-medium",
          fullWidth && "w-full justify-between"
        )}
      >
        <span className="inline-flex items-center justify-center">
          <ActiveIcon size={16} className="text-[var(--color-accent)]" />
        </span>
        {!compact ? (
          <>
            <span className="text-left">
              <span className="block leading-none">{activeOption.label}</span>
              <span className="mt-0.5 block text-xs text-[var(--color-text-muted)] leading-none">
                {theme === "system" ? `Following ${resolvedLabel}` : `Using ${resolvedLabel}`}
              </span>
            </span>
            <ChevronDown size={16} className="ml-auto text-[var(--color-text-muted)]" />
          </>
        ) : null}
      </Button>

      {isOpen ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Theme selector"
          onKeyDown={handleMenuKeyDown}
          className={clsx(
            "absolute z-50 mt-2 min-w-[220px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-1.5 shadow-xl",
            compact ? "right-0" : "left-0"
          )}
        >
          {themeOptions.map(({ value, label, description, Icon }, i) => {
            const selected = theme === value;

            return (
              <Button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                tabIndex={i === 0 ? 0 : -1}
                onClick={() => {
                  setTheme(value);
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                variant={selected ? "secondary" : "ghost"}
                size="md"
                className={clsx(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:ring-inset",
                  selected ? "bg-[var(--color-accent-soft)] text-[var(--color-text)]" : "text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-accent)]">
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-none">{label}</span>
                  <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                    {description}
                  </span>
                </span>
                {selected ? <Check size={16} className="text-[var(--color-accent)]" /> : null}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
