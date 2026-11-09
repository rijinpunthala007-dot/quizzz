const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { testNames17, levels, generateTeams } = require('./test-teams-config.cjs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

async function captureDoveSequence() {
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

  await page.goto('http://localhost:5173/?fx=soft', { waitUntil: 'domcontentloaded' });
  await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Trigger leader change
  const newState = {
    ...state17,
    teams: state17.teams.map((t, idx) => (idx === 1 ? { ...t, scores: { 'lvl-1': 9999 } } : t)),
  };
  await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), newState);
  await page.evaluate(() => window.dispatchEvent(new Event('storage')));

  // Capture top banner/podium region (height 380px) over 5 seconds (6 frames)
  const frames = [];
  const delays = [300, 800, 1000, 1000, 1000, 700];

  for (let i = 0; i < delays.length; i++) {
    await page.waitForTimeout(delays[i]);
    const frameBuf = await page.screenshot({
      clip: { x: 0, y: 0, width: 1920, height: 420 },
    });
    frames.push(frameBuf);
  }

  // Build filmstrip HTML
  const filmstripHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 24px;
        background: #140733;
        color: white;
        font-family: -apple-system, sans-serif;
      }
      h2 {
        text-align: center;
        color: #FFE27A;
        margin-bottom: 20px;
        font-size: 24px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        max-width: 1860px;
        margin: 0 auto;
      }
      .frame {
        background: #250f6d;
        border: 1px solid rgba(255, 226, 122, 0.3);
        border-radius: 12px;
        overflow: hidden;
      }
      .frame-header {
        padding: 8px 16px;
        background: rgba(0, 0, 0, 0.3);
        font-size: 14px;
        font-weight: 700;
        color: #F5C542;
      }
      img {
        width: 100%;
        display: block;
      }
    </style>
  </head>
  <body>
    <h2>🕊️ DOVE GLIDE FLIGHT PROGRESSION (5-SECOND ARC ON NEW LEADER)</h2>
    <div class="grid">
      ${frames
        .map(
          (f, idx) => `
        <div class="frame">
          <div class="frame-header">Frame ${idx + 1} (${(idx * 0.9 + 0.3).toFixed(1)}s)</div>
          <img src="data:image/png;base64,${f.toString('base64')}" />
        </div>
      `
        )
        .join('')}
    </div>
  </body>
  </html>
  `;

  const stripPage = await browser.newPage({ viewport: { width: 1920, height: 1400 } });
  await stripPage.setContent(filmstripHtml);
  await stripPage.waitForTimeout(400);
  await stripPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'ambient-dove-filmstrip.png') });
  console.log('Saved ambient-dove-filmstrip.png');
  await browser.close();
}

captureDoveSequence().catch((err) => {
  console.error(err);
  process.exit(1);
});

