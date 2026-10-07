import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Char "mo:base/Char";
import Migration "Migration";

// One-time migration (drops the old fake balance/transactions, clears unverified addresses).
// Remove the `with migration` clause in the release after this one has been deployed:
// it only accepts the pre-migration state shape, so a later upgrade with it attached is rejected.
(with migration = Migration.run)
persistent actor BitcoinWallet {
  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  transient let textMap = OrderedMap.Make<Text>(Text.compare);

  type BitcoinAddress = Text;

  type UserWallet = {
    principal : Principal;
    /// ckBTC deposit address derived by the minter for this principal; "" until registerDepositAddress.
    bitcoinAddress : BitcoinAddress;
    onboardingComplete : Bool;
    walletName : Text;
    preferredCurrency : Text;
    preferredLanguage : Text;
    createdAt : Int;
    lastUpdated : Int;
  };

  type Config = {
    minterId : Text;
    maxWallets : Nat;
    walletCount : Nat;
  };

  type Minter = actor {
    get_btc_address : shared { owner : ?Principal; subaccount : ?Blob } -> async Text;
  };

  transient let MAX_WALLET_NAME_CHARS = 32;
  transient let MAX_PREFERENCE_CHARS = 8;
  transient let MAX_INGRESS_ARG_BYTES = 1024;

  var userWallets : OrderedMap.Map<Principal, UserWallet> = principalMap.empty();
  /// Reverse index: deposit address -> owner. Only written by registerDepositAddress,
  /// so an address can only ever map to the principal the minter derived it for.
  var addressIndex : OrderedMap.Map<Text, Principal> = textMap.empty();
  /// ckBTC minter used to derive deposit addresses. Testnet (ckTESTBTC) by default;
  /// switch to mainnet (mqygn-kiaaa-aaaar-qaadq-cai) with setConfig at cutover.
  var minterId : Text = "ml52i-qqaaa-aaaar-qaaba-cai";
  /// Upper bound on wallets so free-to-create principals can't grow memory without limit.
  var maxWallets : Nat = 100_000;

  // Reject anonymous and oversized ingress before execution so junk calls cost almost nothing.
  // (Not run for queries or inter-canister calls; methods still check the caller themselves.)
  system func inspect({ caller : Principal; arg : Blob }) : Bool {
    not Principal.isAnonymous(caller) and arg.size() <= MAX_INGRESS_ARG_BYTES;
  };

  func requireUser(caller : Principal) {
    if (Principal.isAnonymous(caller)) {
      Debug.trap("Anonymous principal not allowed");
    };
  };

  func requireController(caller : Principal) {
    if (not Principal.isController(caller)) {
      Debug.trap("Unauthorized: controller only");
    };
  };

  func getWallet(caller : Principal) : UserWallet {
    switch (principalMap.get(userWallets, caller)) {
      case (?wallet) { wallet };
      case null { Debug.trap("Wallet not found") };
    };
  };

  func putWallet(wallet : UserWallet) {
    userWallets := principalMap.put(userWallets, wallet.principal, { wallet with lastUpdated = Time.now() });
  };

  /// Normalize bech32 (bc1/tb1) to lowercase so lookup matches regardless of input case.
  func normalizeBech32Address(address : Text) : Text {
    if (Text.size(address) < 4) return address;
    if (Text.startsWith(address, #text "bc1") or Text.startsWith(address, #text "BC1") or
       Text.startsWith(address, #text "tb1") or Text.startsWith(address, #text "TB1")) {
      Text.toLowercase(address)
    } else { address }
  };

  func truncate(text : Text, maxChars : Nat) : Text {
    if (Text.size(text) <= maxChars) return text;
    var acc = "";
    var i = 0;
    for (c in text.chars()) {
      if (i < maxChars) { acc := acc # Char.toText(c) };
      i += 1;
    };
    acc;
  };

  func lookupAddress(address : Text) : ?Principal {
    textMap.get(addressIndex, normalizeBech32Address(address));
  };

  /// Returns the registered deposit address ("" until registerDepositAddress has run).
  public shared ({ caller }) func ensureWalletExists() : async BitcoinAddress {
    requireUser(caller);
    switch (principalMap.get(userWallets, caller)) {
      case (?wallet) { wallet.bitcoinAddress };
      case null {
        if (principalMap.size(userWallets) >= maxWallets) {
          Debug.trap("Wallet limit reached");
        };
        let now = Time.now();
        userWallets := principalMap.put(userWallets, caller, {
          principal = caller;
          bitcoinAddress = "";
          onboardingComplete = false;
          walletName = "";
          preferredCurrency = "";
          preferredLanguage = "";
          createdAt = now;
          lastUpdated = now;
        });
        "";
      };
    };
  };

  /// Asks the ckBTC minter for the caller's deposit address and indexes it, so other MOTO users
  /// sending to that address get an instant ckBTC transfer. The address is never taken from the client.
  public shared ({ caller }) func registerDepositAddress() : async BitcoinAddress {
    requireUser(caller);
    let existing = getWallet(caller);
    if (existing.bitcoinAddress != "") return existing.bitcoinAddress;

    let minter : Minter = actor (minterId);
    let address = normalizeBech32Address(await minter.get_btc_address({ owner = ?caller; subaccount = null }));

    // Re-read after the await: the wallet may have been wiped or updated meanwhile.
    let wallet = getWallet(caller);
    if (wallet.bitcoinAddress != "" and wallet.bitcoinAddress != address) {
      addressIndex := textMap.delete(addressIndex, wallet.bitcoinAddress);
    };
    putWallet({ wallet with bitcoinAddress = address });
    addressIndex := textMap.put(addressIndex, address, caller);
    address;
  };

  /// Fast lookup for the send screen's "Instant / Bitcoin" hint while typing.
  /// Don't route funds on this alone — a query is answered by a single replica.
  public query func getPrincipalByBitcoinAddress(address : Text) : async ?Principal {
    lookupAddress(address);
  };

  /// Same lookup as an update call (agreed on by the subnet). The send flow uses this
  /// result on confirm to decide where funds go.
  public shared ({ caller }) func resolveRecipient(address : Text) : async ?Principal {
    requireUser(caller);
    lookupAddress(address);
  };

  public shared ({ caller }) func setWalletName(name : Text) : async () {
    requireUser(caller);
    let wallet = getWallet(caller);
    let trimmed = Text.trimStart(Text.trimEnd(name, #text " "), #text " ");
    putWallet({ wallet with walletName = truncate(trimmed, MAX_WALLET_NAME_CHARS) });
  };

  public shared ({ caller }) func setPreferences(currency : Text, language : Text) : async () {
    requireUser(caller);
    if (Text.size(currency) > MAX_PREFERENCE_CHARS or Text.size(language) > MAX_PREFERENCE_CHARS) {
      Debug.trap("Invalid preference");
    };
    let wallet = getWallet(caller);
    putWallet({ wallet with preferredCurrency = currency; preferredLanguage = language });
  };

  public shared query ({ caller }) func getWalletInfo() : async ?UserWallet {
    principalMap.get(userWallets, caller);
  };

  public shared ({ caller }) func completeOnboarding() : async () {
    requireUser(caller);
    let wallet = getWallet(caller);
    putWallet({ wallet with onboardingComplete = true });
  };

  public shared query ({ caller }) func isOnboardingComplete() : async Bool {
    switch (principalMap.get(userWallets, caller)) {
      case (?wallet) { wallet.onboardingComplete };
      case null { false };
    };
  };

  public shared ({ caller }) func resetOnboarding() : async () {
    requireUser(caller);
    let wallet = getWallet(caller);
    putWallet({ wallet with onboardingComplete = false });
  };

  /// Deletes the caller's name/preferences and address registration. Funds are untouched:
  /// ckBTC belongs to the principal on the ledger, not to this canister.
  public shared ({ caller }) func signOutAndReset() : async () {
    requireUser(caller);
    let wallet = getWallet(caller);
    if (wallet.bitcoinAddress != "") {
      addressIndex := textMap.delete(addressIndex, wallet.bitcoinAddress);
    };
    userWallets := principalMap.delete(userWallets, caller);
  };

  public shared ({ caller }) func getAllWallets() : async [UserWallet] {
    requireController(caller);
    Iter.toArray(principalMap.vals(userWallets));
  };

  public shared ({ caller }) func getConfig() : async Config {
    requireController(caller);
    { minterId; maxWallets; walletCount = principalMap.size(userWallets) };
  };

  /// Controller-only. Changing the minter (e.g. testnet -> mainnet cutover) clears every stored
  /// deposit address, since they belong to the old minter; users re-register on next login.
  public shared ({ caller }) func setConfig(newMinterId : ?Text, newMaxWallets : ?Nat) : async () {
    requireController(caller);
    switch (newMaxWallets) {
      case (?n) { maxWallets := n };
      case null {};
    };
    switch (newMinterId) {
      case (?id) {
        ignore Principal.fromText(id); // trap on malformed IDs
        if (id != minterId) {
          minterId := id;
          addressIndex := textMap.empty();
          userWallets := principalMap.map<UserWallet, UserWallet>(
            userWallets,
            func(_, wallet) { { wallet with bitcoinAddress = "" } },
          );
        };
      };
      case null {};
    };
  };
};
