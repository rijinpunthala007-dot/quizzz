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

  // Initialize canvas-confetti instance
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
      let shapes: confetti.Shape[] = ['square', 'circle', 'star'];
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

      // POP 1: Two party-popper cannons from bottom-left and bottom-right corners
      fire({
        particleCount: 85,
        angle: 60,
        spread: 70,
        startVelocity: 55,
        origin: { x: 0.05, y: 0.95 },
        colors: CELEBRATION_COLORS,
        shapes: shapes,
        ticks: 280,
        gravity: 0.85,
      });

      fire({
        particleCount: 85,
        angle: 120,
        spread: 70,
        startVelocity: 55,
        origin: { x: 0.95, y: 0.95 },
        colors: CELEBRATION_COLORS,
        shapes: shapes,
        ticks: 280,
        gravity: 0.85,
      });

      // POP 2: 400ms later - Wide fan burst from bottom-center behind winner card
      const t1 = setTimeout(() => {
        if (document.hidden) return;
        fire({
          particleCount: 75,
          angle: 90,
          spread: 120,
          startVelocity: 50,
          origin: { x: 0.5, y: 0.78 },
          colors: GOLD_WHITE_COLORS,
          shapes: ['circle', 'star'],
          ticks: 260,
          gravity: 0.8,
        });
      }, 400);
      timeoutsRef.current.push(t1);

      // POP 3: 900ms later - Emoji confetti (🎉 ⭐ ✨) floating up and out
      const t2 = setTimeout(() => {
        if (document.hidden) return;
        fire({
          particleCount: 15,
          angle: 90,
          spread: 80,
          startVelocity: 40,
          origin: { x: 0.5, y: 0.65 },
          shapes: emojiShapes.length > 0 ? emojiShapes : ['star'],
          scalar: 2,
          ticks: 300,
          gravity: 0.5,
        });
      }, 900);
      timeoutsRef.current.push(t2);

      // RAIN: Gentle golden and white confetti rain falling from top for 10 seconds
      const t3 = setTimeout(() => {
        if (document.hidden) return;
        let elapsed = 0;
        rainIntervalRef.current = setInterval(() => {
          if (document.hidden) return;
          elapsed += 1200;
          if (elapsed >= 10000) {
            if (rainIntervalRef.current) {
              clearInterval(rainIntervalRef.current);
              rainIntervalRef.current = null;
            }
            // Start AMBIENT LOOP after rain finishes
            startAmbientLoop();
            return;
          }

          fire({
            particleCount: 8,
            spread: 60,
            startVelocity: 16,
            origin: { x: 0.2 + Math.random() * 0.6, y: -0.02 },
            colors: GOLD_WHITE_COLORS,
            shapes: ['circle', 'star'],
            ticks: 240,
            gravity: 0.35,
            drift: Math.sin(Date.now() / 1000) * 0.5,
            scalar: 0.9,
          });
        }, 1200);
      }, 1600);
      timeoutsRef.current.push(t3);
    };

    // AMBIENT LOOP: every 12 seconds a smaller double pop from both bottom corners (~40 particles each)
    const startAmbientLoop = () => {
      ambientIntervalRef.current = setInterval(() => {
        if (document.hidden) return;
        fire({
          particleCount: 38,
          angle: 60,
          spread: 55,
          startVelocity: 48,
          origin: { x: 0.08, y: 0.95 },
          colors: CELEBRATION_COLORS,
          ticks: 240,
          gravity: 0.85,
        });

        fire({
          particleCount: 38,
          angle: 120,
          spread: 55,
          startVelocity: 48,
          origin: { x: 0.92, y: 0.95 },
          colors: CELEBRATION_COLORS,
          ticks: 240,
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

    return () => {
      clearAllTimers();
    };
  }, [trigger, soundEnabled, delayStartMs, isReducedMotion, isLite]);

  if (isReducedMotion || isLite) return null;

  return (
    <canvas
      ref={canvasRef}
      width={1920}
      height={1080}
      data-testid="celebrate-confetti-canvas"
      className="absolute inset-0 pointer-events-none z-50 w-full h-full"
    />
  );
}

