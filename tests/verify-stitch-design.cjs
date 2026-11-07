const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

async function verify() {
  console.log('🚀 Launching Playwright browser...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  
  const resolutions = [
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1024x768', width: 1024, height: 768 },
    { name: '1917x897', width: 1917, height: 897 },
  ];

  let allPassed = true;

  for (const res of resolutions) {
    console.log(`\n========================================`);
    console.log(`Testing Stitch Redesign at ${res.name}`);
    console.log(`========================================`);

    const page = await browser.newPage({ viewport: { width: res.width, height: res.height } });
    await page.goto('http://localhost:5173/?demo=1&debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    // Verify stage overflow
    const overflowReport = await page.evaluate(() => {
      const stage = document.querySelector('[data-testid="projector-stage"]');
      if (!stage) return { found: false };
      return {
        found: true,
        scrollHeight: stage.scrollHeight,
        clientHeight: stage.clientHeight,
        scrollWidth: stage.scrollWidth,
        clientWidth: stage.clientWidth,
        hasVerticalOverflow: stage.scrollHeight > stage.clientHeight + 1,
        hasHorizontalOverflow: stage.scrollWidth > stage.clientWidth + 1,
        windowScrollHeight: document.documentElement.scrollHeight,
        windowInnerHeight: window.innerHeight,
        windowScrollWidth: document.documentElement.scrollWidth,
        windowInnerWidth: window.innerWidth,
      };
    });

    console.log('Overflow check:', overflowReport);

    if (overflowReport.hasVerticalOverflow || overflowReport.hasHorizontalOverflow || overflowReport.windowScrollHeight > overflowReport.windowInnerHeight) {
      console.error(`❌ Overflow at ${res.name}!`);
      allPassed = false;
    } else {
      console.log(`✅ ${res.name}: 0 overflows, 0 scrollbars!`);
    }

    // Capture screenshot
    const shotPath = path.join(ARTIFACT_DIR, `projector-stitch-${res.name}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`📸 Screenshot saved: ${shotPath}`);

    await page.close();
  }

  await browser.close();

  if (allPassed) {
    console.log('\n🎉 ALL VIEWPORTS PASSED WITH ZERO SCROLLBARS AND ZERO OVERFLOWS!');
    process.exit(0);
  } else {
    console.error('\n⚠️ Some viewports had issues.');
    process.exit(1);
  }
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});

