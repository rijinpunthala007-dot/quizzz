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

export interface EliminationEvent {
  delay: number;
  isLast: boolean;
  timestamp: number;
}

function playEliminationThud() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
    osc.onended = () => {
      ctx.close().catch(() => {});
    };
  } catch {
    // Autoplay policy or unavailable
  }
}

const springTransition = {
  type: 'spring' as const,
  stiffness: 120,
  damping: 20,
};


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
  baseNameSize: number;
  animationEvent?: RowAnimationEvent;
  eliminationEvent?: EliminationEvent;
  disableAnimation: boolean;
  soundEnabled?: boolean;
  wasOnPodium?: boolean;
  layout?: ProjectorLayout;
}

const StadiumRow = memo(function StadiumRow({
  team,
  rowHeight,
  allZero,
  baseNameSize,
  animationEvent,
  eliminationEvent,
  disableAnimation,
  soundEnabled,
  wasOnPodium,
  layout,
}: StadiumRowProps) {
  const movement = getRankMovement(team.rank, team.previousRank);
  const s = layout?.s ?? 1;

  const isMarked = Boolean(team.marked);
  const hasElimAnim = Boolean(eliminationEvent && !disableAnimation);
  const delay = eliminationEvent?.delay ?? 0;
  const isLast = eliminationEvent?.isLast ?? true;
  const stampAnimClass = isLast ? styles.list2StampAnimLong : styles.list2StampAnimShort;
  const tagFadeDelay = delay + 800 + (isLast ? 1300 : 350);

  // Audio thud triggered when stamp slams in (delay + 800ms)
  useEffect(() => {
    if (!hasElimAnim || !soundEnabled) return;
    const timer = setTimeout(() => {
      if (!document.hidden) {
        playEliminationThud();
      }
    }, delay + 800);
    return () => clearTimeout(timer);
  }, [hasElimAnim, delay, eliminationEvent?.timestamp, soundEnabled]);

  // Format badge text: ties as "T-11", all-zero or zero score as "—"
  const isZeroScore = allZero || (team.focusScore || 0) === 0;
  const badgeText = isZeroScore
    ? '—'
    : team.isTied || (team.displayRank && team.displayRank.startsWith('T'))
    ? (team.displayRank && team.displayRank.startsWith('T') ? team.displayRank : `T-${team.rank}`)
    : `${team.rank}`;

  // Name fitting: 1 line first, then 2 lines if needed
  const { containerRef: nameContainerRef, textRef: nameTextRef, style: nameStyle } = useRowNameFit(team.name, {
    baseNameSize,
    rowHeight,
    lineHeight: 1.05,
  });

  const avatarSize = layout?.t === 0 ? 54 : Math.min(Math.floor(54 * s), Math.floor(0.8 * rowHeight));
  const avatarFontSize = Math.floor(20 * s);
  const rankBadgeWidth = Math.floor(72 * s);
  const rankBadgeFontSize = Math.floor(30 * s);
  const scoreFontSize = Math.floor(46 * s);
  const ptsFontSize = Math.floor(20 * s);
  const chipFontSize = Math.floor(22 * s);
  const tagHeight = Math.floor(36 * s);
  const tagFontSize = Math.floor(22 * s);
  const tagMinWidth = Math.floor(96 * s);
  const tagGap = Math.floor(12 * s);
  const stampFontSize = Math.floor(56 * s);

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
          ...(hasElimAnim ? { animationDelay: `${delay}ms` } : {}),
        } as React.CSSProperties
      }
      className={`${styles.list2Row} ${
        isMarked && !hasElimAnim ? styles.list2RowMarked : ''
      } ${
        hasElimAnim ? styles.list2Pulse : ''
      } ${
        animationEvent || hasElimAnim ? styles.list2RowOverflow : ''
      } ${
        animationEvent?.scoreDiff && animationEvent.scoreDiff < 0 && animationEvent.allowChipsAndGlow
          ? styles.list2RowDim
          : ''
      }`}
    >
      {/* Live elimination wipe layer */}
      {hasElimAnim && (
        <div
          className={styles.list2WipeLayer}
          style={{ animationDelay: `${delay + 100}ms` }}
        />
      )}

      {/* Live elimination stamp slam overlay */}
      {hasElimAnim && (
        <div className={styles.list2StampOverlay}>
          <div
            className={`${styles.list2Stamp} ${stampAnimClass}`}
            style={{
              fontSize: `${stampFontSize}px`,
              animationDelay: `${delay + 800}ms`,
            }}
          >
            ELIMINATED
            <div
              className={styles.list2StampRing}
              style={{ animationDelay: `${delay + 800}ms` }}
            />
          </div>
        </div>
      )}

      {/* 1. Rank: fixed width with vertical rolling number on rank change */}
      <div
        data-testid={`rank-badge-${team.rank}`}
        style={{
          width: `${rankBadgeWidth}px`,
          fontSize: `${rankBadgeFontSize}px`,
          zIndex: 5,
          ...(hasElimAnim ? { animationDelay: `${delay + 450}ms` } : {}),
        }}
        className={`shrink-0 font-outfit font-bold tracking-tight leading-none text-center flex items-center justify-center relative overflow-hidden h-full ${
          isMarked && !hasElimAnim ? styles.list2RowMarkedText : 'text-indigo-950'
        } ${hasElimAnim ? `${styles.list2RowMarkedText} ${styles.list2CrossfadeIn}` : ''}`}
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

      {/* Rank-change Indicator (hidden if marked) */}
      {!isMarked && animationEvent?.rankDiff && animationEvent.rankDiff !== 0 ? (
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

      {/* 2. Avatar: fixed or scaled, with dim overlay when marked */}
      <div className="relative shrink-0" style={{ width: avatarSize, height: avatarSize, zIndex: 5 }}>
        <Avatar name={team.name} id={team.id} size={avatarSize} fontSize={avatarFontSize} />
        {isMarked && (
          <div
            className={`${styles.list2AvatarDimOverlay} ${hasElimAnim ? styles.list2CrossfadeIn : ''}`}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: 'rgba(100, 100, 100, 0.55)',
              pointerEvents: 'none',
              ...(hasElimAnim ? { animationDelay: `${delay + 450}ms` } : {}),
            }}
          />
        )}
      </div>

      {/* 3. NAME BLOCK: flex: 1 1 0%, minWidth: 0, takes ALL the remaining width */}
      <div
        data-testid={`row-name-block-${team.rank}`}
        className="flex flex-col justify-center leading-tight overflow-hidden h-full relative"
        style={{ flex: '1 1 0%', minWidth: 0, zIndex: 5 }}
      >
        <div
          ref={nameContainerRef}
          data-testid={`row-name-zone-${team.rank}`}
          className="w-full h-full overflow-hidden flex items-center justify-start"
        >
          <h3
            ref={nameTextRef}
            data-testid={`row-name-text-${team.rank}`}
            className={`font-outfit font-bold tracking-wide ${
              isMarked && !hasElimAnim ? styles.list2RowMarkedText : 'text-indigo-950'
            } ${hasElimAnim ? `${styles.list2RowMarkedText} ${styles.list2CrossfadeIn}` : ''}`}
            style={{
              fontSize: `${nameStyle.fontSize}px`,
              letterSpacing: nameStyle.letterSpacing,
              lineHeight: 1.05,
              wordBreak: 'keep-all',
              overflowWrap: 'normal',
              whiteSpace: nameStyle.isSingleLine ? 'nowrap' : 'normal',
              hyphens: 'none',
              margin: 0,
              padding: 0,
              ...(hasElimAnim ? { animationDelay: `${delay + 450}ms` } : {}),
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
      </div>

      {/* Small Permanent OUT Tag */}
      {isMarked && (
        <div
          data-testid={`row-out-tag-${team.rank}`}
          className={`${styles.list2OutTag} ${hasElimAnim ? styles.list2TagFadeIn : ''}`}
          style={{
            height: `${tagHeight}px`,
            minWidth: `${tagMinWidth}px`,
            fontSize: `${tagFontSize}px`,
            marginLeft: `${tagGap}px`,
            ...(hasElimAnim ? { animationDelay: `${tagFadeDelay}ms` } : {}),
          }}
        >
          OUT
        </div>
      )}

      {/* 4. Score + PTS */}
      <div
        data-testid={`row-score-zone-${team.rank}`}
        className="flex items-baseline gap-1.5 shrink-0 pl-1 relative"
        style={{ flex: '0 0 auto', width: 'auto', zIndex: 5 }}
      >
        {!isMarked && movement && movement.isPositive && !animationEvent && (
          <span className="text-emerald-700 font-bold text-sm mr-1" title={`Moved up ${movement.diff}`}>
            ▲
          </span>
        )}
        {!isMarked && movement && !movement.isPositive && !animationEvent && (
          <span className="text-rose-600 font-bold text-sm mr-1" title={`Moved down ${movement.diff}`}>
            ▼
          </span>
        )}
        <ListScoreRoll
          value={team.focusScore}
          duration={700}
          delay={animationEvent?.delay ?? 0}
          disableAnimation={disableAnimation}
          className={`font-outfit font-extrabold tabular-nums drop-shadow-sm leading-none ${
            isMarked && !hasElimAnim ? styles.list2RowMarkedText : 'text-indigo-950'
          } ${hasElimAnim ? `${styles.list2RowMarkedText} ${styles.list2CrossfadeIn}` : ''}`}
          style={{
            fontSize: `${scoreFontSize}px`,
            ...(hasElimAnim ? { animationDelay: `${delay + 450}ms` } : {}),
          }}
        />
        <span
          style={{
            fontSize: `${ptsFontSize}px`,
            ...(hasElimAnim ? { animationDelay: `${delay + 450}ms` } : {}),
          }}
          className={`font-outfit font-bold tracking-wider uppercase leading-none ${
            isMarked && !hasElimAnim ? styles.list2RowMarkedPts : 'text-indigo-800/80'
          } ${hasElimAnim ? `${styles.list2RowMarkedPts} ${styles.list2CrossfadeIn}` : ''}`}
        >
          PTS
        </span>
      </div>

      {/* 5. GAIN CHIP (+30): Gold pill on gain (hidden if marked) */}
      {!isMarked && animationEvent?.scoreDiff && animationEvent.scoreDiff > 0 && animationEvent.allowChipsAndGlow ? (
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

      {/* 6. ROW GLOW: Soft gold light sweep on gain (hidden if marked) */}
      {!isMarked && animationEvent?.scoreDiff && animationEvent.scoreDiff > 0 && animationEvent.allowChipsAndGlow ? (
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
  allTeams: _allTeams,
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
  // Active elimination events map by team ID
  const [eliminationEvents, setEliminationEvents] = useState<Record<string, EliminationEvent>>({});
  const knownMarkedRef = useRef<Map<string, string>>(new Map());
  const elimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (elimTimerRef.current) {
        clearTimeout(elimTimerRef.current);
        elimTimerRef.current = null;
      }
      prevFocusRef.current = currentFocus;
      committedTeamsRef.current = teams;
      pendingTeamsRef.current = teams;
      prevPodiumIdsRef.current = new Set(teams.slice(0, 3).map((t) => t.id));

      const tabMarkedMap = new Map<string, string>();
      teams.forEach((t) => {
        if (t.marked) tabMarkedMap.set(t.id, t.marked);
      });
      knownMarkedRef.current = tabMarkedMap;

      setDisplayedTeams(teams);
      setAnimationEvents({});
      setEliminationEvents({});
    }
  }, [currentFocus, teams]);

  // Handle incoming data changes with 800ms debounce
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      committedTeamsRef.current = teams;
      pendingTeamsRef.current = teams;
      prevPodiumIdsRef.current = new Set(teams.slice(0, 3).map((t) => t.id));

      const initialMarkedMap = new Map<string, string>();
      teams.forEach((t) => {
        if (t.marked) initialMarkedMap.set(t.id, t.marked);
      });
      knownMarkedRef.current = initialMarkedMap;

      setDisplayedTeams(teams);
      return;
    }

    // Check for newly marked teams compared to knownMarkedRef
    const newlyMarkedTeams: RankedTeam[] = [];
    const updatedMarkedMap = new Map<string, string>();
    teams.forEach((t) => {
      const currentMarked = t.marked || '';
      const prevMarked = knownMarkedRef.current.get(t.id) || '';
      if (!prevMarked && currentMarked) {
        newlyMarkedTeams.push(t);
      }
      if (currentMarked) {
        updatedMarkedMap.set(t.id, currentMarked);
      }
    });
    knownMarkedRef.current = updatedMarkedMap;

    // Check if teams actually changed compared to committedTeamsRef
    const hasChanged =
      teams.length !== committedTeamsRef.current.length ||
      teams.some((t) => {
        const old = committedTeamsRef.current.find((ot) => ot.id === t.id);
        if (!old) return true;
        return (
          old.focusScore !== t.focusScore ||
          old.rank !== t.rank ||
          old.isTied !== t.isTied ||
          old.marked !== t.marked ||
          old.out !== t.out
        );
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

    // Check if there are score/rank changes
    const hasScoreOrRankChange = teams.some((t) => {
      const old = committedTeamsRef.current.find((ot) => ot.id === t.id);
      if (!old) return false;
      return old.focusScore !== t.focusScore || old.rank !== t.rank;
    });

    // Schedule live elimination animation if there are newly marked teams
    if (newlyMarkedTeams.length > 0) {
      // Sort newly marked teams by rank descending (LOWEST-ranked row to highest)
      newlyMarkedTeams.sort((a, b) => b.rank - a.rank);

      // If there's a score/rank change debounce, start after the 800ms debounce
      const baseDelay = hasScoreOrRankChange ? 800 : 0;
      const newElimEvents: Record<string, EliminationEvent> = {};
      const now = Date.now();

      newlyMarkedTeams.forEach((t, idx) => {
        const delay = baseDelay + Math.min(idx * 350, 4000);
        const isLast = idx === newlyMarkedTeams.length - 1;
        newElimEvents[t.id] = {
          delay,
          isLast,
          timestamp: now,
        };
      });

      setEliminationEvents(newElimEvents);

      const maxDelay = baseDelay + Math.min((newlyMarkedTeams.length - 1) * 350, 4000);
      const totalAnimDuration = maxDelay + 2600;

      if (elimTimerRef.current) clearTimeout(elimTimerRef.current);
      elimTimerRef.current = setTimeout(() => {
        setEliminationEvents({});
        elimTimerRef.current = null;
      }, totalAnimDuration);
    }

    pendingTeamsRef.current = teams;

    // Restart 800ms debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If only marked or out changed (no score or rank changes), update displayedTeams immediately
    if (!hasScoreOrRankChange) {
      committedTeamsRef.current = teams;
      setDisplayedTeams(teams);
      return;
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
      if (document.hidden) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        if (elimTimerRef.current) {
          clearTimeout(elimTimerRef.current);
          elimTimerRef.current = null;
        }
        setDisplayedTeams(pendingTeamsRef.current);
        committedTeamsRef.current = pendingTeamsRef.current;
        setAnimationEvents({});
        setEliminationEvents({});
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

  // 1. Level & PTS header label calculation
  const isOverall = !currentFocus || currentFocus === 'all';
  const activeLevel = !isOverall ? levels.find((l) => l.id === currentFocus) : null;
  const headerPtsLabel = isOverall
    ? 'TOTAL PTS'
    : `${(activeLevel?.name || 'LEVEL').toUpperCase()} PTS`;

  // If longer than 22 characters, fit it to the available width
  const headerPtsFontSize = useMemo(() => {
    if (headerPtsLabel.length <= 22) return headerFontSize;
    return Math.max(14, Math.floor(headerFontSize * (22 / headerPtsLabel.length)));
  }, [headerPtsLabel, headerFontSize]);

  // Base name size: 24 for 3+ cols, 36 for 1-2 cols
  const baseNameSize = numCols >= 3 ? 24 : 36;

  return (
    <div
      data-testid="rank-list-container"
      className="w-full h-full flex flex-col justify-start overflow-hidden min-h-0"
    >
      {/* 1. Slim Header Strip: "TEAM STANDINGS" left, "TOTAL PTS" or "<LEVEL> PTS" right */}
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
          data-testid="rank-list-header-pts"
          style={{ fontSize: `${headerPtsFontSize}px` }}
          className="text-white/90 font-outfit uppercase tracking-wider font-extrabold leading-none truncate shrink-0 max-w-[50%] text-right"
        >
          {headerPtsLabel}
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
                return (
                  <StadiumRow
                    key={team.id}
                    team={team}
                    rowHeight={rowHeight}
                    allZero={allZero}
                    baseNameSize={baseNameSize}
                    disableAnimation={true}
                    soundEnabled={false}
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
                const wasOnPodium = prevPodiumIdsRef.current.has(team.id);
                return (
                  <StadiumRow
                    key={team.id}
                    team={team}
                    rowHeight={rowHeight}
                    allZero={allZero}
                    baseNameSize={baseNameSize}
                    animationEvent={animationEvents[team.id]}
                    eliminationEvent={eliminationEvents[team.id]}
                    disableAnimation={disableAnimation}
                    soundEnabled={Boolean(quizState.eliminationSound)}
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