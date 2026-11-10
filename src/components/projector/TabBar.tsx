import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Level } from '../../types';

interface TabBarProps {
  levels: Level[];
  activeTab: string; // 'all' or levelId
  onTabChange?: (tabId: string) => void;
}

const TabBar = memo(function TabBar({ levels, activeTab, onTabChange }: TabBarProps) {
  const tabs = useMemo(() => [
    { id: 'all', label: 'OVERALL' },
    ...levels.map((l) => ({ id: l.id, label: l.name.toUpperCase() })),
  ], [levels]);

  // Compute font size & padding: at least 20px on 1920 stage (bold), active tab at 22px
  // If all tabs together are wider than 1500px, shrink evenly down to min 16px, never wrap into two rows.
  const { inactiveFontSize, activeFontSize, padX } = useMemo(() => {
    if (typeof document === 'undefined') {
      return { inactiveFontSize: 20, activeFontSize: 22, padX: 24 };
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { inactiveFontSize: 20, activeFontSize: 22, padX: 24 };
    }

    let totalW = 16; // nav padding & borders
    for (const tab of tabs) {
      const isAct = activeTab === tab.id;
      ctx.font = `bold ${isAct ? 22 : 20}px 'Outfit', sans-serif`;
      const textW = ctx.measureText(tab.label).width;
      totalW += textW + 48 + 8; // text + 2*24 padding + 8 gap
    }

    if (totalW <= 1500) {
      return { inactiveFontSize: 20, activeFontSize: 22, padX: 24 };
    }

    const ratio = Math.max(16 / 20, 1500 / totalW);
    const inSize = Math.max(16, Math.floor(20 * ratio));
    const actSize = Math.max(18, Math.floor(22 * ratio));
    const pX = Math.max(12, Math.floor(24 * ratio));
    return { inactiveFontSize: inSize, activeFontSize: actSize, padX: pX };
  }, [tabs, activeTab]);

  return (
    <nav
      className="inline-flex items-center gap-2 p-1.5 rounded-full bg-black/35 border border-white/15 backdrop-blur-md shadow-inner select-none flex-nowrap whitespace-nowrap max-w-[1500px] shrink-0"
      aria-label="Quiz Leaderboard Categories"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const fontSize = isActive ? activeFontSize : inactiveFontSize;

        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            data-testid={`projector-tab-${tab.id}`}
            style={{ padding: `4px ${padX}px` }}
            className="relative cursor-pointer focus:outline-none rounded-full shrink-0"
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
      })}
    </nav>
  );
});

export default TabBar;
