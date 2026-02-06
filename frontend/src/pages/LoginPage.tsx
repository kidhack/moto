import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { toast } from 'sonner';

interface LoginPageProps {
  showSplashAnimation?: boolean;
}

export default function LoginPage({ showSplashAnimation = false }: LoginPageProps) {
  const { login, isLoggingIn } = useInternetIdentity();
  const [animationStarted, setAnimationStarted] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [logoMoveComplete, setLogoMoveComplete] = useState(false);
  const [hadSplashAnimation, setHadSplashAnimation] = useState(false);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to sign in. Please try again.');
    }
  };

  useEffect(() => {
    if (showSplashAnimation) {
      setHadSplashAnimation(true);
      const timers: ReturnType<typeof setTimeout>[] = [];
      // Start animation after 3 seconds
      timers.push(
        setTimeout(() => {
          setAnimationStarted(true);
          // Complete animation after transition duration (450ms)
          timers.push(
            setTimeout(() => setAnimationComplete(true), 450)
          );
          // Logo move: 450ms delay + 450ms duration. Keep vert-cut in layout until it finishes.
          timers.push(
            setTimeout(() => setLogoMoveComplete(true), 900)
          );
        }, 3000)
      );
      return () => timers.forEach(clearTimeout);
    } else {
      // No splash showing: show content immediately (either we skipped splash, or parent marked splash complete)
      setAnimationComplete(true);
    }
  }, [showSplashAnimation, hadSplashAnimation]);

  // Logo always at 160px when showing sign-in. With splash: animates from center; without: starts at 160px.
  const logoAtTerminus = animationStarted || animationComplete || !hadSplashAnimation;
  const showWelcomeContent = animationComplete || !hadSplashAnimation;

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-black text-white py-8">
      {/* Logo block: centered on splash then animates to 160px; or at 160px from start when no splash */}
      <div
        className="absolute left-1/2 z-20 flex flex-col items-center"
        style={{
          top: logoAtTerminus ? '160px' : '50%',
          transform: logoAtTerminus ? 'translateX(-50%)' : 'translate(-50%, -50%)',
          transition: 'top 450ms ease-in-out 450ms, transform 450ms ease-in-out 450ms',
        }}
      >
        <img
          src="/assets/moto-logo-mark.svg"
          alt="MOTO"
          className="size-20 shrink-0"
        />
        {(showSplashAnimation || (hadSplashAnimation && animationStarted && !logoMoveComplete)) && (
          <>
            <div className="h-2 shrink-0" aria-hidden />
            <img
              src="/assets/moto-vert-cut.svg"
              alt=""
              className="w-20 shrink-0 object-contain object-top"
              style={{
                height: 'auto',
                clipPath: animationStarted ? 'inset(0 0 100% 0)' : 'inset(0 0 0% 0)',
                transition: 'clip-path 450ms ease-in-out',
              }}
            />
          </>
        )}
      </div>
      
      {/* Welcome screen content - always rendered but hidden until animation completes */}
      <div 
        className="flex flex-1 flex-col items-center w-full"
        style={{
          opacity: showWelcomeContent ? 1 : 0,
          pointerEvents: showWelcomeContent ? 'auto' : 'none',
          transition: 'opacity 450ms ease-in-out',
        }}
      >
        {/* Spacer for logo (always at 160px when content is visible) */}
        {showWelcomeContent && <div style={{ height: '208px' }} />}
        
        {/* Inner container - matches Figma: gap-[80px], pt-[80px] */}
        <div className="flex flex-1 flex-col items-center gap-20 pt-20 w-full">
          
          {/* Welcome text - same weight, balanced spacing */}
          <div 
            className="text-center text-xl leading-normal text-white/80 w-full px-5 flex flex-col items-center gap-6"
            style={{ 
              letterSpacing: '-0.22px',
            }}
          >
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

        {/* Button - matches Figma: h-[64px], w-[372px], border-2 border-white/80 */}
        <div className="flex items-center justify-center w-full px-5 pb-8">
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="h-16 border-2 border-white/80 bg-transparent text-white/80 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                borderRadius: 0,
                width: '372px',
                maxWidth: '100%'
              }}
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
    </div>
  );
}
