const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';
const baseState = JSON.parse(fs.readFileSync('tests/user-initial-state.json', 'utf8'));

// Test datasets
const realNamesSnapshot = [
  { id: 't-real-1', name: 'THOPPIL', total: 42, rank: 1, displayRank: '1', isTied: false },
  { id: 't-real-2', name: 'PUTHENPURAYIL', total: 8, rank: 2, displayRank: '2', isTied: false },
  { id: 't-real-3', name: 'PSYCHO SIMON', total: 3, rank: 3, displayRank: '3', isTied: false },
];

const longestNamesSnapshot = [
  { id: 't-long-1', name: 'The Good Samaritans of Galilee', total: 269, rank: 1, displayRank: '1', isTied: false },
  { id: 't-long-2', name: "Puthenpurayil St. Mary's Malankara Orthodox Church Youth", total: 258, rank: 2, displayRank: '2', isTied: false },
  { id: 't-long-3', name: 'Pneumonoultramicroscopic', total: 229, rank: 3, displayRank: '3', isTied: false },
];

const tieForFirstSnapshot = [
  { id: 't-tie-1', name: 'THOPPIL', total: 42, rank: 1, displayRank: 'T-1', isTied: true },
  { id: 't-tie-2', name: 'PUTHENPURAYIL', total: 42, rank: 1, displayRank: 'T-1', isTied: true },
  { id: 't-tie-3', name: 'PSYCHO SIMON', total: 3, rank: 3, displayRank: '3', isTied: false },
];

const RESOLUTIONS = [
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 1917, height: 897, name: '1917x897' },
  { width: 1280, height: 720, name: '1280x720' },
  { width: 1024, height: 768, name: '1024x768' },
];

