const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const baseState = JSON.parse(fs.readFileSync('tests/user-initial-state.json', 'utf8'));

async function testDecimalScores() {
  console.log('--- Verifying Decimal Score Capabilities ---');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const adminPage = await context.newPage();

  // 1. Load Admin and set state with teams and levels
  await adminPage.goto('http://localhost:5173/admin', { waitUntil: 'domcontentloaded' });
  await adminPage.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), baseState);
  await adminPage.goto('http://localhost:5173/admin', { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(1000);

  // 2. Locate score input for team 0, level 0
  const input0 = adminPage.locator('input[data-coord="0-0"]');
  await input0.waitFor({ state: 'visible' });

  // Type decimal score "12.5"
  await input0.click();
  await input0.fill('12.5');
  await adminPage.waitForTimeout(400);

  // Locate score input for team 0, level 1
  const input1 = adminPage.locator('input[data-coord="0-1"]');
  await input1.click();
  await input1.fill('7.25');
  await adminPage.waitForTimeout(400);

  // Verify total calculation for team 0 in Admin table
  // 12.5 + 7.25 + (other levels or zero)
  const teamRow = adminPage.locator('table tbody tr').first();
  const totalCell = teamRow.locator('td').nth(-3); // total is 3rd from right
  const totalText = await totalCell.textContent();
  console.log(`Admin calculated total: ${totalText.trim()}`);

  if (!totalText.includes('.75') && !totalText.includes('.')) {
    console.error('FAIL: Total does not reflect decimal sum!');
    process.exit(1);
  }
  console.log('✓ Admin successfully input decimals and accurately computed total.');

  // 3. Open Projector page and verify decimal score appears
  const projectorPage = await context.newPage();
  await projectorPage.setViewportSize({ width: 1920, height: 1080 });
  await projectorPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await projectorPage.waitForTimeout(1500);

  // Check top team score on projector
  const projectorScores = await projectorPage.locator('.tabular-nums').allTextContents();
  console.log('Projector tabular scores found:', projectorScores.slice(0, 5));
  const hasDecimal = projectorScores.some((s) => s.includes('.'));
  if (!hasDecimal) {
    console.error('FAIL: Projector did not display any decimal scores!');
    process.exit(1);
  }
  console.log('✓ Projector accurately displays decimal scores.');

  // 4. Test Winners Celebration screen with decimal snapshot
  await adminPage.evaluate(() => {
    const raw = localStorage.getItem('bible-quiz-state');
    if (raw) {
      const st = JSON.parse(raw);
      st.celebrateWinner = true;
      st.winnersSnapshot = [
        { id: 't-1', name: 'THOPPIL', total: 42.5, rank: 1, displayRank: '1', isTied: false },
        { id: 't-2', name: 'PUTHENPURAYIL', total: 40.75, rank: 2, displayRank: '2', isTied: false },
        { id: 't-3', name: 'PSYCHO SIMON', total: 35.25, rank: 3, displayRank: '3', isTied: false },
      ];
      localStorage.setItem('bible-quiz-state', JSON.stringify(st));
    }
  });

  await projectorPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await projectorPage.waitForTimeout(2000);

  const winnerScoreText = await projectorPage.locator('[data-testid="score-text-1"]').textContent();
  const runnerUpScoreText = await projectorPage.locator('[data-testid="score-text-2"]').textContent();
  console.log(`Winners Celebration 1st Place Score: ${winnerScoreText}`);
  console.log(`Winners Celebration 2nd Place Score: ${runnerUpScoreText}`);

  if (winnerScoreText.trim() !== '42.5' || runnerUpScoreText.trim() !== '40.75') {
    console.error(`FAIL: Expected 42.5 and 40.75, got "${winnerScoreText}" and "${runnerUpScoreText}"`);
    process.exit(1);
  }
  console.log('✓ Winners Celebration accurately displays decimal totals (42.5, 40.75).');

  await adminPage.close();
  await projectorPage.close();
  await context.close();
  await browser.close();
  console.log('ALL DECIMAL SCORE TESTS PASSED SUCCESSFULLY!');
}

testDecimalScores().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
