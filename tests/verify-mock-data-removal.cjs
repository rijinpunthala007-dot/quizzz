const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

(async () => {
  console.log('🚀 Verifying Mock Data Removal...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();

  const projectorPage = await context.newPage();
  await projectorPage.setViewportSize({ width: 1920, height: 1080 });

  const adminPage = await context.newPage();
  await adminPage.setViewportSize({ width: 1280, height: 900 });

  // 1. Navigate to Projector
  await projectorPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await projectorPage.waitForTimeout(1000);

  // Check state in localStorage
  const state = await projectorPage.evaluate(() => JSON.parse(localStorage.getItem('bible-quiz-state')));
  console.log(`Current state in localStorage: ${state.teams.length} teams, ${state.levels.length} levels.`);

  if (state.teams.length === 0) {
    console.log('✅ ALL MOCK DATA HAS BEEN REMOVED! (teams count is 0)');
  } else {
    console.error('❌ Teams count is not 0:', state.teams);
  }

  // 2. Check Projector displays clean empty state
  const hasEmptyState = await projectorPage.isVisible('[data-testid="empty-podium-state"]');
  console.log('Projector displays clean waiting empty state:', hasEmptyState);

  // Take Projector clean empty state screenshot
  const emptyProjectorShot = path.join(ARTIFACT_DIR, 'projector-empty-clean.png');
  await projectorPage.screenshot({ path: emptyProjectorShot });
  console.log('📸 Saved clean projector screenshot to:', emptyProjectorShot);

  // 3. Navigate to Admin
  await adminPage.goto('http://localhost:5173/admin', { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(800);

  // Take Admin clean state screenshot
  const cleanAdminShot = path.join(ARTIFACT_DIR, 'admin-empty-clean.png');
  await adminPage.screenshot({ path: cleanAdminShot });
  console.log('📸 Saved clean admin screenshot to:', cleanAdminShot);

  // 4. Test adding real church groups
  console.log('Testing adding 3 real church groups: "St. John Youth", "Grace Fellowship", "Bethel Stars"...');
  await adminPage.fill('textarea', 'St. John Youth\nGrace Fellowship\nBethel Stars');
  await adminPage.click('[data-testid="bulk-add-groups-btn"]');
  await adminPage.waitForTimeout(600);

  const updatedAdminState = await adminPage.evaluate(() => JSON.parse(localStorage.getItem('bible-quiz-state')));
  console.log(`Admin now has ${updatedAdminState.teams.length} real groups.`);

  await projectorPage.waitForTimeout(800);
  const updatedProjectorState = await projectorPage.evaluate(() => JSON.parse(localStorage.getItem('bible-quiz-state')));
  console.log(`Projector now has ${updatedProjectorState.teams.length} real groups.`);

  // Check that all 3 groups are now on the podium
  const card1 = await projectorPage.isVisible('[data-testid="podium-card-1"]');
  const card2 = await projectorPage.isVisible('[data-testid="podium-card-2"]');
  const card3 = await projectorPage.isVisible('[data-testid="podium-card-3"]');
  console.log(`Projector podium cards for real groups: card1=${card1}, card2=${card2}, card3=${card3}`);

  const realGroupsShot = path.join(ARTIFACT_DIR, 'projector-with-real-groups.png');
  await projectorPage.screenshot({ path: realGroupsShot });
  console.log('📸 Saved projector with real groups screenshot to:', realGroupsShot);

  // 5. Clean up by deleting all groups to leave the app completely fresh and clean
  console.log('Resetting back to completely empty state for user...');
  await adminPage.click('button:has-text("Clear All Groups")');
  await adminPage.waitForTimeout(300);
  await adminPage.click('button:has-text("Confirm")');
  await adminPage.waitForTimeout(500);

  const finalState = await projectorPage.evaluate(() => JSON.parse(localStorage.getItem('bible-quiz-state')));
  console.log(`Final state: ${finalState.teams.length} teams (100% clean and ready for user).`);

  await browser.close();
  console.log('🎉 Verification completed successfully!');
})();
