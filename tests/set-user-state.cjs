const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';
const userState = JSON.parse(fs.readFileSync('tests/user-initial-state.json', 'utf8'));

async function setRealState() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  await page.evaluate((st) => {
    localStorage.setItem('bible-quiz-state', JSON.stringify(st));
  }, userState);

  // Reload projector with user's real data
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'projector-live-user-teams.png'),
    fullPage: false,
  });

  // Navigate to Admin to see user's real teams with Winners Reveal card
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'admin-live-user-teams-reveal-card.png'),
    fullPage: false,
  });

  await browser.close();
  console.log('Restored user real state and captured live screenshots successfully!');
}

setRealState().catch((err) => {
  console.error(err);
  process.exit(1);
});

