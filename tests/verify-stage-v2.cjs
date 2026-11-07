const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function generateGroupsState(count, title = `Church Bible Quiz 2026`) {
  const levels = [
    { id: 'l1', name: 'Level 1' },
    { id: 'l2', name: 'Level 2' },
    { id: 'l3', name: 'Level 3' },
    { id: 'l4', name: 'Level 4' },
  ];

  const standardNames = [
    'Rock of Ages', 'Light of World', 'Good Shepherd', 'Living Water',
    'Burning Bush', 'Bread of Life', 'The Good Samaritans of Galilee', 'Cornerstone',
    'Lion of Judah', 'Holy Spirit', 'Grace & Truth', 'Salt & Light',
    'Alpha & Omega', 'Faith Warriors', 'Morning Star', 'Royal Priests',
    'Mighty Fortress',
  ];

  const teams = [];
  for (let i = 0; i < count; i++) {
    const name = i < standardNames.length
      ? standardNames[i]
      : `Team Alpha ${i + 1}`;
    
    // Seed consistent scores matching the reference feel
    const scores = {
      l1: Math.floor(Math.random() * 40 + 40),
      l2: Math.floor(Math.random() * 40 + 40),
      l3: Math.floor(Math.random() * 40 + 40),
      l4: Math.floor(Math.random() * 40 + 40),
    };

    // If 17 groups, mark 2 as eliminated after Level 2 as in reference
    const out = (count === 17 && i >= 15) ? 'Level 2' : '';

    teams.push({
      id: `team-${i + 1}`,
      name,
      out,
      scores,
    });
  }

  return {
    title,
    focus: 'all',
    levels,
    teams,
  };
}

async function runTests() {
  console.log('🚀 Launching Edge browser via Playwright...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  let allPassed = true;

  // 1. Verify 17 Demo Groups across all 4 resolutions
  const resolutions = [
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '1917x897', width: 1917, height: 897 },
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1024x768', width: 1024, height: 768 },
  ];

  for (const res of resolutions) {
    console.log(`\n========================================`);
    console.log(`Testing 17 Groups at ${res.name}`);
    console.log(`========================================`);

    const page = await browser.newPage({ viewport: { width: res.width, height: res.height } });
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

    // Seed state
    const state = generateGroupsState(17);
    await page.evaluate((s) => localStorage.setItem('bible-quiz-state', JSON.stringify(s)), state);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const report = await page.evaluate(() => window.__STAGE_OVERFLOW_REPORT__);
    console.log(`Report for ${res.name}:`, report);

    if (!report || !report.ok) {
      console.error(`❌ Overflow reported at ${res.name}:`, report ? report.errors : 'No report');
      allPassed = false;
    } else {
      console.log(`✅ ${res.name} passed: 0 overflows, 0 collisions`);
    }

    // Save screenshot
    const shotPath = path.join(SCREENSHOT_DIR, `projector-v2-${res.name}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`📸 Screenshot saved: ${shotPath}`);

    // If 1920x1080, save as projector-1920x1080.png
    if (res.name === '1920x1080') {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'projector-1920x1080.png') });
    }
    if (res.name === '1917x897') {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'projector-1917x897.png') });
    }

    await page.close();
  }

  // 2. Specific screenshot for 12 groups at 1920x1080
  console.log(`\n========================================`);
  console.log(`Testing 12 Groups at 1920x1080 (Screenshot required)`);
  console.log(`========================================`);
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    const state = generateGroupsState(12);
    await page.evaluate((s) => localStorage.setItem('bible-quiz-state', JSON.stringify(s)), state);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const report = await page.evaluate(() => window.__STAGE_OVERFLOW_REPORT__);
    console.log('12 groups report:', report);
    if (!report || !report.ok) {
      console.error('❌ Overflow in 12 groups:', report ? report.errors : 'No report');
      allPassed = false;
    } else {
      console.log('✅ 12 groups passed with 0 overflows');
    }

    const shotPath = path.join(SCREENSHOT_DIR, 'projector-12groups-1920x1080.png');
    await page.screenshot({ path: shotPath });
    console.log(`📸 12 groups screenshot saved: ${shotPath}`);
    await page.close();
  }

  // 3. Test dynamic group counts: 3, 5, 30 groups across resolutions
  const testCounts = [3, 5, 30];
  for (const count of testCounts) {
    console.log(`\n========================================`);
    console.log(`Testing Dynamic Group Count: ${count} Groups at 1920x1080`);
    console.log(`========================================`);

    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    const state = generateGroupsState(count);
    await page.evaluate((s) => localStorage.setItem('bible-quiz-state', JSON.stringify(s)), state);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const report = await page.evaluate(() => window.__STAGE_OVERFLOW_REPORT__);
    console.log(`${count} groups report:`, report);
    if (!report || !report.ok) {
      console.error(`❌ Overflow in ${count} groups:`, report ? report.errors : 'No report');
      allPassed = false;
    } else {
      console.log(`✅ ${count} groups passed with 0 overflows`);
    }

    await page.close();
  }

  // 4. Downscale 1920x1080 screenshot to 480x270
  console.log(`\n========================================`);
  console.log(`Generating 480x270 Downscaled Screenshot`);
  console.log(`========================================`);
  {
    const img1080Path = path.join(SCREENSHOT_DIR, 'projector-1920x1080.png');
    const imgData = fs.readFileSync(img1080Path).toString('base64');
    const downscalePage = await browser.newPage({
      viewport: { width: 480, height: 270 },
      deviceScaleFactor: 1,
    });

    await downscalePage.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: #0b1322; overflow: hidden; width: 480px; height: 270px; }
            img { width: 480px; height: 270px; display: block; image-rendering: auto; }
          </style>
        </head>
        <body>
          <img src="data:image/png;base64,${imgData}" />
        </body>
      </html>
    `);

    const downscaledPath = path.join(SCREENSHOT_DIR, 'projector-distance-480x270.png');
    await downscalePage.screenshot({ path: downscaledPath });
    console.log(`📸 480x270 downscaled screenshot saved: ${downscaledPath}`);
    await downscalePage.close();
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

