import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useQuizState } from '../../store';
import type { QuizState, RankedTeam, CelebrationWording } from '../../types';
import { DEFAULT_WORDING } from '../../types';
import { uid, getTeamTotal, rankTeams, createRevealSnapshot, formatScore } from '../../utils';
import Avatar from '../projector/Avatar';

export default function AdminView() {
  const { state, setState, setStateImmediate } = useQuizState();
  const [saved, setSaved] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Collapsible cards: all open by default so user can view and edit everything immediately
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    settings: true,
    wording: true,
    groups: true,
    levels: true,
    scores: true,
    actions: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const expandAll = () => {
    setOpenSections({
      settings: true,
      wording: true,
      groups: true,
      levels: true,
      scores: true,
      actions: true,
    });
  };

  const collapseAll = () => {
    setOpenSections({
      settings: false,
      wording: false,
      groups: false,
      levels: false,
      scores: false,
      actions: false,
    });
  };

  // Table controls
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'out'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'rank' | 'name'>('default');
  const [isCompact, setIsCompact] = useState(false);
  const [quickGroupName, setQuickGroupName] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    details?: string[];
    onConfirm: () => void;
  } | null>(null);

  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [eliminateModal, setEliminateModal] = useState<{
    levelId: string;
    levelName: string;
    count: number;
    mode: 'red' | 'out';
  } | null>(null);

  const showSavedIndicator = useCallback(() => {
    setSaved(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setSaved(false), 1600);
  }, []);

  const updateState = useCallback(
    (updater: (prev: QuizState) => QuizState) => {
      setState(updater);
      showSavedIndicator();
    },
    [setState, showSavedIndicator]
  );

  const updateStateImmediate = useCallback(
    (updater: (prev: QuizState) => QuizState) => {
      setStateImmediate(updater);
      showSavedIndicator();
    },
    [setStateImmediate, showSavedIndicator]
  );

  // --- Quiz Settings ---
  const handleTitleChange = (title: string) => {
    updateState((s) => ({ ...s, title }));
  };

  const handleFocusChange = (focus: string) => {
    updateStateImmediate((s) => ({ ...s, focus }));
  };

  const handleProjectorScaleChange = (projectorScale: 'large' | 'xl') => {
    updateStateImmediate((s) => ({ ...s, projectorScale }));
  };

  // --- Celebration Wording ---
  const wording: CelebrationWording = useMemo(
    () => ({
      ...DEFAULT_WORDING,
      ...(state.celebrationWording || {}),
      footerText: 'designed and developed by rj',
    }),
    [state.celebrationWording]
  );

  const handleWordingChange = (key: keyof CelebrationWording, val: string) => {
    if (key === 'footerText') return; // Locked: cannot be edited by admin
    const trimmed = val.slice(0, 28);
    updateStateImmediate((s) => ({
      ...s,
      celebrationWording: {
        ...DEFAULT_WORDING,
        ...(s.celebrationWording || {}),
        [key]: trimmed,
        footerText: 'designed and developed by rj',
      },
    }));
  };

  const handleResetWording = () => {
    updateStateImmediate((s) => ({
      ...s,
      celebrationWording: {
        ...DEFAULT_WORDING,
        footerText: 'designed and developed by rj',
      },
    }));
  };

  // --- Groups ---
  const [bulkText, setBulkText] = useState('');

  const handleBulkAddGroups = (text: string) => {
    const names = text
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    updateStateImmediate((s) => ({
      ...s,
      teams: [
        ...s.teams,
        ...names.map((name) => ({
          id: uid(),
          name,
          out: '' as const,
          scores: {} as Record<string, number>,
        })),
      ],
    }));
    setBulkText('');
  };

  const handleQuickAddGroup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = quickGroupName.trim();
    if (!name) return;
    updateStateImmediate((s) => ({
      ...s,
      teams: [
        ...s.teams,
        {
          id: uid(),
          name,
          out: '' as const,
          scores: {},
        },
      ],
    }));
    setQuickGroupName('');
  };

  const handleRenameGroup = (teamId: string, name: string) => {
    updateState((s) => ({
      ...s,
      teams: s.teams.map((t) => (t.id === teamId ? { ...t, name } : t)),
    }));
  };

  const handleDeleteGroup = (teamId: string) => {
    updateStateImmediate((s) => ({
      ...s,
      teams: s.teams.filter((t) => t.id !== teamId),
    }));
  };

  const latestLevelName = useMemo(() => {
    if (state.focus !== 'all') {
      const foc = state.levels.find((l) => l.id === state.focus);
      if (foc) return foc.name;
    }
    for (let i = state.levels.length - 1; i >= 0; i--) {
      const lvl = state.levels[i];
      const hasScores = state.teams.some((t) => t.scores[lvl.id] !== undefined && t.scores[lvl.id] !== 0);
      if (hasScores) return lvl.name;
    }
    return state.levels[state.levels.length - 1]?.name || 'Manual';
  }, [state.focus, state.levels, state.teams]);

  const handleToggleOut = (teamId: string) => {
    updateStateImmediate((s) => ({
      ...s,
      teams: s.teams.map((t) =>
        t.id === teamId ? { ...t, out: t.out ? '' : 'Manual' } : t
      ),
    }));
  };

  const handleToggleMarked = (teamId: string) => {
    updateStateImmediate((s) => ({
      ...s,
      teams: s.teams.map((t) =>
        t.id === teamId ? { ...t, marked: t.marked ? '' : latestLevelName } : t
      ),
    }));
  };

  // --- Levels ---
  const handleAddLevel = () => {
    const name = `Level ${state.levels.length + 1}`;
    updateStateImmediate((s) => ({
      ...s,
      levels: [...s.levels, { id: uid(), name }],
    }));
  };

  const handleRenameLevel = (levelId: string, name: string) => {
    updateState((s) => ({
      ...s,
      levels: s.levels.map((l) => (l.id === levelId ? { ...l, name } : l)),
    }));
  };

  const handleDeleteLevel = (levelId: string) => {
    updateStateImmediate((s) => ({
      ...s,
      levels: s.levels.filter((l) => l.id !== levelId),
      focus: s.focus === levelId ? 'all' : s.focus,
      teams: s.teams.map((t) => {
        const scores = { ...t.scores };
        delete scores[levelId];
        return { ...t, scores };
      }),
    }));
  };

  const handleEliminateLowest = (levelId: string) => {
    const level = state.levels.find((l) => l.id === levelId);
    if (!level) return;
    const savedMode = (typeof localStorage !== 'undefined' ? localStorage.getItem('quiz-eliminate-mode') : null) as 'red' | 'out' | null;
    setEliminateModal({
      levelId: level.id,
      levelName: level.name,
      count: 3,
      mode: savedMode === 'out' ? 'out' : 'red',
    });
  };

  // --- Scores (Supports Decimals, e.g. 10.5, 12.25) ---
  const handleScoreChange = (teamId: string, levelId: string, value: string) => {
    const trimmed = value.trim();
    // If empty string or incomplete decimal/minus, remove key so input displays blank with placeholder 0
    if (trimmed === '' || trimmed === '.' || trimmed === '-') {
      updateStateImmediate((s) => ({
        ...s,
        teams: s.teams.map((t) => {
          if (t.id !== teamId) return t;
          const scores = { ...t.scores };
          delete scores[levelId];
          return { ...t, scores };
        }),
      }));
      return;
    }
    const num = parseFloat(trimmed);
    if (isNaN(num)) return;
    const rounded = Math.round(num * 100) / 100;
    updateStateImmediate((s) => ({
      ...s,
      teams: s.teams.map((t) =>
        t.id === teamId ? { ...t, scores: { ...t.scores, [levelId]: rounded } } : t
      ),
    }));
  };

  // Move focus to next/prev group's input in the same level column
  const handleScoreKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    teamIndex: number,
    levelIndex: number
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector(
        `input[data-coord="${teamIndex + 1}-${levelIndex}"]`
      ) as HTMLInputElement | null;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.querySelector(
        `input[data-coord="${teamIndex - 1}-${levelIndex}"]`
      ) as HTMLInputElement | null;
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
  };

  // --- Bulk operations ---
  const handleBringBackAll = () => {
    setConfirmDialog({
      title: 'Bring back all eliminated groups?',
      message: 'All eliminated groups will be restored to active status.',
      onConfirm: () => {
        updateStateImmediate((s) => ({
          ...s,
          teams: s.teams.map((t) => ({ ...t, out: '' })),
        }));
        setConfirmDialog(null);
      },
    });
  };

  const handleResetAllScores = () => {
    setConfirmDialog({
      title: 'Reset all scores to 0?',
      message: 'All scores for all groups will be cleared. This cannot be undone.',
      onConfirm: () => {
        updateStateImmediate((s) => ({
          ...s,
          teams: s.teams.map((t) => ({ ...t, scores: {} })),
        }));
        setConfirmDialog(null);
      },
    });
  };

  const handleClearAllGroups = () => {
    setConfirmDialog({
      title: 'Delete all groups?',
      message: 'This will remove all groups from the quiz. Levels will remain intact.',
      onConfirm: () => {
        updateStateImmediate((s) => ({ ...s, teams: [] }));
        setConfirmDialog(null);
      },
    });
  };

  // Calculate live ranks for all teams
  const rankedTeams = useMemo(() => {
    return rankTeams(state);
  }, [state]);

  const rankMap = useMemo(() => {
    const map = new Map<string, RankedTeam>();
    rankedTeams.forEach((rt) => map.set(rt.id, rt));
    return map;
  }, [rankedTeams]);

  // Filter and sort teams for the table
  const displayedTeams = useMemo(() => {
    let list = state.teams.map((t, originalIndex) => ({
      ...t,
      originalIndex,
      total: getTeamTotal(t, state.levels),
      rankInfo: rankMap.get(t.id),
    }));

    if (filterStatus === 'active') {
      list = list.filter((t) => !t.out);
    } else if (filterStatus === 'out') {
      list = list.filter((t) => Boolean(t.out));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }

    if (sortBy === 'rank') {
      list.sort((a, b) => {
        if (a.out && !b.out) return 1;
        if (!a.out && b.out) return -1;
        return b.total - a.total;
      });
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [state.teams, state.levels, filterStatus, searchQuery, sortBy, rankMap]);

  const activeCount = useMemo(() => state.teams.filter((t) => !t.out).length, [state.teams]);
  const outCount = state.teams.length - activeCount;

  const winnerTeam = useMemo(() => {
    return rankedTeams.find((t) => !t.out);
  }, [rankedTeams]);

  return (
    <div className="h-full w-full overflow-y-auto admin-scroll bg-gradient-to-b from-[#0b1322] to-[#0f1a2e] text-[#f4ecd8] select-auto pb-16">
      {/* 1. STICKY TOP BAR */}
      <header className="sticky top-0 z-40 bg-[#0b1322]/95 backdrop-blur-md border-b border-[#243049] px-4 md:px-8 py-3 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[#f2c94c] text-xl font-bold">✝</span>
            <div>
              <h1
                className="text-lg md:text-xl font-bold tracking-wide leading-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Quiz Admin
              </h1>
              <span className="text-xs text-[#9aa7bd]">
                {state.teams.length} groups · {state.levels.length} levels
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Saved Indicator */}
            <div className="w-20 text-right">
              {saved && (
                <span className="text-green-400 text-xs md:text-sm font-semibold tracking-wide inline-flex items-center gap-1 animate-fade-in">
                  Saved ✓
                </span>
              )}
            </div>

            {/* Clear All Groups Button */}
            {state.teams.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllGroups}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                title="Remove all groups from the quiz"
              >
                Clear All Groups
              </button>
            )}

            {/* Sound Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#9aa7bd] hover:text-[#f4ecd8] select-none mr-1 font-medium">
              <input
                type="checkbox"
                checked={Boolean(state.soundEnabled)}
                onChange={() => {
                  updateStateImmediate((s) => ({
                    ...s,
                    soundEnabled: !s.soundEnabled,
                  }));
                }}
                className="w-3.5 h-3.5 accent-[#f2c94c] rounded cursor-pointer"
              />
              <span>Sound</span>
            </label>

            {/* Elimination Sound Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#9aa7bd] hover:text-[#f4ecd8] select-none mr-1 font-medium" title="Play a soft low thud when a group is marked red on the board">
              <input
                type="checkbox"
                checked={Boolean(state.eliminationSound)}
                onChange={() => {
                  updateStateImmediate((s) => ({
                    ...s,
                    eliminationSound: !s.eliminationSound,
                  }));
                }}
                className="w-3.5 h-3.5 accent-rose-500 rounded cursor-pointer"
              />
              <span>Elim Sound</span>
            </label>

            {/* Winners Page Action Buttons */}
            {!state.celebrateWinner ? (
              <button
                type="button"
                data-testid="admin-show-winners-btn"
                onClick={() => {
                  const snapshot = createRevealSnapshot(state);
                  updateStateImmediate((s) => ({
                    ...s,
                    celebrateWinner: true,
                    winnersSnapshot: snapshot,
                    celebrateTrigger: Date.now(),
                  }));
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-indigo-950 border border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                title="Open the full-screen Winners Celebration ceremony on the projector"
              >
                <span>🏆 Show winners page</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  data-testid="admin-celebrate-again-btn"
                  onClick={() => {
                    updateStateImmediate((s) => ({
                      ...s,
                      celebrateTrigger: Date.now(),
                    }));
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs md:text-sm font-black transition-all shadow-md flex items-center gap-1 cursor-pointer bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                  title="Fire cannons & fireworks again on the projector"
                >
                  <span>Celebrate again 🎉</span>
                </button>
                <button
                  type="button"
                  data-testid="admin-back-leaderboard-btn"
                  onClick={() => {
                    updateStateImmediate((s) => ({
                      ...s,
                      celebrateWinner: false,
                    }));
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                  title="Return to the standard leaderboard"
                >
                  <span>← Back to leaderboard</span>
                </button>
              </>
            )}

            {/* Link to Projector */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#f2c94c]/15 hover:bg-[#f2c94c]/25 text-[#f2c94c] border border-[#f2c94c]/40 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all shadow-sm flex items-center gap-1"
            >
              Open projector view ↗
            </a>
          </div>
        </div>
      </header>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-[#111b2e] border border-[#243049] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3
              className="text-lg font-bold text-[#f4ecd8] mb-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {confirmDialog.title}
            </h3>
            <p className="text-[#9aa7bd] text-sm mb-3">{confirmDialog.message}</p>
            {confirmDialog.details && (
              <ul className="text-[#9aa7bd] text-sm mb-4 max-h-48 overflow-y-auto space-y-1.5 bg-black/20 p-2.5 rounded-lg border border-white/5">
                {confirmDialog.details.map((d, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-red-400 font-bold">•</span> {d}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-sm text-[#9aa7bd] hover:text-[#f4ecd8] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-5 py-2 text-sm bg-[#f2c94c] text-[#0b1322] font-bold rounded-lg hover:bg-[#f4d58d] transition-all shadow-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elimination Modal with Mode Selector and Cut-line Warning */}
      {eliminateModal && (() => {
        const activeTeams = state.teams
          .filter((t) => !t.out)
          .map((t) => ({ ...t, total: getTeamTotal(t, state.levels) }))
          .sort((a, b) => a.total - b.total);

        const clampedCount = Math.max(1, Math.min(eliminateModal.count, activeTeams.length || 1));
        const toEliminate = activeTeams.slice(0, clampedCount);
        const cutIndex = clampedCount;
        const isCutTie =
          activeTeams.length > cutIndex &&
          toEliminate.length > 0 &&
          toEliminate[toEliminate.length - 1].total === activeTeams[cutIndex].total;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="bg-[#111b2e] border border-[#243049] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <div>
                <h3
                  className="text-lg font-bold text-[#f4ecd8]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Eliminate Lowest Groups after {eliminateModal.levelName}
                </h3>
                <p className="text-xs text-[#9aa7bd] mt-1">
                  Choose whether to mark groups red on the board or remove them completely.
                </p>
              </div>

              {/* Mode selector */}
              <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#9aa7bd] block mb-1">
                  Elimination Mode
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="eliminate-mode"
                    value="red"
                    checked={eliminateModal.mode === 'red'}
                    onChange={() => {
                      setEliminateModal({ ...eliminateModal, mode: 'red' });
                      try { localStorage.setItem('quiz-eliminate-mode', 'red'); } catch {}
                    }}
                    className="mt-0.5 accent-rose-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-semibold text-rose-300 block">Mark red (stays on the board)</span>
                    <span className="text-xs text-[#9aa7bd]">Row turns red with an OUT tag, keeping its rank and position</span>
                  </div>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-white/5">
                  <input
                    type="radio"
                    name="eliminate-mode"
                    value="out"
                    checked={eliminateModal.mode === 'out'}
                    onChange={() => {
                      setEliminateModal({ ...eliminateModal, mode: 'out' });
                      try { localStorage.setItem('quiz-eliminate-mode', 'out'); } catch {}
                    }}
                    className="mt-0.5 accent-[#f2c94c] cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-semibold text-[#f4ecd8] block">Remove from board (current behaviour)</span>
                    <span className="text-xs text-[#9aa7bd]">Removes group from standings and lists in the footer</span>
                  </div>
                </label>
              </div>

              {/* Number N */}
              <div>
                <label className="text-xs font-semibold text-[#9aa7bd] uppercase tracking-wider block mb-1.5">
                  Number of lowest groups to eliminate (N)
                </label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, activeTeams.length)}
                  value={eliminateModal.count}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setEliminateModal({ ...eliminateModal, count: isNaN(val) ? 1 : val });
                  }}
                  className="admin-input w-32 text-sm font-mono font-bold"
                />
              </div>

              {/* Tie warning */}
              {isCutTie && (
                <div className="bg-amber-500/15 border border-amber-400/40 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2">
                  <span className="text-base leading-none">⚠️</span>
                  <div>
                    <strong className="font-bold block">Tie detected at cut line!</strong>
                    Multiple groups share the total score of {formatScore(toEliminate[toEliminate.length - 1].total)} pts. Both the group at rank #{clampedCount} and #{clampedCount + 1} have the same score.
                  </div>
                </div>
              )}

              {/* Groups preview */}
              <div>
                <label className="text-xs font-semibold text-[#9aa7bd] uppercase tracking-wider block mb-1">
                  Groups about to be {eliminateModal.mode === 'red' ? 'marked red' : 'eliminated'} ({toEliminate.length})
                </label>
                <ul className="text-[#9aa7bd] text-xs max-h-40 overflow-y-auto space-y-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
                  {toEliminate.map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-0.5 border-b border-white/[0.04] last:border-0">
                      <span className="font-medium text-white">{t.name}</span>
                      <span className="font-mono text-amber-300 font-bold">{formatScore(t.total)} pts</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEliminateModal(null)}
                  className="px-4 py-2 text-sm text-[#9aa7bd] hover:text-[#f4ecd8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ids = new Set(toEliminate.map((t) => t.id));
                    if (eliminateModal.mode === 'red') {
                      updateStateImmediate((s) => ({
                        ...s,
                        teams: s.teams.map((t) =>
                          ids.has(t.id) ? { ...t, marked: eliminateModal.levelName } : t
                        ),
                      }));
                    } else {
                      updateStateImmediate((s) => ({
                        ...s,
                        teams: s.teams.map((t) =>
                          ids.has(t.id) ? { ...t, out: eliminateModal.levelName } : t
                        ),
                      }));
                    }
                    setEliminateModal(null);
                  }}
                  className={`px-5 py-2 text-sm font-bold rounded-lg transition-all shadow-md ${
                    eliminateModal.mode === 'red'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-[#f2c94c] hover:bg-[#f4d58d] text-[#0b1322]'
                  }`}
                >
                  {eliminateModal.mode === 'red' ? 'Mark Red' : 'Eliminate'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 pt-5 space-y-5">
        {/* Quick View Controls Bar */}
        <div className="flex items-center justify-between text-xs text-[#9aa7bd] px-1">
          <span>Manage quiz configuration and live scores</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="hover:text-[#f2c94c] underline cursor-pointer"
            >
              Expand All
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={collapseAll}
              className="hover:text-[#f2c94c] underline cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* SECTION 1: SCORES TABLE (Priority #1: Top view) */}
        <CollapsibleSection
          title="Scores & Group Standings"
          isOpen={openSections.scores}
          onToggle={() => toggleSection('scores')}
          badge={`${state.teams.length} groups · ${state.levels.length} levels`}
        >
          {state.teams.length === 0 || state.levels.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-ivory font-semibold text-base">
                No groups added yet
              </p>
              <p className="text-ivory/60 text-xs">
                Add your church groups in Section 2 (Add Groups) below to start recording scores.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {/* Grand Finale Winner Celebration Banner */}
              <div
                className={`rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 border transition-all ${
                  state.celebrateWinner
                    ? 'bg-gradient-to-r from-amber-500/25 via-purple-700/30 to-amber-500/25 border-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.35)]'
                    : 'bg-[#151c30] border-amber-400/30 shadow-md'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-3xl">🏆</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-outfit font-black text-amber-300 text-sm md:text-base uppercase tracking-wider">
                        Winners Celebration Page
                      </span>
                      {winnerTeam && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400 text-indigo-950 font-black text-xs">
                          Leader: {winnerTeam.name} ({formatScore(winnerTeam.total)} pts)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#9aa7bd] mt-0.5">
                      {state.celebrateWinner
                        ? '🎉 Winners page is live on the projector! Cannons and ambient celebration are active.'
                        : 'Displays the full-screen 2nd | 1st | 3rd championship honours board with confetti cannons and ambient celebration on the projector.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Sound Toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#9aa7bd] hover:text-[#f4ecd8] select-none font-medium bg-black/30 px-3 py-2 rounded-xl border border-white/10">
                    <input
                      type="checkbox"
                      checked={Boolean(state.soundEnabled)}
                      onChange={() => {
                        updateStateImmediate((s) => ({
                          ...s,
                          soundEnabled: !s.soundEnabled,
                        }));
                      }}
                      className="w-4 h-4 accent-[#f2c94c] rounded cursor-pointer"
                    />
                    <span>Sound</span>
                  </label>

                  {/* Elimination Sound Toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#9aa7bd] hover:text-[#f4ecd8] select-none font-medium bg-black/30 px-3 py-2 rounded-xl border border-white/10" title="Play a soft low thud when a group is marked red on the board">
                    <input
                      type="checkbox"
                      checked={Boolean(state.eliminationSound)}
                      onChange={() => {
                        updateStateImmediate((s) => ({
                          ...s,
                          eliminationSound: !s.eliminationSound,
                        }));
                      }}
                      className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                    />
                    <span>Elim Sound</span>
                  </label>

                  {!state.celebrateWinner ? (
                    <button
                      type="button"
                      data-testid="admin-banner-show-winners-btn"
                      onClick={() => {
                        const snapshot = createRevealSnapshot(state);
                        updateStateImmediate((s) => ({
                          ...s,
                          celebrateWinner: true,
                          winnersSnapshot: snapshot,
                          celebrateTrigger: Date.now(),
                        }));
                      }}
                      className="px-5 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-indigo-950 shadow-[0_0_16px_rgba(251,191,36,0.5)] border border-amber-200"
                    >
                      <span>🏆 Show winners page</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        data-testid="admin-banner-celebrate-again-btn"
                        onClick={() => {
                          updateStateImmediate((s) => ({
                            ...s,
                            celebrateTrigger: Date.now(),
                          }));
                        }}
                        className="px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                      >
                        <span>Celebrate again 🎉</span>
                      </button>
                      <button
                        type="button"
                        data-testid="admin-banner-back-leaderboard-btn"
                        onClick={() => {
                          updateStateImmediate((s) => ({
                            ...s,
                            celebrateWinner: false,
                          }));
                        }}
                        className="px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer bg-rose-600 hover:bg-rose-500 text-white border border-rose-400"
                      >
                        <span>← Back to leaderboard</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Projector Shows Level Selector */}
              <div className="flex flex-wrap items-center gap-2 bg-[#121929] p-2.5 rounded-xl border border-white/10 text-xs">
                <span className="text-[#9aa7bd] font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 pl-1 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Projector Shows:
                </span>
                <button
                  type="button"
                  onClick={() => handleFocusChange('all')}
                  className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
                    state.focus === 'all'
                      ? 'bg-[#f2c94c] text-[#0b1322] shadow-[0_0_12px_rgba(242,201,76,0.4)]'
                      : 'bg-white/5 text-[#9aa7bd] hover:text-white hover:bg-white/10'
                  }`}
                >
                  Overall Total
                </button>
                {state.levels.map((lvl) => (
                  <button
                    type="button"
                    key={lvl.id}
                    onClick={() => handleFocusChange(lvl.id)}
                    className={`px-3 py-1 rounded-lg font-bold uppercase transition-all ${
                      state.focus === lvl.id
                        ? 'bg-[#f2c94c] text-[#0b1322] shadow-[0_0_12px_rgba(242,201,76,0.4)]'
                        : 'bg-white/5 text-[#9aa7bd] hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {lvl.name} Only
                  </button>
                ))}
                <button
                  type="button"
                  data-testid="quick-add-level-btn"
                  onClick={handleAddLevel}
                  className="px-2.5 py-1 rounded-lg font-bold text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 transition-all ml-auto flex items-center gap-1 cursor-pointer"
                  title="Add a new level to the quiz"
                >
                  <span>+</span> Add Level
                </button>
              </div>

              {/* Filter, Search & View Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-black/20 p-2.5 rounded-xl border border-white/5">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search group name..."
                    className="admin-input w-full text-xs py-1.5"
                  />
                </div>

                {/* Status tabs */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterStatus('all')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      filterStatus === 'all'
                        ? 'bg-[#f2c94c] text-[#0b1322] font-bold'
                        : 'text-[#9aa7bd] hover:text-[#f4ecd8]'
                    }`}
                  >
                    All ({state.teams.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('active')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      filterStatus === 'active'
                        ? 'bg-[#f2c94c] text-[#0b1322] font-bold'
                        : 'text-[#9aa7bd] hover:text-[#f4ecd8]'
                    }`}
                  >
                    Active ({activeCount})
                  </button>
                  {outCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterStatus('out')}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        filterStatus === 'out'
                          ? 'bg-red-400 text-[#0b1322] font-bold'
                          : 'text-red-400/80 hover:text-red-300'
                      }`}
                    >
                      Out ({outCount})
                    </button>
                  )}
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[#9aa7bd]">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'default' | 'rank' | 'name')}
                    className="admin-input text-xs py-1 cursor-pointer"
                  >
                    <option value="default">Default Order</option>
                    <option value="rank">Rank / Total (High to Low)</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>

                {/* Compact View Toggle */}
                <button
                  type="button"
                  onClick={() => setIsCompact(!isCompact)}
                  className={`text-xs px-2.5 py-1 rounded border transition-all ${
                    isCompact
                      ? 'bg-white/10 text-[#f2c94c] border-[#f2c94c]/40 font-semibold'
                      : 'bg-transparent text-[#9aa7bd] border-white/10 hover:text-[#f4ecd8]'
                  }`}
                  title="Toggle compact row view to see all groups on one screen"
                >
                  {isCompact ? 'Compact View: ON' : 'Compact View: OFF'}
                </button>

                {/* Mark Selected Red Button */}
                <button
                  type="button"
                  disabled={selectedTeamIds.size === 0}
                  onClick={() => {
                    updateStateImmediate((s) => ({
                      ...s,
                      teams: s.teams.map((t) =>
                        selectedTeamIds.has(t.id) ? { ...t, marked: latestLevelName } : t
                      ),
                    }));
                    setSelectedTeamIds(new Set());
                  }}
                  className={`text-xs px-2.5 py-1 rounded border transition-all font-semibold ${
                    selectedTeamIds.size > 0
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 cursor-pointer shadow-sm'
                      : 'bg-transparent text-[#9aa7bd]/40 border-white/5 cursor-not-allowed'
                  }`}
                  title={
                    selectedTeamIds.size > 0
                      ? `Apply red mark to ${selectedTeamIds.size} selected group(s)`
                      : 'Select groups below using checkboxes to mark them red'
                  }
                >
                  Mark Selected Red {selectedTeamIds.size > 0 ? `(${selectedTeamIds.size})` : ''}
                </button>
              </div>

              {/* Quick Inline Group Add */}
              <form
                onSubmit={handleQuickAddGroup}
                className="flex items-center gap-2 bg-[#141b2b] p-2 rounded-xl border border-white/5"
              >
                <span className="text-xs text-[#f2c94c] font-semibold pl-1">+ Quick Add:</span>
                <input
                  type="text"
                  value={quickGroupName}
                  onChange={(e) => setQuickGroupName(e.target.value)}
                  placeholder="Type new group name and press Enter..."
                  className="admin-input flex-1 text-xs py-1.5"
                />
                <button
                  type="submit"
                  disabled={!quickGroupName.trim()}
                  className="admin-btn-gold text-xs py-1.5 px-3"
                >
                  Add Group
                </button>
              </form>

              {/* FULL TABLE: Displays ALL groups clearly */}
              <div className="overflow-x-auto admin-scroll border border-[#243049] rounded-xl shadow-lg relative bg-[#0d1525]">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-30 bg-[#161f36] text-[11px] uppercase tracking-wider text-[#9aa7bd] border-b border-[#243049] shadow-md">
                    <tr>
                      <th className="text-center py-2.5 px-1 w-8">
                        <input
                          type="checkbox"
                          checked={displayedTeams.length > 0 && displayedTeams.every((t) => selectedTeamIds.has(t.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeamIds(new Set(displayedTeams.map((t) => t.id)));
                            } else {
                              setSelectedTeamIds(new Set());
                            }
                          }}
                          className="w-3.5 h-3.5 accent-[#f2c94c] cursor-pointer rounded"
                          title="Select all displayed groups"
                        />
                      </th>
                      <th className="text-center py-2.5 px-2 w-12 font-bold text-[#f2c94c]">
                        #
                      </th>
                      <th className="text-left py-2.5 px-3 min-w-[200px] font-semibold">
                        Group Name ({displayedTeams.length})
                      </th>
                      {state.levels.map((l) => (
                        <th
                          key={l.id}
                          className="text-center py-2.5 px-2 min-w-[80px] font-semibold"
                        >
                          {l.name}
                        </th>
                      ))}
                      <th className="text-center py-2.5 px-3 min-w-[70px] font-bold text-[#f2c94c]">
                        Total
                      </th>
                      <th className="text-center py-2.5 px-2 w-14" title="Mark eliminated">
                        Out
                      </th>
                      <th className="text-center py-2.5 px-2 w-14" title="Mark red (stays on board)">
                        Red
                      </th>
                      <th className="text-center py-2.5 px-2 w-12" title="Delete group">
                        Del
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedTeams.map((team, teamIndex) => {
                      const isOut = Boolean(team.out);
                      const isMarked = Boolean(team.marked);
                      const rankInfo = team.rankInfo;
                      const rank = rankInfo?.rank;

                      return (
                        <tr
                          key={team.id}
                          className={`
                            border-b border-white/[0.04] transition-colors
                            ${teamIndex % 2 === 1 ? 'bg-white/[0.015]' : 'bg-transparent'}
                            ${isOut ? 'opacity-40 bg-red-950/10' : isMarked ? 'bg-rose-950/20 hover:bg-rose-950/30' : 'hover:bg-white/[0.03]'}
                          `}
                        >
                          {/* Selection Checkbox */}
                          <td className={`px-1 text-center ${isCompact ? 'py-1' : 'py-2'}`}>
                            <input
                              type="checkbox"
                              checked={selectedTeamIds.has(team.id)}
                              onChange={() => {
                                setSelectedTeamIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(team.id)) next.delete(team.id);
                                  else next.add(team.id);
                                  return next;
                                });
                              }}
                              className="w-3.5 h-3.5 accent-[#f2c94c] cursor-pointer rounded"
                              title="Select group"
                            />
                          </td>

                          {/* Rank Badge */}
                          <td className={`py-2 px-1 text-center font-mono ${isCompact ? 'py-1' : 'py-2'}`}>
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

                          {/* Group Avatar + Name */}
                          <td className={`px-3 ${isCompact ? 'py-1' : 'py-2'}`}>
                            <div className="flex items-center gap-2.5">
                              <Avatar
                                name={team.name}
                                id={team.id}
                                size={isCompact ? 26 : 32}
                                ringColor={
                                  rank === 1 ? '#f2c94c' : rank === 2 ? '#8fb8e8' : rank === 3 ? '#6fbf8e' : undefined
                                }
                              />
                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={team.name}
                                  onChange={(e) => handleRenameGroup(team.id, e.target.value)}
                                  className={`admin-input w-full font-semibold ${
                                    isCompact ? 'py-1 text-xs' : 'py-1.5 text-sm'
                                  }`}
                                  placeholder="Group name"
                                />
                                {isOut && (
                                  <span className="text-[10px] text-red-300 block mt-0.5 italic">
                                    Eliminated ({team.out})
                                  </span>
                                )}
                                {!isOut && isMarked && (
                                  <span className="text-[10px] text-rose-400 block mt-0.5 italic font-medium">
                                    Marked red ({team.marked})
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Scores inputs for each level */}
                          {state.levels.map((l, levelIndex) => (
                            <td key={l.id} className={`px-1 text-center ${isCompact ? 'py-1' : 'py-2'}`}>
                              <ScoreInputCell
                                score={team.scores[l.id]}
                                onChange={(val) => handleScoreChange(team.id, l.id, val)}
                                onKeyDown={(e) => handleScoreKeyDown(e, teamIndex, levelIndex)}
                                coord={`${teamIndex}-${levelIndex}`}
                                isCompact={isCompact}
                              />
                            </td>
                          ))}

                          {/* Total Score */}
                          <td
                            className={`px-3 text-center font-bold text-[#f2c94c] tabular-nums font-mono ${
                              isCompact ? 'py-1 text-sm' : 'py-2 text-base'
                            }`}
                          >
                            {formatScore(team.total)}
                          </td>

                          {/* Out Checkbox */}
                          <td className={`px-2 text-center ${isCompact ? 'py-1' : 'py-2'}`}>
                            <input
                              type="checkbox"
                              checked={isOut}
                              onChange={() => handleToggleOut(team.id)}
                              className="w-4 h-4 accent-[#f2c94c] cursor-pointer rounded"
                              title={isOut ? 'Mark as active' : 'Mark as eliminated'}
                            />
                          </td>

                          {/* Red Checkbox */}
                          <td className={`px-2 text-center ${isCompact ? 'py-1' : 'py-2'}`}>
                            <input
                              type="checkbox"
                              checked={isMarked}
                              onChange={() => handleToggleMarked(team.id)}
                              className="w-4 h-4 accent-rose-500 cursor-pointer rounded"
                              title={team.marked ? `Marked red (${team.marked}). Click to unmark.` : 'Mark red (stays on board)'}
                            />
                          </td>

                          {/* Delete Button */}
                          <td className={`px-2 text-center ${isCompact ? 'py-1' : 'py-2'}`}>
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(team.id)}
                              className="text-red-400/60 hover:text-red-400 text-sm p-1 rounded transition-colors"
                              title="Delete group"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CollapsibleSection>



        {/* SECTION 2: QUIZ SETTINGS */}
        <CollapsibleSection
          title="Quiz Settings & Display"
          isOpen={openSections.settings}
          onToggle={() => toggleSection('settings')}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-[#9aa7bd] uppercase tracking-wider block mb-1.5">
                Quiz Title
              </label>
              <input
                type="text"
                value={state.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="admin-input w-full text-sm"
                placeholder="e.g. Church Bible Quiz 2026"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#9aa7bd] uppercase tracking-wider block mb-1.5">
                Projector Tab / Focus
              </label>
              <select
                value={state.focus}
                onChange={(e) => handleFocusChange(e.target.value)}
                className="admin-input w-full text-sm cursor-pointer"
              >
                <option value="all">Overall (All Levels Total)</option>
                {state.levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} only
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#9aa7bd] uppercase tracking-wider block mb-1.5">
                Projector Text Size
              </label>
              <select
                value={state.projectorScale || 'large'}
                onChange={(e) => handleProjectorScaleChange(e.target.value as 'large' | 'xl')}
                className="admin-input w-full text-sm cursor-pointer"
              >
                <option value="large">Large (Standard - 15m to 20m)</option>
                <option value="xl">Extra Large (+15% text - 20m to 30m Back of Hall)</option>
              </select>
            </div>
          </div>
        </CollapsibleSection>

        {/* SECTION: CELEBRATION WORDING */}
        <CollapsibleSection
          title="Celebration Wording"
          isOpen={openSections.wording}
          onToggle={() => toggleSection('wording')}
          badge="8 fields · max 28 chars"
        >
          <div className="space-y-4 pt-2" data-testid="celebration-wording-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
              <p className="text-xs text-[#9aa7bd]">
                Customize pills, taglines, subtitle and footer text for the Winners Celebration projector screen. Max 28 characters each.
              </p>
              <button
                type="button"
                data-testid="admin-reset-wording-btn"
                onClick={handleResetWording}
                className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-400/20 transition-all font-semibold cursor-pointer"
                title="Reset all celebration wording fields to standard defaults"
              >
                ↺ Reset to Defaults
              </button>
            </div>

            {/* Banner Subtitle */}
            <div className="max-w-md">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[#9aa7bd] uppercase tracking-wider">
                  Banner Subtitle
                </label>
                <span className="text-[10px] text-[#9aa7bd]/70 font-mono">
                  {wording.subtitle.length}/28
                </span>
              </div>
              <input
                type="text"
                maxLength={28}
                data-testid="wording-input-subtitle"
                value={wording.subtitle}
                onChange={(e) => handleWordingChange('subtitle', e.target.value)}
                className="admin-input w-full text-sm font-medium"
                placeholder="Final Honours Board"
              />
              <span className="text-[11px] text-[#9aa7bd]/60 mt-1 block">
                Displayed beneath the CONGRATULATIONS hexagon banner
              </span>
            </div>

            {/* Top Card Pills (1st, 2nd, 3rd) */}
            <div className="border-t border-white/5 pt-3">
              <span className="text-xs font-bold text-amber-300/90 uppercase tracking-wider block mb-2.5">
                Top Card Pills (Badges on Top Edge)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-[#9aa7bd]">
                      1st Place Pill
                    </label>
                    <span className="text-[10px] text-[#9aa7bd]/70 font-mono">
                      {wording.pill1.length}/28
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={28}
                    data-testid="wording-input-pill1"
                    value={wording.pill1}
                    onChange={(e) => handleWordingChange('pill1', e.target.value)}
                    className="admin-input w-full text-sm font-medium"
                    placeholder="CHAMPION · #1"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-[#9aa7bd]">
                      2nd Place Pill
                    </label>
                    <span className="text-[10px] text-[#9aa7bd]/70 font-mono">
                      {wording.pill2.length}/28
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={28}
                    data-testid="wording-input-pill2"
                    value={wording.pill2}
                    onChange={(e) => handleWordingChange('pill2', e.target.value)}
                    className="admin-input w-full text-sm font-medium"
                    placeholder="RUNNER-UP · #2"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-[#9aa7bd]">
                      3rd Place Pill
                    </label>
                    <span className="text-[10px] text-[#9aa7bd]/70 font-mono">
                      {wording.pill3.length}/28
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={28}
                    data-testid="wording-input-pill3"
                    value={wording.pill3}
                    onChange={(e) => handleWordingChange('pill3', e.target.value)}
                    className="admin-input w-full text-sm font-medium"
                    placeholder="THIRD PLACE · #3"
                  />
                </div>
              </div>
            </div>

            {/* Taglines Under Names */}
            <div className="border-t border-white/5 pt-3">
              <span className="text-xs font-bold text-amber-300/90 uppercase tracking-wider block mb-2.5">
                Taglines (Under Group Names)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-[#9aa7bd]">
                      1st Place Tagline
                    </label>
                    <span className="text-[10px] text-[#9aa7bd]/70 font-mono">
                      {wording.tagline1.length}/28
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={28}
                    data-testid="wording-input-tagline1"
                    value={wording.tagline1}
                    onChange={(e) => handleWordingChange('tagline1', e.target.value)}
                    className="admin-input w-full text-sm font-medium"
                    placeholder="Bible Quiz Champions"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-[#9aa7bd]">
                      2nd Place Tagline
                    </label>
                    <span className="text-[10px] text-[#9aa7bd]/70 font-mono">
                      {wording.tagline2.length}/28
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={28}
                    data-testid="wording-input-tagline2"
                    value={wording.tagline2}
                    onChange={(e) => handleWordingChange('tagline2', e.target.value)}
                    className="admin-input w-full text-sm font-medium"
                    placeholder="Outstanding Performance"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-[#9aa7bd]">
                      3rd Place Tagline
                    </label>
                    <span className="text-[10px] text-[#9aa7bd]/70 font-mono">
                      {wording.tagline3.length}/28
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={28}
                    data-testid="wording-input-tagline3"
                    value={wording.tagline3}
                    onChange={(e) => handleWordingChange('tagline3', e.target.value)}
                    className="admin-input w-full text-sm font-medium"
                    placeholder="Well Done"
                  />
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* SECTION 3: ADD GROUPS IN BULK */}
        <CollapsibleSection
          title="Bulk Add Groups"
          isOpen={openSections.groups}
          onToggle={() => toggleSection('groups')}
          badge={`${state.teams.length} groups`}
        >
          <div className="space-y-3 pt-2">
            <p className="text-xs text-[#9aa7bd]">
              Paste or type multiple group names below (one name per line):
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Enter group names, one per line...&#10;e.g.&#10;Grace Fellowship&#10;Mount Zion Warriors&#10;St. Peter's Youth"
              rows={4}
              className="admin-input w-full resize-none font-mono text-sm"
            />
            <div className="flex gap-3">
              <button
                type="button"
                data-testid="bulk-add-groups-btn"
                onClick={() => handleBulkAddGroups(bulkText)}
                className="admin-btn-gold"
                disabled={!bulkText.trim()}
              >
                Add Groups
              </button>
            </div>
          </div>
        </CollapsibleSection>


        {/* SECTION 4: LEVELS */}
        <CollapsibleSection
          title="Quiz Levels"
          isOpen={openSections.levels}
          onToggle={() => toggleSection('levels')}
          badge={`${state.levels.length} levels`}
        >
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {state.levels.map((level) => (
                <div
                  key={level.id}
                  className="flex items-center gap-2 bg-black/25 p-2.5 rounded-xl border border-white/5"
                >
                  <input
                    type="text"
                    value={level.name}
                    onChange={(e) => handleRenameLevel(level.id, e.target.value)}
                    className="admin-input flex-1 text-sm font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => handleEliminateLowest(level.id)}
                    className="admin-btn-sm text-amber-300 hover:text-amber-200 border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20"
                    title={`Eliminate lowest N groups after ${level.name}`}
                  >
                    Eliminate Lowest N…
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLevel(level.id)}
                    className="admin-btn-sm text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-500/20 px-2.5"
                    title="Delete level"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddLevel}
              className="admin-btn-gold"
            >
              + Add Level
            </button>
          </div>
        </CollapsibleSection>


        {/* SECTION 5: BULK ACTIONS */}
        <CollapsibleSection
          title="Bulk Actions & Danger Zone"
          isOpen={openSections.actions}
          onToggle={() => toggleSection('actions')}
        >
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                updateStateImmediate((s) => ({
                  ...s,
                  celebrateWinner: !s.celebrateWinner,
                }));
              }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                state.celebrateWinner
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40'
              }`}
            >
              <span>{state.celebrateWinner ? '🛑 Stop Winner Celebration' : '🎉 Trigger Winner Celebration & Confetti'}</span>
            </button>
            <button
              type="button"
              onClick={handleBringBackAll}
              className="admin-btn-outline"
            >
              Bring Back All Eliminated Groups
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmDialog({
                  title: 'Clear all red marks?',
                  message: 'All red marks will be removed from all groups. They will return to their normal appearance on the board.',
                  onConfirm: () => {
                    updateStateImmediate((s) => ({
                      ...s,
                      teams: s.teams.map((t) => ({ ...t, marked: '' })),
                    }));
                    setConfirmDialog(null);
                  },
                });
              }}
              className="admin-btn-outline text-rose-300 border-rose-400/30 hover:bg-rose-400/10 hover:border-rose-400"
            >
              Clear All Red Marks
            </button>
            <button
              type="button"
              onClick={handleResetAllScores}
              className="admin-btn-outline text-amber-300 border-amber-400/30 hover:bg-amber-400/10"
            >
              Reset All Scores to 0
            </button>
            <button
              type="button"
              onClick={handleClearAllGroups}
              className="admin-btn-outline text-red-400 border-red-400/30 hover:bg-red-400/10 hover:border-red-400"
            >
              Delete All Groups
            </button>
          </div>
        </CollapsibleSection>

      </main>
    </div>
  );
}

interface ScoreInputCellProps {
  score: number | undefined;
  onChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  coord: string;
  isCompact: boolean;
}

function ScoreInputCell({
  score,
  onChange,
  onKeyDown,
  coord,
  isCompact,
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
    // Allow empty, digits, and a single decimal point (e.g. "10", "10.", "10.5", ".5")
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
      data-coord={coord}
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
      className={`admin-input w-full text-center font-mono font-bold tabular-nums ${
        isCompact ? 'py-1 text-xs' : 'py-1.5 text-sm'
      }`}
      placeholder="0"
    />
  );
}

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  badge,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="bg-[#111b2e] border border-[#243049] rounded-[18px] overflow-hidden shadow-lg transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#f2c94c] text-xs transition-transform duration-200">
            {isOpen ? '▼' : '▶'}
          </span>
          <h2
            className="text-base md:text-lg font-bold text-[#f4ecd8] tracking-wide"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {title}
          </h2>
        </div>

        {badge && (
          <span className="text-xs text-[#9aa7bd] font-mono bg-black/30 px-2 py-0.5 rounded-md border border-white/5">
            {badge}
          </span>
        )}
      </button>

      {isOpen && <div className="p-4 md:p-5 border-t border-[#243049]">{children}</div>}
    </div>
  );
}
