import { useEffect, useState, useCallback, useRef } from 'react';
import type { QuizState } from './types';
import { DEFAULT_REVEAL, DEFAULT_WORDING } from './types';
import { uid, createRevealSnapshot } from './utils';
import { generateDemoState } from './demo';

const STORAGE_KEY = 'bible-quiz-state';
const CHANNEL_NAME = 'bible-quiz-sync';

// List of demo group names to purge so mock data is completely removed
export const DEMO_TEAM_NAMES = new Set([
  'Faith Warriors',
  'Holy Spirit',
  'Grace & Truth',
  'Living Water',
  'Bread of Life',
  'Light of World',
  'Good Shepherd',
  'Alpha & Omega',
  'Burning Bush',
  'Lion of Judah',
  'Morning Star',
  'Rock of Ages',
  'Salt & Light',
  'Cornerstone',
  'Royal Priests',
  'Mighty Fortress',
]);

let broadcastChannel: BroadcastChannel | null = null;
try {
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
} catch {
  // BroadcastChannel fallback to storage event
}

export function createEmptyQuizState(): QuizState {
  return {
    title: 'Church Bible Quiz 2026',
    focus: 'all',
    levels: [
      { id: uid(), name: 'Level 1' },
      { id: uid(), name: 'Level 2' },
      { id: uid(), name: 'Level 3' },
      { id: uid(), name: 'Level 4' },
    ],
    teams: [],
    celebrationWording: { ...DEFAULT_WORDING },
    reveal: { ...DEFAULT_REVEAL },
  };
}

function loadState(): QuizState {
  const isDemoMode = typeof window !== 'undefined' && window.location.search.includes('demo=1');
  const forceReset = typeof window !== 'undefined' && window.location.search.includes('reset=1');

  if (isDemoMode) {
    const demo = generateDemoState();
    demo.reveal = {
      ...DEFAULT_REVEAL,
      active: true,
      step: 0,
      mode: 'auto',
      snapshot: createRevealSnapshot(demo),
    };
    return demo;
  }

  if (!forceReset) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          Array.isArray(parsed.levels) &&
          parsed.levels.length > 0 &&
          Array.isArray(parsed.teams)
        ) {
          // Check if mock demo teams are present and purge them (only if NOT demo mode)
          const hasDemoTeams = parsed.teams.some((t: any) =>
            t && typeof t.name === 'string' && DEMO_TEAM_NAMES.has(t.name.trim())
          );
          if (hasDemoTeams) {
            const cleanedTeams = parsed.teams.filter(
              (t: any) => t && typeof t.name === 'string' && !DEMO_TEAM_NAMES.has(t.name.trim())
            );
            const cleanedState: QuizState = {
              ...parsed,
              teams: cleanedTeams,
              reveal: parsed.reveal ? { ...parsed.reveal } : { ...DEFAULT_REVEAL },
            };
            saveState(cleanedState);
            broadcast(cleanedState);
            return cleanedState;
          }

          if (!parsed.reveal) {
            parsed.reveal = { ...DEFAULT_REVEAL };
          }
          if (!parsed.celebrationWording) {
            parsed.celebrationWording = { ...DEFAULT_WORDING };
          }
          if (parsed.celebrateWinner && (!parsed.winnersSnapshot || parsed.winnersSnapshot.length === 0)) {
            parsed.winnersSnapshot = createRevealSnapshot(parsed);
          }
          return parsed;
        }
      }
    } catch {
      // corrupted data
    }
  }

  // Initialize clean state with NO mock data
  const cleanState = createEmptyQuizState();
  saveState(cleanState);
  broadcast(cleanState);
  return cleanState;
}

function saveState(state: QuizState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function broadcast(state: QuizState) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'STATE_UPDATE', state });
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('quiz-state-local-update', { detail: state }));
  }
}

/**
 * Update quiz focus and broadcast across tabs
 */
