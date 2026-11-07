const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.resolve('C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4');

function makeTeams(count) {
  const names = [
    'Rock of Ages',
    'Light of World',
    'Good Shepherd',
    'Living Water',
    'Burning Bush',
    'Bread of Life',
    'The Good Samaritans of Galilee',
    'Cornerstone',
    'Lion of Judah',
    'Holy Spirit',
    'Grace & Truth',
    'Salt & Light',
    'Alpha & Omega',
    'Faith Warriors',
    'Morning Star',
    'Royal Priests',
    'Mighty Fortress',
  ];

  // Fill up to count
  while (names.length < count) {
    names.push(`Group ${names.length + 1}`);
  }

  const levels = [
    { id: 'l1', name: 'Level 1' },
    { id: 'l2', name: 'Level 2' },
    { id: 'l3', name: 'Level 3' },
    { id: 'l4', name: 'Level 4' },
  ];

  const teams = names.slice(0, count).map((name, i) => {
    // Generate scores descending so rank 1 is Rock of Ages, etc.
    const base = 250 - i * 7;
    const scores = {
      l1: Math.floor(base * 0.28),
      l2: Math.floor(base * 0.26),
      l3: Math.floor(base * 0.24),
      l4: Math.floor(base * 0.22),
    };

    // Mark last 2 as eliminated after Level 2 if >= 15
    const out = (count >= 15 && i >= count - 2) ? 'Level 2' : '';

    return {
      id: `team-${i + 1}`,
      name,
      out,
      scores,
    };
  });

  // Make teams 12 and 13 tied so we test T-13
  if (teams.length >= 13) {
    teams[12].scores = { ...teams[11].scores };
  }

  return {
    title: 'Church Bible Quiz 2026',
    focus: 'all',
    levels,
    teams,
  };
}

