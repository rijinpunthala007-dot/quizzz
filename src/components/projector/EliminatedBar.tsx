import { memo } from 'react';
import type { RankedTeam } from '../../types';

interface EliminatedBarProps {
  teams: RankedTeam[];
  isExtraLarge?: boolean;
}

function EliminatedBarComponent({ teams }: EliminatedBarProps) {
  const eliminated = teams.filter((t) => t.rank === -1 && t.out);
  if (eliminated.length === 0) return null;

  const labelText = eliminated
    .map((t) => {
      const levelShort = t.out.replace('Level ', 'L');
      return `${t.name} (${levelShort})`;
    })
    .join('  ·  ');

  const fullText = `Eliminated: ${labelText}`;
  const shouldMarquee = eliminated.length > 3 || fullText.length > 55;

  return (
    <div
      data-testid="eliminated-bar"
      className="w-full h-[28px] max-h-[28px] shrink-0 flex items-center justify-center overflow-hidden px-4 relative z-20"
    >
      <div className="w-full max-w-full overflow-hidden text-center relative flex items-center justify-center">
        {shouldMarquee ? (
          <div className="marquee-content font-medium text-red-300/75 tracking-wide tabular-nums leading-none">
            <span style={{ fontSize: '26px', fontFamily: "'Inter', sans-serif" }} className="mr-12">
              {fullText}
            </span>
            <span
              style={{ fontSize: '26px', fontFamily: "'Inter', sans-serif" }}
              className="mr-12"
              aria-hidden="true"
            >
              {fullText}
            </span>
          </div>
        ) : (
          <p
            className="font-medium text-red-300/75 tracking-wide tabular-nums truncate leading-none text-center"
            style={{
              fontSize: '26px',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {fullText}
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(EliminatedBarComponent);
