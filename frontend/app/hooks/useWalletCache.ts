// Stub wallet cache hook for MVP

interface WalletBalance {
  asset_code: string;
  asset_issuer?: string;
  asset_type: string;
  balance: string;
  usd_value: number;
}

export function useWalletCache() {
  return {
    getCachedBalance: () => null,
    setCachedBalance: () => { },
    clearCache: () => { },
  };
}

export function useWalletBalances(address?: string | null, network?: string | null, horizonUrl?: string | null) {
  return {
    data: [] as WalletBalance[],
    isLoading: false,
    error: null,
    dataUpdatedAt: Date.now(),
    refetch: () => Promise.resolve(),
  };
}
