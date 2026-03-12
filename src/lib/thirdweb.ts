import { createThirdwebClient, defineChain } from "thirdweb";
import { CHAIN_ID, RPC_URL, THIRDWEB_CLIENT_ID, USDC_ADDRESS, USDC_DECIMALS } from "./constants";

// Provide a fallback clientId for build-time (it won't work for actual requests)
export const client = createThirdwebClient({
  clientId: THIRDWEB_CLIENT_ID || "placeholder-for-build",
});

export const baseSepolia = defineChain({
  id: CHAIN_ID,
  name: "Base Sepolia",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpc: RPC_URL,
  blockExplorers: [
    {
      name: "BaseScan",
      url: "https://sepolia.basescan.org",
    },
  ],
  testnet: true,
});

export const usdcTokenConfig = {
  address: USDC_ADDRESS,
  decimals: USDC_DECIMALS,
  symbol: "mUSDC",
  name: "Mock USDC",
};
