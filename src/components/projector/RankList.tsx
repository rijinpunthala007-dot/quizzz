import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import type { RankedTeam, Level, Team } from '../../types';
import type { ProjectorLayout } from './layout';
import Avatar from './Avatar';
import { getRankMovement, formatScore } from '../../utils';
import { useRowNameFit } from './useRowNameFit';
import { useQuizStateReadOnly } from '../../store';
import styles from './RankList.module.css';

interface RankListProps {
  teams: RankedTeam[];
  levels: Level[];
  allTeams: Team[];
  rowHeight: number;
  numCols: number;
  focus?: string;
  layout?: ProjectorLayout;
}

export interface RowAnimationEvent {
  scoreDiff: number;
  rankDiff: number;
  delay: number;
  allowChipsAndGlow: boolean;
  timestamp: number;
}

const springTransition = {
  type: 'spring' as const,
  stiffness: 120,
  damping: 20,
};

function formatPlayedLevelScores(playedLevels: Level[], team: RankedTeam): string {
  if (!playedLevels || playedLevels.length === 0) return '';
  return playedLevels
    .map((lvl) => {
      const short = lvl.name.replace(/[^0-9]/g, '') || lvl.name.charAt(0);
      const score = team.scores[lvl.id] ?? 0;
      return `L${short}: ${formatScore(score)}`;
    })
    .join(' · ');
}

// ---------------------------------------------------------------------------
// List Animated Score (Count-Up with tabular nums, 700ms roll, decimals supported)
// ---------------------------------------------------------------------------
interface ListScoreRollProps {
  value: number;
  duration?: number;
  delay?: number;
  disableAnimation?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const ListScoreRoll = memo(function ListScoreRoll({
  value,
  duration = 700,
  delay = 0,
  disableAnimation = false,
  className = '',
  style,
}: ListScoreRollProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    if (prevValueRef.current === value) return;

    if (disableAnimation || duration <= 0) {
      prevValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    const startVal = prevValueRef.current;
    const endVal = value;
    prevValueRef.current = value;

    let frameId: number;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;

    const startDecimals = startVal % 1 !== 0 ? (startVal.toString().split('.')[1]?.length || 0) : 0;
    const endDecimals = endVal % 1 !== 0 ? (endVal.toString().split('.')[1]?.length || 0) : 0;
    const decimals = Math.min(Math.max(startDecimals, endDecimals), 2);
    const factor = Math.pow(10, decimals);

    const startAnimation = () => {
      const startTime = performance.now();
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const raw = startVal + (endVal - startVal) * ease;
        const current = Math.round(raw * factor) / factor;
        setDisplayValue(current);

        if (progress < 1) {
          frameId = requestAnimationFrame(animate);
        } else {
          setDisplayValue(endVal);
        }
      };
      frameId = requestAnimationFrame(animate);
    };

    if (delay > 0) {
      delayTimer = setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      cancelAnimationFrame(frameId);
    };
  }, [value, duration, delay, disableAnimation]);

  return <span className={className} style={style}>{formatScore(displayValue)}</span>;
});

// ---------------------------------------------------------------------------
// Single List Row Component
// ---------------------------------------------------------------------------
interface StadiumRowProps {
  team: RankedTeam;
  rowHeight: number;
  allZero: boolean;
  hideLevelLine: boolean;
  levelText: string;
  baseNameSize: number;
  animationEvent?: RowAnimationEvent;
  disableAnimation: boolean;
  wasOnPodium?: boolean;
  layout?: ProjectorLayout;
}

