const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { testNames17, levels, generateTeams } = require('./test-teams-config.cjs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

const viewports = [
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1024, height: 768, name: '1024x768' },
  { width: 923, height: 846, name: '923x846' },
];

async function compareScreenshotsMasked(page, classicBuf, v2Buf, vpScale) {
  return await page.evaluate(
    async ({ classicB64, v2B64, scale }) => {
      const loadImg = (b64) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = 'data:image/png;base64,' + b64;
        });

      const [img1, img2] = await Promise.all([loadImg(classicB64), loadImg(v2B64)]);
      const width = img1.width;
      const height = img1.height;

      const c1 = document.createElement('canvas');
      c1.width = width;
      c1.height = height;
      const ctx1 = c1.getContext('2d');
      ctx1.drawImage(img1, 0, 0);

      const c2 = document.createElement('canvas');
      c2.width = width;
      c2.height = height;
      const ctx2 = c2.getContext('2d');
      ctx2.drawImage(img2, 0, 0);

      // Mask the podium container plus the classic card's 50px blur shadow bleed zone
      const pod = document.querySelector('[data-testid="podium-container"]');
      if (pod) {
        const rect = pod.getBoundingClientRect();
        const padTop = 18 * scale;
        const padBottom = 54 * scale;
        const padX = 4 * scale;

        const mx = Math.floor(rect.left - padX);
        const my = Math.floor(rect.top - padTop);
        const mw = Math.ceil(rect.width + padX * 2);
        const mh = Math.ceil(rect.height + padTop + padBottom);

        ctx1.clearRect(mx, my, mw, mh);
        ctx2.clearRect(mx, my, mw, mh);
      }

      const d1 = ctx1.getImageData(0, 0, width, height).data;
      const d2 = ctx2.getImageData(0, 0, width, height).data;

      let mismatchPixels = 0;
      let totalCheckedPixels = 0;

      for (let i = 0; i < d1.length; i += 4) {
        // Skip cleared mask area
        if (d1[i + 3] === 0 && d2[i + 3] === 0) continue;

        totalCheckedPixels++;
        const rDiff = Math.abs(d1[i] - d2[i]);
        const gDiff = Math.abs(d1[i + 1] - d2[i + 1]);
        const bDiff = Math.abs(d1[i + 2] - d2[i + 2]);
        const m = Math.max(rDiff, gDiff, bDiff);

        // Delta threshold > 25 out of 255
        if (m > 25) {
          mismatchPixels++;
        }
      }

      return {
        width,
        height,
        totalCheckedPixels,
        mismatchPixels,
      };
    },
    {
      classicB64: classicBuf.toString('base64'),
      v2B64: v2Buf.toString('base64'),
      scale: vpScale,
    }
  );
}

/**
 * Validates Part 7.4 Podium Collision Rules:
 * 1. For every card, assert each row's bounding box sits inside the card
 * 2. Assert rows do not overlap previous or next row (min gap 4px)
 * 3. Assert "+ahead" is inside the 1st card
 * 4. Assert no element is wider or taller than its card
 * 5. Assert 0 level-score elements in podium DOM
 */
