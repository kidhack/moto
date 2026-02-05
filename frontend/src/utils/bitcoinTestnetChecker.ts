/**
 * Utility to check Bitcoin testnet transaction status
 * Uses mempool.space testnet API to verify if transactions were sent to an address
 */

export interface BitcoinTransaction {
  txid: string;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  vin: Array<{
    prevout: {
      scriptpubkey_address: string;
      value: number;
    };
  }>;
  vout: Array<{
    scriptpubkey_address: string;
    value: number;
  }>;
}

export interface AddressTransactions {
  address: string;
  txids: string[];
  tx_count: number;
  funded_txo_sum: number;
  spent_txo_sum: number;
}

/**
 * Check if a Bitcoin testnet address has received any transactions
 * @param address Bitcoin testnet address (starts with tb1, m, or n)
 * @returns Array of transaction IDs that sent funds to this address
 */
export async function checkBitcoinTestnetTransactions(address: string): Promise<{
  hasTransactions: boolean;
  transactionCount: number;
  totalReceived: number; // in satoshis
  transactions: Array<{
    txid: string;
    amount: number; // in satoshis
    confirmed: boolean;
    blockTime?: number;
  }>;
  error?: string;
}> {
  try {
    // Use mempool.space testnet API
    const apiUrl = `https://mempool.space/testnet/api/address/${address}/txs`;
    
    console.log('bitcoinTestnetChecker: Checking transactions for address:', address);
    console.log('bitcoinTestnetChecker: API URL:', apiUrl);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      if (response.status === 404) {
        // No transactions found
        return {
          hasTransactions: false,
          transactionCount: 0,
          totalReceived: 0,
          transactions: [],
        };
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const transactions: BitcoinTransaction[] = await response.json();
    
    console.log('bitcoinTestnetChecker: Found', transactions.length, 'transactions');
    
    // Filter for transactions that sent funds TO this address (in vout)
    const receivedTransactions = transactions
      .map(tx => {
        // Find outputs that sent to our address
        const outputsToAddress = tx.vout.filter(
          vout => vout.scriptpubkey_address === address
        );
        
        if (outputsToAddress.length === 0) {
          return null;
        }
        
        const totalAmount = outputsToAddress.reduce(
          (sum, vout) => sum + vout.value,
          0
        );
        
        return {
          txid: tx.txid,
          amount: totalAmount,
          confirmed: tx.status.confirmed,
          blockTime: tx.status.block_time,
        };
      })
      .filter((tx): tx is NonNullable<typeof tx> => tx !== null);
    
    const totalReceived = receivedTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0
    );
    
    console.log('bitcoinTestnetChecker: Received transactions:', receivedTransactions.length);
    console.log('bitcoinTestnetChecker: Total received:', totalReceived, 'satoshis');
    console.log('bitcoinTestnetChecker: Total received (BTC):', totalReceived / 100000000);
    
    return {
      hasTransactions: receivedTransactions.length > 0,
      transactionCount: receivedTransactions.length,
      totalReceived,
      transactions: receivedTransactions,
    };
  } catch (error) {
    console.error('bitcoinTestnetChecker: Error checking transactions:', error);
    return {
      hasTransactions: false,
      transactionCount: 0,
      totalReceived: 0,
      transactions: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get the balance of a Bitcoin testnet address
 * @param address Bitcoin testnet address
 * @returns Balance in satoshis
 */
export async function getBitcoinTestnetBalance(address: string): Promise<{
  balance: number; // in satoshis
  confirmed: number;
  unconfirmed: number;
  error?: string;
}> {
  try {
    const apiUrl = `https://mempool.space/testnet/api/address/${address}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data: AddressTransactions = await response.json();
    
    // Calculate balance: funded - spent
    const balance = data.funded_txo_sum - data.spent_txo_sum;
    
    return {
      balance,
      confirmed: balance, // mempool.space doesn't separate confirmed/unconfirmed in this endpoint
      unconfirmed: 0,
    };
  } catch (error) {
    console.error('bitcoinTestnetChecker: Error getting balance:', error);
    return {
      balance: 0,
      confirmed: 0,
      unconfirmed: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check for pending Bitcoin deposits that haven't been converted to ckBTC yet
 * @param address Bitcoin address (testnet or mainnet)
 * @param principal Principal ID to check minter status
 * @returns Information about pending deposits
 */
export async function checkPendingDeposits(
  address: string,
  principal?: string
): Promise<{
  hasPendingDeposits: boolean;
  pendingAmount: number; // in satoshis
  confirmedAmount: number; // in satoshis
  unconfirmedAmount: number; // in satoshis
  transactions: Array<{
    txid: string;
    amount: number;
    confirmed: boolean;
    blockTime?: number;
  }>;
  error?: string;
}> {
  try {
    const USE_TESTNET = import.meta.env.VITE_USE_TESTNET === 'true';
    const apiBase = USE_TESTNET 
      ? 'https://mempool.space/testnet/api'
      : 'https://mempool.space/api';
    
    // Get address info
    const addressUrl = `${apiBase}/address/${address}`;
    const addressResponse = await fetch(addressUrl);
    
    if (!addressResponse.ok) {
      throw new Error(`API error: ${addressResponse.status} ${addressResponse.statusText}`);
    }
    
    await addressResponse.json() as AddressTransactions;
    
    // Get transactions
    const txsUrl = `${apiBase}/address/${address}/txs`;
    const txsResponse = await fetch(txsUrl);
    
    if (!txsResponse.ok) {
      throw new Error(`API error: ${txsResponse.status} ${txsResponse.statusText}`);
    }
    
    const transactions: BitcoinTransaction[] = await txsResponse.json();
    
    // Filter for unconfirmed transactions (pending deposits)
    const unconfirmedTxs = transactions.filter(tx => !tx.status.confirmed);
    
    // Calculate amounts
    let unconfirmedAmount = 0;
    let confirmedAmount = 0;
    
    transactions.forEach(tx => {
      const outputsToAddress = tx.vout.filter(
        vout => vout.scriptpubkey_address === address
      );
      
      const amount = outputsToAddress.reduce((sum, vout) => sum + vout.value, 0);
      
      if (tx.status.confirmed) {
        confirmedAmount += amount;
      } else {
        unconfirmedAmount += amount;
      }
    });
    
    const pendingAmount = unconfirmedAmount;
    const hasPendingDeposits = unconfirmedTxs.length > 0 || pendingAmount > 0;
    
    const pendingTransactions = unconfirmedTxs.map(tx => {
      const outputsToAddress = tx.vout.filter(
        vout => vout.scriptpubkey_address === address
      );
      const amount = outputsToAddress.reduce((sum, vout) => sum + vout.value, 0);
      
      return {
        txid: tx.txid,
        amount,
        confirmed: false,
        blockTime: tx.status.block_time,
      };
    });
    
    console.log('bitcoinTestnetChecker: Deposit status check:', {
      address,
      hasPendingDeposits,
      pendingAmount,
      confirmedAmount,
      unconfirmedTxCount: unconfirmedTxs.length,
      totalTxCount: transactions.length,
    });
    
    if (hasPendingDeposits) {
      console.warn('bitcoinTestnetChecker: ⚠️ PENDING DEPOSITS DETECTED');
      console.warn('bitcoinTestnetChecker: Pending amount:', pendingAmount, 'satoshis');
      console.warn('bitcoinTestnetChecker: Pending amount (BTC):', pendingAmount / 100000000);
      console.warn('bitcoinTestnetChecker: Unconfirmed transactions:', unconfirmedTxs.length);
      console.warn('bitcoinTestnetChecker: These deposits will be converted to ckBTC within 10-30 minutes');
      if (principal) {
        console.warn('bitcoinTestnetChecker: Principal:', principal);
        console.warn('bitcoinTestnetChecker: Check minter dashboard for conversion status');
      }
    }
    
    return {
      hasPendingDeposits,
      pendingAmount,
      confirmedAmount,
      unconfirmedAmount,
      transactions: pendingTransactions,
    };
  } catch (error) {
    console.error('bitcoinTestnetChecker: Error checking pending deposits:', error);
    return {
      hasPendingDeposits: false,
      pendingAmount: 0,
      confirmedAmount: 0,
      unconfirmedAmount: 0,
      transactions: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

