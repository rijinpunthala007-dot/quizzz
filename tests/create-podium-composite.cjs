const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { testNames17, levels, generateTeams } = require('./test-teams-config.cjs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

async function generateComposite() {
  console.log('Generating composite comparison for Podium V2...');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const state17 = {
    title: 'VERSE UP BIBLE QUIZ 2026',
    teams: generateTeams(testNames17),
    levels,
    focus: 'all',
    celebrateWinner: false,
    soundEnabled: true,
  };

  // 1. Classic Podium
  await page.goto('http://localhost:5173/?podium=classic&lite=1', { waitUntil: 'networkidle' });
  await page.evaluate(st => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);

  const classicFull = await page.screenshot();
  const classicPodiumClip = await page.locator('[data-testid="podium-container"]').screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'podium-classic-full.png'), classicFull);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'podium-classic-card-clip.png'), classicPodiumClip);

  // 2. Podium V2
  await page.goto('http://localhost:5173/?lite=1', { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);

  const v2Full = await page.screenshot();
  const v2PodiumClip = await page.locator('[data-testid="podium-container"]').screenshot();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'podium-v2-full.png'), v2Full);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'podium-v2-card-clip.png'), v2PodiumClip);

  // 3. Render side-by-side composite in browser
  const compositeHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 40px;
        background: #180942;
        color: white;
        font-family: 'Outfit', -apple-system, sans-serif;
      }
      h1 {
        text-align: center;
        font-size: 32px;
        margin-bottom: 24px;
        color: #FFE27A;
        letter-spacing: 2px;
      }
      .container {
        display: flex;
        flex-direction: column;
        gap: 36px;
        max-width: 1840px;
        margin: 0 auto;
      }
      .section {
        background: rgba(36, 16, 96, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        padding: 24px;
      }
      .section-title {
        font-size: 22px;
        font-weight: 800;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .badge-classic {
        background: #4B5563;
        color: white;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 14px;
      }
      .badge-v2 {
        background: #F5A623;
        color: #140733;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 14px;
      }
      .podium-box {
        display: flex;
        justify-content: center;
        background: #250f6d;
        border-radius: 16px;
        padding: 20px;
        overflow: hidden;
      }
      img {
        max-width: 100%;
        height: auto;
        border-radius: 12px;
      }
    </style>
  </head>
  <body>
    <h1>PODIUM V2 REDESIGN · COMPARISON REPORT</h1>
    <div class="container">
      <div class="section">
        <div class="section-title">
          <span class="badge-v2">PODIUM V2 (FINAL)</span>
          <span>Redesigned 3 Podium Cards · Crown, Metallic Frames, Double-Ring Avatars & Clean High-Impact Scores</span>
        </div>
        <div class="podium-box">
          <img src="data:image/png;base64,${v2PodiumClip.toString('base64')}" />
        </div>
      </div>
      <div class="section">
        <div class="section-title">
          <span class="badge-classic">CLASSIC PODIUM (BEFORE)</span>
          <span>Original Podium with Generic Metrics & Accuracy Bar</span>
        </div>
        <div class="podium-box">
          <img src="data:image/png;base64,${classicPodiumClip.toString('base64')}" />
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  const compositePage = await browser.newPage({ viewport: { width: 1920, height: 1100 } });
  await compositePage.setContent(compositeHtml);
  await compositePage.waitForTimeout(500);
  await compositePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'podium-v2-comparison.png') });

  console.log('Saved podium-v2-comparison.png');
  await browser.close();
}

generateComposite().catch(err => {
  console.error(err);
  process.exit(1);
});

