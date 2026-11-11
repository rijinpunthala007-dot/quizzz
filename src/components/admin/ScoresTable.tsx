import { memo, useState, useEffect, useRef } from 'react';
import type { Level, Team, RankedTeam } from '../../types';
import { formatScore } from '../../utils';
import Avatar from '../projector/Avatar';
import styles from './ScoresTable.module.css';

export interface DisplayedTeam extends Team {
  originalIndex: number;
  total: number;
  rankInfo?: RankedTeam;
}

interface ScoresTableProps {
  levels: Level[];
  displayedTeams: DisplayedTeam[];
  selectedTeamIds: Set<string>;
  isCompact: boolean;
  onToggleSelectTeam: (teamId: string) => void;
  onSelectAllTeams: (checked: boolean) => void;
  onRenameGroup: (teamId: string, name: string) => void;
  onScoreChange: (teamId: string, levelId: string, val: string) => void;
  onScoreKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, teamIndex: number, levelIndex: number) => void;
  onToggleOut: (teamId: string) => void;
  onToggleMarked: (teamId: string) => void;
  onDeleteGroup: (teamId: string) => void;
}

// -----------------------------------------------------------------------------
// ScoreInputCell: Local typing state for zero lag & memoization
// -----------------------------------------------------------------------------
interface ScoreInputCellProps {
  score: number | undefined;
  teamId: string;
  levelId: string;
  teamIndex: number;
  levelIndex: number;
  isCompact: boolean;
  onChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const ScoreInputCell = memo(function ScoreInputCell({
  score,
  teamId,
  levelId,
  teamIndex,
  levelIndex,
  isCompact,
  onChange,
  onKeyDown,
}: ScoreInputCellProps) {
  const [text, setText] = useState<string>(score !== undefined ? String(score) : '');
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!isTypingRef.current) {
      setText(score !== undefined ? String(score) : '');
    }
  }, [score]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || /^-?\d*\.?\d*$/.test(raw)) {
      isTypingRef.current = true;
      setText(raw);
      onChange(raw);
    }
  };

  const handleBlur = () => {
    isTypingRef.current = false;
    if (text.endsWith('.')) {
      const trimmed = text.slice(0, -1);
      setText(trimmed);
      onChange(trimmed);
    } else {
      setText(score !== undefined ? String(score) : '');
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      data-coord={`${teamIndex}-${levelIndex}`}
      data-team-id={teamId}
      data-level-id={levelId}
      value={text}
      onFocus={(e) => {
        isTypingRef.current = true;
        e.target.select();
      }}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          isTypingRef.current = false;
        }
        onKeyDown(e);
      }}
      onChange={handleChange}
      style={{ width: '84px', maxWidth: '84px' }}
      className={`admin-input mx-auto block text-center font-mono font-bold tabular-nums ${
        isCompact ? 'py-0.5 text-xs' : 'py-1 text-sm'
      }`}
      placeholder="0"
    />
  );
});

// -----------------------------------------------------------------------------
// ScoresTableRow: Memoized row component
// -----------------------------------------------------------------------------
interface ScoresTableRowProps {
  team: DisplayedTeam;
  teamIndex: number;
  levels: Level[];
  isSelected: boolean;
  isCompact: boolean;
  onToggleSelect: () => void;
  onRename: (val: string) => void;
  onScoreChange: (levelId: string, val: string) => void;
  onScoreKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, levelIndex: number) => void;
  onToggleOut: () => void;
  onToggleMarked: () => void;
  onDelete: () => void;
}