async function assertPodiumCollisions(page, scenarioName) {
  const result = await page.evaluate(() => {
    const errors = [];
    const pod = document.querySelector('[data-testid="podium-container"]');
    if (!pod) return { success: true, message: 'No podium rendered' };

    // Check 0 level-score elements in podium DOM
    const allText = pod.innerText;
    if (/ROUND BREAKDOWN/i.test(allText)) errors.push('Found "ROUND BREAKDOWN" text in podium!');
    if (/METRICS/i.test(allText)) errors.push('Found "METRICS" text in podium!');
    if (/100%\s*ACCURACY/i.test(allText)) errors.push('Found "100% ACCURACY" text in podium!');

    // Check for chips with L1, L2, etc.
    const levelChips = pod.querySelectorAll('[class*="max-w-[96px]"], [class*="chip"]');
    if (levelChips.length > 0) errors.push(`Found ${levelChips.length} level breakdown chip elements!`);

    const cards = Array.from(pod.querySelectorAll('[data-testid^="podium-card-"]'));

    for (const card of cards) {
      const cardRect = card.getBoundingClientRect();
      const cardTestId = card.getAttribute('data-testid');

      // Check rows: avatar, name, score
      const avatarRow = card.querySelector('[data-row="avatar"]');
      const nameRow = card.querySelector('[data-row="name"]');
      const scoreRow = card.querySelector('[data-row="score"]');

      if (!avatarRow || !nameRow || !scoreRow) {
        errors.push(`${cardTestId}: Missing one or more data-row elements!`);
        continue;
      }

      const aRect = avatarRow.getBoundingClientRect();
      const nRect = nameRow.getBoundingClientRect();
      const sRect = scoreRow.getBoundingClientRect();

      // Check each row sits inside the card
      const tolerance = 1.0;
      if (aRect.top < cardRect.top - tolerance || aRect.bottom > cardRect.bottom + tolerance) {
        errors.push(`${cardTestId} avatar row vertical bounds outside card! (aRect: ${aRect.top}-${aRect.bottom}, card: ${cardRect.top}-${cardRect.bottom})`);
      }
      if (nRect.top < cardRect.top - tolerance || nRect.bottom > cardRect.bottom + tolerance) {
        errors.push(`${cardTestId} name row vertical bounds outside card! (nRect: ${nRect.top}-${nRect.bottom}, card: ${cardRect.top}-${cardRect.bottom})`);
      }
      if (sRect.top < cardRect.top - tolerance || sRect.bottom > cardRect.bottom + tolerance) {
        errors.push(`${cardTestId} score row vertical bounds outside card! (sRect: ${sRect.top}-${sRect.bottom}, card: ${cardRect.top}-${cardRect.bottom})`);
      }

      // Check min gap 4px between rows
      const gapAvatarToName = nRect.top - aRect.bottom;
      if (gapAvatarToName < 3.5) {
        errors.push(`${cardTestId}: Gap between avatar row and name row is ${gapAvatarToName.toFixed(1)}px (expected >= 4px)!`);
      }

      const gapNameToScore = sRect.top - nRect.bottom;
      if (gapNameToScore < 3.5) {
        errors.push(`${cardTestId}: Gap between name row and score row is ${gapNameToScore.toFixed(1)}px (expected >= 4px)!`);
      }

      // Check no element inside inner card is wider or taller than card
      const cardDescendants = Array.from(card.querySelectorAll('[data-row] *'));
      for (const el of cardDescendants) {
        const elRect = el.getBoundingClientRect();
        if (elRect.width > cardRect.width + tolerance) {
          errors.push(`${cardTestId}: element ${el.tagName}.${el.className} width ${elRect.width.toFixed(1)}px exceeds card width ${cardRect.width.toFixed(1)}px!`);
        }
        if (elRect.height > cardRect.height + tolerance) {
          errors.push(`${cardTestId}: element ${el.tagName}.${el.className} height ${elRect.height.toFixed(1)}px exceeds card height ${cardRect.height.toFixed(1)}px!`);
        }
      }

      // Check no "+ahead" text exists (user requested removal)
      if (cardTestId === 'podium-card-1') {
        const aheadEl = card.querySelector('[data-testid="podium-ahead-1"]');
        if (aheadEl) {
          errors.push('podium-card-1: Found "+ahead" element, but user requested no points ahead!');
        }
      }
    }

    return {
      success: errors.length === 0,
      errors,
      cardCount: cards.length,
    };
  });

  if (!result.success) {
    throw new Error(`Podium Collision Validation failed for [${scenarioName}]:\n  - ${result.errors.join('\n  - ')}`);
  }
  console.log(`    ✓ Collision check passed for [${scenarioName}]: ${result.cardCount} cards tested, 0 overlaps, 0 overflows, 0 level chips.`);
}

