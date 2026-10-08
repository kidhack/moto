/**
 * Light haptic feedback for key actions. Use sparingly.
 * Only works on devices that support navigator.vibrate.
 */
export function vibrateLight(): void {
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }
  } catch {
    // Ignore - haptics are optional
  }
}