async function runTests() {
  console.log('================================================================');
  console.log('STARTING WINNERS CELEBRATION COMPREHENSIVE VERIFICATION SUITE');
  console.log('================================================================');

  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
  });

  let totalPassed = 0;
  let totalFailed = 0;

  function assert(condition, message) {
    if (condition) {
      totalPassed++;
      console.log(`  ✓ ${message}`);
    } else {
      totalFailed++;
      console.error(`  ✗ FAIL: ${message}`);
    }
  }

  // Helper to evaluate layout assertions in browser context
  async function evaluateCardLayout(page, label) {
    console.log(`\n--- Asserting layout for: ${label} ---`);
    const results = await page.evaluate(() => {
      const issues = [];
      const cardRanks = [1, 2, 3];

      // Check footer visibility
      const footer = document.querySelector('[data-testid="celebration-footer"]');
      if (!footer) {
        issues.push('Footer not found in DOM');
      } else {
        const fRect = footer.getBoundingClientRect();
        const winH = window.innerHeight;
        if (fRect.bottom > winH + 1) {
          issues.push(`Footer clipped at bottom: rect.bottom (${fRect.bottom}) > window.innerHeight (${winH})`);
        }
        if (fRect.top < 0) {
          issues.push(`Footer off-screen at top: rect.top (${fRect.top}) < 0`);
        }
      }

      // Check each rank card
      for (const rank of cardRanks) {
        const cards = document.querySelectorAll(`[data-testid="celebration-card-${rank}"]`);
        if (cards.length === 0) {
          // Could happen if fewer than 3 teams or tie skipping
          continue;
        }

        cards.forEach((card, idx) => {
          const cardId = `Rank ${rank} [${idx}]`;
          const avatarZone = card.querySelector(`[data-testid="avatar-zone-${rank}"]`);
          const nameZone = card.querySelector(`[data-testid="name-zone-${rank}"]`);
          const nameText = card.querySelector(`[data-testid="name-text-${rank}"]`);
          const taglineZone = card.querySelector(`[data-testid="tagline-zone-${rank}"]`);
          const scoreZone = card.querySelector(`[data-testid="score-zone-${rank}"]`);
          const pill = card.querySelector(`[data-testid="pill-${rank}"]`);

          if (!avatarZone || !nameZone || !nameText || !taglineZone || !scoreZone || !pill) {
            issues.push(`${cardId}: Missing one or more required test zones`);
            return;
          }

          const aRect = avatarZone.getBoundingClientRect();
          const nRect = nameZone.getBoundingClientRect();
          const tRect = taglineZone.getBoundingClientRect();
          const sRect = scoreZone.getBoundingClientRect();

          // 1. Assert zero bounding box overlap between zones
          // Allow subpixel jitter (tolerance 0.5px)
          if (aRect.bottom > nRect.top + 0.5) {
            issues.push(`${cardId}: Overlap between Avatar bottom (${aRect.bottom.toFixed(1)}) and Name top (${nRect.top.toFixed(1)})`);
          }
          if (nRect.bottom > tRect.top + 0.5) {
            issues.push(`${cardId}: Overlap between Name bottom (${nRect.bottom.toFixed(1)}) and Tagline top (${tRect.top.toFixed(1)})`);
          }
          if (tRect.bottom > sRect.top + 0.5) {
            issues.push(`${cardId}: Overlap between Tagline bottom (${tRect.bottom.toFixed(1)}) and Score top (${sRect.top.toFixed(1)})`);
          }

          // 2. Assert Name fits inside nameZone (scrollHeight <= clientHeight + 1px)
          if (nameText.scrollHeight > nameZone.clientHeight + 1) {
            issues.push(`${cardId}: Name text overflows name zone: scrollHeight (${nameText.scrollHeight}) > clientHeight (${nameZone.clientHeight})`);
          }

          // 3. Assert zero mid-word breaking (span.getClientRects().length === 1 per word)
          const wordSpans = nameText.querySelectorAll('span[data-word="true"]');
          wordSpans.forEach((span) => {
            const word = span.textContent.trim();
            const rects = span.getClientRects();
            if (rects.length > 1) {
              issues.push(`${cardId}: Word "${word}" was broken across multiple lines (${rects.length} rects)!`);
            }
          });

          // 4. Assert font sizes within bounds
          const computedStyle = window.getComputedStyle(nameText);
          const fontSize = parseFloat(computedStyle.fontSize);
          if (rank === 1) {
            if (fontSize < 33.5 || fontSize > 72.5) {
              issues.push(`${cardId}: 1st place font size out of bounds (34px-72px): got ${fontSize}px`);
            }
          } else {
            if (fontSize < 27.5 || fontSize > 56.5) {
              issues.push(`${cardId}: 2nd/3rd place font size out of bounds (28px-56px): got ${fontSize}px`);
            }
          }
        });
      }

      return { issues };
    });

    if (results.issues.length === 0) {
      assert(true, `${label}: Zero overlap, zero mid-word breaking, text fitted within bounds, footer visible.`);
    } else {
      results.issues.forEach((err) => assert(false, `${label}: ${err}`));
    }
  }

  // =========================================================================
  // TEST 1: Real Team Names at 1920x1080 + Screenshot
  // =========================================================================
  const page1 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const realState = {
    ...baseState,
    celebrateWinner: true,
    winnersSnapshot: realNamesSnapshot,
  };

  await page1.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page1.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), realState);
  await page1.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page1.waitForTimeout(2500);

  await evaluateCardLayout(page1, 'Real Names @ 1920x1080');
  const realScreenshotPath = path.join(ARTIFACTS_DIR, 'winners-celebration-real-teams-1920x1080.png');
  await page1.screenshot({ path: realScreenshotPath, fullPage: true });
  console.log(`Saved screenshot: ${realScreenshotPath}`);
  await page1.close();

  // =========================================================================
  // TEST 2: Longest Names at 1920x1080 + Screenshot
  // =========================================================================
  const page2 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const longState = {
    ...baseState,
    celebrateWinner: true,
    winnersSnapshot: longestNamesSnapshot,
  };

  await page2.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page2.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), longState);
  await page2.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page2.waitForTimeout(2500);

  await evaluateCardLayout(page2, 'Longest Names @ 1920x1080');
  const longScreenshotPath = path.join(ARTIFACTS_DIR, 'winners-celebration-longest-names-1920x1080.png');
  await page2.screenshot({ path: longScreenshotPath, fullPage: true });
  console.log(`Saved screenshot: ${longScreenshotPath}`);
  await page2.close();

  // =========================================================================
  // TEST 3: Tie for 1st Place at 1920x1080 + Screenshot
  // =========================================================================
  const page3 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const tieState = {
    ...baseState,
    celebrateWinner: true,
    winnersSnapshot: tieForFirstSnapshot,
  };

  await page3.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page3.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), tieState);
  await page3.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page3.waitForTimeout(2500);

  await evaluateCardLayout(page3, 'Tie for 1st @ 1920x1080');
  const tieScreenshotPath = path.join(ARTIFACTS_DIR, 'winners-celebration-tied-for-first-1920x1080.png');
  await page3.screenshot({ path: tieScreenshotPath, fullPage: true });
  console.log(`Saved screenshot: ${tieScreenshotPath}`);
  await page3.close();

  // =========================================================================
  // TEST 4: Multi-Resolution Responsiveness (1917x897, 1280x720, 1024x768)
  // =========================================================================
  for (const res of RESOLUTIONS.slice(1)) {
    const pageRes = await browser.newPage({ viewport: { width: res.width, height: res.height } });
    await pageRes.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await pageRes.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), longState);
    await pageRes.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await pageRes.waitForTimeout(2000);

    await evaluateCardLayout(pageRes, `Longest Names @ ${res.name}`);
    await pageRes.close();
  }

  // =========================================================================
  // TEST 5: Admin Celebration Wording Card & Editing Sync (Shared Context)
  // =========================================================================
  console.log('\n--- Testing Admin Celebration Wording Card ---');
  const sharedContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const adminPage = await sharedContext.newPage();

  // Seed state with celebration active
  await adminPage.goto('http://localhost:5173/admin', { waitUntil: 'domcontentloaded' });
  await adminPage.evaluate((st) => {
    localStorage.setItem('bible-quiz-state', JSON.stringify({
      ...st,
      celebrateWinner: true,
      winnersSnapshot: [
        { id: 't-real-1', name: 'THOPPIL', total: 42, rank: 1, displayRank: '1', isTied: false },
        { id: 't-real-2', name: 'PUTHENPURAYIL', total: 8, rank: 2, displayRank: '2', isTied: false },
        { id: 't-real-3', name: 'PSYCHO SIMON', total: 3, rank: 3, displayRank: '3', isTied: false },
      ]
    }));
  }, baseState);

  await adminPage.goto('http://localhost:5173/admin', { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(1000);

  const wordingCard = adminPage.locator('[data-testid="celebration-wording-card"]');
  await wordingCard.waitFor({ state: 'visible', timeout: 5000 });
  assert(await wordingCard.isVisible(), 'Celebration wording card is visible in Admin');

  // Verify inputs
  const inputs = [
    'subtitle',
    'footerText',
    'pill1',
    'pill2',
    'pill3',
    'tagline1',
    'tagline2',
    'tagline3',
  ];

  for (const field of inputs) {
    const inputLoc = adminPage.locator(`[data-testid="wording-input-${field}"]`);
    assert(await inputLoc.isVisible(), `Input wording-input-${field} is present`);
    const maxLen = await inputLoc.getAttribute('maxlength');
    assert(maxLen === '28', `Input wording-input-${field} enforces maxLength="28"`);
  }

  // Screenshot Admin Card
  const adminScreenshotPath = path.join(ARTIFACTS_DIR, 'admin-celebration-wording-card.png');
  await adminPage.screenshot({ path: adminScreenshotPath, fullPage: false });
  console.log(`Saved screenshot: ${adminScreenshotPath}`);

  // Test Editing
  console.log('Testing wording editing...');
  const pill1Input = adminPage.locator('[data-testid="wording-input-pill1"]');
  await pill1Input.fill('QUIZ CHAMPION · #1');
  await adminPage.waitForTimeout(500);

  // Check that Projector in same context updates
  const projectorPage = await sharedContext.newPage();
  await projectorPage.setViewportSize({ width: 1920, height: 1080 });
  await projectorPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await projectorPage.waitForTimeout(1500);

  const pill1Text = await projectorPage.locator('[data-testid="pill-1"]').textContent();
  assert(pill1Text.includes('QUIZ CHAMPION · #1'), `Projector updated with edited wording: "${pill1Text}"`);
  await projectorPage.close();

  // Test Reset to Defaults
  console.log('Testing reset to defaults...');
  const resetBtn = adminPage.locator('[data-testid="admin-reset-wording-btn"]');
  await resetBtn.click();
  await adminPage.waitForTimeout(500);

  const restoredPill1 = await pill1Input.inputValue();
  assert(restoredPill1 === 'CHAMPION · #1', `Restored default pill1 wording: "${restoredPill1}"`);

  await adminPage.close();
  await sharedContext.close();
  await browser.close();

  console.log('================================================================');
  console.log(`ALL TESTS FINISHED: Passed: ${totalPassed}, Failed: ${totalFailed}`);
  console.log('================================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
