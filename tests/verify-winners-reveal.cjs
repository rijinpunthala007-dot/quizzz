const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

async function run() {
  console.log('--- Launching Playwright for Winners Reveal Verification ---');
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
  });

  const videoDir = path.join(ARTIFACTS_DIR, 'videos');
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
  }

  // 1. PROJECTOR CEREMONY RECORDING & STEP SCREENSHOTS
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: videoDir,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  // Listen to console to verify zero errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  console.log('Navigating to Projector with Demo and Reveal (?demo=1&reveal=1)...');
  await page.goto('http://localhost:5173/?demo=1&reveal=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check Step 0: Intro
  console.log('Capturing Step 0 (Intro)...');
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'reveal-step-0-intro.png'),
    fullPage: false,
  });

  // Advance to Step 1 via Spacebar or button
  console.log('Advancing to Step 1 (3rd Place)...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(1800); // allow entrance animation & score count
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'reveal-step-1-third-place.png'),
    fullPage: false,
  });

  // Advance to Step 2 via Spacebar
  console.log('Advancing to Step 2 (Runner-Up)...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(1800);
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'reveal-step-2-runner-up.png'),
    fullPage: false,
  });

  // Advance to Step 3 (Winner Celebration)
  console.log('Advancing to Step 3 (Winner with Confetti & Fireworks)...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(4200); // allow countdown + entrance + cannons & fireworks burst
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'reveal-step-3-winner-burst.png'),
    fullPage: false,
  });

  // Advance to Step 4 (Final Podium Resting Screen)
  console.log('Advancing to Step 4 (Final Podium Resting Screen)...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'reveal-step-4-final-podium.png'),
    fullPage: false,
  });

  // Verify responsive scaling & zero scrollbars at multiple resolutions
  const testResolutions = [
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1917, height: 897, name: '1917x897' },
    { width: 1280, height: 720, name: '1280x720' },
    { width: 1024, height: 768, name: '1024x768' },
  ];

  for (const res of testResolutions) {
    await page.setViewportSize({ width: res.width, height: res.height });
    await page.waitForTimeout(500);

    const hasScrollbars = await page.evaluate(() => {
      const doc = document.documentElement;
      return (
        window.innerWidth < doc.scrollWidth ||
        window.innerHeight < doc.scrollHeight ||
        getComputedStyle(document.body).overflow === 'scroll'
      );
    });

    console.log(`Resolution ${res.name}: scrollbar check => ${hasScrollbars ? 'FAILED' : 'PASSED (no scrollbars)'}`);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `reveal-resolution-${res.name}.png`),
      fullPage: false,
    });
  }

  // 2. ADMIN VIEW VERIFICATION
  console.log('Navigating to Admin View (/admin)...');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const adminCardVisible = await page.isVisible('[data-testid="winners-reveal-admin-card"]');
  console.log(`Admin Winners Reveal card visible: ${adminCardVisible}`);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'admin-winners-reveal-card.png'),
    fullPage: false,
  });

  // Close context to finish video writing
  await page.close();
  await context.close();

  // Find the video file and rename it
  const videoFiles = fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  if (videoFiles.length > 0) {
    const latestVideo = path.join(videoDir, videoFiles[videoFiles.length - 1]);
    const destVideo = path.join(ARTIFACTS_DIR, 'winners-reveal-ceremony.webm');
    fs.copyFileSync(latestVideo, destVideo);
    console.log(`Recorded video saved to: ${destVideo}`);
  }

  await browser.close();

  console.log('--- Verification Complete! Console errors count:', consoleErrors.length, '---');
  if (consoleErrors.length > 0) {
    console.error('Console errors logged:', consoleErrors);
  }
}

run().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
