// Stub monitoring utilities for MVP
// Can be replaced with real monitoring later

export function captureError(error: Error | unknown, context?: Record<string, any>) {
    console.error("[Monitoring] Error:", error, context);
}

export function captureWalletError(error: Error | unknown, context?: Record<string, any> | string, extra?: any) {
    console.error("[Wallet Error]:", error, context, extra);
}

export function captureApiError(error: Error | unknown, context?: Record<string, any> | string, extra1?: any, extra2?: any) {
    console.error("[API Error]:", error, context, extra1, extra2);
}

export function addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    data?: Record<string, any>;
    level?: string;
}) {
    console.log("[Breadcrumb]:", breadcrumb.message, breadcrumb);
}
