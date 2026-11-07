import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiProps {
  step: 0 | 1 | 2 | 3 | 4;
  trigger?: number; // timestamp when burst is triggered
}

const CELEBRATION_PALETTE = [
  '#f2c94c', // gold
  '#fcd968', // light gold
  '#ffffff', // white
  '#e0e7ff', // soft lavender-white
  '#c4b5fd', // lavender
  '#8b5cf6', // violet
];

const GOLD_RAIN_PALETTE = ['#f2c94c', '#fcd968', '#fef08a', '#ffffff'];

export default function Confetti({ step, trigger }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<confetti.CreateTypes | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRainTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFiredTriggerRef = useRef<number | null>(null);

  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isLite =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('lite') === '1';

  // Initialize canvas-confetti instance bounded to this 1920x1080 stage
  useEffect(() => {
    if (!canvasRef.current || isReducedMotion || isLite) return;

    const myConfetti = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: false,
    });
    confettiRef.current = myConfetti;

    return () => {
      myConfetti.reset();
      confettiRef.current = null;
    };
  }, [isReducedMotion, isLite]);

  // Handle bursts and drifting showers
  useEffect(() => {
    const fire = confettiRef.current;
    if (!fire || isReducedMotion || isLite) return;

    // Clear any ongoing loops from prior steps
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (stopRainTimeoutRef.current) {
      clearTimeout(stopRainTimeoutRef.current);
      stopRainTimeoutRef.current = null;
    }

    // Step 3: Grand Winner Celebration
    if (step === 3) {
      const isNewTrigger =
        trigger &&
        trigger !== lastFiredTriggerRef.current &&
        Date.now() - trigger < 6000; // don't replay burst on page reload if timestamp is old

      if (isNewTrigger) {
        lastFiredTriggerRef.current = trigger;

        // Cannons from both bottom corners (gold, white, lavender, violet)
        // Left corner cannon (60 particles)
        fire({
          particleCount: 60,
          angle: 60,
          spread: 55,
          startVelocity: 65,
          origin: { x: 0.1, y: 0.92 },
          colors: CELEBRATION_PALETTE,
          ticks: 280,
          gravity: 0.85,
        });

        // Right corner cannon (60 particles)
        fire({
          particleCount: 60,
          angle: 120,
          spread: 55,
          startVelocity: 65,
          origin: { x: 0.9, y: 0.92 },
          colors: CELEBRATION_PALETTE,
          ticks: 280,
          gravity: 0.85,
        });

        // Center golden blossom (25 particles, total <= 145 particles)
        setTimeout(() => {
          if (step !== 3 || document.hidden) return;
          fire({
            particleCount: 25,
            spread: 90,
            startVelocity: 42,
            origin: { x: 0.5, y: 0.35 },
            colors: GOLD_RAIN_PALETTE,
            shapes: ['star', 'circle'],
            ticks: 260,
            gravity: 0.7,
            scalar: 1.2,
          });
        }, 200);

        // Slow golden confetti rain for ~8 seconds
        intervalRef.current = setInterval(() => {
          if (document.hidden) return;
          fire({
            particleCount: 12,
            spread: 60,
            startVelocity: 18,
            origin: { x: 0.25 + Math.random() * 0.5, y: 0.02 },
            colors: GOLD_RAIN_PALETTE,
            shapes: ['circle', 'star'],
            ticks: 240,
            gravity: 0.45,
            scalar: 0.9,
          });
        }, 1200);

        // Stop rain after 8 seconds
        stopRainTimeoutRef.current = setTimeout(() => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }, 8000);
      }
    } else if (step === 4) {
      // Step 4: Final resting podium - calm, low-density slow confetti drift only (no bursts)
      intervalRef.current = setInterval(() => {
        if (document.hidden) return;
        fire({
          particleCount: 6,
          spread: 50,
          startVelocity: 12,
          origin: { x: 0.2 + Math.random() * 0.6, y: -0.02 },
          colors: GOLD_RAIN_PALETTE,
          ticks: 260,
          gravity: 0.4,
          scalar: 0.8,
        });
      }, 2500);
    } else {
      // Step 0, 1, 2: No confetti
      fire.reset();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (stopRainTimeoutRef.current) {
        clearTimeout(stopRainTimeoutRef.current);
        stopRainTimeoutRef.current = null;
      }
    };
  }, [step, trigger, isReducedMotion, isLite]);

  if (isReducedMotion || isLite || (step !== 3 && step !== 4)) return null;

  return (
    <canvas
      ref={canvasRef}
      width={1920}
      height={1080}
      data-testid="reveal-confetti-canvas"
      className="absolute inset-0 pointer-events-none z-30"
    />
  );
}