const ScoresTableRow = memo(function ScoresTableRow({
  team,
  teamIndex,
  levels,
  isSelected,
  isCompact,
  onToggleSelect,
  onRename,
  onScoreChange,
  onScoreKeyDown,
  onToggleOut,
  onToggleMarked,
  onDelete,
}: ScoresTableRowProps) {
  const isOut = Boolean(team.out);
  const isMarked = Boolean(team.marked);
  const rankInfo = team.rankInfo;
  const rank = rankInfo?.rank;

  // Determine row CSS class and solid background color for sticky cells
  let rowClass = teamIndex % 2 === 1 ? styles.sc2RowAlt : styles.sc2Row;
  if (isOut) {
    rowClass = styles.sc2RowOut;
  } else if (isMarked) {
    rowClass = styles.sc2RowMarked;
  }

  return (
    <tr className={rowClass}>
      {/* 1. Selection Checkbox (Sticky Left #1) */}
      <td className={`${styles.sc2TdSticky} ${styles.sc2TdSelect} ${isCompact ? 'py-1' : 'py-2'}`}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-3.5 h-3.5 accent-[#f2c94c] cursor-pointer rounded"
          title="Select group"
        />
      </td>

      {/* 2. Rank Badge (Sticky Left #2) */}
      <td className={`${styles.sc2TdSticky} ${styles.sc2TdRank} ${isCompact ? 'py-1' : 'py-2'}`}>
        {isOut ? (
          <span className="text-[10px] font-bold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/40">
            OUT
          </span>
        ) : rank === 1 ? (
          <span className="text-xs font-bold text-[#f2c94c] bg-[#f2c94c]/20 px-2 py-0.5 rounded-full border border-[#f2c94c]/50">
            #1
          </span>
        ) : rank === 2 ? (
          <span className="text-xs font-bold text-[#8fb8e8] bg-[#8fb8e8]/20 px-2 py-0.5 rounded-full border border-[#8fb8e8]/50">
            #2
          </span>
        ) : rank === 3 ? (
          <span className="text-xs font-bold text-[#6fbf8e] bg-[#6fbf8e]/20 px-2 py-0.5 rounded-full border border-[#6fbf8e]/50">
            #3
          </span>
        ) : (
          <span className="text-xs text-[#9aa7bd] bg-white/5 px-1.5 py-0.5 rounded font-medium">
            #{rankInfo?.displayRank || teamIndex + 1}
          </span>
        )}
      </td>

      {/* 3. Group Avatar + Name (Sticky Left #3) */}
      <td
        className={`${styles.sc2TdSticky} ${styles.sc2TdGroup} ${isCompact ? 'py-1' : 'py-2'}`}
        data-group-team-id={team.id}
      >
        <div className="flex items-center gap-2">
          <Avatar
            name={team.name}
            id={team.id}
            size={isCompact ? 24 : 28}
            ringColor={
              rank === 1 ? '#f2c94c' : rank === 2 ? '#8fb8e8' : rank === 3 ? '#6fbf8e' : undefined
            }
          />
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={team.name}
              onChange={(e) => onRename(e.target.value)}
              className={`admin-input w-full font-semibold ${
                isCompact ? 'py-0.5 text-xs' : 'py-1 text-sm'
              }`}
              placeholder="Group name"
            />
            {isOut && (
              <span className="text-[10px] text-red-300 block mt-0.5 italic truncate">
                Eliminated ({team.out})
              </span>
            )}
            {!isOut && isMarked && (
              <span className="text-[10px] text-rose-400 block mt-0.5 italic font-medium truncate">
                Marked red ({team.marked})
              </span>
            )}
          </div>
        </div>
      </td>

      {/* 4. Level Score Inputs */}
      {levels.map((lvl, levelIndex) => (
        <td key={lvl.id} className={`${styles.sc2Td} ${styles.sc2TdLevel} ${isCompact ? 'py-1' : 'py-2'}`}>
          <ScoreInputCell
            score={team.scores[lvl.id]}
            teamId={team.id}
            levelId={lvl.id}
            teamIndex={teamIndex}
            levelIndex={levelIndex}
            isCompact={isCompact}
            onChange={(val) => onScoreChange(lvl.id, val)}
            onKeyDown={(e) => onScoreKeyDown(e, levelIndex)}
          />
        </td>
      ))}

      {/* 5. Total Score (Sticky Right #4) */}
      <td
        data-col="total"
        className={`${styles.sc2TdSticky} ${styles.sc2TdTotal} ${isCompact ? 'py-1 text-sm' : 'py-2 text-base'}`}
      >
        {formatScore(team.total)}
      </td>

      {/* 6. Out Checkbox (Sticky Right #3) */}
      <td className={`${styles.sc2TdSticky} ${styles.sc2TdOut} ${isCompact ? 'py-1' : 'py-2'}`}>
        <input
          type="checkbox"
          checked={isOut}
          onChange={onToggleOut}
          className="w-4 h-4 accent-[#f2c94c] cursor-pointer rounded"
          title={isOut ? 'Mark as active' : 'Mark as eliminated'}
        />
      </td>

      {/* 7. Red Checkbox (Sticky Right #2) */}
      <td className={`${styles.sc2TdSticky} ${styles.sc2TdRed} ${isCompact ? 'py-1' : 'py-2'}`}>
        <input
          type="checkbox"
          checked={isMarked}
          onChange={onToggleMarked}
          className="w-4 h-4 accent-rose-500 cursor-pointer rounded"
          title={team.marked ? `Marked red (${team.marked}). Click to unmark.` : 'Mark red (stays on board)'}
        />
      </td>

      {/* 8. Delete Button (Sticky Right #1) */}
      <td className={`${styles.sc2TdSticky} ${styles.sc2TdDel} ${isCompact ? 'py-1' : 'py-2'}`}>
        <button
          type="button"
          onClick={onDelete}
          className="text-red-400/60 hover:text-red-400 text-sm p-1 rounded transition-colors cursor-pointer"
          title="Delete group"
        >
          ✕
        </button>
      </td>
    </tr>
  );
});

// -----------------------------------------------------------------------------
// ScoresTable Component
// -----------------------------------------------------------------------------
export default function ScoresTable({
  levels,
  displayedTeams,
  selectedTeamIds,
  isCompact,
  onToggleSelectTeam,
  onSelectAllTeams,
  onRenameGroup,
  onScoreChange,
  onScoreKeyDown,
  onToggleOut,
  onToggleMarked,
  onDeleteGroup,
}: ScoresTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [maxH, setMaxH] = useState<number>(600);

  // Dynamic max-height calculation:
  // max-height = viewport height − admin header height − Quick Add bar − 24px (minimum 360px)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHeight = () => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const avail = window.innerHeight - rect.top - 24;
      setMaxH(Math.max(360, Math.floor(avail)));
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Edge Shadows throttled with requestAnimationFrame
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const checkScrollEdges = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const hasLeft = el.scrollLeft > 2;
        const hasRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 2;
        el.classList.toggle('sc2-has-scroll-left', hasLeft);
        el.classList.toggle('sc2-has-scroll-right', hasRight);
      });
    };

    checkScrollEdges();
    el.addEventListener('scroll', checkScrollEdges, { passive: true });
    window.addEventListener('resize', checkScrollEdges);
    return () => {
      el.removeEventListener('scroll', checkScrollEdges);
      window.removeEventListener('resize', checkScrollEdges);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [levels, displayedTeams]);

  // Active Cell Highlight via focusin / focusout
  useEffect(() => {
    const tableEl = tableRef.current;
    if (!tableEl) return;

    let activeTh: HTMLElement | null = null;
    let activeGroupTd: HTMLElement | null = null;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !target.matches('input[data-coord]')) return;
      const levelId = target.getAttribute('data-level-id');
      const teamId = target.getAttribute('data-team-id');

      if (levelId) {
        const th = tableEl.querySelector(`th[data-level-id="${levelId}"]`) as HTMLElement | null;
        if (th) {
          th.classList.add('sc2-header-active');
          activeTh = th;
        }
      }
      if (teamId) {
        const td = tableEl.querySelector(`td[data-group-team-id="${teamId}"]`) as HTMLElement | null;
        if (td) {
          td.classList.add('sc2-group-active');
          activeGroupTd = td;
        }
      }
    };

    const handleFocusOut = () => {
      if (activeTh) {
        activeTh.classList.remove('sc2-header-active');
        activeTh = null;
      }
      if (activeGroupTd) {
        activeGroupTd.classList.remove('sc2-group-active');
        activeGroupTd = null;
      }
    };

    tableEl.addEventListener('focusin', handleFocusIn);
    tableEl.addEventListener('focusout', handleFocusOut);
    return () => {
      tableEl.removeEventListener('focusin', handleFocusIn);
      tableEl.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Jump to level scrolling
  const handleJumpToLevel = (levelId: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const targetTh = container.querySelector(`th[data-level-id="${levelId}"]`) as HTMLElement | null;
    if (!targetTh) return;

    const vpW = window.innerWidth;
    const pinnedLeftW = vpW >= 1100 ? 356 : (vpW >= 640 ? 240 : 150);
    const targetLeft = targetTh.offsetLeft - pinnedLeftW;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: prefersReduced ? 'instant' : 'smooth',
    });
  };

  const handleJumpToTotal = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const targetTh = container.querySelector(`th[data-col="total"]`) as HTMLElement | null;
    if (!targetTh) return;

    const vpW = window.innerWidth;
    const pinnedLeftW = vpW >= 1100 ? 356 : (vpW >= 640 ? 240 : 150);
    const targetLeft = targetTh.offsetLeft - pinnedLeftW;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: prefersReduced ? 'instant' : 'smooth',
    });
  };

  const allSelected = displayedTeams.length > 0 && displayedTeams.every((t) => selectedTeamIds.has(t.id));

  return (
    <div className={styles.sc2Container}>
      {/* 10. JUMP TO LEVEL ROW (when levels > 6) */}
      {levels.length > 6 && (
        <div className={styles.sc2JumpBar}>
          <span className={styles.sc2JumpLabel}>Jump to level:</span>
          {levels.map((lvl, idx) => (
            <button
              key={lvl.id}
              type="button"
              data-testid={`admin-jump-chip-${lvl.id}`}
              onClick={() => handleJumpToLevel(lvl.id)}
              title={lvl.name}
              className={styles.sc2JumpChip}
            >
              {idx + 1}
            </button>
          ))}
          <button
            type="button"
            data-testid="admin-jump-chip-total"
            onClick={handleJumpToTotal}
            title="Jump to Total"
            className={styles.sc2JumpChipTotal}
          >
            Total
          </button>
        </div>
      )}

      {/* 1. SCROLL CONTAINER */}
      <div
        ref={scrollContainerRef}
        data-testid="admin-scores-scroll-container"
        className={styles.sc2ScrollContainer}
        style={{ maxHeight: `${maxH}px` }}
      >
        <table ref={tableRef} className={styles.sc2Table}>
          {/* 4. STICKY HEADER ROW */}
          <thead className={styles.sc2Thead}>
            <tr>
              {/* Sticky Left Corner 1: Checkbox */}
              <th className={`${styles.sc2ThCorner} ${styles.sc2ThSelect}`}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAllTeams(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#f2c94c] cursor-pointer rounded"
                  title="Select all displayed groups"
                />
              </th>

              {/* Sticky Left Corner 2: Rank */}
              <th className={`${styles.sc2ThCorner} ${styles.sc2ThRank}`}>
                #
              </th>

              {/* Sticky Left Corner 3: Group Name */}
              <th className={`${styles.sc2ThCorner} ${styles.sc2ThGroup}`}>
                Group Name ({displayedTeams.length})
              </th>

              {/* 9. LEVEL HEADERS (wrap to two lines, no ellipsis, min 96px) */}
              {levels.map((lvl) => (
                <th
                  key={lvl.id}
                  data-level-id={lvl.id}
                  className={`${styles.sc2Th} ${styles.sc2ThLevel}`}
                  title={lvl.name}
                >
                  <div className={styles.sc2LevelName}>
                    {lvl.name}
                  </div>
                </th>
              ))}

              {/* Sticky Right Corner 4: Total */}
              <th data-col="total" className={`${styles.sc2ThCorner} ${styles.sc2ThTotal}`}>
                Total
              </th>

              {/* Sticky Right Corner 3: Out */}
              <th className={`${styles.sc2ThCorner} ${styles.sc2ThOut}`} title="Mark eliminated">
                Out
              </th>

              {/* Sticky Right Corner 2: Red */}
              <th className={`${styles.sc2ThCorner} ${styles.sc2ThRed}`} title="Mark red (stays on board)">
                Red
              </th>

              {/* Sticky Right Corner 1: Del */}
              <th className={`${styles.sc2ThCorner} ${styles.sc2ThDel}`} title="Delete group">
                Del
              </th>
            </tr>
          </thead>

          <tbody>
            {displayedTeams.map((team, teamIndex) => (
              <ScoresTableRow
                key={team.id}
                team={team}
                teamIndex={teamIndex}
                levels={levels}
                isSelected={selectedTeamIds.has(team.id)}
                isCompact={isCompact}
                onToggleSelect={() => onToggleSelectTeam(team.id)}
                onRename={(val) => onRenameGroup(team.id, val)}
                onScoreChange={(levelId, val) => onScoreChange(team.id, levelId, val)}
                onScoreKeyDown={(e, levelIndex) => onScoreKeyDown(e, teamIndex, levelIndex)}
                onToggleOut={() => onToggleOut(team.id)}
                onToggleMarked={() => onToggleMarked(team.id)}
                onDelete={() => onDeleteGroup(team.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
