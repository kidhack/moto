export const idlFactory = ({ IDL }) => {
  const BitcoinAddress = IDL.Text;
  const TransactionId = IDL.Text;
  const TransactionStatus = IDL.Variant({
    'pending' : IDL.Null,
    'confirmed' : IDL.Null,
    'failed' : IDL.Null,
  });
  const Transaction = IDL.Record({
    'id' : TransactionId,
    'fee' : IDL.Int,
    'status' : TransactionStatus,
    'fromAddress' : BitcoinAddress,
    'timestamp' : IDL.Int,
    'toAddress' : BitcoinAddress,
    'amount' : IDL.Int,
  });
  const UserWallet = IDL.Record({
    'principal' : IDL.Principal,
    'balance' : IDL.Int,
    'createdAt' : IDL.Int,
    'onboardingComplete' : IDL.Bool,
    'lastUpdated' : IDL.Int,
    'bitcoinAddress' : BitcoinAddress,
    'transactions' : IDL.Vec(Transaction),
    'walletName' : IDL.Text,
    'preferredCurrency' : IDL.Text,
    'preferredLanguage' : IDL.Text,
  });
  return IDL.Service({
    'completeOnboarding' : IDL.Func([], [], []),
    'ensureWalletExists' : IDL.Func([], [BitcoinAddress], []),
    'getAllWallets' : IDL.Func([], [IDL.Vec(UserWallet)], []),
    'getBalance' : IDL.Func([], [IDL.Int], []),
    'getBitcoinAddress' : IDL.Func([], [BitcoinAddress], []),
    'getPrincipalByBitcoinAddress' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(IDL.Principal)],
        ['query'],
      ),
    'getTransactionHistory' : IDL.Func([], [IDL.Vec(Transaction)], []),
    'getWalletInfo' : IDL.Func([], [IDL.Opt(UserWallet)], []),
    'isOnboardingComplete' : IDL.Func([], [IDL.Bool], []),
    'resetOnboarding' : IDL.Func([], [], []),
    'sendTransaction' : IDL.Func(
        [BitcoinAddress, IDL.Int],
        [TransactionId],
        [],
      ),
    'setBitcoinAddress' : IDL.Func([BitcoinAddress], [], []),
    'setWalletName' : IDL.Func([IDL.Text], [], []),
    'setPreferences' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'signOutAndReset' : IDL.Func([], [], []),
    'syncBalanceFromLedger' : IDL.Func([IDL.Int], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
