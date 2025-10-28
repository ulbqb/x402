import { Account, Hex, Transport } from "viem";
import { ConnectedClient, SignerWallet, KaiaChain } from "../../../types/shared/kvm";
import {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
  ExactKvmPayload,
} from "../../../types/verify";
import { parseTransaction } from "@kaiachain/js-ext-core";

export async function verify<
  transport extends Transport,
  chain extends KaiaChain,
  account extends Account | undefined,
>(
  client: ConnectedClient,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<VerifyResponse> {
  const exactKvmPayload = payload.payload as ExactKvmPayload;

  const txObj = parseTransaction(exactKvmPayload.transaction);

  return {
    isValid: true,
    invalidReason: undefined,
    payer: txObj.from,
  };
}

export async function settle<transport extends Transport, chain extends KaiaChain>(
  wallet: SignerWallet,
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<SettleResponse> {
  const payload = paymentPayload.payload as ExactKvmPayload;

  const txObj = parseTransaction(payload.transaction);

  if (paymentPayload.network !== "kairos") {
    return {
      success: false,
      network: paymentPayload.network,
      transaction: "",
      errorReason: "invalid_network",
      payer: txObj.from,
    };
  }

  const tx = await wallet.sendTransactionAsFeePayer(payload.transaction);

  const receipt = await wallet.waitForTransactionReceipt({ hash: tx as Hex });

  if (receipt.status !== "success") {
    return {
      success: false,
      errorReason: "invalid_transaction_state", //`Transaction failed`,
      transaction: tx,
      network: paymentPayload.network,
      payer: txObj.from,
    };
  }

  return {
    success: true,
    transaction: tx,
    network: paymentPayload.network,
    payer: txObj.from,
  };
}
