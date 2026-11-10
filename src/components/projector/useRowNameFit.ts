import { useState, useLayoutEffect, useRef, useCallback } from 'react';

interface UseRowNameFitOptions {
  baseNameSize: number;
  rowHeight: number;
  lineHeight?: number;
}

export function useRowNameFit(text: string, options: UseRowNameFitOptions) {
  const {
    baseNameSize,
    rowHeight,
    lineHeight = 1.05,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  // Maximum size: about 1.35 x today's maximum (today's max was min(baseNameSize * 1.4, floor(rowHeight * 0.45)))
  const todayMax = Math.min(
    Math.round(baseNameSize * 1.4),
    Math.floor(rowHeight * 0.45)
  );
  const maxFontSize = Math.round(todayMax * 1.35);

  // Minimum size for 1 line = current name size x 0.8 (unchanged)
  const minOneLineSize = Math.max(16, Math.round(baseNameSize * 0.8));
  // Absolute minimum for 2 lines (unchanged)
  const absoluteMin = 12;

  const [style, setStyle] = useState<{
    fontSize: number;
    letterSpacing: string;
    isSingleLine: boolean;
  }>({
    fontSize: maxFontSize,
    letterSpacing: 'normal',
    isSingleLine: true,
  });

  const fit = useCallback(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el || !text) return;

    const availableWidth = container.clientWidth;
    // Available height budget inside row: row height minus row vertical padding
    const availableHeight = container.clientHeight > 0
      ? container.clientHeight
      : Math.max(20, rowHeight - 12);

    if (availableWidth <= 0 || availableHeight <= 0) return;

    // Apply strict non-breaking word boundaries
    el.style.wordBreak = 'keep-all';
    el.style.overflowWrap = 'normal';
    el.style.hyphens = 'none';
    el.style.lineHeight = `${lineHeight}`;
    el.style.letterSpacing = 'normal';

    // -----------------------------------------------------------------
    // PHASE 1: Try ONE line first (between minOneLineSize and maxFontSize)
    // -----------------------------------------------------------------
    el.style.whiteSpace = 'nowrap';
    el.style.width = 'auto';

    let low1 = minOneLineSize;
    let high1 = maxFontSize;
    let best1LineSize = -1;

    while (low1 <= high1) {
      const mid = Math.floor((low1 + high1) / 2);
      el.style.fontSize = `${mid}px`;

      const fitsWidth = el.scrollWidth <= availableWidth;
      const fitsHeight = el.scrollHeight <= availableHeight;

      if (fitsWidth && fitsHeight) {
        best1LineSize = mid;
        low1 = mid + 1; // Try larger
      } else {
        high1 = mid - 1; // Too big
      }
    }

    if (best1LineSize >= minOneLineSize) {
      el.style.fontSize = `${best1LineSize}px`;
      setStyle({
        fontSize: best1LineSize,
        letterSpacing: 'normal',
        isSingleLine: true,
      });
      return;
    }

    // -----------------------------------------------------------------
    // PHASE 2: Does not fit on 1 line at min size -> Allow a second line!
    // -----------------------------------------------------------------
    el.style.whiteSpace = 'normal';
    el.style.width = `${availableWidth}px`;

    let low2 = absoluteMin;
    let high2 = maxFontSize;
    let best2LineSize = absoluteMin;
    let neededTightSpacing = false;

    while (low2 <= high2) {
      const mid = Math.floor((low2 + high2) / 2);
      el.style.fontSize = `${mid}px`;

      const scrollWidth = el.scrollWidth;
      const scrollHeight = el.scrollHeight;

      // 2 lines budget: mid * lineHeight * 2.2, capped by availableHeight
      const twoLineHeightBudget = Math.min(availableHeight, mid * lineHeight * 2.2);

      const fitsWidth = scrollWidth <= availableWidth;
      const fitsHeight = scrollHeight <= twoLineHeightBudget;

      if (fitsWidth && fitsHeight) {
        best2LineSize = mid;
        low2 = mid + 1;
      } else {
        high2 = mid - 1;
      }
    }

    el.style.fontSize = `${best2LineSize}px`;
    if (el.scrollWidth > availableWidth || el.scrollHeight > availableHeight) {
      neededTightSpacing = true;
    }

    setStyle({
      fontSize: best2LineSize,
      letterSpacing: neededTightSpacing ? '-0.02em' : 'normal',
      isSingleLine: false,
    });
  }, [text, maxFontSize, minOneLineSize, absoluteMin, rowHeight, lineHeight]);

  useLayoutEffect(() => {
    fit();

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
