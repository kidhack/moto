# MOTO Wallet — Desktop Layout Plan

## Goal

Add a responsive desktop layout for screens ≥ 1024px (`lg` breakpoint). The mobile layout (`< lg`) stays **100% untouched**. On desktop, the app renders as a compact, centered 3-column panel rather than a phone shell.

**Design principle:** Same black/white/mono aesthetic. Nothing feels wide or padded. Compact like the phone, just wider.

---

## Layout Overview

```
┌──────────────────────────────────────────────────┐
│                  (black full page)               │
│                                                  │
│   ┌──────────┬──────────────────┬─────────────┐  │
│   │  LEFT    │     CENTER       │    RIGHT    │  │
│   │  ~200px  │    ~380px        │   ~280px    │  │
│   │          │                  │             │  │
│   │  Logo    │  ₿ balance       │  [Send]     │  │
│   │  ──────  │  ─────────────── │  [Receive]  │  │
│   │  Wallet  │  tx row          │             │  │
│   │  name    │  tx row          │  — or —     │  │
│   │          │  tx row          │             │  │
│   │  Currency│  tx row          │  Send form  │  │
│   │  Language│  tx row          │  — or —     │  │
│   │          │  tx row          │  Receive QR │  │
│   │  FAQ     │  ...             │             │  │
│   │  ToS     │                  │             │  │
│   │  Privacy │                  │             │  │
│   │          │                  │             │  │
│   │  ──────  │                  │             │  │
│   │  Sign out│                  │             │  │
│   └──────────┴──────────────────┴─────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

Total panel width: ~900px, centered on page. Columns are separated by the existing `bg-white/50` 1px divider style.

---

## Strategy: Parallel Render Paths, Not a Rewrite

`WalletDashboard.tsx` currently returns a single mobile JSX tree. The cleanest approach:

1. Add a `useIsDesktop` hook that returns `true` when `window.innerWidth >= 1024`.
2. Near the top of the `return` in `WalletDashboard`, branch: `if (isDesktop) return <DesktopLayout ...props />`
3. `DesktopLayout` is a new component that receives the same data/handlers as props — no new data fetching, no new state.
4. Mobile layout is completely untouched.

This avoids polluting the existing JSX with `lg:` class mixtures, keeps the two layouts easy to reason about separately, and lets you iterate on desktop without risking mobile regressions.

---

## Files to Create / Modify

| Action | File |
|--------|------|
| New hook | `frontend/src/hooks/useIsDesktop.ts` |
| New component | `frontend/src/components/desktop/DesktopLayout.tsx` |
| New component | `frontend/src/components/desktop/DesktopLeftPanel.tsx` |
| New component | `frontend/src/components/desktop/DesktopCenterPanel.tsx` |
| New component | `frontend/src/components/desktop/DesktopRightPanel.tsx` |
| Modify (minimal) | `frontend/src/pages/WalletDashboard.tsx` |
| Modify (optional) | `frontend/src/components/SendTransaction.tsx` — see §Right Panel |
| Modify (optional) | `frontend/src/components/ReceiveBitcoin.tsx` — see §Right Panel |

---

## 1. `useIsDesktop.ts`

```ts
import { useState, useEffect } from 'react';

const BREAKPOINT = 1024;

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= BREAKPOINT);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}
```

---

## 2. `WalletDashboard.tsx` Changes (minimal)

Add import + hook at the top of the component:

```tsx
import { useIsDesktop } from '../hooks/useIsDesktop';
import DesktopLayout from '../components/desktop/DesktopLayout';

// inside WalletDashboard():
const isDesktop = useIsDesktop();
```

Add a branch right before the mobile `return`:

```tsx
if (isDesktop) {
  return (
    <DesktopLayout
      // wallet data
      walletInfo={displayWalletInfo}
      walletAddress={walletAddress}
      sendWallet={sendWallet}
      ledgerBalance={ledgerBalance}
      isLoadingBalance={isLoadingBalance}
      displayTransactions={displayTransactions}
      walletAddressForTx={walletAddressForTx}
      // wallet name
      walletName={walletName}
      walletNameLoaded={walletNameLoaded}
      editingWalletName={editingWalletName}
      walletNameInput={walletNameInput}
      setWalletNameInput={setWalletNameInput}
      setEditingWalletName={setEditingWalletName}
      handleSaveWalletName={handleSaveWalletName}
      // prefs
      preferredCurrency={preferredCurrency}
      preferredLanguage={preferredLanguage}
      languageName={languageName}
      setShowCurrencySelector={setShowCurrencySelector}
      setShowLanguageSelector={setShowLanguageSelector}
      showCurrencySelector={showCurrencySelector}
      showLanguageSelector={showLanguageSelector}
      settingsExiting={settingsExiting}
      setSettingsExiting={setSettingsExiting}
      // modals (legal pages still slide over on desktop too)
      showFAQ={showFAQ} setShowFAQ={setShowFAQ}
      showTerms={showTerms} setShowTerms={setShowTerms}
      showPrivacy={showPrivacy} setShowPrivacy={setShowPrivacy}
      // actions
      handleLogOut={handleLogOut}
      formatBTC={formatBTC}
      formatDate={formatDate}
      getTransactionIcon={getTransactionIcon}
      selectedTransaction={selectedTransaction}
      setSelectedTransaction={setSelectedTransaction}
    />
  );
}

