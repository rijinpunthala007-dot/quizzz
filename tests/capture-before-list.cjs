const { chromium } = require('playwright');
const path = require('path');
const { testNames17, levels, generateTeams } = require('./test-teams-config.cjs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

async function captureBefore() {
  console.log('Capturing BEFORE list screenshot...');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const state = {
    title: 'VERSE UP BIBLE QUIZ 2026',
    teams: generateTeams(testNames17),
    levels,
    focus: 'all',
    celebrateWinner: false,
    soundEnabled: true,
  };

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const panel = page.locator('[data-testid="rank-list-panel"]');
  const beforeImgPath = path.join(ARTIFACTS_DIR, 'list-before-inside-layout.png');
  await panel.screenshot({ path: beforeImgPath });
  console.log('Saved BEFORE screenshot to:', beforeImgPath);

  await browser.close();
}

captureBefore().catch((err) => {
  console.error('Error capturing before:', err);
  process.exit(1);
});
