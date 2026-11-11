import { memo, useState, useEffect, useRef } from 'react';
import { useDisplaySettings } from '../../hooks/useDisplaySettings';
import styles from './AmbientFX.module.css';

interface AmbientFXProps {
  leaderId?: string;
  levelId?: string;
}

// Deterministic light motes (18 for soft, 30 for full)
const MOTES_CONFIG = [
  // First 18 (Soft & Full) - gentle, balanced spread across the 1920px stage
  { x: '5%', size: '4px', duration: '18s', delay: '0.8s', sway: '14px', type: 'gold' as const },
  { x: '11%', size: '6px', duration: '16s', delay: '5.2s', sway: '-16px', type: 'ivory' as const },
  { x: '17%', size: '5px', duration: '21s', delay: '11.0s', sway: '18px', type: 'gold' as const },
  { x: '23%', size: '7px', duration: '15s', delay: '2.5s', sway: '-15px', type: 'ivory' as const },
  { x: '29%', size: '4px', duration: '20s', delay: '8.1s', sway: '17px', type: 'gold' as const },
  { x: '35%', size: '6px', duration: '17s', delay: '13.4s', sway: '-19px', type: 'ivory' as const },
  { x: '41%', size: '8px', duration: '19s', delay: '4.0s', sway: '15px', type: 'gold' as const },
  { x: '47%', size: '5px', duration: '22s', delay: '9.7s', sway: '-18px', type: 'ivory' as const },
  { x: '53%', size: '6px', duration: '16s', delay: '0.2s', sway: '20px', type: 'gold' as const },
  { x: '59%', size: '4px', duration: '18s', delay: '6.4s', sway: '-14px', type: 'ivory' as const },
  { x: '65%', size: '7px', duration: '15s', delay: '12.0s', sway: '16px', type: 'gold' as const },
  { x: '71%', size: '5px', duration: '21s', delay: '3.1s', sway: '-20px', type: 'ivory' as const },
  { x: '77%', size: '8px', duration: '17s', delay: '8.8s', sway: '18px', type: 'gold' as const },
  { x: '83%', size: '4px', duration: '19s', delay: '14.2s', sway: '-15px', type: 'ivory' as const },
  { x: '88%', size: '6px', duration: '16s', delay: '1.7s', sway: '19px', type: 'gold' as const },
  { x: '92%', size: '5px', duration: '22s', delay: '7.3s', sway: '-17px', type: 'ivory' as const },
  { x: '96%', size: '6px', duration: '18s', delay: '10.9s', sway: '15px', type: 'gold' as const },
  { x: '14%', size: '5px', duration: '20s', delay: '15.5s', sway: '-18px', type: 'ivory' as const },

  // Next 12 (Full only) - richer celestial layering
  { x: '8%', size: '5px', duration: '19.5s', delay: '3.5s', sway: '17px', type: 'gold' as const },
  { x: '20%', size: '4px', duration: '16.5s', delay: '9.2s', sway: '-19px', type: 'ivory' as const },
  { x: '26%', size: '7px', duration: '18.2s', delay: '1.4s', sway: '14px', type: 'gold' as const },
  { x: '38%', size: '5px', duration: '21.5s', delay: '6.8s', sway: '-17px', type: 'ivory' as const },
  { x: '44%', size: '8px', duration: '15.8s', delay: '12.6s', sway: '19px', type: 'gold' as const },
  { x: '50%', size: '4px', duration: '20.4s', delay: '5.6s', sway: '-16px', type: 'ivory' as const },
  { x: '62%', size: '6px', duration: '17.2s', delay: '11.1s', sway: '18px', type: 'gold' as const },
  { x: '68%', size: '5px', duration: '22.8s', delay: '2.4s', sway: '-14px', type: 'ivory' as const },
  { x: '74%', size: '7px', duration: '18.0s', delay: '7.9s', sway: '16px', type: 'gold' as const },
  { x: '80%', size: '4px', duration: '16.8s', delay: '13.7s', sway: '-18px', type: 'ivory' as const },
  { x: '86%', size: '6px', duration: '21.0s', delay: '4.8s', sway: '15px', type: 'gold' as const },
  { x: '94%', size: '5px', duration: '19.0s', delay: '10.2s', sway: '-16px', type: 'ivory' as const },
];

