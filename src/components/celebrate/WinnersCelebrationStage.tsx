import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { QuizState, RevealSnapshotTeam, CelebrationWording } from '../../types';
import { DEFAULT_WORDING } from '../../types';
import { hideWinnersPage, triggerCelebrateAgain } from '../../store';
import { createRevealSnapshot, getInitials, formatScore } from '../../utils';
import CelebrateConfetti from './CelebrateConfetti';
import { useFitText } from './useFitText';
import AmbientFX from '../projector/AmbientFX';
import { computeStageH } from '../projector/layout';
import styles from './WinnersCelebrationStage.module.css';

interface WinnersCelebrationStageProps {
  state: QuizState;
}

// Sparkle stars around winner card
const STAR_OFFSETS = [
  { top: '6%', left: '8%', delay: '0s', size: 14 },
  { top: '5%', right: '10%', delay: '0.4s', size: 16 },
  { top: '22%', left: '-2%', delay: '0.8s', size: 12 },
  { top: '24%', right: '-2%', delay: '1.2s', size: 15 },
  { top: '42%', left: '4%', delay: '0.3s', size: 16 },
  { top: '44%', right: '3%', delay: '0.7s', size: 14 },
  { top: '65%', left: '-1%', delay: '1.1s', size: 15 },
  { top: '68%', right: '-1%', delay: '0.5s', size: 12 },
  { top: '85%', left: '8%', delay: '0.9s', size: 16 },
  { top: '88%', right: '6%', delay: '0.2s', size: 14 },
];

/**
 * Animated Score Count-up Component for Celebration Cards
 * Rolls from 0 to endVal over 1.2s when the card lands.
 */
function CelebrateAnimatedScore({
  value,
  delayMs,
  maxSize,
  availWidth,
  isWinner,
  isLite,
  isReducedMotion,
}: {
  value: number;
  delayMs: number;
  maxSize: number;
  availWidth: number;
  isWinner: boolean;
  isLite: boolean;
  isReducedMotion: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(isReducedMotion || isLite ? value : 0);
  const [fontSize, setFontSize] = useState(maxSize);
  const minSize = Math.round(maxSize * 0.50);

  // Score text size fitting (shrinks down to 50% if wide)
  useEffect(() => {
    const formatted = formatScore(value);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = `900 ${maxSize}px 'Outfit', sans-serif`;
    const numWidth = ctx.measureText(formatted).width;
    if (numWidth > availWidth && availWidth > 0) {
      const scaleRatio = availWidth / numWidth;
      setFontSize(Math.max(minSize, Math.round(maxSize * scaleRatio)));
    } else {
      setFontSize(maxSize);
    }
  }, [value, maxSize, minSize, availWidth]);

  // Count-up animation
  useEffect(() => {
    if (isReducedMotion || isLite) {
      setDisplayValue(value);
      return;
    }

    const duration = 1200; // 1.2s count up
    let frameId: number;
    let timerId: ReturnType<typeof setTimeout>;

    timerId = setTimeout(() => {
      const startTime = performance.now();
      const startVal = 0;
      const endVal = value;
      const decimals = endVal % 1 !== 0 ? (endVal.toString().split('.')[1]?.length || 0) : 0;
      const factor = Math.pow(10, Math.min(decimals, 2));

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out
        const current = Math.round((startVal + (endVal - startVal) * ease) * factor) / factor;
        setDisplayValue(current);

        if (progress < 1) {
          frameId = requestAnimationFrame(animate);
        }
      };
      frameId = requestAnimationFrame(animate);
    }, delayMs);

    return () => {
      clearTimeout(timerId);
      cancelAnimationFrame(frameId);
    };
  }, [value, delayMs, isReducedMotion, isLite]);

  return (
    <span
      data-testid="score-value"
      style={{ fontSize: `${fontSize}px` }}
      className={`font-outfit font-black tabular-nums leading-none ${
        isWinner
          ? 'text-amber-300 drop-shadow-[0_4px_28px_rgba(251,191,36,0.7)]'
          : 'text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
      }`}
    >
      {formatScore(displayValue)}
    </span>
  );
}

/**
 * 36px Silver Medal Badge for 2nd place
 */
function SilverMedalBadge36() {
  return (
    <div
      style={{
        position: 'absolute',
        right: '-6px',
        bottom: '-2px',
        width: '36px',
        height: '36px',
        pointerEvents: 'none',
        zIndex: 25,
      }}
    >
      <svg viewBox="0 0 36 36" className="w-[36px] h-[36px] drop-shadow-lg">
        <defs>
          <linearGradient id="win2SilMedalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>
        </defs>
        <path d="M12 2 L9 13 L15 13 Z" fill="#475569" opacity="0.8" />
        <path d="M24 2 L21 13 L27 13 Z" fill="#64748B" opacity="0.8" />
        <circle cx="18" cy="20" r="13" fill="url(#win2SilMedalGrad)" stroke="#475569" strokeWidth="1.5" />
        <circle cx="18" cy="20" r="10.5" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2,2" opacity="0.9" />
        <text
          x="18"
          y="25"
          textAnchor="middle"
          fill="#1E293B"
          fontSize="14"
          fontFamily="'Cinzel', serif"
          fontWeight="900"
        >
          2
        </text>
      </svg>
    </div>
  );
}

/**
 * 36px Bronze Medal Badge for 3rd place
 */
function BronzeMedalBadge36() {
  return (
    <div
      style={{
        position: 'absolute',
        right: '-6px',
        bottom: '-2px',
        width: '36px',
        height: '36px',
        pointerEvents: 'none',
        zIndex: 25,
      }}
    >
      <svg viewBox="0 0 36 36" className="w-[36px] h-[36px] drop-shadow-lg">
        <defs>
          <linearGradient id="win2BrzMedalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FED7AA" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#9A3412" />
          </linearGradient>
        </defs>
        <path d="M12 2 L9 13 L15 13 Z" fill="#7C2D12" opacity="0.8" />
        <path d="M24 2 L21 13 L27 13 Z" fill="#9A3412" opacity="0.8" />
        <circle cx="18" cy="20" r="13" fill="url(#win2BrzMedalGrad)" stroke="#431407" strokeWidth="1.5" />
        <circle cx="18" cy="20" r="10.5" fill="none" stroke="#FFEDD5" strokeWidth="1" strokeDasharray="2,2" opacity="0.9" />
        <text
          x="18"
          y="25"
          textAnchor="middle"
          fill="#431407"
          fontSize="14"
          fontFamily="'Cinzel', serif"
          fontWeight="900"
        >
          3
        </text>
      </svg>
    </div>
  );
}

