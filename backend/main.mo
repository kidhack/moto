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

  // Sync the canister's stored balance with the ckBTC ledger balance so sendTransaction can succeed.
  // The UI displays ledger balance but sendTransaction checks this canister's balance; call this when ledger balance is known.
  public shared ({ caller }) func syncBalanceFromLedger(newBalance : Int) : async () {
    switch (principalMap.get(userWallets, caller)) {
      case (?wallet) {
        if (newBalance < 0) { return };
        let updatedWallet : UserWallet = {
          principal = wallet.principal;
          bitcoinAddress = wallet.bitcoinAddress;
          transactions = wallet.transactions;
          balance = newBalance;
          onboardingComplete = wallet.onboardingComplete;
          createdAt = wallet.createdAt;
          lastUpdated = Time.now();
        };
        userWallets := principalMap.put(userWallets, caller, updatedWallet);
      };
      case null {};
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

  /// Normalize bech32 (bc1/tb1) to lowercase so lookup matches regardless of input case.
  func normalizeBech32Address(address : Text) : Text {
    if (Text.size(address) < 4) return address;
    if (Text.startsWith(address, #text "bc1") or Text.startsWith(address, #text "BC1") or
       Text.startsWith(address, #text "tb1") or Text.startsWith(address, #text "TB1")) {
      Text.toLowercase(address)
    } else { address }
  };

  /// Updates the caller's stored Bitcoin address (e.g. to the ckBTC minter deposit address from get_btc_address).
  /// Frontend should call this so getPrincipalByBitcoinAddress can resolve scanned addresses to principals.
  public shared ({ caller }) func setBitcoinAddress(address : BitcoinAddress) : async () {
    switch (principalMap.get(userWallets, caller)) {
      case (?wallet) {
        let storedAddress = normalizeBech32Address(address);
        let updatedWallet : UserWallet = {
          principal = wallet.principal;
          bitcoinAddress = storedAddress;
          transactions = wallet.transactions;
          balance = wallet.balance;
          onboardingComplete = wallet.onboardingComplete;
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

  /// Returns the principal whose stored bitcoinAddress equals the given address, or null if none.
  /// Used by the send flow to decide instant ckBTC transfer vs Bitcoin withdrawal.
  /// Bech32 (bc1/tb1) is normalized to lowercase so pasted addresses match.
  public query func getPrincipalByBitcoinAddress(address : Text) : async ?Principal {
    let normalized = normalizeBech32Address(address);
    for ((principal, wallet) in principalMap.entries(userWallets)) {
      if (wallet.bitcoinAddress == normalized) {
        return ?principal;
      };
    };
    null;
  };

  public shared ({ caller }) func getWalletInfo() : async ?UserWallet {
    // Return optional wallet instead of trapping - allows frontend to handle missing wallet gracefully
    principalMap.get(userWallets, caller);
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

