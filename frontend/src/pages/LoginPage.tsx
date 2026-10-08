import { useState, type CSSProperties } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { toast } from 'sonner';
import { useTranslation } from '../i18n';
import { SlideFromRight } from '../components/SlideFromRight';
import TermsPage from '../components/TermsPage';
import PrivacyPage from '../components/PrivacyPage';
import { markLegalSeen } from '../lib/legalNotice';
import { useIsDesktop } from '../hooks/useIsDesktop';


const VALUE_PROPS = [
  ['login.propCustodyTitle', 'login.propCustodyBody'],
  ['login.propAccountTitle', 'login.propAccountBody'],
  ['login.propInstantTitle', 'login.propInstantBody'],
] as const;

export default function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleLogin = async () => {
    // Signing in is agreeing to the current Terms and Privacy Policy (shown under the button).
    markLegalSeen();
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
      toast.error(t('login.failedToSignIn'));
    }
  };

  const signInButton = (style?: CSSProperties) => (
    <button
      onClick={handleLogin}
      disabled={isLoggingIn}
      className="h-16 border-2 border-white/80 bg-transparent text-white/80 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      style={{ borderRadius: 0, ...style }}
    >
      <span className="font-bold text-base leading-6" style={{ letterSpacing: '0.15px' }}>
        {isLoggingIn ? (
          <>
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
            {t('login.connecting')}
          </>
        ) : (
          t('login.signIn')
        )}
      </span>
    </button>
  );

  // "By signing in, you agree to the Terms of Service and Privacy Policy." with both opening in place.
  const agreementParts = (linkClassName: string) =>
    t('login.agree')
      .split(/(\{\{terms\}\}|\{\{privacy\}\})/)
      .map((part, i) =>
        part === '{{terms}}' ? (
          <button key={i} type="button" onClick={() => setShowTerms(true)} className={linkClassName}>
            {t('menu.terms')}
          </button>
        ) : part === '{{privacy}}' ? (
          <button key={i} type="button" onClick={() => setShowPrivacy(true)} className={linkClassName}>
            {t('menu.privacy')}
          </button>
        ) : (
          <span key={i}>{part}</span>
        )
      );

  const legalOverlays = (
    <>
      {showTerms && (
        <SlideFromRight open={showTerms} onClose={() => setShowTerms(false)}>
          <TermsPage onClose={() => setShowTerms(false)} />
        </SlideFromRight>
      )}
      {showPrivacy && (
        <SlideFromRight open={showPrivacy} onClose={() => setShowPrivacy(false)}>
          <PrivacyPage onClose={() => setShowPrivacy(false)} />
        </SlideFromRight>
      )}
    </>
  );

  if (isDesktop) {
    // Desktop: the dashboard's header (wordmark + full-width rule), then one block a little above center.
    return (
      <div className="fixed inset-0 grid h-dvh w-full grid-rows-[auto_2fr_auto_3fr] overflow-hidden bg-black text-white">
        <header className="px-5 pt-6">
          <img src="/assets/moto-logo.svg" alt="MOTO" className="h-8 w-[172px] object-contain object-left" />
          <div className="mt-4 h-px w-full bg-white/50" aria-hidden />
        </header>

        <div className="row-start-3 flex w-[420px] max-w-[calc(100%-40px)] flex-col justify-self-center">
          <h1 className="text-balance text-[30px] font-medium leading-[1.2] tracking-[-0.5px] text-white">
            {t('login.welcomeLine1')} {t('login.welcomeLine2')}
          </h1>

          <ul className="mt-6 flex flex-col gap-4">
            {VALUE_PROPS.map(([title, body]) => (
              <li key={title} className="flex flex-col gap-0.5">
                <span className="text-base font-medium leading-[1.4] text-white">{t(title)}</span>
                <span className="text-pretty text-[15px] leading-normal text-white/60">{t(body)}</span>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm leading-normal text-white/50">{t('login.risk')}</p>

          <div className="mt-10">{signInButton({ width: '100%' })}</div>

          <p className="mt-4 text-balance text-[13px] leading-[1.55] text-white/35">
            {agreementParts('text-white/50 hover:text-white/80 hover:underline focus-visible:underline underline-offset-2')}
          </p>
        </div>

        {legalOverlays}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex min-h-dvh h-dvh w-full flex-col overflow-hidden bg-black text-white">
      {/* Logo: same position as splash terminus */}
      <div
        className="absolute left-1/2 z-20 flex flex-col items-center"
        style={{ top: '80px', transform: 'translateX(-50%)' }}
      >
        <img
          src="/assets/moto-logo-mark.svg"
          alt="MOTO"
          className="size-20 shrink-0"
        />
      </div>

      {/* Bottom-anchored block (Sign In stays in thumb reach); the logo above keeps the splash position. */}
      <div className="flex-1" />
      <div
        className="mx-auto flex w-full max-w-[420px] flex-col px-5"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <h1 className="text-balance text-2xl font-medium leading-[1.25] tracking-[-0.4px] text-white">
          {t('login.welcomeLine1')} {t('login.welcomeLine2')}
        </h1>

        <ul className="mt-5 flex flex-col gap-3">
          {VALUE_PROPS.map(([title, body]) => (
            <li key={title} className="flex flex-col gap-px">
              <span className="text-[15px] font-medium leading-[1.4] text-white">{t(title)}</span>
              <span className="text-sm leading-[1.45] text-white/60">{t(body)}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-[13px] leading-[1.45] text-white/50">{t('login.risk')}</p>

        <div className="mt-7">{signInButton({ width: '100%' })}</div>

        {/* Agreement: shown before sign-in so the Terms are actually presented to the user */}
        <p className="mt-3 text-balance text-xs leading-[1.55] text-white/35">
          {agreementParts('text-white/50 hover:text-white/80 hover:underline focus-visible:underline underline-offset-2')}
        </p>
      </div>

      {legalOverlays}
    </div>
  );
}