const StadiumRow = memo(function StadiumRow({
  team,
  rowHeight,
  allZero,
  hideLevelLine,
  levelText,
  baseNameSize,
  animationEvent,
  disableAnimation,
  wasOnPodium,
  layout,
}: StadiumRowProps) {
  const movement = getRankMovement(team.rank, team.previousRank);
  const s = layout?.s ?? 1;

  // Format badge text: ties as "T-11", all-zero as "—"
  const badgeText = allZero
    ? '—'
    : team.isTied || (team.displayRank && team.displayRank.startsWith('T'))
    ? (team.displayRank && team.displayRank.startsWith('T') ? team.displayRank : `T-${team.rank}`)
    : `${team.rank}`;

  const hasLevelLine = !hideLevelLine && Boolean(levelText);

  // Name fitting: 1 line first, then 2 lines if needed
  const { containerRef: nameContainerRef, textRef: nameTextRef, style: nameStyle } = useRowNameFit(team.name, {
    baseNameSize,
    rowHeight,
    hasLevelLine,
    lineHeight: 1.05,
  });

  const avatarSize = layout?.t === 0 ? 54 : Math.min(Math.floor(54 * s), Math.floor(0.8 * rowHeight));
  const avatarFontSize = Math.floor(20 * s);
  const rankBadgeWidth = Math.floor(72 * s);
  const rankBadgeFontSize = Math.floor(30 * s);
  const levelFontSize = Math.floor(22 * s);
  const scoreFontSize = Math.floor(46 * s);
  const ptsFontSize = Math.floor(20 * s);
  const chipFontSize = Math.floor(22 * s);

  return (
    <motion.article
      layout={disableAnimation ? false : 'position'}
      transition={{
        ...springTransition,
        delay: animationEvent?.delay ? animationEvent.delay / 1000 : 0,
      }}
      initial={
        disableAnimation || !wasOnPodium
          ? false
          : { opacity: 0, y: -24 }
      }
      animate={{ opacity: 1, y: 0 }}
      exit={
        disableAnimation
          ? undefined
          : { opacity: 0, transition: { duration: 0.25 } }
      }
      data-testid={`rank-row-${team.rank}`}
      style={
        {
          '--list2-row-height': `${rowHeight}px`,
          height: `${rowHeight}px`,
          padding: `${Math.floor(6 * s)}px ${Math.floor(16 * s)}px`,
          gap: `${Math.floor(12 * s)}px`,
        } as React.CSSProperties
      }
      className={`${styles.list2Row} ${
        animationEvent ? styles.list2RowOverflow : ''
      } ${
        animationEvent?.scoreDiff && animationEvent.scoreDiff < 0 && animationEvent.allowChipsAndGlow
          ? styles.list2RowDim
          : ''
      }`}
    >
      {/* 1. Rank: fixed width (72px) with vertical rolling number on rank change */}
      <div
        data-testid={`rank-badge-${team.rank}`}
        style={{ width: `${rankBadgeWidth}px`, fontSize: `${rankBadgeFontSize}px` }}
        className="shrink-0 font-outfit font-bold text-indigo-950 tracking-tight leading-none text-center flex items-center justify-center relative overflow-hidden h-full"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={badgeText}
            initial={
              disableAnimation || !animationEvent?.rankDiff
                ? false
                : { y: animationEvent.rankDiff > 0 ? 18 : -18, opacity: 0 }
            }
            animate={{ y: 0, opacity: 1 }}
            exit={
              disableAnimation || !animationEvent?.rankDiff
                ? undefined
                : { y: animationEvent.rankDiff > 0 ? -18 : 18, opacity: 0 }
            }
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="inline-block"
          >
            {badgeText}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Rank-change Indicator (▲3 green / ▼2 muted) */}
      {animationEvent?.rankDiff && animationEvent.rankDiff !== 0 ? (
        <div
          key={`rank-ind-${animationEvent.timestamp}`}
          data-testid={`rank-indicator-${team.rank}`}
          className={animationEvent.rankDiff > 0 ? styles.list2RankImprove : styles.list2RankDrop}
          style={{
            animationDelay: `${animationEvent.delay}ms`,
          }}
        >
          {animationEvent.rankDiff > 0 ? `▲${animationEvent.rankDiff}` : `▼${Math.abs(animationEvent.rankDiff)}`}
        </div>
      ) : null}

      {/* 2. Avatar: fixed (54px) or scaled */}
      <Avatar name={team.name} id={team.id} size={avatarSize} fontSize={avatarFontSize} />

      {/* 3. NAME BLOCK: flex: 1 1 0%, minWidth: 0, takes ALL the remaining width */}
      <div
        data-testid={`row-name-block-${team.rank}`}
        className="flex flex-col justify-center leading-tight overflow-hidden"
        style={{ flex: '1 1 0%', minWidth: 0 }}
      >
        <div
          ref={nameContainerRef}
          data-testid={`row-name-zone-${team.rank}`}
          className="w-full overflow-hidden flex items-center"
        >
          <h3
            ref={nameTextRef}
            data-testid={`row-name-text-${team.rank}`}
            className="font-outfit font-bold text-indigo-950 tracking-wide"
            style={{
              fontSize: `${nameStyle.fontSize}px`,
              letterSpacing: nameStyle.letterSpacing,
              lineHeight: 1.05,
              wordBreak: 'keep-all',
              overflowWrap: 'normal',
              whiteSpace: nameStyle.isSingleLine ? 'nowrap' : 'normal',
              hyphens: 'none',
            }}
          >
            {team.name.split(' ').map((word, wIdx, arr) => (
              <span key={wIdx}>
                <span
                  data-word="true"
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'nowrap',
                    wordBreak: 'keep-all',
                    overflowWrap: 'normal',
                    hyphens: 'none',
                  }}
                >
                  {word}
                </span>
                {wIdx < arr.length - 1 ? ' ' : ''}
              </span>
            ))}
          </h3>
        </div>

        {/* Level line (22px, only played levels, unambiguous format: L1: 6 · L2: 0 ...) */}
        {hasLevelLine && (
          <span
            data-testid={`row-levels-${team.rank}`}
            style={{ fontSize: `${levelFontSize}px` }}
            className="font-jakarta font-semibold text-indigo-900/85 truncate leading-tight mt-0.5"
          >
            {levelText}
          </span>
        )}
      </div>

      {/* 4. Score + PTS: width: auto, flex: 0 0 auto, only as wide as its content */}
      <div
        data-testid={`row-score-zone-${team.rank}`}
        className="flex items-baseline gap-1.5 shrink-0 pl-1 relative"
        style={{ flex: '0 0 auto', width: 'auto' }}
      >
        {movement && movement.isPositive && !animationEvent && (
          <span className="text-emerald-700 font-bold text-sm mr-1" title={`Moved up ${movement.diff}`}>
            ▲
          </span>
        )}
        {movement && !movement.isPositive && !animationEvent && (
          <span className="text-rose-600 font-bold text-sm mr-1" title={`Moved down ${movement.diff}`}>
            ▼
          </span>
        )}
        <ListScoreRoll
          value={team.focusScore}
          duration={700}
          delay={animationEvent?.delay ?? 0}
          disableAnimation={disableAnimation}
          className="font-outfit font-extrabold text-indigo-950 tabular-nums drop-shadow-sm leading-none"
          style={{ fontSize: `${scoreFontSize}px` }}
        />
        <span
          style={{ fontSize: `${ptsFontSize}px` }}
          className="font-outfit font-bold text-indigo-800/80 tracking-wider uppercase leading-none"
        >
          PTS
        </span>
      </div>

      {/* 5. GAIN CHIP (+30): Gold pill on violet 90% background, floats up 24px and fades over 2s */}
      {animationEvent?.scoreDiff && animationEvent.scoreDiff > 0 && animationEvent.allowChipsAndGlow ? (
        <div
          key={`chip-${animationEvent.timestamp}`}
          data-testid={`gain-chip-${team.rank}`}
          className={styles.list2GainChip}
          style={{
            fontSize: `${chipFontSize}px`,
            animationDelay: `${animationEvent.delay}ms`,
          }}
        >
          +{formatScore(animationEvent.scoreDiff)}
        </div>
      ) : null}

      {/* 6. ROW GLOW: Soft gold light sweep on gain */}
      {animationEvent?.scoreDiff && animationEvent.scoreDiff > 0 && animationEvent.allowChipsAndGlow ? (
        <div
          key={`sweep-${animationEvent.timestamp}`}
          className={styles.list2LightSweep}
          style={{
            animationDelay: `${animationEvent.delay}ms`,
          }}
        />
      ) : null}
    </motion.article>
  );
});

