import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RankedTeam, Level } from '../../types';

interface BibleVerseFooterProps {
  teams: RankedTeam[];
  levels: Level[];
  focus?: string;
}

const BIBLE_VERSES = [
  { text: '“I can do all things through Christ which strengtheneth me.”', ref: 'Philippians 4:13' },
  { text: '“Thy word is a lamp unto my feet, and a light unto my path.”', ref: 'Psalm 119:105' },
  { text: '“Trust in the LORD with all your heart, and lean not on your own understanding.”', ref: 'Proverbs 3:5' },
  { text: '“The grass withers, the flower fades, but the word of our God will stand forever.”', ref: 'Isaiah 40:8' },
  { text: '“Be strong and of a good courage; be not afraid, neither be thou dismayed.”', ref: 'Joshua 1:9' },
  { text: '“The Lord is my shepherd; I shall not want.”', ref: 'Psalm 23:1' },
];

const BibleVerseFooter = memo(function BibleVerseFooter({
  teams,
}: BibleVerseFooterProps) {
  const [verseIndex, setVerseIndex] = useState(0);

  // Cross-fade verses every 12 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setVerseIndex((prev) => (prev + 1) % BIBLE_VERSES.length);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const currentVerse = BIBLE_VERSES[verseIndex];

  // Eliminated teams formatting
  const eliminated = teams.filter((t) => Boolean(t.out));
  const hasEliminated = eliminated.length > 0;
  const eliminatedText = hasEliminated
    ? eliminated.map((t) => `${t.name} (${t.out || 'Out'} • ${t.focusScore} pts)`).join(' • ')
    : '';

  return (
    <div
      data-testid="bible-verse-footer"
      className="w-full flex flex-col gap-1.5 shrink-0 select-none overflow-hidden"
    >
      {/* 1. Scripture Card in Deep Royal Violet with Gold Border */}
      <div className="w-full bg-[#1b0b52]/90 border border-amber-400/40 backdrop-blur-md rounded-2xl py-2 px-6 text-center shadow-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={verseIndex}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="flex items-center justify-center gap-3"
          >
            <p className="font-playfair text-sm md:text-base italic text-amber-100 leading-normal m-0 p-0 font-medium">
              {currentVerse.text}
            </p>
            <span className="font-outfit text-xs md:text-sm font-black text-amber-400 tracking-wider uppercase shrink-0">
              — {currentVerse.ref} —
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. Elimination & Live Sync Status Strip */}
      <div className="flex items-center justify-between text-xs text-white/90 px-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasEliminated ? (
            <div className="flex items-center gap-2 truncate" data-testid="eliminated-bar">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
              <span className="truncate">
                <strong className="text-rose-200">Eliminated:</strong>{' '}
                <span className="text-purple-200">{eliminatedText}</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-purple-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
              <span>Championship Finals • All contenders active</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-purple-200/90 font-outfit shrink-0 pl-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wider">Live Sync Active</span>
        </div>
      </div>
    </div>
  );
});

export default BibleVerseFooter;
