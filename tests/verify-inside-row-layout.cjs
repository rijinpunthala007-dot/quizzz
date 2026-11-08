const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { testNames17, testNames7, levels, generateTeams } = require('./test-teams-config.cjs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

async function verifyRows(page, layoutDesc) {
  console.log(`\n--- Running assertions for: ${layoutDesc} ---`);
  const rows = await page.locator('[data-testid^="rank-row-"]').all();
  console.log(`Found ${rows.length} rows.`);

  if (rows.length === 0) {
    throw new Error('No rows found!');
  }

  const rowHeights = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowBox = await row.boundingBox();
    if (!rowBox) throw new Error(`Row ${i} has no bounding box!`);
    rowHeights.push(Math.round(rowBox.height));

    const nameZone = row.locator('[data-testid^="row-name-zone-"]');
    const nameText = row.locator('[data-testid^="row-name-text-"]');
    const scoreZone = row.locator('[data-testid^="row-score-zone-"]');
    const nameBlock = row.locator('[data-testid^="row-name-block-"]');

    const nameTextBox = await nameText.boundingBox();
    const scoreZoneBox = await scoreZone.boundingBox();
    const nameBlockBox = await nameBlock.boundingBox();

    if (!nameTextBox || !scoreZoneBox || !nameBlockBox) {
      throw new Error(`Row ${i} missing boxes!`);
    }

    const textContent = (await nameText.innerText()).trim();

    // 1. Assert: No ellipsis "..." or "…"
    if (textContent.includes('...') || textContent.includes('…')) {
      throw new Error(`Row ${i} contains ellipsis! Name: "${textContent}"`);
    }

    // 2. Assert: No overlap between name block / text and score
    if (nameBlockBox.x + nameBlockBox.width > scoreZoneBox.x + 1) {
      throw new Error(
        `Row ${i} name block overlaps score! nameBlock right: ${nameBlockBox.x + nameBlockBox.width}, score left: ${scoreZoneBox.x}`
      );
    }
    if (nameTextBox.x + nameTextBox.width > scoreZoneBox.x + 1) {
      throw new Error(
        `Row ${i} name text overlaps score! nameText right: ${nameTextBox.x + nameTextBox.width}, score left: ${scoreZoneBox.x}`
      );
    }

    // 3. Assert: Word boundaries - No single word broken across lines
    const wordSpans = await nameText.locator('[data-word="true"]').all();
    for (const wSpan of wordSpans) {
      const rectCount = await wSpan.evaluate((el) => el.getClientRects().length);
      const wText = await wSpan.innerText();
      if (rectCount > 1) {
        throw new Error(`Word "${wText}" in row ${i} is split across ${rectCount} lines!`);
      }
    }

    // 4. Check gap between name text and score for long names
    const gapToScore = scoreZoneBox.x - (nameTextBox.x + nameTextBox.width);
    console.log(
      `  Row ${i + 4} ("${textContent.replace(/\n/g, ' ')}"): height=${Math.round(rowBox.height)}px, nameWidth=${Math.round(nameTextBox.width)}px, gapToScore=${Math.round(gapToScore)}px`
    );
  }

  // Check row heights consistency (all rows must have identical height)
  const firstHeight = rowHeights[0];
  const allSameHeight = rowHeights.every((h) => Math.abs(h - firstHeight) <= 1);
  if (!allSameHeight) {
    throw new Error(`Row heights are not consistent: ${rowHeights.join(', ')}`);
  }
  console.log(`All rows have consistent height: ${firstHeight}px`);
}

async function run() {
  console.log('=== STARTING INSIDE ROW LAYOUT VERIFICATION ===');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // -------------------------------------------------------------
  // TEST 1: 2-Column Layout (17 teams)
  // -------------------------------------------------------------
  console.log('\n>>> TEST 1: 2-Column Layout (17 teams)');
  const state17 = {
    title: 'VERSE UP BIBLE QUIZ 2026',
    teams: generateTeams(testNames17),
    levels,
    focus: 'all',
    celebrateWinner: false,
    soundEnabled: true,
  };

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await verifyRows(page, '2-Column Layout (17 teams)');

  // Capture AFTER screenshot of list panel
  const panel = page.locator('[data-testid="rank-list-panel"]');
  const afterImgPath = path.join(ARTIFACTS_DIR, 'list-after-inside-layout.png');
  await panel.screenshot({ path: afterImgPath });
  console.log(`Captured AFTER screenshot to: ${afterImgPath}`);

  // -------------------------------------------------------------
  // TEST 2: 1-Column Layout (7 teams total, 4 in list)
  // -------------------------------------------------------------
  console.log('\n>>> TEST 2: 1-Column Layout (7 teams)');
  const state7 = {
    title: 'VERSE UP BIBLE QUIZ 2026',
    teams: generateTeams(testNames7),
    levels,
    focus: 'all',
    celebrateWinner: false,
    soundEnabled: true,
  };

  await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state7);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await verifyRows(page, '1-Column Layout (7 teams)');

  console.log('\n=== ALL INSIDE ROW LAYOUT TESTS PASSED ===');
  await browser.close();
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
}