/**
 * Winner Gold Crown SVG with >= 6px clearance from pill
 */
function WinnerCrownSvg() {
  return (
    <div
      data-testid="celebration-crown"
      style={{
        position: 'absolute',
        top: '-18px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '46px',
        height: '28px',
        pointerEvents: 'none',
        zIndex: 25,
      }}
    >
      <svg
        viewBox="0 0 36 22"
        className="w-[46px] h-[28px] drop-shadow-[0_2px_10px_rgba(251,191,36,0.8)]"
      >
        <defs>
          <linearGradient id="win2CrownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE27A" />
            <stop offset="50%" stopColor="#F5A623" />
            <stop offset="100%" stopColor="#FFE27A" />
          </linearGradient>
        </defs>
        <path
          d="M3 18 L33 18 L30 8 L23 13 L18 2 L13 13 L6 8 Z"
          fill="url(#win2CrownGrad)"
          stroke="#9A650C"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="2" r="2" fill="#FFFBEB" stroke="#D97706" strokeWidth="0.8" />
        <circle cx="6" cy="8" r="1.6" fill="#FFFBEB" stroke="#D97706" strokeWidth="0.8" />
        <circle cx="30" cy="8" r="1.6" fill="#FFFBEB" stroke="#D97706" strokeWidth="0.8" />
        <rect
          x="4"
          y="18.5"
          width="28"
          height="2.5"
          rx="1"
          fill="url(#win2CrownGrad)"
          stroke="#9A650C"
          strokeWidth="0.7"
        />
      </svg>
    </div>
  );
}

// =========================================================================
// PODIUM LAYOUT ENGINE
// =========================================================================

export interface PodiumColumnSpec {
  key: string;
  place: 1 | 2 | 3;
  teams: RevealSnapshotTeam[];
  cardWidth: number;
  variant: 'full' | 'narrow' | 'compact' | 'honour-roll';
  delay: number;
  pillText: string;
  taglineText: string;
  pedestalWidth: number;
  pedestalHeight: number;
  cardHeight: number;
  numeral: number;
  numeralSize: number;
}

export interface PodiumComputedLayout {
  columns: PodiumColumnSpec[];
  totalRowWidth: number;
  airAbove: number;
  gapBelow: number;
  tallestH: number;
}

