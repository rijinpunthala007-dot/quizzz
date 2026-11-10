import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { playPartyPopperPop } from '../reveal/sound';

interface CelebrateConfettiProps {
  trigger?: number;
  soundEnabled?: boolean;
  delayStartMs?: number; // delay before initial entrance pop (e.g. 2100ms when 1st card lands)
}

const CELEBRATION_COLORS = [
  '#f2c94c', // gold
  '#fcd968', // amber-yellow
  '#ffffff', // white
  '#e0e7ff', // lavender
  '#f43f5e', // hot pink
  '#8b5cf6', // violet
];

const GOLD_WHITE_COLORS = ['#f2c94c', '#fcd968', '#fef08a', '#ffffff'];

export default function CelebrateConfetti({
  trigger,
  soundEnabled = false,
  delayStartMs = 2100,
}: CelebrateConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<confetti.CreateTypes | null>(null);
  const rainIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ambientIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const lastFiredTriggerRef = useRef<number | null>(null);

  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isLite =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('lite') === '1';

  // Resize canvas with DPR capped at 1.5
  useEffect(() => {
    if (!canvasRef.current || isReducedMotion || isLite) return;

    const canvas = canvasRef.current;
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const myConfetti = confetti.create(canvas, {
      resize: false,
      useWorker: false,
    });
    confettiRef.current = myConfetti;

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      myConfetti.reset();
      confettiRef.current = null;
    };
  }, [isReducedMotion, isLite]);

  // Execute sequence
  useEffect(() => {
    const fire = confettiRef.current;
    if (!fire || isReducedMotion || isLite) return;

    const clearAllTimers = () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
      if (rainIntervalRef.current) {
        clearInterval(rainIntervalRef.current);
        rainIntervalRef.current = null;
      }
      if (ambientIntervalRef.current) {
        clearInterval(ambientIntervalRef.current);
        ambientIntervalRef.current = null;
      }
    };

    const isReplay = trigger && trigger !== lastFiredTriggerRef.current;
    if (isReplay) {
      lastFiredTriggerRef.current = trigger;
    }

    clearAllTimers();

    const startPops = () => {
      if (document.hidden) return;

      if (soundEnabled) {
        playPartyPopperPop();
      }

      // Pre-compute shapes
      const shapes: confetti.Shape[] = ['square', 'circle', 'star'];
      let emojiShapes: confetti.Shape[] = [];
      try {
        if (typeof confetti.shapeFromText === 'function') {
          emojiShapes = [
            confetti.shapeFromText({ text: '🎉', scalar: 2 }),
            confetti.shapeFromText({ text: '⭐', scalar: 2 }),
            confetti.shapeFromText({ text: '✨', scalar: 2 }),
          ];
        }
      } catch {
        // fallback to standard shapes
      }

      // POP 1: Two party-popper cannons from bottom corners (capped at 60 each = 120 total)
      fire({
        particleCount: 60,
        angle: 60,
        spread: 65,
        startVelocity: 52,
        origin: { x: 0.05, y: 0.95 },
        colors: CELEBRATION_COLORS,
        shapes: shapes,
        ticks: 240,
        gravity: 0.85,
      });

      fire({
        particleCount: 60,
        angle: 120,
        spread: 65,
        startVelocity: 52,
        origin: { x: 0.95, y: 0.95 },
        colors: CELEBRATION_COLORS,
        shapes: shapes,
        ticks: 240,
        gravity: 0.85,
      });

      // POP 2: 400ms later - Wide fan burst from bottom-center behind winner card (50 particles)
      const t1 = setTimeout(() => {
        if (document.hidden) return;
        fire({
          particleCount: 50,
          angle: 90,
          spread: 110,
          startVelocity: 48,
          origin: { x: 0.5, y: 0.78 },
          colors: GOLD_WHITE_COLORS,
          shapes: ['circle', 'star'],
          ticks: 220,
          gravity: 0.8,
        });
      }, 400);
      timeoutsRef.current.push(t1);

      // POP 3: 900ms later - Emoji confetti (12 particles)
      const t2 = setTimeout(() => {
        if (document.hidden) return;
        fire({
          particleCount: 12,
          angle: 90,
          spread: 75,
          startVelocity: 38,
          origin: { x: 0.5, y: 0.65 },
          shapes: emojiShapes.length > 0 ? emojiShapes : ['star'],
          scalar: 2,
          ticks: 250,
          gravity: 0.5,
        });
      }, 900);
      timeoutsRef.current.push(t2);

      // RAIN: Gentle golden and white confetti rain falling from top for 8 seconds
      const t3 = setTimeout(() => {
        if (document.hidden) return;
        let elapsed = 0;
        rainIntervalRef.current = setInterval(() => {
          if (document.hidden) return;
          elapsed += 1200;
          if (elapsed >= 8000) {
            if (rainIntervalRef.current) {
              clearInterval(rainIntervalRef.current);
              rainIntervalRef.current = null;
            }
            startAmbientLoop();
            return;
          }

          fire({
            particleCount: 6,
            spread: 55,
            startVelocity: 15,
            origin: { x: 0.2 + Math.random() * 0.6, y: -0.02 },
            colors: GOLD_WHITE_COLORS,
            shapes: ['circle', 'star'],
            ticks: 220,
            gravity: 0.35,
            drift: Math.sin(Date.now() / 1000) * 0.4,
            scalar: 0.9,
          });
        }, 1200);
      }, 1500);
      timeoutsRef.current.push(t3);
    };

    // AMBIENT LOOP: every 12 seconds double pop from bottom corners (~28 particles each, total ~56)
    const startAmbientLoop = () => {
      ambientIntervalRef.current = setInterval(() => {
        if (document.hidden) return;
        fire({
          particleCount: 28,
          angle: 60,
          spread: 50,
          startVelocity: 44,
          origin: { x: 0.08, y: 0.95 },
          colors: CELEBRATION_COLORS,
          ticks: 220,
          gravity: 0.85,
        });

        fire({
          particleCount: 28,
          angle: 120,
          spread: 50,
          startVelocity: 44,
          origin: { x: 0.92, y: 0.95 },
          colors: CELEBRATION_COLORS,
          ticks: 220,
          gravity: 0.85,
        });
      }, 12000);
    };

    // Delay start on initial page load so winner card has landed
    const delay = isReplay ? 0 : delayStartMs;
    const initialTimer = setTimeout(() => {
      startPops();
    }, delay);
    timeoutsRef.current.push(initialTimer);

    // Pause on visibilitychange
    const handleVisChange = () => {
      if (document.hidden) {
        clearAllTimers();
      } else {
        startAmbientLoop();
      }
    };
    document.addEventListener('visibilitychange', handleVisChange);

    return () => {
      clearAllTimers();
      document.removeEventListener('visibilitychange', handleVisChange);
    };
  }, [trigger, soundEnabled, delayStartMs, isReducedMotion, isLite]);

  if (isReducedMotion || isLite) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="celebrate-confetti-canvas"
      className="fixed inset-0 pointer-events-none z-[100] w-full h-full"
    />
  );
}
