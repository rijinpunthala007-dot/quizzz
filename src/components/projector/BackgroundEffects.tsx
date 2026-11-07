import { memo } from 'react';

interface BackgroundEffectsProps {
  isLight?: boolean;
}

const BackgroundEffects = memo(function BackgroundEffects({ isLight = false }: BackgroundEffectsProps) {
  if (isLight) {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 900px 500px at 50% 280px, rgba(138, 106, 31, 0.05) 0%, transparent 70%)',
          }}
        />
        <div className="film-grain" style={{ opacity: 0.025 }} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Stitch Royal Violet Gradient Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2b1485] via-[#3a1da3] to-[#250f6d]" />

      {/* Atmospheric Ambient Glows */}
      <div className="absolute -top-16 left-1/4 w-[600px] h-[500px] bg-violet-600/35 blur-[130px]" />
      <div className="absolute top-20 right-1/4 w-[600px] h-[500px] bg-fuchsia-600/25 blur-[140px]" />
      <div className="absolute top-96 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-amber-500/15 blur-[160px]" />

      {/* Subtle fine film grain to eliminate color banding */}
      <div className="film-grain" style={{ opacity: 0.03 }} />
    </div>
  );
});

export default BackgroundEffects;
