/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_TESTNET?: string;
  readonly VITE_DFX_NETWORK?: string;
  readonly VITE_CANISTER_ID_MOTO?: string;
  readonly VITE_CANISTER_ID_INTERNET_IDENTITY?: string;
  readonly VITE_CKBTC_MINTER_CANISTER_ID?: string;
  readonly VITE_CKBTC_LEDGER_CANISTER_ID?: string;
  readonly VITE_CKBTC_INDEX_CANISTER_ID?: string;
  readonly VITE_FEE_PERCENT?: string;
  readonly VITE_FEE_CAP_USD?: string;
  readonly VITE_FEE_TREASURY_PRINCIPAL?: string;
  readonly VITE_ENABLE_PROXY_FALLBACK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
