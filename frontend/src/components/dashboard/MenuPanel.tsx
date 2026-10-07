import { useState } from 'react';
import { toast } from 'sonner';
import { II_MANAGE_URL } from '../../lib/ic';
import { useTranslation } from '../../i18n';

export interface MenuPanelProps {
  currentPrincipal: string | null;
  walletName: string;
  walletNameLoaded: boolean;
  editingWalletName: boolean;
  walletNameInput: string;
  setWalletNameInput: (value: string) => void;
  defaultWalletName: string;
  onEditWalletName: () => void;
  onSaveWalletName: () => void;
  preferredCurrency: string;
  languageName: string;
  onOpenCurrency: () => void;
  onOpenLanguage: () => void;
  onOpenFAQ: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onSignOut: () => void;
  onWipe: () => void;
  isWiping: boolean;
}

/** Menu contents (wallet name, settings, help, sign out). Shared by the mobile full-screen menu and the desktop sidebar. */
export default function MenuPanel({
  currentPrincipal,
  walletName,
  walletNameLoaded,
  editingWalletName,
  walletNameInput,
  setWalletNameInput,
  defaultWalletName,
  onEditWalletName,
  onSaveWalletName,
  preferredCurrency,
  languageName,
  onOpenCurrency,
  onOpenLanguage,
  onOpenFAQ,
  onOpenTerms,
  onOpenPrivacy,
  onSignOut,
  onWipe,
  isWiping,
}: MenuPanelProps) {
  const { t } = useTranslation();
  const [principalCopied, setPrincipalCopied] = useState(false);

  return (
    <>
      {/* My Wallet - equal space above and below the name */}
      {currentPrincipal && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center min-h-[2rem]">
           {!walletNameLoaded ? (
             <div className="h-5 w-40 rounded animate-shimmer" />
           ) : editingWalletName ? (
             <input
               type="text"
               value={walletNameInput}
               onChange={(e) => setWalletNameInput(e.target.value.slice(0, 32))}
               onBlur={onSaveWalletName}
               onKeyDown={(e) => e.key === 'Enter' && onSaveWalletName()}
               className="w-full bg-transparent border-0 rounded-none px-0 py-0 text-white/80 font-mono font-medium text-base tracking-[0.8px] outline-none placeholder:text-white/50"
               placeholder={defaultWalletName}
               autoFocus
             />
           ) : (
             <button
               onClick={onEditWalletName}
               className="w-full flex items-center justify-between min-h-[2rem] opacity-80 hover:opacity-100 transition-opacity text-left"
             >
               <span className="font-mono font-medium text-base text-white/80 tracking-[0.8px]">{walletName}</span>
               <svg className="size-4 text-white/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
               </svg>
             </button>
           )}
          </div>
          <div className="w-full border-t border-white/50 shrink-0" />
        </div>
      )}

      {/* Currency */}
      <button
        onClick={onOpenCurrency}
        className="flex gap-3 h-9 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
      >
        <img src="/assets/currency.svg" alt="" className="size-5 shrink-0 opacity-80" />
        <span className="font-medium text-base text-white/80 tracking-[0.8px]">{t('menu.currency')}</span>
        <span className="ml-auto font-mono font-medium text-base text-white/50 tracking-[0.8px]">{preferredCurrency}</span>
      </button>

      {/* Language */}
      <button
        onClick={onOpenLanguage}
        className="flex gap-3 h-9 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
      >
        <img src="/assets/language.svg" alt="" className="size-5 shrink-0 opacity-80" />
        <span className="font-medium text-base text-white/80 tracking-[0.8px]">{t('menu.language')}</span>
        <span className="ml-auto font-medium text-base text-white/50 tracking-[0.8px]">{languageName}</span>
      </button>

      {/* Back up login (Internet Identity recovery) */}
      <a
        href={II_MANAGE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3 h-9 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
      >
        <svg className="size-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        <span className="font-medium text-base text-white/80 tracking-[0.8px]">{t('recovery.menu')}</span>
      </a>

      {/* FAQ */}
      <button
        onClick={onOpenFAQ}
        className="flex gap-3 h-9 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
      >
        <svg className="size-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium text-base text-white/80 tracking-[0.8px]">{t('menu.faq')}</span>
      </button>

      <button
        onClick={onOpenTerms}
        className="flex gap-3 h-9 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
      >
        <svg className="size-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="font-medium text-base text-white/80 tracking-[0.8px]">{t('menu.terms')}</span>
      </button>

      <button
        onClick={onOpenPrivacy}
        className="flex gap-3 h-9 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
      >
        <svg className="size-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="font-medium text-base text-white/80 tracking-[0.8px]">{t('menu.privacy')}</span>
      </button>

      <div className="w-full border-t border-white/30 shrink-0" />

      {/* Sign Out */}
      <button
        onClick={onSignOut}
        className="flex gap-3 h-9 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
      >
        <img src="/assets/logout.svg" alt="" className="size-5 shrink-0 opacity-80" />
        <span className="font-medium text-base text-white/80 tracking-[0.8px]">{t('menu.signOut')}</span>
      </button>

      <div className="w-full border-t border-white/30 shrink-0" />

      {/* Principal ID + blurb */}
      {currentPrincipal && (
        <div className="flex flex-col gap-3">
          <p className="text-white/60 text-xs font-medium">{t('menu.yourPrincipalId')}</p>
          <div
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(currentPrincipal);
                setPrincipalCopied(true);
                setTimeout(() => setPrincipalCopied(false), 2000);
              } catch {
                toast.error(t('common.failedToCopy'));
              }
            }}
            className="bg-zinc-900/90 p-3 cursor-pointer flex items-center justify-center relative"
          >
            <p className="text-white/80 font-mono text-sm font-medium text-center break-all leading-relaxed" style={{ letterSpacing: '0.32px', textWrap: 'balance' }}>
              {currentPrincipal}
            </p>
            {principalCopied && (
              <p className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 text-white/80 font-sans text-sm font-medium">
                {t('common.copied')}
              </p>
            )}
          </div>
          <p className="text-white/50 text-xs leading-relaxed whitespace-pre-line">
            {t('menu.motoDescription')}
          </p>
        </div>
      )}

      {/* Wipe Canister & Sign Out */}
      <button
        onClick={onWipe}
        disabled={isWiping}
        className="flex gap-3 h-9 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
      >
        <img
          src="/assets/wipeout.svg"
          alt=""
          className="size-5 shrink-0"
          style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(98%) saturate(1000%) hue-rotate(346deg) brightness(104%) contrast(97%)' }}
        />
        <span className="font-medium text-base text-red-500 tracking-[0.8px]">
          {isWiping ? t('menu.wiping') : t('menu.wipeCanister')}
        </span>
      </button>

      {/* Divider below Wipe Canister & Sign Out */}
      <div className="w-full border-t border-white/30 shrink-0" />
    </>
  );
}