/**
 * Gothic Stained-Glass Pointed Arch SVG
 */
function StainedGlassArch() {
  return (
    <svg viewBox="0 0 180 330" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="fxArchGold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE27A" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#F5C542" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FFE27A" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="fxGlassTint1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5A623" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#C084FC" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="fxGlassTint2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F472B6" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Outer Pointed Gothic Arch Frame */}
      <path
        d="M 10 330 L 10 140 A 160 160 0 0 1 90 20 A 160 160 0 0 1 170 140 L 170 330 Z"
        fill="url(#fxGlassTint1)"
        stroke="url(#fxArchGold)"
        strokeWidth="1.2"
      />

      {/* Inner Gothic Lancet Arch 1 (Left) */}
      <path
        d="M 22 330 L 22 180 A 70 70 0 0 1 90 110 L 90 330 Z"
        fill="url(#fxGlassTint2)"
        stroke="url(#fxArchGold)"
        strokeWidth="0.9"
        strokeDasharray="4 2"
      />

      {/* Inner Gothic Lancet Arch 2 (Right) */}
      <path
        d="M 90 330 L 90 110 A 70 70 0 0 1 158 180 L 158 330 Z"
        fill="url(#fxGlassTint2)"
        stroke="url(#fxArchGold)"
        strokeWidth="0.9"
        strokeDasharray="4 2"
      />

      {/* Rose Trefoil Tracery Circle in Arch Peak */}
      <circle
        cx="90"
        cy="75"
        r="28"
        stroke="url(#fxArchGold)"
        strokeWidth="1"
        fill="rgba(255, 226, 122, 0.04)"
      />
      <circle cx="90" cy="62" r="10" stroke="url(#fxArchGold)" strokeWidth="0.8" fill="none" />
      <circle cx="79" cy="81" r="10" stroke="url(#fxArchGold)" strokeWidth="0.8" fill="none" />
      <circle cx="101" cy="81" r="10" stroke="url(#fxArchGold)" strokeWidth="0.8" fill="none" />

      {/* Decorative Finial Cross at Top */}
      <path d="M 90 12 L 90 22 M 85 16 L 95 16" stroke="url(#fxArchGold)" strokeWidth="1" />
    </svg>
  );
}

/**
 * White Dove SVG with golden glow and olive branch
 */
function DoveSvg() {
  return (
    <svg viewBox="0 0 100 70" fill="none" className={styles.doveSvg}>
      <defs>
        <linearGradient id="fxDoveBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#FFFBEB" />
          <stop offset="100%" stopColor="#FEF3C7" />
        </linearGradient>
        <linearGradient id="fxDoveWingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Lower Wing */}
      <path
        d="M 40 38 C 30 50 15 56 5 52 C 18 42 30 38 42 36 Z"
        fill="url(#fxDoveWingGrad)"
        stroke="#FFE27A"
        strokeWidth="0.6"
      />

      {/* Main Upper Wing */}
      <path
        d="M 46 32 C 40 10 65 2 82 0 C 74 14 62 26 50 34 Z"
        fill="url(#fxDoveWingGrad)"
        stroke="#FFE27A"
        strokeWidth="0.8"
      />

      {/* Dove Body & Head */}
      <path
        d="M 88 34 C 82 28 72 30 64 32 C 50 36 36 40 20 38 C 12 37 4 44 2 50 C 14 48 26 44 38 42 C 52 40 68 42 78 40 C 84 39 88 36 88 34 Z"
        fill="url(#fxDoveBody)"
        stroke="#F5C542"
        strokeWidth="0.8"
      />

      {/* Eye */}
      <circle cx="82" cy="33" r="1.2" fill="#78350F" />

      {/* Beak & Olive Leaf */}
      <path d="M 88 34 L 95 35 L 89 37 Z" fill="#F59E0B" />
      <path
        d="M 93 35 C 97 32 102 33 100 36 C 96 38 93 35 93 35 Z"
        fill="#10B981"
        stroke="#059669"
        strokeWidth="0.5"
      />
    </svg>
  );
}

