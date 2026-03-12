import Safe from "@safe-global/protocol-kit";
import { RPC_URL } from "./constants";

export interface PredictedSafe {
  address: string;
  deploymentTransaction: { to: string; data: string; value: string };
}

export async function createDeploymentTransaction(
  owners: string[],
  threshold: number
): Promise<PredictedSafe> {
  const protocolKit = await Safe.init({
    provider: RPC_URL,
    predictedSafe: { safeAccountConfig: { owners, threshold } },
  });

  const address = await protocolKit.getAddress();
  const tx = await protocolKit.createSafeDeploymentTransaction();

  return {
    address,
    deploymentTransaction: { to: tx.to, data: tx.data, value: tx.value },
  };
}

export async function isSafeDeployed(address: string): Promise<boolean> {
  try {
    const protocolKit = await Safe.init({ provider: RPC_URL, safeAddress: address });
    await protocolKit.getAddress();
    return true;
  } catch {
    return false;
  }
}

export async function createUnsignedTransaction(params: {
  safeAddress: string;
  to: string;
  data: string;
  value?: string;
}): Promise<{
  safeTxHash: string;
  safeTransactionData: {
    to: string;
    value: string;
    data: string;
    operation: number;
    safeTxGas: string;
    baseGas: string;
    gasPrice: string;
    gasToken: string;
    refundReceiver: string;
    nonce: number;
  };
}> {
  const { safeAddress, to, data, value = "0" } = params;

  const protocolKit = await Safe.init({ provider: RPC_URL, safeAddress });
  const safeTransaction = await protocolKit.createTransaction({
    transactions: [{ to, data, value }],
  });
  const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);

  return {
    safeTxHash,
    safeTransactionData: {
      to: safeTransaction.data.to,
      value: safeTransaction.data.value,
      data: safeTransaction.data.data,
      operation: safeTransaction.data.operation,
      safeTxGas: safeTransaction.data.safeTxGas,
      baseGas: safeTransaction.data.baseGas,
      gasPrice: safeTransaction.data.gasPrice,
      gasToken: safeTransaction.data.gasToken,
      refundReceiver: safeTransaction.data.refundReceiver,
      nonce: safeTransaction.data.nonce,
    },
  };
}
