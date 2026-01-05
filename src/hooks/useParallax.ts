import { useEffect } from 'react';

/**
 * useParallax
 * Updates CSS variables --parallaxX and --parallaxY based on pointer/deviceorientation,
 * with smoothing via requestAnimationFrame. Pauses on tab hidden and respects
 * prefers-reduced-motion.
 */
export default function useParallax(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    let rafId = 0;
    let running = false;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    let lastUpdate = 0;
    const step = (timestamp: number): void => {
      if (timestamp - lastUpdate < 16) {
        rafId = requestAnimationFrame(step);
        return;
      }
      lastUpdate = timestamp;
      currentX = currentX + (targetX - currentX) * 0.08;
      currentY = currentY + (targetY - currentY) * 0.08;
      root.style.setProperty('--parallaxX', String(currentX));
      root.style.setProperty('--parallaxY', String(currentY));
      rafId = requestAnimationFrame(step);
    };

    const start = (): void => {
      if (running) return;
      if (reduced.matches) return;
      if (document.hidden) return;
      running = true;
      rafId = requestAnimationFrame(step);
    };

    const stop = (): void => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    const handlePointer = (e: PointerEvent): void => {
      const { innerWidth, innerHeight } = window;
      const nx = (e.clientX / innerWidth) * 2 - 1; // [-1, 1]
      const ny = (e.clientY / innerHeight) * 2 - 1;
      targetX = nx;
      targetY = ny;
    };

    const handleOrientation = (e: DeviceOrientationEvent): void => {
      // gamma: left-right (-90, 90), beta: front-back (-180, 180)
      const nx = Math.max(-1, Math.min(1, (e.gamma || 0) / 45));
      const ny = Math.max(-1, Math.min(1, (e.beta || 0) / 90));
      targetX = nx;
      targetY = ny;
    };

    const handleVisibility = (): void => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    const handleReducedMotionChange = (): void => {
      if (reduced.matches) {
        stop();
      } else {
        start();
      }
    };

    // listeners
    window.addEventListener('pointermove', handlePointer, { passive: true });
    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    // modern browsers support addEventListener on MediaQueryList
    reduced.addEventListener('change', handleReducedMotionChange);

    // kick things off
    if (!reduced.matches) start();

    return () => {
      window.removeEventListener('pointermove', handlePointer);
      window.removeEventListener('deviceorientation', handleOrientation);
      document.removeEventListener('visibilitychange', handleVisibility);
      reduced.removeEventListener('change', handleReducedMotionChange);
      stop();
    };
  }, []);
}
