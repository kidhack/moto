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
  getTransactionHistory: () => Promise<Transaction[]>;
  sendTransaction: (toAddress: BitcoinAddress, amount: bigint) => Promise<TransactionId>;
  getBitcoinAddress: () => Promise<BitcoinAddress>;
  getWalletInfo: () => Promise<UserWallet>;
  completeOnboarding: () => Promise<void>;
  isOnboardingComplete: () => Promise<boolean>;
  resetOnboarding: () => Promise<void>;
  signOutAndReset: () => Promise<void>;
  getAllWallets: () => Promise<UserWallet[]>;
}

// Type for ActorSubclass with our interface
export type BitcoinWalletActorSubclass = ActorSubclass<BitcoinWalletActor>;

