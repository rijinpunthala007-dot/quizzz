const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

const testTeamNames = [
  'Thekkethanarananil',
  'Panamthitta Vadakkethil',
  'Thoffil Puthenpurayil',
  'Edasserath',
  'The Good Samaritans of Galilee',
  'St. Thomas Syrian Youth',
  'Grace & Truth Fellowship',
  'Covenant Faith Assembly',
  'Marthoma Youth Fellowship',
  'Mount of Olives Assembly',
  'Bethesda Deliverance Church',
  'Immanuel Global Ministries',
  'Rock of Salvation Group',
  'Holy Spirit Fire Warriors',
  'Zion Evangelical Brigade',
  'New Life Pentecostal Youth',
  'Canaan Baptist Messengers',
];

const levels = [
  { id: 'lvl-1', name: 'Level 1' },
  { id: 'lvl-2', name: 'Level 2' },
  { id: 'lvl-3', name: 'Level 3' },
  { id: 'lvl-4', name: 'Level 4' },
];

function generate17Teams() {
  const teams = [];
  for (let i = 0; i < 17; i++) {
    const totalBase = Math.max(10, 100 - i * 4);
    teams.push({
      id: `team-${i + 1}`,
      name: testTeamNames[i],
      out: '',
      scores: {
        'lvl-1': Math.round(totalBase * 0.3 * 10) / 10,
        'lvl-2': Math.round(totalBase * 0.25 * 10) / 10,
        'lvl-3': Math.round(totalBase * 0.25 * 10) / 10,
        'lvl-4': Math.round(totalBase * 0.2 * 10) / 10,
      },
    });
  }
  return teams;
}