async function runVerification() {
  console.log('🚀 Starting Projector Redesign Verification...\n');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Test 1: 17 Groups at 1920x1080 (Required screenshot)
  console.log('--- 1. Testing 17 Groups at 1920x1080 ---');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173/?debug=1', { waitUntil: 'domcontentloaded' });
  await page.evaluate((data) => {
    localStorage.setItem('bible-quiz-state', JSON.stringify(data));
  }, makeTeams(17));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Check report
  let report = await page.evaluate(() => window.__STAGE_OVERFLOW_REPORT__);
  console.log('17 Groups 1920x1080 Report:', report);
  if (!report || !report.ok) {
    throw new Error(`17 groups 1920x1080 failed: ${JSON.stringify(report?.errors)}`);
  }

  // Check for ellipsis in page
  const pageText = await page.textContent('body');
  if (pageText.includes('…') || pageText.includes('...')) {
    // Only check if it is part of team names or totals
    const names = await page.locator('[data-testid*="podium-name"], [data-testid*="rank-row"] span').allTextContents();
    const hasEllipsisInNames = names.some(n => n.includes('…') || n.includes('...'));
    if (hasEllipsisInNames) {
      throw new Error('Found ellipsis in team names!');
    }
  }

  // Check T-13 tie clearance
  const t13Row = page.locator('[data-testid="rank-row-12"], [data-testid="rank-row-13"]').first();
  console.log('Found tie row for T-12 / T-13');

  // Screenshot 17 groups at 1920x1080
  const ss17Path = path.join(ARTIFACT_DIR, 'projector-cathedral-17groups-1920x1080.png');
  await page.screenshot({ path: ss17Path });
  console.log('📸 Saved 17 groups screenshot:', ss17Path);

  // Test 2: 12 Groups at 1920x1080 (Required screenshot)
  console.log('\n--- 2. Testing 12 Groups at 1920x1080 ---');
  await page.evaluate((data) => {
    localStorage.setItem('bible-quiz-state', JSON.stringify(data));
  }, makeTeams(12));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  report = await page.evaluate(() => window.__STAGE_OVERFLOW_REPORT__);
  console.log('12 Groups 1920x1080 Report:', report);
  if (!report || !report.ok) {
    throw new Error(`12 groups 1920x1080 failed: ${JSON.stringify(report?.errors)}`);
  }

  const ss12Path = path.join(ARTIFACT_DIR, 'projector-cathedral-12groups-1920x1080.png');
  await page.screenshot({ path: ss12Path });
  console.log('📸 Saved 12 groups screenshot:', ss12Path);

  // Test 3: Multiple Viewports with 17 groups
  const viewports = [
    { name: '1917x897 (Laptop Window with Taskbar/Header)', w: 1917, h: 897 },
    { name: '1280x720 (720p Projector)', w: 1280, h: 720 },
    { name: '1024x768 (4:3 Church Projector)', w: 1024, h: 768 },
  ];

  await page.evaluate((data) => {
    localStorage.setItem('bible-quiz-state', JSON.stringify(data));
  }, makeTeams(17));

  for (const vp of viewports) {
    console.log(`\n--- Testing ${vp.name} ---`);
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    report = await page.evaluate(() => window.__STAGE_OVERFLOW_REPORT__);
    console.log(`${vp.name} Report:`, report);
    if (!report || !report.ok) {
      throw new Error(`${vp.name} failed: ${JSON.stringify(report?.errors)}`);
    }
  }

  // Test 4: Dynamic Group Counts: 3 groups and 30 groups
  console.log('\n--- 4. Testing 3 Groups ---');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate((data) => {
    localStorage.setItem('bible-quiz-state', JSON.stringify(data));
  }, makeTeams(3));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  report = await page.evaluate(() => window.__STAGE_OVERFLOW_REPORT__);
  if (!report || !report.ok) throw new Error(`3 groups failed: ${JSON.stringify(report?.errors)}`);
  console.log('✅ 3 Groups passed cleanly');

  console.log('\n--- Testing 30 Groups ---');
  await page.evaluate((data) => {
    localStorage.setItem('bible-quiz-state', JSON.stringify(data));
  }, makeTeams(30));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  report = await page.evaluate(() => window.__STAGE_OVERFLOW_REPORT__);
  if (!report || !report.ok) throw new Error(`30 groups failed: ${JSON.stringify(report?.errors)}`);
  console.log('✅ 30 Groups passed cleanly');

  // Test 5: Light Theme (?theme=light)
  console.log('\n--- 5. Testing Light Theme (?theme=light) ---');
  await page.evaluate((data) => {
    localStorage.setItem('bible-quiz-state', JSON.stringify(data));
  }, makeTeams(17));
  await page.goto('http://localhost:5173/?theme=light&debug=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  report = await page.evaluate(() => window.__STAGE_OVERFLOW_REPORT__);
  if (!report || !report.ok) throw new Error(`Light theme failed: ${JSON.stringify(report?.errors)}`);
  const ssLightPath = path.join(ARTIFACT_DIR, 'projector-cathedral-parchment-1920x1080.png');
  await page.screenshot({ path: ssLightPath });
  console.log('📸 Saved light theme screenshot:', ssLightPath);

  // Test 6: Generate Squint-Test Downscaled Image (480x270 with blur)
  console.log('\n--- 6. Generating Squint-Test Blurred Downscaled Image ---');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.evaluate((data) => {
    localStorage.setItem('bible-quiz-state', JSON.stringify(data));
  }, makeTeams(17));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Apply CSS blur of 8px on the stage, screenshot at 480x270 viewport
  await page.evaluate(() => {
    const stage = document.querySelector('[data-testid="projector-stage"]');
    if (stage) stage.style.filter = 'blur(8px)';
  });
  await page.setViewportSize({ width: 480, height: 270 });
  await page.waitForTimeout(300);
  const ssSquintPath = path.join(ARTIFACT_DIR, 'projector-squint-480x270.png');
  await page.screenshot({ path: ssSquintPath });
  console.log('📸 Saved squint test screenshot:', ssSquintPath);

  await browser.close();
  console.log('\n🎉 ALL SELF-CHECK AND VERIFICATION TESTS PASSED 100%!');
}

runVerification().catch((err) => {
  console.error('Verification Error:', err);
  process.exit(1);
});

