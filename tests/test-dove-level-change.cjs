const { chromium } = require('playwright');
const { testNames17, levels, generateTeams } = require('./test-teams-config.cjs');

async function testDoveLevelChange() {
  console.log('Testing Dove Flying Animation on Level Changes & Leader Changes...');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const state17 = {
    title: 'VERSE UP BIBLE QUIZ 2026',
    teams: generateTeams(testNames17),
    levels,
    focus: 'all',
    celebrateWinner: false,
    soundEnabled: true,
  };

  // 1. Initial Page Load (Overall)
  await page.goto('http://localhost:5173/?fx=soft', { waitUntil: 'domcontentloaded' });
  await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Assert NO dove on initial load
  let count = await page.locator('[data-testid="ambient-dove"]').count();
  console.log(`1. Initial load on Overall: dove count = ${count} (expected 0)`);
  if (count !== 0) throw new Error('Dove must not show on initial load');

  // 2. Click Level 1 Tab
  console.log('2. Clicking "Level 1" tab...');
  // Find tab with text "Level 1" or id
  const lvl1Tab = page.locator('button:has-text("Level 1"), [data-testid="tab-lvl-1"]').first();
  await lvl1Tab.click();
  await page.waitForTimeout(400);

  count = await page.locator('[data-testid="ambient-dove"]').count();
  console.log(`   After switching to Level 1: dove count = ${count} (expected 1)`);
  if (count !== 1) throw new Error('Dove MUST show when switching to Level 1!');

  // Wait 5s for dove to finish
  await page.waitForTimeout(5000);
  count = await page.locator('[data-testid="ambient-dove"]').count();
  console.log(`   After 5s flight: dove count = ${count} (expected 0)`);
  if (count !== 0) throw new Error('Dove should hide after 5s flight');

  // 3. Click Overall Tab
  console.log('3. Clicking "Overall" tab...');
  const overallTab = page.locator('button:has-text("Overall"), [data-testid="tab-all"]').first();
  await overallTab.click();
  await page.waitForTimeout(400);

  count = await page.locator('[data-testid="ambient-dove"]').count();
  console.log(`   After switching to Overall: dove count = ${count} (expected 1)`);
  if (count !== 1) throw new Error('Dove MUST show when switching to Overall!');

  // Wait 5s for dove to finish
  await page.waitForTimeout(5000);
  count = await page.locator('[data-testid="ambient-dove"]').count();
  console.log(`   After 5s flight: dove count = ${count} (expected 0)`);
  if (count !== 0) throw new Error('Dove should hide after 5s flight');

  // 4. Click Level 2 Tab
  console.log('4. Clicking "Level 2" tab...');
  const lvl2Tab = page.locator('button:has-text("Level 2"), [data-testid="tab-lvl-2"]').first();
  await lvl2Tab.click();
  await page.waitForTimeout(400);

  count = await page.locator('[data-testid="ambient-dove"]').count();
  console.log(`   After switching to Level 2: dove count = ${count} (expected 1)`);
  if (count !== 1) throw new Error('Dove MUST show when switching to Level 2!');

  await browser.close();
  console.log('\n>>> SUCCESS: Dove flying animation triggers consistently whenever levels are changed!\n');
}

testDoveLevelChange().catch((err) => {
  console.error(err);
  process.exit(1);
});

