import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";

/// Upgrade from the fake-wallet schema (balance + transactions stored in the canister,
/// client-supplied bitcoinAddress) to the metadata-only schema.
module {
  type OldTransaction = {
    amount : Int;
    fee : Int;
    fromAddress : Text;
    id : Text;
    status : { #confirmed; #failed; #pending };
    timestamp : Int;
    toAddress : Text;
  };

  type OldUserWallet = {
    balance : Int;
    bitcoinAddress : Text;
    createdAt : Int;
    lastUpdated : Int;
    onboardingComplete : Bool;
    preferredCurrency : Text;
    preferredLanguage : Text;
    principal : Principal;
    transactions : [OldTransaction];
    walletName : Text;
  };

  type NewUserWallet = {
    bitcoinAddress : Text;
    createdAt : Int;
    lastUpdated : Int;
    onboardingComplete : Bool;
    preferredCurrency : Text;
    preferredLanguage : Text;
    principal : Principal;
    walletName : Text;
  };

  public func run(
    old : { var userWallets : OrderedMap.Map<Principal, OldUserWallet> }
  ) : { var userWallets : OrderedMap.Map<Principal, NewUserWallet> } {
    let principalMap = OrderedMap.Make<Principal>(Principal.compare);
    {
      var userWallets = principalMap.map<OldUserWallet, NewUserWallet>(
        old.userWallets,
        func(_, w) {
          {
            // Every stored address was either the shared placeholder or client-supplied
            // (unverified). Clear them; users re-register via registerDepositAddress.
            bitcoinAddress = "";
            createdAt = w.createdAt;
            lastUpdated = w.lastUpdated;
            onboardingComplete = w.onboardingComplete;
            preferredCurrency = w.preferredCurrency;
            preferredLanguage = w.preferredLanguage;
            principal = w.principal;
            walletName = w.walletName;
          };
        },
      );
    };
  };
};
