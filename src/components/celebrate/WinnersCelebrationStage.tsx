import { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { QuizState, RevealSnapshotTeam, CelebrationWording } from '../../types';
import { DEFAULT_WORDING } from '../../types';
import { hideWinnersPage, triggerCelebrateAgain } from '../../store';
import { createRevealSnapshot, getInitials } from '../../utils';
import CelebrateConfetti from './CelebrateConfetti';
import { useFitText } from './useFitText';

interface WinnersCelebrationStageProps {
  state: QuizState;
}

// 12 Twinkling gold star coordinates around winner's avatar and card edges
const STAR_OFFSETS = [
  { top: '8%', left: '12%', delay: '0s', size: 14 },
  { top: '6%', right: '14%', delay: '0.4s', size: 16 },
  { top: '22%', left: '4%', delay: '0.8s', size: 12 },
  { top: '24%', right: '5%', delay: '1.2s', size: 15 },
  { top: '38%', left: '10%', delay: '0.3s', size: 18 },
  { top: '40%', right: '9%', delay: '0.7s', size: 14 },
  { top: '55%', left: '6%', delay: '1.1s', size: 16 },
  { top: '58%', right: '7%', delay: '0.5s', size: 12 },
  { top: '75%', left: '14%', delay: '0.9s', size: 15 },
  { top: '78%', right: '12%', delay: '0.2s', size: 17 },
  { top: '15%', left: '32%', delay: '0.6s', size: 16 },
  { top: '16%', right: '30%', delay: '1.0s', size: 14 },
];

export default function WinnersCelebrationStage({ state }: WinnersCelebrationStageProps) {
  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isLite =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('lite') === '1';

  // Autohide buttons on mouse inactivity (show for 3s on mousemove, then fade out)
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    timer = setTimeout(() => setShowControls(false), 3000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timer);
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

  // Top 3 teams from frozen snapshot or live calculation
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

  const soundEnabled = Boolean(state.soundEnabled);
  const celebrateTrigger = state.celebrateTrigger;

  return (
    <div
      data-testid="winners-celebration-stage"
      className="relative w-[1920px] h-[1080px] overflow-hidden flex flex-col justify-between select-none bg-[#250f6d] text-white"
    >
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-[#2a1383] via-[#3a1da3] to-[#240e6b]" />
        <div className="absolute -top-20 left-1/3 w-[800px] h-[600px] bg-violet-600/30 blur-[150px]" />
        <div className="absolute top-1/4 right-1/4 w-[700px] h-[600px] bg-fuchsia-600/20 blur-[160px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-amber-500/15 blur-[180px]" />
        <div className="film-grain" style={{ opacity: 0.03 }} />
      </div>

      {/* Top Floating Controls for Admin (Autohides after 3s of mouse inactivity) */}
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

      {/* CENTER COHESIVE GROUP: Banner + Subtitle + Strict CSS Grid Podium Cards */}
      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center min-h-0 py-6 px-12">
        {/* HEXAGON BANNER & SUBTITLE (Fades down on entrance) */}
        <motion.div
          initial={isReducedMotion || isLite ? { opacity: 0 } : { opacity: 0, y: -35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col items-center text-center mb-8 shrink-0"
        >
          <div className="banner-ribbon px-24 py-3.5 text-center flex items-center justify-center backdrop-blur-md shadow-2xl">
            <h1 className="font-cinzel text-5xl md:text-6xl text-white font-black tracking-widest uppercase drop-shadow-md m-0 p-0">
              CONGRATULATIONS
            </h1>
          </div>
          <p className="font-outfit text-2xl md:text-3xl text-amber-300 font-bold tracking-wide mt-2.5 drop-shadow">
            {wording.subtitle}
          </p>
        </motion.div>

        {/* STRICT CSS GRID PODIUM CARDS (Order: 2nd | 1st | 3rd, bottom-aligned, 40px gap) */}
        <div className="w-full flex items-end justify-center gap-10 overflow-visible">
          {/* 2ND PLACE (Runner-up) - Rises 2nd (t = 0.7s) */}
          <div className="flex items-end gap-6 overflow-visible">
            {secondRank.map((team) => (
              <PodiumGridCard
                key={team.id}
                team={team}
                rank={2}
                delay={0.7}
                pillText={wording.pill2}
                taglineText={wording.tagline2}
                isTied={secondRank.length > 1}
                isReducedMotion={isReducedMotion}
                isLite={isLite}
              />
            ))}
          </div>

          {/* 1ST PLACE (Champion Hero) - Rises 3rd (t = 1.3s) */}
          <div className="flex items-end gap-6 overflow-visible">
            {firstRank.map((team) => (
              <PodiumGridCard
                key={team.id}
                team={team}
                rank={1}
                delay={1.3}
                pillText={wording.pill1}
                taglineText={wording.tagline1}
                isTied={firstRank.length > 1}
                isReducedMotion={isReducedMotion}
                isLite={isLite}
              />
            ))}
          </div>

          {/* 3RD PLACE - Rises 1st (t = 0.1s) */}
          <div className="flex items-end gap-6 overflow-visible">
            {thirdRank.map((team) => (
              <PodiumGridCard
                key={team.id}
                team={team}
                rank={3}
                delay={0.1}
                pillText={wording.pill3}
                taglineText={wording.tagline3}
                isTied={thirdRank.length > 1}
                isReducedMotion={isReducedMotion}
                isLite={isLite}
              />
            ))}
          </div>
        </div>
      </div>

      {/* PINNED FIXED 56PX FOOTER STRIP AT BOTTOM */}
      <footer
        data-testid="celebration-footer"
        className="relative z-20 w-full h-[56px] min-h-[56px] shrink-0 bg-[#251070]/90 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-12 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-amber-400 text-lg">✝</span>
          <p className="font-outfit text-sm md:text-base text-purple-100 italic tracking-wide">
            &ldquo;Well done, thou good and faithful servant.&rdquo;
            <span className="text-amber-300 font-bold not-italic ml-2">— Matthew 25:21</span>
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-outfit text-purple-200 uppercase tracking-widest font-bold">
          <span>{wording.footerText}</span>
        </div>
      </footer>

      {/* FULL-SCREEN CELEBRATION CANVAS */}
      <CelebrateConfetti
        trigger={celebrateTrigger}
        soundEnabled={soundEnabled}
        delayStartMs={2200}
      />
    </div>
  );
}

// =========================================================================
// STRICT CSS GRID PODIUM CARD COMPONENT (FIXED ROW HEIGHTS)
// =========================================================================
interface PodiumGridCardProps {
  team: RevealSnapshotTeam;
  rank: 1 | 2 | 3;
  delay: number;
  pillText: string;
  taglineText: string;
  isTied: boolean;
  isReducedMotion: boolean;
  isLite: boolean;
}

function PodiumGridCard({
  team,
  rank,
  delay,
  pillText,
  taglineText,
  isTied,
  isReducedMotion,
  isLite,
}: PodiumGridCardProps) {
  const isWinner = rank === 1;
  const isRunnerUp = rank === 2;
  const initials = getInitials(team.name);

  // Exact sizes & grid budgets:
  // 1st: 620 x 600, rows: 52, 170, 14, 140, 8, 30, 14, 140, pb: 32 (Sum = 600)
  // 2nd & 3rd: 520 x 500, rows: 48, 140, 12, 120, 8, 28, 12, 96, pb: 36 (Sum = 500)
  const cardWidth = isWinner ? 620 : 520;
  const cardHeight = isWinner ? 600 : 500;
  const gridRows = isWinner
    ? '52px 170px 14px 140px 8px 30px 14px 140px'
    : '48px 140px 12px 120px 8px 28px 12px 96px';
  const paddingBottom = isWinner ? '32px' : '36px';

  // Pill styling: Solid opaque background, centered on card top edge
  const pillDisplay = isTied ? `TIE · ${pillText}` : pillText;
  const pillBg = isWinner
    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-indigo-950 border-2 border-amber-200 shadow-[0_4px_24px_rgba(251,191,36,0.85)]'
    : isRunnerUp
    ? 'bg-slate-100 text-indigo-950 border-2 border-white shadow-[0_4px_16px_rgba(255,255,255,0.4)]'
    : 'bg-gradient-to-r from-amber-800 via-orange-700 to-amber-800 text-white border-2 border-orange-300 shadow-[0_4px_16px_rgba(245,158,11,0.4)]';

  // Dynamic binary search text fitting for name zone
  const { containerRef: nameContainerRef, textRef: nameTextRef, style: nameStyle } = useFitText(team.name, {
    maxFontSize: isWinner ? 72 : 56,
    minFontSize: isWinner ? 34 : 28,
    maxLines: 2,
    lineHeight: 1.05,
  });

  return (
    <motion.article
      data-testid={`celebration-card-${rank}`}
      initial={isReducedMotion || isLite ? { opacity: 0 } : { opacity: 0, y: 500 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.9,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        display: 'grid',
        gridTemplateRows: gridRows,
        paddingBottom,
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
      }}
      className={`relative shrink-0 rounded-3xl px-6 select-none overflow-visible ${
        isWinner
          ? 'bg-gradient-to-b from-[#3e1ea8]/95 via-[#2f148b]/95 to-[#240d75]/98 border-2 border-amber-300/90 shadow-[0_20px_70px_rgba(251,191,36,0.45)] z-20'
          : 'bg-[#281577]/70 border border-white/20 backdrop-blur-md shadow-2xl z-10'
      }`}
    >
      {/* Soft slow static gold glow on winner card */}
      {isWinner && (
        <div
          className="absolute -inset-10 rounded-[40px] pointer-events-none z-0 animate-pulse"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.28) 0%, rgba(251, 191, 36, 0.08) 50%, transparent 75%)',
            animationDuration: '4s',
          }}
        />
      )}

      {/* 12 Tiny Twinkling Gold Stars (CSS opacity animation only) */}
      {isWinner && !isReducedMotion && !isLite && (
        <div className="absolute inset-0 pointer-events-none overflow-visible z-10" aria-hidden="true">
          {STAR_OFFSETS.map((star, idx) => (
            <span
              key={idx}
              className="absolute text-amber-300 font-bold select-none drop-shadow"
              style={{
                top: star.top,
                left: star.left,
                right: star.right,
                fontSize: `${star.size}px`,
                animation: 'twinkle 3s ease-in-out infinite',
                animationDelay: star.delay,
              }}
            >
              ✦
            </span>
          ))}
        </div>
      )}

      {/* ROW 1: TOP SPACE & FULLY VISIBLE TOP PILL (Half above, half inside card top edge) */}
      <div className="relative w-full h-full flex items-center justify-center overflow-visible z-30">
        <div
          data-testid={`pill-${rank}`}
          className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-2 rounded-full font-outfit text-[26px] font-black tracking-widest uppercase flex items-center justify-center gap-2 whitespace-nowrap ${pillBg}`}
        >
          {isWinner && <span>👑</span>}
          <span>{pillDisplay}</span>
          {isWinner && <span>👑</span>}
        </div>
      </div>

      {/* ROW 2: AVATAR ZONE (170px for 1st, 140px for 2nd/3rd, medal stays strictly INSIDE) */}
      <div
        data-testid={`avatar-zone-${rank}`}
        className="relative w-full h-full flex items-center justify-center overflow-hidden z-20"
      >
        <div className={`relative ${isWinner ? 'w-[146px] h-[146px]' : 'w-[118px] h-[118px]'} flex items-center justify-center`}>
          {/* Avatar Ring */}
          <div
            className={`w-full h-full rounded-full p-[4px] flex items-center justify-center shadow-xl ${
              isWinner
                ? 'bg-gradient-to-tr from-amber-400 via-amber-200 to-yellow-500 ring-4 ring-amber-300/70 glow-gold'
                : isRunnerUp
                ? 'bg-gradient-to-tr from-slate-400 via-white to-slate-300 glow-silver'
                : 'bg-gradient-to-tr from-amber-700 via-orange-400 to-amber-600 glow-bronze'
            }`}
          >
            <div
              className={`w-full h-full rounded-full bg-gradient-to-b from-[#241366] to-[#120835] flex flex-col items-center justify-center border-2 ${
                isWinner ? 'border-amber-300/80' : isRunnerUp ? 'border-white/50' : 'border-orange-300/40'
              }`}
            >
              <span
                className={`font-cinzel font-black tracking-wider ${
                  isWinner ? 'text-5xl text-amber-300' : 'text-3xl md:text-4xl text-white'
                }`}
              >
                {initials}
              </span>
              {!isWinner && (
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest -mt-1">
                  TEAM
                </span>
              )}
            </div>
          </div>

          {/* Laurel Sprigs */}
          <div
            className={`absolute -left-4 top-1/4 pointer-events-none ${
              isWinner ? 'text-amber-400' : isRunnerUp ? 'text-slate-300' : 'text-orange-300'
            } opacity-90 drop-shadow`}
          >
            <svg className={isWinner ? 'w-5 h-11 fill-current' : 'w-4 h-9 fill-current'} viewBox="0 0 20 32">
              <path d="M16 2 C10 6 8 14 10 24 C6 20 5 13 8 7 Z" />
              <path d="M13 10 C8 14 7 20 10 28 C5 24 4 17 8 11 Z" />
            </svg>
          </div>
          <div
            className={`absolute -right-4 top-1/4 pointer-events-none ${
              isWinner ? 'text-amber-400' : isRunnerUp ? 'text-slate-300' : 'text-orange-300'
            } opacity-90 drop-shadow scale-x-[-1]`}
          >
            <svg className={isWinner ? 'w-5 h-11 fill-current' : 'w-4 h-9 fill-current'} viewBox="0 0 20 32">
              <path d="M16 2 C10 6 8 14 10 24 C6 20 5 13 8 7 Z" />
              <path d="M13 10 C8 14 7 20 10 28 C5 24 4 17 8 11 Z" />
            </svg>
          </div>

          {/* Trophy Badge (Anchored directly to bottom edge of ring, stays strictly inside avatar zone) */}
          <div
            className={`absolute -bottom-1 rounded-full p-1.5 shadow-xl border z-20 ${
              isWinner
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 border-amber-200 text-indigo-950'
                : isRunnerUp
                ? 'bg-slate-800 border-slate-300 text-slate-200'
                : 'bg-amber-950 border-orange-400 text-amber-400'
            }`}
          >
            <svg className={isWinner ? 'w-5 h-5 fill-current' : 'w-4 h-4 fill-current'} viewBox="0 0 24 24">
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
            </svg>
          </div>
        </div>
      </div>

      {/* ROW 3: GAP (14px for 1st, 12px for others) */}
      <div />

      {/* ROW 4: NAME ZONE (140px for 1st, 120px for others, strictly bounded with useFitText) */}
      <div
        ref={nameContainerRef}
        data-testid={`name-zone-${rank}`}
        className="w-full h-full overflow-hidden flex items-center justify-center text-center px-2 z-20"
      >
        <h2
          ref={nameTextRef as React.RefObject<HTMLHeadingElement>}
          data-testid={`name-text-${rank}`}
          className="font-cinzel text-white font-black tracking-wide text-center uppercase drop-shadow-md select-none"
          style={{
            fontSize: `${nameStyle.fontSize}px`,
            letterSpacing: nameStyle.letterSpacing,
            lineHeight: 1.05,
            wordBreak: 'keep-all',
            overflowWrap: 'normal',
            whiteSpace: 'normal',
            hyphens: 'none',
            textWrap: 'balance',
            maxHeight: '100%',
          }}
        >
          {team.name.split(' ').map((word, wIdx) => (
            <span
              key={wIdx}
              data-word="true"
              className="inline-block"
              style={{ wordBreak: 'keep-all', whiteSpace: 'nowrap' }}
            >
              {word}{wIdx < team.name.split(' ').length - 1 ? '\u00A0' : ''}
            </span>
          ))}
        </h2>
      </div>

      {/* ROW 5: GAP (8px) */}
      <div />

      {/* ROW 6: TAGLINE ZONE (30px for 1st, 28px for others, strictly bounded) */}
      <div
        data-testid={`tagline-zone-${rank}`}
        className="w-full h-full overflow-hidden flex items-center justify-center text-center px-2 z-20"
      >
        <span
          data-testid={`tagline-text-${rank}`}
          className={`font-outfit font-bold uppercase tracking-widest truncate ${
            isWinner
              ? 'text-xl text-amber-200/95'
              : isRunnerUp
              ? 'text-base text-slate-300'
              : 'text-base text-orange-200/95'
          }`}
        >
          {taglineText}
        </span>
      </div>

      {/* ROW 7: GAP (14px for 1st, 12px for others) */}
      <div />

      {/* ROW 8: SCORE ZONE (140px for 1st, 96px for others, strictly bounded) */}
      <div
        data-testid={`score-zone-${rank}`}
        className="w-full h-full overflow-hidden flex items-baseline justify-center gap-2.5 z-20"
      >
        <span
          data-testid={`score-text-${rank}`}
          className={`font-outfit font-black tabular-nums leading-none ${
            isWinner
              ? 'text-[124px] text-amber-300 drop-shadow-[0_4px_28px_rgba(251,191,36,0.7)]'
              : 'text-[92px] text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
          }`}
        >
          {team.total}
        </span>
        <span
          data-testid={`score-pts-${rank}`}
          className={`font-outfit text-[28px] font-black tracking-wider leading-none ${
            isWinner ? 'text-amber-300' : 'text-purple-200'
          }`}
        >
          PTS
        </span>
      </div>
    </motion.article>
  );
}
