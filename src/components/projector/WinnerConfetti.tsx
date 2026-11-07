import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface WinnerConfettiProps {
  active: boolean;
}

// Church quiz metallic celebration palette: rich gold, champagne, amber, royal violet & white
const GOLD_PALETTE = ['#FFD700', '#F59E0B', '#FBBF24', '#FDE68A', '#FEF08A', '#FFFFFF'];
const ROYAL_GOLD_PALETTE = ['#FFD700', '#F59E0B', '#FBBF24', '#8B5CF6', '#A855F7', '#FFFFFF', '#6366F1'];

export default function WinnerConfetti({ active }: WinnerConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiInstanceRef = useRef<confetti.CreateTypes | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create localized canvas confetti instance inside the 1920x1080 stage
    const myConfetti = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: false,
    });
    confettiInstanceRef.current = myConfetti;

    return () => {
      myConfetti.reset();
      confettiInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const fire = confettiInstanceRef.current;
    if (!fire) return;

    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      fire.reset();
      return;
    }

    // 1. Initial Grand Winner Explosion
    // Center burst directly over the #1 Champion card (x: 0.5, y: 0.32)
    fire({
      particleCount: 100,
      spread: 90,
      startVelocity: 48,
      origin: { x: 0.5, y: 0.32 },
      colors: ROYAL_GOLD_PALETTE,
      shapes: ['star', 'circle'],
      ticks: 280,
      gravity: 0.85,
      scalar: 1.25,
    });

    // Dual flank cannons shooting inward toward the winner
    setTimeout(() => {
      if (!active) return;
      fire({
        particleCount: 65,
        angle: 60,
        spread: 60,
        startVelocity: 55,
        origin: { x: 0.28, y: 0.45 },
        colors: GOLD_PALETTE,
        ticks: 250,
        gravity: 0.9,
      });

      fire({
        particleCount: 65,
        angle: 120,
        spread: 60,
        startVelocity: 55,
        origin: { x: 0.72, y: 0.45 },
        colors: GOLD_PALETTE,
        ticks: 250,
        gravity: 0.9,
      });
    }, 250);

    // 2. Ongoing celebratory shower loop (alternating golden stars and side cannons)
    let cycle = 0;
    intervalRef.current = setInterval(() => {
      if (!confettiInstanceRef.current) return;
      cycle++;

      if (cycle % 2 === 0) {
        // Shower of gold stars directly above winner podium
        confettiInstanceRef.current({
          particleCount: 40,
          spread: 80,
          startVelocity: 35,
          origin: { x: 0.46 + Math.random() * 0.08, y: 0.2 },
          colors: GOLD_PALETTE,
          shapes: ['star'],
          ticks: 220,
          gravity: 0.75,
          scalar: 1.3,
        });
      } else {
        // Angled side streamers
        const fromLeft = Math.random() > 0.5;
        confettiInstanceRef.current({
          particleCount: 50,
          angle: fromLeft ? 65 : 115,
          spread: 65,
          startVelocity: 52,
          origin: { x: fromLeft ? 0.3 : 0.7, y: 0.42 },
          colors: ROYAL_GOLD_PALETTE,
          ticks: 240,
          gravity: 0.85,
        });
      }
    }, 1600);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      fire.reset();
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="winner-confetti-canvas"
      width={1920}
      height={1080}
      className="absolute inset-0 w-full h-full pointer-events-none z-40"
    />
  );
}

