import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { QuizState } from '../../types';
import RevealCard from './RevealCard';
import Countdown from './Countdown';
import Fireworks from './Fireworks';
import Confetti from './Confetti';
import { useReveal } from './useReveal';

interface RevealStageProps {
  state: QuizState;
}

export default function RevealStage({ state }: RevealStageProps) {
  const { reveal, isDemo, secondsRemaining, advance, retreat, exit } = useReveal(state);
  const step = reveal?.step ?? 0;
  const snapshot = useMemo(() => reveal?.snapshot ?? [], [reveal?.snapshot]);

  const [hasCountedDown, setHasCountedDown] = useState(false);

  // Group teams by rank from frozen snapshot
  const firstPlace = useMemo(() => snapshot.filter((t) => t.rank === 1), [snapshot]);
  const secondPlace = useMemo(() => snapshot.filter((t) => t.rank === 2), [snapshot]);
  const thirdPlace = useMemo(() => snapshot.filter((t) => t.rank === 3), [snapshot]);

  // Reset countdown completed state when step moves away from 3
  useEffect(() => {
    if (step !== 3) {
      setHasCountedDown(false);
    }
  }, [step]);

  const shouldRunCountdown = step === 3 && Boolean(reveal?.countdown) && !hasCountedDown;

  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isLite =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('lite') === '1';

  return (
    <div
      data-testid="reveal-stage"
      className="relative w-[1920px] h-[1080px] overflow-hidden flex flex-col justify-between select-none bg-[#250f6d] text-white"
    >
      {/* 1. ATMOSPHERIC SPOTLIGHTS & LIGHT BEAMS */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Step 0: Soft Light Beams from the top */}
        {step === 0 && !isReducedMotion && !isLite && (
          <div className="golden-rays absolute inset-0 opacity-20 pointer-events-none" />
        )}

        {/* Step 3: Golden Spotlight Beam descending onto center */}
        {step === 3 && !isReducedMotion && !isLite && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-1000 z-5"
            style={{
              background:
                'radial-gradient(ellipse 700px 900px at 50% 0%, rgba(251, 191, 36, 0.3) 0%, rgba(251, 191, 36, 0.08) 50%, transparent 75%)',
            }}
          />
        )}

        {/* Step 4: Golden celebratory ambient glow */}
        {step === 4 && (
          <div
            className="absolute inset-0 pointer-events-none z-5"
            style={{
              background:
                'radial-gradient(circle 800px at 50% 45%, rgba(251, 191, 36, 0.18) 0%, transparent 70%)',
            }}
          />
        )}
      </div>

      {/* 2. TOP HEADER BAR */}
      <header className="w-full h-16 px-12 bg-[#251070]/85 backdrop-blur-xl border-b border-white/10 flex items-center justify-between shrink-0 shadow-md z-20">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-indigo-950 shadow-[0_0_16px_rgba(251,191,36,0.35)] shrink-0">
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: '"FILL" 1' }}>
              emoji_events
            </span>
          </div>
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-2">
              <span className="font-outfit text-xl text-white font-black tracking-wide uppercase drop-shadow-sm">
                {state.title || 'VERSE UP'}
              </span>
              <span className="font-outfit text-xs text-indigo-950 bg-amber-400 px-1.5 py-0.5 rounded font-black shadow-sm">
                2026
              </span>
            </div>
            <span className="font-outfit text-[11px] text-purple-200 tracking-wider uppercase font-semibold mt-1">
              Winners Reveal Ceremony
            </span>
          </div>
        </div>

        {/* Center: Stage Step Progress Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
            {[
              { idx: 0, label: 'Intro' },
              { idx: 1, label: '3rd Place' },
              { idx: 2, label: 'Runner-up' },
              { idx: 3, label: 'Winner' },
              { idx: 4, label: 'Championship Podium' },
            ].map(({ idx, label }) => (
              <div
                key={idx}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-outfit font-bold transition-all ${
                  step === idx
                    ? 'bg-amber-400 text-indigo-950 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : step > idx
                    ? 'bg-white/20 text-white/90'
                    : 'text-white/40'
                }`}
              >
                <span>{idx}</span>
                <span className="hidden md:inline">{label}</span>
              </div>
            ))}
          </div>

          {/* Auto Advance Timer Indicator */}
          {(reveal?.mode === 'auto' || isDemo) && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 font-outfit text-xs font-black">
              <span className="material-symbols-outlined text-sm animate-spin">timer</span>
              <span>Next in {secondsRemaining}s</span>
            </div>
          )}
        </div>

        {/* Right: Navigation Shortcuts & Exit */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={retreat}
            disabled={step === 0}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white font-outfit text-xs font-bold transition-all border border-white/15"
            title="Previous Step (Left Arrow)"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={advance}
            disabled={step === 4 && !isDemo}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:pointer-events-none text-indigo-950 font-outfit text-xs font-black tracking-wider uppercase transition-all shadow-[0_0_12px_rgba(251,191,36,0.35)]"
            title="Next Step (Space or Right Arrow)"
          >
            Next Step →
          </button>
          <button
            type="button"
            onClick={exit}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500 hover:text-white text-white/80 font-outfit text-xs font-bold transition-all border border-white/15"
            title="Exit Reveal (Esc)"
          >
            Exit
          </button>
        </div>
      </header>

      {/* 3. HERO RIBBON BANNER */}
      <div className="w-full flex flex-col items-center text-center shrink-0 pt-4 pb-2 px-12 z-20">
        <div className="relative flex items-center justify-center w-full max-w-2xl">
          <div className="banner-ribbon px-20 py-3 w-full text-center flex flex-col items-center justify-center backdrop-blur-md">
            <h1 className="font-cinzel text-4xl md:text-5xl text-white tracking-widest font-black uppercase drop-shadow-md m-0 p-0">
              {step === 4 ? 'CONGRATULATIONS' : 'FINAL RESULTS'}
            </h1>
          </div>
        </div>

        <p className="font-outfit text-xl md:text-2xl text-amber-300 font-bold tracking-wide mt-2 drop-shadow">
          {step === 0
            ? 'And the champions are…'
            : step === 1
            ? 'Honoring 3rd Place Medallist'
            : step === 2
            ? 'Honoring Quiz Runner-Up'
            : step === 3
            ? 'Behold the 2026 Quiz Champions!'
            : 'Final Honours Board'}
        </p>
      </div>

      {/* 4. MAIN STAGE CONTENT (Cards / Podium / Intro) */}
      <div className="flex-1 w-full px-12 flex items-center justify-center relative min-h-0 z-20">
        {/* STEP 0: INTRO */}
        {step === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center text-center gap-6"
          >
            {/* Large Gold Trophy Icon gently pulsing (opacity & scale only) */}
            <motion.div
              animate={
                isReducedMotion || isLite
                  ? {}
                  : {
                      scale: [1, 1.06, 1],
                      opacity: [0.9, 1, 0.9],
                    }
              }
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-44 h-44 rounded-full p-6 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 shadow-[0_0_80px_rgba(251,191,36,0.6)] flex items-center justify-center text-indigo-950 border-4 border-amber-200"
            >
              <svg className="w-28 h-28 fill-current drop-shadow" viewBox="0 0 24 24">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
              </svg>
            </motion.div>

            <div className="flex flex-col items-center gap-2 max-w-xl">
              <span className="font-outfit text-2xl font-black text-amber-200 uppercase tracking-widest">
                The Final Scores Are Sealed
              </span>
              <p className="font-outfit text-lg text-purple-200/90 font-medium leading-relaxed">
                Celebrating dedication, scripture knowledge, and sportsmanship. Advancing through the podium medallists.
              </p>
            </div>

            <button
              type="button"
              onClick={advance}
              className="mt-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-amber-300 hover:to-yellow-200 text-indigo-950 font-outfit text-lg font-black tracking-widest uppercase shadow-[0_0_30px_rgba(251,191,36,0.6)] transition-all transform hover:scale-105 cursor-pointer border border-amber-200"
            >
              Begin Winners Reveal →
            </button>
          </motion.div>
        )}

        {/* STEP 1: 3RD PLACE ONLY */}
        {step === 1 && (
          <div className="w-full flex items-center justify-center gap-8">
            {thirdPlace.length === 0 ? (
              <div className="text-center font-outfit text-xl text-purple-200">
                No 3rd place registered.
              </div>
            ) : (
              thirdPlace.map((t) => (
                <RevealCard
                  key={t.id}
                  team={t}
                  rank={3}
                  step={1}
                  isTied={thirdPlace.length > 1}
                  compact={thirdPlace.length > 1}
                />
              ))
            )}
          </div>
        )}

        {/* STEP 2: 2ND PLACE + 3RD PLACE (DIMMED) */}
        {step === 2 && (
          <div className="w-full flex items-end justify-center gap-12 max-w-6xl">
            {/* 2nd Place (Silver) rises on the left */}
            <div className="flex items-center gap-6">
              {secondPlace.map((t) => (
                <RevealCard
                  key={t.id}
                  team={t}
                  rank={2}
                  step={2}
                  isTied={secondPlace.length > 1}
                  compact={secondPlace.length > 1}
                />
              ))}
            </div>

            {/* 3rd Place (Bronze) remains visible on the right, slightly dimmed */}
            <div className="flex items-center gap-6">
              {thirdPlace.map((t) => (
                <RevealCard
                  key={t.id}
                  team={t}
                  rank={3}
                  step={2}
                  dimmed={true}
                  isTied={thirdPlace.length > 1}
                  compact={thirdPlace.length > 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: WINNER HERO REVEAL */}
        {step === 3 && (
          <div className="relative w-full flex items-center justify-center">
            {/* Countdown overlay if active */}
            {shouldRunCountdown ? (
              <Countdown
                soundEnabled={Boolean(reveal?.sound)}
                onComplete={() => setHasCountedDown(true)}
              />
            ) : (
              <div className="flex items-center justify-center gap-8 z-20">
                {firstPlace.map((t) => (
                  <RevealCard
                    key={t.id}
                    team={t}
                    rank={1}
                    step={3}
                    isTied={firstPlace.length > 1}
                    compact={firstPlace.length > 1}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: FINAL PODIUM RESTING SCREEN (2nd | 1st | 3rd) */}
        {step === 4 && (
          <div
            data-testid="reveal-final-podium"
            className="w-full flex items-end justify-center gap-8 max-w-7xl pb-2"
          >
            {/* 2nd Place Medallist(s) on Left */}
            <div className="flex items-end gap-4 shrink-0">
              {secondPlace.map((t) => (
                <RevealCard
                  key={t.id}
                  team={t}
                  rank={2}
                  step={4}
                  isTied={secondPlace.length > 1}
                  compact={secondPlace.length > 1 || firstPlace.length > 1}
                />
              ))}
            </div>

            {/* 1st Place Medallist(s) in Center */}
            <div className="flex items-end gap-4 shrink-0">
              {firstPlace.map((t) => (
                <RevealCard
                  key={t.id}
                  team={t}
                  rank={1}
                  step={4}
                  isTied={firstPlace.length > 1}
                  compact={firstPlace.length > 1}
                />
              ))}
            </div>

            {/* 3rd Place Medallist(s) on Right */}
            <div className="flex items-end gap-4 shrink-0">
              {thirdPlace.map((t) => (
                <RevealCard
                  key={t.id}
                  team={t}
                  rank={3}
                  step={4}
                  isTied={thirdPlace.length > 1}
                  compact={thirdPlace.length > 1 || firstPlace.length > 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. FOOTER SCRIPTURE VERSE */}
      <footer className="w-full px-12 py-3.5 bg-[#251070]/90 backdrop-blur-md border-t border-white/10 flex items-center justify-between shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 text-lg">✝</span>
          <p className="font-outfit text-sm md:text-base text-purple-100 italic tracking-wide">
            &ldquo;Well done, thou good and faithful servant.&rdquo;
            <span className="text-amber-300 font-bold not-italic ml-2">— Matthew 25:21</span>
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-outfit text-purple-200 uppercase tracking-widest font-semibold">
          <span>Final Championship Standings</span>
          <span className="text-amber-400">★</span>
          <span>Official Results Verified</span>
        </div>
      </footer>

      {/* 6. PARTICLE CANVASES (Confetti & Fireworks) */}
      <Fireworks
        active={step === 3 && hasCountedDown}
        trigger={reveal?.lastBurstTimestamp}
      />
      <Confetti
        step={step}
        trigger={reveal?.lastBurstTimestamp}
      />
    </div>
  );
}
