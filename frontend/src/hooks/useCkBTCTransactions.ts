import { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { Actor, HttpAgent } from '@dfinity/agent';
import { useInternetIdentity } from './useInternetIdentity';
import type { Transaction } from '../backend';

// Check if we should use testnet
const USE_TESTNET = import.meta.env.VITE_USE_TESTNET === 'true';

// ckBTC Index Canister IDs (for transaction history)
// Mainnet: n5wcd-faaaa-aaaar-qaaea-cai
// Testnet: mm444-5iaaa-aaaar-qaabq-cai
const CKBTC_INDEX_CANISTER_ID_MAINNET = 'n5wcd-faaaa-aaaar-qaaea-cai';
const CKBTC_INDEX_CANISTER_ID_TESTNET = 'mm444-5iaaa-aaaar-qaabq-cai';
const CKBTC_INDEX_CANISTER_ID = USE_TESTNET 
  ? (import.meta.env.VITE_CKBTC_INDEX_CANISTER_ID || CKBTC_INDEX_CANISTER_ID_TESTNET)
  : (import.meta.env.VITE_CKBTC_INDEX_CANISTER_ID || CKBTC_INDEX_CANISTER_ID_MAINNET);

const HOST = 'https://ic0.app';

// Create IDL factory for ckBTC index canister - matches actual canister interface
// Return type is: variant { Ok: GetTransactions, Err: GetTransactionsErr }
// GetTransactions = record { balance: Tokens, transactions: vec TransactionWithId, oldest_tx_id: opt BlockIndex }
const createCkBTCIndexIDL = () => {
  return ({ IDL }: any) => {
    const BlockIndex = IDL.Nat;
    const SubAccount = IDL.Vec(IDL.Nat8);
    const Account = IDL.Record({
      owner: IDL.Principal,
      subaccount: IDL.Opt(SubAccount),
    });
    const GetAccountTransactionsArgs = IDL.Record({
      max_results: IDL.Nat,
      start: IDL.Opt(BlockIndex),
      account: Account,
    });
    const Tokens = IDL.Nat;
    const Burn = IDL.Record({
      fee: IDL.Opt(IDL.Nat),
      from: Account,
      memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
      created_at_time: IDL.Opt(IDL.Nat64),
      amount: Tokens,
      spender: IDL.Opt(Account),
    });
    const Mint = IDL.Record({
      to: Account,
      fee: IDL.Opt(IDL.Nat),
      memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
      created_at_time: IDL.Opt(IDL.Nat64),
      amount: Tokens,
    });
    const Approve = IDL.Record({
      fee: IDL.Opt(Tokens),
      from: Account,
      memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
      created_at_time: IDL.Opt(IDL.Nat64),
      amount: Tokens,
      expected_allowance: IDL.Opt(Tokens),
      expires_at: IDL.Opt(IDL.Nat64),
      spender: Account,
    });
    const Transfer = IDL.Record({
      to: Account,
      fee: IDL.Opt(Tokens),
      from: Account,
      memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
      created_at_time: IDL.Opt(IDL.Nat64),
      amount: Tokens,
      spender: IDL.Opt(Account),
    });
    const Transaction = IDL.Record({
      burn: IDL.Opt(Burn),
      kind: IDL.Text,
      mint: IDL.Opt(Mint),
      approve: IDL.Opt(Approve),
      timestamp: IDL.Nat64,
      transfer: IDL.Opt(Transfer),
    });
    const TransactionWithId = IDL.Record({
      id: BlockIndex,
      transaction: Transaction,
    });
    const GetTransactions = IDL.Record({
      balance: Tokens,
      transactions: IDL.Vec(TransactionWithId),
      oldest_tx_id: IDL.Opt(BlockIndex),
    });
    const GetTransactionsErr = IDL.Record({ message: IDL.Text });
    const GetTransactionsResult = IDL.Variant({
      Ok: GetTransactions,
      Err: GetTransactionsErr,
    });

    return IDL.Service({
      get_account_transactions: IDL.Func(
        [GetAccountTransactionsArgs],
        [GetTransactionsResult],
        ['query']
      ),
    });
  };
};

// ICRC-1 Transaction types based on ACTUAL index canister structure
// Transaction is a RECORD with optional fields, NOT a variant
interface ICRC1Account {
  owner: Principal;
  subaccount: [] | [Uint8Array];
}

interface ICRC1TransferRecord {
  from: ICRC1Account;
  to: ICRC1Account;
  amount: bigint;
  fee?: bigint;
  memo?: Uint8Array;
  created_at_time?: bigint;
  spender?: ICRC1Account;
}

interface ICRC1MintRecord {
  to: ICRC1Account;
  amount: bigint;
  fee?: bigint;
  memo?: Uint8Array;
  created_at_time?: bigint;
}

interface ICRC1BurnRecord {
  from: ICRC1Account;
  amount: bigint;
  fee?: bigint;
  memo?: Uint8Array;
  created_at_time?: bigint;
  spender?: ICRC1Account;
}

interface ICRC1TransactionRecord {
  burn?: ICRC1BurnRecord;
  mint?: ICRC1MintRecord;
  transfer?: ICRC1TransferRecord;
  approve?: any;
  kind: string;
  timestamp: bigint;
}

interface ICRC1TransactionWithId {
  id: bigint;
  transaction: ICRC1TransactionRecord;
}

// Helper to extract Principal from various formats (Principal object, {__principal__: string}, or string)
function extractPrincipal(owner: any): Principal {
  if (owner instanceof Principal) {
    return owner;
  }
  if (owner && typeof owner === 'object' && '__principal__' in owner) {
    return Principal.fromText(owner.__principal__);
  }
  if (typeof owner === 'string') {
    return Principal.fromText(owner);
  }
  if (owner && typeof owner === 'object' && 'toText' in owner) {
    return owner;
  }
  throw new Error(`Invalid owner format: ${JSON.stringify(owner)}`);
}

// Helper to extract value from optional array format [value] or []
function extractOptional<T>(value: T | T[] | [] | undefined): T | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : undefined;
  }
  return value;
}

