import { useState, useEffect, useMemo } from 'react';
import type { DisplaySettings } from '../types';
import { DEFAULT_DISPLAY_SETTINGS } from '../types';
import { useQuizStateReadOnly } from '../store';

export interface ResolvedDisplaySettings {
  bgPreset: 'off' | 'soft' | 'full' | 'custom';
  performanceMode: boolean; // Lite mode
  isLite: boolean; // Alias for performanceMode
  showAdminShortcut: boolean; // Inverse of kiosk mode
  scoreAnimations: boolean;
  rays: boolean;
  particles: boolean;
  halo: boolean;
  dove: boolean;
  arches: boolean;
  candle: boolean;
  confetti: boolean;
  isReducedMotion: boolean;
  isStrike: boolean;
  activeUrlOverrides: string[];
}

/**
 * Extract active URL override flags for the current window.
 */
export function getActiveUrlOverrides(searchStr?: string): string[] {
  if (typeof window === 'undefined' && !searchStr) return [];
  const search = searchStr ?? (typeof window !== 'undefined' ? window.location.search : '');
  const params = new URLSearchParams(search);
  const overrides: string[] = [];
  const fx = params.get('fx');
  if (fx === 'off' || fx === 'soft' || fx === 'full') {
    overrides.push(`?fx=${fx}`);
  }
  if (params.get('lite') === '1') {
    overrides.push('?lite=1');
  }
  if (params.get('kiosk') === '1') {
    overrides.push('?kiosk=1');
  }
  return overrides;
}

/**
 * Pure function to resolve effective display settings from:
 * 1. prefers-reduced-motion (highest priority)
 * 2. Window URL flags (?fx=..., ?lite=1, ?kiosk=1, ?strike=1)
 * 3. Shared admin settings
 * 4. Defaults
 */
export function resolveDisplaySettings(
  displaySettings?: DisplaySettings,
  options?: {
    search?: string;
    prefersReduced?: boolean;
    strikeThroughState?: boolean;
  }
): ResolvedDisplaySettings {
  const search = options?.search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const prefersReduced =
    options?.prefersReduced ??
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const display = displaySettings || DEFAULT_DISPLAY_SETTINGS;

  // Step 3 & 4: Start with admin settings or defaults
  let bgPreset: 'off' | 'soft' | 'full' | 'custom' = display.bgPreset ?? 'soft';
  let performanceMode = display.performanceMode ?? false;
  let showAdminShortcut = display.showAdminShortcut ?? true;
  let scoreAnimations = display.scoreAnimations ?? true;
  let confetti = display.confetti ?? true;

  let rays = true;
  let particles = true;
  let halo = true;
  let dove = true;
  let arches = false;
  let candle = false;

  if (bgPreset === 'off') {
    rays = false;
    particles = false;
    halo = false;
    dove = false;
    arches = false;
    candle = false;
  } else if (bgPreset === 'full') {
    rays = true;
    particles = true;
    halo = true;
    dove = true;
    arches = true;
    candle = true;
  } else if (bgPreset === 'soft') {
    rays = true;
    particles = true;
    halo = true;
    dove = true;
    arches = false;
    candle = false;
  } else {
    // 'custom'
    rays = display.rays ?? true;
    particles = display.particles ?? true;
    halo = display.halo ?? true;
    dove = display.dove ?? true;
    arches = display.arches ?? false;
    candle = display.candle ?? false;
  }

  let isStrike = Boolean(options?.strikeThroughState);

  // Step 2: URL flag in THAT window
  const activeUrlOverrides: string[] = [];
  if (search) {
    const params = new URLSearchParams(search);

    if (params.has('fx')) {
      const fx = params.get('fx');
      if (fx === 'off') {
        bgPreset = 'off';
        rays = false;
        particles = false;
        halo = false;
        dove = false;
        arches = false;
        candle = false;
        activeUrlOverrides.push('?fx=off');
      } else if (fx === 'soft') {
        bgPreset = 'soft';
        rays = true;
        particles = true;
        halo = true;
        dove = true;
        arches = false;
        candle = false;
        activeUrlOverrides.push('?fx=soft');
      } else if (fx === 'full') {
        bgPreset = 'full';
        rays = true;
        particles = true;
        halo = true;
        dove = true;
        arches = true;
        candle = true;
        activeUrlOverrides.push('?fx=full');
      }
    }

    if (params.get('lite') === '1') {
      performanceMode = true;
      activeUrlOverrides.push('?lite=1');
    }

    if (params.get('kiosk') === '1') {
      showAdminShortcut = false;
      activeUrlOverrides.push('?kiosk=1');
    }

    if (params.get('strike') === '1') {
      isStrike = true;
      activeUrlOverrides.push('?strike=1');
    }
  }

  // Step 1: OS prefers-reduced-motion wins over everything
  if (prefersReduced) {
    performanceMode = true;
    scoreAnimations = false;
    confetti = false;
  }

  // If performanceMode (Lite) is active, turn off animations and background effects
  if (performanceMode) {
    scoreAnimations = false;
    confetti = false;
    rays = false;
    particles = false;
    halo = false;
    dove = false;
    arches = false;
    candle = false;
    bgPreset = 'off';
  }

  return {
    bgPreset,
    performanceMode,
    isLite: performanceMode,
    showAdminShortcut,
    scoreAnimations,
    rays,
    particles,
    halo,
    dove,
    arches,
    candle,
    confetti,
    isReducedMotion: Boolean(prefersReduced),
    isStrike,
    activeUrlOverrides,
  };
}

/**
 * React hook to resolve display settings live with reactive updates.
 * Accepts optional explicitDisplay (e.g. from Admin component);
 * otherwise reads from shared store via useQuizStateReadOnly().
 */
export function useDisplaySettings(explicitDisplay?: DisplaySettings): ResolvedDisplaySettings {
  const readOnlyState = useQuizStateReadOnly();
  const display = explicitDisplay ?? readOnlyState.settings?.display;
  const strikeThroughState = (readOnlyState as unknown as { strikeThrough?: boolean })?.strikeThrough;

  const [prefersReduced, setPrefersReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return useMemo(() => {
    return resolveDisplaySettings(display, {
      prefersReduced,
      strikeThroughState,
    });
  }, [display, prefersReduced, strikeThroughState]);
}
