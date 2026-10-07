import { useState, useEffect, useCallback } from 'react';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { toast } from 'sonner';
import { useInternetIdentity } from './useInternetIdentity';
import { IC_HOST } from '../lib/ic';
import { depositNotices, type DepositNotice, type UpdateBalanceResult } from '../lib/depositNotices';
import { useTranslation } from '../i18n';

const SEEN_DEPOSIT_NOTICES_KEY = 'moto_seen_deposit_notices';

/** Keys of deposit notices already shown this session (so balance refreshes don't repeat them). */
function takeUnseenNotices(notices: DepositNotice[]): DepositNotice[] {
  let seen: string[] = [];
  try {
    seen = JSON.parse(sessionStorage.getItem(SEEN_DEPOSIT_NOTICES_KEY) ?? '[]');
  } catch { /* storage unavailable */ }
  const fresh = notices.filter((n) => !seen.includes(n.key));
  if (fresh.length > 0) {
    try {
      sessionStorage.setItem(SEEN_DEPOSIT_NOTICES_KEY, JSON.stringify([...seen, ...fresh.map((n) => n.key)]));
    } catch { /* storage unavailable */ }
  }
  return fresh;
}

// Check if we should use testnet
const USE_TESTNET = import.meta.env.VITE_USE_TESTNET === 'true';

// ckBTC Minter canister IDs
// Mainnet: mqygn-kiaaa-aaaar-qaadq-cai
// Testnet (ckTESTBTC): ml52i-qqaaa-aaaar-qaaba-cai
const CKBTC_MINTER_CANISTER_ID_MAINNET = 'mqygn-kiaaa-aaaar-qaadq-cai';
const CKBTC_MINTER_CANISTER_ID_TESTNET = 'ml52i-qqaaa-aaaar-qaaba-cai';

// Determine which canister ID to use
const envCanisterId = import.meta.env.VITE_CKBTC_MINTER_CANISTER_ID;
const defaultCanisterId = USE_TESTNET 
  ? CKBTC_MINTER_CANISTER_ID_TESTNET 
  : CKBTC_MINTER_CANISTER_ID_MAINNET;
const CKBTC_MINTER_CANISTER_ID = envCanisterId || defaultCanisterId;
export { CKBTC_MINTER_CANISTER_ID };
export { createCkBTCMinterIDL };

// Log warning if using environment variable with potentially incorrect ID
if (envCanisterId) {
  const expectedId = USE_TESTNET 
    ? CKBTC_MINTER_CANISTER_ID_TESTNET 
    : CKBTC_MINTER_CANISTER_ID_MAINNET;
  if (envCanisterId !== expectedId) {
    console.warn('⚠️ useCkBTCMinter: Using environment variable canister ID that differs from expected:', {
      envId: envCanisterId,
      expectedId: expectedId,
      network: USE_TESTNET ? 'TESTNET' : 'MAINNET',
    });
  }
}

// Detect network - but always use production host for ckBTC minter
// Localhost can call production canisters by using the production host
const envNetwork = import.meta.env.VITE_DFX_NETWORK;
const hostname = window.location.hostname;
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
const isLocal = envNetwork ? envNetwork === 'local' : isLocalhost;

// Always use production host for ckBTC minter (it only exists on mainnet)
const HOST = IC_HOST;

// ckBTC Minter interface
// For optional values in Candid IDL.Opt(), the agent requires the field to be present
// - For None: pass [] (empty array)
// - For Some(value): pass [value] (wrapped in array)
export interface CkBTCMinter {
  get_btc_address: (arg: { owner: [] | [Principal]; subaccount: [] | [Uint8Array] }) => Promise<string>;
  update_balance: (arg: { owner: [] | [Principal]; subaccount: [] | [Uint8Array] }) => Promise<UpdateBalanceResult>;
  get_minter_info: () => Promise<{ retrieve_btc_min_amount: bigint; min_confirmations: number; kyt_fee: bigint; deposit_btc_min_amount?: [] | [bigint] }>;
  retrieve_btc_with_approval: (arg: { address: string; amount: bigint; from_subaccount: [] | [Uint8Array] }) => Promise<
    | { Ok: { block_index: bigint } }
    | { Err: RetrieveBtcWithApprovalError }
  >;
  estimate_withdrawal_fee: (arg: { amount: [] | [bigint] }) => Promise<{ bitcoin_fee: bigint; minter_fee: bigint }>;
  retrieve_btc_status_v2_by_account: (
    account: [] | [{ owner: Principal; subaccount: [] | [Uint8Array] }]
  ) => Promise<Array<{ block_index: bigint; status_v2: [] | [unknown] }>>;
}

