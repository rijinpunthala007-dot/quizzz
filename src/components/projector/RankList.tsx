import { memo, useMemo } from 'react';
import type { RankedTeam, Level, Team } from '../../types';
import Avatar from './Avatar';
import AnimatedScore from './AnimatedScore';
import { getRankMovement, formatScore } from '../../utils';
import { useFitText } from '../celebrate/useFitText';

interface RankListProps {
  teams: RankedTeam[];
  levels: Level[];
  allTeams: Team[];
  rowHeight: number;
  numCols: number;
}

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
// Single List Row Component
// ---------------------------------------------------------------------------
interface StadiumRowProps {
  team: RankedTeam;
  rowHeight: number;
  allZero: boolean;
  hideLevelLine: boolean;
  levelText: string;
  nameMaxFontSize: number;
  nameMinFontSize: number;
}

const StadiumRow = memo(function StadiumRow({
  team,
  rowHeight,
  allZero,
  hideLevelLine,
  levelText,
  nameMaxFontSize,
  nameMinFontSize,
}: StadiumRowProps) {
  const movement = getRankMovement(team.rank, team.previousRank);

  // Format badge text: ties as "T-11", all-zero as "—"
  const badgeText = allZero
    ? '—'
    : team.isTied || (team.displayRank && team.displayRank.startsWith('T'))
    ? (team.displayRank && team.displayRank.startsWith('T') ? team.displayRank : `T-${team.rank}`)
    : `${team.rank}`;

  // Name fitting: 36px (or 24px in 3-col) down to 26px (or 20px), max 2 lines, no word broken
  const { containerRef: nameContainerRef, textRef: nameTextRef, style: nameStyle } = useFitText<HTMLHeadingElement>(team.name, {
    maxFontSize: nameMaxFontSize,
    minFontSize: nameMinFontSize,
    maxLines: 2,
    lineHeight: 1.05,
    fontFamily: "'Outfit', sans-serif",
  });

  return (
    <article
      data-testid={`rank-row-${team.rank}`}
      style={{
        height: `${rowHeight}px`,
        padding: '8px 16px',
      }}
      className="bg-[#dcd7fb]/95 hover:bg-[#e7e3fd] transition-colors rounded-full flex items-center justify-between shadow-md border border-white/70 shrink-0 w-full overflow-hidden select-none"
    >
      {/* 1. Left: Rank + Avatar + Name Zone & Level Breakdown */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-3">
        {/* Rank display (30px, weight 700, dark text; ties as "T-11", all-zero as "—") */}
        <div
          data-testid={`rank-badge-${team.rank}`}
          className="w-[72px] shrink-0 font-outfit text-[30px] font-bold text-indigo-950 tracking-tight leading-none text-center flex items-center justify-center"
        >
          <span>{badgeText}</span>
          {movement && movement.isPositive && (
            <span className="text-emerald-700 ml-1 text-sm font-bold" title={`Moved up ${movement.diff}`}>
              ▲
            </span>
          )}
          {movement && !movement.isPositive && (
            <span className="text-rose-600 ml-1 text-sm font-bold" title={`Moved down ${movement.diff}`}>
              ▼
            </span>
          )}
        </div>

        {/* Monogram Avatar (54px circle with 20px initials) */}
        <Avatar name={team.name} id={team.id} size={54} fontSize={20} />

        {/* Name Zone & Level Breakdown */}
        <div className="flex flex-col min-w-0 flex-1 justify-center leading-tight">
          <div
            ref={nameContainerRef}
            data-testid={`row-name-zone-${team.rank}`}
            className="w-full overflow-hidden flex items-center"
          >
            <h3
              ref={nameTextRef}
              data-testid={`row-name-text-${team.rank}`}
              className="font-outfit font-bold text-indigo-950 tracking-wide leading-[1.05]"
              style={{
                fontSize: `${nameStyle.fontSize}px`,
                letterSpacing: nameStyle.letterSpacing,
                lineHeight: 1.05,
                wordBreak: 'keep-all',
                overflowWrap: 'normal',
                whiteSpace: 'normal',
                hyphens: 'none',
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
            </h3>
          </div>

          {/* Level line (22px, only played levels, unambiguous format: L1: 6 · L2: 0 ...) */}
          {!hideLevelLine && levelText && (
            <span
              data-testid={`row-levels-${team.rank}`}
              className="font-jakarta text-[22px] font-semibold text-indigo-900/85 truncate leading-tight mt-0.5"
            >
              {levelText}
            </span>
          )}
        </div>
      </div>

      {/* 2. Right: Score (46px, weight 800) + PTS (20px) */}
      <div data-testid={`row-score-zone-${team.rank}`} className="flex items-baseline gap-1.5 shrink-0 pl-2">
        <AnimatedScore
          value={team.focusScore}
          className="font-outfit text-[46px] font-extrabold text-indigo-950 tabular-nums drop-shadow-sm leading-none"
        />
        <span className="font-outfit text-[20px] font-bold text-indigo-800/80 tracking-wider uppercase leading-none">
          PTS
        </span>
      </div>
    </article>
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
}: RankListProps) {
  // Only display active teams after top 3 podium teams (ranks 4+)
  const listTeams = useMemo(() => {
    const active = teams.filter((t) => !t.out);
    return active.slice(3);
  }, [teams]);

  // Are all active groups at 0 points?
  const allZero = useMemo(() => {
    return teams.filter((t) => !t.out).every((t) => (t.focusScore || 0) === 0);
  }, [teams]);

  // Played levels: at least one group has a non-zero score in that level, at most last 4
  const playedLevels = useMemo(() => {
    return levels
      .filter((lvl) => allTeams.some((t) => (t.scores[lvl.id] ?? 0) !== 0))
      .slice(-4);
  }, [levels, allTeams]);

  // If 3 columns (15 to 21 groups): names shrink to 24px and level line is hidden
  const hideLevelLine = numCols >= 3;
  const nameMaxFontSize = numCols >= 3 ? 24 : 36;
  const nameMinFontSize = numCols >= 3 ? 20 : 26;

  // Split list teams into columns, filled DOWN first (exactly 7 rows per column)
  const columns = useMemo(() => {
    const cols: RankedTeam[][] = [];
    for (let c = 0; c < numCols; c++) {
      cols.push(listTeams.slice(c * 7, (c + 1) * 7));
    }
    return cols;
  }, [listTeams, numCols]);

  return (
    <div
      data-testid="rank-list-container"
      className="w-full h-full flex flex-col justify-start overflow-hidden min-h-0"
    >
      {/* 1. Slim Header Strip (30px): "TEAM STANDINGS" 22px left, "TOTAL PTS" 22px right */}
      <div className="w-full h-[30px] flex items-center justify-between px-3 text-white shrink-0">
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
          <span className="font-outfit text-[22px] text-white font-extrabold uppercase tracking-wider leading-none">
            TEAM STANDINGS
          </span>
        </div>
        <div className="text-white/90 font-outfit text-[22px] uppercase tracking-wider font-extrabold leading-none">
          TOTAL PTS
        </div>
      </div>

      {/* 2. Columns of Stadium Pill Rows sharing width equally with 16px gutter */}
      {listTeams.length === 0 ? (
        <div className="w-full flex-1 flex items-center justify-center text-center">
          <p className="font-outfit text-white/70 text-base font-bold tracking-wider uppercase">
            All active groups are currently on the championship podium
          </p>
        </div>
      ) : (
        <div
          className="w-full flex-1 flex items-start gap-x-4 pt-[6px] overflow-hidden min-h-0"
        >
          {columns.map((colTeams, colIdx) => (
            <div
              key={colIdx}
              data-testid={`rank-list-col-${colIdx}`}
              className="flex-1 flex flex-col gap-[6px] min-w-0 h-full"
            >
              {colTeams.map((team) => {
                const levelText = formatPlayedLevelScores(playedLevels, team);
                return (
                  <StadiumRow
                    key={team.id}
                    team={team}
                    rowHeight={rowHeight}
                    allZero={allZero}
                    hideLevelLine={hideLevelLine}
                    levelText={levelText}
                    nameMaxFontSize={nameMaxFontSize}
                    nameMinFontSize={nameMinFontSize}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default RankList;
