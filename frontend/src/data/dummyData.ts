import type { UserWallet, Transaction } from '../backend';
import { Principal } from '@dfinity/principal';
import { AnonymousIdentity } from '@dfinity/agent';

// Dummy Bitcoin address
const DUMMY_BITCOIN_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

// Dummy principal (for testing)
const DUMMY_PRINCIPAL = Principal.fromText('poloq-qkxhr-knjge-p6axv-q4cex-jywvv-xyj67-3hmip-crr3s-3hdwh-2ae');

// Dummy transactions - ordered with largest deposit first to ensure balance never goes negative
// Final balance: 0.00005135 BTC (5135 satoshis)
const DUMMY_TRANSACTIONS: Transaction[] = [
  {
    id: '3254500',
    amount: BigInt(50000), // 0.0005 BTC - Largest initial deposit
    timestamp: BigInt(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago (first transaction)
    status: 'confirmed',
    fromAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    toAddress: DUMMY_BITCOIN_ADDRESS,
    fee: BigInt(100), // 0.000001 BTC fee
  },
  {
    id: '3254499',
    amount: BigInt(10000), // 0.0001 BTC
    timestamp: BigInt(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    status: 'confirmed',
    fromAddress: 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3',
    toAddress: DUMMY_BITCOIN_ADDRESS,
    fee: BigInt(150), // 0.0000015 BTC fee
  },
  {
    id: '3254498',
    amount: BigInt(2350), // 0.0000235 BTC
    timestamp: BigInt(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    status: 'confirmed',
    fromAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    toAddress: DUMMY_BITCOIN_ADDRESS,
    fee: BigInt(50), // 0.0000005 BTC fee
  },
  {
    id: '3254497',
    amount: BigInt(20000), // 0.0002 BTC
    timestamp: BigInt(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    status: 'confirmed',
    fromAddress: DUMMY_BITCOIN_ADDRESS,
    toAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    fee: BigInt(200), // 0.000002 BTC fee
  },
  {
    id: '3254496',
    amount: BigInt(37000), // 0.00037 BTC
    timestamp: BigInt(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    status: 'pending',
    fromAddress: DUMMY_BITCOIN_ADDRESS,
    toAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    fee: BigInt(15), // 0.00000015 BTC fee
  },
];

// Calculate balance from transactions
const calculateBalance = (transactions: Transaction[], address: string): bigint => {
  let balance = BigInt(0);
  transactions.forEach(tx => {
    if (tx.toAddress === address) {
      balance += tx.amount;
    } else if (tx.fromAddress === address) {
      balance -= tx.amount + tx.fee;
    }
  });
  return balance;
};

// Dummy wallet data
export const DUMMY_WALLET: UserWallet = {
  principal: DUMMY_PRINCIPAL,
  bitcoinAddress: DUMMY_BITCOIN_ADDRESS,
  transactions: DUMMY_TRANSACTIONS,
  balance: calculateBalance(DUMMY_TRANSACTIONS, DUMMY_BITCOIN_ADDRESS),
  onboardingComplete: true,
  createdAt: BigInt(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  lastUpdated: BigInt(Date.now()),
};

// Check if we should use dummy data (when backend is not available)
export const USE_DUMMY_DATA = import.meta.env.VITE_USE_DUMMY_DATA === 'true' || 
                               import.meta.env.VITE_USE_DUMMY_DATA === '1';

// Create a dummy identity for testing (when USE_DUMMY_DATA is enabled)
export const DUMMY_IDENTITY = new AnonymousIdentity();

