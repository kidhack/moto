import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { toast } from 'sonner';
import { useTranslation } from '../i18n';

const CONTENT_MAX_WIDTH = 320;

export default function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();
  const { t } = useTranslation();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
      toast.error(t('login.failedToSignIn'));
    }
  };

  return (
    <div className="fixed inset-0 flex min-h-dvh h-dvh w-full flex-col items-center overflow-hidden bg-black text-white pt-4 sm:pt-8 pb-0">
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

      {/* Text block: bottom-aligned, same width as button */}
      <div className="flex-1 flex items-end justify-center w-full px-5 min-h-0">
        <div
          className="w-full max-w-full text-left py-8"
          style={{ letterSpacing: '-0.22px', width: CONTENT_MAX_WIDTH, maxWidth: '100%', fontSize: '1.1rem' }}
        >
          <p className="font-medium text-white leading-normal">
            {t('login.welcomeLine1')}
            <br aria-hidden="true" />
            {t('login.welcomeLine2')}
          </p>
          <div className="my-5 sm:my-6 h-px w-full bg-white/30" aria-hidden />
          <p className="leading-relaxed text-white/80">
            {t('login.description1')}
          </p>
          <div className="my-5 sm:my-6 h-px w-full bg-white/30" aria-hidden />
          <p className="leading-relaxed text-white/80">
            {t('login.description2')}
          </p>
        </div>
      </div>

      {/* Sign In button at bottom */}
      <div className="flex shrink-0 justify-center w-full px-5 pt-4" style={{ paddingBottom: '1.25rem' }}>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="h-16 border-2 border-white/80 bg-transparent text-white/80 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{ borderRadius: 0, width: CONTENT_MAX_WIDTH, maxWidth: '100%' }}
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
        </div>
    </div>
  );
}
