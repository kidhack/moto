import type { ActorSubclass } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';

// Types matching the Motoko backend
export type BitcoinAddress = string;
export type TransactionId = string;

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  id: TransactionId;
  amount: bigint;
  timestamp: bigint;
  status: TransactionStatus;
  fromAddress: BitcoinAddress;
  toAddress: BitcoinAddress;
  fee: bigint;
  /** Optional: for received (mint) tx, the Bitcoin wallet address that sent the funds (from memo + chain lookup). */
  sourceBitcoinAddress?: BitcoinAddress;
  /** Optional: raw mint memo bytes from index, used to decode Bitcoin txid. */
  mintMemo?: number[];
  /** Optional: raw burn memo bytes from index, used to decode destination Bitcoin address. */
  burnMemo?: number[];
}

/** Wallet record stored in the MOTO canister (metadata only; funds live on the ckBTC ledger). */
export interface CanisterWallet {
  principal: Principal;
  /** ckBTC deposit address derived by the minter; "" until registerDepositAddress has run. */
  bitcoinAddress: BitcoinAddress;
  onboardingComplete: boolean;
  walletName: string;
  preferredCurrency: string;
  preferredLanguage: string;
  createdAt: bigint;
  lastUpdated: bigint;
}

/** Wallet view model used by the UI: canister metadata + live ledger balance and history. */
export interface UserWallet extends CanisterWallet {
  transactions: Transaction[];
  balance: bigint;
}

export interface MotoConfig {
  minterId: string;
  maxWallets: bigint;
  walletCount: bigint;
}

// Actor interface matching the Motoko backend. Candid `opt T` decodes as [] | [T].
export interface BitcoinWalletActor {
  ensureWalletExists: () => Promise<BitcoinAddress>;
  registerDepositAddress: () => Promise<BitcoinAddress>;
  getPrincipalByBitcoinAddress: (address: string) => Promise<[] | [Principal]>;
  resolveRecipient: (address: string) => Promise<[] | [Principal]>;
  setWalletName: (name: string) => Promise<void>;
  setPreferences: (currency: string, language: string) => Promise<void>;
  getWalletInfo: () => Promise<[] | [CanisterWallet]>;
  completeOnboarding: () => Promise<void>;
  isOnboardingComplete: () => Promise<boolean>;
  resetOnboarding: () => Promise<void>;
  signOutAndReset: () => Promise<void>;
  getAllWallets: () => Promise<CanisterWallet[]>;
  getConfig: () => Promise<MotoConfig>;
  setConfig: (minterId: [] | [string], maxWallets: [] | [bigint]) => Promise<void>;
}

// Type for ActorSubclass with our interface
export type BitcoinWalletActorSubclass = ActorSubclass<BitcoinWalletActor>;
