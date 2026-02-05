import { useState, useEffect, useMemo, useRef } from 'react';
import { Principal } from '@dfinity/principal';
import { Actor, HttpAgent } from '@dfinity/agent';
import { useInternetIdentity } from './useInternetIdentity';
import { createCkBTCMinterIDL, CKBTC_MINTER_CANISTER_ID } from './useCkBTCMinter';
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

// ICRC-1 Transaction types
interface ICRC1Account {
  owner: Principal;
  subaccount: [] | [Uint8Array];
}

interface ICRC1Transfer {
  from: ICRC1Account;
  to: ICRC1Account;
  amount: bigint;
  fee: [] | [bigint];
  memo: [] | [Uint8Array];
  created_at_time: [] | [bigint];
}

interface ICRC1Mint {
  to: ICRC1Account;
  amount: bigint;
  memo: [] | [Uint8Array];
  created_at_time: [] | [bigint];
}

interface ICRC1Burn {
  from: ICRC1Account;
  amount: bigint;
  from_subaccount: [] | [Uint8Array];
  memo: [] | [Uint8Array];
  created_at_time: [] | [bigint];
}

// ICRC-1 Transaction is a Variant (tagged union)
type ICRC1Transaction = 
  | { Transfer: ICRC1Transfer }
  | { Mint: ICRC1Mint }
  | { Burn: ICRC1Burn }
  | { Approve: any };

interface ICRC1TransactionWithId {
  id: bigint;
  transaction: ICRC1Transaction;
}


// Create IDL factory matching index-ng canister (Transaction is record with opt mint/transfer/burn, not variant)
// Return type is variant { Ok = { balance, transactions, oldest_tx_id } ; Err = { message } }
const createCkBTCIndexIDL = () => {
  return ({ IDL }: any) => {
    const Subaccount = IDL.Vec(IDL.Nat8);
    const Account = IDL.Record({
      owner: IDL.Principal,
      subaccount: IDL.Opt(Subaccount),
    });
    const Transfer = IDL.Record({
      from: Account,
      to: Account,
      amount: IDL.Nat,
      fee: IDL.Opt(IDL.Nat),
      memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
      created_at_time: IDL.Opt(IDL.Nat64),
      spender: IDL.Opt(Account),
    });
    const Mint = IDL.Record({
      to: Account,
      amount: IDL.Nat,
      memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
      created_at_time: IDL.Opt(IDL.Nat64),
    });
    const Burn = IDL.Record({
      from: Account,
      amount: IDL.Nat,
      memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
      created_at_time: IDL.Opt(IDL.Nat64),
      spender: IDL.Opt(Account),
      fee: IDL.Opt(IDL.Nat),
    });
    const Approve = IDL.Record({
      from: Account,
      amount: IDL.Int,
      expected_allowance: IDL.Opt(IDL.Nat),
      expires_at: IDL.Opt(IDL.Nat64),
      fee: IDL.Opt(IDL.Nat),
      from_subaccount: IDL.Opt(Subaccount),
      memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
      spender: Account,
      created_at_time: IDL.Opt(IDL.Nat64),
    });
    // index-ng: Transaction is a record with kind, timestamp, and optional mint/transfer/burn/approve
    const Transaction = IDL.Record({
      kind: IDL.Text,
      timestamp: IDL.Nat64,
      mint: IDL.Opt(Mint),
      transfer: IDL.Opt(Transfer),
      burn: IDL.Opt(Burn),
      approve: IDL.Opt(Approve),
    });
    const TransactionWithId = IDL.Record({
      id: IDL.Nat,
      transaction: Transaction,
    });
    const GetTransactions = IDL.Record({
      balance: IDL.Nat,
      transactions: IDL.Vec(TransactionWithId),
      oldest_tx_id: IDL.Opt(IDL.Nat),
    });
    const GetTransactionsErr = IDL.Record({ message: IDL.Text });
    const GetTransactionsResult = IDL.Variant({
      Ok: GetTransactions,
      Err: GetTransactionsErr,
    });
    return IDL.Service({
      get_account_transactions: IDL.Func(
        [IDL.Record({
          account: Account,
          start: IDL.Opt(IDL.Nat),
          max_results: IDL.Nat,
        })],
        [GetTransactionsResult],
        ['query']
      ),
    });
  };
};

// Helper: get optional Candid value (opt T can be [] or [value] or undefined or the value itself)
function optVal<T>(v: [] | [T] | T | undefined | null): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v.length > 0 ? v[0] : undefined;
  return v as T;
}

// Helper: get optional record (index-ng returns mint/transfer/burn as opt = undefined | record)
function optRecord<T extends object>(v: [] | [T] | T | undefined | null, hasKeys: (x: T) => boolean): T | undefined {
  const val = optVal(v);
  if (val == null || typeof val !== 'object') return undefined;
  return hasKeys(val as T) ? (val as T) : undefined;
}

