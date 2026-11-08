import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuizStateReadOnly, setQuizFocus, toggleCelebrateWinner } from '../../store';
import { rankTeams } from '../../utils';
import BackgroundEffects from './BackgroundEffects';
import TabBar from './TabBar';
import Podium from './Podium';
import RankList from './RankList';
import BibleVerseFooter from './BibleVerseFooter';
import EmptyState from './EmptyState';
import WinnerConfetti from './WinnerConfetti';
import RevealStage from '../reveal/RevealStage';
import WinnersCelebrationStage from '../celebrate/WinnersCelebrationStage';

/**
 * Single layout function returning fixed px sizes on a 1920-wide stage.
 * Adapts to any aspect ratio (16:9, 16:10, 4:3) by clamping H between 1080 and 1500,
 * scaling with transform: scale(windowWidth / 1920) from top-left.
 */
export function computeStageLayout(
  windowWidth: number,
  windowHeight: number,
  listTeamsCount: number
) {
  // 1. Clamped stage height H between 1080 and 1500
  const H = Math.min(
    1500,
    Math.max(1080, Math.round((1920 * windowHeight) / Math.max(1, windowWidth)))
  );

  // 2. Scale factor anchored at top-left
  const scale = windowWidth / 1920;

  // 3. Fixed budget elements (sum = 230px without podium and list panel)
  const topSpace = 12;
  const bannerHeight = 100; // Small eyebrow pill ABOVE hexagon LEADERBOARD banner
  const tabsHeight = 40;
  const gapTabsPodium = 8;
  const gapPodiumList = 8;
  const gapListVerse = 8;
  const verseBarHeight = 44;
  const bottomSpace = 10;

  const fixedChromeSum =
    topSpace +
    bannerHeight +
    tabsHeight +
    gapTabsPodium +
    gapPodiumList +
    gapListVerse +
    verseBarHeight +
    bottomSpace; // exactly 230px

  const availableForPodiumAndList = H - fixedChromeSum; // At H=1080, this is 850px

  // 4. Column count: <= 7 -> 1 col, 8-14 -> 2 cols, 15-21 -> 3 cols, >= 22 -> 4 cols
  const numCols =
    listTeamsCount <= 7 ? 1 : listTeamsCount <= 14 ? 2 : listTeamsCount <= 21 ? 3 : 4;
  const maxRows = Math.min(
    7,
    Math.max(1, listTeamsCount > 0 ? Math.ceil(listTeamsCount / numCols) : 0)
  );

  // 5. Target list panel budget at H=1080 is 580px
  // In list panel: header (30px) + padding (12px) + gaps ((maxRows - 1) * 6px) + rows
  const gapsTotal = maxRows > 1 ? (maxRows - 1) * 6 : 0;
  const baseAvailableForRows = 580 - 30 - 12 - gapsTotal;
  const baseRowHeight = Math.min(
    78,
    Math.max(48, Math.floor(baseAvailableForRows / Math.max(1, maxRows)))
  );

  // Extra height beyond 1080 goes to list rows first (up to max 78px), then to podium
  const extraTotal = H - 1080;
  const maxRowExpand = 78 - baseRowHeight;
  const extraForRows = Math.min(extraTotal, maxRowExpand * Math.max(1, maxRows));
  const rowHeight = baseRowHeight + Math.floor(extraForRows / Math.max(1, maxRows));

  const rowsHeight = maxRows * rowHeight + gapsTotal;
  const listPanelHeight = 30 + rowsHeight + 12; // header (30px) + rows + 12px padding

  // Remaining height goes to podium!
  const podiumHeight = availableForPodiumAndList - listPanelHeight;

  return {
    H,
    scale,
    topSpace,
    bannerHeight,
    tabsHeight,
    gapTabsPodium,
    podiumHeight,
    gapPodiumList,
    listPanelHeight,
    rowHeight,
    numCols,
    maxRows,
    gapListVerse,
    verseBarHeight,
    bottomSpace,
  };
}

