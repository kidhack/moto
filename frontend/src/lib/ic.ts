/**
 * IC API boundary used for every agent call to mainnet canisters (MOTO backend, ckBTC ledger,
 * minter, index). Testnet ckTESTBTC canisters also live on IC mainnet, so this is the same for both builds.
 */
export const IC_HOST = 'https://icp-api.io';

/** Internet Identity management page, where users add a recovery phrase or another passkey. */
export const II_MANAGE_URL = 'https://id.ai';
