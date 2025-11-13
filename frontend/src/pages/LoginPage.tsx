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
      // Start animation after 3 seconds
      const timer = setTimeout(() => {
        setAnimationStarted(true);
        // Complete animation after transition duration
        setTimeout(() => {
          setAnimationComplete(true);
        }, 2250); // Match the transition duration
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      // If no splash, show content immediately
      setAnimationComplete(true);
    }
  }, [showSplashAnimation]);

  // Calculate logo position based on animation state
  const getLogoPosition = () => {
    if (!showSplashAnimation || animationComplete) {
      // Normal position (top with pt-20 = 80px)
      return {
        position: 'relative' as const,
        top: 'auto',
        left: 'auto',
        transform: 'none',
        transition: 'none',
      };
    }
    
    if (animationStarted) {
      // Transitioning: animate from center to top
      return {
        position: 'absolute' as const,
        top: '80px', // pt-20 = 80px
        left: '50%',
        transform: 'translateX(-50%)',
        transition: 'all 2250ms ease-out',
      };
    }
    
    // Initial splash position (centered)
    return {
      position: 'absolute' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      transition: 'none',
    };
  };

  const logoPosition = getLogoPosition();
  const isSplashOnly = showSplashAnimation && !animationStarted;
  const isTransitioning = showSplashAnimation && animationStarted && !animationComplete;
  const showWelcomeContent = !isSplashOnly;

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-black text-white py-8">
      {/* Logo mark - always rendered, positioned based on state */}
      <div 
        className="size-20 flex items-center justify-center z-20"
        style={logoPosition}
      >
        <img 
          src="/assets/mt-mark.svg" 
          alt="Market Town" 
          className="size-full"
        />
      </div>

      {/* Market Town Type - only shown during splash, fades out */}
      {isSplashOnly && (
        <div 
          className="absolute left-1/2 transition-opacity duration-[1200ms] ease-out"
          style={{
            // Logo center is at 50%, logo is 80px tall (40px below center), gap-10 is 40px
            // So type center should be at 50% + 40px + 40px = 50% + 80px
            top: 'calc(50% + 80px)',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 19,
            opacity: animationStarted ? 0 : 1,
          }}
        >
          <div 
            className="h-10"
            style={{
              width: '221.096px',
            }}
          >
            <img 
              src="/assets/mt-type.svg" 
              alt="Market Town Type" 
              className="w-full h-full"
            />
          </div>
        </div>
      )}
      
      {/* Welcome screen content */}
      {showWelcomeContent && (
        <div className="flex flex-1 flex-col items-center w-full">
          {/* Inner container - matches Figma: gap-[80px], pt-[80px] */}
          <div className="flex flex-1 flex-col items-center gap-20 pt-20 w-full">
            {/* Spacer for logo when in normal position */}
            {animationComplete && <div className="size-20" />}
            
            {/* Welcome text - matches Figma exactly - fade in during transition */}
            {/* Figma: Public Sans Medium, 20px, rgba(255,255,255,0.8), line-height 1.5, tracking -0.22px */}
            <div 
              className="text-center text-xl leading-normal text-white/80 w-full px-5 transition-opacity duration-[2250ms]"
              style={{ 
                letterSpacing: '-0.22px',
                opacity: isTransitioning ? 1 : (animationComplete ? 1 : 0),
                transitionDelay: isTransitioning ? '500ms' : '0ms'
              }}
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

          {/* Button - matches Figma: h-[64px], w-[372px], border-2 border-white/80 - fade in during transition */}
          <div 
            className="flex items-center justify-center w-full px-5 pb-8 transition-opacity duration-[2250ms]"
            style={{
              opacity: isTransitioning ? 1 : (animationComplete ? 1 : 0),
              transitionDelay: isTransitioning ? '500ms' : '0ms'
            }}
          >
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
      )}
    </div>
  );
}
