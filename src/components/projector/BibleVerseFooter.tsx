import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RankedTeam, Level } from '../../types';

interface BibleVerseFooterProps {
  teams?: RankedTeam[];
  levels?: Level[];
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

const BibleVerseFooter = memo(function BibleVerseFooter(_props: BibleVerseFooterProps) {
  const [verseIndex, setVerseIndex] = useState(0);

  // Cross-fade verses every 12 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setVerseIndex((prev) => (prev + 1) % BIBLE_VERSES.length);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const currentVerse = BIBLE_VERSES[verseIndex];

  return (
    <div
      data-testid="bible-verse-footer"
      className="w-full h-[44px] bg-[#1b0b52]/90 border border-amber-400/40 backdrop-blur-md rounded-2xl px-6 flex items-center justify-center text-center shadow-lg select-none overflow-hidden shrink-0"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={verseIndex}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="flex items-center justify-center gap-3 truncate max-w-full"
        >
          <p
            data-testid="footer-scripture-text"
            className="font-playfair text-[26px] italic text-amber-100 leading-none m-0 p-0 font-medium truncate"
          >
            {currentVerse.text}
          </p>
          <span className="font-outfit text-[20px] font-black text-amber-400 tracking-wider uppercase shrink-0 leading-none">
            — {currentVerse.ref} —
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

export default BibleVerseFooter;
