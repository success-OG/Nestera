"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { captureError, addBreadcrumb } from "../lib/monitoring";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Label shown in error reports to identify which boundary caught the error */
  name?: string;
}

interface State {
  hasError: boolean;
  eventId?: string;
}

/**
 * React Error Boundary that catches render-time errors in the component tree.
 * Automatically reports to Sentry via the monitoring lib.
 *
 * Note: does NOT catch errors in event handlers or asynchronous code (use try/catch there).
 *
 * @example
 * ```tsx
 * <ErrorBoundary name="Dashboard" fallback={<CustomErrorUI />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);

    addBreadcrumb({
      message: `ErrorBoundary caught error in "${this.props.name ?? "unknown"}"`,
      category: "runtime",
      data: {
        componentStack: info.componentStack?.slice(0, 500),
        boundary: this.props.name,
      },
      level: "error",
    });

    captureError(error, {
      category: "runtime",
      tags: { boundary: this.props.name ?? "unknown" },
      extra: {
        componentStack: info.componentStack?.slice(0, 500),
      },
    });
  }

  handleReset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          className="animate-fade-in flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center"
        >
          <p className="text-lg font-semibold text-red-400">Something went wrong</p>
          <p className="max-w-sm text-sm text-[var(--color-text-muted)]">
            An unexpected error occurred. You can try again or refresh the page.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[#061a1a] hover:brightness-105 active:scale-95 transition-all"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
