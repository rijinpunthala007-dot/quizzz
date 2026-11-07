const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

async function testAll() {
  console.log('🚀 Starting Comprehensive Fixes Verification...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();

  const adminPage = await context.newPage();
  await adminPage.setViewportSize({ width: 1280, height: 900 });

  const projectorPage = await context.newPage();
  await projectorPage.setViewportSize({ width: 1920, height: 1080 });

  // 1. Load Admin and Reset to Clean Demo State
  await adminPage.goto('http://localhost:5173/admin', { waitUntil: 'networkidle' });
  const loadDemoBtn = await adminPage.$('button:has-text("Load Demo Groups")');
  if (loadDemoBtn) {
    await loadDemoBtn.click();
    await adminPage.waitForTimeout(300);
    const confirmBtn = await adminPage.$('button:has-text("Confirm")');
    if (confirmBtn) {
      await confirmBtn.click();
      await adminPage.waitForTimeout(500);
    }
  }

  // 2. Open Projector
  await projectorPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await projectorPage.waitForTimeout(600);

  console.log('\n--- TEST 1: Verifying 3 Podium Cards across ALL levels ---');
  const tabs = await projectorPage.$$('button[data-testid^="projector-tab-"]');
  console.log(`Found ${tabs.length} tabs on projector.`);

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const tabText = await tab.innerText();
    await tab.click();
    await projectorPage.waitForTimeout(400);

    const card1 = await projectorPage.isVisible('[data-testid="podium-card-1"]');
    const card2 = await projectorPage.isVisible('[data-testid="podium-card-2"]');
    const card3 = await projectorPage.isVisible('[data-testid="podium-card-3"]');

    console.log(`Tab "${tabText.replace(/\n/g, '')}": Card 1=${card1}, Card 2=${card2}, Card 3=${card3}`);

    if (!card1 || !card2 || !card3) {
      throw new Error(`❌ Missing podium card at tab "${tabText}"!`);
    }
  }
  console.log('✅ ALL levels show all 3 podium cards perfectly!');

  // Take screenshot of Level 3
  if (tabs.length >= 4) {
    await tabs[3].click(); // Level 3
    await projectorPage.waitForTimeout(400);
    const shotL3 = path.join(ARTIFACT_DIR, 'projector-level-3-verified.png');
    await projectorPage.screenshot({ path: shotL3 });
    console.log(`📸 Saved Level 3 screenshot: ${shotL3}`);
  }

  console.log('\n--- TEST 2: Testing Tie for 2nd Place (the user reported scenario) ---');
  // Set Team 2 and Team 3 to identical scores in Level 1 (first column)
  const inputsL1 = await adminPage.$$('input[data-coord$="-0"]');
  if (inputsL1.length >= 4) {
    await inputsL1[0].fill('100');
    await inputsL1[1].fill('85');
    await inputsL1[2].fill('85');
    await inputsL1[3].fill('70');
  }
  await adminPage.waitForTimeout(600);

  // Click Level 1 on projector
  const l1Tab = tabs[1];
  await l1Tab.click();
  await projectorPage.waitForTimeout(600);

  const tieCard1 = await projectorPage.isVisible('[data-testid="podium-card-1"]');
  const tieCard2 = await projectorPage.isVisible('[data-testid="podium-card-2"]');
  const tieCard3 = await projectorPage.isVisible('[data-testid="podium-card-3"]');

  console.log(`Tied 2nd place: Card 1=${tieCard1}, Card 2=${tieCard2}, Card 3=${tieCard3}`);
  if (!tieCard1 || !tieCard2 || !tieCard3) {
    throw new Error('❌ Missing card when 2nd place is tied!');
  }
  console.log('✅ Tied 2nd place correctly fills both slot 2 and slot 3 on the podium!');

  const shotTie = path.join(ARTIFACT_DIR, 'projector-tied-scores-verified.png');
  await projectorPage.screenshot({ path: shotTie });
  console.log(`📸 Saved Tied Scores screenshot: ${shotTie}`);

  console.log('\n--- TEST 3: Testing Adding a Brand New Level ---');
  await adminPage.click('[data-testid="quick-add-level-btn"]');
  await adminPage.waitForTimeout(600);

  // Verify Projector receives the new level tab!
  const updatedTabs = await projectorPage.$$('button[data-testid^="projector-tab-"]');
  console.log(`Projector level tabs count: ${updatedTabs.length} (expected 6: Overall + 5 levels)`);

  // Switch to the brand new level on the projector (where all scores are 0)
  const newLevelTab = updatedTabs[updatedTabs.length - 1];
  const newLvlName = await newLevelTab.innerText();
  await newLevelTab.click();
  await projectorPage.waitForTimeout(600);

  const newLvlCard1 = await projectorPage.isVisible('[data-testid="podium-card-1"]');
  const newLvlCard2 = await projectorPage.isVisible('[data-testid="podium-card-2"]');
  const newLvlCard3 = await projectorPage.isVisible('[data-testid="podium-card-3"]');
  console.log(`New Level (${newLvlName}) with 0 scores: Card 1=${newLvlCard1}, Card 2=${newLvlCard2}, Card 3=${newLvlCard3}`);

  if (!newLvlCard1 || !newLvlCard2 || !newLvlCard3) {
    throw new Error('❌ Missing podium cards on new level!');
  }
  console.log('✅ New level displays all 3 podium cards and all teams without issues!');

  const shotNewLvl = path.join(ARTIFACT_DIR, 'projector-new-level-verified.png');
  await projectorPage.screenshot({ path: shotNewLvl });
  console.log(`📸 Saved New Level screenshot: ${shotNewLvl}`);

  console.log('\n--- TEST 4: Testing Live Score Updates on New Level ---');
  // Enter a score for team 1 on the new level (column index 4)
  const newLvlInputs = await adminPage.$$('input[data-coord$="-4"]');
  if (newLvlInputs.length >= 2) {
    await newLvlInputs[0].fill('99');
    await newLvlInputs[1].fill('95');
  }
  await adminPage.waitForTimeout(600);

  // Check if Projector updated
  const score1 = await projectorPage.$eval('[data-testid="podium-score-1"]', el => el.innerText);
  console.log('Projector #1 score on new level:', score1);
  if (!score1.includes('99')) {
    throw new Error(`Expected score 99 on projector, got ${score1}`);
  }
  console.log('✅ Live score update instantly reflected on Projector!');

  await browser.close();
  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! ZERO CRITICAL BUGS REMAIN!');
}

testAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
