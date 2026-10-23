'use client';

import { useEffect, useRef } from 'react';

/**
 * Viscous-syrup particle flow with expressive cursor interaction.
 *
 * Base state: hundreds of tiny particles stream through a morphing flow field,
 * pooling at an attractor that eases toward the cursor with a ~0.5s lag (idle
 * drift when the pointer is still). On top of that, the cursor's *velocity*
 * drives the fluid:
 *   - a wake — particles near a moving cursor are flung along its direction;
 *   - a vortex — tangential swirl that spins up with cursor speed;
 *   - a soft parting repulsion so fast moves carve a channel that refills.
 * A click sends an expanding shockwave ripple that shoves particles outward.
 * Fading trails keep it liquid. Static under prefers-reduced-motion.
 */
export default function ParticleField({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let w = 0;
    let h = 0;

    const darkPalette = ['#22d3ee', '#2dd4bf', '#38bdf8', '#67e8f9'];
    const lightPalette = ['#d97706', '#ea580c', '#f59e0b', '#fb7185'];

    type P = { x: number; y: number; vx: number; vy: number; c: number };
    let particles: P[] = [];

    const seed = () => {
      const target = Math.min(reduced ? 120 : 640, Math.floor((w * h) / 2600));
      particles = Array.from({ length: target }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: 0,
        vy: 0,
        c: i % 4,
      }));
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w;
      canvas.height = h;
      seed();
    };

    const pointer = { x: -1, y: -1, active: false, lastMove: 0 };
    // smoothed pointer velocity + previous sample
    const vel = { x: 0, y: 0 };
    let ppx = 0;
    let ppy = 0;
    const attractor = { x: 0, y: 0 };
    const goal = { x: 0, y: 0 };

    type Ripple = { x: number; y: number; born: number };
    let ripples: Ripple[] = [];

    const onMove = (e: PointerEvent) => {
      if (!pointer.active) {
        ppx = e.clientX;
        ppy = e.clientY;
      }
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
      pointer.lastMove = performance.now();
    };
    const onDown = (e: PointerEvent) => {
      onMove(e);
      ripples.push({ x: e.clientX, y: e.clientY, born: performance.now() });
      if (ripples.length > 6) ripples.shift();
    };

    let last = performance.now();
    let t = 0;
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      // Smoothed pointer velocity (per-frame delta, decays when still).
      const rawvx = pointer.x - ppx;
      const rawvy = pointer.y - ppy;
      ppx = pointer.x;
      ppy = pointer.y;
      vel.x += (rawvx - vel.x) * 0.35;
      vel.y += (rawvy - vel.y) * 0.35;
      const speed = Math.hypot(vel.x, vel.y);

      const idle = !pointer.active || now - pointer.lastMove > 450;
      if (idle) {
        goal.x = w / 2 + Math.sin(t * 0.22) * w * 0.32;
        goal.y = h / 2 + Math.cos(t * 0.29) * h * 0.32;
      } else {
        goal.x = pointer.x;
        goal.y = pointer.y;
      }
      const k = 1 - Math.exp(-dt / 0.5);
      attractor.x += (goal.x - attractor.x) * k;
      attractor.y += (goal.y - attractor.y) * k;

      // Trails.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';
      const pal = isDarkRef.current ? darkPalette : lightPalette;

      const flow = 0.85;
      const attract = 0.085;
      const R = 230; // cursor influence radius
      const wakeK = Math.min(1.6, speed * 0.05); // fling strength ∝ cursor speed
      const swirlK = 0.6 + Math.min(1.8, speed * 0.04); // vortex spins up with speed
      const now2 = now;

      for (const p of particles) {
        // morphing flow field
        const ang =
          (Math.sin(p.x * 0.0038 + t * 0.4) +
            Math.cos(p.y * 0.0038 - t * 0.33)) *
          Math.PI;
        let fx = Math.cos(ang) * flow;
        let fy = Math.sin(ang) * flow;

        // global pull toward attractor
        const dx = attractor.x - p.x;
        const dy = attractor.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        fx += (dx / d) * attract * d * 0.011;
        fy += (dy / d) * attract * d * 0.011;

        // cursor velocity interaction
        if (pointer.active) {
          const cx = p.x - pointer.x;
          const cy = p.y - pointer.y;
          const dc = Math.hypot(cx, cy) || 1;
          if (dc < R) {
            const prox = 1 - dc / R;
            const nx = cx / dc;
            const ny = cy / dc;
            // wake: drag along cursor direction
            fx += vel.x * wakeK * prox;
            fy += vel.y * wakeK * prox;
            // vortex: tangential swirl, direction follows cursor motion
            const dir = vel.x * -ny + vel.y * nx >= 0 ? 1 : -1;
            fx += -ny * swirlK * prox * dir;
            fy += nx * swirlK * prox * dir;
            // soft parting repulsion (stronger when moving fast)
            const repel = prox * (0.25 + Math.min(1.2, speed * 0.03));
            fx += nx * repel;
            fy += ny * repel;
          }
        }

        // click shockwaves
        for (const r of ripples) {
          const age = (now2 - r.born) / 1000;
          const radius = age * 780; // px/s
          const rx = p.x - r.x;
          const ry = p.y - r.y;
          const rd = Math.hypot(rx, ry) || 1;
          const band = Math.abs(rd - radius);
          if (band < 46) {
            const push = (1 - band / 46) * Math.max(0, 1 - age / 1.1) * 3.2;
            fx += (rx / rd) * push;
            fy += (ry / rd) * push;
          }
        }

        p.vx = (p.vx + fx) * 0.9; // viscous damping
        p.vy = (p.vy + fy) * 0.9;
        const sp = Math.hypot(p.vx, p.vy);
        const max = 7;
        if (sp > max) {
          p.vx = (p.vx / sp) * max;
          p.vy = (p.vy / sp) * max;
        }
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -5) p.x = w + 5;
        else if (p.x > w + 5) p.x = -5;
        if (p.y < -5) p.y = h + 5;
        else if (p.y > h + 5) p.y = -5;

        ctx.fillStyle = pal[p.c];
        ctx.fillRect(p.x, p.y, 1.5, 1.5);
      }
      ctx.globalCompositeOperation = 'source-over';

      ripples = ripples.filter((r) => (now2 - r.born) / 1000 < 1.15);

      raf = requestAnimationFrame(frame);
    };

    const renderStatic = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const pal = isDarkRef.current ? darkPalette : lightPalette;
      for (const p of particles) {
        ctx.fillStyle = pal[p.c];
        ctx.fillRect(p.x, p.y, 1.5, 1.5);
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    resize();
    attractor.x = w / 2;
    attractor.y = h / 2;
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });

    if (reduced) renderStatic();
    else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, opacity: isDark ? 0.75 : 0.65 }}
    />
  );
}
