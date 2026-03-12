export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || "";
export const SAFE_TX_SERVICE_URL = process.env.NEXT_PUBLIC_SAFE_TX_SERVICE_URL || "https://safe-transaction-base-sepolia.safe.global";
export const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";

export const USDC_DECIMALS = 6;

export function formatUSDC(amount: bigint): string {
  const num = Number(amount) / Math.pow(10, USDC_DECIMALS);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

export function parseUSDC(amount: number): bigint {
  return BigInt(Math.round(amount * Math.pow(10, USDC_DECIMALS)));
}
