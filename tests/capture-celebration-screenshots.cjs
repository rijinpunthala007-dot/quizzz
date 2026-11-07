const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';
const userState = JSON.parse(fs.readFileSync('tests/user-initial-state.json', 'utf8'));

// Prepare state with celebration active
userState.celebrateWinner = true;
userState.winnersSnapshot = [
  { id: 't-1', name: 'MELVIN', total: 289, rank: 1, displayRank: '1', isTied: false },
  { id: 't-2', name: 'MILAN', total: 287, rank: 2, displayRank: '2', isTied: false },
  { id: 't-3', name: 'JOHN', total: 231, rank: 3, displayRank: '3', isTied: false },
];

async function capture() {
  console.log('--- Capturing Winners Celebration Page Verification ---');
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
  });

  const videoDir = path.join(ARTIFACTS_DIR, 'videos');
  if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: videoDir,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  // Set initial state
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), userState);

  // Reload projector
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // allow entrance animation & confetti

  // 1. Validate Card dimensions & pill positioning
  const metrics = await page.evaluate(() => {
    const card1 = document.querySelector('[data-testid="celebration-card-1"]');
    const card2 = document.querySelector('[data-testid="celebration-card-2"]');
    const card3 = document.querySelector('[data-testid="celebration-card-3"]');

    const b1 = card1.getBoundingClientRect();
    const b2 = card2.getBoundingClientRect();
    const b3 = card3.getBoundingClientRect();

    // Pill on card 1
    const pill1 = card1.querySelector('div.font-outfit');
    const p1 = pill1.getBoundingClientRect();

    return {
      card1: { width: Math.round(b1.width), height: Math.round(b1.height), top: Math.round(b1.top), bottom: Math.round(b1.bottom) },
      card2: { width: Math.round(b2.width), height: Math.round(b2.height), top: Math.round(b2.top), bottom: Math.round(b2.bottom) },
      card3: { width: Math.round(b3.width), height: Math.round(b3.height), top: Math.round(b3.top), bottom: Math.round(b3.bottom) },
      pill1: { top: Math.round(p1.top), height: Math.round(p1.height), centerDiff: Math.round(p1.top + p1.height / 2 - b1.top) },
    };
  });

  console.log('Metrics Check:', JSON.stringify(metrics, null, 2));

  // Screenshot 1: Resting Winners Celebration Page
  console.log('Saving winners-celebration-approved-design.png...');
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'winners-celebration-approved-design.png'),
    fullPage: false,
  });

  // Re-celebrate via Space key
  console.log('Pressing Space key to re-fire celebration cannons...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);

  // Screenshot 2: Active cannon burst
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'winners-celebration-cannons-burst.png'),
    fullPage: false,
  });

  // Test Long Team Names & Ties
  console.log('Testing long names and ties...');
  const longNameState = {
    ...userState,
    celebrateWinner: true,
    winnersSnapshot: [
      { id: 't-1', name: 'The Good Samaritans of Galilee', total: 310, rank: 1, displayRank: '1', isTied: false },
      { id: 't-2', name: 'PUTHENPURAYIL', total: 295, rank: 2, displayRank: 'T-2', isTied: true, subtitle: 'Tied Placement' },
      { id: 't-3', name: 'Grace & Truth Fellowship', total: 295, rank: 2, displayRank: 'T-2', isTied: true, subtitle: 'Tied Placement' },
    ],
  };

  await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), longNameState);
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Screenshot 3: Long names and ties
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'winners-celebration-long-name-and-ties.png'),
    fullPage: false,
  });

  // Test zero scrollbars across all resolutions
  const testRes = [
    { w: 1920, h: 1080, name: '1920x1080' },
    { w: 1917, h: 897, name: '1917x897' },
    { w: 1280, h: 720, name: '1280x720' },
    { w: 1024, h: 768, name: '1024x768' },
  ];

  for (const r of testRes) {
    await page.setViewportSize({ width: r.w, height: r.h });
    await page.waitForTimeout(300);
    const hasScroll = await page.evaluate(() => {
      return (
        document.documentElement.scrollHeight > window.innerHeight ||
        document.documentElement.scrollWidth > window.innerWidth ||
        document.body.scrollHeight > window.innerHeight
      );
    });
    console.log(`Resolution ${r.name}: scrollbar check => ${hasScroll ? 'FAILED' : 'PASSED (no scrollbars)'}`);
  }

  // Admin View screenshots
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  console.log('Saving admin-celebration-controls.png...');
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'admin-celebration-controls.png'),
    fullPage: false,
  });

  // Reset to leaderboard
  const backBtn = await page.locator('[data-testid="admin-back-leaderboard-btn"]').first();
  if (await backBtn.isVisible()) {
    await backBtn.click();
    await page.waitForTimeout(600);
  }

  console.log('Saving admin-ready-for-celebration.png...');
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'admin-ready-for-celebration.png'),
    fullPage: false,
  });

  await page.close();
  await context.close();

  // Rename video
  const vids = fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  if (vids.length > 0) {
    const latest = path.join(videoDir, vids[vids.length - 1]);
    const dest = path.join(ARTIFACTS_DIR, 'winners-celebration-updated-video.webm');
    fs.copyFileSync(latest, dest);
    console.log(`Saved video to: ${dest}`);
  }

  await browser.close();
  console.log('--- All captures complete! ---');
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});

