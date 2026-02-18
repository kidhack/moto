module Migration {

  type OldUserWallet = {
    balance : Int;
    bitcoinAddress : Text;
    createdAt : Int;
    lastUpdated : Int;
    onboardingComplete : Bool;
    principal : Principal;
    transactions : [{
      amount : Int;
      fee : Int;
      fromAddress : Text;
      id : Text;
      status : { #confirmed; #failed; #pending };
      timestamp : Int;
      toAddress : Text;
    }];
  };

  type NewUserWallet = {
    balance : Int;
    bitcoinAddress : Text;
    createdAt : Int;
    lastUpdated : Int;
    onboardingComplete : Bool;
    preferredCurrency : Text;
    preferredLanguage : Text;
    principal : Principal;
    transactions : [{
      amount : Int;
      fee : Int;
      fromAddress : Text;
      id : Text;
      status : { #confirmed; #failed; #pending };
      timestamp : Int;
      toAddress : Text;
    }];
    walletName : Text;
  };

  type Tree<K, V> = {
    #black : (Tree<K, V>, K, V, Tree<K, V>);
    #leaf;
    #red : (Tree<K, V>, K, V, Tree<K, V>);
  };

  func migrateTree(t : Tree<Principal, OldUserWallet>) : Tree<Principal, NewUserWallet> {
    switch t {
      case (#leaf) { #leaf };
      case (#black(l, k, v, r)) {
        #black(migrateTree(l), k, migrateWallet(v), migrateTree(r));
      };
      case (#red(l, k, v, r)) {
        #red(migrateTree(l), k, migrateWallet(v), migrateTree(r));
      };
    };
  };

  func migrateWallet(old : OldUserWallet) : NewUserWallet {
    {
      balance = old.balance;
      bitcoinAddress = old.bitcoinAddress;
      createdAt = old.createdAt;
      lastUpdated = old.lastUpdated;
      onboardingComplete = old.onboardingComplete;
      preferredCurrency = "";
      preferredLanguage = "";
      principal = old.principal;
      transactions = old.transactions;
      walletName = "";
    };
  };

  public func migration(
    old : {
      var userWallets : { root : Tree<Principal, OldUserWallet>; size : Nat };
    }
  ) : {
    var userWallets : { root : Tree<Principal, NewUserWallet>; size : Nat };
  } {
    {
      var userWallets = {
        root = migrateTree(old.userWallets.root);
        size = old.userWallets.size;
      };
    };
  };

};