export type RetrieveBtcWithApprovalError =
  | { MalformedAddress: string }
  | { AlreadyProcessing: null }
  | { AmountTooLow: bigint }
  | { InsufficientFunds: { balance: bigint } }
  | { InsufficientAllowance: { allowance: bigint } }
  | { TemporarilyUnavailable: string }
  | { GenericError: { error_message: string; error_code: bigint } };

// Create IDL factory for ckBTC minter
// get_btc_address: UPDATE, returns Text
// update_balance: UPDATE, returns variant { Ok = vec UtxoStatus; Err = UpdateBalanceError }
const createCkBTCMinterIDL = () => {
  return ({ IDL }: any) => {
    const Utxo = IDL.Record({
      outpoint: IDL.Record({ txid: IDL.Vec(IDL.Nat8), vout: IDL.Nat32 }),
      value: IDL.Nat64,
      height: IDL.Nat32,
    });
    const UtxoStatus = IDL.Variant({
      ValueTooSmall: Utxo,
      Tainted: Utxo,
      Checked: Utxo,
      Minted: IDL.Record({ block_index: IDL.Nat64, minted_amount: IDL.Nat64, utxo: Utxo }),
    });
    const PendingUtxo = IDL.Record({
      outpoint: IDL.Record({ txid: IDL.Vec(IDL.Nat8), vout: IDL.Nat32 }),
      value: IDL.Nat64,
      confirmations: IDL.Nat32,
    });
    const SuspendedReason = IDL.Variant({ ValueTooSmall: IDL.Null, Quarantined: IDL.Null });
    const SuspendedUtxo = IDL.Record({
      utxo: Utxo,
      reason: SuspendedReason,
      earliest_retry: IDL.Nat64,
    });
    const UpdateBalanceError = IDL.Variant({
      NoNewUtxos: IDL.Record({
        current_confirmations: IDL.Opt(IDL.Nat32),
        required_confirmations: IDL.Nat32,
        pending_utxos: IDL.Opt(IDL.Vec(PendingUtxo)),
        suspended_utxos: IDL.Opt(IDL.Vec(SuspendedUtxo)),
      }),
      AlreadyProcessing: IDL.Null,
      TemporarilyUnavailable: IDL.Text,
      GenericError: IDL.Record({ error_message: IDL.Text, error_code: IDL.Nat64 }),
    });
    const UpdateBalanceResult = IDL.Variant({
      Ok: IDL.Vec(UtxoStatus),
      Err: UpdateBalanceError,
    });
    const RetrieveBtcOk = IDL.Record({ block_index: IDL.Nat64 });
    const RetrieveBtcWithApprovalError = IDL.Variant({
      MalformedAddress: IDL.Text,
      AlreadyProcessing: IDL.Null,
      AmountTooLow: IDL.Nat64,
      InsufficientFunds: IDL.Record({ balance: IDL.Nat64 }),
      InsufficientAllowance: IDL.Record({ allowance: IDL.Nat64 }),
      TemporarilyUnavailable: IDL.Text,
      GenericError: IDL.Record({ error_message: IDL.Text, error_code: IDL.Nat64 }),
    });
    const RetrieveBtcWithApprovalResult = IDL.Variant({
      Ok: RetrieveBtcOk,
      Err: RetrieveBtcWithApprovalError,
    });
    const MinterInfo = IDL.Record({
      min_confirmations: IDL.Nat32,
      retrieve_btc_min_amount: IDL.Nat64,
      kyt_fee: IDL.Nat64,
      deposit_btc_min_amount: IDL.Opt(IDL.Nat64),
    });
    const MemoType = IDL.Variant({ Burn: IDL.Null, Mint: IDL.Null });
    const DecodeLedgerMemoArgs = IDL.Record({
      memo_type: MemoType,
      encoded_memo: IDL.Vec(IDL.Nat8),
    });
    const MintMemoConvert = IDL.Record({
      txid: IDL.Opt(IDL.Vec(IDL.Nat8)),
      vout: IDL.Opt(IDL.Nat32),
      kyt_fee: IDL.Opt(IDL.Nat64),
    });
    const MintMemo = IDL.Variant({
      Convert: MintMemoConvert,
      Kyt: IDL.Null,
      KytFail: IDL.Record({ kyt_fee: IDL.Opt(IDL.Nat64), status: IDL.Opt(IDL.Text), associated_burn_index: IDL.Opt(IDL.Nat64) }),
      ReimburseWithdrawal: IDL.Record({ withdrawal_id: IDL.Nat64 }),
    });
    const DecodedMemo = IDL.Record({
      Mint: IDL.Opt(MintMemo),
      Burn: IDL.Opt(IDL.Variant({ Convert: IDL.Record({ address: IDL.Opt(IDL.Text), kyt_fee: IDL.Opt(IDL.Nat64), status: IDL.Opt(IDL.Text) }), Consolidate: IDL.Record({ value: IDL.Nat64, inputs: IDL.Nat64 }) })),
    });
    const DecodeLedgerMemoResult = IDL.Variant({
      Ok: IDL.Opt(DecodedMemo),
      Err: IDL.Opt(IDL.Record({ InvalidMemo: IDL.Text })),
    });
    const RetrieveBtcStatusV2 = IDL.Variant({
      Unknown: IDL.Null,
      Pending: IDL.Null,
      Signing: IDL.Null,
      Sending: IDL.Record({ txid: IDL.Vec(IDL.Nat8) }),
      Submitted: IDL.Record({ txid: IDL.Vec(IDL.Nat8) }),
      AmountTooLow: IDL.Null,
      Confirmed: IDL.Record({ txid: IDL.Vec(IDL.Nat8) }),
      Reimbursed: IDL.Record({ account: IDL.Record({ owner: IDL.Principal, subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) }), mint_block_index: IDL.Nat64, amount: IDL.Nat64, reason: IDL.Variant({ CallFailed: IDL.Null, TaintedDestination: IDL.Record({ kyt_fee: IDL.Nat64, kyt_provider: IDL.Principal }) }) }),
      WillReimburse: IDL.Record({ account: IDL.Record({ owner: IDL.Principal, subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) }), amount: IDL.Nat64, reason: IDL.Variant({ CallFailed: IDL.Null, TaintedDestination: IDL.Record({ kyt_fee: IDL.Nat64, kyt_provider: IDL.Principal }) }) }),
    });
    return IDL.Service({
      get_btc_address: IDL.Func(
        [IDL.Record({
          owner: IDL.Opt(IDL.Principal),
          subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
        })],
        [IDL.Text],
        ['update']
      ),
      update_balance: IDL.Func(
        [IDL.Record({
          owner: IDL.Opt(IDL.Principal),
          subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
        })],
        [UpdateBalanceResult],
        ['update']
      ),
      get_minter_info: IDL.Func([], [MinterInfo], ['query']),
      retrieve_btc_with_approval: IDL.Func(
        [IDL.Record({
          address: IDL.Text,
          amount: IDL.Nat64,
          from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
        })],
        [RetrieveBtcWithApprovalResult],
        ['update']
      ),
      decode_ledger_memo: IDL.Func([DecodeLedgerMemoArgs], [DecodeLedgerMemoResult], ['query']),
      retrieve_btc_status_v2: IDL.Func([IDL.Record({ block_index: IDL.Nat64 })], [RetrieveBtcStatusV2], ['query']),
      estimate_withdrawal_fee: IDL.Func(
        [IDL.Record({ amount: IDL.Opt(IDL.Nat64) })],
        [IDL.Record({ bitcoin_fee: IDL.Nat64, minter_fee: IDL.Nat64 })],
        ['query']
      ),
      retrieve_btc_status_v2_by_account: IDL.Func(
        [IDL.Opt(IDL.Record({ owner: IDL.Principal, subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) }))],
        [IDL.Vec(IDL.Record({ block_index: IDL.Nat64, status_v2: IDL.Opt(RetrieveBtcStatusV2) }))],
        ['query']
      ),
    });
  };
};

