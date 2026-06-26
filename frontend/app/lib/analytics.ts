// Stub analytics for MVP
// Can be replaced with real analytics later

export function trackEvent(event: string, properties?: Record<string, any>) {
    console.log("[Analytics] Event:", event, properties);
}

export function reportError(error: Error | unknown, context?: Record<string, any>) {
    console.error("[Analytics] Error:", error, context);
}
