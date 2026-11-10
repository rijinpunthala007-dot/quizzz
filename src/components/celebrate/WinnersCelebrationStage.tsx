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
  const minSize = Math.round(maxSize * 0.70);

  // Score text size fitting (shrinks down to 70% if wide)
  useEffect(() => {
    const formatted = formatScore(value);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = `900 ${maxSize}px 'Outfit', sans-serif`;
    const numWidth = ctx.measureText(formatted).width;
    if (numWidth > availWidth) {
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
          <linearGradient id="win2SilverMedal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#D1D5DB" />
            <stop offset="100%" stopColor="#9CA3AF" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r="16.5" fill="url(#win2SilverMedal)" stroke="#F3F4F6" strokeWidth="1.5" />
        <circle cx="18" cy="18" r="12.5" fill="none" stroke="#6B7280" strokeWidth="1.2" />
        <text
          x="18"
          y="23.5"
          textAnchor="middle"
          fontSize="17"
          fontWeight="900"
          fill="#111827"
          fontFamily="'Outfit', sans-serif"
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
          <linearGradient id="win2BronzeMedal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDBA74" />
            <stop offset="50%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#9A3412" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r="16.5" fill="url(#win2BronzeMedal)" stroke="#FED7AA" strokeWidth="1.5" />
        <circle cx="18" cy="18" r="12.5" fill="none" stroke="#7C2D12" strokeWidth="1.2" />
        <text
          x="18"
          y="23.5"
          textAnchor="middle"
          fontSize="17"
          fontWeight="900"
          fill="#431407"
          fontFamily="'Outfit', sans-serif"
        >
          3
        </text>
      </svg>
    </div>
  );
}

/**
 * Gold Crown SVG component for Winner Card (anchored above avatar)
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
  const lerp = useCallback((a: number, b: number) => Math.floor(a + (b - a) * t), [t]);

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

  // Top 3 teams snapshot
  const topTeams = useMemo(() => {
    if (state.winnersSnapshot && state.winnersSnapshot.length > 0) {
      return state.winnersSnapshot;
    }
    return createRevealSnapshot(state);
  }, [state.winnersSnapshot, state]);

  // Group teams by placement (handling ties)
  const firstRank = useMemo(() => topTeams.filter((t) => t.rank === 1), [topTeams]);
  const secondRank = useMemo(() => topTeams.filter((t) => t.rank === 2), [topTeams]);
  const thirdRank = useMemo(() => topTeams.filter((t) => t.rank === 3), [topTeams]);

  // Stage vertical budget (linear interpolation with t)
  const topPadding = lerp(36, 56);
  const bannerHeight = lerp(96, 124);
  const bannerFont = lerp(60, 76);
  const gapBannerSubtitle = 6;
  const subtitleHeight = lerp(44, 58);
  const subtitleFont = lerp(34, 44);
  const coneAir = lerp(40, 70);
  const gapCardsFooter = lerp(40, 60);
  const footerHeight = lerp(56, 72);
  const footerBottomMargin = lerp(14, 20);

  const totalNonCardsHeight =
    topPadding +
    bannerHeight +
    gapBannerSubtitle +
    subtitleHeight +
    coneAir +
    gapCardsFooter +
    footerHeight +
    footerBottomMargin;

  const cardsAreaHeight = H - totalNonCardsHeight;

  // Pedestal Heights
  const ped1Height = lerp(120, 168);
  const ped2Height = lerp(84, 118);
  const ped3Height = lerp(56, 80);

  // Card Heights
  const card1Height = lerp(500, 640);
  const card23Height = lerp(420, 540);

  const soundEnabled = Boolean(state.soundEnabled);
  const celebrateTrigger = state.celebrateTrigger;

  return (
    <div
      data-testid="winners-celebration-stage"
      style={{
        width: '1920px',
        height: `${H}px`,
      }}
      className={`relative select-none flex flex-col justify-between overflow-hidden ${styles.win2Root} ${
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
        {/* Banner with soft light sweep */}
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
          transition={{ duration: isReducedMotion || isLite ? 0 : 0.8, delay: isReducedMotion || isLite ? 0 : 0.15, ease: 'easeOut' }}
          style={{ height: `${subtitleHeight}px` }}
          className="flex items-center justify-center text-center"
        >
          <p
            style={{ fontSize: `${subtitleFont}px` }}
            className="font-outfit text-amber-300 font-bold tracking-wide drop-shadow m-0 p-0"
          >
            {wording.subtitle}
          </p>
        </motion.div>
      </div>

      {/* 3. FREE AIR FOR LIGHT CONE */}
      <div style={{ height: `${coneAir}px` }} className="w-full shrink-0" />

      {/* 4. MAIN PEDESTALS & CARDS AREA (Bottom-aligned on shared baseline, 36px gap) */}
      <div
        style={{ height: `${cardsAreaHeight}px` }}
        className="w-full flex items-end justify-center gap-[36px] overflow-visible z-20"
      >
        {/* 2ND PLACE (Left) - Rises 2nd (t = 0.7s) */}
        {secondRank.length > 0 && (
          <div className="flex items-end gap-4 overflow-visible">
            {secondRank.map((team) => (
              <PedestalAndCard
                key={team.id}
                team={team}
                rank={2}
                delay={0.7}
                pillText={wording.pill2}
                taglineText={wording.tagline2}
                isTied={secondRank.length > 1}
                sharedRank={2}
                cardHeight={card23Height}
                pedestalHeight={ped2Height}
                cardWidth={secondRank.length > 1 ? Math.floor((470 - 16) / secondRank.length) : 470}
                t={t}
                s={s}
                lerp={lerp}
                isReducedMotion={isReducedMotion}
                isLite={isLite}
              />
            ))}
          </div>
        )}

        {/* 1ST PLACE (Center) - Rises 3rd (t = 1.3s) */}
        {firstRank.length > 0 && (
          <div className="flex items-end gap-4 overflow-visible relative">
            {/* Winner Light Cone */}
            {!isLite && <div className={styles.win2LightCone} />}

            {firstRank.map((team) => (
              <PedestalAndCard
                key={team.id}
                team={team}
                rank={1}
                delay={1.3}
                pillText={wording.pill1}
                taglineText={wording.tagline1}
                isTied={firstRank.length > 1}
                sharedRank={1}
                cardHeight={card1Height}
                pedestalHeight={ped1Height}
                cardWidth={firstRank.length > 1 ? Math.floor((560 - 16) / firstRank.length) : 560}
                t={t}
                s={s}
                lerp={lerp}
                isReducedMotion={isReducedMotion}
                isLite={isLite}
              />
            ))}
          </div>
        )}

        {/* 3RD PLACE (Right) - Rises 1st (t = 0.1s) */}
        {thirdRank.length > 0 && (
          <div className="flex items-end gap-4 overflow-visible">
            {thirdRank.map((team) => (
              <PedestalAndCard
                key={team.id}
                team={team}
                rank={3}
                delay={0.1}
                pillText={wording.pill3}
                taglineText={wording.tagline3}
                isTied={thirdRank.length > 1}
                sharedRank={3}
                cardHeight={card23Height}
                pedestalHeight={ped3Height}
                cardWidth={thirdRank.length > 1 ? Math.floor((470 - 16) / thirdRank.length) : 470}
                t={t}
                s={s}
                lerp={lerp}
                isReducedMotion={isReducedMotion}
                isLite={isLite}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. GAP BETWEEN PEDESTALS AND FOOTER */}
      <div style={{ height: `${gapCardsFooter}px` }} className="w-full shrink-0" />

      {/* 6. PINNED FOOTER STRIP */}
      <div
        style={{
          marginBottom: `${footerBottomMargin}px`,
          height: `${footerHeight}px`,
        }}
        className="w-full shrink-0 px-12 z-30"
      >
        <footer
          data-testid="celebration-footer"
          style={{ height: `${footerHeight}px` }}
          className="w-full bg-[#1e0b57]/90 backdrop-blur-md border border-white/15 rounded-2xl flex items-center justify-between px-10 shadow-2xl"
        >
          {/* Bible Verse */}
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="text-amber-400 text-xl font-bold">✝</span>
            <p
              style={{ fontSize: `${Math.round(28 * s)}px` }}
              className="font-serif text-[#FDFBF7] italic tracking-wide m-0 truncate"
            >
              &ldquo;Well done, thou good and faithful servant.&rdquo;
              <span className="text-amber-300 font-bold not-italic ml-2.5">— Matthew 25:21</span>
            </p>
          </div>

          {/* Right Text */}
          <div
            style={{ fontSize: `${Math.round(22 * s)}px` }}
            className="text-purple-200 uppercase tracking-widest font-outfit font-bold shrink-0 ml-6 opacity-85"
          >
            <span>{wording.footerText}</span>
          </div>
        </footer>
      </div>

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
// PEDESTAL AND CARD COMBINED COMPONENT
// =========================================================================
interface PedestalAndCardProps {
  team: RevealSnapshotTeam;
  rank: 1 | 2 | 3;
  delay: number;
  pillText: string;
  taglineText: string;
  isTied: boolean;
  sharedRank: number;
  cardHeight: number;
  pedestalHeight: number;
  cardWidth: number;
  t: number;
  s: number;
  lerp: (a: number, b: number) => number;
  isReducedMotion: boolean;
  isLite: boolean;
}

function PedestalAndCard({
  team,
  rank,
  delay,
  pillText,
  taglineText,
  isTied,
  sharedRank,
  cardHeight,
  pedestalHeight,
  cardWidth,
  s,
  lerp,
  isReducedMotion,
  isLite,
}: PedestalAndCardProps) {
  const isWinner = rank === 1;
  const isRunnerUp = rank === 2;
  const initials = getInitials(team.name);

  // Pedestal numeral size
  const pedestalNumSize = Math.round((isWinner ? 112 : isRunnerUp ? 88 : 76) * s);

  // Card Content Row Budgets (lerp linearly with t)
  const pillReserve = isWinner ? lerp(28, 32) : lerp(24, 28);
  const avatarRowHeight = isWinner ? lerp(176, 220) : lerp(140, 176);
  const avatarSize = isWinner ? lerp(140, 176) : lerp(116, 148);
  const nameRowHeight = isWinner ? lerp(110, 140) : lerp(90, 116);
  const taglineRowHeight = isWinner ? lerp(40, 50) : lerp(36, 46);
  const scoreRowHeight = isWinner ? lerp(110, 140) : lerp(96, 124);
  const bottomPadding = isWinner ? lerp(16, 22) : lerp(14, 20);

  // Distribute remaining height evenly into the 3 gaps
  const fixedRowsHeight = avatarRowHeight + nameRowHeight + taglineRowHeight + scoreRowHeight;
  const innerTargetHeight = cardHeight - pillReserve - bottomPadding;
  const totalGapsHeight = Math.max(18, innerTargetHeight - fixedRowsHeight);
  const gap1 = Math.floor(totalGapsHeight / 3);
  const gap2 = Math.floor(totalGapsHeight / 3);
  const gap3 = totalGapsHeight - gap1 - gap2;

  // Pill sizing
  const pillHeight = Math.round((isWinner ? 44 : 40) * s);
  const pillFontSize = Math.round((isWinner ? 28 : 26) * s);
  const pillDisplay = isTied ? `TIE · ${pillText}` : pillText;

  // Text fitting for team name
  const maxNameSize = Math.round((isWinner ? 60 : 46) * s);
  const minNameSize = Math.round((isWinner ? 30 : 24) * s);
  const { containerRef: nameContainerRef, textRef: nameTextRef, result: nameFit } = useFitText(team.name, {
    maxFontSize: maxNameSize,
    minFontSize: minNameSize,
    maxLines: 2,
    lineHeight: 1.05,
  });

  // Tagline font size
  const taglineFontSize = Math.max(20, Math.round((isWinner ? 26 : 24) * s));

  // Score font size
  const maxScoreSize = Math.round((isWinner ? 104 : 84) * s);
  const ptsFontSize = Math.round((isWinner ? 30 : 26) * s);

  // Safety net uniform scale down if inner content exceeds card target height
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

  // Frame classes
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

  return (
    <div
      style={{ width: `${cardWidth}px` }}
      className="flex flex-col items-center justify-end shrink-0 overflow-visible"
    >
      {/* 1. CARD */}
      <motion.article
        data-testid={`celebration-card-${rank}`}
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
        className={`${cardFrameClass} shrink-0 select-none overflow-visible`}
      >
        {/* Soft static gold glow (1st card only, animate opacity only) */}
        {isWinner && <div className={styles.win2GoldGlow} />}

        {/* Diagonal shine beam on landing */}
        {!isLite && !isReducedMotion && (
          <div className={styles.win2ShineMask}>
            <div key={`${team.id}-${delay}`} className={styles.win2ShineBeam} />
          </div>
        )}

        {/* Twinkling sparkle stars on winner card */}
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

        {/* RANK PILL (Straddling top edge, half above) */}
        <motion.div
          data-testid={`pill-${rank}`}
          initial={isReducedMotion || isLite ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.7, y: -15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: isReducedMotion || isLite ? 0 : 0.5, delay: isReducedMotion || isLite ? 0 : delay + 0.45, ease: 'easeOut' }}
          className={pillClass}
          style={{
            height: `${pillHeight}px`,
            fontSize: `${pillFontSize}px`,
            paddingLeft: `${Math.round(22 * s)}px`,
            paddingRight: `${Math.round(22 * s)}px`,
            top: `-${Math.round(pillHeight / 2)}px`,
          }}
        >
          {isWinner && <span className="mr-2">👑</span>}
          <span>{pillDisplay}</span>
          {isWinner && <span className="ml-2">👑</span>}
        </motion.div>

        {/* INNER CONTENT GRID (Strict fixed rows with safety net scale) */}
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
            data-testid={`avatar-zone-${rank}`}
            style={{ height: `${avatarRowHeight}px` }}
            className="w-full flex items-center justify-center shrink-0 relative overflow-visible"
          >
            <div
              style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
              className="relative flex items-center justify-center shrink-0"
            >
              {/* Crown for winner */}
              {isWinner && <WinnerCrownSvg />}

              {/* Slowly breathing gold halo for winner */}
              {isWinner && !isLite && (
                <div
                  style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
                  className={styles.win2BreathingHalo}
                />
              )}

              {/* Double ring avatar container */}
              <div
                data-testid={`avatar-container-${rank}`}
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

              {/* Laurel wreath around winner avatar */}
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

              {/* 36px Medal Badges for 2nd and 3rd */}
              {isRunnerUp && <SilverMedalBadge36 />}
              {rank === 3 && <BronzeMedalBadge36 />}
            </div>
          </div>

          {/* GAP 1 */}
          <div style={{ height: `${gap1}px` }} className="shrink-0" />

          {/* ROW 2: NAME ROW */}
          <div
            ref={nameContainerRef}
            data-testid={`name-zone-${rank}`}
            style={{ height: `${nameRowHeight}px` }}
            className="w-full flex items-center justify-center text-center px-4 shrink-0 overflow-hidden"
          >
            <h2
              ref={nameTextRef as React.RefObject<HTMLHeadingElement>}
              data-testid={`name-text-${rank}`}
              style={{
                fontSize: `${nameFit.fontSize}px`,
                lineHeight: 1.05,
                wordBreak: 'keep-all',
                overflowWrap: 'normal',
                hyphens: 'none',
                whiteSpace: 'normal',
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

          {/* GAP 2 */}
          <div style={{ height: `${gap2}px` }} className="shrink-0" />

          {/* ROW 3: TAGLINE ROW */}
          <div
            data-testid={`tagline-zone-${rank}`}
            style={{ height: `${taglineRowHeight}px` }}
            className="w-full flex items-center justify-center text-center px-4 shrink-0 overflow-hidden"
          >
            <span
              data-testid={`tagline-text-${rank}`}
              style={{ fontSize: `${taglineFontSize}px` }}
              className={`font-outfit font-bold uppercase tracking-wider truncate leading-tight ${
                isWinner
                  ? 'text-amber-200/95'
                  : isRunnerUp
                  ? 'text-slate-200'
                  : 'text-orange-200/95'
              }`}
            >
              {taglineText}
            </span>
          </div>

          {/* GAP 3 */}
          <div style={{ height: `${gap3}px` }} className="shrink-0" />

          {/* ROW 4: SCORE ROW */}
          <div
            data-testid={`score-zone-${rank}`}
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
              data-testid={`score-pts-${rank}`}
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

      {/* 2. PEDESTAL (Sits directly under the card) */}
      <motion.div
        data-testid={`celebration-pedestal-${rank}`}
        initial={isReducedMotion || isLite ? { scaleY: 1 } : { scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{
          duration: isReducedMotion || isLite ? 0 : 0.5,
          delay: isReducedMotion || isLite ? 0 : delay,
          ease: 'easeOut',
        }}
        style={{
          width: `${cardWidth}px`,
          height: `${pedestalHeight}px`,
          transformOrigin: 'bottom center',
        }}
        className={`${pedClass} shrink-0 flex items-center justify-center relative overflow-hidden`}
      >
        {/* 3px metallic top edge */}
        <div className={pedEdgeClass} />

        {/* Large engraved numeral */}
        <span
          style={{ fontSize: `${pedestalNumSize}px` }}
          className={pedNumClass}
        >
          {sharedRank}
        </span>
      </motion.div>
    </div>
  );
}