// Convert ICRC-1 transaction to app's Transaction format
function convertICRC1TransactionToAppTransaction(
  txWithId: ICRC1TransactionWithId,
  userPrincipal: Principal,
  userBitcoinAddress: string
): Transaction | null {
  const tx = txWithId.transaction;
  const userPrincipalText = userPrincipal.toText();
  
  // Handle transfer transaction
  // In Candid, optional fields are decoded as arrays: Some(value) -> [value], None -> []
  const transferData = extractOptional(tx.transfer);
  if (transferData) {
    const transfer = transferData;
    const fromOwner = extractPrincipal(transfer.from?.owner);
    const toOwner = extractPrincipal(transfer.to?.owner);
    const fromOwnerText = fromOwner.toText();
    const toOwnerText = toOwner.toText();
    
    const isSent = fromOwnerText === userPrincipalText;
    const isReceived = toOwnerText === userPrincipalText;
    
    if (!isSent && !isReceived) {
      return null; // Not related to this user
    }
    
    // Extract optional fields (they come as arrays from Candid)
    const fee = extractOptional(transfer.fee);
    const created_at_time = extractOptional(transfer.created_at_time);
    
    // Use created_at_time if available, otherwise use timestamp field, otherwise use current time
    // Note: tx.timestamp is nat64 (nanoseconds), created_at_time is also opt nat64 (nanoseconds)
    let timestamp: bigint;
    if (created_at_time) {
      // created_at_time is in nanoseconds (nat64)
      const nanos = typeof created_at_time === 'string' ? BigInt(created_at_time) : BigInt(created_at_time);
      timestamp = nanos / BigInt(1_000_000_000); // Convert nanoseconds to seconds
      console.log('useCkBTCTransactions: Using created_at_time:', {
        nanos: nanos.toString(),
        seconds: timestamp.toString(),
        date: new Date(Number(timestamp) * 1000).toISOString(),
      });
    } else if (tx.timestamp) {
      // tx.timestamp is nat64 (nanoseconds) - handle both string and number/bigint
      const nanos = typeof tx.timestamp === 'string' ? BigInt(tx.timestamp) : BigInt(tx.timestamp);
      timestamp = nanos / BigInt(1_000_000_000); // Convert nanoseconds to seconds
      console.log('useCkBTCTransactions: Using tx.timestamp:', {
        raw: tx.timestamp,
        type: typeof tx.timestamp,
        nanos: nanos.toString(),
        seconds: timestamp.toString(),
        date: new Date(Number(timestamp) * 1000).toISOString(),
      });
    } else {
      // Fallback to current time
      timestamp = BigInt(Math.floor(Date.now() / 1000));
      console.log('useCkBTCTransactions: Using current time as fallback:', timestamp.toString());
    }
    
    return {
      id: `icrc1-${txWithId.id.toString()}`,
      amount: BigInt(transfer.amount),
      timestamp,
      status: 'confirmed' as const,
      fromAddress: isSent ? userBitcoinAddress : fromOwnerText,
      toAddress: isReceived ? userBitcoinAddress : toOwnerText,
      fee: fee ? BigInt(fee) : BigInt(0),
    };
  }
  
  // Handle mint transaction
  const mintData = extractOptional(tx.mint);
  if (mintData) {
    const mint = mintData;
    const toOwner = extractPrincipal(mint.to?.owner);
    const toOwnerText = toOwner.toText();
    
    if (toOwnerText !== userPrincipalText) {
      return null;
    }
    
    const created_at_time = extractOptional(mint.created_at_time);
    // Note: tx.timestamp is nat64 (nanoseconds), created_at_time is also opt nat64 (nanoseconds)
    let timestamp: bigint;
    if (created_at_time) {
      const nanos = typeof created_at_time === 'string' ? BigInt(created_at_time) : BigInt(created_at_time);
      timestamp = nanos / BigInt(1_000_000_000);
    } else if (tx.timestamp) {
      const nanos = typeof tx.timestamp === 'string' ? BigInt(tx.timestamp) : BigInt(tx.timestamp);
      timestamp = nanos / BigInt(1_000_000_000);
    } else {
      timestamp = BigInt(Math.floor(Date.now() / 1000));
    }
    
    return {
      id: `icrc1-mint-${txWithId.id.toString()}`,
      amount: BigInt(mint.amount),
      timestamp,
      status: 'confirmed' as const,
      fromAddress: 'ckBTC Minter',
      toAddress: userBitcoinAddress,
      fee: BigInt(0),
    };
  }
  
  // Handle burn transaction
  const burnData = extractOptional(tx.burn);
  if (burnData) {
    const burn = burnData;
    const fromOwner = extractPrincipal(burn.from?.owner);
    const fromOwnerText = fromOwner.toText();
    
    if (fromOwnerText !== userPrincipalText) {
      return null;
    }
    
    const fee = extractOptional(burn.fee);
    const created_at_time = extractOptional(burn.created_at_time);
    // Note: tx.timestamp is nat64 (nanoseconds), created_at_time is also opt nat64 (nanoseconds)
    let timestamp: bigint;
    if (created_at_time) {
      const nanos = typeof created_at_time === 'string' ? BigInt(created_at_time) : BigInt(created_at_time);
      timestamp = nanos / BigInt(1_000_000_000);
    } else if (tx.timestamp) {
      const nanos = typeof tx.timestamp === 'string' ? BigInt(tx.timestamp) : BigInt(tx.timestamp);
      timestamp = nanos / BigInt(1_000_000_000);
    } else {
      timestamp = BigInt(Math.floor(Date.now() / 1000));
    }
    
    return {
      id: `icrc1-burn-${txWithId.id.toString()}`,
      amount: BigInt(burn.amount),
      timestamp,
      status: 'confirmed' as const,
      fromAddress: userBitcoinAddress,
      toAddress: 'Bitcoin Network',
      fee: fee ? BigInt(fee) : BigInt(0),
    };
  }
  
  return null;
}