export function useCkBTCMinter() {
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();
  const [address, setAddress] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [principalUsed, setPrincipalUsed] = useState<string | null>(null);

  useEffect(() => {
    if (!identity) {
      setAddress(null);
      setIsFetching(false);
      setError(null);
      return;
    }

    // Note: We can call production ckBTC minter from localhost by using IC_HOST
    // The ckBTC minter only exists on mainnet, but we can access it from anywhere
    // On localhost, we'll still try to use ckBTC minter (it works from localhost)

    async function getBtcAddress() {
      setIsFetching(true);
      setError(null);

      try {
        // Create HTTP agent with the identity
        const agent = new HttpAgent({
          identity: identity as any,
          host: HOST,
        });

        // Fetch root key for local development (not needed for production)
        if (isLocal) {
          try {
            await agent.fetchRootKey();
          } catch (e) {
            console.warn('useCkBTCMinter: Could not fetch root key (this is OK for production):', e);
          }
        }

        // Get the Bitcoin address for the user's principal
        // identity is guaranteed to be non-null here due to the check at the start of useEffect
        const principal = identity!.getPrincipal();
        const principalText = principal.toText();
        setPrincipalUsed(principalText);
        
        console.log('useCkBTCMinter: ========================================');
        console.log('useCkBTCMinter: Getting BTC address for principal:', principalText);
        console.log('useCkBTCMinter: Principal bytes:', Array.from(principal.toUint8Array()));
        console.log('useCkBTCMinter: Using ckBTC minter canister:', CKBTC_MINTER_CANISTER_ID);
        console.log('useCkBTCMinter: Canister ID source:', envCanisterId ? 'ENVIRONMENT VARIABLE' : 'DEFAULT');
        console.log('useCkBTCMinter: Expected canister ID:', defaultCanisterId);
        console.log('useCkBTCMinter: Network mode:', USE_TESTNET ? 'TESTNET (ckTESTBTC)' : 'MAINNET (ckBTC)');
        console.log('useCkBTCMinter: Using host:', HOST);
        console.log('useCkBTCMinter: Is local:', isLocal);
        console.log('useCkBTCMinter: App origin:', window.location.origin);
        
        // Verify canister ID matches expected
        if (CKBTC_MINTER_CANISTER_ID !== defaultCanisterId) {
          console.warn('⚠️ useCkBTCMinter: WARNING - Using non-default canister ID!');
          console.warn('   Current ID:', CKBTC_MINTER_CANISTER_ID);
          console.warn('   Expected ID:', defaultCanisterId);
          console.warn('   This may cause errors if the ID is incorrect.');
        }
        console.log('');
        console.log('⚠️ IMPORTANT: This address is generated for the app-specific principal ID');
        console.log('   Principal:', principalText);
        console.log('   This principal is DIFFERENT from your NNS top-level principal');
        console.log('   Make sure to send BTC to THIS address (shown in the app) to see the balance here');
        console.log('');
        
        // Principal verification: Store for comparison with other hooks
        if (typeof window !== 'undefined') {
          const storedPrincipal = (window as any).__ckbtc_principal_used;
          if (storedPrincipal && storedPrincipal !== principalText) {
            console.warn('⚠️⚠️⚠️ PRINCIPAL MISMATCH DETECTED ⚠️⚠️⚠️');
            console.warn('useCkBTCMinter: Previous principal:', storedPrincipal);
            console.warn('useCkBTCMinter: Current principal:', principalText);
            console.warn('useCkBTCMinter: This may cause address/balance issues!');
            console.warn('useCkBTCMinter: Ensure all ckBTC operations use the same principal.');
          } else {
            (window as any).__ckbtc_principal_used = principalText;
            console.log('useCkBTCMinter: ✅ Principal stored for verification');
          }
        }
        
        // Create actor for ckBTC minter using the IDL
        // The method is an UPDATE method and returns text directly
        const minterIDLFactory = createCkBTCMinterIDL();
        const minterActor = Actor.createActor(minterIDLFactory, {
          agent,
          canisterId: CKBTC_MINTER_CANISTER_ID,
        }) as any as CkBTCMinter;
        
        // For optional values in Candid IDL.Opt(), the agent requires the field to be present
        // - For None: pass [] (empty array)
        // - For Some(value): pass [value] (wrapped in array)
        // Pass empty arrays for both to use the caller's principal
        console.log('useCkBTCMinter: Calling get_btc_address (UPDATE) with owner: [], subaccount: []');
        console.log('useCkBTCMinter: This will generate an address for principal:', principalText);
        const address = await minterActor.get_btc_address({
          owner: [], // Empty array [] means None (use caller's principal)
          subaccount: [], // Empty array [] means None
        });

        // The method returns a string directly, not a record
        if (address && typeof address === 'string' && address.length > 0) {
          console.log('');
          console.log('✅✅✅ BTC ADDRESS GENERATED ✅✅✅');
          console.log('  Address:', address);
          console.log('  Principal used:', principalText);
          console.log('  Network:', USE_TESTNET ? 'TESTNET (ckTESTBTC)' : 'MAINNET (ckBTC)');
          console.log('  ⚠️ IMPORTANT: Send BTC to THIS address to see balance in this app');
          console.log('  ⚠️ This address is specific to this app\'s principal ID');
          console.log('');
          setAddress(address);
        } else {
          throw new Error('Failed to get BTC address: empty or invalid response');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('useCkBTCMinter: Error getting BTC address:', {
          error: err,
          message: errorMessage,
          canisterId: CKBTC_MINTER_CANISTER_ID,
          principal: identity!.getPrincipal().toText(),
        });
        setError(err instanceof Error ? err : new Error(`Failed to get BTC address: ${String(err)}`));
        setAddress(null);
      } finally {
        setIsFetching(false);
      }
    }

    getBtcAddress();
  }, [identity, isLocal]);

  // Call minter update_balance so any new Bitcoin deposits get minted to ckBTC.
  // Safe to call before loading balance; NoNewUtxos is expected when there are no new deposits.
  const updateBalance = useCallback(async () => {
    if (!identity) return;
    try {
      const agent = new HttpAgent({
        identity: identity as any,
        host: HOST,
      });
      if (isLocal) {
        try {
          await agent.fetchRootKey();
        } catch {
          // ignore
        }
      }
      const minterIDLFactory = createCkBTCMinterIDL();
      const minterActor = Actor.createActor(minterIDLFactory, {
        agent,
        canisterId: CKBTC_MINTER_CANISTER_ID,
      }) as any as CkBTCMinter;
      const result = await minterActor.update_balance({
        owner: [],
        subaccount: [],
      });
      for (const notice of takeUnseenNotices(depositNotices(result))) {
        const sats = notice.sats.toString();
        if (notice.kind === 'pending') {
          toast(t('deposit.pending', { sats, confirmations: String(notice.confirmations ?? 0), required: String(notice.required ?? 0) }));
        } else if (notice.kind === 'minted') {
          toast.success(t('deposit.minted', { sats }));
        } else if (notice.kind === 'tooSmall') {
          toast.error(t('deposit.tooSmall', { sats }), { duration: 15000 });
        } else {
          toast.error(t('deposit.flagged', { sats }), { duration: 15000 });
        }
      }
      if ('Err' in result && !('NoNewUtxos' in result.Err) && !('AlreadyProcessing' in result.Err)) {
        console.warn('useCkBTCMinter: update_balance error', result.Err);
      }
    } catch (err) {
      console.warn('useCkBTCMinter: update_balance failed (non-fatal):', err);
    }
  }, [identity, isLocal, t]);

  return {
    address,
    isFetching,
    error,
    principalUsed,
    updateBalance,
  };
}

