"use client";

const requiredEnvVars = [
  "NEXT_PUBLIC_BASE_URL",
  "NEXT_PUBLIC_HORIZON_PUBLIC_URL",
  "NEXT_PUBLIC_HORIZON_TESTNET_URL",
  "NEXT_PUBLIC_COINGECKO_API_URL",
  "NEXT_PUBLIC_DISCORD_URL",
  "NEXT_PUBLIC_TELEGRAM_URL",
  "NEXT_PUBLIC_GITHUB_URL",
] as const;

function validateEnvVars() {
  const missing = requiredEnvVars.filter(
    (key) => !process.env[key]
  );
  if (missing.length > 0 && process.env.NODE_ENV === "production") {
    console.warn(
      `Missing environment variables: ${missing.join(", ")}. Using defaults for build.`
    );
  }
}

validateEnvVars();

export const env = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "https://nestera.app",
  horizonPublic: process.env.NEXT_PUBLIC_HORIZON_PUBLIC_URL || "https://horizon.stellar.org",
  horizonTestnet: process.env.NEXT_PUBLIC_HORIZON_TESTNET_URL || "https://horizon-testnet.stellar.org",
  coingeckoApi: process.env.NEXT_PUBLIC_COINGECKO_API_URL || "https://api.coingecko.com/api/v3",
  discord: process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.gg/nestera",
  telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/nestera",
  github: process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/nestera",
  walletWsUrl: process.env.NEXT_PUBLIC_WALLET_WS_URL || "wss://example.com/ws",

} as const;