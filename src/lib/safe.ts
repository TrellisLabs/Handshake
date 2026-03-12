import SafeApiKit from "@safe-global/api-kit";
import { ethers } from "ethers";
import { CHAIN_ID, RPC_URL, SAFE_TX_SERVICE_URL, USDC_ADDRESS } from "./constants";

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
];

export async function getApiKit(): Promise<SafeApiKit> {
  return new SafeApiKit({
    chainId: BigInt(CHAIN_ID),
    txServiceUrl: SAFE_TX_SERVICE_URL,
  });
}

export async function getSafeBalance(safeAddress: string): Promise<bigint> {
  if (!USDC_ADDRESS) return BigInt(0);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  return await usdc.balanceOf(safeAddress);
}

export async function createTokenTransferTransaction(
  to: string,
  amount: bigint
): Promise<{ to: string; data: string; value: string }> {
  const iface = new ethers.Interface(ERC20_ABI);
  const data = iface.encodeFunctionData("transfer", [to, amount]);
  return { to: USDC_ADDRESS, data, value: "0" };
}

export async function getTransaction(safeTxHash: string) {
  const apiKit = await getApiKit();
  return await apiKit.getTransaction(safeTxHash);
}
