import { useState, useEffect, useRef } from 'react';
import { formatScore } from '../../utils';

interface AnimatedScoreProps {
  value: number;
  duration?: number; // ms, default 600
  className?: string;
  style?: React.CSSProperties;
}

export default function AnimatedScore({
  value,
  duration = 600,
  className = '',
  style,
}: AnimatedScoreProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    if (prevValueRef.current === value) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || duration <= 0) {
      prevValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    const startVal = prevValueRef.current;
    const endVal = value;
    const startTime = performance.now();
    let frameId: number;

    const startDecimals = startVal % 1 !== 0 ? (startVal.toString().split('.')[1]?.length || 0) : 0;
    const endDecimals = endVal % 1 !== 0 ? (endVal.toString().split('.')[1]?.length || 0) : 0;
    const decimals = Math.min(Math.max(startDecimals, endDecimals), 2);
    const factor = Math.pow(10, decimals);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic: 1 - (1 - t)^3
      const ease = 1 - Math.pow(1 - progress, 3);
      const rawCurrent = startVal + (endVal - startVal) * ease;
      const current = Math.round(rawCurrent * factor) / factor;

      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endVal;
        setDisplayValue(endVal);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [value, duration]);

  return (
    <span className={`tabular-nums ${className}`} style={style}>
      {formatScore(displayValue)}
    </span>
  );
}

