import { signPaymentHeader as signPaymentHeaderExactEVM } from "../schemes/exact/evm/client";
import { signPaymentHeader as signPaymentHeaderExactKVM } from "../schemes/exact/kvm/client";
import { encodePayment } from "../schemes/exact/evm/utils/paymentUtils";
import {
  isEvmSignerWallet,
  isKvmSignerWallet,
  isMultiNetworkSigner,
  MultiNetworkSigner,
  Signer,
  SupportedEVMNetworks,
  SupportedKVMNetworks,
} from "../types/shared";
import { PaymentRequirements, UnsignedPaymentPayload } from "../types/verify";

/**
 * Signs a payment header using the provided client and payment requirements.
 *
 * @param client - The signer wallet instance used to sign the payment header
 * @param paymentRequirements - The payment requirements containing scheme and network information
 * @param unsignedPaymentHeader - The unsigned payment payload to be signed
 * @returns A promise that resolves to the encoded signed payment header string
 */
export async function signPaymentHeader(
  client: Signer | MultiNetworkSigner,
  paymentRequirements: PaymentRequirements,
  unsignedPaymentHeader: UnsignedPaymentPayload,
): Promise<string> {
  if (
    paymentRequirements.scheme === "exact" &&
    SupportedEVMNetworks.includes(paymentRequirements.network)
  ) {
    const evmClient = isMultiNetworkSigner(client) ? client.evm : client;

    if (!isEvmSignerWallet(evmClient)) {
      throw new Error("Invalid evm wallet client provided");
    }
    const signedPaymentHeader = await signPaymentHeaderExactEVM(
      evmClient,
      paymentRequirements,
      unsignedPaymentHeader,
    );
    return encodePayment(signedPaymentHeader);
  }

  if (
    paymentRequirements.scheme === "exact" &&
    SupportedKVMNetworks.includes(paymentRequirements.network)
  ) {
    const kvmClient = isMultiNetworkSigner(client) ? client.kvm : client;

    if (!isKvmSignerWallet(kvmClient)) {
      throw new Error("Invalid evm wallet client provided");
    }
    const signedPaymentHeader = await signPaymentHeaderExactKVM(
      kvmClient,
      unsignedPaymentHeader.x402Version,
      paymentRequirements,
    );
    return encodePayment(signedPaymentHeader);
  }

  throw new Error("Unsupported scheme");
}
