import { useState, useLayoutEffect, useRef, useCallback } from 'react';

interface UseRowNameFitOptions {
  baseNameSize: number;
  rowHeight: number;
  hasLevelLine: boolean;
  lineHeight?: number;
}

export function useRowNameFit(text: string, options: UseRowNameFitOptions) {
  const {
    baseNameSize,
    rowHeight,
    hasLevelLine,
    lineHeight = 1.05,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  // Maximum size = current name size x 1.4, but never more than 45% of row height
  const maxFontSize = Math.min(
    Math.round(baseNameSize * 1.4),
    Math.floor(rowHeight * 0.45)
  );

  // Minimum size for 1 line = current name size x 0.8
  const minOneLineSize = Math.max(16, Math.round(baseNameSize * 0.8));

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
    if (availableWidth <= 0) return;

    // Available height budget inside row
    // Row padding is 6px top + 6px bottom = 12px (or 16px)
    const verticalPadding = 14;
    const availableRowHeight = Math.max(20, rowHeight - verticalPadding);
    // Level line: text 22px + mt-0.5 + leading-tight takes ~24px
    const levelHeight = hasLevelLine ? 24 : 0;
    const maxAvailableNameHeight = Math.max(16, availableRowHeight - levelHeight);

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

    let low1 = minOneLineSize;
    let high1 = maxFontSize;
    let best1LineSize = -1;

    while (low1 <= high1) {
      const mid = Math.floor((low1 + high1) / 2);
      el.style.fontSize = `${mid}px`;

      const fitsWidth = el.scrollWidth <= availableWidth;
      const fitsHeight = mid * lineHeight <= maxAvailableNameHeight;

      if (fitsWidth && fitsHeight) {
        best1LineSize = mid;
        low1 = mid + 1; // Try larger
      } else {
        high1 = mid - 1; // Too big
      }
    }

    if (best1LineSize >= minOneLineSize) {
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

    const absoluteMin = 12;
    let low2 = absoluteMin;
    let high2 = maxFontSize;
    let best2LineSize = absoluteMin;
    let neededTightSpacing = false;

    while (low2 <= high2) {
      const mid = Math.floor((low2 + high2) / 2);
      el.style.fontSize = `${mid}px`;

      const scrollWidth = el.scrollWidth;
      const scrollHeight = el.scrollHeight;

      // 2 lines budget: mid * lineHeight * 2.15
      const twoLineHeightBudget = Math.min(maxAvailableNameHeight, mid * lineHeight * 2.15);

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
    if (el.scrollWidth > availableWidth || el.scrollHeight > maxAvailableNameHeight) {
      neededTightSpacing = true;
    }

    setStyle({
      fontSize: best2LineSize,
      letterSpacing: neededTightSpacing ? '-0.02em' : 'normal',
      isSingleLine: false,
    });
  }, [text, maxFontSize, minOneLineSize, rowHeight, hasLevelLine, lineHeight]);

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

