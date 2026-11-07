import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { RankedTeam, Level, Team } from '../../types';
import Avatar from './Avatar';
import AnimatedScore from './AnimatedScore';
import { getRankMovement } from '../../utils';

interface RankListProps {
  teams: RankedTeam[];
  levels: Level[];
  allTeams?: Team[];
  focus?: string;
  disableAnimation?: boolean;
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

interface StadiumCardProps {
  team: RankedTeam;
  levels: Level[];
  disableAnimation: boolean;
  rowHeight: number;
  avatarSize: number;
  nameClass: string;
  scoreClass: string;
  ptsClass: string;
  rankClass: string;
  subClass: string;
}

const StadiumCard = memo(function StadiumCard({
  team,
  levels,
  disableAnimation,
  rowHeight,
  avatarSize,
  nameClass,
  scoreClass,
  ptsClass,
  rankClass,
  subClass,
}: StadiumCardProps) {
  const movement = getRankMovement(team.rank, team.previousRank);
  const prevScoreRef = useRef(team.focusScore);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    if (prevScoreRef.current !== team.focusScore) {
      prevScoreRef.current = team.focusScore;
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [team.focusScore]);

  const levelText = formatLevelScores(levels, team);

  return (
    <motion.article
      layout={disableAnimation ? false : 'position'}
      transition={springTransition}
      data-testid={`rank-row-${team.rank}`}
      style={{
        height: `${rowHeight}px`,
        backgroundColor: highlight ? 'rgba(255, 235, 180, 0.95)' : undefined,
      }}
      className="bg-[#dcd7fb]/95 hover:bg-[#e7e3fd] transition-colors rounded-full px-5 flex items-center justify-between shadow-md border border-white/70 shrink-0 w-full overflow-hidden"
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-3">
        {/* Rank display with movement indicator */}
        <div className={`${rankClass} shrink-0 flex items-center justify-center font-outfit text-indigo-950 font-black`}>
          <span>{team.displayRank || `#${team.rank}`}</span>
          {movement && movement.isPositive && (
            <span className="text-emerald-700 ml-1 text-xs" title={`Moved up ${movement.diff}`}>
              ▲
            </span>
          )}
          {movement && !movement.isPositive && (
            <span className="text-rose-600 ml-1 text-xs" title={`Moved down ${movement.diff}`}>
              ▼
            </span>
          )}
        </div>

        {/* Monogram Avatar with colorful gradient */}
        <Avatar name={team.name} id={team.id} size={avatarSize} />

        {/* Group Name & Level Breakdown */}
        <div className="flex flex-col min-w-0 flex-1 leading-tight">
          <span className={`font-outfit ${nameClass} text-indigo-950 truncate tracking-wide`}>
            {team.name}
          </span>
          {levelText && (
            <span className={`font-jakarta ${subClass} text-indigo-800/85 font-bold truncate mt-0.5`}>
              {levelText}
            </span>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-1.5 shrink-0 pl-2">
        <AnimatedScore
          value={team.focusScore}
          className={`font-outfit ${scoreClass} text-indigo-950 tabular-nums drop-shadow-sm`}
        />
        <span className={`font-outfit ${ptsClass} text-indigo-800/80 tracking-wider uppercase`}>
          PTS
        </span>
      </div>
    </motion.article>
  );
});

const RankList = memo(function RankList({
  teams,
  levels,
  disableAnimation = false,
}: RankListProps) {
  // Only display active teams after the top 3 podium teams (all teams from index 3 onward)
  const listTeams = useMemo(() => {
    const active = teams.filter((t) => !t.out);
    return active.slice(3);
  }, [teams]);

  // Split into 2 columns evenly
  const { leftCol, rightCol } = useMemo(() => {
    if (listTeams.length === 0) return { leftCol: [], rightCol: [] };
    const mid = Math.ceil(listTeams.length / 2);
    return {
      leftCol: listTeams.slice(0, mid),
      rightCol: listTeams.slice(mid),
    };
  }, [listTeams]);

  // Dynamic row sizing & typography scale based on row count to properly fill the stage
  const maxRows = Math.max(leftCol.length, rightCol.length, 1);

  const { rowHeight, gap, avatarSize, nameClass, scoreClass, ptsClass, rankClass, subClass } = useMemo(() => {
    if (maxRows <= 4) {
      return {
        rowHeight: 74,
        gap: 16,
        avatarSize: 50,
        nameClass: 'text-xl md:text-[22px] font-black',
        scoreClass: 'text-3xl md:text-4xl font-black',
        ptsClass: 'text-xs md:text-sm font-black',
        rankClass: 'w-10 text-lg md:text-xl font-black',
        subClass: 'text-xs md:text-sm font-semibold',
      };
    }
    if (maxRows <= 6) {
      return {
        rowHeight: 58,
        gap: 10,
        avatarSize: 42,
        nameClass: 'text-lg font-extrabold',
        scoreClass: 'text-2xl font-black',
        ptsClass: 'text-[11px] font-bold',
        rankClass: 'w-9 text-base font-black',
        subClass: 'text-xs font-semibold',
      };
    }
    if (maxRows <= 8) {
      return {
        rowHeight: 44,
        gap: 6,
        avatarSize: 32,
        nameClass: 'text-sm font-extrabold',
        scoreClass: 'text-xl font-black',
        ptsClass: 'text-[10px] font-bold',
        rankClass: 'w-8 text-sm font-black',
        subClass: 'text-[10px] font-medium',
      };
    }
    return {
      rowHeight: 36,
      gap: 4,
      avatarSize: 26,
      nameClass: 'text-xs font-bold',
      scoreClass: 'text-base font-black',
      ptsClass: 'text-[9px] font-bold',
      rankClass: 'w-7 text-xs font-black',
      subClass: 'text-[9px] font-medium',
    };
  }, [maxRows]);

  return (
    <div
      data-testid="rank-list-container"
      className="w-full flex-1 flex flex-col justify-between overflow-hidden min-h-0"
    >
      {/* Standings Header Strip */}
      <div className="flex items-center justify-between px-4 pb-2.5 text-white shrink-0">
        <div className="flex items-center gap-2.5">
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
          <span className="font-outfit text-base text-white font-extrabold uppercase tracking-wider drop-shadow-sm">
            TEAM STANDINGS
          </span>
        </div>
        <div className="flex items-center gap-4 text-white/90 font-outfit text-xs uppercase tracking-widest font-bold">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white/70" />
            Contenders
          </span>
          <span className="font-bold tracking-widest text-white/90">TOTAL PTS</span>
        </div>
      </div>

      {/* 2-Column Grid of Stadium Cards */}
      {listTeams.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-[120px] text-center">
          <p className="font-outfit text-white/50 text-sm font-semibold tracking-wider uppercase">
            All active groups are currently on the championship podium
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-8 w-full flex-1 items-start min-h-0 overflow-hidden">
          {/* Left Column */}
          <div className="flex flex-col min-w-0" style={{ gap: `${gap}px` }}>
            {leftCol.map((team) => (
              <StadiumCard
                key={team.id}
                team={team}
                levels={levels}
                disableAnimation={disableAnimation}
                rowHeight={rowHeight}
                avatarSize={avatarSize}
                nameClass={nameClass}
                scoreClass={scoreClass}
                ptsClass={ptsClass}
                rankClass={rankClass}
                subClass={subClass}
              />
            ))}
          </div>

          {/* Right Column */}
          <div className="flex flex-col min-w-0" style={{ gap: `${gap}px` }}>
            {rightCol.map((team) => (
              <StadiumCard
                key={team.id}
                team={team}
                levels={levels}
                disableAnimation={disableAnimation}
                rowHeight={rowHeight}
                avatarSize={avatarSize}
                nameClass={nameClass}
                scoreClass={scoreClass}
                ptsClass={ptsClass}
                rankClass={rankClass}
                subClass={subClass}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default RankList;