// Convert ICRC-1 transaction to app's Transaction format.
// index-ng: transaction is record { kind, timestamp, mint?, transfer?, burn?, approve? }.
// Also supports legacy variant style { Transfer: {...} } and opt-as-array tx.transfer?.[0].
function convertICRC1TransactionToAppTransaction(
  txWithId: ICRC1TransactionWithId,
  userPrincipal: Principal,
  userBitcoinAddress: string
): Transaction | null {
  const tx = txWithId.transaction as any;
  const principalText = userPrincipal.toText();

  const transfer =
    tx.Transfer ??
    optRecord(tx.transfer, (x: any) => x && (x.from != null || x.to != null));
  const mint =
    tx.Mint ?? optRecord(tx.mint, (x: any) => x && (x.to != null || x.amount != null));
  const burn =
    tx.Burn ?? optRecord(tx.burn, (x: any) => x && (x.from != null || x.amount != null));

  const getTimestamp = (createdAt?: [] | [bigint] | bigint) => {
    const first = optVal(createdAt);
    if (first !== undefined && typeof first === 'bigint') return first / BigInt(1_000_000_000);
    if (typeof tx.timestamp === 'bigint') return tx.timestamp / BigInt(1_000_000_000);
    return BigInt(Math.floor(Date.now() / 1000));
  };

  if (transfer) {
    const isSent = transfer.from?.owner?.toText?.() === principalText;
    const isReceived = transfer.to?.owner?.toText?.() === principalText;
    if (!isSent && !isReceived) return null;
    const fromOwner = transfer.from?.owner;
    const toOwner = transfer.to?.owner;
    return {
      id: `icrc1-${txWithId.id.toString()}`,
      amount: transfer.amount ?? BigInt(0),
      timestamp: getTimestamp(transfer.created_at_time),
      status: 'confirmed' as const,
      fromAddress: isSent ? userBitcoinAddress : (typeof fromOwner?.toText === 'function' ? fromOwner.toText() : String(fromOwner)),
      toAddress: isReceived ? userBitcoinAddress : (typeof toOwner?.toText === 'function' ? toOwner.toText() : String(toOwner)),
      fee: transfer.fee != null && Array.isArray(transfer.fee) && transfer.fee.length > 0 ? transfer.fee[0] : (transfer.fee ?? BigInt(0)),
    };
  }
  if (mint) {
    const toOwner = mint.to?.owner;
    if (typeof toOwner?.toText === 'function' && toOwner.toText() !== principalText) return null;
    if (typeof toOwner === 'string' && toOwner !== principalText) return null;
    const rawMemo = mint.memo;
    const memoBytes = rawMemo != null && Array.isArray(rawMemo) && rawMemo.length > 0
      ? Array.from(rawMemo as Iterable<number> | ArrayLike<number>)
      : undefined;
    return {
      id: `icrc1-mint-${txWithId.id.toString()}`,
      amount: mint.amount ?? BigInt(0),
      timestamp: getTimestamp(mint.created_at_time),
      status: 'confirmed' as const,
      fromAddress: 'Bitcoin Network',
      toAddress: userBitcoinAddress,
      fee: BigInt(0),
      mintMemo: memoBytes,
    };
  }
  if (burn) {
    const fromOwner = burn.from?.owner;
    if (typeof fromOwner?.toText === 'function' && fromOwner.toText() !== principalText) return null;
    if (typeof fromOwner === 'string' && fromOwner !== principalText) return null;
    return {
      id: `icrc1-burn-${txWithId.id.toString()}`,
      amount: burn.amount ?? BigInt(0),
      timestamp: getTimestamp(burn.created_at_time),
      status: 'confirmed' as const,
      fromAddress: userBitcoinAddress,
      toAddress: 'Bitcoin Network',
      fee: BigInt(0),
    };
  }
  return null;
}

const BLOCKSTREAM_API = USE_TESTNET ? 'https://blockstream.info/testnet/api' : 'https://blockstream.info/api';

