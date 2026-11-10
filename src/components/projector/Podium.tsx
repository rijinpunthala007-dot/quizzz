import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { RankedTeam, Level, Team } from '../../types';
import type { ProjectorLayout } from './layout';
import AnimatedScore from './AnimatedScore';
import { getInitials } from '../../utils';

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

function formatLevelScores(levels: Level[], team: RankedTeam): string {
  if (!levels || levels.length === 0) return '';
  return levels
    .map((lvl) => {
      const short = lvl.name.replace(/[^0-9]/g, '') || lvl.name.charAt(0);
      const score = team.scores[lvl.id] ?? 0;
      return `L${short} ${score}`;
    })
    .join(' · ');
}

const Podium = memo(function Podium({
  teams,
  levels,
  disableAnimation = false,
  isCelebrating = false,
  podiumHeight,
}: PodiumProps) {
  // Extract top 3 active teams by ranking order
  const activeTeams = useMemo(() => teams.filter((t) => !t.out), [teams]);
  const first = activeTeams[0];   // Slot 1 (Center)
  const second = activeTeams[1];  // Slot 2 (Left)
  const third = activeTeams[2];   // Slot 3 (Right)

  // Layout order: 2nd (left), 1st (center), 3rd (right)
  const columns = [
    { team: second, slotRank: 2, position: 'left' as const },
    { team: first, slotRank: 1, position: 'center' as const },
    { team: third, slotRank: 3, position: 'right' as const },
  ];

  return (
    <div
      data-testid="podium-container"
      style={{ height: podiumHeight ? `${podiumHeight}px` : undefined }}
      className="w-full h-[310px] flex items-end justify-center select-none overflow-visible relative gap-10"
    >
      {columns.map(({ team, slotRank, position }) => {
        if (!team) {
          return (
            <div
              key={position}
              className={`shrink-0 ${slotRank === 1 ? 'w-[470px] h-[295px]' : 'w-[400px] h-[265px]'}`}
            />
          );
        }

        const isCenterWinner = slotRank === 1;
        const initials = getInitials(team.name);
        const levelBreakdown = formatLevelScores(levels, team);

        // Format display badge text (e.g. "T-1", "T-2", "#1", "#2", "#3")
        const badgeText = team.displayRank
          ? (team.displayRank.startsWith('T') ? team.displayRank : `#${team.displayRank}`)
          : `#${slotRank}`;

        if (isCenterWinner) {
          // #1 CHAMPION CARD (Center Gold Supreme)
          return (
            <motion.article
              key={team.id}
              layout={disableAnimation ? false : 'position'}
              transition={springTransition}
              data-testid={`podium-card-${slotRank}`}
              className={`relative flex flex-col items-center justify-between w-[470px] h-[295px] shrink-0 bg-gradient-to-b from-[#3d1da9]/95 via-[#2e1388]/95 to-[#250d75]/98 rounded-3xl px-6 pt-4 pb-3.5 z-20 transition-all ${
                isCelebrating
                  ? 'border-4 border-amber-300 shadow-[0_0_80px_rgba(251,191,36,0.85)] scale-105'
                  : 'border-2 border-amber-400/70 shadow-[0_20px_50px_rgba(251,191,36,0.4)]'
              }`}
            >
              {/* Crown Floating Pill */}
              <div
                className={`absolute -top-3.5 px-5 py-1.5 rounded-full text-indigo-950 font-outfit text-xs flex items-center gap-2 font-black tracking-widest uppercase transition-all ${
                  isCelebrating
                    ? 'bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 shadow-[0_0_30px_rgba(251,191,36,0.9)] animate-bounce'
                    : 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.6)]'
                }`}
              >
                <span>👑</span>
                <span className="font-black tracking-widest">
                  {isCelebrating ? 'CHAMPION · #1' : badgeText}
                </span>
                <span>👑</span>
              </div>

              {/* Concentric Gold Laurel Ring */}
              <div
                className="relative w-24 h-24 my-0.5 flex items-center justify-center shrink-0"
                data-testid={`podium-avatar-${slotRank}`}
              >
                <div className={`w-[90px] h-[90px] rounded-full p-[4px] bg-gradient-to-tr from-amber-400 via-amber-200 to-yellow-500 shadow-xl glow-gold flex items-center justify-center ${
                  isCelebrating ? 'ring-4 ring-amber-300/60' : ''
                }`}>
                  <div className="w-full h-full rounded-full bg-gradient-to-b from-[#241366] to-[#120835] flex flex-col items-center justify-center border-2 border-amber-300/80">
                    <span className="font-cinzel text-3xl font-black text-amber-300 tracking-wider">
                      {initials}
                    </span>
                  </div>
                </div>

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

                {/* Center Golden Cup Trophy Badge */}
                <div className="absolute -bottom-2 bg-gradient-to-r from-amber-500 to-yellow-400 border border-amber-200 rounded-full p-1.5 shadow-lg">
                  <svg className="w-4 h-4 text-indigo-950 fill-current" viewBox="0 0 24 24">
                    <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                  </svg>
                </div>
              </div>

              {/* Team Name */}
              <div
                className="w-full text-center px-2 truncate min-h-[34px] flex items-center justify-center"
                data-testid={`podium-name-${slotRank}`}
              >
                <h2 className="font-cinzel text-2xl md:text-3xl text-white font-black tracking-wide truncate drop-shadow">
                  {team.name}
                </h2>
              </div>

              {/* Round Breakdown Showcase Card with Accuracy Bar */}
              <div className={`w-full border rounded-xl px-4 py-1.5 flex flex-col items-center shadow-lg transition-all ${
                isCelebrating
                  ? 'bg-[#291177]/95 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                  : 'bg-[#180a52]/90 border-amber-400/40'
              }`}>
                <div className="flex items-center justify-between w-full px-1">
                  <span className="font-outfit text-[11px] text-amber-300 tracking-widest font-black uppercase">
                    {isCelebrating ? '🏆 GRAND FINALE CHAMPION 🏆' : 'ROUND BREAKDOWN'}
                  </span>
                  <span className="font-outfit text-[11px] text-amber-200/90 tracking-widest font-black uppercase">
                    100% ACCURACY
                  </span>
                </div>
                <span className="font-outfit text-xs md:text-sm text-amber-100 font-bold truncate mt-0.5">
                  {levelBreakdown || 'All Levels Completed'}
                </span>
                <div className="h-1.5 w-full bg-indigo-950 rounded-full overflow-hidden mt-1 border border-amber-400/20">
                  <div className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 w-full rounded-full" />
                </div>
              </div>

              {/* Total Score */}
              <div
                className="flex items-baseline gap-2 mt-0.5"
                data-testid={`podium-score-${slotRank}`}
              >
                <AnimatedScore
                  value={team.focusScore}
                  className="font-outfit text-5xl leading-tight text-amber-300 font-black drop-shadow-[0_2px_16px_rgba(251,191,36,0.6)] tabular-nums"
                />
                <span className="font-outfit text-sm text-amber-300 tracking-wider font-black">
                  PTS
                </span>
              </div>
            </motion.article>
          );
        }

        // Slot 2 (Left) and Slot 3 (Right)
        const isTiedForFirst = team.rank === 1;
        const isSecondRank = team.rank === 2 || (slotRank === 2 && !isTiedForFirst);
        
        const ringBg = isTiedForFirst
          ? 'from-amber-400 via-amber-200 to-yellow-500 glow-gold'
          : isSecondRank
          ? 'from-slate-400 via-white to-slate-300 glow-silver'
          : 'from-amber-700 via-orange-400 to-amber-600 glow-bronze';

        const badgeBg = isTiedForFirst
          ? 'bg-amber-400/30 border-amber-400/60 text-amber-300'
          : isSecondRank
          ? 'bg-white/20 border-white/30 text-white'
          : 'bg-amber-900/60 border-orange-400/50 text-orange-200';

        const sprigColor = isTiedForFirst ? 'text-amber-400' : isSecondRank ? 'text-slate-300' : 'text-orange-300';
        
        const trophyBg = isTiedForFirst
          ? 'bg-amber-950/90 border-amber-300/60 text-amber-300'
          : isSecondRank
          ? 'bg-slate-800/90 border-slate-300/60 text-slate-200'
          : 'bg-amber-950/90 border-orange-400/60 text-amber-400';

        const ringInnerBorder = isTiedForFirst
          ? 'border-amber-300/60'
          : isSecondRank
          ? 'border-white/40'
          : 'border-orange-300/40';

        return (
          <motion.article
            key={team.id}
            layout={disableAnimation ? false : 'position'}
            transition={springTransition}
            data-testid={`podium-card-${slotRank}`}
            className="relative flex flex-col items-center justify-between w-[400px] h-[265px] shrink-0 bg-[#281577]/65 border border-white/20 backdrop-blur-md rounded-3xl px-5 pt-3.5 pb-3 shadow-xl hover:-translate-y-1 transition-transform"
          >
            {/* Top Rank Badge */}
            <div
              className={`absolute -top-3.5 px-3.5 py-0.5 rounded-full border text-xs shadow-md flex items-center font-black ${badgeBg}`}
            >
              {badgeText}
            </div>

            {/* Laurel Ring */}
            <div
              className="relative w-20 h-20 my-0.5 flex items-center justify-center shrink-0"
              data-testid={`podium-avatar-${slotRank}`}
            >
              <div
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
                      isSecondRank ? 'text-slate-300' : 'text-orange-200'
                    }`}
                  >
                    TEAM
                  </span>
                </div>
              </div>

              {/* Laurel Sprigs */}
              <div
                className={`absolute -left-2.5 top-5 pointer-events-none ${sprigColor} opacity-80`}
              >
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
              <div
                className={`absolute -bottom-1.5 border rounded-full p-1 shadow-md ${trophyBg}`}
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M5 4h14v2h-1.5c-.8 3-2.5 5.5-5 6.5V17h3v2H8.5v-2h3v-4.5C9 11.5 7.3 9 6.5 6H5V4zm3 2c.6 2.4 1.8 4.2 3.5 5 1.7-.8 2.9-2.6 3.5-5H8z" />
                </svg>
              </div>
            </div>

            {/* Team Name */}
            <div
              className="w-full text-center px-2 truncate min-h-[30px] flex items-center justify-center"
              data-testid={`podium-name-${slotRank}`}
            >
              <h3 className="font-cinzel text-xl md:text-2xl text-white font-bold tracking-wide truncate">
                {team.name}
              </h3>
            </div>

            {/* Round Metrics Chip */}
            <div className="w-full bg-[#1e0e5e]/80 border border-white/10 rounded-xl px-3.5 py-1.5 flex items-center justify-between text-xs">
              <span className="font-outfit text-[10px] text-purple-200 tracking-wider font-bold uppercase flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-slate-300">stars</span>
                METRICS
              </span>
              <span className="font-outfit text-xs text-purple-100 font-mono font-medium truncate">
                {levelBreakdown || 'All Levels'}
              </span>
            </div>

            {/* Total Score */}
            <div
              className="flex items-baseline gap-1.5 mt-0.5"
              data-testid={`podium-score-${slotRank}`}
            >
              <AnimatedScore
                value={team.focusScore}
                className="font-outfit text-4xl leading-none text-white font-black drop-shadow tabular-nums"
              />
              <span className="font-outfit text-xs text-purple-200 font-bold">PTS</span>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
});

export default Podium;
