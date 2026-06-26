"use client";

import React from "react";
import { useWallet } from "../../context/WalletContext";
import { Loader2, Wallet, ArrowUpRight } from "lucide-react";
import { Button } from "../ui/Button";
import { useWalletBalances } from "../../hooks/useWalletCache";
import { env } from "../../lib/env";
import Skeleton from "../ui/Skeleton";

const WalletBalanceCard: React.FC = () => {
  const { address, network, isConnected, isLoading } = useWallet();

  const horizonUrl =
    network?.toLowerCase() === "public" ? env.horizonPublic : env.horizonTestnet;

  const {
    data: balances = [],
    isLoading: isBalancesLoading,
    error: balanceError,
    dataUpdatedAt,
  } = useWalletBalances(address, network, horizonUrl);

  if (!isConnected) {
    return (
      <div className="bg-[#0e2330] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
        <Wallet size={48} className="text-[#3a5a6a] mb-4" />
        <p className="text-[#6a9fae] text-center">Connect your wallet to view your balances</p>
      </div>
    );
  }

  if ((isLoading || isBalancesLoading) && balances.length === 0) {
    return (
      <div className="bg-[#0e2330] border border-white/5 rounded-2xl p-6 min-h-[300px]">
        <Skeleton className="h-5 w-32 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalUsdValue = balances.reduce((acc, curr) => acc + curr.usd_value, 0);

  return (
    <div className="card-hover bg-[#0e2330] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
      {isBalancesLoading ? (
        <div className="absolute top-0 left-0 h-1 w-full bg-[#08c1c1]/40 animate-pulse" />
      ) : null}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#08c1c1]/10 flex items-center justify-center text-[#08c1c1]">
            <Wallet size={20} />
          </div>
          <h3 className="text-white font-bold text-lg m-0">Wallet Assets</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-[#08c1c1] text-xs font-semibold hover:underline flex items-center gap-1 transition-all">
          Manage Assets <ArrowUpRight size={14} />
        </Button>
      </div>

      {isBalancesLoading ? (
        <div className="mb-3 inline-flex items-center gap-2 text-xs text-[#6a9fae]">
          <Loader2 size={13} className="animate-spin text-[#08c1c1]" />
          Refreshing balances...
        </div>
      ) : null}

      {balanceError ? (
        <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Unable to refresh balances. Showing last available data.
        </p>
      ) : null}

      <div className="space-y-3">
        {balances.length === 0 ? (
          <p className="text-[#6a9fae] text-sm py-4">No assets found in this wallet.</p>
        ) : (
          balances.map((asset) => (
            <div
              key={`${asset.asset_code}-${asset.asset_issuer || "native"}`}
              className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1e2f3a] flex items-center justify-center font-bold text-xs text-[#08c1c1] border border-white/5">
                  {asset.asset_code.substring(0, 4)}
                </div>
                <div>
                  <div className="text-white font-semibold">{asset.asset_code}</div>
                  <div className="text-[#6a9fae] text-xs">
                    {asset.asset_type === "native" ? "Native Asset" : "Token"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">
                  {parseFloat(asset.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </div>
                <div className="text-[#08c1c1] text-xs font-medium">
                  ${asset.usd_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 pt-5 border-t border-white/5">
        {dataUpdatedAt ? (
          <p className="mb-2 text-[11px] text-[#6a9fae]">
            Last updated {new Date(dataUpdatedAt).toLocaleTimeString()}
          </p>
        ) : null}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#6a9fae]">Total Wallet Value</span>
          <span className="text-white font-bold">
            ${totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WalletBalanceCard;
