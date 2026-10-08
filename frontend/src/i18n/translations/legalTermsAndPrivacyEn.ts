/**
 * Terms of Service and Privacy Policy (English). Imported into all locale files; the English
 * version governs (Terms section 1).
 *
 * Drafted to be close to final ahead of legal review. Left for counsel: the operator's legal
 * name (an entity, if one is formed) and a governing-law / dispute-resolution section.
 */

/** Bump when the Terms or Privacy Policy change materially; signed-in users are shown a notice once. */
export const LEGAL_VERSION = '2026-10-08';

type Section = [title: string, body: string];

const TERMS: Section[] = [
  [
    'Acceptance and Who We Are',
    'By signing in to or using the MOTO Wallet application ("MOTO," "the App"), you agree to these Terms of Service and the Privacy Policy. If you do not agree, do not use the App.\n\nMOTO is operated by its developer ("we," "us"). Contact: hello@motowallet.app.\n\nThe App is available in several languages. These Terms are written in English, and the English version governs if a translation differs.',
  ],
  [
    'Eligibility',
    'You may use MOTO only if you are at least 18 years old and able to form a binding contract, and only if using it is legal where you live. You may not use MOTO if you are the subject of sanctions or located in a country or region subject to comprehensive sanctions (see section 12).',
  ],
  [
    'Non-Custodial Wallet',
    'MOTO never holds your keys or your funds. Your Bitcoin and ckBTC are recorded on public ledgers under your Internet Identity, and every transfer is signed by your own session.\n\nYou do rely on the MOTO app, including its updates, to view and move those funds. You are solely responsible for securing your Internet Identity and for checking recipient addresses and amounts before you confirm a send.',
  ],
  [
    'ckBTC and Protocol Risks',
    'ckBTC is a token on the Internet Computer, backed one-to-one by Bitcoin held by Internet Computer protocol canisters. It is not Bitcoin itself. The ckBTC ledger, the ckBTC minter, and the Bitcoin checks the minter runs are operated by the Internet Computer protocol and its governance, not by MOTO.\n\nThose systems can delay, reject, or reimburse deposits and withdrawals; can change their fees, minimums, and rules; and can be affected by bugs, outages, or governance decisions. MOTO cannot reverse or override them.',
  ],
  [
    'No Recovery of Lost Funds',
    'We cannot recover lost, stolen, or misdirected Bitcoin or ckBTC. This includes but is not limited to:\n\n• Sending BTC or ckBTC to an incorrect address\n• Sending ckBTC to an Internet Computer principal or account you or the recipient do not control (for example, an exchange that requires a specific deposit account)\n• Bitcoin deposits below the ckBTC minimum, or deposits rejected by the ckBTC Bitcoin check, which are not converted to ckBTC\n• Loss of access to your Internet Identity (for example, a lost passkey with no recovery method set up)\n• Funds sent through a fake or copied version of MOTO; the official app is only at motowallet.app\n• Accidental or unauthorized transactions\n• Errors resulting from user input\n\nAll transactions on Bitcoin and the Internet Computer are irreversible. Double-check all recipient addresses before sending.',
  ],
  [
    'Fees',
    'MOTO charges an app fee on outgoing sends. The fee is currently 0.5% of the amount you send, capped at the Bitcoin equivalent of US$100 at send time. We may change the fee; the fee that applies to a send is always the one shown on the confirm screen before you send.\n\nInstant transfers to another MOTO user move ckBTC on the Internet Computer: you pay the app fee plus ckBTC ledger costs (a small fixed fee per transfer), all shown on the confirm screen.\n\nWithdrawals to a native Bitcoin address include the same app fee plus ckBTC ledger costs. In addition, the ckBTC minter deducts its own fee and the Bitcoin miner fee from the amount withdrawn, so the recipient receives less than the amount sent; the confirm screen shows an estimate of what the recipient receives. Miner fees are set by the Bitcoin network and may differ from the estimate.\n\nThe app fee is collected as a separate transfer after your send succeeds. If your send fails, no app fee is charged.',
  ],
  [
    'Availability and Discontinuation',
    'MOTO is hosted on the Internet Computer. We do not guarantee uninterrupted service: network outages, protocol issues, or upgrades may temporarily affect access.\n\nYour funds are tied to the Internet Identity you use with motowallet.app. If we decide to discontinue the App, we will announce it in the App at least 90 days in advance so you can move your funds to another wallet.',
  ],
  [
    'No Financial Advice',
    'Nothing in MOTO is financial, investment, tax, or legal advice. Bitcoin and ckBTC are volatile assets, and we make no representations about their value. Use MOTO at your own risk.',
  ],
  [
    'Taxes',
    'You are responsible for determining and paying any taxes that apply to your use of MOTO and your transactions.',
  ],
  [
    'Third-Party Services',
    'MOTO uses third-party services for fiat price data (CoinGecko, Mempool.space, CoinDesk, Binance), Bitcoin transaction lookups (Blockstream, Mempool.space), and sign-in (Internet Identity). We are not responsible for the accuracy or availability of these services.',
  ],
  [
    'Canister Upgrades',
    'We may upgrade MOTO\'s canisters to fix bugs or add features, which can change how the App behaves. We will announce material changes to how sends, fees, or your data work in the App. Your ckBTC and Bitcoin stay on public ledgers throughout, and settings you save remain associated with your Internet Identity principal.',
  ],
  [
    'Prohibited Use and Sanctions',
    'You agree not to use MOTO for any unlawful purpose, including money laundering, terrorist financing, fraud, evading sanctions, or violating applicable law in your jurisdiction. You confirm that you are not the subject of sanctions administered by the United States, the United Nations, the European Union, or the United Kingdom, and that you are not acting on behalf of anyone who is.\n\nWe may restrict access to the App from certain locations or by certain users to comply with the law.',
  ],
  [
    'Open Source and Trademarks',
    'MOTO\'s source code is published under the MIT License. The MIT License covers the code only: the MOTO name and logo are not licensed, and a modified or copied version of the App may not present itself as MOTO.',
  ],
  [
    'Disclaimer of Warranties',
    'MOTO is provided "as is" and "as available," without warranties of any kind. To the maximum extent permitted by law, we disclaim all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement.',
  ],
  [
    'Limitation of Liability',
    'To the fullest extent permitted by law, we will not be liable for any indirect, incidental, special, or consequential damages, including loss of funds or profits, arising from your use of the App.\n\nTo the fullest extent permitted by law, our total liability for any claim relating to the App is limited to the greater of US$100 or the app fees you paid in the 12 months before the claim. Some jurisdictions do not allow these limits, so they may not apply to you.',
  ],
  [
    'Indemnification',
    'To the extent permitted by law, you agree to indemnify and hold us harmless from claims, losses, and expenses (including reasonable legal fees) arising from your misuse of the App or your violation of these Terms or the law.',
  ],
  [
    'Changes to These Terms',
    'We may update these Terms. When we make material changes, we will show a notice in the App and update the "Last updated" date. If you keep using the App after that notice, you accept the updated Terms; if you do not agree, stop using the App.',
  ],
];

