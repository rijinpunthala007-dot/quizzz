export interface Level {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  out: '' | string; // empty or level name when eliminated
  marked?: '' | string; // empty or level name when marked red
  scores: Record<string, number>; // levelId -> score
}

export interface RevealSnapshotTeam {
  id: string;
  name: string;
  total: number;
  rank: number;
  displayRank?: string;
  isTied?: boolean;
  subtitle?: string;
  church?: string;
  scores?: Record<string, number>;
}

export interface RevealState {
  active: boolean;
  step: 0 | 1 | 2 | 3 | 4;
  mode: 'manual' | 'auto';
  sound: boolean;
  countdown: boolean;
  snapshot: RevealSnapshotTeam[];
  lastBurstTimestamp?: number;
}

export interface CelebrationWording {
  pill1: string;
  pill2: string;
  pill3: string;
  tagline1: string;
  tagline2: string;
  tagline3: string;
  subtitle: string;
  footerText: string;
}

export const DEFAULT_WORDING: CelebrationWording = {
  pill1: 'CHAMPION · #1',
  pill2: 'RUNNER-UP · #2',
  pill3: 'THIRD PLACE · #3',
  tagline1: 'Bible Quiz Champions',
  tagline2: 'Outstanding Performance',
  tagline3: 'Well Done',
  subtitle: 'Final Honours Board',
  footerText: 'designed and developed by rj',
};

export interface QuizState {
  title: string;
  focus: 'all' | string; // 'all' or levelId
  levels: Level[];
  teams: Team[];
  projectorScale?: 'large' | 'xl'; // Default: 'large'
  celebrateWinner?: boolean; // When true, shows Winners Celebration screen!
  soundEnabled?: boolean;
  eliminationSound?: boolean;
  celebrateTrigger?: number; // timestamp to fire/re-fire pops
  winnersSnapshot?: RevealSnapshotTeam[]; // snapshot taken when winners page opens
  celebrationWording?: CelebrationWording; // Editable celebration wording
  reveal?: RevealState; // Winners Reveal celebration mode
}

export interface RankedTeam extends Team {
  total: number;
  rank: number;
  focusScore: number;
  previousRank?: number;
  isTied?: boolean;
  displayRank?: string;
  recentScore?: number;
}

export const DEFAULT_REVEAL: RevealState = {
  active: false,
  step: 0,
  mode: 'manual',
  sound: false,
  countdown: true,
  snapshot: [],
};

export const DEFAULT_STATE: QuizState = {
  title: 'Verse Up Bible Quiz 2026',
  focus: 'all',
  levels: [],
  teams: [],
  projectorScale: 'large',
  celebrateWinner: false,
  celebrationWording: DEFAULT_WORDING,
  reveal: DEFAULT_REVEAL,
};
