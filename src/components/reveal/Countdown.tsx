import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playCountdownTick } from './sound';

interface CountdownProps {
  soundEnabled?: boolean;
  onComplete: () => void;
}

export default function Countdown({ soundEnabled = false, onComplete }: CountdownProps) {
  const [currentNum, setCurrentNum] = useState<number>(3);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (soundEnabled) {
      playCountdownTick(3);
    }

    const t1 = setTimeout(() => {
      setCurrentNum(2);
      if (soundEnabled) playCountdownTick(2);
    }, 1000);

    const t2 = setTimeout(() => {
      setCurrentNum(1);
      if (soundEnabled) playCountdownTick(1);
    }, 2000);

    const t3 = setTimeout(() => {
      if (soundEnabled) playCountdownTick(0);
      onCompleteRef.current();
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [soundEnabled]);

  return (
    <div
      data-testid="reveal-countdown"
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
    >
      <div className="font-outfit text-xl uppercase tracking-[0.35em] text-amber-300 font-black drop-shadow mb-4">
        CHAMPION ANNOUNCEMENT IN
      </div>

      <div className="relative w-48 h-48 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentNum}
            initial={isReducedMotion ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
            animate={
              isReducedMotion
                ? { opacity: 1 }
                : {
                    scale: [0.7, 1.25, 1.0],
                    opacity: [0, 1, 0.9],
                  }
            }
            exit={isReducedMotion ? { opacity: 0 } : { scale: 1.4, opacity: 0 }}
            transition={{
              duration: 0.9,
              ease: 'easeOut',
            }}
            className="font-cinzel text-9xl md:text-[140px] text-amber-300 font-black tabular-nums drop-shadow-[0_0_50px_rgba(251,191,36,0.9)]"
          >
            {currentNum}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center gap-2">
        {[3, 2, 1].map((n) => (
          <div
            key={n}
            className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
              n >= currentNum
                ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] scale-110'
                : 'bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

