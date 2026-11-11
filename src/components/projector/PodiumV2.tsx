import { memo, useMemo, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { RankedTeam, Level, Team } from '../../types';
import type { ProjectorLayout } from './layout';
import AnimatedScore from './AnimatedScore';
import { getInitials, formatScore } from '../../utils';
import { useDisplaySettings } from '../../hooks/useDisplaySettings';
import styles from './PodiumV2.module.css';

interface PodiumProps {
  teams: RankedTeam[];
  levels: Level[];
  allTeams?: Team[];
  focus?: string;
  disableAnimation?: boolean;
  isCelebrating?: boolean;
  podiumHeight?: number;
  layout?: ProjectorLayout;
}

const springTransition = {
  type: 'spring' as const,
  stiffness: 120,
  damping: 20,
};

const WINNER_STARS = [
  { top: 20, left: -16, size: 14, delay: '0s', duration: '2.1s' },
  { top: 78, left: -22, size: 12, delay: '0.7s', duration: '2.4s' },
  { top: 185, left: -16, size: 15, delay: '1.3s', duration: '1.9s' },
  { top: 22, right: -16, size: 14, delay: '0.4s', duration: '2.2s' },
  { top: 90, right: -24, size: 12, delay: '1.1s', duration: '2.5s' },
  { top: 180, right: -18, size: 15, delay: '1.7s', duration: '2.0s' },
];

interface FitPodiumCardNameResult {
  fontSize: number;
  scale: number;
}

/**
 * Custom text fitting hook for team names on podium cards.
 * Max 2 lines (line-height 1.05), words never split, never ellipsis.
 * Binary search 1 line first, then 2 lines.
 * If still does not fit at minSize, scale down with transform (origin center).
 * Never let text overflow upward or downward out of its zone.
 */
function useFitPodiumCardName(
  name: string,
  maxSize: number,
  minSize: number,
  containerRef: React.RefObject<HTMLDivElement | null>,
  textRef: React.RefObject<HTMLHeadingElement | null>,
  layoutHeight?: number
): FitPodiumCardNameResult {
  const [result, setResult] = useState<FitPodiumCardNameResult>({
    fontSize: maxSize,
    scale: 1,
  });

  const fit = useCallback(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el || !name) return;

    const computed = window.getComputedStyle(container);
    const padLeft = parseFloat(computed.paddingLeft) || 0;
    const padRight = parseFloat(computed.paddingRight) || 0;
    const padTop = parseFloat(computed.paddingTop) || 0;
    const padBottom = parseFloat(computed.paddingBottom) || 0;

    const availWidth = Math.max(1, (maxSize >= 44 ? 434 : 368));
    const availHeight = Math.max(1, (container.clientHeight || (maxSize >= 44 ? 64 : 60)) - padTop - padBottom);
    const maxContainerWidth = Math.max(availWidth, container.clientWidth - padLeft - padRight);

    el.style.wordBreak = 'keep-all';
    el.style.overflowWrap = 'normal';
    el.style.hyphens = 'none';
    el.style.lineHeight = '1.05';
    el.style.whiteSpace = 'normal';
    el.style.transform = '';

    // Check canvas 1-line check like baseline
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const checkOneLineCanvas = (size: number): boolean => {
      if (!ctx) return false;
      ctx.font = `bold ${size}px 'Cinzel', serif`;
      const textWidth = ctx.measureText(name).width;
      return textWidth <= availWidth && size * 1.05 <= availHeight;
    };

    let low = minSize;
    let high = maxSize;
    let best1 = -1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (checkOneLineCanvas(mid)) {
        best1 = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Verify DOM: does best1 fit within availHeight in DOM?
    if (best1 >= minSize) {
      el.style.fontSize = `${best1}px`;
      if (el.scrollHeight <= availHeight + 1 && el.scrollWidth <= (container.clientWidth || availWidth) + 1) {
        setResult({ fontSize: best1, scale: 1 });
        return;
      }
    }

    // If best1 caused wrapping that overflows availHeight (e.g. Psycho Simon at 1024x768),
    // binary search down in DOM so that BOTH scrollHeight <= availHeight and scrollWidth <= maxContainerWidth!
    low = minSize;
    high = best1 > minSize ? best1 - 1 : maxSize;
    let bestDOM = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      el.style.fontSize = `${mid}px`;
      if (el.scrollHeight <= availHeight + 1 && el.scrollWidth <= maxContainerWidth + 1) {
        bestDOM = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (bestDOM >= minSize) {
      el.style.fontSize = `${bestDOM}px`;
      setResult({ fontSize: bestDOM, scale: 1 });
      return;
    }

    // If still does not fit at minSize: scale down with transform
    el.style.fontSize = `${minSize}px`;
    const sW = maxContainerWidth / Math.max(1, el.scrollWidth);
    const sH = availHeight / Math.max(1, el.scrollHeight);
    const scale = Math.min(1, sW, sH);

    setResult({ fontSize: minSize, scale });
  }, [name, maxSize, minSize, containerRef, textRef]);

  useLayoutEffect(() => {
    fit();

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(fit);
    }

    const container = containerRef.current;
    if (!container) return;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fit);
      ro.observe(container);
    }

    const handleWindowChange = () => fit();
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('fullscreenchange', handleWindowChange);
    window.addEventListener('orientationchange', handleWindowChange);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('fullscreenchange', handleWindowChange);
      window.removeEventListener('orientationchange', handleWindowChange);
    };
  }, [fit, layoutHeight]);

  return result;
}

