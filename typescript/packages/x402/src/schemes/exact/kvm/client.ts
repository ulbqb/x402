import { Address, LocalAccount } from "viem";
import { TxType, encodeFunctionData } from "@kaiachain/viem-ext";
import { SignerWallet } from "../../../types/shared/kvm";
import { PaymentPayload, PaymentRequirements, UnsignedPaymentPayload } from "../../../types/verify";
import { createNonce } from "./sign";
import { encodePayment } from "./utils/paymentUtils";

export function preparePaymentHeader(
  from: Address,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): UnsignedPaymentPayload {
  const nonce = createNonce();

  const validAfter = BigInt(
    Math.floor(Date.now() / 1000) - 600, // 10 minutes before
  ).toString();
  const validBefore = BigInt(
    Math.floor(Date.now() / 1000 + paymentRequirements.maxTimeoutSeconds),
  ).toString();

  return {
    x402Version,
    scheme: paymentRequirements.scheme,
    network: paymentRequirements.network,
    payload: {
      signature: undefined,
      authorization: {
        from,
        to: paymentRequirements.payTo as Address,
        value: paymentRequirements.maxAmountRequired,
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };
}

export async function createPaymentHeader(
  client: SignerWallet | LocalAccount,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): Promise<string> {
  const payment = await signPaymentHeader(client, x402Version, paymentRequirements);
  return encodePayment(payment);
}

export async function signPaymentHeader(
  client: SignerWallet | LocalAccount,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): Promise<PaymentPayload> {
  const signerWallet = client as SignerWallet;

  const abi = [
    {
      constant: false,
      inputs: [
        {
          name: "_to",
          type: "address",
        },
        {
          name: "_value",
          type: "uint256",
        },
      ],
      name: "transfer",
      outputs: [
        {
          name: "",
          type: "bool",
        },
      ],
      payable: false,
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  const contractAddr = paymentRequirements.asset as Address;
  const payTo = paymentRequirements.payTo as Address;
  const maxAmountRequired = paymentRequirements.maxAmountRequired;

  const data = encodeFunctionData({
    abi,
    args: [payTo, maxAmountRequired],
    functionName: "transfer",
  });

  const tx = await signerWallet.prepareTransactionRequest({
    type: TxType.FeeDelegatedSmartContractExecution,
    account: signerWallet.account,
    to: contractAddr,
    value: 0,
    data,
  });
  tx.gasPrice = 27500000000;
  tx.gasLimit = 153365;
  const signedTx = await signerWallet.signTransaction(tx);

  return {
    x402Version,
    scheme: paymentRequirements.scheme,
    network: paymentRequirements.network,
    payload: {
      transaction: signedTx,
    },
  };
}
