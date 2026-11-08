const { chromium } = require('playwright');
const path = require('path');
const { testNames17, levels, generateTeams } = require('./test-teams-config.cjs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

async function captureFullViews() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });

  const state17 = {
    title: 'VERSE UP BIBLE QUIZ 2026',
    teams: generateTeams(testNames17),
    levels,
    focus: 'all',
    celebrateWinner: false,
    soundEnabled: true,
  };

  // 1920x1080
  const ctx1920 = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const p1920 = await ctx1920.newPage();
  await p1920.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await p1920.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
  await p1920.reload({ waitUntil: 'networkidle' });
  await p1920.waitForTimeout(1000);
  const out1920 = path.join(ARTIFACTS_DIR, 'projector-refined-rows-1920x1080.png');
  await p1920.screenshot({ path: out1920 });
  console.log('Saved 1920x1080 to:', out1920);
  await ctx1920.close();

  // 1024x768
  const ctx1024 = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
  const p1024 = await ctx1024.newPage();
  await p1024.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await p1024.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
  await p1024.reload({ waitUntil: 'networkidle' });
  await p1024.waitForTimeout(1000);
  const out1024 = path.join(ARTIFACTS_DIR, 'projector-refined-rows-1024x768.png');
  await p1024.screenshot({ path: out1024 });
  console.log('Saved 1024x768 to:', out1024);
  await ctx1024.close();

  await browser.close();
}

captureFullViews().catch(console.error);
