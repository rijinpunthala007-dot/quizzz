import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { RevealSnapshotTeam } from '../../types';
import AnimatedScore from '../projector/AnimatedScore';
import { getInitials } from '../../utils';

interface RevealCardProps {
  team: RevealSnapshotTeam;
  rank: 1 | 2 | 3;
  step?: 0 | 1 | 2 | 3 | 4;
  dimmed?: boolean;
  isTied?: boolean;
  countDuration?: number; // default 1500ms
  compact?: boolean; // for ties sharing row
}

const springSettling = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 18,
};

const RevealCard = memo(function RevealCard({
  team,
  rank,
  dimmed = false,
  isTied = false,
  countDuration = 1500,
  compact = false,
}: RevealCardProps) {
  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isLite =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('lite') === '1';

  const initials = useMemo(() => getInitials(team.name), [team.name]);

  // Rank-specific ribbons and themes
  const isWinner = rank === 1;
  const isRunnerUp = rank === 2;

  const ribbonText = isTied
    ? `TIE · ${isWinner ? 'CHAMPIONS' : isRunnerUp ? 'RUNNER-UP' : 'THIRD PLACE'}`
    : isWinner
    ? 'CHAMPION · #1'
    : isRunnerUp
    ? 'RUNNER-UP · #2'
    : 'THIRD PLACE · #3';

  const badgeText = isTied
    ? `T-${rank}`
    : `#${rank}`;

  // Card dimensions (responsive to compact tie mode)
  const cardWidth = isWinner
    ? compact ? 'w-[420px]' : 'w-[480px]'
    : isRunnerUp
    ? compact ? 'w-[370px]' : 'w-[410px]'
    : compact ? 'w-[350px]' : 'w-[390px]';

  const cardHeight = isWinner
    ? 'h-[330px]'
    : isRunnerUp
    ? 'h-[295px]'
    : 'h-[275px]';

  // Colors & styles
  if (isWinner) {
    return (
      <motion.article
        data-testid="reveal-card-1"
        initial={isReducedMotion || isLite ? { opacity: 0 } : { y: 160, opacity: 0 }}
        animate={{ y: 0, opacity: dimmed ? 0.65 : 1 }}
        transition={
          isReducedMotion || isLite
            ? { duration: 0.6 }
            : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
        }
        className={`relative flex flex-col items-center justify-between ${cardWidth} ${cardHeight} shrink-0 bg-gradient-to-b from-[#3e1ea8]/95 via-[#2f148b]/95 to-[#240d75]/98 rounded-3xl px-6 pt-5 pb-3.5 z-20 border-2 border-amber-300 shadow-[0_20px_60px_rgba(251,191,36,0.45)] transition-opacity duration-500 overflow-hidden select-none`}
      >
        {/* Shimmer sweep across the card once on entrance */}
        {!isReducedMotion && !isLite && (
          <motion.div
            initial={{ x: '-120%' }}
            animate={{ x: '240%' }}
            transition={{ duration: 1.4, delay: 0.35, ease: 'easeInOut' }}
            className="absolute inset-0 pointer-events-none w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] z-30"
          />
        )}

        {/* Crown & Winner Pill Badge */}
        <motion.div
          initial={isReducedMotion || isLite ? { opacity: 0 } : { y: -25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={springSettling}
          className="absolute -top-4 px-6 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-indigo-950 font-outfit text-xs font-black tracking-widest uppercase shadow-[0_0_24px_rgba(251,191,36,0.7)] flex items-center gap-2 z-40 border border-amber-200"
        >
          <span>👑</span>
          <span>{ribbonText}</span>
          <span>👑</span>
        </motion.div>

        {/* Gold Laurel Avatar with Rotating Light Ring */}
        <div className="relative w-24 h-24 my-1 flex items-center justify-center shrink-0">
          {/* Subtle Rotating Light Ring around Winner */}
          {!isReducedMotion && !isLite && (
            <div
              className="absolute -inset-2.5 rounded-full border border-dashed border-amber-300/60 pointer-events-none animate-spin"
              style={{ animationDuration: '16s' }}
            />
          )}

          <motion.div
            initial={isReducedMotion || isLite ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.7, ease: 'easeOut' }}
            className="w-[92px] h-[92px] rounded-full p-[4px] bg-gradient-to-tr from-amber-400 via-amber-200 to-yellow-500 shadow-xl glow-gold flex items-center justify-center ring-4 ring-amber-300/60"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-b from-[#241366] to-[#120835] flex flex-col items-center justify-center border-2 border-amber-300/80">
              <span className="font-cinzel text-3xl font-black text-amber-300 tracking-wider">
                {initials}
              </span>
            </div>
          </motion.div>

          {/* Golden Laurel Leaves */}
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

          {/* Golden Trophy Icon Badge */}
          <div className="absolute -bottom-2 bg-gradient-to-r from-amber-500 to-yellow-400 border border-amber-200 rounded-full p-1.5 shadow-lg">
            <svg className="w-4 h-4 text-indigo-950 fill-current" viewBox="0 0 24 24">
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
            </svg>
          </div>
        </div>

        {/* Team Name */}
        <div className="w-full text-center px-2 flex flex-col items-center justify-center my-0.5">
          <h2 className="font-cinzel text-2xl md:text-3xl lg:text-[32px] text-white font-black tracking-wide leading-tight line-clamp-2 drop-shadow">
            {team.name}
          </h2>
          <span className="font-outfit text-xs md:text-sm text-amber-200/90 font-bold uppercase tracking-widest mt-0.5">
            {team.church || team.subtitle || 'Bible Quiz Champions'}
          </span>
        </div>

        {/* Total Score counting up over 1.5s */}
        <div className="flex items-baseline gap-2 mt-0.5">
          <AnimatedScore
            value={team.total}
            duration={countDuration}
            className="font-outfit text-5xl md:text-6xl leading-tight text-amber-300 font-black drop-shadow-[0_2px_16px_rgba(251,191,36,0.6)] tabular-nums"
          />
          <span className="font-outfit text-base text-amber-300 tracking-wider font-black">
            PTS
          </span>
        </div>
      </motion.article>
    );
  }

  // Runner-Up (#2) or Third Place (#3)
  const ringBg = isRunnerUp
    ? 'from-slate-400 via-white to-slate-300 glow-silver'
    : 'from-amber-700 via-orange-400 to-amber-600 glow-bronze';

  const sprigColor = isRunnerUp ? 'text-slate-300' : 'text-orange-300';
  const trophyBg = isRunnerUp
    ? 'bg-slate-800/90 border-slate-300/60 text-slate-200'
    : 'bg-amber-950/90 border-orange-400/60 text-amber-400';
  const ringInnerBorder = isRunnerUp ? 'border-white/40' : 'border-orange-300/40';

  const badgeBg = isRunnerUp
    ? 'bg-white/20 border-white/40 text-white'
    : 'bg-amber-900/60 border-orange-400/50 text-orange-200';

  return (
    <motion.article
      data-testid={`reveal-card-${rank}`}
      initial={isReducedMotion || isLite ? { opacity: 0 } : { y: 160, opacity: 0 }}
      animate={{ y: 0, opacity: dimmed ? 0.6 : 1 }}
      transition={
        isReducedMotion || isLite
          ? { duration: 0.6 }
          : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
      }
      className={`relative flex flex-col items-center justify-between ${cardWidth} ${cardHeight} shrink-0 bg-[#281577]/70 border border-white/20 backdrop-blur-md rounded-3xl px-5 pt-4 pb-3 shadow-xl transition-opacity duration-500 overflow-hidden select-none z-10`}
    >
      {/* Light shimmer sweep once on entrance */}
      {!isReducedMotion && !isLite && (
        <motion.div
          initial={{ x: '-120%' }}
          animate={{ x: '240%' }}
          transition={{ duration: 1.3, delay: 0.3, ease: 'easeInOut' }}
          className="absolute inset-0 pointer-events-none w-1/2 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-[-20deg] z-30"
        />
      )}

      {/* Top Rank Badge */}
      <motion.div
        initial={isReducedMotion || isLite ? { opacity: 0 } : { y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={springSettling}
        className={`absolute -top-3.5 px-4 py-0.5 rounded-full border text-xs shadow-md flex items-center gap-1.5 font-black uppercase tracking-wider z-40 ${badgeBg}`}
      >
        <span>{ribbonText}</span>
        <span className="opacity-75">·</span>
        <span>{badgeText}</span>
      </motion.div>

      {/* Laurel Ring */}
      <div className="relative w-20 h-20 my-0.5 flex items-center justify-center shrink-0">
        <motion.div
          initial={isReducedMotion || isLite ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6, ease: 'easeOut' }}
          className={`w-[78px] h-[78px] rounded-full p-[3.5px] bg-gradient-to-tr ${ringBg} shadow-md flex items-center justify-center`}
        >
          <div
            className={`w-full h-full rounded-full bg-gradient-to-b from-[#29177a] to-[#170a48] flex flex-col items-center justify-center border-2 ${ringInnerBorder}`}
          >
            <span className="font-cinzel text-2xl text-white font-extrabold tracking-wider">
              {initials}
            </span>
            <span
              className={`text-[8px] font-semibold -mt-0.5 uppercase tracking-widest ${
                isRunnerUp ? 'text-slate-300' : 'text-orange-200'
              }`}
            >
              TEAM
            </span>
          </div>
        </motion.div>

        {/* Laurel Sprigs */}
        <div className={`absolute -left-2.5 top-5 pointer-events-none ${sprigColor} opacity-80`}>
          <svg className="w-3.5 h-7.5 fill-current" viewBox="0 0 20 32">
            <path d="M16 2 C10 6 8 14 10 24 C6 20 5 13 8 7 Z" />
            <path d="M13 10 C8 14 7 20 10 28 C5 24 4 17 8 11 Z" />
          </svg>
        </div>
        <div
          className={`absolute -right-2.5 top-5 pointer-events-none ${sprigColor} opacity-80 scale-x-[-1]`}
        >
          <svg className="w-3.5 h-7.5 fill-current" viewBox="0 0 20 32">
            <path d="M16 2 C10 6 8 14 10 24 C6 20 5 13 8 7 Z" />
            <path d="M13 10 C8 14 7 20 10 28 C5 24 4 17 8 11 Z" />
          </svg>
        </div>

        {/* Trophy Icon Badge */}
        <div className={`absolute -bottom-1.5 border rounded-full p-1 shadow-md ${trophyBg}`}>
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M5 4h14v2h-1.5c-.8 3-2.5 5.5-5 6.5V17h3v2H8.5v-2h3v-4.5C9 11.5 7.3 9 6.5 6H5V4zm3 2c.6 2.4 1.8 4.2 3.5 5 1.7-.8 2.9-2.6 3.5-5H8z" />
          </svg>
        </div>
      </div>

      {/* Team Name */}
      <div className="w-full text-center px-2 flex flex-col items-center justify-center my-0.5">
        <h3 className="font-cinzel text-xl md:text-2xl text-white font-bold tracking-wide leading-tight line-clamp-2">
          {team.name}
        </h3>
        <span
          className={`font-outfit text-xs font-semibold uppercase tracking-wider mt-0.5 ${
            isRunnerUp ? 'text-slate-300' : 'text-orange-200/80'
          }`}
        >
          {team.church || team.subtitle || (isRunnerUp ? 'SECOND PLACE' : 'THIRD PLACE')}
        </span>
      </div>

      {/* Total Score */}
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <AnimatedScore
          value={team.total}
          duration={countDuration}
          className="font-outfit text-4xl md:text-5xl leading-none text-white font-black drop-shadow tabular-nums"
        />
        <span className="font-outfit text-xs md:text-sm text-purple-200 font-bold">PTS</span>
      </div>
    </motion.article>
  );
});

export default RevealCard;
