"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useWalletWebSocket } from "../hooks/useWalletWebSocket";
import { usePrices, getAssetPrice } from "../hooks/usePrices";
import { env } from "../lib/env";
import { queryClient } from "./QueryProvider";
import { rateLimitedFetch } from "../lib/api-client";
import { captureWalletError, addBreadcrumb } from "../lib/monitoring";

interface Balance {
  asset_code: string;
  balance: string;
  asset_type: string;
  asset_issuer?: string;
  usd_value: number;
}

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "locked"
  | "error";

interface WalletState {
  address: string | null;
  network: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isBalancesLoading: boolean;
  error: string | null;
  balanceError: string | null;
  balances: Balance[];
  totalUsdValue: number;
  lastBalanceSync: number | null;
  connectionStatus: ConnectionStatus;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  fetchBalances: () => Promise<void>;
  optimisticUpdateBalance: (assetCode: string, newBalance: string) => void;
  rollbackBalance: (assetCode: string, originalBalance: string) => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const STORAGE_KEY = "nestera_wallet_network";

type FreighterLike = {
  isConnected?: () => Promise<{ isConnected?: boolean } | boolean>;
  getAddress?: () => Promise<{ address?: string } | string>;
  getNetwork?: () => Promise<{ network?: string } | string>;
  requestAccess?: () => Promise<{ address?: string; error?: string } | string>;
};

type HorizonBalance = {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
};

const getFreighter = (): FreighterLike | undefined => {
  if (typeof window === "undefined") return undefined;
  return (window as typeof window & { freighter?: FreighterLike }).freighter;
};

const readAddress = async (freighter: FreighterLike) => {
  const result = await freighter.getAddress?.();
  return typeof result === "string" ? result : result?.address ?? null;
};

const readNetwork = async (freighter: FreighterLike) => {
  const result = await freighter.getNetwork?.();
  return typeof result === "string" ? result : result?.network ?? null;
};

const readConnection = async (freighter: FreighterLike) => {
  const result = await freighter.isConnected?.();
  return typeof result === "boolean" ? result : !!result?.isConnected;
};

const INITIAL_STATE: WalletState = {
  address: null,
  network: null,
  isConnected: false,
  isLoading: false,
  isBalancesLoading: false,
  error: null,
  balanceError: null,
  balances: [],
  totalUsdValue: 0,
  lastBalanceSync: null,
  connectionStatus: "idle",
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(INITIAL_STATE);
// Removed refreshInterval and polling logic; will use WebSocket for live balances.
// We'll keep the ref for potential fallback polling.
const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: prices } = usePrices();

  const getHorizonUrl = (network: string | null) =>
    network?.toLowerCase() === "public" ? env.horizonPublic : env.horizonTestnet;

  const fetchBalances = useCallback(async () => {
    if (!state.address) {
      queryClient.removeQueries({ queryKey: ["balances"] });
      return;
    }

// Removed fetchBalances polling interval references elsewhere; unchanged.

    setState((s) => ({ ...s, isBalancesLoading: true, balanceError: null }));

    addBreadcrumb({
      message: "Fetching wallet balances",
      category: "wallet",
      data: { network: state.network },
      level: "info",
    });

    try {
      const horizonUrl = getHorizonUrl(state.network).replace(/\/$/, "");
      const res = await rateLimitedFetch(`${horizonUrl}/accounts/${state.address}`);
      if (!res.ok) {
        throw new Error("Unable to refresh wallet balances.");
      }

      const account = await res.json();
      let totalUsd = 0;

      const balances: Balance[] = ((account.balances ?? []) as HorizonBalance[]).map((balance) => {
        const code = balance.asset_type === "native" ? "XLM" : balance.asset_code ?? "UNKNOWN";
        const price = getAssetPrice(prices, code);
        const usdValue = parseFloat(balance.balance) * price;
        totalUsd += usdValue;

        return {
          asset_code: code,
          balance: balance.balance,
          asset_type: balance.asset_type,
          asset_issuer: balance.asset_issuer,
          usd_value: usdValue,
        };
      });

      setState((s) => ({
        ...s,
        balances,
        totalUsdValue: totalUsd,
        isBalancesLoading: false,
        balanceError: null,
        lastBalanceSync: Date.now(),
      }));
    } catch (error) {
      captureWalletError(error, "fetchBalances", state.address);
      setState((s) => ({
        ...s,
        isBalancesLoading: false,
        balanceError: error instanceof Error ? error.message : "Unable to refresh wallet balances.",
      }));
    }
  }, [state.address, state.network, prices]);

