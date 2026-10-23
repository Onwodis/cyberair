'use client';

import { useEffect, useRef } from 'react';

/**
 * Cursor-reactive particle constellation on a full-screen canvas.
 *
 * - Infinite, GPU-light 2D animation with a pseudo-3D depth parallax.
 * - A smoothed "focus" point eases toward the cursor over ~0.5s; nearby
 *   particles are gently pulled toward it and linked with glowing lines, so the
 *   swarm appears to follow the pointer.
 * - Recolours with the theme and fully halts under prefers-reduced-motion.
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
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      z: number; // depth 0.3..1
    };
    let particles: P[] = [];

    const COUNT = () => {
      const base = Math.round((w * h) / 16000);
      return Math.max(40, Math.min(reduced ? 50 : 150, base));
    };

    const seed = () => {
      particles = Array.from({ length: COUNT() }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        z: 0.3 + Math.random() * 0.7,
      }));
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    // Pointer + eased focus point (time constant ~0.5s).
    const pointer = { x: -9999, y: -9999, active: false };
    const focus = { x: -9999, y: -9999 };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };

    const colors = () => {
      const d = isDarkRef.current;
      return {
        dot: d ? 'rgba(34,211,238,' : 'rgba(8,145,178,',
        line: d ? 'rgba(52,211,153,' : 'rgba(13,148,136,',
        cursor: d ? 'rgba(168,85,247,' : 'rgba(147,51,234,',
      };
    };

    let last = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Ease focus toward pointer: fraction = 1 - e^(-dt/0.5)
      const k = 1 - Math.exp(-dt / 0.5);
      if (pointer.active) {
        if (focus.x < -1000) {
          focus.x = pointer.x;
          focus.y = pointer.y;
        } else {
          focus.x += (pointer.x - focus.x) * k;
          focus.y += (pointer.y - focus.y) * k;
        }
      }

      ctx.clearRect(0, 0, w, h);
      const c = colors();
      const linkDist = 130;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // drift
        p.x += p.vx * p.z;
        p.y += p.vy * p.z;

        // cursor attraction + subtle swirl within radius
        if (pointer.active) {
          const dx = focus.x - p.x;
          const dy = focus.y - p.y;
          const dist2 = dx * dx + dy * dy;
          const R = 240;
          if (dist2 < R * R) {
            const dist = Math.sqrt(dist2) || 1;
            const pull = (1 - dist / R) * 0.6 * p.z;
            p.vx += (dx / dist) * pull * 0.08;
            p.vy += (dy / dist) * pull * 0.08;
            // swirl
            p.vx += (-dy / dist) * pull * 0.03;
            p.vy += (dx / dist) * pull * 0.03;
          }
        }

        // damping + gentle speed cap
        p.vx *= 0.97;
        p.vy *= 0.97;
        const sp = Math.hypot(p.vx, p.vy);
        const max = 1.4;
        if (sp > max) {
          p.vx = (p.vx / sp) * max;
          p.vy = (p.vy / sp) * max;
        }
        // keep a little base drift alive
        if (sp < 0.05) {
          p.vx += (Math.random() - 0.5) * 0.1;
          p.vy += (Math.random() - 0.5) * 0.1;
        }

        // wrap
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        // draw dot (size/alpha by depth)
        const r = p.z * 1.8 + 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `${c.dot}${(0.25 + p.z * 0.5).toFixed(2)})`;
        ctx.fill();

        // links to neighbours
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < linkDist * linkDist) {
            const a = (1 - Math.sqrt(d2) / linkDist) * 0.22;
            ctx.strokeStyle = `${c.line}${a.toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        // glowing link to cursor focus
        if (pointer.active) {
          const dx = p.x - focus.x;
          const dy = p.y - focus.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 150 * 150) {
            const a = (1 - Math.sqrt(d2) / 150) * 0.5;
            ctx.strokeStyle = `${c.cursor}${a.toFixed(3)})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(focus.x, focus.y);
            ctx.stroke();
          }
        }
      }

      // cursor halo
      if (pointer.active) {
        const g = ctx.createRadialGradient(
          focus.x,
          focus.y,
          0,
          focus.x,
          focus.y,
          120
        );
        g.addColorStop(0, `${c.cursor}0.12)`);
        g.addColorStop(1, `${c.cursor}0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(focus.x, focus.y, 120, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    if (reduced) {
      // Single static render, no loop.
      ctx.clearRect(0, 0, w, h);
      const c = colors();
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.z * 1.8 + 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `${c.dot}${(0.25 + p.z * 0.5).toFixed(2)})`;
        ctx.fill();
      }
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
