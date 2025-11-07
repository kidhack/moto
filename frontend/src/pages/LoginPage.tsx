import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { toast } from 'sonner';

interface LoginPageProps {
  showSplashAnimation?: boolean;
}

export default function LoginPage({ showSplashAnimation = false }: LoginPageProps) {
  const { login, isLoggingIn } = useInternetIdentity();
  const [animationStarted, setAnimationStarted] = useState(false);

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
      // Start animation after 3 seconds (50% slower)
      const timer = setTimeout(() => {
        setAnimationStarted(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSplashAnimation]);

  // Splash screen layout (with both logos)
  if (showSplashAnimation && !animationStarted) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-black text-white py-8">
        {/* Splash: Logo container - centered with both logos */}
        <div className="absolute left-1/2 flex flex-col items-center gap-10 transition-all duration-[2250ms]"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20
          }}
        >
          {/* Market Town Mark */}
          <div className="size-20 flex items-center justify-center">
            <img 
              src="/assets/mt-mark.svg" 
              alt="Market Town" 
              className="size-full"
            />
          </div>
          
          {/* Market Town Type - fades out during animation */}
          <div 
            className="h-10 transition-opacity duration-[1200ms]"
            style={{
              width: '221.096px',
              opacity: animationStarted ? 0 : 1,
              transitionTimingFunction: 'ease-out'
            }}
          >
            <img 
              src="/assets/mt-type.svg" 
              alt="Market Town Type" 
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    );
  }

  // Welcome screen layout (matches Figma exactly)
  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-black text-white py-8">
      {/* Main container - matches Figma: flex flex-col items-center px-0 py-[32px] */}
      <div className="flex flex-1 flex-col items-center w-full">
        {/* Inner container - matches Figma: gap-[80px], pt-[80px] */}
        <div className="flex flex-1 flex-col items-center gap-20 pt-20 w-full">
          {/* Logo mark - matches Figma: 80px x 80px */}
          <div className="size-20 flex items-center justify-center">
            <img 
              src="/assets/mt-mark.svg" 
              alt="Market Town" 
              className="size-full"
            />
          </div>
          
          {/* Welcome text - matches Figma exactly */}
          {/* Figma: Public Sans Medium, 20px, rgba(255,255,255,0.8), line-height 1.5, tracking -0.22px */}
          <div 
            className="text-center text-xl leading-normal text-white/80 w-full px-5"
            style={{ letterSpacing: '-0.22px' }}
          >
            <p className="font-medium mb-0">
              Welcome to Market.Town,<br aria-hidden="true" />
              your new Bitcoin wallet.{' '}
            </p>
            <p className="mb-0">&nbsp;</p>
            <p className="mb-0">&nbsp;</p>
            <p className="font-medium mb-0">
              Like a cash wallet,<br aria-hidden="true" />
              use this is for everyday transactions,<br aria-hidden="true" />
              not your life savings.
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
