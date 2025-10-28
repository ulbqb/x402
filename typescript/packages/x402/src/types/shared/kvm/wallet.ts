import {
  createPublicClient,
  createWalletClient,
  http,
  publicActions,
  KaiaWalletAction,
  WalletRpcSchema,
} from "@kaiachain/viem-ext";
import type {
  Transport,
  Client,
  Account,
  RpcSchema,
  PublicActions,
  WalletActions,
  LocalAccount,
  Prettify,
} from "@kaiachain/viem-ext";
import { kairos } from "@kaiachain/viem-ext";
import { privateKeyToAccount } from "@kaiachain/viem-ext";
import { Hex } from "viem";

export type KaiaChain = typeof kairos;

type CustomRpcSchema = [
  ...WalletRpcSchema,
  {
    Method: "klay_sendRawTransaction";
    Parameters: [string];
    ReturnType: string;
  },
  {
    Method: "klay_sendTransaction";
    Parameters: [object];
    ReturnType: string;
  },
  {
    Method: "klay_gasPrice";
    Parameters: [];
    ReturnType: string;
  },
  {
    Method: "klay_estimateGas";
    Parameters: [object];
    ReturnType: string;
  },
];

// Create a public client for reading data
export type SignerWallet<
  chain extends KaiaChain = KaiaChain,
  transport extends Transport = Transport,
  account extends Account = Account,
> = Prettify<
  Client<
    Transport,
    KaiaChain,
    account,
    RpcSchema | CustomRpcSchema,
    PublicActions<transport, chain> & WalletActions<KaiaChain, account> & KaiaWalletAction
  >
>;

export type ConnectedClient<
  transport extends Transport = Transport,
  chain extends KaiaChain | undefined = KaiaChain,
> = Prettify<
  Client<
    Transport,
    KaiaChain,
    undefined,
    RpcSchema & CustomRpcSchema,
    PublicActions<transport, chain> & WalletActions<KaiaChain, undefined> & KaiaWalletAction
  >
>;

export type KvmSigner = SignerWallet<KaiaChain, Transport, Account> | LocalAccount;

/**
 * Creates a public client configured for the specified network
 *
 * @param network - The network to connect to
 * @returns A public client instance connected to the specified chain
 */
export function createConnectedClient(network: string): ConnectedClient<Transport, KaiaChain> {
  const chain = getChainFromNetwork(network);
  return createPublicClient({
    chain,
    transport: http(),
  }).extend(publicActions) as any;
}

/**
 * Creates a wallet client configured for the specified chain with a private key
 *
 * @param network - The network to connect to
 * @param privateKey - The private key to use for signing transactions
 * @returns A wallet client instance connected to the specified chain with the provided private key
 */
export function createSigner(network: string, privateKey: Hex): SignerWallet {
  const chain = getChainFromNetwork(network);
  return createWalletClient({
    chain,
    transport: http(),
    account: privateKeyToAccount(privateKey),
  }).extend(publicActions) as any;
}

/**
 * Checks if a wallet is a signer wallet
 *
 * @param wallet - The wallet to check
 * @returns True if the wallet is a signer wallet, false otherwise
 */
export function isSignerWallet<
  TChain extends KaiaChain = KaiaChain,
  TTransport extends Transport = Transport,
  TAccount extends Account = Account,
>(
  wallet: SignerWallet<TChain, TTransport, TAccount> | LocalAccount,
): wallet is SignerWallet<TChain, TTransport, TAccount> {
  return (
    typeof wallet === "object" && wallet !== null && "chain" in wallet && "transport" in wallet
  );
}

/**
 * Checks if a wallet is an account
 *
 * @param wallet - The wallet to check
 * @returns True if the wallet is an account, false otherwise
 */
export function isAccount<
  TChain extends KaiaChain = KaiaChain,
  TTransport extends Transport = Transport,
  TAccount extends Account = Account,
>(wallet: SignerWallet<TChain, TTransport, TAccount> | LocalAccount): wallet is LocalAccount {
  const w = wallet as LocalAccount;
  return (
    typeof wallet === "object" &&
    wallet !== null &&
    typeof w.address === "string" &&
    typeof w.type === "string" &&
    // Check for essential signing capabilities
    typeof w.sign === "function" &&
    typeof w.signMessage === "function" &&
    typeof w.signTypedData === "function" &&
    // Check for transaction signing (required by LocalAccount)
    typeof w.signTransaction === "function"
  );
}

/**
 * Maps network strings to Chain objects
 *
 * @param network - The network string to convert to a Chain object
 * @returns The corresponding Chain object
 */
export function getChainFromNetwork(network: string | undefined): KaiaChain {
  if (!network) {
    throw new Error("NETWORK environment variable is not set");
  }

  switch (network) {
    case "kairos":
      return kairos;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}
