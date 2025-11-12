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
      // Start animation after 3 seconds
      const timer = setTimeout(() => {
        setAnimationStarted(true);
        // Complete animation after transition duration (450ms = 2250ms / 5)
        setTimeout(() => {
          setAnimationComplete(true);
        }, 450); // Match the transition duration
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      // If no splash, show content immediately
      // But preserve hadSplashAnimation if it was already set (to prevent layout jumps)
      if (!hadSplashAnimation) {
        setAnimationComplete(true);
      }
      // If hadSplashAnimation is already true, don't change anything - keep the layout consistent
    }
  }, [showSplashAnimation, hadSplashAnimation]);

  // Calculate logo position based on animation state
  const getLogoPosition = () => {
    // If we never had a splash animation, use relative positioning
    if (!hadSplashAnimation) {
      return {
        position: 'relative' as const,
        top: 'auto',
        left: 'auto',
        transform: 'none',
        transition: 'none',
      };
    }
    
    // After animation completes, keep absolute positioning at final position to avoid jump
    if (animationComplete) {
      return {
        position: 'absolute' as const,
        top: '160px', // 80px (pt-20) + 80px down
        left: '50%',
        transform: 'translateX(-50%)',
        transition: 'none',
      };
    }
    
    if (animationStarted) {
      // Transitioning: animate from center to top
      return {
        position: 'absolute' as const,
        top: '160px', // 80px (pt-20) + 80px down
        left: '50%',
        transform: 'translateX(-50%)',
        transition: 'all 450ms ease-in-out',
      };
    }
    
    // Initial splash position (centered)
    // Logo mark is 80px tall, gap is 40px (gap-10), type is 40px tall (h-10)
    // Total block height: 80px + 40px + 40px = 160px
    // To center the entire block at 50%, logo mark center should be at 50% - (gap/2 + type/2) = 50% - (20px + 20px) = 50% - 40px
    return {
      position: 'absolute' as const,
      top: 'calc(50% - 40px)', // Move up by half the gap + half the type height to center the block
      left: '50%',
      transform: 'translate(-50%, -50%)',
      transition: 'none',
    };
  };

  const logoPosition = getLogoPosition();
  const isSplashOnly = showSplashAnimation && !animationStarted;
  const shouldShowWelcomeContent = animationComplete || !showSplashAnimation;
  
  // After animation completes, use the same layout regardless of showSplashAnimation prop
  // This prevents layout jumps when App.tsx switches from showSplashAnimation={true} to {false}
  // Use hadSplashAnimation to remember we had a splash, even after prop changes
  const useSplashLayout = hadSplashAnimation && (animationStarted || animationComplete);

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
          className="absolute left-1/2 transition-opacity duration-[450ms] ease-in-out"
          style={{
            // Logo mark center is at calc(50% - 40px), logo bottom is at 50%
            // Gap is 40px, type is 40px tall, so type center should be at 50% + 40px + 20px = calc(50% + 60px)
            top: 'calc(50% + 60px)',
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
      
      {/* Welcome screen content - always rendered to prevent layout shifts */}
      <div 
        className="flex flex-1 flex-col items-center w-full"
        style={{
          opacity: shouldShowWelcomeContent ? 1 : 0,
          pointerEvents: shouldShowWelcomeContent ? 'auto' : 'none',
          transition: 'opacity 450ms ease-in-out',
        }}
      >
        {/* Spacer to account for absolutely positioned logo when splash animation */}
        {/* Logo is at 160px from viewport, height 80px = 240px from viewport top */}
        {/* Container has py-8 (32px), so spacer = 240px - 32px = 208px */}
        {/* Then pt-20 (80px) adds the gap, making total 240px + 80px = 320px from viewport */}
        {/* Use splash layout if we had splash animation (even after it completes) */}
        {useSplashLayout && <div style={{ height: '208px' }} />}
        
        {/* Inner container - matches Figma: gap-[80px], pt-[80px] */}
        <div className="flex flex-1 flex-col items-center gap-20 pt-20 w-full">
          {/* Spacer for logo - only needed when logo is in normal flow (no splash) */}
          {!useSplashLayout && <div className="size-20" />}
          
          {/* Welcome text - matches Figma exactly */}
          {/* Figma: Public Sans Medium, 20px, rgba(255,255,255,0.8), line-height 1.5, tracking -0.22px */}
          <div 
            className="text-center text-xl leading-normal text-white/80 w-full px-5"
            style={{ 
              letterSpacing: '-0.22px',
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