function computePodiumLayout({
  topTeams,
  H,
  t,
  s,
  wording,
}: {
  topTeams: RevealSnapshotTeam[];
  H: number;
  t: number;
  s: number;
  wording: CelebrationWording;
}): PodiumComputedLayout {
  // Sort tied cards by name A to Z (stable)
  const firstRank = [...topTeams.filter((t) => t.rank === 1)].sort((a, b) => a.name.localeCompare(b.name));
  const secondRank = [...topTeams.filter((t) => t.rank === 2)].sort((a, b) => a.name.localeCompare(b.name));
  const thirdRank = [...topTeams.filter((t) => t.rank === 3)].sort((a, b) => a.name.localeCompare(b.name));

  // Stage vertical budget
  const topPadding = Math.floor(36 + 20 * t);
  const bannerHeight = Math.floor(96 + 28 * t);
  const gapBannerSubtitle = 6;
  const subtitleHeight = Math.floor(44 + 14 * t);
  const footerHeight = Math.floor(56 + 16 * t);
  const footerBottomMargin = Math.floor(14 + 6 * t);

  const headerBottomY = topPadding + bannerHeight + gapBannerSubtitle + subtitleHeight;
  const footerTopY = H - (footerHeight + footerBottomMargin);
  const availVertical = footerTopY - headerBottomY;

  // Pedestal base heights (interpolated linearly with t up to caps)
  const ped1Height = Math.floor(150 + 50 * t);
  const ped2Height = Math.floor(116 + 40 * t);
  const ped3Height = Math.floor(88 + 30 * t);

  // Card heights absorb extra height so neither airAbove nor gapBelow exceeds 90px
  const targetSurplus = 170;
  const card1Height = Math.max(
    Math.floor(500 + 140 * t),
    availVertical - ped1Height - Math.round(22 * s) - targetSurplus
  );
  const card23Height = Math.round(card1Height * 0.84);

  // Determine Columns structure based on places & ties
  let colDefs: {
    key: string;
    place: 1 | 2 | 3;
    teams: RevealSnapshotTeam[];
    delay: number;
    pillText: string;
    taglineText: string;
    pedestalHeight: number;
    cardHeight: number;
    numeral: number;
    isHonourRoll?: boolean;
  }[] = [];

  if (firstRank.length > 1) {
    // 1st group is tied! Cards stand together in centre at 1st level; no other places exist
    if (firstRank.length > 8) {
      colDefs = [
        {
          key: 'first-honour',
          place: 1,
          teams: firstRank,
          delay: 1.3,
          pillText: wording.pill1 || 'CHAMPION · #1',
          taglineText: wording.tagline1 || '',
          pedestalHeight: ped1Height,
          cardHeight: card1Height,
          numeral: 1,
          isHonourRoll: true,
        },
      ];
    } else {
      colDefs = [
        {
          key: 'first-tied',
          place: 1,
          teams: firstRank,
          delay: 1.3,
          pillText: wording.pill1 || 'CHAMPION · #1',
          taglineText: wording.tagline1 || '',
          pedestalHeight: ped1Height,
          cardHeight: card1Height,
          numeral: 1,
        },
      ];
    }
  } else if (firstRank.length === 1 && secondRank.length >= 2 && thirdRank.length === 0) {
    // 1st single, 2nd tied with n >= 2, no 3rd: split 2nd group around 1st group!
    const mid = Math.ceil(secondRank.length / 2);
    const leftTeams = secondRank.slice(0, mid);
    const rightTeams = secondRank.slice(mid);

    colDefs = [
      {
        key: 'second-left',
        place: 2,
        teams: leftTeams,
        delay: 0.7,
        pillText: wording.pill2 || 'RUNNER-UP · #2',
        taglineText: wording.tagline2 || '',
        pedestalHeight: ped2Height,
        cardHeight: card23Height,
        numeral: 2,
      },
      {
        key: 'first',
        place: 1,
        teams: firstRank,
        delay: 1.3,
        pillText: wording.pill1 || 'CHAMPION · #1',
        taglineText: wording.tagline1 || '',
        pedestalHeight: ped1Height,
        cardHeight: card1Height,
        numeral: 1,
      },
      {
        key: 'second-right',
        place: 2,
        teams: rightTeams,
        delay: 0.7,
        pillText: wording.pill2 || 'RUNNER-UP · #2',
        taglineText: wording.tagline2 || '',
        pedestalHeight: ped2Height,
        cardHeight: card23Height,
        numeral: 2,
      },
    ];
  } else {
    // Standard visual order: [2nd group] [1st group] [3rd group]
    if (secondRank.length > 0) {
      colDefs.push({
        key: 'second',
        place: 2,
        teams: secondRank,
        delay: 0.7,
        pillText: wording.pill2 || 'RUNNER-UP · #2',
        taglineText: wording.tagline2 || '',
        pedestalHeight: ped2Height,
        cardHeight: card23Height,
        numeral: 2,
      });
    }
    if (firstRank.length > 0) {
      colDefs.push({
        key: 'first',
        place: 1,
        teams: firstRank,
        delay: 1.3,
        pillText: wording.pill1 || 'CHAMPION · #1',
        taglineText: wording.tagline1 || '',
        pedestalHeight: ped1Height,
        cardHeight: card1Height,
        numeral: 1,
      });
    }
    if (thirdRank.length > 0) {
      colDefs.push({
        key: 'third',
        place: 3,
        teams: thirdRank,
        delay: 0.1,
        pillText: wording.pill3 || 'THIRD PLACE · #3',
        taglineText: wording.tagline3 || '',
        pedestalHeight: ped3Height,
        cardHeight: card23Height,
        numeral: 3,
      });
    }
  }

  // Usable width W = 1776, gap 24 between cards of same group, gap 56 between groups
  const usableW = 1776;
  const groupGap = 56;
  const cardGap = 24;

  const totalGroupGaps = Math.max(0, colDefs.length - 1) * groupGap;

  // Compute card widths
  const isAllTiedFirst = firstRank.length > 1;
  const columns: PodiumColumnSpec[] = [];

  if (isAllTiedFirst) {
    if (colDefs[0].isHonourRoll) {
      const cardW = Math.min(1200, usableW - totalGroupGaps);
      columns.push({
        ...colDefs[0],
        cardWidth: cardW,
        variant: 'honour-roll',
        pedestalWidth: cardW,
        numeralSize: Math.floor(colDefs[0].pedestalHeight * 0.56),
      });
    } else {
      const n = firstRank.length;
      const internalGaps = (n - 1) * cardGap;
      const cardW = Math.min(560, Math.floor((usableW - internalGaps) / n));
      const variant = cardW >= 400 ? 'full' : cardW >= 300 ? 'narrow' : 'compact';
      const pedW = n * cardW + internalGaps;
      columns.push({
        ...colDefs[0],
        cardWidth: cardW,
        variant,
        pedestalWidth: pedW,
        numeralSize: Math.floor(colDefs[0].pedestalHeight * 0.56),
      });
    }
  } else {
    // Single 1st card gets 560 (or adjusted if many cards)
    const firstCol = colDefs.find((c) => c.place === 1);
    const nonFirstCols = colDefs.filter((c) => c.place !== 1);
    const totalNonFirstCards = nonFirstCols.reduce((sum, c) => sum + c.teams.length, 0);

    const internalGaps = colDefs.reduce((sum, c) => sum + Math.max(0, c.teams.length - 1) * cardGap, 0);
    const totalGaps = totalGroupGaps + internalGaps;

    let w1 = firstCol ? 560 : 0;
    if (totalNonFirstCards >= 5) {
      w1 = 480; // slightly slim single 1st to give ample room to 5+ non-first cards
    }

    const remainingForOther = Math.max(0, usableW - totalGaps - w1);
    const wOther = totalNonFirstCards > 0 ? Math.min(470, Math.floor(remainingForOther / totalNonFirstCards)) : 470;

    for (const col of colDefs) {
      if (col.place === 1) {
        const variant = w1 >= 400 ? 'full' : w1 >= 300 ? 'narrow' : 'compact';
        columns.push({
          ...col,
          cardWidth: w1,
          variant,
          pedestalWidth: w1,
          numeralSize: Math.floor(col.pedestalHeight * 0.56),
        });
      } else {
        const n = col.teams.length;
        const colInternalGaps = Math.max(0, n - 1) * cardGap;
        const variant = wOther >= 400 ? 'full' : wOther >= 300 ? 'narrow' : 'compact';
        const pedW = n * wOther + colInternalGaps;
        columns.push({
          ...col,
          cardWidth: wOther,
          variant,
          pedestalWidth: pedW,
          numeralSize: Math.floor(col.pedestalHeight * 0.56),
        });
      }
    }
  }

  // Total podium block width
  const totalRowWidth =
    columns.reduce((sum, col) => sum + col.pedestalWidth, 0) +
    Math.max(0, columns.length - 1) * groupGap;

  // Tallest column height (1st place)
  const firstColSpec = columns.find((c) => c.place === 1) || columns[0];
  const tallestH = firstColSpec.cardHeight + firstColSpec.pedestalHeight + Math.round(22 * s);

  // Vertical distribution:
  // At least 70px air above tallest pill, at least 24px gap to footer, no empty band > 90px
  const surplus = Math.max(0, availVertical - tallestH);
  const airAbove = Math.min(84, Math.max(72, Math.floor(surplus * 0.48)));
  const gapBelow = surplus - airAbove;

  return {
    columns,
    totalRowWidth,
    airAbove,
    gapBelow,
    tallestH,
  };
}

// =========================================================================
// MAIN CELEBRATION STAGE COMPONENT
// =========================================================================

