import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";
import Array "mo:base/Array";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Char "mo:base/Char";

persistent actor BitcoinWallet {
  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);

  var userWallets : OrderedMap.Map<Principal, UserWallet> = principalMap.empty();

  type BitcoinAddress = Text;
  type TransactionId = Text;

  type Transaction = {
    id : TransactionId;
    amount : Int;
    timestamp : Int;
    status : TransactionStatus;
    fromAddress : BitcoinAddress;
    toAddress : BitcoinAddress;
    fee : Int;
  };

  type TransactionStatus = {
    #pending;
    #confirmed;
    #failed;
  };

  type UserWallet = {
    principal : Principal;
    bitcoinAddress : BitcoinAddress;
    transactions : [Transaction];
    balance : Int;
    onboardingComplete : Bool;
    createdAt : Int;
    lastUpdated : Int;
  };

  public shared ({ caller }) func ensureWalletExists() : async BitcoinAddress {
    switch (principalMap.get(userWallets, caller)) {
      case (?wallet) {
        wallet.bitcoinAddress;
      };
      case null {
        let newAddress = generateBitcoinAddress();
        let timestamp = Time.now();
        let newWallet : UserWallet = {
          principal = caller;
          bitcoinAddress = newAddress;
          transactions = [];
          balance = 0;
          onboardingComplete = false;
          createdAt = timestamp;
          lastUpdated = timestamp;
        };
        userWallets := principalMap.put(userWallets, caller, newWallet);
        newAddress;
      };
    };
  };

  public shared ({ caller }) func getBalance() : async Int {
    switch (principalMap.get(userWallets, caller)) {
      case (?wallet) {
        wallet.balance;
      };
      case null {
        Debug.trap("Wallet not found");
      };
    };
  };

  public shared ({ caller }) func getTransactionHistory() : async [Transaction] {
    switch (principalMap.get(userWallets, caller)) {
      case (?wallet) {
        wallet.transactions;
      };
      case null {
        Debug.trap("Wallet not found");
      };
    };
  };

  public shared ({ caller }) func sendTransaction(toAddress : BitcoinAddress, amount : Int) : async TransactionId {
    switch (principalMap.get(userWallets, caller)) {
      case (?wallet) {
        if (amount > wallet.balance) {
          Debug.trap("Insufficient balance");
        };

        let transactionId = generateTransactionId();
        let newTransaction : Transaction = {
          id = transactionId;
          amount;
          timestamp = Time.now();
          status = #pending;
          fromAddress = wallet.bitcoinAddress;
          toAddress;
          fee = 0;
        };

        let updatedTransactions = Array.append(wallet.transactions, [newTransaction]);
        let updatedWallet : UserWallet = {
          principal = wallet.principal;
          bitcoinAddress = wallet.bitcoinAddress;
          transactions = updatedTransactions;
          balance = wallet.balance - amount;
          onboardingComplete = wallet.onboardingComplete;
          createdAt = wallet.createdAt;
          lastUpdated = Time.now();
        };

        userWallets := principalMap.put(userWallets, caller, updatedWallet);
        transactionId;
      };
      case null {
        Debug.trap("Wallet not found");
      };
    };
  };

  public shared ({ caller }) func getBitcoinAddress() : async BitcoinAddress {
    switch (principalMap.get(userWallets, caller)) {
      case (?wallet) {
        wallet.bitcoinAddress;
      };
      case null {
        Debug.trap("Wallet not found");
      };
    };
  };

  public shared ({ caller }) func getWalletInfo() : async UserWallet {
    switch (principalMap.get(userWallets, caller)) {
      case (?wallet) {
        wallet;
      };
      case null {
        Debug.trap("Wallet not found");
      };
    };
  };

  public shared ({ caller }) func completeOnboarding() : async () {
    switch (principalMap.get(userWallets, caller)) {
      case (?wallet) {
        let updatedWallet : UserWallet = {
          principal = wallet.principal;
          bitcoinAddress = wallet.bitcoinAddress;
          transactions = wallet.transactions;
          balance = wallet.balance;
          onboardingComplete = true;
          createdAt = wallet.createdAt;
          lastUpdated = Time.now();
        };
        userWallets := principalMap.put(userWallets, caller, updatedWallet);
      };
      case null {
        Debug.trap("Wallet not found");
      };
    };
  };

  public shared ({ caller }) func isOnboardingComplete() : async Bool {
    switch (principalMap.get(userWallets, caller)) {
      case (?wallet) {
        wallet.onboardingComplete;
      };
      case null {
        false;
      };
    };
  };

  public shared ({ caller }) func resetOnboarding() : async () {
    switch (principalMap.get(userWallets, caller)) {
      case (?wallet) {
        let updatedWallet : UserWallet = {
          principal = wallet.principal;
          bitcoinAddress = wallet.bitcoinAddress;
          transactions = wallet.transactions;
          balance = wallet.balance;
          onboardingComplete = false;
          createdAt = wallet.createdAt;
          lastUpdated = Time.now();
        };
        userWallets := principalMap.put(userWallets, caller, updatedWallet);
      };
      case null {
        Debug.trap("Wallet not found");
      };
    };
  };

  public shared ({ caller }) func signOutAndReset() : async () {
    switch (principalMap.get(userWallets, caller)) {
      case (?_wallet) {
        userWallets := principalMap.delete(userWallets, caller);
      };
      case null {
        Debug.trap("Wallet not found");
      };
    };
  };

  public query func getAllWallets() : async [UserWallet] {
    Iter.toArray(principalMap.vals(userWallets));
  };

  func generateBitcoinAddress() : BitcoinAddress {
    let principalText = Principal.toText(Principal.fromActor(BitcoinWallet));
    let cleanedPrincipal = Text.map(principalText, func(c : Char) : Char { if (c == '-') { '_' } else { c } });
    "bc1q" # cleanedPrincipal;
  };

  func generateTransactionId() : TransactionId {
    let principalText = Principal.toText(Principal.fromActor(BitcoinWallet));
    let cleanedPrincipal = Text.map(principalText, func(c : Char) : Char { if (c == '-') { '_' } else { c } });
    "tx_" # cleanedPrincipal;
  };
};