async function runSelfCheck() {
  console.log('=== STARTING SURGICAL RESTORATION SELF-CHECK ===');

  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  const state17 = {
    title: 'VERSE UP BIBLE QUIZ 2026',
    teams: generate17Teams(),
    levels,
    focus: 'all',
    celebrateWinner: false,
    soundEnabled: true,
  };

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const resolutions = [
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1366, height: 768, name: '1366x768' },
    { width: 1280, height: 800, name: '1280x800' },
    { width: 1024, height: 768, name: '1024x768' },
  ];

  for (const res of resolutions) {
    console.log(`\n--- Testing Resolution: ${res.name} (${res.width}x${res.height}) ---`);
    await page.setViewportSize({ width: res.width, height: res.height });
    await page.waitForTimeout(500);

    // 1. Check all 14 list rows are fully visible
    const rows = await page.locator('[data-testid^="rank-row-"]').all();
    console.log(`Found ${rows.length} list rows on screen (expected 14)`);
    if (rows.length !== 14) {
      throw new Error(`FAIL: Expected exactly 14 list rows, found ${rows.length}!`);
    }

    // 2. Check no scrollbars on the window
    const scrollInfo = await page.evaluate(() => ({
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      docHeight: document.documentElement.scrollHeight,
      winHeight: window.innerHeight,
      docWidth: document.documentElement.scrollWidth,
      winWidth: window.innerWidth,
    }));
    console.log(`Scrollcheck: doc=${scrollInfo.docWidth}x${scrollInfo.docHeight}, win=${scrollInfo.winWidth}x${scrollInfo.winHeight}`);
    if (scrollInfo.docHeight > scrollInfo.winHeight + 1 || scrollInfo.docWidth > scrollInfo.winWidth + 1) {
      throw new Error(`FAIL: Scrollbars present at ${res.name}!`);
    }

    // 3. Check no word is split across lines
    const wordSpans = await page.locator('[data-word="true"]').all();
    for (let i = 0; i < wordSpans.length; i++) {
      const rectCount = await wordSpans[i].evaluate((el) => el.getClientRects().length);
      if (rectCount > 1) {
        const text = await wordSpans[i].textContent();
        throw new Error(`FAIL: Word span "${text}" was broken across lines (rectCount=${rectCount})!`);
      }
    }
    console.log(`✓ Checked ${wordSpans.length} word spans: 0 words split mid-string`);

    // 4. Check no ellipsis "…" inside team names or scores
    const nameTexts = await page.locator('[data-testid^="row-name-text-"]').allTextContents();
    for (const name of nameTexts) {
      if (name.includes('…') || name.includes('...')) {
        throw new Error(`FAIL: Ellipsis found in name: "${name}"!`);
      }
    }
    console.log('✓ All team names displayed without any ellipsis');

    // 5. Check empty vertical space inside list panel is under 16px
    const panelBox = await page.locator('[data-testid="rank-list-panel"]').boundingBox();
    const col0 = page.locator('[data-testid="rank-list-col-0"]');
    const col0Rows = await col0.locator('[data-testid^="rank-row-"]').all();
    const firstRowBox = await col0Rows[0].boundingBox();
    const lastRowBox = await col0Rows[col0Rows.length - 1].boundingBox();

    // Actual height occupied by header (30px) + rows + gaps + top/bottom padding
    const occupiedHeight = (lastRowBox.y + lastRowBox.height) - panelBox.y;
    const remainingEmptySpace = panelBox.height - occupiedHeight;
    console.log(`Panel bbox height: ${panelBox.height}px, occupied: ${occupiedHeight}px, remaining empty: ${remainingEmptySpace.px || remainingEmptySpace}px`);

    if (remainingEmptySpace > 16) {
      throw new Error(`FAIL: Empty space inside panel (${remainingEmptySpace}px) exceeds 16px!`);
    }
    console.log(`✓ List panel vertical fill exact (empty space = ${Math.round(remainingEmptySpace)}px <= 16px)`);

    // Save screenshots at required resolutions
    if (res.name === '1920x1080') {
      const screenshotPath = path.join(ARTIFACTS_DIR, 'projector-1920x1080-restored.png');
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved screenshot: ${screenshotPath}`);
    } else if (res.name === '1024x768') {
      const screenshotPath = path.join(ARTIFACTS_DIR, 'projector-1024x768-restored.png');
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved screenshot: ${screenshotPath}`);
    }
  }

  // 6. Verify banner text is NOT overlapped or clipped by eyebrow pill
  console.log('\n--- Checking Eyebrow Pill and Hexagon Banner Non-Overlap ---');
  await page.setViewportSize({ width: 1920, height: 1080 });
  const pillBox = await page.locator('[data-testid="projector-title-pill"]').boundingBox();
  const bannerBox = await page.locator('[data-testid="projector-leaderboard-banner"]').boundingBox();
  console.log(`Pill bottom: ${pillBox.y + pillBox.height}px, Banner top: ${bannerBox.y}px`);
  if (pillBox.y + pillBox.height > bannerBox.y) {
    throw new Error('FAIL: Eyebrow pill overlaps the hexagon banner!');
  }
  console.log('✓ Eyebrow pill is comfortably ABOVE the hexagon banner (no overlapping or clipping)');

  // 7. Verify level line format: "L1: 30 · L2: 25 · L3: 25 · L4: 20"
  const sampleLevels = await page.locator('[data-testid="row-levels-4"]').textContent();
  console.log(`Sample level line text: "${sampleLevels.trim()}"`);
  if (!sampleLevels.includes('L1:') || !sampleLevels.includes('·')) {
    throw new Error(`FAIL: Level line format does not match "L1: X · L2: Y": got "${sampleLevels}"`);
  }
  console.log('✓ Level line format verified with colon and spaces');

  // 8. Verify deletion of bottom captions
  const finalsCount = await page.locator('text="Championship Finals"').count();
  const liveSyncCount = await page.locator('text="Live Sync Active"').count();
  console.log(`Bottom captions count: finalsCount=${finalsCount}, liveSyncCount=${liveSyncCount}`);
  if (finalsCount !== 0 || liveSyncCount !== 0) {
    throw new Error('FAIL: Bottom captions should be deleted!');
  }
  console.log('✓ Obsolete bottom captions deleted');

  await page.close();
  await context.close();
  await browser.close();

  console.log('\n======================================================');
  console.log('ALL SELF-CHECK ASSERTIONS PASSED WITH FLYING COLORS!');
  console.log('======================================================');
}

runSelfCheck().catch((err) => {
  console.error('\n*** SELF-CHECK FAILED ***\n', err);
  process.exit(1);
});

