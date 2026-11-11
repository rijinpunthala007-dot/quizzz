import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Level } from '../../types';
import styles from './TabBar.module.css';

interface TabBarProps {
  levels: Level[];
  activeTab: string; // 'all' or levelId
  onTabChange?: (tabId: string) => void;
}

// Canvas for deterministic text width measurement
let canvasInstance: HTMLCanvasElement | null = null;
function measureTextWidth(text: string, font: string): number {
  if (typeof document === 'undefined') return text.length * 11;
  if (!canvasInstance) {
    canvasInstance = document.createElement('canvas');
  }
  const ctx = canvasInstance.getContext('2d');
  if (!ctx) return text.length * 11;
  ctx.font = font;
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = '0.05em';
  }
  let w = ctx.measureText(text).width;
  if (!('letterSpacing' in ctx)) {
    const match = font.match(/(\d+)px/);
    const size = match ? parseInt(match[1], 10) : 20;
    w += text.length * (size * 0.05);
  }
  return w;
}

const TabBar = memo(function TabBar({ levels, activeTab, onTabChange }: TabBarProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const [stageWidth, setStageWidth] = useState(1920);
  const [headerScale, setHeaderScale] = useState(1);
  const [, setFontsReady] = useState(false);

  // ResizeObserver for dynamic stage width and headerScale
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateStageW = () => {
      const stageEl = document.querySelector('[data-testid="projector-stage"]') as HTMLElement | null;
      if (stageEl && stageEl.clientWidth > 0) {
        setStageWidth(stageEl.clientWidth);
        const sh = parseFloat(window.getComputedStyle(stageEl).getPropertyValue('--s-h')) || 1;
        setHeaderScale(sh);
      } else {
        const parentW = navRef.current?.parentElement?.clientWidth;
        if (parentW && parentW > 0) {
          setStageWidth(parentW);
        } else {
          setStageWidth(window.innerWidth || 1920);
        }
      }
    };

    updateStageW();

    const stageEl = document.querySelector('[data-testid="projector-stage"]');
    if (stageEl && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => updateStageW());
      ro.observe(stageEl);
      return () => ro.disconnect();
    }
  }, []);

  // Update when fonts are ready
  useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        setFontsReady(true);
      });
    }
  }, []);

  // availableWidth = min(stageWidth − 2 × 72, 1776) / headerScale
  const availableWidth = useMemo(() => {
    const rawMax = Math.min(Math.max(600, stageWidth - 144), 1776);
    return Math.floor(rawMax / (headerScale || 1));
  }, [stageWidth, headerScale]);

  // Full tabs list
  const fullTabs = useMemo(() => [
    { id: 'all', label: 'OVERALL', index: -1, position: 0 },
    ...levels.map((l, i) => ({
      id: l.id,
      label: l.name.toUpperCase(),
      index: i,
      position: i + 1,
    })),
  ], [levels]);

  // Determine Fit Ladder Step (Step 1, Step 2, or Step 3 COMPACT MODE)
  const layout = useMemo(() => {
    const N = fullTabs.length;

    // -------------------------------------------------------------------------
    // STEP 1 CHECK: Full labels at today's font size (inactive 20, active 22, padX 24, gap 8)
    // -------------------------------------------------------------------------
    let step1TextW = 0;
    for (const tab of fullTabs) {
      const isAct = activeTab === tab.id;
      const font = `bold ${isAct ? 22 : 20}px 'Outfit', sans-serif`;
      step1TextW += measureTextWidth(tab.label, font);
    }
    const step1TotalW = 16 + step1TextW + (N - 1) * 8 + 2 * N * 24;

    if (step1TotalW <= availableWidth) {
      return {
        step: 1 as const,
        mode: 'full' as const,
        inactiveFontSize: 20,
        activeFontSize: 22,
        padX: 24,
        gap: 8,
      };
    }

    // -------------------------------------------------------------------------
    // STEP 2 CHECK: Shrink label size down to 16px labels and 10px padding
    // -------------------------------------------------------------------------
    if (levels.length < 14) {
      for (let f = 20; f >= 16; f--) {
        for (const g of [8, 6]) {
          let textW = 0;
          for (const tab of fullTabs) {
            const isAct = activeTab === tab.id;
            const font = `bold ${isAct ? Math.min(22, f + 2) : f}px 'Outfit', sans-serif`;
            textW += measureTextWidth(tab.label, font);
          }
          const rem = availableWidth - 16 - textW - (N - 1) * g;
          const pX = Math.floor(rem / (2 * N));
          if (pX >= 10) {
            return {
              step: 2 as const,
              mode: 'full' as const,
              inactiveFontSize: f,
              activeFontSize: Math.min(22, f + 2),
              padX: Math.min(24, pX),
              gap: g,
            };
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // STEP 3: COMPACT MODE
    // -------------------------------------------------------------------------
    // Windowing when levels > 50: show Overall, active level, and 15 levels before & after
    const totalLevels = levels.length;
    const activeLevelIdx = levels.findIndex((l) => l.id === activeTab);

    type CompactItem = {
      type: 'overall' | 'level' | 'ellipsis';
      id: string;
      position?: number;
      label?: string;
      isActive: boolean;
    };

    const items: CompactItem[] = [];

    // Always include Overall first
    items.push({
      type: 'overall',
      id: 'all',
      label: 'OVERALL',
      isActive: activeTab === 'all',
    });

    if (totalLevels <= 50) {
      for (let i = 0; i < totalLevels; i++) {
        items.push({
          type: 'level',
          id: levels[i].id,
          position: i + 1,
          label: levels[i].name.toUpperCase(),
          isActive: levels[i].id === activeTab,
        });
      }
    } else {
      // Windowed mode above 50 levels
      let startIdx = 0;
      let endIdx = totalLevels - 1;

      if (activeLevelIdx >= 0) {
        startIdx = Math.max(0, activeLevelIdx - 15);
        endIdx = Math.min(totalLevels - 1, activeLevelIdx + 15);
      } else {
        // Overall is active, show first 31 levels
        startIdx = 0;
        endIdx = Math.min(totalLevels - 1, 30);
      }

      if (startIdx > 0) {
        items.push({
          type: 'ellipsis',
          id: 'ellipsis-start',
          isActive: false,
        });
      }

      for (let i = startIdx; i <= endIdx; i++) {
        items.push({
          type: 'level',
          id: levels[i].id,
          position: i + 1,
          label: levels[i].name.toUpperCase(),
          isActive: levels[i].id === activeTab,
        });
      }

      if (endIdx < totalLevels - 1) {
        items.push({
          type: 'ellipsis',
          id: 'ellipsis-end',
          isActive: false,
        });
      }
    }

    // Calculate dimensions for compact mode
    const isOverallActive = activeTab === 'all';
    const tight = items.length > 35;
    const overallFont = isOverallActive ? 18 : 16;
    const overallPadX = isOverallActive ? (tight ? 12 : 18) : (tight ? 10 : 14);
    const overallW = measureTextWidth('OVERALL', `bold ${overallFont}px 'Outfit', sans-serif`) + 2 * overallPadX;

    // Active level tab (if a level is active)
    let activeLevelW = 0;
    let activeLevelFont = 18;
    let activeLevelPadX = tight ? 10 : 16;
    if (!isOverallActive && activeLevelIdx >= 0) {
      const activeName = levels[activeLevelIdx].name.toUpperCase();
      // Fit to 320px, shrinking to 16px, never ellipsis
      for (let f = 20; f >= 16; f--) {
        activeLevelFont = f;
        const textW = measureTextWidth(activeName, `bold ${f}px 'Outfit', sans-serif`);
        if (textW + 2 * activeLevelPadX <= 320 || f === 16) {
          activeLevelW = Math.min(320, textW + 2 * activeLevelPadX);
          break;
        }
      }
    }

    // Space for inactive chips & gaps
    const inactiveItems = items.filter((it) => !it.isActive);
    const numChips = inactiveItems.length;
    const numGaps = Math.max(1, items.length - 1);

    const spaceForChipsAndGaps = Math.max(50, availableWidth - 16 - overallW - activeLevelW);

    let chipWidth = 36;
    let gap = 6;
    let found = false;

    // Try ideal combinations (36px down to 28px chip, 6px down to 4px gap)
    for (let cW = 36; cW >= 28; cW--) {
      for (let g = 6; g >= 4; g--) {
        if (numChips * cW + numGaps * g <= spaceForChipsAndGaps) {
          chipWidth = cW;
          gap = g;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    // If still doesn't fit (e.g. 50 levels with long custom name), shrink further down to 24px and 2px gap
    if (!found) {
      for (let cW = 28; cW >= 24; cW--) {
        for (let g = 3; g >= 2; g--) {
          if (numChips * cW + numGaps * g <= spaceForChipsAndGaps) {
            chipWidth = cW;
            gap = g;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    // Fallback if extreme edge case
    if (!found) {
      const totalPerChip = spaceForChipsAndGaps / Math.max(1, numChips + numGaps);
      gap = Math.max(2, Math.floor(totalPerChip * 0.15));
      chipWidth = Math.max(20, Math.floor((spaceForChipsAndGaps - numGaps * gap) / Math.max(1, numChips)));
    }

    const chipFontSize = chipWidth >= 32 ? 18 : (chipWidth >= 26 ? 16 : 14);

    return {
      step: 3 as const,
      mode: 'compact' as const,
      items,
      overallW,
      overallFont,
      overallPadX,
      activeLevelW,
      activeLevelFont,
      activeLevelPadX,
      chipWidth,
      chipFontSize,
      gap,
    };
  }, [fullTabs, levels, activeTab, availableWidth]);

  return (
    <nav
      ref={navRef}
      className="inline-flex items-center p-1.5 rounded-full bg-black/35 border border-white/15 backdrop-blur-md shadow-inner select-none flex-nowrap whitespace-nowrap shrink-0"
      style={{
        maxWidth: `${availableWidth}px`,
        gap: `${layout.gap}px`,
        height: '44px',
        boxSizing: 'border-box',
      }}
      aria-label="Quiz Leaderboard Categories"
    >
      {layout.mode === 'full' ? (
        // =====================================================================
        // STEP 1 & STEP 2: FULL LABELS
        // =====================================================================
        fullTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const fontSize = isActive ? layout.activeFontSize : layout.inactiveFontSize;

          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              data-testid={`projector-tab-${tab.id}`}
              style={{ padding: `4px ${layout.padX}px` }}
              className="relative cursor-pointer focus:outline-none rounded-full shrink-0 flex items-center justify-center"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-amber-400 rounded-full shadow-[0_0_18px_rgba(251,191,36,0.45)]"
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}
              <span
                style={{ fontSize: `${fontSize}px` }}
                className={`relative z-10 block font-outfit tracking-wider transition-colors duration-200 leading-none ${
                  isActive
                    ? 'text-indigo-950 font-black'
                    : 'text-purple-200 hover:text-white font-bold'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })
      ) : (
        // =====================================================================
        // STEP 3: COMPACT MODE (Chips for inactive levels, full name for active)
        // =====================================================================
        layout.items.map((item) => {
          if (item.type === 'ellipsis') {
            return (
              <div
                key={item.id}
                className="shrink-0 flex items-center justify-center select-none"
                style={{ width: `${Math.min(24, layout.chipWidth)}px` }}
              >
                <span className="font-outfit text-purple-300/60 font-bold leading-none text-sm">
                  …
                </span>
              </div>
            );
          }

          const isActive = item.isActive;
          const isOverall = item.type === 'overall';

          // Dimensions & styling
          let btnStyle: React.CSSProperties;
          if (isOverall) {
            btnStyle = {
              padding: `4px ${layout.overallPadX}px`,
              minWidth: `${layout.overallW}px`,
            };
          } else if (isActive) {
            btnStyle = {
              padding: `4px ${layout.activeLevelPadX}px`,
              maxWidth: '320px',
              minWidth: '64px',
            };
          } else {
            // Inactive level chip
            btnStyle = {
              width: `${layout.chipWidth}px`,
              minWidth: `${layout.chipWidth}px`,
              padding: '4px 0',
            };
          }

          const fontSize = isOverall
            ? layout.overallFont
            : isActive
              ? layout.activeLevelFont
              : layout.chipFontSize;

          const displayText = isOverall
            ? 'OVERALL'
            : isActive
              ? item.label || ''
              : String(item.position || '');

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onTabChange?.(item.id)}
              data-testid={`projector-tab-${item.id}`}
              style={btnStyle}
              className="relative cursor-pointer focus:outline-none rounded-full shrink-0 flex items-center justify-center"
            >
              {isActive && (
                <div
                  className="absolute inset-0 bg-amber-400 rounded-full shadow-[0_0_18px_rgba(251,191,36,0.45)] pointer-events-none transition-opacity duration-200"
                  style={{ animation: 'tabFadeIn 200ms ease-out' }}
                />
              )}
              <span
                key={isActive ? 'active' : 'inactive'}
                style={{ fontSize: `${fontSize}px` }}
                className={`relative z-10 block font-outfit tracking-wider leading-none whitespace-nowrap ${styles.tabFadeIn} ${
                  isActive
                    ? 'text-indigo-950 font-black'
                    : 'text-purple-200 hover:text-white font-bold'
                }`}
              >
                {displayText}
              </span>
            </button>
          );
        })
      )}
    </nav>
  );
});

export default TabBar;
