import { useEffect, useRef, useState, useCallback } from 'react';
import type { QuizState } from '../../types';
import {
  nextRevealStep,
  prevRevealStep,
  exitReveal,
  setRevealStep,
} from '../../store';
import { playSoftChime, playWinnerSwell } from './sound';

export function useReveal(state: QuizState) {
  const reveal = state.reveal;
  const isDemo =
    typeof window !== 'undefined' &&
    window.location.search.includes('demo=1') &&
    window.location.search.includes('reveal=1');

  const autoSeconds = isDemo ? 5 : 8;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(autoSeconds);
  const prevStepRef = useRef<number | null>(reveal?.step ?? null);

  // Keyboard navigation on Projector: Space or ArrowRight -> next, ArrowLeft -> back, Esc -> exit
  useEffect(() => {
    if (!reveal?.active && !isDemo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextRevealStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevRevealStep();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        exitReveal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reveal?.active, isDemo]);

  // Audio cues on step changes
  useEffect(() => {
    if (!reveal?.active) return;
    const currentStep = reveal.step;

    if (prevStepRef.current !== currentStep) {
      prevStepRef.current = currentStep;
      if (reveal.sound) {
        if (currentStep === 3) {
          playWinnerSwell();
        } else if (currentStep > 0) {
          playSoftChime(659.25 + currentStep * 60, 1.2);
        } else {
          playSoftChime(523.25, 1.5);
        }
      }
    }
  }, [reveal?.step, reveal?.sound, reveal?.active]);

  // Auto-advance mode timer (every 8s, or 5s for demo)
  useEffect(() => {
    if (!reveal?.active) return;
    if (reveal.mode !== 'auto' && !isDemo) return;

    setSecondsRemaining(autoSeconds);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Time to advance!
          if (reveal.step < 4) {
            nextRevealStep();
          } else if (isDemo) {
            // Loop demo back to intro
            setRevealStep(0);
          }
          return autoSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [reveal?.active, reveal?.mode, reveal?.step, isDemo, autoSeconds]);

  // Helper actions
  const advance = useCallback(() => nextRevealStep(), []);
  const retreat = useCallback(() => prevRevealStep(), []);
  const exit = useCallback(() => exitReveal(), []);

  return {
    reveal,
    isDemo,
    secondsRemaining,
    advance,
    retreat,
    exit,
  };
}

