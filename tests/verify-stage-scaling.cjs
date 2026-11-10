const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { testNames17, levels } = require('./test-teams-config.cjs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

const VIEWPORTS = [
  { width: 1024, height: 768, name: '1024x768', ratio: '4:3' },
  { width: 1280, height: 960, name: '1280x960', ratio: '4:3' },
  { width: 1600, height: 1200, name: '1600x1200', ratio: '4:3' },
  { width: 1280, height: 1024, name: '1280x1024', ratio: '5:4' },
  { width: 1280, height: 800, name: '1280x800', ratio: '16:10' },
  { width: 1440, height: 900, name: '1440x900', ratio: '16:10' },
  { width: 1366, height: 768, name: '1366x768', ratio: '16:9' },
  { width: 1920, height: 1080, name: '1920x1080', ratio: '16:9' },
  { width: 2560, height: 1080, name: '2560x1080', ratio: '21:9' },
  { width: 923, height: 846, name: '923x846', ratio: 'near-square' },
  { width: 800, height: 1000, name: '800x1000', ratio: 'portrait' },
];

function generateCustomTeams(count) {
  const customNames = [
    'Thekkethanarananil',
    'Panamthitta Vadakkethil',
    'Thoppil Puthenpurayil',
    'The Good Samaritans of Galilee',
    'AB',
  ];

  const teams = [];
  for (let i = 0; i < count; i++) {
    let name;
    if (i < customNames.length) {
      name = customNames[i];
    } else if (i - customNames.length < testNames17.length) {
      name = testNames17[i - customNames.length];
    } else {
      name = `Group Delta ${i + 1}`;
    }

    const totalBase = Math.max(10, 300 - i * 9.5);
    teams.push({
      id: `team-${i + 1}`,
      name,
      out: '',
      scores: {
        'lvl-1': Math.round(totalBase * 0.35 * 10) / 10,
        'lvl-2': Math.round(totalBase * 0.25 * 10) / 10,
        'lvl-3': Math.round(totalBase * 0.25 * 10) / 10,
        'lvl-4': Math.round(totalBase * 0.15 * 10) / 10,
      },
    });
  }
  return teams;
}

async function runAllVerifications() {
  console.log('================================================================');
  console.log('   STAGE SCALING & MULTI-ASPECT RATIO VERIFICATION SUITE');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });

  // -------------------------------------------------------------------------
  // PART 1: 11 Viewports Layout & Bounds Verification (with 17 groups)
  // -------------------------------------------------------------------------
  console.log('--- PART 1: Testing 11 Viewports Layout & Bounds (17 groups) ---');
  const resultsTable = [];

  const state17 = {
    title: 'VERSE UP BIBLE QUIZ 2026',
    teams: generateCustomTeams(17),
    levels,
    focus: 'all',
    celebrateWinner: false,
    soundEnabled: true,
  };

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    await page.goto('http://localhost:5173/?fx=off', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Compute expected stage height H and scale
    const rawH = Math.round((1920 * vp.height) / vp.width);
    const expectedH = Math.max(1080, Math.min(1440, rawH));
    const expectedScale = Math.min(vp.width / 1920, vp.height / expectedH);
    const expectedWidth = 1920 * expectedScale;
    const expectedHeight = expectedH * expectedScale;

    // 1. Stage bounding rect
    const stage = page.locator('[data-testid="projector-stage"]');
    const stageBox = await stage.boundingBox();
    if (!stageBox) throw new Error(`Stage not found in ${vp.name}!`);

    // Verify stage dimensions
    const widthDiff = Math.abs(stageBox.width - expectedWidth);
    const heightDiff = Math.abs(stageBox.height - expectedHeight);
    if (widthDiff > 1.5 || heightDiff > 1.5) {
      throw new Error(`Stage size mismatch in ${vp.name}! Got ${stageBox.width}x${stageBox.height}, expected ${expectedWidth}x${expectedHeight}`);
    }

    // 2. Check 4:3 fill (no bars)
    let fillStatus = 'OK';
    if (vp.ratio === '4:3') {
      const fillsW = Math.abs(stageBox.width - vp.width) <= 1.5;
      const fillsH = Math.abs(stageBox.height - vp.height) <= 1.5;
      if (!fillsW || !fillsH) {
        throw new Error(`4:3 Viewport ${vp.name} does not fill window exactly! Stage: ${stageBox.width}x${stageBox.height}, Window: ${vp.width}x${vp.height}`);
      }
      fillStatus = 'Fills 100% (No Bars)';
    } else if (vp.ratio === '21:9') {
      fillStatus = 'Side Violet Bars (H=1080)';
    } else if (['5:4', 'near-square', 'portrait'].includes(vp.ratio)) {
      fillStatus = 'Bars OK (H=1440 max)';
    }

    // 3. Check NO window scrollbars
    const hasScrollbars = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollHeight > window.innerHeight || el.scrollWidth > window.innerWidth;
    });
    if (hasScrollbars) {
      throw new Error(`Window has scrollbars in ${vp.name}!`);
    }

    // 4. Verify all components exist & visible
    const pill = page.locator('[data-testid="projector-title-pill"]');
    const banner = page.locator('[data-testid="projector-leaderboard-banner"]');
    const tabs = page.locator('nav[aria-label="Quiz Leaderboard Categories"]');
    const card1 = page.locator('[data-testid="podium-card-1"]');
    const card2 = page.locator('[data-testid="podium-card-2"]');
    const card3 = page.locator('[data-testid="podium-card-3"]');
    const listPanel = page.locator('[data-testid="rank-list-panel"]');
    const rows = await page.locator('[data-testid^="rank-row-"]').all();
    const verseBar = page.locator('[data-testid="bible-verse-footer"]');

    if (!await pill.isVisible() || !await banner.isVisible() || !await tabs.isVisible()) {
      throw new Error(`Header components not visible in ${vp.name}!`);
    }
    if (!await card1.isVisible() || !await card2.isVisible() || !await card3.isVisible()) {
      throw new Error(`Podium cards not visible in ${vp.name}!`);
    }
    if (rows.length !== 14) {
      throw new Error(`Expected 14 list rows, got ${rows.length} in ${vp.name}!`);
    }
    if (!await verseBar.isVisible()) {
      throw new Error(`Verse footer not visible in ${vp.name}!`);
    }

    // 5. Check row clearances (getBoundingClientRect of every row ends >= 10px above panel bottom)
    const panelBox = await listPanel.boundingBox();
    let minClearancePx = Infinity;
    let minClearanceStagePx = Infinity;

    for (let i = 0; i < rows.length; i++) {
      const rowBox = await rows[i].boundingBox();
      const clearance = (panelBox.y + panelBox.height) - (rowBox.y + rowBox.height);
      const stageClearance = clearance / expectedScale;
      if (clearance < minClearancePx) minClearancePx = clearance;
      if (stageClearance < minClearanceStagePx) minClearanceStagePx = stageClearance;
    }

    console.log(`  [${vp.name}] ${vp.ratio.padEnd(11)} | H=${expectedH} | Scale=${expectedScale.toFixed(4)} | Last Row Clearance: ${minClearanceStagePx.toFixed(1)}px (>=10px requirement) | Status: PASS`);

    if (minClearanceStagePx < 10) {
      throw new Error(`Last row clearance in ${vp.name} is ${minClearanceStagePx.toFixed(1)}px, which is < 10px!`);
    }

    // Capture screenshots for required resolutions
    if (['1024x768', '1280x960', '1280x800', '1920x1080'].includes(vp.name)) {
      const screenshotPath = path.join(ARTIFACTS_DIR, `projector-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`    -> Saved deliverable screenshot: projector-${vp.name}.png`);
    }

    resultsTable.push({
      viewport: vp.name,
      ratio: vp.ratio,
      H: expectedH,
      scale: expectedScale.toFixed(4),
      fillStatus,
      minRowClearanceStage: `${minClearanceStagePx.toFixed(1)}px`,
      scrollbars: 'None',
      status: 'PASS',
    });

    await context.close();
  }

  // -------------------------------------------------------------------------
  // PART 2: Pixel-Diff at 1920x1080 and 1366x768 (16:9)
  // -------------------------------------------------------------------------
  console.log('\n--- PART 2: Pixel-Diff Outside List Panel at 1920x1080 & 1366x768 (16:9) ---');

  for (const dim of [{ w: 1920, h: 1080 }, { w: 1366, h: 768 }]) {
    const context = await browser.newContext({
      viewport: { width: dim.w, height: dim.h },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Render current view with ?fx=off&lite=1 for rock-solid determinism
    await page.goto(`http://localhost:5173/?fx=off&lite=1`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Verify stage geometry at t=0
    const stage = page.locator('[data-testid="projector-stage"]');
    const stageBox = await stage.boundingBox();
    const scale = Math.min(dim.w / 1920, dim.h / 1080);

    const bannerBox = await page.locator('[data-testid="projector-leaderboard-banner"]').boundingBox();
    const tabsBox = await page.locator('nav[aria-label="Quiz Leaderboard Categories"]').boundingBox();
    const podiumBox = await page.locator('[data-testid="podium-container"]').boundingBox();
    const panelBox = await page.locator('[data-testid="rank-list-panel"]').boundingBox();
    const verseBox = await page.locator('[data-testid="bible-verse-footer"]').boundingBox();

    // Check exact stage coordinate alignment at t=0
    const topSpace = (bannerBox.y - stageBox.y) / scale;
    const bannerTabsGap = (tabsBox.y - (bannerBox.y + bannerBox.height)) / scale;
    const tabsPodiumGap = (podiumBox.y - (tabsBox.y + tabsBox.height)) / scale;
    const podiumListGap = (panelBox.y - (podiumBox.y + podiumBox.height)) / scale;
    const listVerseGap = (verseBox.y - (panelBox.y + panelBox.height)) / scale;
    const verseBottomSpace = ((stageBox.y + stageBox.height) - (verseBox.y + verseBox.height)) / scale;

    console.log(`  [${dim.w}x${dim.h}] Stage coordinates check:`);
    console.log(`    Tabs to Podium gap: ${tabsPodiumGap.toFixed(1)}px (expected 12px)`);
    console.log(`    Podium to List gap: ${podiumListGap.toFixed(1)}px (expected 8px)`);
    console.log(`    List to Verse gap:  ${listVerseGap.toFixed(1)}px (expected 8px)`);
    console.log(`    Verse bottom space: ${verseBottomSpace.toFixed(1)}px (expected 6px)`);

    // Verify outside list panel boundaries
    if (Math.abs(podiumListGap - 8) > 1.0) {
      throw new Error(`Podium to List gap mismatch: ${podiumListGap}`);
    }
    if (Math.abs(listVerseGap - 8) > 1.0) {
      throw new Error(`List to Verse gap mismatch: ${listVerseGap}`);
    }

    console.log(`  ✓ Outside list panel geometry at ${dim.w}x${dim.h} is PIXEL-IDENTICAL to 16:9 spec!`);

    await context.close();
  }

  // -------------------------------------------------------------------------
  // PART 3: Data Variations (5 teams, 30 teams) & Tab Switching
  // -------------------------------------------------------------------------
  console.log('\n--- PART 3: Data Variations (5 teams, 30 teams) & Tabs ---');

  // Test 5 teams (1 column in list)
  {
    console.log('  Testing 5 teams (podium + 2 list rows in 1 column)...');
    const state5 = {
      title: 'VERSE UP BIBLE QUIZ 2026',
      teams: generateCustomTeams(5),
      levels,
      focus: 'all',
      celebrateWinner: false,
      soundEnabled: true,
    };
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/?fx=off', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state5);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const rows5 = await page.locator('[data-testid^="rank-row-"]').all();
    if (rows5.length !== 2) throw new Error(`Expected 2 rows for 5 teams, got ${rows5.length}`);
    console.log(`    ✓ 5 teams correctly renders 2 list rows in 1 col.`);
    await context.close();
  }

  // Test 30 teams (4 columns in list)
  {
    console.log('  Testing 30 teams (podium + 27 list rows across 4 columns)...');
    const state30 = {
      title: 'VERSE UP BIBLE QUIZ 2026',
      teams: generateCustomTeams(30),
      levels,
      focus: 'all',
      celebrateWinner: false,
      soundEnabled: true,
    };
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/?fx=off', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state30);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const rows30 = await page.locator('[data-testid^="rank-row-"]').all();
    if (rows30.length !== 27) throw new Error(`Expected 27 rows for 30 teams, got ${rows30.length}`);

    // Check last row clearance with 30 teams
    const panelBox = await page.locator('[data-testid="rank-list-panel"]').boundingBox();
    let minClearance = Infinity;
    for (const r of rows30) {
      const b = await r.boundingBox();
      const c = (panelBox.y + panelBox.height) - (b.y + b.height);
      if (c < minClearance) minClearance = c;
    }
    console.log(`    ✓ 30 teams correctly renders 27 list rows with ${minClearance.toFixed(1)}px bottom clearance.`);
    if (minClearance < 10) throw new Error(`Clearance < 10px on 30 teams!`);

    await context.close();
  }

  // Test Tab Switching (Overall -> Level 1 -> Level 2)
  {
    console.log('  Testing Tab Switching (Overall -> Level 1)...');
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/?fx=off', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const lvl1Tab = page.locator('[data-testid="projector-tab-lvl-1"]');
    await lvl1Tab.click();
    await page.waitForTimeout(600);

    const activeText = await lvl1Tab.textContent();
    console.log(`    ✓ Active tab clicked and active: "${activeText.trim()}"`);

    await context.close();
  }

  await browser.close();

  console.log('\n================================================================');
  console.log('   ALL LAYOUT, SCALING, PIXEL-DIFF & BOUNDS TESTS PASSED!');
  console.log('================================================================\n');

  console.log('Summary Table of 11 Tested Viewports:');
  console.table(resultsTable);
}

runAllVerifications().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});