  useEffect(() => {
    const savedNetwork =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

    (async () => {
      try {
        const freighter = getFreighter();
        const connected = freighter ? await readConnection(freighter) : false;
        if (connected && freighter) {
          const [address, walletNetwork] = await Promise.all([
            readAddress(freighter),
            readNetwork(freighter),
          ]);
          if (address) {
            const network = walletNetwork ?? savedNetwork ?? null;
            if (network) localStorage.setItem(STORAGE_KEY, network);
            setState((s) => ({
              ...s,
              address,
              network,
              isConnected: true,
              connectionStatus: "connected",
            }));
          }
        } else {
          setState((s) => ({
            ...s,
            connectionStatus: savedNetwork ? "disconnected" : "idle",
          }));
        }
      } catch {
        setState((s) => ({ ...s, connectionStatus: "idle" }));
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.isConnected) return;

    disconnectCheckInterval.current = setInterval(async () => {
      try {
        const freighter = getFreighter();
        const connected = freighter ? await readConnection(freighter) : false;
        if (!connected) {
          queryClient.removeQueries({ queryKey: ["balances"] });
          setState((s) => ({
            ...s,
            isConnected: false,
            connectionStatus: "locked",
            address: null,
            balances: [],
            totalUsdValue: 0,
            isBalancesLoading: false,
            lastBalanceSync: null,
          }));
        }
      } catch {
        // Freighter can be unavailable while the extension reloads.
      }
    }, 5000);

    return () => {
      if (disconnectCheckInterval.current) {
        clearInterval(disconnectCheckInterval.current);
        disconnectCheckInterval.current = null;
      }
    };
  }, [state.isConnected]);

// Use WebSocket for real-time balances
  const { balances: wsBalances, status: wsStatus, error: wsError } = useWalletWebSocket(state.address);

  // Sync WebSocket balances to state
  useEffect(() => {
    if (wsBalances && wsBalances.length > 0) {
      const totalUsd = wsBalances.reduce((acc: number, b: { usd_value: number }) => acc + b.usd_value, 0);
      setState((s) => ({
        ...s,
        balances: wsBalances,
        totalUsdValue: totalUsd,
        isBalancesLoading: false,
        balanceError: null,
        lastBalanceSync: Date.now(),
      }));
    }
    if (wsError) {
      // fallback to polling if WebSocket fails
      fetchBalances();
      if (refreshInterval.current) clearInterval(refreshInterval.current);
      refreshInterval.current = setInterval(fetchBalances, 30000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsBalances, wsError, state.address]);

  // Cleanup when address changes
  useEffect(() => {
    if (!state.address) {
      setState((s) => ({
        ...s,
        balances: [],
        totalUsdValue: 0,
        isBalancesLoading: false,
        balanceError: null,
        lastBalanceSync: null,
      }));
    }
  }, [state.address]);

  // Remove old polling interval effect
  // (the block from lines 233-257 has been replaced)


  const connect = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null, connectionStatus: "connecting" }));

    addBreadcrumb({
      message: "Wallet connect initiated",
      category: "wallet",
      level: "info",
    });

    try {
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = setTimeout(() => {
        const timeoutError = new Error("Connection timed out");
        captureWalletError(timeoutError, "connect_timeout");
        setState((s) => ({
          ...s,
          isLoading: false,
          connectionStatus: "error",
          error: "Connection timed out",
        }));
      }, 15000);

      const freighter = getFreighter();
      if (!freighter?.requestAccess) {
        throw new Error("Freighter wallet extension is not available.");
      }

      const accessResult = await freighter.requestAccess();
      const accessError = typeof accessResult === "string" ? null : accessResult?.error;
      if (accessError) {
        if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
        captureWalletError(new Error(accessError), "connect_rejected");
        setState((s) => ({
          ...s,
          isLoading: false,
          error: accessError ?? "Connection rejected",
          connectionStatus: "error",
        }));
        return;
      }

      const [address, walletNetwork] = await Promise.all([
        readAddress(freighter),
        readNetwork(freighter),
      ]);
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;

      const network = walletNetwork ?? null;
      if (network) localStorage.setItem(STORAGE_KEY, network);

      addBreadcrumb({
        message: "Wallet connected successfully",
        category: "wallet",
        data: { network },
        level: "info",
      });

      setState((s) => ({
        ...s,
        address,
        network,
        isConnected: !!address,
        isLoading: false,
        error: null,
        balanceError: null,
        connectionStatus: address ? "connected" : "error",
      }));
    } catch (error) {
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
      captureWalletError(error, "connect");
      setState((s) => ({
        ...s,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to connect wallet",
        connectionStatus: "error",
      }));
    }
  }, []);

  const reconnect = useCallback(async () => {
    setState((s) => ({ ...s, error: null, connectionStatus: "connecting" }));
    await connect();
  }, [connect]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    queryClient.removeQueries({ queryKey: ["balances"] });
    setState({ ...INITIAL_STATE, connectionStatus: "idle" });
  }, []);

  const optimisticUpdateBalance = useCallback((assetCode: string, newBalance: string) => {
    setState((s) => {
      const updatedBalances = s.balances.map((b) =>
        b.asset_code === assetCode
          ? { ...b, balance: newBalance }
          : b
      );
      const totalUsd = updatedBalances.reduce((acc, b) => acc + b.usd_value, 0);
      return {
        ...s,
        balances: updatedBalances,
        totalUsdValue: totalUsd,
      };
    });
  }, []);

  const rollbackBalance = useCallback((assetCode: string, originalBalance: string) => {
    setState((s) => {
      const rolledBackBalances = s.balances.map((b) =>
        b.asset_code === assetCode
          ? { ...b, balance: originalBalance }
          : b
      );
      const totalUsd = rolledBackBalances.reduce((acc, b) => acc + b.usd_value, 0);
      return {
        ...s,
        balances: rolledBackBalances,
        totalUsdValue: totalUsd,
      };
    });
  }, []);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, reconnect, fetchBalances, optimisticUpdateBalance, rollbackBalance }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
