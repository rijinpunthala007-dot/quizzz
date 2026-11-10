import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuizStateReadOnly, setQuizFocus, toggleCelebrateWinner } from '../../store';
import { rankTeams } from '../../utils';
import BackgroundEffects from './BackgroundEffects';
import TabBar from './TabBar';
import Podium from './Podium';
import PodiumV2 from './PodiumV2';
import AmbientFX from './AmbientFX';
import RankList from './RankList';
import BibleVerseFooter from './BibleVerseFooter';
import EmptyState from './EmptyState';
import WinnerConfetti from './WinnerConfetti';
import RevealStage from '../reveal/RevealStage';
import WinnersCelebrationStage from '../celebrate/WinnersCelebrationStage';
import { computeStageH, layoutFor, PROJECTOR_LAYOUT } from './layout';

export { PROJECTOR_LAYOUT, layoutFor, computeStageH };

export default function ProjectorView() {
  const state = useQuizStateReadOnly();
  const stageRef = useRef<HTMLDivElement>(null);

  // Viewport tracking for responsive scaling
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? (window.visualViewport?.width || window.innerWidth || 1920) : 1920,
    height: typeof window !== 'undefined' ? (window.visualViewport?.height || window.innerHeight || 1080) : 1080,
  });

  const isLight = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('theme') === 'light';
  const isLite = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('lite') === '1' || state.teams.length > 30);
  const isClassicPodium = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('podium') === 'classic';
  const ActivePodium = isClassicPodium ? Podium : PodiumV2;

  useEffect(() => {
    const handleResize = () => {
      const w = window.visualViewport?.width || window.innerWidth || 1920;
      const h = window.visualViewport?.height || window.innerHeight || 1080;
      setViewport({ width: w, height: h });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('fullscreenchange', handleResize);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && document.documentElement) {
      ro = new ResizeObserver(() => {
        handleResize();
      });
      ro.observe(document.documentElement);
    }

    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('fullscreenchange', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      if (ro) {
        ro.disconnect();
      }
    };
  }, []);

  // Hide cursor after 2s of inactivity
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const hide = () => {
      document.body.style.cursor = 'none';
    };
    const show = () => {
      document.body.style.cursor = '';
      clearTimeout(timer);
      timer = setTimeout(hide, 2000);
    };

    window.addEventListener('mousemove', show);
    timer = setTimeout(hide, 2000);

    return () => {
      window.removeEventListener('mousemove', show);
      clearTimeout(timer);
      document.body.style.cursor = '';
    };
  }, []);

  // Keyboard shortcuts: F for fullscreen, C for celebrate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === 'c' || e.key === 'C') {
        toggleCelebrateWinner();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync connection status: only show a 12px red dot if connection is lost
  const [isSyncLost, setIsSyncLost] = useState(false);
  useEffect(() => {
    const handleOnline = () => setIsSyncLost(false);
    const handleOffline = () => setIsSyncLost(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsSyncLost(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const hasTeams = state.teams.length > 0;
  const disableAnimation = state.teams.length > 30 || isLite;

  // Rank teams using focus score and stable tie handling
  const ranked = useMemo(() => {
    return rankTeams(state);
  }, [state]);

  const activeTeams = useMemo(() => ranked.filter((t) => !t.out), [ranked]);
  const listTeamsCount = Math.max(0, activeTeams.length - 3);

  // Column count: <= 7 -> 1 col, 8-14 -> 2 cols, 15-21 -> 3 cols, >= 22 -> 4 cols
  const numCols =
    listTeamsCount <= 7 ? 1 : listTeamsCount <= 14 ? 2 : listTeamsCount <= 21 ? 3 : 4;

  const stageH = useMemo(
    () => computeStageH(viewport.width, viewport.height),
    [viewport.width, viewport.height]
  );
  const layout = useMemo(() => layoutFor(stageH), [stageH]);
  const scale = Math.min(
    viewport.width / layout.stageWidth,
    viewport.height / layout.stageHeight
  );

  const isRevealUrl = typeof window !== 'undefined' && window.location.search.includes('reveal=1');
  const isRevealActive = Boolean(state.reveal?.active) || isRevealUrl;

  return (
    <div
      data-testid="projector-viewport"
      data-theme={isLight ? 'light' : undefined}
      className="fixed inset-0 w-screen h-screen overflow-hidden select-none bg-[#250f6d] text-white"
      style={{
        outline: 'none',
        userSelect: 'none',
      }}
    >
      {/* Dynamic Atmospheric Radial Background & Glows across entire window */}
      <BackgroundEffects isLight={isLight} />

      {/* 
        STAGE WITH DYNAMIC HEIGHT (1080 to 1440):
        Controlled by layoutFor(H), scaled with Math.min(w/1920, h/H),
        centered horizontally and vertically in the viewport with matching background bars.
      */}
      <div
        ref={stageRef}
        data-testid="projector-stage"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: `${layout.stageWidth}px`,
          height: `${layout.stageHeight}px`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
          '--stage-h': `${layout.stageHeight}px`,
          '--t': `${layout.t}`,
          '--s': `${layout.s}`,
          '--s-h': `${layout.s_h}`,
        } as React.CSSProperties}
        className="z-10 overflow-hidden shrink-0 flex flex-col justify-start"
      >
        <AmbientFX leaderId={ranked[0]?.id} levelId={state.focus} />
        {state.celebrateWinner ? (
          <WinnersCelebrationStage state={state} />
        ) : isRevealActive ? (
          <RevealStage state={state} />
        ) : (
          <>
            {/* 1. TOP SPACE */}
            <div style={{ height: `${layout.topSpace}px` }} className="w-full shrink-0" />

            {/* 2. HEADER BLOCK (pill, hexagon banner, tabs: scaled by s_h anchored to top) */}
            <div
              style={{
                height: `${layout.headerBlockHeight}px`,
                transform: layout.headerScale !== 1 ? `scale(${layout.headerScale})` : undefined,
                transformOrigin: 'top center',
              }}
              className="w-full shrink-0 flex flex-col items-center justify-start"
            >
              {/* Eyebrow Pill ABOVE the banner (height ~26px) + Hexagon Banner (height ~52px) */}
              <div
                style={{ height: '84px' }}
                className="w-full flex flex-col items-center justify-center shrink-0 px-12"
              >
                {/* Eyebrow Pill ABOVE the banner (height ~26px) */}
                <div
                  data-testid="projector-title-pill"
                  className="inline-flex items-center gap-2 px-6 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 font-outfit text-xs tracking-[0.25em] uppercase font-black drop-shadow shadow-[0_0_16px_rgba(251,191,36,0.35)] mb-1 shrink-0"
                >
                  <span className="text-amber-400">★</span>
                  <span>{(state.title || 'VERSE UP BIBLE QUIZ 2026').toUpperCase()}</span>
                  <span className="text-amber-400">★</span>
                </div>

                {/* Hexagon LEADERBOARD Banner (height ~52px) */}
                <div className="relative flex items-center justify-center w-full max-w-xl shrink-0">
                  <div
                    data-testid="projector-leaderboard-banner"
                    className="banner-ribbon px-16 py-1.5 w-full text-center flex flex-col items-center justify-center backdrop-blur-md"
                  >
                    <h1 className="font-cinzel text-3xl md:text-4xl text-white tracking-widest font-black uppercase drop-shadow-md m-0 p-0 leading-tight">
                      LEADERBOARD
                    </h1>
                  </div>
                </div>
              </div>

              {/* Gap (4px) */}
              <div style={{ height: '4px' }} className="w-full shrink-0" />

              {/* Tabs Row (44px) */}
              <div
                style={{ height: '44px' }}
                className="w-full flex items-center justify-center shrink-0 px-12"
              >
                <TabBar
                  levels={state.levels}
                  activeTab={state.focus}
                  onTabChange={(tabId) => setQuizFocus(tabId)}
                />
              </div>
            </div>

            {/* 3. GAP ABOVE PODIUM */}
            <div style={{ height: `${layout.gapTabsPodium}px` }} className="w-full shrink-0" />

            {/* 4. PODIUM ZONE */}
            <div
              style={{ height: `${layout.podiumContainerHeight}px` }}
              className="w-full px-12 flex items-end justify-center shrink-0 overflow-visible"
            >
              {!hasTeams ? (
                <EmptyState />
              ) : (
                <ActivePodium
                  teams={ranked}
                  levels={state.levels}
                  allTeams={state.teams}
                  focus={state.focus}
                  disableAnimation={disableAnimation}
                  isCelebrating={Boolean(state.celebrateWinner)}
                  podiumHeight={layout.podiumContainerHeight}
                  layout={layout}
                />
              )}
            </div>

            {/* 5. GAP PODIUM TO LIST */}
            <div style={{ height: `${layout.gapPodiumList}px` }} className="w-full shrink-0" />

            {/* 6. TEAM STANDINGS LIST PANEL */}
            <div className="w-full px-8 shrink-0 flex flex-col justify-start min-h-0">
              <section
                data-testid="rank-list-panel"
                style={{ height: `${layout.listPanelHeight}px` }}
                className="curved-sheet w-full px-8 pt-0 pb-0 flex flex-col justify-start shadow-2xl overflow-hidden shrink-0"
              >
                <RankList
                  teams={ranked}
                  levels={state.levels}
                  allTeams={state.teams}
                  rowHeight={layout.rowHeight}
                  numCols={numCols}
                  layout={layout}
                />
              </section>
            </div>

            {/* 7. GAP LIST TO VERSE */}
            <div style={{ height: `${layout.gapListVerse}px` }} className="w-full shrink-0" />

            {/* 8. BIBLE VERSE BAR */}
            <div
              style={{ height: `${layout.verseBarHeight}px` }}
              className="w-full px-8 flex items-center justify-center shrink-0"
            >
              <BibleVerseFooter layout={layout} />
            </div>

            {/* 9. BOTTOM MARGIN */}
            <div style={{ height: `${layout.bottomMargin}px` }} className="w-full shrink-0" />

            {/* Animated Confetti Particles for Winner Celebration */}
            <WinnerConfetti active={Boolean(state.celebrateWinner)} />
          </>
        )}
      </div>

      {/* Sync lost red dot (12px, bottom right) */}
      {isSyncLost && (
        <div
          data-testid="sync-lost-dot"
          className="fixed bottom-3 right-3 w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse z-50 pointer-events-none"
          title="Sync connection lost"
        />
      )}
    </div>
  );
}
