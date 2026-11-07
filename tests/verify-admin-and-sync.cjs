const { chromium } = require('playwright');
const path = require('path');

async function testAdminAndSync() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  // Page 1: Admin View
  const adminPage = await context.newPage();
  
  // Clear any existing localStorage so we test the default out-of-the-box experience
  await adminPage.goto('http://localhost:5173/admin', { waitUntil: 'domcontentloaded' });
  await adminPage.evaluate(() => localStorage.clear());
  await adminPage.reload({ waitUntil: 'networkidle' });

  console.log('--- 1. Testing Default Loaded State ---');
  // Check that 17 groups and 4 levels loaded out-of-the-box
  const rowCount = await adminPage.locator('tbody tr').count();
  console.log(`Rendered groups in table: ${rowCount}`);
  if (rowCount !== 17) {
    throw new Error(`Expected 17 groups out-of-the-box, but found ${rowCount}`);
  }

  // Check header subtitle
  const headerSubtitle = await adminPage.locator('header span.text-xs').textContent();
  console.log(`Header subtitle: ${headerSubtitle}`);

  console.log('--- 2. Testing Score Editing ---');
  const firstScoreInput = adminPage.locator('input[data-coord="0-0"]');
  const initialVal = await firstScoreInput.inputValue();
  console.log(`Initial score value: ${initialVal}`);

  // Click input, fill 88
  await firstScoreInput.click();
  await firstScoreInput.fill('88');
  await adminPage.waitForTimeout(300);

  const newVal = await firstScoreInput.inputValue();
  console.log(`Updated score input value: ${newVal}`);
  if (newVal !== '88') {
    throw new Error(`Score input did not update to 88! Current: ${newVal}`);
  }

  // Check total score for team 1 (column 7: Rank, Name, L1, L2, L3, L4, Total)
  const totalCell = adminPage.locator('tbody tr:first-child td:nth-child(7)');
  const team1Total = (await totalCell.textContent()).trim();
  console.log(`Team 1 Total: ${team1Total}`);
  if (!team1Total || isNaN(parseInt(team1Total, 10))) {
    throw new Error(`Invalid total score cell text: ${team1Total}`);
  }

  console.log('--- 3. Testing Group Renaming ---');
  const firstNameInput = adminPage.locator('tbody tr:first-child td:nth-child(2) input');
  await firstNameInput.fill('Grace and Glory Warriors');
  await adminPage.waitForTimeout(300);
  console.log(`Renamed group to: ${await firstNameInput.inputValue()}`);

  console.log('--- 4. Testing Quick Add Group in Scores Table ---');
  const quickInput = adminPage.locator('input[placeholder*="Type new group name"]');
  await quickInput.fill('New Disciples of Christ');
  await adminPage.locator('button:has-text("Add Group")').first().click();
  await adminPage.waitForTimeout(300);

  const newRowCount = await adminPage.locator('tbody tr').count();
  console.log(`Group count after quick add: ${newRowCount}`);
  if (newRowCount !== 18) {
    throw new Error(`Expected 18 groups after adding, but found ${newRowCount}`);
  }

  console.log('--- 5. Testing Compact View Toggle ---');
  const compactBtn = adminPage.locator('button:has-text("Compact View")');
  await compactBtn.click();
  await adminPage.waitForTimeout(200);
  console.log('Toggled Compact View');

  // Take admin screenshot
  const artifactDir = path.resolve('C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4');
  await adminPage.screenshot({ path: path.join(artifactDir, 'admin-view-refined.png'), fullPage: false });
  console.log('Saved admin-view-refined.png');

  console.log('--- 6. Testing Projector Sync Live Across Tabs ---');
  const projectorPage = await context.newPage();
  await projectorPage.setViewportSize({ width: 1920, height: 1080 });
  await projectorPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await projectorPage.waitForTimeout(500);

  // Check if renamed group is present on projector using textContent
  const bodyText = await projectorPage.textContent('body');
  const hasRenamedGroup = bodyText.includes('Grace and Glory Warriors');
  console.log(`Projector text includes renamed group: ${hasRenamedGroup}`);
  if (!hasRenamedGroup) {
    throw new Error('Projector did not sync the renamed group!');
  }

  // Take projector screenshot
  await projectorPage.screenshot({ path: path.join(artifactDir, 'projector-synced.png') });
  console.log('Saved projector-synced.png');

  await browser.close();
  console.log('\n>>> ALL ADMIN AND LIVE SYNC TESTS PASSED 100%! <<<');
}

testAdminAndSync().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
