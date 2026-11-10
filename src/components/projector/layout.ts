/**
 * Dynamic Stage Layout for Projector View ("/")
 * Controls stage height H, interpolation factor t, and all layout dimensions across 16:9, 16:10, 4:3, 5:4.
 */

export interface ProjectorLayout {
  stageWidth: number;
  stageHeight: number;
  H: number;
  t: number;
  s_h: number;
  s: number;
  topSpace: number;
  headerScale: number;
  headerBlockHeight: number;
  gapTabsPodium: number;
  podiumTop: number;
  podiumHeight: number;
  podiumContainerHeight: number;
  card1Height: number;
  card23Height: number;
  gapPodiumList: number;
  listPanelTop: number;
  listPanelHeight: number;
  listPanelBottom: number;
  listHeaderHeight: number;
  listBottomPadding: number;
  rowGap: number;
  rowHeight: number;
  gapListVerse: number;
  verseBarHeight: number;
  verseBarFont: number;
  bottomMargin: number;
}

/**
 * Computes stage height H given window dimensions:
 * Stage width is always 1920.
 * H = clamp(round(1920 * windowHeight / windowWidth), 1080, 1440).
 */
export function computeStageH(windowWidth: number, windowHeight: number): number {
  if (!windowWidth || !windowHeight) return 1080;
  const rawH = Math.round((1920 * windowHeight) / windowWidth);
  return Math.max(1080, Math.min(1440, rawH));
}

/**
 * layoutFor(H): returns all stage sizes interpolated with t = (H - 1080) / 360.
 * At t=0 (16:9, H=1080), all values match existing 16:9 values down to the pixel.
 * At t=1 (4:3 or squarer, H=1440), values scale to completely eliminate vertical letterboxing.
 */
export function layoutFor(H: number): ProjectorLayout {
  const clampedH = Math.max(1080, Math.min(1440, Math.round(H)));
  const t = (clampedH - 1080) / 360;

  // Scale factors
  const s_h = 1 + 0.2 * t;
  const s = 1 + 0.28 * t;

  // Linear interpolation floored to integer pixels
  const lerp = (a: number, b: number) => Math.floor(a + (b - a) * t);

  // Header block (pill, hexagon banner, tabs)
  const headerScale = s_h;
  const headerBlockHeight = lerp(132, 158);
  const topSpace = lerp(6, 8);

  // Podium
  const podiumTop = lerp(165, 200);
  const podiumHeight = lerp(295, 395);
  const podiumContainerHeight = lerp(310, 415);
  const card1Height = lerp(286, 375);
  const card23Height = lerp(250, 330);
  const gapTabsPodium = lerp(12, 14);

  // Gap between podium and list panel
  const gapPodiumList = lerp(8, 12);

  // Margins and verse bar below list panel
  const bottomMargin = lerp(6, 10);
  const verseBarHeight = lerp(44, 60);
  const verseBarFont = lerp(26, 33);
  const gapListVerse = lerp(8, 10);

  // List panel
  const listPanelTop = lerp(468, 607);
  const listPanelBottom = clampedH - bottomMargin - verseBarHeight - gapListVerse;
  const listPanelHeight = listPanelBottom - listPanelTop;

  // Inside list panel
  const listHeaderHeight = lerp(36, 44);
  const listBottomPadding = lerp(10, 14);
  const rowGap = lerp(6, 8);
  const rowHeight = Math.floor((listPanelHeight - listHeaderHeight - listBottomPadding - 6 * rowGap) / 7);

  return {
    stageWidth: 1920,
    stageHeight: clampedH,
    H: clampedH,
    t,
    s_h,
    s,
    topSpace,
    headerScale,
    headerBlockHeight,
    gapTabsPodium,
    podiumTop,
    podiumHeight,
    podiumContainerHeight,
    card1Height,
    card23Height,
    gapPodiumList,
    listPanelTop,
    listPanelHeight,
    listPanelBottom,
    listHeaderHeight,
    listBottomPadding,
    rowGap,
    rowHeight,
    gapListVerse,
    verseBarHeight,
    verseBarFont,
    bottomMargin,
  };
}

/**
 * Backward compatibility export for static references
 */
export const PROJECTOR_LAYOUT = {
  stageWidth: 1920,
  stageHeight: 1080,
  topSpace: 6,
  bannerHeight: 84,
  gapBannerTabs: 4,
  tabsHeight: 44,
  gapTabsPodium: 12,
  podiumHeight: 310,
  gapPodiumList: 8,
  listPanelHeight: 554,
  rowHeight: 67,
  gapListVerse: 8,
  verseBarHeight: 44,
  bottomSpace: 6,
} as const;