export function useCkBTCTransactions(userBitcoinAddress: string) {
  const { identity } = useInternetIdentity();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!identity || !userBitcoinAddress) {
      setTransactions([]);
      setIsFetching(false);
      return;
    }

    async function getTransactions() {
      setIsFetching(true);
      setError(null);

      try {
        if (!identity) {
          console.warn('useCkBTCTransactions: No identity available');
          setTransactions([]);
          setIsFetching(false);
          return;
        }

        const principal = identity.getPrincipal();
        const principalText = principal.toText();
        
        // Principal verification: Check consistency with other hooks
        if (typeof window !== 'undefined') {
          const storedPrincipal = (window as any).__ckbtc_principal_used;
          if (storedPrincipal && storedPrincipal !== principalText) {
            console.warn('⚠️⚠️⚠️ PRINCIPAL MISMATCH DETECTED ⚠️⚠️⚠️');
            console.warn('useCkBTCTransactions: Previous principal:', storedPrincipal);
            console.warn('useCkBTCTransactions: Current principal:', principalText);
            console.warn('useCkBTCTransactions: This may cause transaction history issues!');
            console.warn('useCkBTCTransactions: Ensure all ckBTC operations use the same principal.');
          } else if (!storedPrincipal) {
            (window as any).__ckbtc_principal_used = principalText;
            console.log('useCkBTCTransactions: ✅ Principal stored for verification');
          }
        }
        
        console.log('useCkBTCTransactions: ========================================');
        console.log('useCkBTCTransactions: Fetching transactions from index canister');
        console.log('useCkBTCTransactions: Index canister ID:', CKBTC_INDEX_CANISTER_ID);
        console.log('useCkBTCTransactions: Network mode:', USE_TESTNET ? 'TESTNET (ckTESTBTC)' : 'MAINNET (ckBTC)');
        console.log('useCkBTCTransactions: Principal:', principalText);
        
        // Create agent using HttpAgent directly
        const agent = new HttpAgent({
          identity: identity as any,
          host: HOST,
        });
        
        // Fetch root key for local development (not needed for mainnet)
        if (HOST.includes('localhost') || HOST.includes('127.0.0.1')) {
          await agent.fetchRootKey();
        }

        // Create index canister Actor using proper IDL - matches actual canister interface
        const indexIDLFactory = createCkBTCIndexIDL();
        const indexActor = Actor.createActor(indexIDLFactory, {
          agent,
          canisterId: Principal.fromText(CKBTC_INDEX_CANISTER_ID),
        }) as any;

        // Call get_account_transactions with proper parameters
        // Based on actual Candid interface: { account, start: opt nat, max_results: nat }
        console.log('useCkBTCTransactions: Calling get_account_transactions...');
        console.log('useCkBTCTransactions: Call parameters:', {
          account: {
            owner: principal.toText(),
            subaccount: [],
          },
          start: [], // Empty array [] means None (start from most recent)
          max_results: 100n,
        });
        
        let result;
        try {
          result = await indexActor.get_account_transactions({
            account: {
              owner: principal,
              subaccount: [], // Empty array means None (default subaccount)
            },
            start: [], // Empty array [] means None (start from most recent)
            max_results: BigInt(100), // Required field: get up to 100 transactions
          });
        } catch (decodeError: any) {
          console.error('useCkBTCTransactions: Decode error:', decodeError);
          console.error('useCkBTCTransactions: Error message:', decodeError?.message);
          console.error('useCkBTCTransactions: Error stack:', decodeError?.stack);
          // Re-throw to be caught by outer catch
          throw decodeError;
        }

        console.log('useCkBTCTransactions: ✅ Successfully got response from index canister!');
        console.log('useCkBTCTransactions: Result type:', typeof result);
        console.log('useCkBTCTransactions: Result is array?', Array.isArray(result));
        console.log('useCkBTCTransactions: Result constructor:', result?.constructor?.name);
        console.log('useCkBTCTransactions: Result keys:', result && typeof result === 'object' ? Object.keys(result) : 'N/A');
        console.log('useCkBTCTransactions: Result:', JSON.stringify(result, (_key, value) => 
          typeof value === 'bigint' ? value.toString() : value instanceof Uint8Array ? `Uint8Array(${value.length})` : value
        ));
        
        // The IDL defines the return type as a Result variant: variant { Ok: GetTransactions, Err: GetTransactionsErr }
        // GetTransactions = record { balance: Tokens, transactions: vec TransactionWithId, oldest_tx_id: opt BlockIndex }
        let transactions: ICRC1TransactionWithId[] = [];
        
        // Handle Result variant: { Ok: {...} } or { Err: {...} }
        if (result && typeof result === 'object') {
          if ('Ok' in result) {
            // Result is Ok variant: { Ok: { transactions: [...], balance: Nat, oldest_tx_id: Opt(Nat) } }
            const okResult = result.Ok;
            transactions = okResult.transactions || [];
            console.log('useCkBTCTransactions: ✅ Received Ok result');
            console.log('useCkBTCTransactions: Transactions count:', transactions.length);
            console.log('useCkBTCTransactions: Balance:', okResult.balance?.toString());
            console.log('useCkBTCTransactions: Oldest tx ID:', okResult.oldest_tx_id);
          } else if ('Err' in result) {
            // Result is Err variant: { Err: { message: string } }
            const errMessage = result.Err?.message || 'Unknown error from index canister';
            console.error('useCkBTCTransactions: ❌ Received Err result:', errMessage);
            throw new Error(`Index canister error: ${errMessage}`);
          } else if ('transactions' in result) {
            // Fallback: direct record format (shouldn't happen but handle it)
            console.warn('useCkBTCTransactions: Received direct record format (unexpected)');
            transactions = result.transactions || [];
            console.log('useCkBTCTransactions: Transactions (direct record):', transactions.length);
          } else {
            console.warn('useCkBTCTransactions: Unexpected result format:', result);
            console.warn('useCkBTCTransactions: Result structure:', {
              isArray: Array.isArray(result),
              keys: Object.keys(result),
              constructor: result?.constructor?.name,
            });
            throw new Error('Unexpected result format from index canister');
          }
        } else {
          console.warn('useCkBTCTransactions: Result is not an object:', result);
          throw new Error('Invalid result type from index canister');
        }
        
        if (!transactions || transactions.length === 0) {
          console.log('useCkBTCTransactions: No transactions found (this is OK if account has no transactions yet)');
          setTransactions([]);
          setIsFetching(false);
          return;
        }
        
        console.log('useCkBTCTransactions: Final transaction count:', transactions.length);
        
        // Log raw transaction data for debugging
        if (transactions.length > 0) {
          console.log('useCkBTCTransactions: Sample raw transaction:', {
            id: transactions[0].id?.toString(),
            timestamp: transactions[0].transaction?.timestamp,
            timestampType: typeof transactions[0].transaction?.timestamp,
            created_at_time: transactions[0].transaction?.transfer?.[0]?.created_at_time,
            kind: transactions[0].transaction?.kind,
          });
        }
        
        // Convert ICRC-1 transactions to app format
        const convertedTransactions = transactions
          .map(tx => {
            try {
              return convertICRC1TransactionToAppTransaction(tx, principal, userBitcoinAddress);
            } catch (err) {
              console.error('useCkBTCTransactions: Error converting transaction:', err, tx);
              return null;
            }
          })
          .filter((tx): tx is Transaction => tx !== null)
          .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

        console.log('useCkBTCTransactions: ✅ Found', convertedTransactions.length, 'converted transactions');
        if (convertedTransactions.length > 0) {
          console.log('useCkBTCTransactions: Sample transaction:', convertedTransactions[0]);
        }
        setTransactions(convertedTransactions);
      } catch (err: any) {
        console.error('useCkBTCTransactions: ⚠️ Error fetching transactions:', err.message || err);
        console.error('useCkBTCTransactions: Error details:', err);
        setError(err instanceof Error ? err : new Error(`Failed to get transactions: ${String(err)}`));
        setTransactions([]);
      } finally {
        setIsFetching(false);
      }
    }

    getTransactions();
    
    // Poll for new transactions every 30 seconds
    const interval = setInterval(() => {
      if (identity && userBitcoinAddress) {
        getTransactions();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [identity, userBitcoinAddress]);

  return {
    transactions,
    isFetching,
    error,
  };
}
