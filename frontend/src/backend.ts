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
}

export interface UserWallet {
  principal: Principal;
  bitcoinAddress: BitcoinAddress;
  transactions: Transaction[];
  balance: bigint;
  onboardingComplete: boolean;
  createdAt: bigint;
  lastUpdated: bigint;
}

// Actor interface matching the Motoko backend
export interface BitcoinWalletActor {
  ensureWalletExists: () => Promise<BitcoinAddress>;
  getBalance: () => Promise<bigint>;
  syncBalanceFromLedger: (newBalance: bigint) => Promise<void>;
  getTransactionHistory: () => Promise<Transaction[]>;
  sendTransaction: (toAddress: BitcoinAddress, amount: bigint) => Promise<TransactionId>;
  getBitcoinAddress: () => Promise<BitcoinAddress>;
  getWalletInfo: () => Promise<UserWallet | null>;
  completeOnboarding: () => Promise<void>;
  isOnboardingComplete: () => Promise<boolean>;
  resetOnboarding: () => Promise<void>;
  signOutAndReset: () => Promise<void>;
  getAllWallets: () => Promise<UserWallet[]>;
}

// Type for ActorSubclass with our interface
export type BitcoinWalletActorSubclass = ActorSubclass<BitcoinWalletActor>;