/**
 * AmbientFX Component
 * Provides subtle spiritual ambience layer for the Projector view.
 * Strictly background layer (z-index 0, pointer-events none, aria-hidden true).
 */
const AmbientFX = memo(function AmbientFX({ leaderId, levelId }: AmbientFXProps) {
  const { bgPreset, rays, particles, arches, dove, isLite } = useDisplaySettings();
  const fxMode = isLite ? 'off' : bgPreset;

  // Document visibility to pause animations
  const [isHidden, setIsHidden] = useState(false);
  useEffect(() => {
    const handleVis = () => setIsHidden(document.hidden);
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, []);

  // Dove animation trigger on leader change OR level change
  const [showDove, setShowDove] = useState(false);
  const [flightKey, setFlightKey] = useState(0);
  const initialLeaderRef = useRef<string | null>(null);
  const initialLevelRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dove || isLite) return;

    if (!isInitializedRef.current) {
      // First load or refresh: record current leader and level without triggering dove
      isInitializedRef.current = true;
      initialLeaderRef.current = leaderId ?? null;
      initialLevelRef.current = levelId ?? null;
      return;
    }

    const levelChanged = levelId !== undefined && levelId !== initialLevelRef.current;
    const leaderChanged = leaderId !== undefined && leaderId !== initialLeaderRef.current;

    if (levelChanged || leaderChanged) {
      initialLevelRef.current = levelId ?? null;
      initialLeaderRef.current = leaderId ?? null;

      // Trigger dove animation with reset key
      setFlightKey((k) => k + 1);
      setShowDove(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setShowDove(false);
      }, 5000);
    }
  }, [leaderId, levelId, dove, isLite]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // If in Lite performance mode, render nothing
  if (isLite) {
    return null;
  }

  // Active motes: 18 for soft, 30 for full
  const activeMotes = bgPreset === 'full' ? MOTES_CONFIG : MOTES_CONFIG.slice(0, 18);

  return (
    <div
      aria-hidden="true"
      data-testid="ambient-fx-root"
      data-fx-mode={fxMode}
      data-hidden={isHidden ? 'true' : 'false'}
      className={styles.ambientRoot}
    >
      {/* A. Light Rays (Soft & Full) */}
      <div
        data-testid="ambient-rays"
        style={{
          opacity: rays ? 1 : 0,
          transition: 'opacity 400ms ease-out',
          pointerEvents: 'none',
        }}
      >
        <div className={styles.raysLayer} />
      </div>

      {/* B. Rising Light Motes (Soft: 18, Full: 30) */}
      <div
        data-testid="ambient-motes"
        style={{
          opacity: particles ? 1 : 0,
          transition: 'opacity 400ms ease-out',
          pointerEvents: 'none',
        }}
      >
        <div className={styles.motesLayer}>
          {activeMotes.map((mote, idx) => (
            <div
              key={idx}
              className={mote.type === 'gold' ? styles.moteGold : styles.moteIvory}
              style={
                {
                  '--fx-x': mote.x,
                  '--fx-size': mote.size,
                  '--fx-duration': mote.duration,
                  '--fx-delay': mote.delay,
                  '--fx-sway': mote.sway,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>

      {/* D. Dove on New Leader or Level Change (5s flight across top with golden trail) */}
      {showDove && (
        <div key={flightKey} data-testid="ambient-dove" className={styles.doveFlight}>
          <div className={styles.doveTrail} />
          <DoveSvg />
        </div>
      )}

      {/* E. Stained-Glass Arches (Full Only, with 400ms opacity transition) */}
      <div
        data-testid="ambient-arches"
        style={{
          opacity: arches ? 1 : 0,
          transition: 'opacity 400ms ease-out',
          pointerEvents: 'none',
        }}
      >
        <div data-testid="ambient-arch-left" className={styles.archLeft}>
          <StainedGlassArch />
        </div>
        <div data-testid="ambient-arch-right" className={styles.archRight}>
          <StainedGlassArch />
        </div>
      </div>
    </div>
  );
});

export default AmbientFX;

