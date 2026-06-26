"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
}

interface Toast extends Required<Omit<ToastOptions, "duration">> {
  id: string;
  duration: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const typeClasses: Record<ToastType, string> = {
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 [&_.toast-accent]:bg-emerald-400",
  error:
    "border-rose-500/30 bg-rose-500/10 text-rose-200 [&_.toast-accent]:bg-rose-400",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-200 [&_.toast-accent]:bg-amber-400",
  info: "border-cyan-500/30 bg-cyan-500/10 text-cyan-100 [&_.toast-accent]:bg-cyan-400",
};

const typeIcon: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={17} />,
  error: <AlertCircle size={17} />,
  warning: <AlertTriangle size={17} />,
  info: <Info size={17} />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message = "", type = "info", duration = 4500 }: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const toast: Toast = { id, title, message, type, duration };
      setToasts((current) => [...current, toast]);

      window.setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (title, message) => showToast({ title, message, type: "success" }),
      error: (title, message) => showToast({ title, message, type: "error" }),
      warning: (title, message) => showToast({ title, message, type: "warning" }),
      info: (title, message) => showToast({ title, message, type: "info" }),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[min(92vw,360px)] flex-col gap-3"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-sm animate-slide-in-right ${typeClasses[toast.type]}`}
          >
            <div className="flex items-start gap-3 p-4">
              <span className="mt-0.5 shrink-0">{typeIcon[toast.type]}</span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-sm font-semibold">{toast.title}</p>
                {toast.message ? (
                  <p className="m-0 mt-1 text-xs opacity-90">{toast.message}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-md p-1 text-current/80 hover:bg-white/10 hover:text-current"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
            <div
              className="toast-accent h-1 animate-[toast-progress_linear_forwards]"
              style={{ animationDuration: `${toast.duration}ms` }}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