export default function ProjectorView() {
  const state = useQuizStateReadOnly();
  const stageRef = useRef<HTMLDivElement>(null);

  // Viewport tracking for responsive scaling
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  const isLight = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('theme') === 'light';
  const isLite = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('lite') === '1' || state.teams.length > 30);

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('fullscreenchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('fullscreenchange', handleResize);
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

  // Compute exact layout budget
  const layout = useMemo(() => {
    return computeStageLayout(
      windowDimensions.width,
      windowDimensions.height,
      listTeamsCount
    );
  }, [windowDimensions.width, windowDimensions.height, listTeamsCount]);

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
      {/* Dynamic Atmospheric Radial Background & Glows */}
      <BackgroundEffects isLight={isLight} />

      {/* 
        STAGE:
        1920px wide, height H (clamped between 1080 and 1500),
        scaled by scale(windowWidth / 1920) from top-left, edge-to-edge with ZERO scrollbars.
      */}
      <div
        ref={stageRef}
        data-testid="projector-stage"
        style={{
          width: '1920px',
          height: `${layout.H}px`,
          transform: `scale(${layout.scale})`,
          transformOrigin: 'top left',
        }}
        className="relative z-10 overflow-hidden shrink-0 flex flex-col justify-start"
      >
        {state.celebrateWinner ? (
          <WinnersCelebrationStage state={state} />
        ) : isRevealActive ? (
          <RevealStage state={state} />
        ) : (
          <>
            {/* 1. TOP SPACE (12px) */}
            <div style={{ height: `${layout.topSpace}px` }} className="w-full shrink-0" />

            {/* 2. BANNER AREA (100px): Small eyebrow pill ABOVE hexagon LEADERBOARD banner (NOT overlapping text) */}
            <div
              style={{ height: `${layout.bannerHeight}px` }}
              className="w-full flex flex-col items-center justify-center shrink-0 px-12"
            >
              {/* Eyebrow Pill ABOVE the banner (height ~28px) */}
              <div
                data-testid="projector-title-pill"
                className="inline-flex items-center gap-2 px-6 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 font-outfit text-xs tracking-[0.25em] uppercase font-black drop-shadow shadow-[0_0_16px_rgba(251,191,36,0.35)] mb-1.5 shrink-0"
              >
                <span className="text-amber-400">★</span>
                <span>{(state.title || 'VERSE UP BIBLE QUIZ 2026').toUpperCase()}</span>
                <span className="text-amber-400">★</span>
              </div>

              {/* Hexagon LEADERBOARD Banner (height ~60px) */}
              <div className="relative flex items-center justify-center w-full max-w-xl shrink-0">
                <div
                  data-testid="projector-leaderboard-banner"
                  className="banner-ribbon px-16 py-2 w-full text-center flex flex-col items-center justify-center backdrop-blur-md"
                >
                  <h1 className="font-cinzel text-3xl md:text-4xl text-white tracking-widest font-black uppercase drop-shadow-md m-0 p-0 leading-tight">
                    LEADERBOARD
                  </h1>
                </div>
              </div>
            </div>

            {/* 3. TABS ROW (40px) */}
            <div
              style={{ height: `${layout.tabsHeight}px` }}
              className="w-full flex items-center justify-center shrink-0 px-12"
            >
              <TabBar
                levels={state.levels}
                activeTab={state.focus}
                onTabChange={(tabId) => setQuizFocus(tabId)}
              />
            </div>

            {/* 4. GAP (8px) */}
            <div style={{ height: `${layout.gapTabsPodium}px` }} className="w-full shrink-0" />

            {/* 5. PODIUM ZONE */}
            <div
              style={{ height: `${layout.podiumHeight}px` }}
              className="w-full px-12 flex items-end justify-center shrink-0 overflow-visible"
            >
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
                  podiumHeight={layout.podiumHeight}
                />
              )}
            </div>

            {/* 6. GAP (8px) */}
            <div style={{ height: `${layout.gapPodiumList}px` }} className="w-full shrink-0" />

            {/* 7. TEAM STANDINGS LIST PANEL (pale lavender sheet) */}
            <div className="w-full px-8 shrink-0 flex flex-col justify-start min-h-0">
              <section
                data-testid="rank-list-panel"
                style={{ height: `${layout.listPanelHeight}px` }}
                className="curved-sheet w-full px-8 pt-[6px] pb-[6px] flex flex-col justify-start shadow-2xl overflow-hidden shrink-0"
              >
                <RankList
                  teams={ranked}
                  levels={state.levels}
                  allTeams={state.teams}
                  rowHeight={layout.rowHeight}
                  numCols={layout.numCols}
                />
              </section>
            </div>

            {/* 8. GAP (8px) */}
            <div style={{ height: `${layout.gapListVerse}px` }} className="w-full shrink-0" />

            {/* 9. BIBLE VERSE BAR (44px) */}
            <div
              style={{ height: `${layout.verseBarHeight}px` }}
              className="w-full px-8 flex items-center justify-center shrink-0"
            >
              <BibleVerseFooter />
            </div>

            {/* 10. BOTTOM SPACE (10px) */}
            <div style={{ height: `${layout.bottomSpace}px` }} className="w-full shrink-0" />

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
