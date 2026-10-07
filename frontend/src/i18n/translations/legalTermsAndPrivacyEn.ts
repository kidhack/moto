/**
 * Terms of Service and Privacy Policy (English). Imported into all locale files
 * as stubs until translated.
 */
const legalTermsAndPrivacyEn: Record<string, string> = {
  'terms.header': 'Terms of Service',
  'terms.lastUpdated': 'Last updated: October 7, 2026',

  'terms.s01Title': '1. Acceptance',
  'terms.s01Body':
    'By using the MOTO Wallet application ("MOTO," "the App"), you agree to these Terms of Service. If you do not agree, do not use the App.',

  'terms.s02Title': '2. Non-Custodial Wallet',
  'terms.s02Body':
    'MOTO is a non-custodial Bitcoin and ckBTC wallet interface. MOTO does not take custody of your funds in the way a bank would: value and transfers are determined by the Internet Computer ckBTC ledger, Bitcoin network, and related protocol canisters. You are solely responsible for the security of your Internet Identity and for verifying recipient addresses and amounts before you confirm a send.',

  'terms.s03Title': '3. No Recovery of Lost Funds',
  'terms.s03Body':
    'MOTO cannot recover lost, stolen, or misdirected Bitcoin or ckBTC. This includes but is not limited to:\n\n• Sending BTC or ckBTC to an incorrect address\n• Sending ckBTC to an Internet Computer principal or account you or the recipient do not control (for example, an exchange that requires a specific deposit account)\n• Bitcoin deposits below the ckBTC minimum, or deposits rejected by the ckBTC Bitcoin check, which are not converted to ckBTC\n• Loss of access to your Internet Identity (for example, a lost passkey with no recovery method set up)\n• Accidental or unauthorized transactions\n• Errors resulting from user input\n\nAll transactions on Bitcoin and ICP are irreversible. Double-check all recipient addresses before sending.',

  'terms.s04Title': '4. Fees',
  'terms.s04Body':
    'MOTO charges an app fee on outgoing sends. By default the fee is 0.5% of the amount you send, capped at the Bitcoin equivalent of USD $100 at send time.\n\nInstant transfers to another MOTO user move ckBTC on ICP: you pay the app fee plus ckBTC ledger costs (a small fixed fee per transfer), all shown on the confirm screen.\n\nWithdrawals to a native Bitcoin address include the same app fee plus ckBTC ledger costs. In addition, the ckBTC minter deducts its own fee and the Bitcoin miner fee from the amount withdrawn, so the recipient receives less than the amount sent; the confirm screen shows an estimate of what the recipient receives. Miner fees are set by the Bitcoin network and may differ from the estimate.\n\nThe app fee is collected as a separate transfer after your send succeeds. If your send fails, no app fee is charged.',

  'terms.s05Title': '5. On-Chain Hosting and Availability',
  'terms.s05Body':
    'MOTO is hosted on the Internet Computer blockchain. While ICP\'s decentralized architecture aims for high availability, MOTO makes no guarantee of uninterrupted service. Network outages, ICP protocol issues, or canister upgrades may temporarily affect access.',

  'terms.s06Title': '6. No Financial Advice',
  'terms.s06Body':
    'Nothing in MOTO constitutes financial, investment, or legal advice. Bitcoin and ckBTC are volatile assets. MOTO makes no representations about their value. Use at your own risk.',

  'terms.s07Title': '7. Third-Party Services',
  'terms.s07Body':
    'MOTO uses third-party APIs for fiat price data (CoinGecko, Mempool.space, CoinDesk, Binance) and Bitcoin transaction lookups (Blockstream, Mempool.space). MOTO is not responsible for the accuracy or availability of these services.',

  'terms.s08Title': '8. Canister Upgrades',
  'terms.s08Body':
    'MOTO\'s smart contract canisters may be upgraded by the MOTO team to fix bugs or add features. Upgrades change application logic and how the app behaves. Your ckBTC and Bitcoin value live on public Internet Computer and Bitcoin-network ledgers. Settings you save in the MOTO canister remain associated with your Internet Identity principal and are isolated from other users as described in the FAQ.',

  'terms.s09Title': '9. Prohibited Use',
  'terms.s09Body':
    'You agree not to use MOTO for any unlawful purpose, including money laundering, financing illegal activity, or violating applicable regulations in your jurisdiction.',

  'terms.s10Title': '10. Disclaimer of Warranties',
  'terms.s10Body':
    'MOTO is provided "as is" without warranties of any kind. To the maximum extent permitted by law, MOTO disclaims all implied warranties including merchantability, fitness for a particular purpose, and non-infringement.',

  'terms.s11Title': '11. Limitation of Liability',
  'terms.s11Body':
    'To the fullest extent permitted by law, MOTO and its developers shall not be liable for any indirect, incidental, special, or consequential damages, including loss of funds, arising from your use of the App.',

  'terms.s12Title': '12. Changes to Terms',
  'terms.s12Body':
    'MOTO may update these Terms at any time. Continued use of the App following any update constitutes acceptance of the revised Terms.',

  'privacy.header': 'Privacy Policy',
  'privacy.lastUpdated': 'Last updated: October 7, 2026',

  'privacy.s01Title': '1. Overview',
  'privacy.s01Body':
    'MOTO Wallet is designed with privacy as a core architectural principle. Because MOTO runs on the Internet Computer (ICP), many traditional privacy concerns—centralized app databases, server-side logging of accounts by MOTO, third-party ad trackers in the app—do not apply in the same way as typical hosted web apps.',

  'privacy.s02Title': '2. Data We Do Not Collect',
  'privacy.s02Body':
    'MOTO does not collect, store, or process in a company database:\n\n• Your name, email address, phone number, or government ID\n• Payment card information\n• In-app advertising, analytics, or behavioral tracking SDKs tied to marketing profiles\n\nMOTO has no traditional centralized application server operated by the project for wallet login.',

  'privacy.s03Title': '3. Data Stored On-Chain (App Canister)',
  'privacy.s03Body':
    'When you use MOTO, your wallet display name and preferred currency and language are stored in the MOTO application canister on ICP. Your record is keyed to your Internet Identity principal and is updated only when you authenticate as that principal. Other users have separate records in the same canister (multi-tenant storage)—not a separate private canister per person. Canister controllers can upgrade application logic; see the FAQ for upgrade authority.\n\nThe canister also stores your ckBTC deposit address (obtained from the ckBTC minter, not entered by you). So that other MOTO users can send to you instantly, anyone can ask the MOTO canister whether a Bitcoin address belongs to a MOTO user and, if it does, which Internet Identity principal it belongs to. This means your deposit address can be linked to your principal. Erasing your data from the menu removes this link.',

  'privacy.s04Title': '4. Financial Data',
  'privacy.s04Body':
    'Your Bitcoin and ckBTC balances and transaction history are recorded on public on-chain ledgers (the Bitcoin blockchain and the ICP ckBTC ledger). These are public blockchains—activity can be visible to anyone who knows your wallet address or relevant identifiers. MOTO does not control those ledgers.',

  'privacy.s05Title': '5. Internet Identity',
  'privacy.s05Body':
    'MOTO uses ICP\'s Internet Identity for authentication. Internet Identity is designed so you do not create a classic username/password for MOTO and you are not required to provide personal information to MOTO through II. See https://id.ai for official documentation and to manage your recovery methods.',

  'privacy.s06Title': '6. Third-Party APIs',
  'privacy.s06Body':
    'MOTO fetches read-only data from:\n\n• CoinGecko — BTC fiat prices and historical prices (public API)\n• Mempool.space — BTC fiat prices and Bitcoin transaction data (public API)\n• CoinDesk and Binance — backup BTC price sources (public APIs)\n• Blockstream — Bitcoin transaction lookup (public blockchain queries)\n\nThese requests come directly from your device. They do not attach your name, email, or phone, but like any web request they reveal your IP address to that service. Transaction and deposit lookups include your own Bitcoin address or transaction IDs, so those services could associate them with your IP address. Fonts and all app code are served by MOTO itself, not third-party CDNs.',

  'privacy.s07Title': '7. No Advertising or Tracking',
  'privacy.s07Body':
    'MOTO does not display ads, use advertising networks, or share data with advertisers for marketing profiles as part of the wallet experience described here.',

  'privacy.s08Title': '8. On-Chain Hosting and Privacy Benefits',
  'privacy.s08Body':
    'Because MOTO\'s frontend and backend logic are deployed as ICP canisters:\n\n• There is no traditional MOTO-operated centralized database for wallet settings of the kind common in classic SaaS\n• App distribution and execution occur in the ICP protocol model rather than on a single rented server\n\nThis architecture provides structural privacy protections that differ from typical centralized wallet backends.',

  'privacy.s09Title': '9. Canister Upgrade Authority',
  'privacy.s09Body':
    'MOTO\'s canisters are currently controlled by the MOTO development team and can be upgraded. Upgrades can change how the app works. Settings you store in the canister are per your principal within the app, as described in section 3.',

  'privacy.s10Title': '10. Local Device Cache',
  'privacy.s10Body':
    'The app stores a few things in your browser\'s local storage, on your device only:\n\n• Your Internet Identity session, so you stay signed in (managed by the Internet Identity client library)\n• Recent BTC fiat prices, so the app works when price APIs are slow\n• Display preferences and small UI state (for example, whether you dismissed the login backup reminder, and which deposit notices you have already seen)\n\nNone of this contains your name or email. Signing out ends the session; clearing site data in your browser removes the rest.',

  'privacy.s11Title': '11. Changes and Contact',
  'privacy.s11Body':
    'MOTO may update this Privacy Policy; the "Last updated" line will change when it does. Continued use of the App constitutes acceptance of the updated policy.\n\nFor questions about privacy: hello@motowallet.com',
};

export default legalTermsAndPrivacyEn;
