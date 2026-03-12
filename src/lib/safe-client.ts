import Safe from "@safe-global/protocol-kit";
import { RPC_URL } from "./constants";

export interface PredictedSafe {
  address: string;
  deploymentTransaction: {
    to: string;
    data: string;
    value: string;
  };
}

/**
 * Predict Safe address before deployment
 * This allows us to know the address without deploying
 */
export async function predictSafeAddress(
  owners: string[],
  threshold: number
): Promise<string> {
  const protocolKit = await Safe.init({
    provider: RPC_URL,
    predictedSafe: {
      safeAccountConfig: {
        owners,
        threshold,
      },
    },
  });

  return await protocolKit.getAddress();
}

/**
 * Create deployment transaction data for client-side execution
 * Returns the transaction data that can be sent via thirdweb
 */
export async function createDeploymentTransaction(
  owners: string[],
  threshold: number
): Promise<PredictedSafe> {
  const protocolKit = await Safe.init({
    provider: RPC_URL,
    predictedSafe: {
      safeAccountConfig: {
        owners,
        threshold,
      },
    },
  });

  const address = await protocolKit.getAddress();
  const deploymentTransaction = await protocolKit.createSafeDeploymentTransaction();

  return {
    address,
    deploymentTransaction: {
      to: deploymentTransaction.to,
      data: deploymentTransaction.data,
      value: deploymentTransaction.value,
    },
  };
}

/**
 * Check if a Safe is already deployed at an address
 */
export async function isSafeDeployed(address: string): Promise<boolean> {
  try {
    const protocolKit = await Safe.init({
      provider: RPC_URL,
      safeAddress: address,
    });
    // If we can get the address, the Safe exists
    await protocolKit.getAddress();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the message hash that needs to be signed by an owner
 * This is used for EIP-712 signing
 */
export async function getTransactionHash(
  safeAddress: string,
  transaction: { to: string; data: string; value: string }
): Promise<string> {
  const protocolKit = await Safe.init({
    provider: RPC_URL,
    safeAddress,
  });

  const safeTransaction = await protocolKit.createTransaction({
    transactions: [transaction],
  });

  return await protocolKit.getTransactionHash(safeTransaction);
}

/**
 * Create an unsigned Safe transaction
 * Returns transaction data and hash for client-side signing
 */
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

  const protocolKit = await Safe.init({
    provider: RPC_URL,
    safeAddress,
  });

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

