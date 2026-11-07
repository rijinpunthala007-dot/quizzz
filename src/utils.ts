import type { QuizState, RankedTeam, Level, Team, RevealSnapshotTeam } from './types';

/**
 * Get initials from a group name (up to 2 characters)
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Desaturated tinted circle fills (slate blue, indigo, plum, olive, bronze, teal, rust)
 */
const DESATURATED_AVATAR_GRADIENTS: [string, string][] = [
  ['#26354a', '#1e293b'], // slate blue
  ['#282c4f', '#1f2240'], // indigo
  ['#3d283f', '#2f1e31'], // plum
  ['#2d3525', '#22291c'], // olive
  ['#3d2e22', '#30241a'], // bronze
  ['#1e3638', '#162b2d'], // teal
  ['#3d251f', '#2f1c17'], // rust
];

export function getAvatarGradient(id: string, rank?: number): [string, string] {
  if (rank === 1) return ['#4a3d1c', '#332912']; // warm gold
  if (rank === 2) return ['#213247', '#172433']; // silver-blue
  if (rank === 3) return ['#1f3627', '#16271c']; // copper/emerald

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % DESATURATED_AVATAR_GRADIENTS.length;
  return DESATURATED_AVATAR_GRADIENTS[idx];
}

/**
 * Filter levels that have been played (at least one team has a non-zero score)
 */
export function getPlayedLevels(levels: Level[], teams: Team[]): Level[] {
  return levels.filter((level) =>
    teams.some((team) => (team.scores[level.id] || 0) > 0)
  );
}

/**
 * Format played levels score string: "L1 66 · L2 35 · L3 66 · L4 73" (maxChips default 4)
 */
export function getTeamLevelScoresString(
  team: Team,
  levels: Level[],
  teams: Team[],
  maxChips = 4
): string {
  const played = getPlayedLevels(levels, teams);
  if (played.length === 0) return '';
  const chips = played.slice(0, maxChips).map((l, idx) => {
    const match = l.name.match(/\d+/);
    const shortName = match ? `L${match[0]}` : `L${idx + 1}`;
    const score = team.scores[l.id] ?? 0;
    return `${shortName} ${score}`;
  });
  return chips.join(' · ');
}

/**
 * Get the most recently played level (last in sequence with >0 scores)
 */
export function getMostRecentlyPlayedLevel(levels: Level[], teams: Team[]): Level | null {
  const played = getPlayedLevels(levels, teams);
  return played.length > 0 ? played[played.length - 1] : null;
}

/**
 * Calculate the total score for a team
 */