// ---------------------------------------------------------------------------
// Main RankList Component
// ---------------------------------------------------------------------------
const RankList = memo(function RankList({
  teams,
  levels,
  allTeams,
  rowHeight,
  numCols,
  focus: propFocus,
  layout,
}: RankListProps) {
  const quizState = useQuizStateReadOnly();
  const currentFocus = propFocus ?? quizState.focus;
  const s = layout?.s ?? 1;
  const rowGap = layout?.rowGap ?? 6;
  const headerStripHeight = layout ? layout.listHeaderHeight : 36;
  const headerFontSize = Math.floor(22 * s);

  // Reduced motion and URL parameters check
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isClassicList = searchParams?.get('list') === 'classic';
  const isLite = searchParams?.get('lite') === '1' || teams.length > 30;
  const isFxOff = searchParams?.get('fx') === 'off';
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const disableAnimation = isClassicList || isLite || isFxOff || prefersReduced;

  // Baseline committed teams snapshot
  const committedTeamsRef = useRef<RankedTeam[]>(teams);
  // Displayed teams state
  const [displayedTeams, setDisplayedTeams] = useState<RankedTeam[]>(teams);
  // Active animation events map by team ID
  const [animationEvents, setAnimationEvents] = useState<Record<string, RowAnimationEvent>>({});
  // Teams that were previously in top 3 podium
  const prevPodiumIdsRef = useRef<Set<string>>(new Set(teams.slice(0, 3).map((t) => t.id)));

  const pendingTeamsRef = useRef<RankedTeam[]>(teams);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMountRef = useRef(true);
  const prevFocusRef = useRef(currentFocus);

  // Sync / Reset on Tab Change
  useEffect(() => {
    if (prevFocusRef.current !== currentFocus) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      prevFocusRef.current = currentFocus;
      committedTeamsRef.current = teams;
      pendingTeamsRef.current = teams;
      prevPodiumIdsRef.current = new Set(teams.slice(0, 3).map((t) => t.id));
      setDisplayedTeams(teams);
      setAnimationEvents({});
    }
  }, [currentFocus, teams]);

  // Handle incoming data changes with 800ms debounce
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      committedTeamsRef.current = teams;
      pendingTeamsRef.current = teams;
      prevPodiumIdsRef.current = new Set(teams.slice(0, 3).map((t) => t.id));
      setDisplayedTeams(teams);
      return;
    }

    // Check if teams actually changed compared to committedTeamsRef
    const hasChanged =
      teams.length !== committedTeamsRef.current.length ||
      teams.some((t) => {
        const old = committedTeamsRef.current.find((ot) => ot.id === t.id);
        if (!old) return true;
        return old.focusScore !== t.focusScore || old.rank !== t.rank || old.isTied !== t.isTied;
      });

    if (!hasChanged) {
      return;
    }

    if (disableAnimation) {
      committedTeamsRef.current = teams;
      pendingTeamsRef.current = teams;
      prevPodiumIdsRef.current = new Set(teams.slice(0, 3).map((t) => t.id));
      setDisplayedTeams(teams);
      return;
    }

    pendingTeamsRef.current = teams;

    // Restart 800ms debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const currentBaseline = committedTeamsRef.current;
      const targetTeams = pendingTeamsRef.current;

      const deltas: {
        team: RankedTeam;
        scoreDiff: number;
        rankDiff: number;
      }[] = [];

      for (const newTeam of targetTeams) {
        const oldTeam = currentBaseline.find((ot) => ot.id === newTeam.id);
        const oldScore = oldTeam?.focusScore ?? 0;
        const oldRank = oldTeam?.rank ?? newTeam.rank;
        const scoreDiff = newTeam.focusScore - oldScore;
        const rankDiff = oldRank - newTeam.rank; // positive = improved rank

        if (scoreDiff !== 0 || rankDiff !== 0) {
          deltas.push({ team: newTeam, scoreDiff, rankDiff });
        }
      }

      if (deltas.length === 0) {
        committedTeamsRef.current = targetTeams;
        setDisplayedTeams(targetTeams);
        return;
      }

      // If more than 6 rows have score changes at once, skip the chips and the glow (keep the slide and the count-up)
      const scoreChangedCount = deltas.filter((d) => d.scoreDiff !== 0).length;
      const allowChipsAndGlow = scoreChangedCount <= 6;

      // Stagger: ordered from the largest gain to the smallest (max delay 600ms)
      deltas.sort((a, b) => b.scoreDiff - a.scoreDiff);

      const newEvents: Record<string, RowAnimationEvent> = {};
      deltas.forEach((d, idx) => {
        const delay = Math.min(idx * 40, 600);
        newEvents[d.team.id] = {
          scoreDiff: d.scoreDiff,
          rankDiff: d.rankDiff,
          delay,
          allowChipsAndGlow,
          timestamp: Date.now(),
        };
      });

      prevPodiumIdsRef.current = new Set(currentBaseline.slice(0, 3).map((t) => t.id));
      setAnimationEvents(newEvents);
      setDisplayedTeams(targetTeams);
      committedTeamsRef.current = targetTeams;

      // Clean up animation events after 4.5 seconds
      setTimeout(() => {
        setAnimationEvents({});
      }, 4500);
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [teams, disableAnimation]);

  // Pause running animations / settle immediately when document is hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
        setDisplayedTeams(pendingTeamsRef.current);
        committedTeamsRef.current = pendingTeamsRef.current;
        setAnimationEvents({});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Only display active teams after top 3 podium teams (ranks 4+)
  const listTeams = useMemo(() => {
    const active = displayedTeams.filter((t) => !t.out);
    return active.slice(3);
  }, [displayedTeams]);

  // Are all active groups at 0 points?
  const allZero = useMemo(() => {
    return displayedTeams.filter((t) => !t.out).every((t) => (t.focusScore || 0) === 0);
  }, [displayedTeams]);

  // Played levels: at least one group has a non-zero score in that level, at most last 4
  const playedLevels = useMemo(() => {
    return levels
      .filter((lvl) => allTeams.some((t) => (t.scores[lvl.id] ?? 0) !== 0))
      .slice(-4);
  }, [levels, allTeams]);

  // If 3 columns (15 to 21 groups): names shrink to 24px and level line is hidden
  const hideLevelLine = numCols >= 3;
  const baseNameSize = numCols >= 3 ? 24 : 36;

  return (
    <div
      data-testid="rank-list-container"
      className="w-full h-full flex flex-col justify-start overflow-hidden min-h-0"
    >
      {/* 1. Slim Header Strip: "TEAM STANDINGS" left, "TOTAL PTS" right */}
      <div
        style={{ height: `${headerStripHeight}px` }}
        className="w-full flex items-center justify-between px-3 text-white shrink-0"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-amber-300"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{ fontSize: `${headerFontSize}px` }}
            className="font-outfit text-white font-extrabold uppercase tracking-wider leading-none"
          >
            TEAM STANDINGS
          </span>
        </div>
        <div
          style={{ fontSize: `${headerFontSize}px` }}
          className="text-white/90 font-outfit uppercase tracking-wider font-extrabold leading-none"
        >
          TOTAL PTS
        </div>
      </div>

      {/* 2. Unified Grid of Stadium Pill Rows (siblings in ONE grid container) */}
      {listTeams.length === 0 ? (
        <div className="w-full flex-1 flex items-center justify-center text-center">
          <p className="font-outfit text-white/70 text-base font-bold tracking-wider uppercase">
            All active groups are currently on the championship podium
          </p>
        </div>
      ) : isClassicList ? (
        <div className="w-full flex-1 flex items-start gap-x-4 pt-0 overflow-hidden min-h-0">
          {Array.from({ length: numCols }).map((_, colIdx) => (
            <div
              key={colIdx}
              data-testid={`rank-list-col-${colIdx}`}
              style={{ gap: `${rowGap}px` }}
              className="flex-1 flex flex-col min-w-0 h-full"
            >
              {listTeams.slice(colIdx * 7, (colIdx + 1) * 7).map((team) => {
                const levelText = formatPlayedLevelScores(playedLevels, team);
                return (
                  <StadiumRow
                    key={team.id}
                    team={team}
                    rowHeight={rowHeight}
                    allZero={allZero}
                    hideLevelLine={hideLevelLine}
                    levelText={levelText}
                    baseNameSize={baseNameSize}
                    disableAnimation={true}
                    layout={layout}
                  />
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <LayoutGroup id="projector-rank-list">
          <div
            data-testid="rank-list-grid"
            style={
              {
                '--list2-row-height': `${rowHeight}px`,
                '--list2-num-cols': numCols,
                '--list2-row-gap': `${rowGap}px`,
                gridTemplateRows: `repeat(7, ${rowHeight}px)`,
                rowGap: `${rowGap}px`,
                paddingTop: '0px',
              } as React.CSSProperties
            }
            className={styles.list2Grid}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {listTeams.map((team) => {
                const levelText = formatPlayedLevelScores(playedLevels, team);
                const wasOnPodium = prevPodiumIdsRef.current.has(team.id);
                return (
                  <StadiumRow
                    key={team.id}
                    team={team}
                    rowHeight={rowHeight}
                    allZero={allZero}
                    hideLevelLine={hideLevelLine}
                    levelText={levelText}
                    baseNameSize={baseNameSize}
                    animationEvent={animationEvents[team.id]}
                    disableAnimation={disableAnimation}
                    wasOnPodium={wasOnPodium}
                    layout={layout}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      )}
    </div>
  );
});

export default RankList;