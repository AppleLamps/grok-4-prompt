/**
 * SpaceBackground (Canvas Edition)
 *
 * A high-end, performant, and captivating space backdrop built with Canvas.
 * - Multi-layer parallax starfield with twinkling
 * - Occasional shooting stars with motion blur trail
 * - Soft aurora/nebula gradients and subtle film grain overlay
 * - Respects prefers-reduced-motion and never captures pointer events
 */
import { useEffect, useRef } from 'react';

export default function SpaceBackground() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const starsRef = useRef([]);
  const shootingRef = useRef([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const reducedRef = useRef(false);
  const resizeTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReduced = () => (reducedRef.current = mq.matches);
    updateReduced();
    if (mq.addEventListener) mq.addEventListener('change', updateReduced);
    else if (mq.addListener) mq.addListener(updateReduced);

    // gradient cached between frames, rebuilt on resize
    let bgGrad = null;


    // Sizing
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // cache the vignette gradient (reduced opacity for brighter appearance)
      bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.6, 0, w * 0.5, h * 0.6, Math.max(w, h));
      bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
      bgGrad.addColorStop(1, 'rgba(15, 23, 42, 0.2)');
      seedStars();
    };

    // Star model
    function seedStars() {
      const { w, h } = sizeRef.current;
      const area = w * h;
      // Density tuned for crisp yet performant field, downscale on small screens and reduced motion
      const densityFactor = (w <= 480 ? 0.6 : (w <= 768 ? 0.8 : 1)) * (reducedRef.current ? 0.7 : 1);
      const base = Math.min(1200, Math.floor((area / 2500) * densityFactor));
      const stars = new Array(base).fill(0).map(() => {
        const depth = Math.random() < 0.5 ? 0.35 : Math.random() < 0.8 ? 0.65 : 1.0; // 3 layers
        let color = '#ffffff';
        if (depth > 0.9) color = '#e2e8f0';
        else if (depth > 0.5) color = '#f1f5f9';
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * (depth * 1.2) + 0.3, // radius
          a: 0.5 + Math.random() * 0.5, // base alpha
          t: Math.random() * Math.PI * 2, // phase for twinkle
          tw: 0.5 + Math.random() * 1.5, // twinkle speed
          d: depth, // depth factor (parallax)
          color,
        };
      });
      starsRef.current = stars;
    }

    // Shooting star model
    function spawnShooting() {
      const { w, h } = sizeRef.current;
      const fromTop = Math.random() * h * 0.6;
      const speed = 600 + Math.random() * 800; // px/s
      const len = 120 + Math.random() * 180;
      shootingRef.current.push({
        x: -200,
        y: fromTop,
        vx: speed,
        vy: speed * 0.35,
        life: 0.9 + Math.random() * 0.6, // seconds
        age: 0,
        len,
      });
    }

    // Occasionally create shooting stars
    let shootTimer = 0;

    // Animation loop
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); // clamp for background tabs
      last = now;

      const { w, h } = sizeRef.current;
      // Read parallax intent from CSS vars written by useParallax
      const root = document.documentElement;
      const px = parseFloat(root.style.getPropertyValue('--parallaxX') || '0') || 0;
      const py = parseFloat(root.style.getPropertyValue('--parallaxY') || '0') || 0;

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Use cached background gradient computed on resize
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Stars
      const twinkleEnabled = !reducedRef.current;
      for (let i = 0; i < starsRef.current.length; i++) {
        const s = starsRef.current[i];
        const parallaxX = px * (8 + 18 * s.d); // depth influence
        const parallaxY = py * (6 + 14 * s.d);
        let alpha = s.a;
        if (twinkleEnabled) {
          const twinkleDt = (w <= 480 || reducedRef.current) ? dt * 0.5 : dt;
          s.t += s.tw * twinkleDt;
          alpha *= 0.75 + 0.25 * (0.5 + 0.5 * Math.sin(s.t));
        }
        ctx.globalAlpha = Math.max(0.15, Math.min(1, alpha));
        ctx.fillStyle = s.color;

        const x = s.x + parallaxX;
        const y = s.y + parallaxY;
        // draw as small soft circle
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Shooting stars update
      if (!reducedRef.current) {
        shootTimer -= dt;
        if (shootTimer <= 0 && shootingRef.current.length < 2) {
          spawnShooting();
          shootTimer = 2 + Math.random() * 4; // next in 2-6s
        }
        for (let i = shootingRef.current.length - 1; i >= 0; i--) {
          const s = shootingRef.current[i];
          s.age += dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          const t = Math.min(1, s.age / s.life);
          const opacity = 1 - t;
          // Enhanced trail with cached gradient to reduce per-frame allocations
          const dx = s.x - (s._gx || -Infinity);
          const dy = s.y - (s._gy || -Infinity);
          const dMove = Math.hypot(dx, dy);
          if (!s._grad || dMove > 8 || Math.abs((s._gOpacity || 0) - opacity) > 0.1) {
            const g = ctx.createLinearGradient(s.x - s.len, s.y - s.len * 0.35, s.x, s.y);
            g.addColorStop(0, 'rgba(168, 85, 247, 0)');
            g.addColorStop(0.3, `rgba(168, 85, 247, ${0.4 * opacity})`);
            g.addColorStop(0.7, `rgba(96, 165, 250, ${0.6 * opacity})`);
            g.addColorStop(1, `rgba(255, 255, 255, ${0.9 * opacity})`);
            s._grad = g;
            s._gx = s.x;
            s._gy = s.y;
            s._gOpacity = opacity;
          }
          ctx.strokeStyle = s._grad;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(s.x - s.len, s.y - s.len * 0.35);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
          if (t >= 1 || s.x - s.len > w + 200 || s.y - s.len * 0.35 > h + 200) {
            shootingRef.current.splice(i, 1);
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    const scheduleResize = () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = setTimeout(resize, 150);
    };

    resize();
    rafRef.current = requestAnimationFrame(loop);
    window.addEventListener('resize', scheduleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      window.removeEventListener('resize', scheduleResize);
      if (mq.removeEventListener) mq.removeEventListener('change', updateReduced);
      else if (mq.removeListener) mq.removeListener(updateReduced);
    };
  }, []);

  return (
    <div className="aurora-container" aria-hidden="true">
      {/* Nebula/Aurora layers (CSS animated) */}
      <div className="aurora-bg"></div>
      {/* Canvas starfield */}
      <canvas ref={canvasRef} className="star-canvas" />
      {/* Subtle grain to avoid flat gradients */}
      <div className="noise-overlay"></div>
    </div>
  );
}