export function getTeamTotal(team: { scores: Record<string, number> }, levels: { id: string }[]): number {
  const sum = levels.reduce((acc, level) => acc + (team.scores[level.id] || 0), 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Get the display score for a team based on focus
 */
export function getTeamFocusScore(
  team: { scores: Record<string, number> },
  focus: string,
  levels: { id: string }[]
): number {
  if (focus === 'all') return getTeamTotal(team, levels);
  const score = team.scores[focus] || 0;
  return Math.round(score * 100) / 100;
}

/**
 * Cleanly format score: integers as integers (e.g. "42"), decimals as decimals up to 2 places (e.g. "42.5", "42.25")
 */
export function formatScore(score: number | undefined | null): string {
  if (score === undefined || score === null || isNaN(score)) return '0';
  const rounded = Math.round(score * 100) / 100;
  return rounded.toString();
}

/**
 * Previous ranks localStorage persistence
 */
const PREV_RANKS_KEY = 'bible-quiz-previous-ranks';

export function loadStoredPreviousRanks(): Map<string, number> {
  try {
    const raw = localStorage.getItem(PREV_RANKS_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      return new Map(Object.entries(obj));
    }
  } catch {
    // ignore
  }
  return new Map();
}

export function saveStoredPreviousRanks(ranks: Map<string, number>) {
  try {
    const obj: Record<string, number> = {};
    ranks.forEach((val, key) => {
      obj[key] = val;
    });
    localStorage.setItem(PREV_RANKS_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

/**
 * Rank teams with tie handling and recent level score computation.
 */
export function rankTeams(state: QuizState, previousRanks?: Map<string, number>): RankedTeam[] {
  const { teams, levels, focus } = state;
  const recentLevel = getMostRecentlyPlayedLevel(levels, teams);

  const active = teams.filter((t) => !t.out);
  const eliminated = teams.filter((t) => t.out);

  // Sort active teams by focus score descending with stable tie-breakers
  const sorted = active
    .map((t) => ({
      ...t,
      total: getTeamTotal(t, levels),
      focusScore: getTeamFocusScore(t, focus, levels),
      recentScore: recentLevel ? t.scores[recentLevel.id] || 0 : undefined,
      rank: 0,
      previousRank: previousRanks?.get(t.id),
      isTied: false,
      displayRank: '',
    }))
    .sort((a, b) => {
      // 1. Primary: Focus score descending
      if (b.focusScore !== a.focusScore) {
        return b.focusScore - a.focusScore;
      }
      // 2. Secondary tie-breaker (when focus is a specific level): Total score descending
      if (focus !== 'all' && b.total !== a.total) {
        return b.total - a.total;
      }
      // 3. Stable tie-breaker: Name alphabetical
      return a.name.localeCompare(b.name);
    });

  // Assign ranks with ties based on focusScore
  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].focusScore < sorted[i - 1].focusScore) {
      currentRank = i + 1;
    }
    sorted[i].rank = currentRank;
    if (previousRanks) {
      sorted[i].previousRank = previousRanks.get(sorted[i].id);
    }
  }

  // Count ties by rank
  const rankCounts = new Map<number, number>();
  sorted.forEach((t) => {
    rankCounts.set(t.rank, (rankCounts.get(t.rank) || 0) + 1);
  });

  // Assign displayRank (e.g. "T-2" for ties)
  sorted.forEach((t) => {
    const count = rankCounts.get(t.rank) || 0;
    t.isTied = count > 1;
    t.displayRank = count > 1 ? `T-${t.rank}` : `${t.rank}`;
  });

  // Eliminated teams at the bottom
  const eliminatedRanked: RankedTeam[] = eliminated.map((t) => ({
    ...t,
    total: getTeamTotal(t, levels),
    focusScore: getTeamFocusScore(t, focus, levels),
    recentScore: recentLevel ? t.scores[recentLevel.id] || 0 : undefined,
    rank: -1,
    previousRank: previousRanks?.get(t.id),
    isTied: false,
    displayRank: '—',
  }));

  return [...sorted, ...eliminatedRanked];
}

/**
 * Generate a unique ID
 */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * Ring color for podium positions (vibrant, high contrast)
 */
export function getPodiumRingColor(rank: number): string {
  switch (rank) {
    case 1:
      return '#f2c94c'; // gold
    case 2:
      return '#7f9bb8'; // silver-blue
    case 3:
      return '#c98a62'; // copper
    default:
      return '#243049';
  }
}

/**
 * Compute rank movement info
 */
export function getRankMovement(
  currentRank: number,
  previousRank?: number
): { diff: number; label: string; isPositive: boolean } | null {
  if (!previousRank || currentRank <= 0 || previousRank <= 0 || previousRank === currentRank) {
    return null;
  }
  const diff = previousRank - currentRank; // positive = moved up
  if (diff === 0) return null;
  return {
    diff,
    label: diff > 0 ? `▲ ${diff}` : `▼ ${Math.abs(diff)}`,
    isPositive: diff > 0,
  };
}

/**
 * Create a frozen snapshot of the top 3 overall ranking for the Winners Reveal.
 * Eliminated groups never appear. Ties share a rank and skip subsequent ranks.
 */
export function createRevealSnapshot(state: QuizState): RevealSnapshotTeam[] {
  const { teams, levels } = state;
  const active = teams.filter((t) => !t.out);

  if (active.length === 0) return [];

  // Calculate overall totals across all levels
  const withTotals = active.map((t) => ({
    id: t.id,
    name: t.name,
    total: getTeamTotal(t, levels),
    scores: { ...t.scores },
  }));

  // Sort descending by total, alphabetical for stable ordering
  withTotals.sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    return a.name.localeCompare(b.name);
  });

  // Assign ranks with standard competition ranking (1224 or 113)
  const ranked: Array<typeof withTotals[0] & { rank: number }> = [];
  let currentRank = 1;

  for (let i = 0; i < withTotals.length; i++) {
    if (i > 0 && withTotals[i].total < withTotals[i - 1].total) {
      currentRank = i + 1;
    }
    ranked.push({
      ...withTotals[i],
      rank: currentRank,
    });
  }

  // Count ties per rank
  const rankCounts = new Map<number, number>();
  ranked.forEach((item) => {
    rankCounts.set(item.rank, (rankCounts.get(item.rank) || 0) + 1);
  });

  // Keep all teams whose rank <= 3
  const topTeams = ranked.filter((t) => t.rank <= 3);

  return topTeams.map((t) => {
    const isTied = (rankCounts.get(t.rank) || 0) > 1;
    return {
      id: t.id,
      name: t.name,
      total: t.total,
      rank: t.rank,
      displayRank: isTied ? `T-${t.rank}` : `${t.rank}`,
      isTied,
      subtitle: isTied ? 'Tied Placement' : undefined,
      scores: t.scores,
    };
  });
}
