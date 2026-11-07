const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';
const userState = JSON.parse(fs.readFileSync('tests/user-initial-state.json', 'utf8'));

async function testWinnersCelebrationPage() {
  console.log('--- Verifying Updated Winners Celebration Page ---');
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // 0. Pre-populate localStorage with user's real teams (MELVIN, MILAN, JOHN, etc.)
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((st) => {
    localStorage.setItem('bible-quiz-state', JSON.stringify(st));
  }, userState);

  // 1. Open Admin and click "Show winners page"
  console.log('1. Navigating to Admin view...');
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Take screenshot of admin with "Show winners page" button
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'admin-show-winners-page-button.png'),
    fullPage: false,
  });

  console.log('Clicking "Show winners page" in Admin...');
  const showBtn = await page.locator('[data-testid="admin-show-winners-btn"]').first();
  await showBtn.click();
  await page.waitForTimeout(600);

  // Take screenshot of admin in celebrating state ("Back to leaderboard" & "Celebrate again 🎉")
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'admin-celebrating-state.png'),
    fullPage: false,
  });

  // 2. Open Projector View ("/")
  console.log('2. Navigating to Projector View...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  
  // Wait for entrance animation to finish (cards rise, confetti fires)
  await page.waitForTimeout(3500);

  // 3. Inspect layout, dimensions & clipping
  const layoutCheck = await page.evaluate(() => {
    const card1 = document.querySelector('[data-testid="celebration-card-1"]');
    const card2 = document.querySelector('[data-testid="celebration-card-2"]');
    const card3 = document.querySelector('[data-testid="celebration-card-3"]');

    const rect1 = card1 ? card1.getBoundingClientRect() : null;
    const rect2 = card2 ? card2.getBoundingClientRect() : null;
    const rect3 = card3 ? card3.getBoundingClientRect() : null;

    // Check pill on 1st card
    const pill1 = card1 ? card1.querySelector('div.font-outfit') : null;
    const pillRect1 = pill1 ? pill1.getBoundingClientRect() : null;

    // Check scrollbars
    const hasScrollbar =
      document.documentElement.scrollHeight > window.innerHeight ||
      document.documentElement.scrollWidth > window.innerWidth ||
      document.body.scrollHeight > window.innerHeight;

    return {
      card1: rect1 ? { width: Math.round(rect1.width), height: Math.round(rect1.height) } : null,
      card2: rect2 ? { width: Math.round(rect2.width), height: Math.round(rect2.height) } : null,
      card3: rect3 ? { width: Math.round(rect3.width), height: Math.round(rect3.height) } : null,
      pill1: pillRect1 ? { top: Math.round(pillRect1.top), height: Math.round(pillRect1.height) } : null,
      hasScrollbar,
    };
  });

  console.log('Layout evaluation result:', JSON.stringify(layoutCheck, null, 2));

  // Capture the updated Winners Celebration screen
  console.log('Capturing updated Winners Celebration screen...');
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'winners-celebration-updated-1920x1080.png'),
    fullPage: false,
  });

  // Test "Celebrate again 🎉" via Space key
  console.log('Pressing Space key to re-trigger celebration pops...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(600); // mid-pop
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'winners-celebration-re-celebrate-burst.png'),
    fullPage: false,
  });

  // Check multiple resolutions for zero scrollbars
  const resolutions = [
    { w: 1920, h: 1080, name: '1920x1080' },
    { w: 1917, h: 897, name: '1917x897' },
    { w: 1280, h: 720, name: '1280x720' },
    { w: 1024, h: 768, name: '1024x768' },
  ];

  for (const res of resolutions) {
    await page.setViewportSize({ width: res.w, height: res.h });
    await page.waitForTimeout(300);
    const scrollbarCheck = await page.evaluate(() => {
      return (
        document.documentElement.scrollHeight > window.innerHeight ||
        document.documentElement.scrollWidth > window.innerWidth ||
        document.body.scrollHeight > window.innerHeight
      );
    });
    console.log(`Resolution ${res.name}: scrollbar check => ${scrollbarCheck ? 'FAIL' : 'PASS'}`);
  }

  // Test "Back to leaderboard" via Esc key
  console.log('Pressing Esc key to return to leaderboard...');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'projector-returned-to-leaderboard.png'),
    fullPage: false,
  });

  await browser.close();
  console.log('--- Winners Celebration Page verification complete! ---');
}

testWinnersCelebrationPage().catch((err) => {
  console.error(err);
  process.exit(1);
});
