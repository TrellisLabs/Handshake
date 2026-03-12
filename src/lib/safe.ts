import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { ethers } from "ethers";
import { CHAIN_ID, RPC_URL, SAFE_TX_SERVICE_URL, USDC_ADDRESS } from "./constants";

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

export interface DeploySafeParams {
  signerPrivateKey: string;
  owners: string[];
  threshold: number;
}

export interface SafeTransactionParams {
  safeAddress: string;
  to: string;
  value?: string;
  data?: string;
  signerPrivateKey: string;
}

export async function getApiKit(): Promise<SafeApiKit> {
  return new SafeApiKit({
    chainId: BigInt(CHAIN_ID),
    txServiceUrl: SAFE_TX_SERVICE_URL,
  });
}

export async function deploySafe(params: DeploySafeParams): Promise<string> {
  const { signerPrivateKey, owners, threshold } = params;

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(signerPrivateKey, provider);

  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: signerPrivateKey,
    predictedSafe: {
      safeAccountConfig: {
        owners,
        threshold,
      },
    },
  });

  const deploymentTransaction = await protocolKit.createSafeDeploymentTransaction();

  const txResponse = await signer.sendTransaction({
    to: deploymentTransaction.to,
    data: deploymentTransaction.data,
    value: BigInt(deploymentTransaction.value),
  });

  await txResponse.wait();

  const safeAddress = await protocolKit.getAddress();
  return safeAddress;
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

  return {
    to: USDC_ADDRESS,
    data,
    value: "0",
  };
}

export async function proposeTransaction(params: {
  safeAddress: string;
  to: string;
  data: string;
  value?: string;
  signerPrivateKey: string;
}): Promise<string> {
  const { safeAddress, to, data, value = "0", signerPrivateKey } = params;

  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: signerPrivateKey,
    safeAddress,
  });

  const safeTransaction = await protocolKit.createTransaction({
    transactions: [{ to, data, value }],
  });

  const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
  const signature = await protocolKit.signHash(safeTxHash);

  const apiKit = await getApiKit();
  await apiKit.proposeTransaction({
    safeAddress,
    safeTransactionData: safeTransaction.data,
    safeTxHash,
    senderAddress: new ethers.Wallet(signerPrivateKey).address,
    senderSignature: signature.data,
  });

  return safeTxHash;
}

export async function signTransaction(params: {
  safeAddress: string;
  safeTxHash: string;
  signerPrivateKey: string;
}): Promise<void> {
  const { safeAddress, safeTxHash, signerPrivateKey } = params;

  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: signerPrivateKey,
    safeAddress,
  });

  const signature = await protocolKit.signHash(safeTxHash);

  const apiKit = await getApiKit();
  await apiKit.confirmTransaction(safeTxHash, signature.data);
}

export async function executeTransaction(params: {
  safeAddress: string;
  safeTxHash: string;
  signerPrivateKey: string;
}): Promise<string> {
  const { safeAddress, safeTxHash, signerPrivateKey } = params;

  const apiKit = await getApiKit();
  const safeTransaction = await apiKit.getTransaction(safeTxHash);

  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: signerPrivateKey,
    safeAddress,
  });

  const result = await protocolKit.executeTransaction(safeTransaction);
  const receipt = result.transactionResponse
    ? await (result.transactionResponse as { wait: () => Promise<{ hash: string }> }).wait()
    : null;

  return receipt?.hash || "";
}

export async function getPendingTransactions(safeAddress: string) {
  const apiKit = await getApiKit();
  return await apiKit.getPendingTransactions(safeAddress);
}

export async function getTransaction(safeTxHash: string) {
  const apiKit = await getApiKit();
  return await apiKit.getTransaction(safeTxHash);
}

export async function getSafeInfo(safeAddress: string) {
  const apiKit = await getApiKit();
  return await apiKit.getSafeInfo(safeAddress);
}
