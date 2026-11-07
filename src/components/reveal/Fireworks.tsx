import { useEffect, useRef } from 'react';

interface FireworksProps {
  active: boolean;
  trigger?: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  radius: number;
}

const GOLD_SPARK_COLORS = ['#FFFFFF', '#FEF08A', '#FDE047', '#FBBF24', '#F59E0B'];

export default function Fireworks({ active, trigger }: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const sparksRef = useRef<Spark[]>([]);

  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isLite =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('lite') === '1';

  useEffect(() => {
    if (!active || isReducedMotion || isLite) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      sparksRef.current = [];
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create 4 firework bursts behind the center card area (x: 0.38 to 0.62, y: 0.28 to 0.48)
    const createBurst = (cx: number, cy: number, count = 35) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 5.5;
        sparksRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: GOLD_SPARK_COLORS[Math.floor(Math.random() * GOLD_SPARK_COLORS.length)],
          alpha: 1,
          decay: 0.012 + Math.random() * 0.016,
          radius: 1.5 + Math.random() * 2,
        });
      }
    };

    // Stagger 4 bursts
    const bursts = [
      { delay: 100, x: 0.5, y: 0.32 },
      { delay: 450, x: 0.42, y: 0.38 },
      { delay: 750, x: 0.58, y: 0.36 },
      { delay: 1100, x: 0.5, y: 0.44 },
    ];

    const timers = bursts.map((b) =>
      setTimeout(() => {
        if (!document.hidden) {
          createBurst(canvas.width * b.x, canvas.height * b.y, 38);
        }
      }, b.delay)
    );

    let lastTime = performance.now();
    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.67, 2);
      lastTime = time;

      if (!document.hidden) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const sparks = sparksRef.current;
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.vy += 0.06 * dt; // soft gravity
          s.vx *= 0.985;
          s.alpha -= s.decay * dt;

          if (s.alpha <= 0) {
            sparks.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = Math.max(0, s.alpha);
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      if (sparksRef.current.length > 0) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      timers.forEach((t) => clearTimeout(t));
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      sparksRef.current = [];
    };
  }, [active, trigger, isReducedMotion, isLite]);

  if (isReducedMotion || isLite || !active) return null;

  return (
    <canvas
      ref={canvasRef}
      width={1920}
      height={1080}
      data-testid="reveal-fireworks-canvas"
      className="absolute inset-0 pointer-events-none z-15"
    />
  );
}

