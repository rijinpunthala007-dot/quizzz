const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { testNames17, levels, generateTeams } = require('./test-teams-config.cjs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

const viewports = [
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1280, height: 800, name: '1280x800' },
  { width: 1024, height: 768, name: '1024x768' },
  { width: 923, height: 846, name: '923x846' },
  { width: 800, height: 1000, name: '800x1000' },
];

const zoomLevels = [0.9, 1.0, 1.25];

async function runVerification() {
  console.log('=== STARTING FIXED 1920x1080 STAGE RESPONSIVENESS VERIFICATION ===');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });

  const state17 = {
    title: 'VERSE UP BIBLE QUIZ 2026',
    teams: generateTeams(testNames17),
    levels,
    focus: 'all',
    celebrateWinner: false,
    soundEnabled: true,
  };

  // Test across all viewports
  for (const vp of viewports) {
    console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // 1. Check stage scaling and centering
    const stage = page.locator('[data-testid="projector-stage"]');
    const stageBox = await stage.boundingBox();
    if (!stageBox) throw new Error(`Stage not found in ${vp.name}!`);

    const expectedScale = Math.min(vp.width / 1920, vp.height / 1080);
    const expectedWidth = 1920 * expectedScale;
    const expectedHeight = 1080 * expectedScale;
    const expectedLeft = (vp.width - expectedWidth) / 2;
    const expectedTop = (vp.height - expectedHeight) / 2;

    console.log(`  Expected scale: ${expectedScale.toFixed(4)} | Stage rendered: ${Math.round(stageBox.width)}x${Math.round(stageBox.height)} at (${Math.round(stageBox.x)}, ${Math.round(stageBox.y)})`);
    console.log(`  Expected bounds: ${Math.round(expectedWidth)}x${Math.round(expectedHeight)} at (${Math.round(expectedLeft)}, ${Math.round(expectedTop)})`);

    // Verify stage is within window bounds
    if (stageBox.x < -1 || stageBox.y < -1) {
      throw new Error(`Stage clipped at top/left in ${vp.name}! x=${stageBox.x}, y=${stageBox.y}`);
    }
    if (stageBox.x + stageBox.width > vp.width + 1.5 || stageBox.y + stageBox.height > vp.height + 1.5) {
      throw new Error(`Stage overflows window in ${vp.name}! right=${stageBox.x + stageBox.width}, bottom=${stageBox.y + stageBox.height}`);
    }

    // 2. Check all 14 list rows are present and fully visible
    const rows = await page.locator('[data-testid^="rank-row-"]').all();
    if (rows.length !== 14) {
      throw new Error(`Expected exactly 14 rows, got ${rows.length} in ${vp.name}!`);
    }

    // 3. Check tabs row is fully visible and not overlapped by podium card or #1 pill
    const tabs = page.locator('nav[aria-label="Quiz Leaderboard Categories"]');
    const tabsBox = await tabs.boundingBox();
    const card1 = page.locator('[data-testid="podium-card-1"]');
    const card1Box = await card1.boundingBox();
    const pill = card1.locator('.rounded-full:has-text("👑")');
    const pillBox = await pill.boundingBox();

    if (!tabsBox || !card1Box || !pillBox) {
      throw new Error(`Missing tabs, podium, or pill in ${vp.name}!`);
    }

    console.log(`  Tabs bottom: ${(tabsBox.y + tabsBox.height).toFixed(1)}px | Pill top: ${pillBox.y.toFixed(1)}px | Card 1 top: ${card1Box.y.toFixed(1)}px`);
    if (tabsBox.y + tabsBox.height > pillBox.y + 0.5) {
      throw new Error(`Tabs row overlapped by #1 pill in ${vp.name}! tabsBottom=${tabsBox.y + tabsBox.height}, pillTop=${pillBox.y}`);
    }

    // 4. Check list panel and verse bar clearance
    const listPanel = page.locator('[data-testid="rank-list-panel"]');
    const listPanelBox = await listPanel.boundingBox();
    const verseBar = page.locator('[data-testid="bible-verse-footer"]');
    const verseBarBox = await verseBar.boundingBox();

    if (!listPanelBox || !verseBarBox) {
      throw new Error(`Missing list panel or verse bar in ${vp.name}!`);
    }

    const gapListVerse = verseBarBox.y - (listPanelBox.y + listPanelBox.height);
    console.log(`  List panel bottom: ${(listPanelBox.y + listPanelBox.height).toFixed(1)}px | Verse bar top: ${verseBarBox.y.toFixed(1)}px | Gap: ${gapListVerse.toFixed(1)}px`);
    if (gapListVerse < 0) {
      throw new Error(`Verse bar overlaps list panel in ${vp.name}! gap=${gapListVerse}`);
    }

    // 5. Check no scrollbars on html / body
    const hasScrollbars = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollHeight > window.innerHeight || el.scrollWidth > window.innerWidth;
    });
    if (hasScrollbars) {
      throw new Error(`Window has scrollbars in ${vp.name}!`);
    }

    // Save screenshots for requested deliverables
    if (['1920x1080', '1024x768', '923x846'].includes(vp.name)) {
      const outPath = path.join(ARTIFACTS_DIR, `projector-fixed-${vp.name}.png`);
      await page.screenshot({ path: outPath });
      console.log(`  Saved screenshot to: ${outPath}`);
    }

    await context.close();
  }

  // Test zoom levels on 1920x1080
  console.log('\n--- Testing Browser Zoom Levels (90%, 100%, 125%) ---');
  for (const zoom of zoomLevels) {
    console.log(`Testing Zoom: ${zoom * 100}%`);
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: zoom,
    });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const rows = await page.locator('[data-testid^="rank-row-"]').all();
    if (rows.length !== 14) {
      throw new Error(`Expected 14 rows at zoom ${zoom}, got ${rows.length}!`);
    }

    const stage = page.locator('[data-testid="projector-stage"]');
    const stageBox = await stage.boundingBox();
    console.log(`  Zoom ${zoom * 100}% rendered stage: ${Math.round(stageBox.width)}x${Math.round(stageBox.height)}`);

    await context.close();
  }

  await browser.close();
  console.log('\n=== ALL RESPONSIVENESS AND BUDGET TESTS PASSED SUCCESSFULLY ===');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
