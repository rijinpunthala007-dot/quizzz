const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTests() {
  console.log('🚀 Launching Edge browser via Playwright...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  const viewports = [
    { name: '1920x1080', width: 1920, height: 1080, saveScreenshot: true },
    { name: '1917x897', width: 1917, height: 897, saveScreenshot: true },
    { name: '1280x720', width: 1280, height: 720, saveScreenshot: true },
    { name: '1024x768', width: 1024, height: 768, saveScreenshot: true },
  ];

  let allPassed = true;

  for (const vp of viewports) {
    console.log(`\n========================================`);
    console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) with 17 Demo Groups`);
    console.log(`========================================`);

    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });

    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:5173/?demo=1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); // Wait for fonts and overflow check to complete

    // 1. Verify stage presence and bounds
    const stage = page.locator('[data-testid="projector-stage"]');
    await stage.waitFor({ state: 'visible' });

    // 2. Check window scrollbars (should be 0 scrollbar overflow)
    const windowMetrics = await page.evaluate(() => ({
      docScrollHeight: document.documentElement.scrollHeight,
      docClientHeight: document.documentElement.clientHeight,
      docScrollWidth: document.documentElement.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
      bodyOverflow: window.getComputedStyle(document.body).overflow,
    }));

    console.log('Window metrics:', windowMetrics);
    if (windowMetrics.docScrollHeight > windowMetrics.docClientHeight) {
      console.error(`❌ Window has vertical scrollbar! ${windowMetrics.docScrollHeight} > ${windowMetrics.docClientHeight}`);
      allPassed = false;
    } else {
      console.log('✅ Zero window vertical scrolling');
    }

    // 3. Inspect DevOverflowChecker report
    const report = await page.evaluate(() => window.__STAGE_OVERFLOW_REPORT__);
    console.log('Stage overflow report:', report);

    if (!report || !report.ok) {
      console.error('❌ Stage Overflow Checker detected issues:', report ? report.errors : 'No report found');
      allPassed = false;
    } else {
      console.log('✅ Stage Overflow Checker: 0 overflows, 0 collisions');
    }

    // 4. Verify all elements are present
    const podiumNames = await page.locator('[data-testid^="podium-name-"]').allTextContents();
    console.log('Podium teams:', podiumNames);

    const listRowRanks = await page.locator('[data-testid^="rank-row-"]').allTextContents();
    console.log(`List rows count: ${listRowRanks.length}`);

    const eliminatedText = await page.locator('[data-testid="eliminated-bar"]').textContent().catch(() => '');
    console.log('Eliminated bar text:', eliminatedText.trim());

    const verseText = await page.locator('[data-testid="bible-verse-footer"]').textContent().catch(() => '');
    console.log('Verse footer text:', verseText.trim());

    if (vp.saveScreenshot) {
      const screenshotPath = path.join(SCREENSHOT_DIR, `projector-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }

    await page.close();
  }

  // Next, test dynamic group counts: 5, 14, 30 groups at 1920x1080
  const groupCountsToTest = [5, 14, 30];

  for (const count of groupCountsToTest) {
    console.log(`\n========================================`);
    console.log(`Testing Dynamic Group Count: ${count} Groups at 1920x1080`);
    console.log(`========================================`);

    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    });

    // Populate state in localStorage directly
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((teamCount) => {
      const levels = [
        { id: 'l1', name: 'Level 1' },
        { id: 'l2', name: 'Level 2' },
        { id: 'l3', name: 'Level 3' },
        { id: 'l4', name: 'Level 4' },
      ];

      const teams = [];
      for (let i = 1; i <= teamCount; i++) {
        const name = i === 1
          ? 'The Good Samaritans of Galilee'
          : `Team Alpha ${i}`;
        const scores = {
          l1: Math.floor(Math.random() * 50 + 20),
          l2: Math.floor(Math.random() * 50 + 20),
          l3: Math.floor(Math.random() * 50 + 20),
          l4: Math.floor(Math.random() * 50 + 20),
        };
        teams.push({
          id: `team-${i}`,
          name,
          out: '',
          scores,
        });
      }

      const state = {
        title: `Verse Up Bible Quiz - ${teamCount} Teams`,
        focus: 'all',
        levels,
        teams,
      };

      localStorage.setItem('bible-quiz-state', JSON.stringify(state));
    }, count);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const report = await page.evaluate(() => window.__STAGE_OVERFLOW_REPORT__);
    console.log(`Group count ${count} report:`, report);

    if (!report || !report.ok) {
      console.error(`❌ Issues with ${count} groups:`, report ? report.errors : 'No report');
      allPassed = false;
    } else {
      console.log(`✅ ${count} groups passed with 0 overflows`);
    }

    await page.close();
  }

  await browser.close();

  if (!allPassed) {
    console.error('\n❌ SOME VERIFICATION CHECKS FAILED!');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL VERIFICATION CHECKS PASSED PERFECTLY!');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