/**
 * Score fitting hook: shrinks score down to 70% of maximum if wide, never below.
 */
function useFitPodiumScore(scoreStr: string, maxScoreSize: number, availScoreWidth: number) {
  const [scoreFontSize, setScoreFontSize] = useState(maxScoreSize);
  const minScoreSize = Math.round(maxScoreSize * 0.70);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = `900 ${maxScoreSize}px 'Outfit', sans-serif`;
    const numWidth = ctx.measureText(scoreStr).width;

    if (numWidth > availScoreWidth) {
      const scaleRatio = availScoreWidth / numWidth;
      const fitted = Math.max(minScoreSize, Math.round(maxScoreSize * scaleRatio));
      setScoreFontSize(fitted);
    } else {
      setScoreFontSize(maxScoreSize);
    }
  }, [scoreStr, maxScoreSize, minScoreSize, availScoreWidth]);

  return scoreFontSize;
}

/**
 * Gold Crown SVG component (22px tall, anchored to avatar's top, overlapping by 8px, never touching pill)
 */
function WinnerCrown() {
  return (
    <div
      data-testid="podium-crown"
      style={{
        position: 'absolute',
        top: '-14px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '36px',
        height: '22px',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      <svg
        viewBox="0 0 36 22"
        className="w-[36px] h-[22px] drop-shadow-[0_2px_8px_rgba(251,191,36,0.7)]"
      >
        <defs>
          <linearGradient id="pod2CrownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE27A" />
            <stop offset="50%" stopColor="#F5A623" />
            <stop offset="100%" stopColor="#FFE27A" />
          </linearGradient>
        </defs>
        <path
          d="M3 18 L33 18 L30 8 L23 13 L18 2 L13 13 L6 8 Z"
          fill="url(#pod2CrownGrad)"
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
          fill="url(#pod2CrownGrad)"
          stroke="#9A650C"
          strokeWidth="0.7"
        />
      </svg>
    </div>
  );
}

/**
 * Silver Medal Badge (22px SVG, anchored to avatar ring lower-right corner)
 */
function SilverMedalBadge() {
  return (
    <div
      style={{
        position: 'absolute',
        right: '-4px',
        bottom: '0px',
        width: '22px',
        height: '22px',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      <svg viewBox="0 0 22 22" className="w-[22px] h-[22px] drop-shadow-md">
        <defs>
          <linearGradient id="pod2SilverMedal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#D1D5DB" />
            <stop offset="100%" stopColor="#9CA3AF" />
          </linearGradient>
        </defs>
        <circle cx="11" cy="11" r="10" fill="url(#pod2SilverMedal)" stroke="#F3F4F6" strokeWidth="1" />
        <circle cx="11" cy="11" r="7.5" fill="none" stroke="#6B7280" strokeWidth="0.8" />
        <text
          x="11"
          y="14.5"
          textAnchor="middle"
          fontSize="11"
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
 * Bronze Medal Badge (22px SVG, anchored to avatar ring lower-right corner)
 */
function BronzeMedalBadge() {
  return (
    <div
      style={{
        position: 'absolute',
        right: '-4px',
        bottom: '0px',
        width: '22px',
        height: '22px',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      <svg viewBox="0 0 22 22" className="w-[22px] h-[22px] drop-shadow-md">
        <defs>
          <linearGradient id="pod2BronzeMedal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDBA74" />
            <stop offset="50%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#9A3412" />
          </linearGradient>
        </defs>
        <circle cx="11" cy="11" r="10" fill="url(#pod2BronzeMedal)" stroke="#FED7AA" strokeWidth="1" />
        <circle cx="11" cy="11" r="7.5" fill="none" stroke="#7C2D12" strokeWidth="0.8" />
        <text
          x="11"
          y="14.5"
          textAnchor="middle"
          fontSize="11"
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
 * Individual Podium Card Component
 */
const PodiumCard = memo(function PodiumCard({
  team,
  slotRank,
  disableAnimation,
  isLite,
  fxMode: _fxMode,
  halo = true,
  candle = false,
  glowSwell,
  layout,
}: {
  team: RankedTeam;
  slotRank: 1 | 2 | 3;
  disableAnimation: boolean;
  isLite: boolean;
  fxMode: 'off' | 'soft' | 'full';
  halo?: boolean;
  candle?: boolean;
  glowSwell: boolean;
  layout?: ProjectorLayout;
}) {
  const isWinner = slotRank === 1;
  const initials = getInitials(team.name);
  const s = layout?.s ?? 1;

  const cardHeight = isWinner ? (layout?.card1Height ?? 286) : (layout?.card23Height ?? 250);

  // Badge text (e.g. "T-1", "#1", "#2", "#3")
  const badgeText = team.displayRank
    ? (team.displayRank.startsWith('T') ? team.displayRank : `#${team.displayRank}`)
    : `#${slotRank}`;

  // Name fitting: 1st place: max 48px, min 26px; 2nd/3rd: max 38px, min 22px
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const nameTextRef = useRef<HTMLHeadingElement>(null);
  const maxNameSize = Math.floor((isWinner ? 48 : 38) * s);
  const minNameSize = Math.floor((isWinner ? 26 : 22) * s);
  const { fontSize: nameFontSize, scale: nameScale } = useFitPodiumCardName(
    team.name,
    maxNameSize,
    minNameSize,
    nameContainerRef,
    nameTextRef,
    layout?.stageHeight
  );

  // Score fitting: 1st place: max 64px; 2nd/3rd: max 52px; shrink to 70% if wide
  const maxScoreSize = Math.floor((isWinner ? 64 : 52) * s);
  const availScoreWidth = Math.floor((isWinner ? 300 : 310) * s);
  const scoreFontSize = useFitPodiumScore(
    formatScore(team.focusScore),
    maxScoreSize,
    availScoreWidth
  );

  const ptsFontSize = Math.floor((isWinner ? 22 : 18) * s);
  const avatarSize = Math.floor((isWinner ? 84 : 70) * s);
  const initialsFontSize = Math.floor((isWinner ? 28 : 22) * s);

  const avatarRowHeight = Math.floor((isWinner ? 98 : 76) * s);
  const nameRowHeight = Math.floor((isWinner ? 64 : 60) * s);
  const rowGap = Math.round(6 * s);

  // Pill sizing & reserves
  const pillHeight = Math.round((isWinner ? 40 : 36) * s);
  const pillFontSize = Math.round((isWinner ? 28 : 26) * s);
  const pillMinWidth = Math.max(24, Math.round((isWinner ? 72 : 64) * s));
  const pillPadX = Math.round(20 * s);

  const pillReserveTop = Math.round((isWinner ? 26 : 24) * s);
  const cardPaddingBottom = Math.round((isWinner ? 10 : 12) * s);
  const totalPadding = pillReserveTop + cardPaddingBottom;
  const targetInnerHeight = cardHeight - totalPadding;

  // Safety net scaling ref: if natural height > inner height, scale down uniformly
  const innerGridRef = useRef<HTMLDivElement>(null);
  const [contentScale, setContentScale] = useState(1);

  useEffect(() => {
    const el = innerGridRef.current;
    if (!el) return;

    const checkScale = () => {
      const targetHeight = cardHeight - totalPadding;
      const actualHeight = el.scrollHeight;
      if (actualHeight > targetHeight && actualHeight > 0) {
        setContentScale(targetHeight / actualHeight);
      } else {
        setContentScale(1);
      }
    };

    checkScale();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(checkScale);
      ro.observe(el);
    }
    return () => {
      if (ro) ro.disconnect();
    };
  }, [cardHeight, totalPadding, team.name, team.focusScore, nameFontSize, scoreFontSize]);

  // Card frame styling class
  const cardFrameClass =
    slotRank === 1
      ? styles.cardFirst
      : slotRank === 2
      ? styles.cardSecond
      : styles.cardThird;

  const pillClass =
    slotRank === 1
      ? styles.rankPillFirst
      : slotRank === 2
      ? styles.rankPillSecond
      : styles.rankPillThird;

  return (
    <motion.article
      layout={disableAnimation ? false : 'position'}
      transition={springTransition}
      data-testid={`podium-card-${slotRank}`}
      style={{
        height: `${cardHeight}px`,
        paddingTop: `${pillReserveTop}px`,
        paddingBottom: `${cardPaddingBottom}px`,
      }}
      className={`${cardFrameClass} shrink-0 select-none`}
    >
      {/* 1st Place Gold Glow Layer (static, animate opacity only) */}
      {isWinner && (
        <div
          className={`${styles.goldGlow} ${glowSwell ? styles.goldGlowSwell : ''} ${
            candle && !isLite ? styles.goldGlowFlicker : ''
          }`}
        />
      )}

      {/* Diagonal Shine Sweep on appearance and score/rank updates */}
      {!isLite && !disableAnimation && (
        <div className={styles.cardShineMask}>
          <div
            key={`${team.id}-${team.focusScore}-${team.rank}`}
            className={styles.cardShineBeam}
          />
        </div>
      )}

      {/* Rank Pill above Card (half over the top edge) */}
      <div
        data-testid={`podium-pill-${slotRank}`}
        className={pillClass}
        style={{
          height: `${pillHeight}px`,
          fontSize: `${pillFontSize}px`,
          minWidth: `${pillMinWidth}px`,
          paddingLeft: `${pillPadX}px`,
          paddingRight: `${pillPadX}px`,
          top: `-${Math.round(pillHeight / 2)}px`,
        }}
      >
        {badgeText}
      </div>

      {/* Inner Strict CSS Grid with Safety Net Uniform Scaling */}
      <div
        ref={innerGridRef}
        style={{
          transform: contentScale < 1 ? `scale(${contentScale})` : undefined,
          transformOrigin: 'top center',
          gridTemplateRows: `${avatarRowHeight}px ${nameRowHeight}px 1fr`,
          rowGap: `${rowGap}px`,
          height: `${targetInnerHeight}px`,
        }}
        className={isWinner ? styles.innerGridFirst : styles.innerGridSecondThird}
      >
        {/* ROW 1: Avatar Row (104px on 1st, 82px on 2nd/3rd) */}
        <div
          data-row="avatar"
          data-testid={`podium-avatar-${slotRank}`}
          style={{ height: `${avatarRowHeight}px` }}
          className={isWinner ? styles.avatarRowFirst : styles.avatarRowSecondThird}
        >
          {/* Avatar Container */}
          <div
            style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
            className="relative flex items-center justify-center shrink-0"
          >
            {/* 1st Place Crown (22px tall, overlapping avatar by 8px, never touching pill) */}
            {isWinner && <WinnerCrown />}

            {/* Breathing Gold Halo (Soft & Full) */}
            {isWinner && !isLite && (
              <div
                data-testid="podium-breathing-halo-container"
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: halo ? 1 : 0,
                  transition: 'opacity 400ms ease-out',
                  pointerEvents: 'none',
                }}
              >
                <div
                  data-testid="podium-breathing-halo"
                  style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
                  className={styles.breathingHalo}
                />
              </div>
            )}

            {/* Double Ring Avatar */}
            <div
              style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
              className={`rounded-full flex items-center justify-center ${
                isWinner
                  ? 'p-[3.5px] bg-gradient-to-tr from-[#FFE27A] via-[#F5A623] to-[#FFE27A] shadow-xl'
                  : slotRank === 2
                  ? 'p-[3px] bg-gradient-to-tr from-[#F2F4F8] via-[#FFFFFF] to-[#9AA3B5] shadow-lg'
                  : 'p-[3px] bg-gradient-to-tr from-[#F0B27A] via-[#EA580C] to-[#B9732F] shadow-lg'
              }`}
            >
              <div
                className={`w-full h-full rounded-full flex flex-col items-center justify-center ${
                  isWinner
                    ? 'bg-gradient-to-b from-[#241366] to-[#120835] border-2 border-amber-300/80'
                    : slotRank === 2
                    ? 'bg-gradient-to-b from-[#29177a] to-[#140942] border-2 border-white/60'
                    : 'bg-gradient-to-b from-[#29177a] to-[#140942] border-2 border-orange-300/60'
                }`}
              >
                <span
                  style={{ fontSize: `${initialsFontSize}px` }}
                  className={`font-cinzel font-black tracking-wider leading-none ${
                    isWinner
                      ? 'text-amber-300'
                      : 'text-white'
                  }`}
                >
                  {initials}
                </span>
              </div>
            </div>

            {/* Laurel Sprigs on sides of winner avatar */}
            {isWinner && (
              <>
                <div className="absolute -left-3.5 top-6 pointer-events-none text-amber-400 opacity-90 drop-shadow">
                  <svg className="w-4 h-9 fill-current" viewBox="0 0 20 32">
                    <path d="M16 2 C10 6 8 14 10 24 C6 20 5 13 8 7 Z" />
                    <path d="M13 10 C8 14 7 20 10 28 C5 24 4 17 8 11 Z" />
                  </svg>
                </div>
                <div className="absolute -right-3.5 top-6 pointer-events-none text-amber-400 opacity-90 drop-shadow scale-x-[-1]">
                  <svg className="w-4 h-9 fill-current" viewBox="0 0 20 32">
                    <path d="M16 2 C10 6 8 14 10 24 C6 20 5 13 8 7 Z" />
                    <path d="M13 10 C8 14 7 20 10 28 C5 24 4 17 8 11 Z" />
                  </svg>
                </div>
              </>
            )}

            {/* Medal Badges for 2nd and 3rd anchored to lower-right corner */}
            {slotRank === 2 && <SilverMedalBadge />}
            {slotRank === 3 && <BronzeMedalBadge />}
          </div>
        </div>

        {/* ROW 2: Name Row (64px on 1st, 60px on 2nd/3rd; 1-2 lines, never split words, never ellipsis) */}
        <div
          ref={nameContainerRef}
          data-row="name"
          data-testid={`podium-name-${slotRank}`}
          style={{ height: `${nameRowHeight}px` }}
          className={isWinner ? styles.nameRowFirst : styles.nameRowSecondThird}
        >
          <h2
            ref={nameTextRef}
            style={{
              fontSize: `${nameFontSize}px`,
              lineHeight: 1.05,
              wordBreak: 'keep-all',
              overflowWrap: 'normal',
              hyphens: 'none',
              whiteSpace: 'normal',
              transform: nameScale < 1 ? `scale(${nameScale})` : undefined,
              transformOrigin: 'center center',
              margin: 0,
              padding: 0,
            }}
            className="font-cinzel text-white font-bold tracking-wide text-center drop-shadow"
          >
            {team.name}
          </h2>
        </div>

        {/* ROW 3: Score Row */}
        <div
          data-row="score"
          data-testid={`podium-score-${slotRank}`}
          className={isWinner ? styles.scoreRowFirst : styles.scoreRowSecondThird}
        >
          <div className={isWinner ? styles.scoreContainerFirst : styles.scoreContainerSecondThird}>
            <AnimatedScore
              value={team.focusScore}
              duration={disableAnimation ? 0 : 600}
              className={isWinner ? styles.scoreNumberFirst : styles.scoreNumberSecondThird}
              style={{ fontSize: `${scoreFontSize}px` }}
            />
            <span
              style={{ fontSize: `${ptsFontSize}px` }}
              className={isWinner ? styles.scorePtsFirst : styles.scorePtsSecondThird}
            >
              PTS
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
});

/**
 * PodiumV2: Isolated redesign of ranks 1 to 3 for Projector view.
 * Outer wrapper box has identical width, height, position, margins, and padding.
 */
const PodiumV2 = memo(function PodiumV2({
  teams,
  focus,
  disableAnimation = false,
  podiumHeight,
  layout,
}: PodiumProps) {
  const displaySettings = useDisplaySettings();
  const { isLite, halo, candle, bgPreset } = displaySettings;
  const fxMode = (isLite ? 'off' : bgPreset) as 'off' | 'soft' | 'full';

  // Extract top 3 active teams by ranking order
  const activeTeams = useMemo(() => teams.filter((t) => !t.out), [teams]);
  const first = activeTeams[0];  // Center (Slot 1)
  const second = activeTeams[1]; // Left (Slot 2)
  const third = activeTeams[2];  // Right (Slot 3)

  // NEW LEADER notification & glow swell detection
  const [showNewLeader, setShowNewLeader] = useState(false);
  const [glowSwell, setGlowSwell] = useState(false);
  const prevLeaderIdRef = useRef<string | null>(null);
  const prevFocusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!first) return;
    const isNewLeader = prevLeaderIdRef.current !== null && prevLeaderIdRef.current !== first.id;
    const isLevelChange = prevFocusRef.current !== null && prevFocusRef.current !== focus;

    if (isNewLeader || isLevelChange) {
      if (isNewLeader) {
        setShowNewLeader(true);
        const timerLeader = setTimeout(() => setShowNewLeader(false), 2000);
        prevLeaderIdRef.current = first.id;
        prevFocusRef.current = focus ?? null;
        return () => clearTimeout(timerLeader);
      }
      if (fxMode !== 'off') {
        setGlowSwell(true);
        const timerSwell = setTimeout(() => setGlowSwell(false), 2000);
        prevLeaderIdRef.current = first.id;
        prevFocusRef.current = focus ?? null;
        return () => clearTimeout(timerSwell);
      }
    }
    prevLeaderIdRef.current = first.id;
    prevFocusRef.current = focus ?? null;
  }, [first?.id, focus, fxMode]);

  // Document visibility detection to pause animations when hidden
  const [isHidden, setIsHidden] = useState(false);
  useEffect(() => {
    const handleVis = () => setIsHidden(document.hidden);
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, []);



  // Columns layout order: 2nd (left), 1st (center), 3rd (right)
  const columns = [
    { team: second, slotRank: 2 as const, position: 'left' as const },
    { team: first, slotRank: 1 as const, position: 'center' as const },
    { team: third, slotRank: 3 as const, position: 'right' as const },
  ];

  const actualContainerHeight = podiumHeight ?? layout?.podiumContainerHeight ?? 310;
  const card1H = layout?.card1Height ?? 286;
  const card23H = layout?.card23Height ?? 250;

  return (
    <div
      data-testid="podium-container"
      style={{
        height: `${actualContainerHeight}px`,
        contain: 'layout style',
      }}
      className={`w-full flex items-end justify-center select-none overflow-visible relative gap-10 ${styles.podiumRoot}`}
      data-hidden={isHidden ? 'true' : 'false'}
    >
      {/* Soft light cone behind center winner card */}
      {first && !isLite && (
        <div
          style={{ height: `${actualContainerHeight}px` }}
          className={styles.lightCone}
        />
      )}

      {/* 6 Twinkling gold stars around the center winner card */}
      {first && !isLite && !disableAnimation && (
        <div
          style={{ height: `${card1H}px` }}
          className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[470px] pointer-events-none z-15"
        >
          {WINNER_STARS.map((star, idx) => (
            <div
              key={idx}
              className={styles.star}
              style={{
                top: star.top,
                left: star.left !== undefined ? `${star.left}px` : undefined,
                right: star.right !== undefined ? `${star.right}px` : undefined,
                animationDelay: star.delay,
                animationDuration: star.duration,
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: star.size, height: star.size }}>
                <path
                  d="M12 0 Q12 12 0 12 Q12 12 12 24 Q12 12 24 12 Q12 12 12 0 Z"
                  fill="#FFE27A"
                  className="drop-shadow-[0_0_6px_rgba(255,226,122,0.8)]"
                />
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* Flash "NEW LEADER" notification banner for 2 seconds when 1st place changes */}
      {showNewLeader && first && (
        <div className={styles.newLeaderBanner}>
          ★ NEW LEADER ★
        </div>
      )}

      {/* Render the 3 columns (2nd, 1st, 3rd) */}
      {columns.map(({ team, slotRank, position }) => {
        if (!team) {
          return (
            <div
              key={position}
              style={{
                width: slotRank === 1 ? '470px' : '400px',
                height: `${slotRank === 1 ? card1H : card23H}px`,
              }}
              className="shrink-0"
            />
          );
        }

        return (
          <PodiumCard
            key={team.id}
            team={team}
            slotRank={slotRank}
            disableAnimation={disableAnimation}
            isLite={isLite}
            fxMode={fxMode}
            halo={halo}
            candle={candle}
            glowSwell={glowSwell && slotRank === 1}
            layout={layout}
          />
        );
      })}
    </div>
  );
});

export default PodiumV2;