export default function WinnersCelebrationStage({ state }: WinnersCelebrationStageProps) {
  // Window dimensions & Adaptive Stage calculation
  const [windowDimensions, setWindowDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  }));

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('fullscreenchange', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('fullscreenchange', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const H = computeStageH(windowDimensions.width, windowDimensions.height);
  const t = (H - 1080) / 360;
  const s = 1 + 0.28 * t;

  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isLite =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('lite') === '1';

  // Autohide buttons & cursor on mouse inactivity
  const [showControls, setShowControls] = useState(false);
  const [hideCursor, setHideCursor] = useState(false);

  useEffect(() => {
    let controlTimer: ReturnType<typeof setTimeout>;
    let cursorTimer: ReturnType<typeof setTimeout>;

    const handleMouseMove = () => {
      setShowControls(true);
      setHideCursor(false);
      clearTimeout(controlTimer);
      clearTimeout(cursorTimer);
      controlTimer = setTimeout(() => setShowControls(false), 3000);
      cursorTimer = setTimeout(() => setHideCursor(true), 2000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    controlTimer = setTimeout(() => setShowControls(false), 3000);
    cursorTimer = setTimeout(() => setHideCursor(true), 2000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(controlTimer);
      clearTimeout(cursorTimer);
    };
  }, []);

  // Keyboard navigation: Esc -> Back to leaderboard, Space -> Celebrate again
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        hideWinnersPage();
      } else if (e.code === 'Space') {
        e.preventDefault();
        triggerCelebrateAgain();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Wording configuration
  const wording: CelebrationWording = {
    ...DEFAULT_WORDING,
    ...(state.celebrationWording || {}),
  };

  // Top teams snapshot
  const topTeams = useMemo(() => {
    if (state.winnersSnapshot && state.winnersSnapshot.length > 0) {
      return state.winnersSnapshot;
    }
    return createRevealSnapshot(state);
  }, [state.winnersSnapshot, state]);

  // Stage vertical budget
  const topPadding = Math.floor(36 + 20 * t);
  const bannerHeight = Math.floor(96 + 28 * t);
  const bannerFont = Math.floor(60 + 16 * t);
  const gapBannerSubtitle = 6;
  const subtitleHeight = Math.floor(44 + 14 * t);
  const subtitleFont = Math.floor(34 + 10 * t);
  const footerHeight = Math.floor(56 + 16 * t);
  const footerBottomMargin = Math.floor(14 + 6 * t);

  // Compute robust tie-proof podium layout
  const layout = useMemo(
    () => computePodiumLayout({ topTeams, H, t, s, wording }),
    [topTeams, H, t, s, wording]
  );

  const soundEnabled = Boolean(state.soundEnabled);
  const celebrateTrigger = state.celebrateTrigger;

  return (
    <div
      data-testid="winners-celebration-stage"
      style={{
        width: '1920px',
        height: `${H}px`,
      }}
      className={`relative select-none flex flex-col justify-start items-center overflow-hidden ${styles.win2Root} ${
        hideCursor ? styles.win2CursorHidden : ''
      }`}
    >
      {/* 1. Full-height AmbientFX background */}
      <AmbientFX leaderId={topTeams[0]?.id} levelId={state.focus} />

      {/* Atmospheric Background Glow */}
      <div className={styles.win2Background} />

      {/* Admin Floating Controls (autohides after 3s) */}
      <div
        className={`absolute top-6 right-10 flex items-center gap-3 z-50 transition-opacity duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={() => triggerCelebrateAgain()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-indigo-950 font-outfit text-xs font-black tracking-wider uppercase transition-all shadow-lg cursor-pointer border border-amber-200"
          title="Fire celebration cannons & confetti again (or press Space)"
        >
          <span>🎉 Celebrate Again</span>
        </button>
        <button
          type="button"
          onClick={() => hideWinnersPage()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-outfit text-xs font-bold uppercase tracking-wider transition-all border border-white/20 cursor-pointer"
          title="Return to the Leaderboard (or press Esc)"
        >
          <span>← Back to Leaderboard</span>
        </button>
      </div>

      {/* 2. TOP HEADER GROUP: Top Padding + Banner + Gap 6 + Subtitle */}
      <div
        style={{ paddingTop: `${topPadding}px` }}
        className="w-full flex flex-col items-center shrink-0 z-20"
      >
        {/* Banner with restored hexagon polygon clip-path */}
        <motion.div
          initial={isReducedMotion || isLite ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: isReducedMotion || isLite ? 0 : 0.8, ease: 'easeOut' }}
          style={{ height: `${bannerHeight}px` }}
          className={`flex items-center justify-center px-24 ${styles.win2BannerRibbon}`}
        >
          {!isLite && !isReducedMotion && <div className={styles.win2BannerShineBeam} />}
          <h1
            style={{ fontSize: `${bannerFont}px` }}
            className="font-cinzel text-white font-black tracking-widest uppercase drop-shadow-md m-0 p-0 text-center"
          >
            CONGRATULATIONS
          </h1>
        </motion.div>

        {/* Gap 6px */}
        <div style={{ height: `${gapBannerSubtitle}px` }} />

        {/* Subtitle */}
        <motion.div
          initial={isReducedMotion || isLite ? { opacity: 1, y: 0 } : { opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: isReducedMotion || isLite ? 0 : 0.8,
            delay: isReducedMotion || isLite ? 0 : 0.15,
            ease: 'easeOut',
          }}
          style={{ height: `${subtitleHeight}px` }}
          className="flex items-center justify-center text-center"
        >
          <p
            style={{ fontSize: `${subtitleFont}px` }}
            className="font-outfit text-[#FFD166] font-bold tracking-wide drop-shadow m-0 p-0"
          >
            {wording.subtitle}
          </p>
        </motion.div>
      </div>

      {/* 3. FREE AIR ABOVE TALLEST PILL (At least 70px, no empty band > 90px) */}
      <div style={{ height: `${layout.airAbove}px` }} className="w-full shrink-0" />

      {/* 4. MAIN PODIUM BLOCK (Centred horizontally, shared baseline) */}
      <div
        data-testid="celebration-podium-block"
        style={{ width: '1920px' }}
        className="flex items-end justify-center gap-[56px] overflow-visible z-20"
      >
        {layout.columns.map((col) => (
          <PodiumColumnGroup
            key={col.key}
            col={col}
            s={s}
            t={t}
            isLite={isLite}
            isReducedMotion={isReducedMotion}
          />
        ))}
      </div>

      {/* 5. GAP BELOW PEDESTALS (At least 24px, no empty band > 90px) */}
      <div style={{ height: `${layout.gapBelow}px` }} className="w-full shrink-0" />

      {/* 6. PINNED FOOTER STRIP (Verse auto-fit, no ellipsis) */}
      <CelebrationFooter
        verseText="&ldquo;Well done, thou good and faithful servant.&rdquo;"
        verseRef="— Matthew 25:21"
        rightText="designed and developed by rj"
        footerHeight={footerHeight}
        footerBottomMargin={footerBottomMargin}
        s={s}
      />

      {/* 7. FULL-SCREEN CELEBRATION CONFETTI */}
      <CelebrateConfetti
        trigger={celebrateTrigger}
        soundEnabled={soundEnabled}
        delayStartMs={2000}
      />
    </div>
  );
}

// =========================================================================
// PODIUM COLUMN GROUP COMPONENT (CARDS ON ONE SHARED PEDESTAL SLAB)
// =========================================================================

function PodiumColumnGroup({
  col,
  s,
  t,
  isLite,
  isReducedMotion,
}: {
  col: PodiumColumnSpec;
  s: number;
  t: number;
  isLite: boolean;
  isReducedMotion: boolean;
}) {
  const isWinner = col.place === 1;
  const isRunnerUp = col.place === 2;

  const pedClass = isWinner
    ? styles.win2PedestalFirst
    : isRunnerUp
    ? styles.win2PedestalSecond
    : styles.win2PedestalThird;

  const pedEdgeClass = isWinner
    ? styles.win2PedestalEdgeFirst
    : isRunnerUp
    ? styles.win2PedestalEdgeSecond
    : styles.win2PedestalEdgeThird;

  const pedNumClass = isWinner
    ? styles.win2PedestalNumFirst
    : isRunnerUp
    ? styles.win2PedestalNumSecond
    : styles.win2PedestalNumThird;

  if (col.variant === 'honour-roll') {
    return (
      <div
        style={{ width: `${col.pedestalWidth}px` }}
        className="flex flex-col items-center justify-end shrink-0 overflow-visible"
      >
        {/* Honour Roll Card */}
        <HonourRollCard col={col} s={s} isLite={isLite} isReducedMotion={isReducedMotion} />

        {/* Shared Pedestal Slab */}
        <motion.div
          data-testid={`celebration-pedestal-${col.place}`}
          initial={isReducedMotion || isLite ? { scaleY: 1 } : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{
            duration: isReducedMotion || isLite ? 0 : 0.5,
            delay: isReducedMotion || isLite ? 0 : col.delay,
            ease: 'easeOut',
          }}
          style={{
            width: `${col.pedestalWidth}px`,
            height: `${col.pedestalHeight}px`,
            transformOrigin: 'bottom center',
          }}
          className={`${pedClass} shrink-0 flex items-center justify-center relative overflow-hidden`}
        >
          <div className={pedEdgeClass} />
          <span
            data-testid={`pedestal-numeral-${col.place}`}
            style={{ fontSize: `${col.numeralSize}px` }}
            className={pedNumClass}
          >
            {col.numeral}
          </span>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      style={{ width: `${col.pedestalWidth}px` }}
      className="flex flex-col items-center justify-end shrink-0 overflow-visible relative"
    >
      {/* Light cone for 1st place */}
      {isWinner && !isLite && <div className={styles.win2LightCone} />}

      {/* Cards Row sitting directly ON top of the pedestal */}
      <div className="flex items-end gap-[24px] overflow-visible">
        {col.teams.map((team, idx) => (
          <IndividualCelebrationCard
            key={team.id}
            team={team}
            place={col.place}
            cardWidth={col.cardWidth}
            cardHeight={col.cardHeight}
            variant={col.variant}
            delay={col.delay + idx * 0.12}
            pillText={col.pillText}
            taglineText={col.taglineText}
            isTied={col.teams.length > 1}
            s={s}
            t={t}
            isLite={isLite}
            isReducedMotion={isReducedMotion}
          />
        ))}
      </div>

      {/* Shared Pedestal Slab under all cards of this column */}
      <motion.div
        data-testid={`celebration-pedestal-${col.place}`}
        initial={isReducedMotion || isLite ? { scaleY: 1 } : { scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{
          duration: isReducedMotion || isLite ? 0 : 0.5,
          delay: isReducedMotion || isLite ? 0 : col.delay,
          ease: 'easeOut',
        }}
        style={{
          width: `${col.pedestalWidth}px`,
          height: `${col.pedestalHeight}px`,
          transformOrigin: 'bottom center',
        }}
        className={`${pedClass} shrink-0 flex items-center justify-center relative overflow-hidden`}
      >
        {/* 3px metallic top edge */}
        <div className={pedEdgeClass} />

        {/* Large engraved numeral centered with >= 8px clearance */}
        <span
          data-testid={`pedestal-numeral-${col.place}`}
          style={{ fontSize: `${col.numeralSize}px` }}
          className={pedNumClass}
        >
          {col.numeral}
        </span>
      </motion.div>
    </div>
  );
}

// =========================================================================
// INDIVIDUAL CELEBRATION CARD COMPONENT
// =========================================================================

function IndividualCelebrationCard({
  team,
  place,
  cardWidth,
  cardHeight,
  variant,
  delay,
  pillText,
  taglineText,
  isTied,
  s,
  t,
  isLite,
  isReducedMotion,
}: {
  team: RevealSnapshotTeam;
  place: 1 | 2 | 3;
  cardWidth: number;
  cardHeight: number;
  variant: 'full' | 'narrow' | 'compact';
  delay: number;
  pillText: string;
  taglineText: string;
  isTied: boolean;
  s: number;
  t: number;
  isLite: boolean;
  isReducedMotion: boolean;
}) {
  const isWinner = place === 1;
  const isRunnerUp = place === 2;
  const initials = getInitials(team.name);

  // Pill sizing & display label
  const pillHeight = Math.max(28, Math.round((isWinner ? 44 : 40) * s * (cardWidth < 360 ? 0.88 : 1)));
  const pillFontSize = Math.max(16, Math.round((isWinner ? 28 : 26) * s * (cardWidth < 360 ? 0.85 : 1)));

  // Pill label formatting
  let pillDisplay = pillText;
  if (isTied) {
    if (variant === 'compact') {
      pillDisplay = 'TIE';
    } else {
      pillDisplay = `TIE · #${place}`;
    }
  }

  // Row budget dimensions based on variant
  const pillReserve = isWinner ? Math.floor(28 + 4 * t) : Math.floor(24 + 4 * t);
  const bottomPadding = isWinner ? Math.floor(16 + 6 * t) : Math.floor(14 + 6 * t);

  // Avatar sizing
  let avatarSize = isWinner ? Math.floor(140 + 36 * t) : Math.floor(116 + 32 * t);
  if (variant === 'narrow') {
    avatarSize = Math.round(avatarSize * 0.8);
  } else if (variant === 'compact') {
    avatarSize = 64;
  }
  const avatarRowHeight = Math.max(avatarSize + 12, isWinner ? Math.floor(176 + 44 * t) : Math.floor(140 + 36 * t));

  // Name row sizing
  const nameRowHeight = isWinner ? Math.floor(110 + 30 * t) : Math.floor(90 + 26 * t);

  // Tagline row sizing (hidden in narrow and compact)
  const showTagline = variant === 'full' && taglineText.length > 0;
  const taglineRowHeight = showTagline ? (isWinner ? Math.floor(40 + 10 * t) : Math.floor(36 + 10 * t)) : 0;

  // Score row sizing
  const scoreRowHeight = isWinner ? Math.floor(110 + 30 * t) : Math.floor(96 + 28 * t);

  // Gaps distribution
  const fixedRowsHeight = avatarRowHeight + nameRowHeight + taglineRowHeight + scoreRowHeight;
  const innerTargetHeight = cardHeight - pillReserve - bottomPadding;
  const numGaps = showTagline ? 3 : 2;
  const totalGapsHeight = Math.max(numGaps * 6, innerTargetHeight - fixedRowsHeight);
  const gapSize = Math.floor(totalGapsHeight / numGaps);

  // Name text fit
  const maxNameSize = Math.round((isWinner ? 58 : 46) * s * (cardWidth < 360 ? 0.85 : 1));
  const minNameSize = Math.max(16, Math.round((isWinner ? 28 : 22) * s * (cardWidth < 360 ? 0.8 : 1)));
  const { containerRef: nameContainerRef, textRef: nameTextRef, result: nameFit } = useFitText(team.name, {
    maxFontSize: maxNameSize,
    minFontSize: minNameSize,
    maxLines: 2,
    lineHeight: 1.05,
    fontFamily: "'Cinzel', serif",
    fontWeight: 900,
  });

  // Tagline text fit
  const maxTaglineSize = Math.max(18, Math.round((isWinner ? 26 : 24) * s));
  const { containerRef: tagContainerRef, textRef: tagTextRef, result: tagFit } = useFitText(taglineText, {
    maxFontSize: maxTaglineSize,
    minFontSize: 18,
    maxLines: 2,
    lineHeight: 1.1,
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 700,
  });

  // Score font size
  const maxScoreSize = Math.round((isWinner ? 104 : 84) * s * (cardWidth < 360 ? 0.8 : 1));
  const ptsFontSize = Math.round((isWinner ? 28 : 24) * s * (cardWidth < 360 ? 0.8 : 1));

  // Safety net scale down if content exceeds inner target height
  const innerBoxRef = useRef<HTMLDivElement>(null);
  const [contentScale, setContentScale] = useState(1);

  useEffect(() => {
    const el = innerBoxRef.current;
    if (!el) return;
    const checkScale = () => {
      const target = cardHeight - pillReserve - bottomPadding;
      const actual = el.scrollHeight;
      if (actual > target + 2 && actual > 0) {
        setContentScale(target / actual);
      } else {
        setContentScale(1);
      }
    };
    checkScale();
  }, [cardHeight, pillReserve, bottomPadding, nameFit.fontSize, team.total]);

  // Frame styling
  const cardFrameClass = isWinner
    ? styles.win2CardFirst
    : isRunnerUp
    ? styles.win2CardSecond
    : styles.win2CardThird;

  const pillClass = isWinner
    ? styles.win2PillFirst
    : isRunnerUp
    ? styles.win2PillSecond
    : styles.win2PillThird;

  return (
    <motion.article
      data-testid={`celebration-card-${place}`}
      initial={isReducedMotion || isLite ? { opacity: 1, y: 0 } : { opacity: 0, y: -400 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: isReducedMotion || isLite ? 0 : 0.7,
        delay: isReducedMotion || isLite ? 0 : delay + 0.1,
        ease: 'easeOut',
      }}
      style={{
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        paddingTop: `${pillReserve}px`,
        paddingBottom: `${bottomPadding}px`,
      }}
      className={`${cardFrameClass} shrink-0 select-none overflow-visible relative`}
    >
      {/* Soft gold outer glow (winner only) */}
      {isWinner && <div className={styles.win2GoldGlow} />}

      {/* Diagonal shine sweep */}
      {!isLite && !isReducedMotion && (
        <div className={styles.win2ShineMask}>
          <div key={`${team.id}-${delay}`} className={styles.win2ShineBeam} />
        </div>
      )}

      {/* Sparkle stars */}
      {isWinner && !isLite && !isReducedMotion && (
        <div className="absolute inset-0 pointer-events-none overflow-visible z-10" aria-hidden="true">
          {STAR_OFFSETS.map((star, idx) => (
            <span
              key={idx}
              className={`text-amber-300 font-bold select-none drop-shadow ${styles.win2Star}`}
              style={{
                top: star.top,
                left: star.left,
                right: star.right,
                fontSize: `${star.size}px`,
                animationDelay: star.delay,
              }}
            >
              ✦
            </span>
          ))}
        </div>
      )}

      {/* RANK PILL: Positioned centered on top edge (translate(-50%, -50%)), z-50 */}
      <div
        data-testid={`pill-${place}`}
        className={styles.win2PillWrapper}
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          maxWidth: 'calc(100% - 16px)',
        }}
      >
        <motion.div
          initial={isReducedMotion || isLite ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: isReducedMotion || isLite ? 0 : 0.5,
            delay: isReducedMotion || isLite ? 0 : delay + 0.35,
            ease: 'easeOut',
          }}
          className={pillClass}
          style={{
            height: `${pillHeight}px`,
            fontSize: `${pillFontSize}px`,
            paddingLeft: `${Math.round(18 * s)}px`,
            paddingRight: `${Math.round(18 * s)}px`,
            textOverflow: 'clip',
          }}
        >
          {isWinner && <span className="mr-2">👑</span>}
          <span>{pillDisplay}</span>
          {isWinner && <span className="ml-2">👑</span>}
        </motion.div>
      </div>

      {/* INNER CONTENT GRID (Safety net scale down if exceeds height) */}
      <div
        ref={innerBoxRef}
        style={{
          transform: contentScale < 1 ? `scale(${contentScale})` : undefined,
          transformOrigin: 'top center',
          width: '100%',
          height: `${cardHeight - pillReserve - bottomPadding}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}
        className="overflow-visible"
      >
        {/* ROW 1: AVATAR ROW */}
        <div
          data-testid={`avatar-zone-${place}`}
          style={{ height: `${avatarRowHeight}px` }}
          className="w-full flex items-center justify-center shrink-0 relative overflow-visible"
        >
          <div
            data-testid={`avatar-container-${place}`}
            style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
            className="relative flex items-center justify-center shrink-0"
          >
            {/* Crown for winner */}
            {isWinner && <WinnerCrownSvg />}

            {/* Breathing gold halo */}
            {isWinner && !isLite && (
              <div
                style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
                className={styles.win2BreathingHalo}
              />
            )}

            {/* Avatar circle */}
            <div
              style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
              className={`rounded-full flex items-center justify-center shadow-xl ${
                isWinner
                  ? 'p-[4px] bg-gradient-to-tr from-[#FFE27A] via-[#F5A623] to-[#FFE27A]'
                  : isRunnerUp
                  ? 'p-[3.5px] bg-gradient-to-tr from-[#F2F4F8] via-[#FFFFFF] to-[#9AA3B5]'
                  : 'p-[3.5px] bg-gradient-to-tr from-[#F0B27A] via-[#EA580C] to-[#B9732F]'
              }`}
            >
              <div
                className={`w-full h-full rounded-full flex flex-col items-center justify-center border-2 ${
                  isWinner
                    ? 'bg-gradient-to-b from-[#241366] to-[#120835] border-amber-300/80'
                    : isRunnerUp
                    ? 'bg-gradient-to-b from-[#29177a] to-[#140942] border-white/60'
                    : 'bg-gradient-to-b from-[#29177a] to-[#140942] border-orange-300/60'
                }`}
              >
                <span
                  style={{ fontSize: `${Math.round(avatarSize * 0.36)}px` }}
                  className={`font-cinzel font-black tracking-wider leading-none ${
                    isWinner ? 'text-amber-300' : 'text-white'
                  }`}
                >
                  {initials}
                </span>
              </div>
            </div>

            {/* Laurel wreath around winner */}
            {isWinner && (
              <>
                <div className="absolute -left-5 top-1/4 pointer-events-none text-amber-400 opacity-90 drop-shadow">
                  <svg className="w-6 h-12 fill-current" viewBox="0 0 20 32">
                    <path d="M16 2 C10 6 8 14 10 24 C6 20 5 13 8 7 Z" />
                    <path d="M13 10 C8 14 7 20 10 28 C5 24 4 17 8 11 Z" />
                  </svg>
                </div>
                <div className="absolute -right-5 top-1/4 pointer-events-none text-amber-400 opacity-90 drop-shadow scale-x-[-1]">
                  <svg className="w-6 h-12 fill-current" viewBox="0 0 20 32">
                    <path d="M16 2 C10 6 8 14 10 24 C6 20 5 13 8 7 Z" />
                    <path d="M13 10 C8 14 7 20 10 28 C5 24 4 17 8 11 Z" />
                  </svg>
                </div>
              </>
            )}

            {/* Medals for 2nd and 3rd */}
            {isRunnerUp && <SilverMedalBadge36 />}
            {place === 3 && <BronzeMedalBadge36 />}
          </div>
        </div>

        {/* GAP 1 */}
        <div style={{ height: `${gapSize}px` }} className="shrink-0" />

        {/* ROW 2: NAME ROW (Fits both width and height, never ellipsis) */}
        <div
          ref={nameContainerRef}
          data-testid={`name-zone-${place}`}
          style={{ height: `${nameRowHeight}px` }}
          className="w-full flex items-center justify-center text-center px-4 shrink-0 overflow-hidden"
        >
          <h2
            ref={nameTextRef as React.RefObject<HTMLHeadingElement>}
            data-testid={`name-text-${place}`}
            style={{
              fontSize: `${nameFit.fontSize}px`,
              lineHeight: 1.05,
              wordBreak: 'keep-all',
              overflowWrap: 'normal',
              hyphens: 'none',
              whiteSpace: 'normal',
              textOverflow: 'clip',
              transform: nameFit.scale < 1 ? `scale(${nameFit.scale})` : undefined,
              transformOrigin: 'center center',
              margin: 0,
              padding: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="font-cinzel text-[#FFFFF0] font-black tracking-wide text-center uppercase drop-shadow-md select-none"
          >
            {team.name}
          </h2>
        </div>

        {/* ROW 3: TAGLINE (Only in 'full' variant, never ellipsis) */}
        {showTagline && (
          <>
            <div style={{ height: `${gapSize}px` }} className="shrink-0" />
            <div
              ref={tagContainerRef}
              data-testid={`tagline-zone-${place}`}
              style={{ height: `${taglineRowHeight}px` }}
              className="w-full flex items-center justify-center text-center px-4 shrink-0 overflow-hidden"
            >
              <span
                ref={tagTextRef as React.RefObject<HTMLSpanElement>}
                data-testid={`tagline-text-${place}`}
                style={{
                  fontSize: `${tagFit.fontSize}px`,
                  lineHeight: 1.1,
                  wordBreak: 'keep-all',
                  overflowWrap: 'normal',
                  whiteSpace: 'normal',
                  textOverflow: 'clip',
                  transform: tagFit.scale < 1 ? `scale(${tagFit.scale})` : undefined,
                  transformOrigin: 'center center',
                }}
                className={`font-outfit font-bold uppercase tracking-wider text-center leading-tight ${
                  isWinner ? 'text-amber-200/95' : isRunnerUp ? 'text-slate-200' : 'text-orange-200/95'
                }`}
              >
                {taglineText}
              </span>
            </div>
          </>
        )}

        {/* GAP TO SCORE */}
        <div style={{ height: `${gapSize}px` }} className="shrink-0" />

        {/* ROW 4: SCORE ROW (Tabular nums, never clipped, never ellipsis) */}
        <div
          data-testid={`score-zone-${place}`}
          style={{ height: `${scoreRowHeight}px` }}
          className="w-full flex items-baseline justify-center gap-3 shrink-0 overflow-hidden"
        >
          <CelebrateAnimatedScore
            value={team.total}
            delayMs={Math.round((delay + 0.3) * 1000)}
            maxSize={maxScoreSize}
            availWidth={cardWidth - 80}
            isWinner={isWinner}
            isLite={isLite}
            isReducedMotion={isReducedMotion}
          />
          <span
            data-testid={`score-pts-${place}`}
            style={{ fontSize: `${ptsFontSize}px` }}
            className={`font-outfit font-black tracking-wider leading-none ${
              isWinner ? 'text-amber-300' : 'text-purple-200'
            }`}
          >
            PTS
          </span>
        </div>
      </div>
    </motion.article>
  );
}

// =========================================================================
// HONOUR ROLL CARD COMPONENT (Used when place group has > 8 cards or all tied)
// =========================================================================

function HonourRollCard({
  col,
  s,
  isLite,
  isReducedMotion,
}: {
  col: PodiumColumnSpec;
  s: number;
  isLite: boolean;
  isReducedMotion: boolean;
}) {
  const isWinner = col.place === 1;
  const pillHeight = Math.round(44 * s);
  const pillFontSize = Math.round(26 * s);
  const pillClass = isWinner ? styles.win2PillFirst : styles.win2PillSecond;

  const sharedScore = col.teams[0]?.total || 0;
  const numColumns = col.teams.length > 10 ? 3 : 2;

  return (
    <motion.article
      data-testid={`celebration-card-${col.place}`}
      initial={isReducedMotion || isLite ? { opacity: 1, y: 0 } : { opacity: 0, y: -400 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: isReducedMotion || isLite ? 0 : 0.7,
        delay: isReducedMotion || isLite ? 0 : col.delay,
        ease: 'easeOut',
      }}
      style={{
        width: `${col.cardWidth}px`,
        height: `${col.cardHeight}px`,
        paddingTop: '36px',
        paddingBottom: '20px',
        paddingLeft: '32px',
        paddingRight: '32px',
      }}
      className={`${styles.win2CardHonourRoll} shrink-0 select-none overflow-visible relative flex flex-col items-center justify-between`}
    >
      {/* Pill */}
      <div
        data-testid={`pill-${col.place}`}
        className={styles.win2PillWrapper}
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          maxWidth: 'calc(100% - 16px)',
        }}
      >
        <div
          className={pillClass}
          style={{
            height: `${pillHeight}px`,
            fontSize: `${pillFontSize}px`,
            paddingLeft: `${Math.round(22 * s)}px`,
            paddingRight: `${Math.round(22 * s)}px`,
          }}
        >
          {isWinner && <span className="mr-2">👑</span>}
          <span>{col.pillText}</span>
          {isWinner && <span className="ml-2">👑</span>}
        </div>
      </div>

      {/* Shared score at the top */}
      <div className="flex items-baseline justify-center gap-3 pt-3 shrink-0">
        <span
          data-testid="score-value"
          style={{ fontSize: `${Math.round(72 * s)}px` }}
          className="font-outfit font-black text-amber-300 tabular-nums leading-none drop-shadow"
        >
          {formatScore(sharedScore)}
        </span>
        <span
          style={{ fontSize: `${Math.round(28 * s)}px` }}
          className="font-outfit font-black text-amber-300 tracking-wider leading-none"
        >
          PTS EACH
        </span>
      </div>

      {/* Multi-column list of team names with small avatars */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
          gap: '12px 24px',
          width: '100%',
          flex: 1,
          alignContent: 'center',
          overflow: 'hidden',
          paddingTop: '16px',
        }}
      >
        {col.teams.map((team) => (
          <div
            key={team.id}
            className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2 overflow-hidden"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-300 to-amber-600 flex items-center justify-center shrink-0">
              <span className="font-cinzel text-xs font-black text-indigo-950">
                {getInitials(team.name)}
              </span>
            </div>
            <span
              style={{
                fontSize: `${Math.max(16, Math.round(22 * s * (col.teams.length > 12 ? 0.8 : 1)))}px`,
                wordBreak: 'keep-all',
                overflowWrap: 'normal',
                hyphens: 'none',
                textOverflow: 'clip',
              }}
              className="font-cinzel font-black text-[#FFFFF0] uppercase tracking-wide"
            >
              {team.name}
            </span>
          </div>
        ))}
      </div>
    </motion.article>
  );
}

// =========================================================================
// CELEBRATION FOOTER COMPONENT (Auto-fits verse, never truncates, no ellipsis)
// =========================================================================

function CelebrationFooter({
  verseText,
  verseRef,
  rightText,
  footerHeight,
  footerBottomMargin,
  s,
}: {
  verseText: string;
  verseRef: string;
  rightText: string;
  footerHeight: number;
  footerBottomMargin: number;
  s: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [verseSize, setVerseSize] = useState(Math.round(28 * s));
  const [showRightText, setShowRightText] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const availWidth = el.clientWidth - 80; // 40px padding each side
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fullVerseString = `“Well done, thou good and faithful servant.” ${verseRef}`;
    const minVerseSize = 22;
    const targetSize = Math.round(28 * s);

    // Check if verse + rightText fit together
    ctx.font = `italic 700 ${targetSize}px 'Cinzel', serif`;
    let vWidth = ctx.measureText(fullVerseString).width;
    ctx.font = `bold ${Math.round(22 * s)}px 'Outfit', sans-serif`;
    let rWidth = ctx.measureText(rightText).width;

    if (vWidth + rWidth + 40 <= availWidth) {
      setVerseSize(targetSize);
      setShowRightText(true);
      return;
    }

    // Try shrinking verse font down to minVerseSize
    let fitsWithRight = false;
    for (let sz = targetSize - 1; sz >= minVerseSize; sz--) {
      ctx.font = `italic 700 ${sz}px 'Cinzel', serif`;
      vWidth = ctx.measureText(fullVerseString).width;
      if (vWidth + rWidth + 40 <= availWidth) {
        setVerseSize(sz);
        setShowRightText(true);
        fitsWithRight = true;
        break;
      }
    }

    // If still doesn't fit with right text at 22px: center verse and hide right text
    if (!fitsWithRight) {
      setShowRightText(false);
      setVerseSize(Math.max(20, Math.min(targetSize, Math.floor((availWidth / vWidth) * targetSize))));
    }
  }, [verseText, verseRef, rightText, s]);

  return (
    <div
      style={{
        marginBottom: `${footerBottomMargin}px`,
        height: `${footerHeight}px`,
      }}
      className="w-full shrink-0 px-12 z-30"
    >
      <footer
        ref={containerRef}
        data-testid="celebration-footer"
        style={{ height: `${footerHeight}px` }}
        className={`w-full bg-[#1e0b57]/90 backdrop-blur-md border border-white/15 rounded-2xl flex items-center px-10 shadow-2xl ${
          showRightText ? 'justify-between' : 'justify-center'
        }`}
      >
        {/* Bible Verse */}
        <div className="flex items-center gap-3 overflow-hidden text-center">
          <span className="text-amber-400 text-xl font-bold">✝</span>
          <p
            style={{
              fontSize: `${verseSize}px`,
              wordBreak: 'keep-all',
              whiteSpace: 'nowrap',
              textOverflow: 'clip',
            }}
            className="font-serif text-[#FDFBF7] italic tracking-wide m-0"
          >
            &ldquo;Well done, thou good and faithful servant.&rdquo;
            <span className="text-amber-300 font-bold not-italic ml-2.5">{verseRef}</span>
          </p>
        </div>

        {/* Right Text (hidden if not enough space at 22px) */}
        {showRightText && (
          <div
            style={{
              fontSize: `${Math.round(22 * s)}px`,
              textOverflow: 'clip',
            }}
            className="text-purple-200 uppercase tracking-widest font-outfit font-bold shrink-0 ml-6 opacity-85"
          >
            <span>{rightText}</span>
          </div>
        )}
      </footer>
    </div>
  );
}