export function useCkBTCTransactions(userBitcoinAddress: string) {
  const { identity } = useInternetIdentity();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sourceAddressByTxId, setSourceAddressByTxId] = useState<Record<string, string>>({});
  const resolvedTxIdsRef = useRef<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Resolve Bitcoin source address for mint transactions (decode memo -> get txid -> fetch tx -> first input address)
  useEffect(() => {
    if (!identity || transactions.length === 0) return;
    const agent = new HttpAgent({ identity: identity as any, host: HOST });
    if (HOST.includes('localhost') || HOST.includes('127.0.0.1')) agent.fetchRootKey().catch(() => {});
    const minterIDL = createCkBTCMinterIDL();
    const minterActor = Actor.createActor(minterIDL, {
      agent,
      canisterId: Principal.fromText(CKBTC_MINTER_CANISTER_ID),
    }) as any;

    let cancelled = false;
    (async () => {
      for (const tx of transactions) {
        if (cancelled) break;
        if (!tx.id.startsWith('icrc1-mint-') || !tx.mintMemo?.length || resolvedTxIdsRef.current.has(tx.id)) continue;
        try {
          const decoded = await minterActor.decode_ledger_memo({
            memo_type: { Mint: null },
            encoded_memo: tx.mintMemo,
          });
          const decodedMemo = Array.isArray(decoded?.Ok) ? decoded.Ok[0] : decoded?.Ok;
          const mintVariant = decodedMemo?.Mint;
          const convert = (Array.isArray(mintVariant) ? mintVariant[0] : mintVariant)?.Convert ?? (Array.isArray(mintVariant) ? mintVariant[0] : null);
          const txidOpt = convert?.txid;
          const txidBytes = (Array.isArray(txidOpt) ? txidOpt[0] : txidOpt) as Uint8Array | number[] | undefined;
          if (!txidBytes || !ArrayBuffer.isView(txidBytes) && !Array.isArray(txidBytes)) continue;
          const arr = Array.from(txidBytes as Uint8Array);
          if (arr.length !== 32) continue;
          const txidHex = arr.reverse().map(b => b.toString(16).padStart(2, '0')).join('');
          const res = await fetch(`${BLOCKSTREAM_API}/tx/${txidHex}`);
          if (!res.ok) continue;
          const data = await res.json();
          const firstVin = data.vin?.[0];
          const addr = firstVin?.prevout?.scriptpubkey_address;
          if (addr && !cancelled) {
            resolvedTxIdsRef.current.add(tx.id);
            setSourceAddressByTxId(prev => ({ ...prev, [tx.id]: addr }));
          }
        } catch (_) {
          // ignore decode/fetch errors per tx
        }
      }
    })();
    return () => { cancelled = true; };
  }, [identity, transactions]);

  const transactionsWithSource = useMemo(
    () => transactions.map(tx => ({
      ...tx,
      sourceBitcoinAddress: sourceAddressByTxId[tx.id] ?? tx.sourceBitcoinAddress,
    })),
    [transactions, sourceAddressByTxId]
  );

  useEffect(() => {
    if (!identity || !userBitcoinAddress) {
      setTransactions([]);
      setSourceAddressByTxId({});
      resolvedTxIdsRef.current = new Set();
      setIsFetching(false);
      return;
    }
    resolvedTxIdsRef.current = new Set();
    setSourceAddressByTxId({});

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

        // Create index canister Actor using proper IDL
        const indexIDLFactory = createCkBTCIndexIDL();
        const indexActor = Actor.createActor(indexIDLFactory, {
          agent,
          canisterId: Principal.fromText(CKBTC_INDEX_CANISTER_ID),
        }) as any;

        // Call get_account_transactions with proper parameters
        console.log('useCkBTCTransactions: Calling get_account_transactions...');
        const result = await indexActor.get_account_transactions({
          account: {
            owner: principal,
            subaccount: [],
          },
          start: [],
          max_results: BigInt(100),
        });

        console.log('useCkBTCTransactions: ✅ Successfully got transactions from index canister!');
        console.log('useCkBTCTransactions: Result type:', typeof result);
        console.log('useCkBTCTransactions: Result is array?', Array.isArray(result));
        console.log('useCkBTCTransactions: Result:', JSON.stringify(result, (_key, value) => 
          typeof value === 'bigint' ? value.toString() : value instanceof Uint8Array ? `Uint8Array(${value.length})` : value
        ));
        
        // index-ng returns variant { Ok = { balance, transactions, oldest_tx_id } } or { Err = { message } }
        let transactions: ICRC1TransactionWithId[] = [];
        const raw = result && typeof result === 'object' ? (result as any) : null;
        if (raw?.Err) {
          console.log('useCkBTCTransactions: Index returned Err:', raw.Err?.message ?? raw.Err);
          setTransactions([]);
          return;
        }
        if (raw?.Ok && typeof raw.Ok === 'object') {
          const ok = raw.Ok;
          transactions = Array.isArray(ok.transactions) ? ok.transactions : [];
          console.log('useCkBTCTransactions: Result format: Ok', { transactions: transactions.length, oldest_tx_id: ok.oldest_tx_id, balance: ok.balance?.toString?.() });
        } else {
          console.warn('useCkBTCTransactions: Unexpected result shape. Keys:', raw ? Object.keys(raw) : 'null');
        }
        
        if (!transactions || transactions.length === 0) {
          console.log('useCkBTCTransactions: No transactions found (this is OK if account has no transactions yet)');
          setTransactions([]);
          return;
        }
        
        console.log('useCkBTCTransactions: Final transaction count:', transactions.length);
        
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
    transactions: transactionsWithSource,
    isFetching,
    error,
  };
}
