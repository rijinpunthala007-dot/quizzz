import { useState, useLayoutEffect, useRef, useCallback } from 'react';

interface UseFitTextOptions {
  maxFontSize: number;
  minFontSize: number;
  maxLines?: number;
  lineHeight?: number;
  fontFamily?: string;
}

export interface FitTextResult {
  fontSize: number;
  scale: number;
}

/**
 * Robust binary-search text fitting hook for team names on podium cards.
 * Words never split, never ellipsis, checks 1 line first, then 2 lines.
 * Re-runs on fonts.ready and container resize.
 */
export function useFitText<T extends HTMLElement = HTMLElement>(
  text: string,
  options: UseFitTextOptions
) {
  const {
    maxFontSize,
    minFontSize,
    lineHeight = 1.05,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<T>(null);

  const [result, setResult] = useState<FitTextResult>({
    fontSize: maxFontSize,
    scale: 1,
  });

  const fit = useCallback(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el || !text) return;

    const computed = window.getComputedStyle(container);
    const padLeft = parseFloat(computed.paddingLeft) || 0;
    const padRight = parseFloat(computed.paddingRight) || 0;
    const padTop = parseFloat(computed.paddingTop) || 0;
    const padBottom = parseFloat(computed.paddingBottom) || 0;

    const availWidth = Math.max(10, container.clientWidth - padLeft - padRight);
    const availHeight = Math.max(10, container.clientHeight - padTop - padBottom);

    el.style.wordBreak = 'keep-all';
    el.style.overflowWrap = 'normal';
    el.style.hyphens = 'none';
    el.style.lineHeight = `${lineHeight}`;
    el.style.whiteSpace = 'normal';
    el.style.transform = '';

    // Step 1: Canvas 1-line check
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const checkOneLine = (size: number): boolean => {
      if (!ctx) return false;
      ctx.font = `900 ${size}px 'Cinzel', serif`;
      const textWidth = ctx.measureText(text).width;
      return textWidth <= availWidth && size * lineHeight <= availHeight;
    };

    let low = minFontSize;
    let high = maxFontSize;
    let bestOneLine = -1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (checkOneLine(mid)) {
        bestOneLine = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (bestOneLine >= minFontSize) {
      el.style.fontSize = `${bestOneLine}px`;
      if (el.scrollHeight <= availHeight + 1 && el.scrollWidth <= availWidth + 1) {
        setResult({ fontSize: bestOneLine, scale: 1 });
        return;
      }
    }

    // Step 2: Binary search in DOM allowing up to 2 lines
    low = minFontSize;
    high = bestOneLine > minFontSize ? bestOneLine - 1 : maxFontSize;
    let bestDOM = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      el.style.fontSize = `${mid}px`;
      if (el.scrollHeight <= availHeight + 1 && el.scrollWidth <= availWidth + 1) {
        bestDOM = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (bestDOM >= minFontSize) {
      el.style.fontSize = `${bestDOM}px`;
      setResult({ fontSize: bestDOM, scale: 1 });
      return;
    }

    // Step 3: Safety net scale down if still too large at minFontSize
    el.style.fontSize = `${minFontSize}px`;
    const sW = availWidth / Math.max(1, el.scrollWidth);
    const sH = availHeight / Math.max(1, el.scrollHeight);
    const scale = Math.min(1, sW, sH);

    setResult({ fontSize: minFontSize, scale });
  }, [text, maxFontSize, minFontSize, lineHeight]);

  useLayoutEffect(() => {
    fit();

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(fit);
    }

    const container = containerRef.current;
    if (!container) return;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fit);
      ro.observe(container);
    }

    const handleWindow = () => fit();
    window.addEventListener('resize', handleWindow);
    window.addEventListener('fullscreenchange', handleWindow);
    window.addEventListener('orientationchange', handleWindow);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', handleWindow);
      window.removeEventListener('fullscreenchange', handleWindow);
      window.removeEventListener('orientationchange', handleWindow);
    };
  }, [fit]);

  return { containerRef, textRef, result };
}
