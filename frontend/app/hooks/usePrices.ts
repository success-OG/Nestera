// Stub price hook for MVP
export function usePrices() {
    return {
        data: {},
        prices: {},
        loading: false,
        error: null,
    };
}

export function getAssetPrice(prices: any, asset: string): number {
    // Stub prices
    const defaultPrices: Record<string, number> = {
        "USDC": 1.00,
        "XLM": 0.12,
    };
    return prices?.[asset] || defaultPrices[asset] || 0;
}
