import { useState, useLayoutEffect, useRef, useCallback } from 'react';

interface UseFitTextOptions {
  maxFontSize: number;
  minFontSize: number;
  maxLines?: number;
  lineHeight?: number;
  fontFamily?: string;
}

export function useFitText(text: string, options: UseFitTextOptions) {
  const {
    maxFontSize,
    minFontSize,
    maxLines = 2,
    lineHeight = 1.05,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement | HTMLSpanElement>(null);

  const [style, setStyle] = useState<{ fontSize: number; letterSpacing: string }>({
    fontSize: maxFontSize,
    letterSpacing: 'normal',
  });

  const fit = useCallback(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el || !text) return;

    const availableWidth = container.clientWidth || 500;
    const availableHeight = container.clientHeight || 120;

    // Apply strict non-breaking word constraints
    el.style.whiteSpace = 'normal';
    el.style.overflowWrap = 'normal';
    el.style.wordBreak = 'keep-all';
    el.style.hyphens = 'none';
    el.style.lineHeight = `${lineHeight}`;
    el.style.letterSpacing = 'normal';

    let low = minFontSize;
    let high = maxFontSize;
    let bestSize = minFontSize;
    let neededTightSpacing = false;

    // Binary search for largest font size fitting inside available width and height with at most maxLines
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      el.style.fontSize = `${mid}px`;

      const scrollHeight = el.scrollHeight;
      const scrollWidth = el.scrollWidth;
      const lineBudget = mid * lineHeight * (maxLines + 0.15);

      const fitsHeight = scrollHeight <= availableHeight && scrollHeight <= lineBudget;
      const fitsWidth = scrollWidth <= availableWidth + 2;

      if (fitsHeight && fitsWidth) {
        bestSize = mid;
        low = mid + 1; // Try larger
      } else {
        high = mid - 1; // Too big
      }
    }

    // Check if at minFontSize single words still exceed container width
    el.style.fontSize = `${bestSize}px`;
    if (el.scrollWidth > availableWidth + 2 || el.scrollHeight > availableHeight) {
      neededTightSpacing = true;
      el.style.letterSpacing = '-0.02em';
    }

    setStyle({
      fontSize: bestSize,
      letterSpacing: neededTightSpacing ? '-0.02em' : 'normal',
    });
  }, [text, maxFontSize, minFontSize, maxLines, lineHeight]);

  useLayoutEffect(() => {
    fit();

    // Re-run after fonts are loaded
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(fit);
    }

    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      fit();
    });
    ro.observe(container);

    return () => ro.disconnect();
  }, [fit]);

  return { containerRef, textRef, style };
}

