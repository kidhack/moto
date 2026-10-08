const USE_TESTNET = import.meta.env.VITE_USE_TESTNET === 'true';

/**
 * Bitcoin explorer APIs for the network this build's ckBTC minter uses. ckTESTBTC runs on
 * Bitcoin testnet4 (not testnet3), and Blockstream has no testnet4 API, so testnet builds use
 * Mempool only (BLOCKSTREAM_API is null).
 */
export const MEMPOOL_API = USE_TESTNET ? 'https://mempool.space/testnet4/api' : 'https://mempool.space/api';
export const BLOCKSTREAM_API: string | null = USE_TESTNET ? null : 'https://blockstream.info/api';
