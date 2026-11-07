import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuizStateReadOnly, setQuizFocus, toggleCelebrateWinner, startReveal } from '../../store';
import { rankTeams } from '../../utils';
import BackgroundEffects from './BackgroundEffects';
import TabBar from './TabBar';
import Podium from './Podium';
import RankList from './RankList';
import BibleVerseFooter from './BibleVerseFooter';
import EmptyState from './EmptyState';
import WinnerConfetti from './WinnerConfetti';
import DevOverflowChecker from './DevOverflowChecker';
import RevealStage from '../reveal/RevealStage';
import WinnersCelebrationStage from '../celebrate/WinnersCelebrationStage';

const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;

export default function ProjectorView() {
  const state = useQuizStateReadOnly();
  const stageRef = useRef<HTMLDivElement>(null);

  // Responsive scale to fit window exactly
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : STAGE_WIDTH,
    height: typeof window !== 'undefined' ? window.innerHeight : STAGE_HEIGHT,
  });

  const isLight = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('theme') === 'light';
  const isLite = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('lite') === '1' || state.teams.length > 30);

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hide cursor after 3s of inactivity
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const hide = () => {
      document.body.style.cursor = 'none';
    };
    const show = () => {
      document.body.style.cursor = '';
      clearTimeout(timer);
      timer = setTimeout(hide, 3000);
    };

    window.addEventListener('mousemove', show);
    timer = setTimeout(hide, 3000);

    return () => {
      window.removeEventListener('mousemove', show);
      clearTimeout(timer);
      document.body.style.cursor = '';
    };
  }, []);

  // Keyboard shortcut: Press 'C' to toggle Winner Celebration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        toggleCelebrateWinner();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasTeams = state.teams.length > 0;
  const disableAnimation = state.teams.length > 30 || isLite;

  // Rank teams using data model focus and tie handling
  const ranked = useMemo(() => {
    return rankTeams(state);
  }, [state]);

  // Scale stage to fit viewport centered
  const scale = Math.min(
    viewport.width / STAGE_WIDTH,
    viewport.height / STAGE_HEIGHT
  );

  const titleUpper = (state.title || 'VERSE UP BIBLE QUIZ 2026').toUpperCase();
  const isRevealUrl = typeof window !== 'undefined' && window.location.search.includes('reveal=1');
  const isRevealActive = Boolean(state.reveal?.active) || isRevealUrl;

  return (
    <div
      data-theme={isLight ? 'light' : undefined}
      className="w-screen h-screen overflow-hidden flex items-center justify-center relative select-none bg-[#250f6d] text-white"
    >
      {/* Dynamic Atmospheric Radial Background & Glows */}
      <BackgroundEffects isLight={isLight} />

      {/* 
        STAGE:
        Exactly 1920x1080px, centred, scaled with transform: scale(min(w/1920, h/1080)), overflow hidden.
      */}
      <div
        ref={stageRef}
        data-testid="projector-stage"
        style={{
          width: `${STAGE_WIDTH}px`,
          height: `${STAGE_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="relative z-10 overflow-hidden shrink-0 flex flex-col justify-between"
      >
        {state.celebrateWinner ? (
          <WinnersCelebrationStage state={state} />
        ) : isRevealActive ? (
          <RevealStage state={state} />
        ) : (
          <>
            {/* TOP BAR (Stitch Header) */}
            <header className="w-full h-16 px-12 bg-[#251070]/85 backdrop-blur-xl border-b border-white/10 flex items-center justify-between shrink-0 shadow-md">
              {/* Left: Book Icon + Brand */}
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-indigo-950 shadow-[0_0_16px_rgba(251,191,36,0.35)] shrink-0">
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                    menu_book
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
                    Bible Quiz 2026
                  </span>
                </div>
              </div>

              {/* Right: Quiz Championship Badge & Buttons */}
              <div className="flex items-center gap-3.5">
                <div className="flex flex-col items-end leading-none">
                  <div className="flex items-center gap-2">
                    <span className="font-outfit text-xl text-white font-black tracking-wide uppercase drop-shadow-sm">
                      VERSE UP
                    </span>
                    <span className="font-outfit text-xs text-indigo-950 bg-amber-400 px-1.5 py-0.5 rounded font-black shadow-sm">
                      2026
                    </span>
                  </div>
                  <span className="font-outfit text-[11px] text-purple-200 tracking-wider uppercase font-semibold mt-1">
                    Bible Quiz Championship
                  </span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-indigo-950 shadow-[0_0_16px_rgba(251,191,36,0.35)] shrink-0">
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                    menu_book
                  </span>
                </div>

                {/* Winners Reveal Button */}
                <button
                  type="button"
                  onClick={() => startReveal()}
                  data-testid="projector-reveal-btn"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-outfit text-xs font-black tracking-wider uppercase transition-all shadow-md cursor-pointer bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-indigo-950 border border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                  title="Launch Winners Reveal Ceremony on Projector"
                >
                  <span>🏆 Reveal</span>
                </button>

                {/* Celebrate Winner Button */}
                <button
                  type="button"
                  onClick={() => toggleCelebrateWinner()}
                  data-testid="projector-celebrate-btn"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-outfit text-xs font-black tracking-wider uppercase transition-all shadow-md cursor-pointer ${
                    state.celebrateWinner
                      ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse border border-rose-300'
                      : 'bg-amber-400 hover:bg-amber-300 text-indigo-950 border border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                  }`}
                  title="Toggle Winner Celebration & Confetti (or press C on keyboard)"
                >
                  <span>{state.celebrateWinner ? '🛑 Stop' : '🎉 Celebrate'}</span>
                </button>

                {/* Open Admin Panel Button */}
                <a
                  href="/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="open-admin-button"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-indigo-950 border border-white/20 hover:border-amber-400 text-white font-outfit text-xs font-black tracking-wider uppercase transition-all shadow-md group cursor-pointer ml-1"
                  title="Open Admin Panel (opens in a new tab)"
                >
                  <span className="material-symbols-outlined text-[18px] text-amber-400 group-hover:text-indigo-950 transition-colors">
                    admin_panel_settings
                  </span>
                  <span>Admin Panel</span>
                  <span className="text-xs opacity-75 group-hover:opacity-100 font-bold">↗</span>
                </a>
              </div>
            </header>

            {/* HERO RIBBON & LEVEL FILTER TABS */}
            <div className="w-full flex flex-col items-center text-center shrink-0 pt-2 pb-1.5 px-12">
              {/* Quiz Eyebrow Star Ribbon */}
              <div className="inline-flex items-center gap-2 px-6 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 font-outfit text-xs tracking-[0.25em] uppercase font-black drop-shadow shadow-[0_0_16px_rgba(251,191,36,0.35)] mb-1.5">
                <span className="text-amber-400">★</span>
                <span>{titleUpper}</span>
                <span className="text-amber-400">★</span>
              </div>

              {/* Stylized Championship Banner Ribbon */}
              <div className="relative flex items-center justify-center w-full max-w-xl mb-2">
                <div className="banner-ribbon px-16 py-2.5 w-full text-center flex flex-col items-center justify-center backdrop-blur-md">
                  <h1 className="font-cinzel text-3xl md:text-4xl text-white tracking-widest font-black uppercase drop-shadow-md m-0 p-0">
                    LEADERBOARD
                  </h1>
                </div>
              </div>

              {/* Segmented Filter Bar (Interactive Live Tabs) */}
              <TabBar levels={state.levels} activeTab={state.focus} onTabChange={setQuizFocus} />
            </div>

            {/* TOP 3 CHAMPIONSHIP PODIUM */}
            <div className="w-full px-12 flex justify-center shrink-0 pt-3 pb-1.5">
              {!hasTeams ? (
                <EmptyState />
              ) : (
                <Podium
                  teams={ranked}
                  levels={state.levels}
                  allTeams={state.teams}
                  focus={state.focus}
                  disableAnimation={disableAnimation}
                  isCelebrating={Boolean(state.celebrateWinner)}
                />
              )}
            </div>

            {/* LOWER STANDINGS (#4+) CURVED SHEET CONTAINER */}
            <div className="w-full px-8 shrink-0 flex-1 flex flex-col justify-end min-h-0 pt-2">
              <section className="curved-sheet w-full px-8 pt-5 pb-4 flex flex-col justify-between shadow-2xl overflow-hidden flex-1 min-h-0">
                {/* List Table */}
                {!hasTeams ? (
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center py-6">
                    <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                      <p className="font-outfit text-white/70 text-sm md:text-base font-semibold tracking-wider uppercase">
                        Group standings and round totals will appear here live
                      </p>
                    </div>
                  </div>
                ) : (
                  <RankList
                    teams={ranked}
                    levels={state.levels}
                    allTeams={state.teams}
                    focus={state.focus}
                    disableAnimation={disableAnimation}
                  />
                )}

                {/* Bottom Scripture Box & Status */}
                <div className="w-full pt-3">
                  <BibleVerseFooter
                    teams={ranked}
                    levels={state.levels}
                    focus={state.focus}
                  />
                </div>
              </section>
            </div>

            {/* Animated Confetti Particles for Winner Celebration */}
            <WinnerConfetti active={Boolean(state.celebrateWinner)} />
          </>
        )}
      </div>

      {/* Dev overflow checker */}
      <DevOverflowChecker stageRef={stageRef} />
    </div>
  );
}
