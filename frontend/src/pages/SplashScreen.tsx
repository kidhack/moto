import { useState, useEffect } from 'react';

/**
 * Splash screen: logo (mark + vert-cut) centered, then animates to top (120px)
 * with vert-cut clipping away. App switches to LoginPage when timer completes;
 * sign-in logo is at 160px to match this end position.
 */
const HOLD_MS = 3000;
const MOVE_DURATION_MS = 300;
const MOVE_DELAY_MS = 275;
const LOGO_TERMINUS_TOP_PX = 120;

export default function SplashScreen() {
  const [animationStarted, setAnimationStarted] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setAnimationStarted(true), HOLD_MS);
    return () => clearTimeout(t1);
  }, []);

  const atTerminus = animationStarted;

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-black">
      {/* Logo block: centered, then animates to LOGO_TERMINUS_TOP_PX to match sign-in page */}
      <div
        className="absolute left-1/2 z-20 flex flex-col items-center"
        style={{
          top: atTerminus ? `${LOGO_TERMINUS_TOP_PX}px` : '50%',
          transform: atTerminus ? 'translateX(-50%)' : 'translate(-50%, -50%)',
          transition: `top ${MOVE_DURATION_MS}ms ease-out ${MOVE_DELAY_MS}ms, transform ${MOVE_DURATION_MS}ms ease-out ${MOVE_DELAY_MS}ms`,
        }}
      >
        <img
          src="/assets/moto-logo-mark.svg"
          alt="MOTO"
          className="size-20 shrink-0"
        />
        <div className="h-2 shrink-0" aria-hidden />
        <img
          src="/assets/moto-vert-cut.svg"
          alt=""
          className="w-20 shrink-0 object-contain object-top"
          style={{
            height: 'auto',
            clipPath: animationStarted ? 'inset(0 0 100% 0)' : 'inset(0 0 0% 0)',
            transition: `clip-path ${MOVE_DURATION_MS}ms ease-out`,
          }}
        />
      </div>
    </div>
  );
}