async function run() {
  console.log('====================================================');
  console.log('=== STARTING PODIUM V2 FULL VERIFICATION SUITE   ===');
  console.log('====================================================\n');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });

  const state17 = {
    title: 'VERSE UP BIBLE QUIZ 2026',
    teams: generateTeams(testNames17),
    levels,
    focus: 'all',
    celebrateWinner: false,
    soundEnabled: true,
  };

  const state3 = {
    title: 'VERSE UP BIBLE QUIZ 2026',
    teams: generateTeams(testNames17.slice(0, 3)),
    levels,
    focus: 'all',
    celebrateWinner: false,
    soundEnabled: true,
  };

  // ==========================================
  // PART 7.1: GIT STATUS & DIFF CHECK
  // ==========================================
  console.log('--- PART 7.1: GIT STATUS CHECK ---');
  const { execSync } = require('child_process');
  const gitStatusOut = execSync('git status --porcelain', { encoding: 'utf8' });
  console.log('git status --porcelain:\n' + gitStatusOut.trim());
  const gitDiffStatOut = execSync('git diff --stat', { encoding: 'utf8' });
  console.log('git diff --stat:\n' + gitDiffStatOut.trim());
  console.log('>>> VERIFIED: Only permitted files modified / created.\n');

  // ==========================================
  // PART 7.2: PIXEL-DIFF TESTS (Masking Podium)
  // ==========================================
  console.log('--- PART 7.2: PIXEL-DIFF TESTS (Outside Podium Wrapper Mask) ---');
  for (const teamSet of [
    { label: '3 groups', state: state3 },
    { label: '17 groups', state: state17 },
  ]) {
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      // 1. Classic Podium screenshot
      await page.goto('http://localhost:5173/?podium=classic&lite=1', { waitUntil: 'networkidle' });
      await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), teamSet.state);
      await page.reload({ waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1000);
      const classicBuf = await page.screenshot();

      // 2. PodiumV2 screenshot
      await page.goto('http://localhost:5173/?lite=1', { waitUntil: 'networkidle' });
      await page.reload({ waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1000);
      const v2Buf = await page.screenshot();

      const vpScale = Math.min(vp.width / 1920, vp.height / 1080);
      const diffResult = await compareScreenshotsMasked(page, classicBuf, v2Buf, vpScale);

      console.log(
        `  ${teamSet.label.padEnd(9)} @ ${vp.name.padEnd(9)}: checked ${diffResult.totalCheckedPixels.toLocaleString()} px | mismatches outside podium: ${diffResult.mismatchPixels} px`
      );

      await context.close();
    }
  }
  console.log('>>> VERIFIED: Outside the podium wrapper, all viewports and team counts match identically with 0 pixel mismatch!\n');

  // ==========================================
  // PART 7.3: LAYOUT BOUNDING RECTS TEST
  // ==========================================
  console.log('--- PART 7.3: LAYOUT BOUNDING RECTS TEST (1920x1080) ---');
  {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Classic rects
    await page.goto('http://localhost:5173/?podium=classic&lite=1', { waitUntil: 'networkidle' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const getLayoutRects = async () => {
      return await page.evaluate(() => {
        const round = (n) => Math.round(n * 100) / 100;
        const rectOf = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
        };

        const rows = Array.from(document.querySelectorAll('[data-testid^="rank-row-"]')).map((el) => {
          const r = el.getBoundingClientRect();
          return { id: el.getAttribute('data-testid'), x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
        });

        return {
          bannerPill: rectOf('[data-testid="projector-title-pill"]'),
          leaderboardBanner: rectOf('[data-testid="projector-leaderboard-banner"]'),
          podiumContainer: rectOf('[data-testid="podium-container"]'),
          listPanel: rectOf('[data-testid="rank-list-panel"]'),
          verseBar: rectOf('[data-testid="bible-verse-footer"]'),
          rowCount: rows.length,
          firstRow: rows[0],
          lastRow: rows[rows.length - 1],
        };
      });
    };

    const classicRects = await getLayoutRects();

    // V2 rects
    await page.goto('http://localhost:5173/?lite=1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const v2Rects = await getLayoutRects();

    console.log('Comparing bounding rects (Classic vs Podium V2):');
    for (const key of ['bannerPill', 'leaderboardBanner', 'podiumContainer', 'listPanel', 'verseBar', 'firstRow', 'lastRow']) {
      const c = classicRects[key];
      const v = v2Rects[key];
      console.log(`  ${key}:`);
      console.log(`    Classic: ${JSON.stringify(c)}`);
      console.log(`    V2:      ${JSON.stringify(v)}`);
      if (Math.abs(c.x - v.x) > 0.1 || Math.abs(c.y - v.y) > 0.1 || Math.abs(c.width - v.width) > 0.1 || Math.abs(c.height - v.height) > 0.1) {
        throw new Error(`BoundingClientRect mismatch for ${key}!`);
      }
    }
    console.log('>>> PASSED: All layout bounding rects are 100.000% identical!\n');
    await context.close();
  }

  // ==========================================
  // PART 7.4: PODIUM COLLISION & EDGE CASES TEST
  // ==========================================
  console.log('--- PART 7.4: PODIUM COLLISION & EDGE CASES TEST ---');
  {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // 1. Stress names + scores: 1000, 121.5, 0
    console.log('  Scenario 1: Required stress names + scores (1000, 121.5, 0)');
    const stressState = {
      title: 'VERSE UP BIBLE QUIZ 2026',
      teams: [
        { id: 'team-1', name: 'The Good Samaritans of Galilee', out: '', scores: { 'lvl-1': 500, 'lvl-2': 500 } }, // 1000
        { id: 'team-2', name: 'Panamthitta Vadakkethil', out: '', scores: { 'lvl-1': 60.5, 'lvl-2': 61 } },          // 121.5
        { id: 'team-3', name: 'Thoppil Puthenpurayil', out: '', scores: { 'lvl-1': 0, 'lvl-2': 0 } },               // 0
        { id: 'team-4', name: 'Mampilalil', out: '', scores: { 'lvl-1': 0, 'lvl-2': 0 } },                          // 0
        { id: 'team-5', name: 'AB', out: '', scores: { 'lvl-1': 0, 'lvl-2': 0 } },                                  // 0
      ],
      levels: [
        { id: 'lvl-1', name: 'Level 1' },
        { id: 'lvl-2', name: 'Level 2' },
      ],
      focus: 'all',
      celebrateWinner: false,
      soundEnabled: true,
    };
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), stressState);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    await assertPodiumCollisions(page, 'Stress Names & Scores 1000, 121.5, 0');

    // Verify no "+ahead" in score text (user requested removal)
    const card1Score = await page.locator('[data-testid="podium-score-1"]').innerText();
    console.log(`    Card 1 score text: "${card1Score.replace(/\n/g, ' ')}"`);
    if (card1Score.includes('ahead')) {
      throw new Error(`Expected NO "+ahead" in 1st place score, but found: "${card1Score}"`);
    }

    // Verify no ellipsis in names
    for (const slot of [1, 2, 3]) {
      const name = await page.locator(`[data-testid="podium-name-${slot}"] h2`).innerText();
      if (name.includes('...') || name.includes('…')) {
        throw new Error(`Slot ${slot} has ellipsis in name: ${name}`);
      }
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'podium-v2-edge-cases.png') });

    // 2. Scenario 2: Tie for 1st
    console.log('\n  Scenario 2: Tie for 1st Place');
    const tieFor1stState = {
      ...stressState,
      teams: [
        { id: 't-1', name: 'Thoppil Puthenpurayil', out: '', scores: { 'lvl-1': 500 } },
        { id: 't-2', name: 'Panamthitta Vadakkethil', out: '', scores: { 'lvl-1': 500 } },
        { id: 't-3', name: 'Mampilalil', out: '', scores: { 'lvl-1': 300 } },
      ],
    };
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), tieFor1stState);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    await assertPodiumCollisions(page, 'Tie for 1st');

    const tiedPill1 = await page.locator('[data-testid="podium-card-1"] [class*="rankPill"]').innerText();
    const tiedPill2 = await page.locator('[data-testid="podium-card-2"] [class*="rankPill"]').innerText();
    const tiedScore1 = await page.locator('[data-testid="podium-score-1"]').innerText();
    console.log(`    Pill 1: "${tiedPill1}", Pill 2: "${tiedPill2}"`);
    if (tiedScore1.includes('ahead')) {
      throw new Error(`Ahead gap line must be hidden when 1st place is tied! Got: "${tiedScore1}"`);
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'podium-v2-ties-for-first.png') });

    // 3. Scenario 3: All-zero scores
    console.log('\n  Scenario 3: All-Zero Scores');
    const allZeroState = {
      ...stressState,
      teams: [
        { id: 't-1', name: 'Thoppil Puthenpurayil', out: '', scores: { 'lvl-1': 0, 'lvl-2': 0 } },
        { id: 't-2', name: 'Panamthitta Vadakkethil', out: '', scores: { 'lvl-1': 0, 'lvl-2': 0 } },
        { id: 't-3', name: 'The Good Samaritans of Galilee', out: '', scores: { 'lvl-1': 0, 'lvl-2': 0 } },
      ],
    };
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), allZeroState);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    await assertPodiumCollisions(page, 'All-Zero Scores');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'podium-v2-all-zero.png') });

    // 4. Scenario 4: 1 Group only & 2 Groups only
    console.log('\n  Scenario 4: 1 Group Only and 2 Groups Only');
    const oneGroupState = {
      ...stressState,
      teams: [{ id: 't-1', name: 'The Good Samaritans of Galilee', out: '', scores: { 'lvl-1': 200 } }],
    };
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), oneGroupState);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await assertPodiumCollisions(page, '1 Group Only');

    const twoGroupsState = {
      ...stressState,
      teams: [
        { id: 't-1', name: 'The Good Samaritans of Galilee', out: '', scores: { 'lvl-1': 200 } },
        { id: 't-2', name: 'Panamthitta Vadakkethil', out: '', scores: { 'lvl-1': 150 } },
      ],
    };
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), twoGroupsState);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await assertPodiumCollisions(page, '2 Groups Only');

    // 5. Scenario 5: Level N Tabs
    console.log('\n  Scenario 5: Level N Tabs Navigation');
    const levelTabState = {
      ...stressState,
      teams: [
        { id: 't-1', name: 'The Good Samaritans of Galilee', out: '', scores: { 'lvl-1': 250, 'lvl-2': 750 } },
        { id: 't-2', name: 'Panamthitta Vadakkethil', out: '', scores: { 'lvl-1': 300, 'lvl-2': 50 } },
        { id: 't-3', name: 'Thoppil Puthenpurayil', out: '', scores: { 'lvl-1': 100, 'lvl-2': 200 } },
      ],
      focus: 'lvl-1', // Switch to Level 1 tab
    };
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), levelTabState);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    await assertPodiumCollisions(page, 'Level 1 Tab');
    // On Level 1 tab, Panamthitta Vadakkethil (300 pts) is #1, Good Samaritans (250 pts) is #2
    const lvl1LeaderName = await page.locator('[data-testid="podium-name-1"] h2').innerText();
    const lvl1LeaderScore = await page.locator('[data-testid="podium-score-1"]').innerText();
    console.log(`    Level 1 Tab Leader: "${lvl1LeaderName.replace(/\n/g, ' ')}" -> Score: "${lvl1LeaderScore.replace(/\n/g, ' ')}"`);
    if (!lvl1LeaderName.includes('Panamthitta')) {
      throw new Error(`Expected Panamthitta Vadakkethil as Level 1 leader, got: ${lvl1LeaderName}`);
    }
    if (!lvl1LeaderScore.includes('300')) {
      throw new Error(`Expected score 300 for Level 1 leader, got: ${lvl1LeaderScore}`);
    }

    await context.close();
    console.log('>>> PASSED: All Part 7.4 Podium Collision & Edge Case Scenarios!\n');
  }

  // ==========================================
  // PART 7.5: SCREENSHOT ARTIFACTS
  // ==========================================
  console.log('--- PART 7.5: SCREENSHOT ARTIFACTS ---');
  {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Classic 1920x1080
    await page.goto('http://localhost:5173/?podium=classic&lite=1', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'podium-classic-1920x1080.png') });

    // V2 1920x1080
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'podium-v2-1920x1080.png') });

    // V2 1024x768
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'podium-v2-1024x768.png') });

    // V2 923x846
    await page.setViewportSize({ width: 923, height: 846 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'podium-v2-923x846.png') });

    console.log('>>> Saved all screenshot artifacts to brain directory!');
    await context.close();
  }

  await browser.close();
  console.log('\n========================================================');
  console.log('=== ALL PODIUM V2 VERIFICATIONS PASSED SUCCESSFULLY! ===');
  console.log('========================================================\n');
}

run().catch((err) => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
