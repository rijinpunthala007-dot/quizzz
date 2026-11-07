import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Level } from '../../types';

interface TabBarProps {
  levels: Level[];
  activeTab: string; // 'all' or levelId
  onTabChange?: (tabId: string) => void;
}

const TabBar = memo(function TabBar({ levels, activeTab, onTabChange }: TabBarProps) {
  const tabs = [
    { id: 'all', label: 'OVERALL' },
    ...levels.map((l) => ({ id: l.id, label: l.name.toUpperCase() })),
  ];

  return (
    <nav
      className="inline-flex items-center gap-1.5 p-1 rounded-full bg-black/35 border border-white/15 backdrop-blur-md shadow-inner select-none"
      aria-label="Quiz Leaderboard Categories"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            data-testid={`projector-tab-${tab.id}`}
            className="relative cursor-pointer focus:outline-none rounded-full"
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
              className={`relative z-10 px-5 py-1.5 block font-outfit text-xs font-black tracking-wider transition-colors duration-200 ${
                isActive
                  ? 'text-indigo-950'
                  : 'text-purple-200 hover:text-white font-semibold'
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