const PRIVACY: Section[] = [
  [
    'Overview and Who Is Responsible',
    'This policy explains what data MOTO Wallet ("MOTO," "the App") handles and why. MOTO is operated by its developer ("we," "us"), who is responsible for the processing described here. Contact: hello@motowallet.app.\n\nBecause MOTO runs on the Internet Computer (ICP), many traditional privacy concerns, such as centralized app databases, server-side account logging, and ad trackers, do not apply in the way they do for typical hosted web apps.',
  ],
  [
    'Data We Do Not Collect',
    'MOTO does not collect, store, or process in a company database:\n\n• Your name, email address, phone number, or government ID\n• Payment card information\n• Advertising, analytics, or behavioral tracking data\n\nMOTO has no traditional centralized server for wallet login.',
  ],
  [
    'Data Stored On-Chain (App Canister)',
    'When you use MOTO, your wallet display name and preferred currency and language are stored in the MOTO application canister on ICP. Your record is keyed to your Internet Identity principal and can only be changed when you are signed in as that principal. Other users have separate records in the same canister.\n\nThe canister also stores your ckBTC deposit address (obtained from the ckBTC minter, not entered by you). So that other MOTO users can send to you instantly, anyone can ask the MOTO canister whether a Bitcoin address belongs to a MOTO user and, if it does, which Internet Identity principal it belongs to. This means your deposit address can be linked to your principal. Erasing your data from the menu removes this link.',
  ],
  [
    'Financial Data',
    'Your Bitcoin and ckBTC balances and transaction history are recorded on public ledgers (the Bitcoin blockchain and the ICP ckBTC ledger). Anyone who knows your address or principal can see that activity. MOTO does not control those ledgers.',
  ],
  [
    'Internet Identity',
    'MOTO uses Internet Identity for sign-in, so you do not create a username or password for MOTO and do not give MOTO personal information to sign in. See https://id.ai for official documentation and to manage your recovery methods.',
  ],
  [
    'Third-Party Services and Infrastructure',
    'MOTO fetches read-only data from:\n\n• CoinGecko — BTC fiat prices and historical prices\n• Mempool.space — BTC fiat prices and Bitcoin transaction data\n• CoinDesk and Binance — backup BTC price sources\n• Blockstream — Bitcoin transaction lookups\n• ipwho.is and GeoJS — your country and region, looked up from your IP address so MOTO can block use from sanctioned regions\n\nThese requests come directly from your device. They do not include your name, email, or phone, but like any web request they reveal your IP address to that service. Transaction and deposit lookups include your own Bitcoin address or transaction IDs, so those services could associate them with your IP address.\n\nRequests to MOTO and the ckBTC canisters pass through Internet Computer API gateways and boundary nodes, operated by the DFINITY Foundation and independent node providers, which also see your IP address and requests.\n\nThese services may operate in countries other than yours, including the United States. Fonts and all app code are served by MOTO itself, not third-party CDNs.',
  ],
  [
    'Why We Use Data',
    'We use the data described above only to run the wallet: to show your balance and history, to send and receive funds, to remember your settings, and to let other MOTO users send to you instantly. Where privacy laws such as the GDPR apply, we rely on performing our agreement with you (running the wallet you asked for) and on our legitimate interest in providing instant MOTO-to-MOTO transfers and reliable price data. We do not sell or share your data for advertising.',
  ],
  [
    'How Long Data Is Kept',
    'Your wallet name, preferences, and deposit-address link stay in the MOTO canister until you erase them from the menu. Transactions on the Bitcoin blockchain and the ckBTC ledger are permanent and public; neither MOTO nor anyone else can delete them.',
  ],
  [
    'Your Rights',
    'Depending on where you live, you may have rights to access, correct, or delete your personal data, and to object to or restrict how it is used. You can see your stored settings in the App and delete them at any time with "Erase Data & Sign Out" in the menu. For anything else, email hello@motowallet.app. You may also have the right to complain to your local data protection authority.',
  ],
  [
    'Children',
    'MOTO is not intended for anyone under 18, and we do not knowingly handle data from children.',
  ],
  [
    'No Advertising or Tracking',
    'MOTO does not display ads, use advertising networks, or share data with advertisers.',
  ],
  [
    'Canister Upgrade Authority',
    'MOTO\'s canisters are currently controlled by the developer and can be upgraded. Upgrades can change how the App works; we will announce material changes to how your data is handled in the App.',
  ],
  [
    'Local Device Storage',
    'The app stores a few things in your browser\'s local storage, on your device only:\n\n• Your Internet Identity session, so you stay signed in (managed by the Internet Identity client library)\n• Recent BTC fiat prices, so the app works when price APIs are slow\n• Display preferences and small UI state (for example, whether you dismissed the login backup reminder, which deposit notices you have already seen, and which version of these terms you have seen)\n\nNone of this contains your name or email, and none of it is used for tracking. Signing out ends the session; clearing site data in your browser removes the rest.',
  ],
  [
    'Changes and Contact',
    'We may update this Privacy Policy. When we make material changes, we will show a notice in the App and update the "Last updated" date.\n\nQuestions about privacy: hello@motowallet.app',
  ],
];

export const TERMS_SECTION_COUNT = TERMS.length;
export const PRIVACY_SECTION_COUNT = PRIVACY.length;

const pad2 = (n: number) => String(n).padStart(2, '0');

function keyed(prefix: string, sections: Section[]): Record<string, string> {
  const out: Record<string, string> = {};
  sections.forEach(([title, body], i) => {
    out[`${prefix}.s${pad2(i + 1)}Title`] = `${i + 1}. ${title}`;
    out[`${prefix}.s${pad2(i + 1)}Body`] = body;
  });
  return out;
}

const legalTermsAndPrivacyEn: Record<string, string> = {
  'terms.header': 'Terms of Service',
  'terms.lastUpdated': 'Last updated: October 8, 2026',
  ...keyed('terms', TERMS),
  'privacy.header': 'Privacy Policy',
  'privacy.lastUpdated': 'Last updated: October 8, 2026',
  ...keyed('privacy', PRIVACY),
};

export default legalTermsAndPrivacyEn;