// existing mobile return below — unchanged
return (
  <div className="flex h-dvh ...">
    ...
  </div>
);
```

---

## 3. `DesktopLayout.tsx`

Receives all props from WalletDashboard. Owns the 3-column shell and right-panel state.

```tsx
type RightPanelView = 'idle' | 'send' | 'receive';

export default function DesktopLayout(props: DesktopLayoutProps) {
  const [rightView, setRightView] = useState<RightPanelView>('idle');

  return (
    // Full-page black background, vertically centered
    <div className="min-h-dvh bg-black flex items-center justify-center">
      
      {/* Compact 3-column panel — no border, just division lines */}
      <div
        className="flex flex-row bg-black"
        style={{ width: 860, height: 600 }}
      >
        <DesktopLeftPanel {...leftProps} />
        
        {/* Vertical divider */}
        <div className="w-px bg-white/50 shrink-0" />
        
        <DesktopCenterPanel {...centerProps} />
        
        {/* Vertical divider */}
        <div className="w-px bg-white/50 shrink-0" />
        
        <DesktopRightPanel
          {...rightProps}
          view={rightView}
          onShowSend={() => setRightView('send')}
          onShowReceive={() => setRightView('receive')}
          onBack={() => setRightView('idle')}
        />
      </div>

      {/* Legal page overlays — still full-screen SlideFromRight on desktop */}
      {props.showFAQ && (
        <SlideFromRight open={props.showFAQ} onClose={() => props.setShowFAQ(false)}>
          <FAQPage onClose={() => props.setShowFAQ(false)} />
        </SlideFromRight>
      )}
      {/* ...same for Terms, Privacy, CurrencySelector, LanguageSelector */}
    </div>
  );
}
```

**Sizing guidance:** 860px wide × 600px tall is a starting point. Adjust to taste. The window will never look stretched because content is inherently compact. On very small laptops (< 1100px wide), the panel will still fit since it's only 860px.

---

## 4. `DesktopLeftPanel.tsx`

Always-visible sidebar. Replaces the full-screen menu overlay on desktop.

Structure (top-to-bottom, flex col, justify-between):

```
MOTO logo (wordmark, h-6, object-left)
─── divider ───
Wallet name (editable, same input behavior as mobile)
─── divider ───
[Currency icon] Currency          USD →
[Language icon] Language          English →
─── spacer (flex-1) ───
FAQ
Terms of Service
Privacy Policy
─── divider ───
Sign Out
```

Notes:
- Width: `w-[200px]`, padding: `px-5 py-4`
- All text: same `font-mono text-base text-white/80 tracking-[0.8px]` as the mobile menu
- Logo click does nothing on desktop (no menu to close)
- Currency/Language still open the existing SlideFromRight selectors (passed via props)
- FAQ/Terms/Privacy open the same SlideFromRight overlays
- No "Wipe canister" option on desktop (keep that mobile-only or add in a later pass)

---

## 5. `DesktopCenterPanel.tsx`

Balance header + transaction list. Content is nearly identical to the mobile center, minus pull-to-refresh.

Structure:
```
₿ [balance]           [+ add funds icon, if zero balance]
─── divider ───
[scrollable transaction list]
```

Notes:
- Width: `flex-1` (fills remaining space between left and right panels)
- Balance row: same `font-mono text-2xl font-bold` as mobile header
- Transactions: same row style (`h-8`, dot indicator, BTC amount, date)
- On click → `setSelectedTransaction` — on desktop, TransactionDetails can open as a SlideFromRight overlay (same as mobile), or you can render it in the right panel. Simplest: keep it as a SlideFromRight overlay for now.
- No pull-to-refresh (desktop has no swipe). Add a subtle "↻ Refresh" icon button next to the balance or at the top-right of the panel instead.
- Scrollable: `overflow-y-auto` with `flex-1 min-h-0` container
- Padding: `px-5 py-4`

---

## 6. `DesktopRightPanel.tsx`

Three states: `idle` | `send` | `receive`

### Idle state
```
[Send button — full width, h-16, border-2 border-white/80]
[Receive button — full width, h-16, border-2 border-white/80]
```
Buttons are stacked vertically (column), not side-by-side. Same border/text style as mobile bottom bar.

### Send state
Render `<SendTransaction>` directly inside the right panel (not a SlideFromRight overlay).

`SendTransaction` currently assumes it fills the whole screen. You have two options:

**Option A (recommended, less invasive):** Pass a prop `compact?: boolean` to `SendTransaction`. When `compact=true`, omit the outer `fixed inset-0` wrapper and render as a flex column filling its parent. The `BackCloseButton` still works; clicking it calls `onClose` which sets `rightView('idle')`.

**Option B:** Render `SendTransaction` inside a `<div className="absolute inset-0 overflow-hidden">` positioned relative to the right panel. This lets SendTransaction keep its existing full-screen styles without changes.

Option A is cleaner long-term. Option B is faster to ship.

### Receive state
Same approach as Send — render `<ReceiveBitcoin>` inline (compact mode or absolutely positioned).

### Back navigation
The `BackCloseButton` at the top of Send/Receive calls `onClose` → parent sets `rightView('idle')`. No SlideFromRight animation needed since the right panel is already always visible.

Width: `w-[260px]`, padding: `px-5 py-4`

---

## 7. Handling Sub-Panels (Currency / Language Selectors)

On mobile these slide in as part of the full-screen menu. On desktop:

**Simplest approach:** When `setShowCurrencySelector(true)` is called from DesktopLeftPanel, open `CurrencySelector` as a `SlideFromRight` overlay (full screen, same as mobile). Same for `LanguageSelector`.

This is the path of least resistance — no changes to `CurrencySelector` or `LanguageSelector` components needed.

**Later enhancement:** Render selectors as a popover or inline replace inside the left panel. Not needed for v1.

---

## 8. TransactionDetails on Desktop

For now: keep `TransactionDetails` as a `SlideFromRight` full-screen overlay, exactly the same as mobile. Add it to `DesktopLayout` alongside the legal page overlays.

---

## 9. `index.css` / Body Styles

On mobile, `<body>` likely has `overflow: hidden` or similar to prevent bounce scroll. On desktop you want the page to be statically centered. Check `src/index.css`:

- If there's a `body { overflow: hidden }` rule, scope it to mobile: `@media (max-width: 1023px) { body { overflow: hidden } }`
- The desktop container (`min-h-dvh bg-black`) handles full-page coverage.

---

## 10. Implementation Order (Suggested)

1. `useIsDesktop.ts` — trivial, unblocks everything
2. `DesktopLayout.tsx` shell — just the 3-col container, no real content yet, confirm sizing/centering
3. `DesktopLeftPanel.tsx` — static menu, confirm style matches mobile menu
4. `DesktopCenterPanel.tsx` — balance + transactions, confirm scroll behavior
5. `DesktopRightPanel.tsx` idle state — just the two buttons
6. Right panel Send/Receive — wire up Option A or B
7. Overlay wiring — SlideFromRight for legal pages, currency/language, tx details
8. WalletDashboard branch — swap in `DesktopLayout`
9. Body/scroll CSS audit

---

## 11. Things to Not Change

- All mobile JSX in `WalletDashboard.tsx` — untouched
- `SlideFromRight.tsx` — untouched (still used on desktop for overlays)
- `SendTransaction.tsx` and `ReceiveBitcoin.tsx` — minimal change if Option A, zero if Option B
- All hooks, data fetching, state logic — untouched (DesktopLayout is pure presentation)

---

## 12. Testing Checklist

- [ ] At `< 1024px`: mobile layout looks identical to before
- [ ] At `>= 1024px`: 3-column panel appears centered, full-page black background
- [ ] Left panel: wallet name edit works, currency/language open selectors, legal pages open
- [ ] Center panel: balance loads, transactions render and are clickable, refresh works
- [ ] Right panel idle: Send and Receive buttons visible
- [ ] Right panel send: SendTransaction renders, form works end-to-end, back returns to idle
- [ ] Right panel receive: ReceiveBitcoin renders with QR, back returns to idle
- [ ] Window resize: crossing 1024px threshold switches layouts without crash
- [ ] Sign out: works from desktop left panel
