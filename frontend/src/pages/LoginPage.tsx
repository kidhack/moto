import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to sign in. Please try again.');
    }
  };

  // Match splash terminus exactly: absolute left-1/2, top 120px, translateX(-50%)
  const LOGO_TERMINUS_TOP_PX = 120;

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center bg-black text-white pt-8 pb-0">
      {/* Logo: same position as end of splash (absolute, top 160px, centered) */}
      <div
        className="absolute left-1/2 z-20 flex flex-col items-center"
        style={{
          top: `${LOGO_TERMINUS_TOP_PX}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <img
          src="/assets/moto-logo-mark.svg"
          alt="MOTO"
          className="size-20 shrink-0"
        />
      </div>

      {/* Text block: centered in the viewport (not between logo and button) */}
      <div
        className="absolute left-1/2 top-1/2 z-10 w-full max-w-lg px-5 -translate-x-1/2 -translate-y-1/2"
        style={{ letterSpacing: '-0.22px' }}
      >
        <div className="text-center text-xl leading-normal text-white/80 flex flex-col items-center gap-6">
          <p className="font-normal">
            Welcome to MOTO,<br aria-hidden="true" />
            your minimal Bitcoin wallet.
          </p>
          <div className="h-px w-16 bg-white/50 shrink-0" aria-hidden />
          <p className="font-normal">
            Like a cash wallet,<br aria-hidden="true" />
            use MOTO for everyday transactions,<br aria-hidden="true" />
            not your life savings.
          </p>
          <div className="h-px w-16 bg-white/50 shrink-0" aria-hidden />
          <p className="font-normal">
            MOTO to MOTO transactions are instant<br aria-hidden="true" />
            and powered by ckBTC.
          </p>
        </div>
      </div>

      {/* Spacer to push button to bottom (logo 120px + 80px = 200px, then flex-1) */}
      <div style={{ height: '200px' }} aria-hidden />
      <div className="flex-1 min-h-0" aria-hidden />

      {/* Sign In button at bottom */}
      <div className="flex shrink-0 justify-center w-full px-5 pt-4" style={{ paddingBottom: '1.25rem' }}>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="h-16 border-2 border-white/80 bg-transparent text-white/80 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{ borderRadius: 0, width: '372px', maxWidth: '100%' }}
          >
            <span className="font-bold text-base leading-6" style={{ letterSpacing: '0.15px' }}>
              {isLoggingIn ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                  Connecting...
                </>
              ) : (
                'Sign In'
              )}
            </span>
          </button>
        </div>
    </div>
  );
}
