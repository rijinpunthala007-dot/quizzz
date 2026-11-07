import { memo } from 'react';

interface RibbonBadgeProps {
  rank: number;
}

const RIBBON_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: '#f4d58d', text: '#1a1405' }, // warm gold
  2: { bg: '#8fb8e8', text: '#0b1322' }, // silver-blue
  3: { bg: '#c98a62', text: '#0b1322' }, // copper
};

function RibbonBadgeComponent({ rank }: RibbonBadgeProps) {
  const config = RIBBON_COLORS[rank] || { bg: '#9aa7bd', text: '#0b1322' };

  return (
    <div
      className="absolute top-0 left-6 z-20 flex items-start justify-center pt-2 shadow-md"
      style={{
        width: '40px',
        height: '50px',
        backgroundColor: config.bg,
        color: config.text,
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 82%, 0% 100%)',
      }}
      aria-label={`Rank ${rank}`}
    >
      <span
        className="font-bold tabular-nums text-[22px] leading-none select-none"
        style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
        }}
      >
        {rank}
      </span>
    </div>
  );
}

export default memo(RibbonBadgeComponent);