export function setQuizFocus(focus: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      state.focus = focus;
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

/**
 * Toggle or set winner celebration mode and broadcast across all tabs
 */
/**
 * Winner Celebration Page Controls
 */
export function showWinnersPage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as QuizState;
      const snapshot = createRevealSnapshot(state);
      state.celebrateWinner = true;
      state.winnersSnapshot = snapshot;
      state.celebrateTrigger = Date.now();
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

export function hideWinnersPage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as QuizState;
      state.celebrateWinner = false;
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

export function triggerCelebrateAgain() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as QuizState;
      state.celebrateTrigger = Date.now();
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

export function toggleCelebrationSound() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as QuizState;
      state.soundEnabled = !state.soundEnabled;
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

export function setCelebrateWinner(celebrating: boolean) {
  if (celebrating) {
    showWinnersPage();
  } else {
    hideWinnersPage();
  }
}

export function toggleCelebrateWinner() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      if (state.celebrateWinner) {
        hideWinnersPage();
      } else {
        showWinnersPage();
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Winners Reveal actions synced across all tabs
 */
export function startReveal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as QuizState;
      const snapshot = createRevealSnapshot(state);
      state.reveal = {
        ...(state.reveal || DEFAULT_REVEAL),
        active: true,
        step: 0,
        snapshot,
        lastBurstTimestamp: undefined,
      };
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

export function nextRevealStep() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as QuizState;
      if (!state.reveal || !state.reveal.active) return;
      const nextStep = Math.min(state.reveal.step + 1, 4) as 0 | 1 | 2 | 3 | 4;
      const isWinnerStep = nextStep === 3;
      state.reveal = {
        ...state.reveal,
        step: nextStep,
        lastBurstTimestamp: isWinnerStep ? Date.now() : state.reveal.lastBurstTimestamp,
      };
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

export function prevRevealStep() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as QuizState;
      if (!state.reveal || !state.reveal.active) return;
      const prevStep = Math.max(state.reveal.step - 1, 0) as 0 | 1 | 2 | 3 | 4;
      state.reveal = {
        ...state.reveal,
        step: prevStep,
      };
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

export function setRevealStep(step: 0 | 1 | 2 | 3 | 4) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as QuizState;
      if (!state.reveal) return;
      state.reveal = {
        ...state.reveal,
        step,
        lastBurstTimestamp: step === 3 ? Date.now() : state.reveal.lastBurstTimestamp,
      };
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

export function setRevealMode(mode: 'manual' | 'auto') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as QuizState;
      if (!state.reveal) return;
      state.reveal = {
        ...state.reveal,
        mode,
      };
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

export function toggleRevealSound() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as QuizState;
      if (!state.reveal) return;
      state.reveal = {
        ...state.reveal,
        sound: !state.reveal.sound,
      };
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

export function toggleRevealCountdown() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as QuizState;
      if (!state.reveal) return;
      state.reveal = {
        ...state.reveal,
        countdown: !state.reveal.countdown,
      };
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

export function refreshRevealSnapshot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as QuizState;
      const snapshot = createRevealSnapshot(state);
      if (!state.reveal) return;
      state.reveal = {
        ...state.reveal,
        snapshot,
      };
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

export function replayRevealCelebration() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as QuizState;
      if (!state.reveal) return;
      state.reveal = {
        ...state.reveal,
        lastBurstTimestamp: Date.now(),
      };
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

export function exitReveal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as QuizState;
      if (!state.reveal) return;
      state.reveal = {
        ...state.reveal,
        active: false,
        step: 0,
      };
      saveState(state);
      broadcast(state);
    }
  } catch {
    // ignore
  }
}

/**
 * Custom hook for quiz state with cross-tab sync for Admin
 */
export function useQuizState() {
  const [state, setStateInternal] = useState<QuizState>(loadState);
  const isIncomingRef = useRef(false);

  // Sync to localStorage and broadcast channel whenever `state` changes locally
  useEffect(() => {
    if (isIncomingRef.current) {
      isIncomingRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      saveState(state);
      broadcast(state);
    }, 80);
    return () => clearTimeout(timer);
  }, [state]);

  const setState = useCallback((updater: QuizState | ((prev: QuizState) => QuizState)) => {
    setStateInternal((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const setStateImmediate = useCallback((updater: QuizState | ((prev: QuizState) => QuizState)) => {
    setStateInternal((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveState(next);
      broadcast(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const handleBroadcast = (event: MessageEvent) => {
      if (event.data?.type === 'STATE_UPDATE' && event.data.state) {
        isIncomingRef.current = true;
        setStateInternal(event.data.state);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          isIncomingRef.current = true;
          setStateInternal(parsed);
        } catch {
          // ignore
        }
      }
    };

    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcast);
    }
    window.addEventListener('storage', handleStorage);

    return () => {
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcast);
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return { state, setState, setStateImmediate };
}

/**
 * Read-only version for projector
 */
export function useQuizStateReadOnly() {
  const [state, setStateInternal] = useState<QuizState>(loadState);
  const lastSerializedRef = useRef<string>(JSON.stringify(state));

  useEffect(() => {
    const handleBroadcast = (event: MessageEvent) => {
      if (event.data?.type === 'STATE_UPDATE' && event.data.state) {
        const incomingJson = JSON.stringify(event.data.state);
        if (incomingJson !== lastSerializedRef.current) {
          lastSerializedRef.current = incomingJson;
          setStateInternal(event.data.state);
        }
      }
    };

    const handleLocalUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<QuizState>;
      if (customEvent.detail) {
        const incomingJson = JSON.stringify(customEvent.detail);
        if (incomingJson !== lastSerializedRef.current) {
          lastSerializedRef.current = incomingJson;
          setStateInternal(customEvent.detail);
        }
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        if (event.newValue !== lastSerializedRef.current) {
          try {
            const parsed = JSON.parse(event.newValue);
            lastSerializedRef.current = event.newValue;
            setStateInternal(parsed);
          } catch {
            // ignore
          }
        }
      }
    };

    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcast);
    }
    window.addEventListener('storage', handleStorage);
    window.addEventListener('quiz-state-local-update', handleLocalUpdate);

    // Poll periodically with serialized comparison
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw && raw !== lastSerializedRef.current) {
          lastSerializedRef.current = raw;
          setStateInternal(JSON.parse(raw));
        }
      } catch {
        // ignore
      }
    }, 400);

    return () => {
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcast);
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('quiz-state-local-update', handleLocalUpdate);
      clearInterval(poll);
    };
  }, []);

  return state;
}

/**
 * Initialize demo state
 */
export function initDemoState(demoState: QuizState) {
  saveState(demoState);
  broadcast(demoState);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('quiz-state-local-update', { detail: demoState }));
  }
}
