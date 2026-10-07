export const idlFactory = ({ IDL }) => {
  const BitcoinAddress = IDL.Text;
  const UserWallet = IDL.Record({
    'principal' : IDL.Principal,
    'bitcoinAddress' : BitcoinAddress,
    'onboardingComplete' : IDL.Bool,
    'walletName' : IDL.Text,
    'preferredCurrency' : IDL.Text,
    'preferredLanguage' : IDL.Text,
    'createdAt' : IDL.Int,
    'lastUpdated' : IDL.Int,
  });
  const Config = IDL.Record({
    'minterId' : IDL.Text,
    'maxWallets' : IDL.Nat,
    'walletCount' : IDL.Nat,
  });
  return IDL.Service({
    'completeOnboarding' : IDL.Func([], [], []),
    'ensureWalletExists' : IDL.Func([], [BitcoinAddress], []),
    'getAllWallets' : IDL.Func([], [IDL.Vec(UserWallet)], []),
    'getConfig' : IDL.Func([], [Config], []),
    'getPrincipalByBitcoinAddress' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(IDL.Principal)],
        ['query'],
      ),
    'getWalletInfo' : IDL.Func([], [IDL.Opt(UserWallet)], ['query']),
    'isOnboardingComplete' : IDL.Func([], [IDL.Bool], ['query']),
    'registerDepositAddress' : IDL.Func([], [BitcoinAddress], []),
    'resetOnboarding' : IDL.Func([], [], []),
    'resolveRecipient' : IDL.Func([IDL.Text], [IDL.Opt(IDL.Principal)], []),
    'setConfig' : IDL.Func([IDL.Opt(IDL.Text), IDL.Opt(IDL.Nat)], [], []),
    'setPreferences' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'setWalletName' : IDL.Func([IDL.Text], [], []),
    'signOutAndReset' : IDL.Func([], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
