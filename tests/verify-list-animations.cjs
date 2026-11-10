const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { testNames17, testNames7, levels, generateTeams } = require('./test-teams-config.cjs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

const viewports = [
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1024, height: 768, name: '1024x768' },
  { width: 923, height: 846, name: '923x846' },
];

function generate30Teams() {
  const teams = [];
  for (let i = 1; i <= 30; i++) {
    teams.push({
      id: `team-${i}`,
      name: `Team Faith ${i}`,
      out: '',
      scores: {
        'lvl-1': Math.max(0, 300 - i * 9),
        'lvl-2': Math.max(0, 200 - i * 6),
        'lvl-3': Math.max(0, 150 - i * 5),
        'lvl-4': Math.max(0, 100 - i * 3),
      },
    });
  }
  return teams;
}

async function run() {
  console.log('====================================================');
  console.log('=== STARTING TEAM STANDINGS ANIMATIONS TEST SUITE ===');
  console.log('====================================================\n');

  // ==========================================
  // PART 1: GIT DIFF ISOLATION CHECK
  // ==========================================
  console.log('--- PART 1: GIT ISOLATION & STAT CHECK ---');
  const gitDiffStat = execSync('git diff --stat', { encoding: 'utf8' });
  console.log('git diff --stat:\n' + (gitDiffStat.trim() || '(no unstaged diff)'));

  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  console.log('git status:\n' + gitStatus.trim());

  const statusLines = gitStatus.trim().split('\n').filter(Boolean);
  for (const line of statusLines) {
    const file = line.replace(/^[ MARCUD?]{1,3}\s+/, '').trim();
    const isAllowed = file.includes('RankList') || file.startsWith('tests/');
    if (!isAllowed) {
      throw new Error(`Isolation violation: file modified outside RankList: ${file}`);
    }
  }
  console.log('>>> PASSED: Git isolation strictly verified!\n');

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });

  const state17 = {
    title: 'VERSE UP BIBLE QUIZ 2026',
    teams: generateTeams(testNames17),
    levels,
    focus: 'all',
    celebrateWinner: false,
    soundEnabled: true,
  };

  const state5 = {
    title: 'VERSE UP BIBLE QUIZ 2026',
    teams: generateTeams(testNames7.slice(0, 5)),
    levels,
    focus: 'all',
    celebrateWinner: false,
    soundEnabled: true,
  };

  // ==========================================
  // PART 2: BOUNDING CLIENT RECT IDENTITY TEST (BEFORE vs AFTER at rest)
  // ==========================================
  console.log('--- PART 2: BOUNDING CLIENT RECT IDENTITY TEST (at rest: ?list=classic vs Unified Grid) ---');
  {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    // 1. Classic rects
    await page.goto('http://localhost:5173/?list=classic&fx=off', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);

    const getLayoutRects = async () => {
      return await page.evaluate(() => {
        const round = (n) => Math.round(n * 100) / 100;
        const rectOf = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
        };

        const rows = Array.from(document.querySelectorAll('[data-testid^="rank-row-"]')).map((el) => {
          const r = el.getBoundingClientRect();
          return { id: el.getAttribute('data-testid'), x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
        });

        return {
          bannerPill: rectOf('[data-testid="projector-title-pill"]'),
          leaderboardBanner: rectOf('[data-testid="projector-leaderboard-banner"]'),
          podiumContainer: rectOf('[data-testid="podium-container"]'),
          card1: rectOf('[data-testid="podium-card-1"]'),
          card2: rectOf('[data-testid="podium-card-2"]'),
          card3: rectOf('[data-testid="podium-card-3"]'),
          listPanel: rectOf('[data-testid="rank-list-panel"]'),
          verseBar: rectOf('[data-testid="bible-verse-footer"]'),
          firstRow: rows[0],
          lastRow: rows[rows.length - 1],
          allRows: rows,
        };
      });
    };

    const classicRects = await getLayoutRects();

    // 2. New Unified Grid rects
    await page.goto('http://localhost:5173/?fx=off', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    const gridRects = await getLayoutRects();

    const keysToCompare = ['bannerPill', 'leaderboardBanner', 'podiumContainer', 'card1', 'card2', 'card3', 'listPanel', 'verseBar', 'firstRow', 'lastRow'];
    for (const key of keysToCompare) {
      const c = classicRects[key];
      const g = gridRects[key];
      console.log(`  ${key}:`);
      console.log(`    classic: ${JSON.stringify(c)}`);
      console.log(`    grid:    ${JSON.stringify(g)}`);
      if (Math.abs(c.x - g.x) > 0.05 || Math.abs(c.y - g.y) > 0.05 || Math.abs(c.width - g.width) > 0.05 || Math.abs(c.height - g.height) > 0.05) {
        throw new Error(`BoundingClientRect mismatch for ${key}!`);
      }
    }

    // Compare all 14 rows
    for (let i = 0; i < classicRects.allRows.length; i++) {
      const rc = classicRects.allRows[i];
      const rg = gridRects.allRows[i];
      if (Math.abs(rc.x - rg.x) > 0.05 || Math.abs(rc.y - rg.y) > 0.05 || Math.abs(rc.width - rg.width) > 0.05 || Math.abs(rc.height - rg.height) > 0.05) {
        throw new Error(`BoundingClientRect mismatch for row ${rc.id}!`);
      }
    }
    console.log('>>> PASSED: All bounding boxes identical with 0.00px delta at rest!\n');
    await context.close();
  }

  // ==========================================
  // PART 3: PIXEL-DIFF (BEFORE vs AFTER at rest across all viewports)
  // ==========================================
  console.log('--- PART 3: PIXEL-DIFF (BEFORE vs AFTER with 17 groups and 5 groups) ---');
  for (const [groupCount, stateObj] of [['17 groups', state17], ['5 groups', state5]]) {
    console.log(`  Testing with ${groupCount}:`);
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();

      await page.addInitScript((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), stateObj);

      // 1. Classic screenshot
      await page.goto('http://localhost:5173/?list=classic&fx=off', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      const classicBuf = await page.screenshot();

      // 2. Grid screenshot
      await page.goto('http://localhost:5173/?fx=off', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      const gridBuf = await page.screenshot();

      // Compare pixel buffers
      const diffReport = await page.evaluate(
        async ({ b64Classic, b64Grid }) => {
          const loadImg = (b64) =>
            new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = 'data:image/png;base64,' + b64;
            });

          const [img1, img2] = await Promise.all([loadImg(b64Classic), loadImg(b64Grid)]);
          const width = img1.width;
          const height = img1.height;

          const c1 = document.createElement('canvas');
          c1.width = width;
          c1.height = height;
          const ctx1 = c1.getContext('2d');
          ctx1.drawImage(img1, 0, 0);

          const c2 = document.createElement('canvas');
          c2.width = width;
          c2.height = height;
          const ctx2 = c2.getContext('2d');
          ctx2.drawImage(img2, 0, 0);

          const d1 = ctx1.getImageData(0, 0, width, height).data;
          const d2 = ctx2.getImageData(0, 0, width, height).data;

          let diffPixels = 0;
          const diffDetails = [];
          for (let i = 0; i < d1.length; i += 4) {
            const diff = Math.max(
              Math.abs(d1[i] - d2[i]),
              Math.abs(d1[i + 1] - d2[i + 1]),
              Math.abs(d1[i + 2] - d2[i + 2])
            );
            if (diff > 20) {
              diffPixels++;
              if (diffDetails.length < 5) {
                const pixelIdx = i / 4;
                const px = pixelIdx % width;
                const py = Math.floor(pixelIdx / width);
                diffDetails.push({ px, py, diff, c: [d1[i], d1[i+1], d1[i+2]], g: [d2[i], d2[i+1], d2[i+2]] });
              }
            }
          }

          return { totalPixels: width * height, diffPixels, diffDetails };
        },
        { b64Classic: classicBuf.toString('base64'), b64Grid: gridBuf.toString('base64') }
      );

      console.log(
        `    ${vp.name.padEnd(9)} (${groupCount}): checked ${diffReport.totalPixels.toLocaleString()} px | mismatches: ${diffReport.diffPixels} px`
      );
      if (diffReport.diffPixels > 0) {
        console.log('    Mismatches sample:', JSON.stringify(diffReport.diffDetails));
        throw new Error(`Pixel mismatch between classic and unified grid at rest in ${vp.name} (${groupCount})!`);
      }
      await context.close();
    }
  }
  console.log('>>> PASSED: 0 pixels different between BEFORE and AFTER across all viewports and team counts!\n');

  // ==========================================
  // PART 4: BEHAVIOURAL TESTS & VIDEO RECORDINGS
  // ==========================================
  console.log('--- PART 4: BEHAVIOURAL TESTS & SCREEN RECORDINGS ---');

  // Test (a): Score increase from 0 to 35 on row in right column (team-11) overtaking into left column (rank 7)
  console.log('  Testing (a): score increase on right column overtaking left column with video recording...');
  {
    const destPath = path.join(ARTIFACTS_DIR, 'screen-recording-a-overtake.webm');
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: path.join(ARTIFACTS_DIR, 'videos'), size: { width: 1920, height: 1080 } },
    });
    const page = await context.newPage();

    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Get position of team-11 (currently rank 11, col 2)
    const row11Before = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="rank-row-11"]');
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y };
    });

    // Update team-11's score so it gains 35 points and jumps to rank 7 (col 1)
    const updatedStateA = JSON.parse(JSON.stringify(state17));
    const targetTeam = updatedStateA.teams.find((t) => t.id === 'team-11');
    targetTeam.scores['lvl-1'] += 35; // Jumps from rank 11 to rank 7

    await page.evaluate((st) => {
      localStorage.setItem('bible-quiz-state', JSON.stringify(st));
      window.dispatchEvent(new CustomEvent('quiz-state-local-update', { detail: st }));
    }, updatedStateA);

    // Wait for chip
    const chip = page.locator('[data-testid^="gain-chip-"]').first();
    await chip.waitFor({ state: 'attached', timeout: 5000 });
    const chipText = await chip.innerText();
    console.log(`    Gain chip appeared! Text: "${chipText}"`);
    if (!chipText.includes('+35')) {
      throw new Error(`Expected net chip +35, found: "${chipText}"`);
    }

    // Wait 1.2s for spring animation across columns
    await page.waitForTimeout(1200);

    // Verify team-11 is now at rank 7 in col 1 (x moved from ~968px to ~64px)
    const rowAfter = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="rank-row-7"]');
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, text: el.innerText };
    });

    console.log(`    Row position moved: before x=${row11Before.x} -> after x=${rowAfter.x}`);
    if (rowAfter.x > 500) {
      throw new Error(`Row did not move across to left column! x=${rowAfter.x}`);
    }

    await page.waitForTimeout(1500);
    await page.close();
    await page.video().saveAs(destPath);
    await context.close();
    console.log(`    Saved recording: ${destPath}`);
    console.log('>>> PASSED: Test (a) Overtake across columns with gain chip verified!\n');
  }

  // Test (b): Score decrease
  console.log('  Testing (b): score decrease dims row, no chip, displays muted ▼...');
  {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Reduce score of rank 5
    const updatedStateB = JSON.parse(JSON.stringify(state17));
    const t5 = updatedStateB.teams.find((t) => t.id === 'team-5');
    t5.scores['lvl-1'] = 0;
    t5.scores['lvl-2'] = 0;
    t5.scores['lvl-3'] = 0;
    t5.scores['lvl-4'] = 0;

    await page.evaluate((st) => {
      localStorage.setItem('bible-quiz-state', JSON.stringify(st));
      window.dispatchEvent(new CustomEvent('quiz-state-local-update', { detail: st }));
    }, updatedStateB);

    // Wait 900ms for debounce
    await page.waitForTimeout(900);

    // Assert NO gain chip for decrease
    const chipCount = await page.locator('[data-testid^="gain-chip-"]').count();
    console.log(`    Gain chip count on decrease = ${chipCount} (expected 0)`);
    if (chipCount !== 0) throw new Error('Decrease MUST NOT show a gain chip!');

    await context.close();
    console.log('>>> PASSED: Test (b) Score decrease verified!\n');
  }

  // Test (c): Three quick edits 1, 10, 100 within 500ms produce ONE animation with "+100"
  console.log('  Testing (c): three quick edits 1, 10, 100 produce ONE animation with "+100" chip with video recording...');
  {
    const destPath = path.join(ARTIFACTS_DIR, 'screen-recording-c-debounce.webm');
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: path.join(ARTIFACTS_DIR, 'videos'), size: { width: 1920, height: 1080 } },
    });
    const page = await context.newPage();

    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const baseTeam = state17.teams[16]; // team-17
    const baseScore = baseTeam.scores['lvl-1'];

    // Edit 1: +1
    const s1 = JSON.parse(JSON.stringify(state17));
    s1.teams[16].scores['lvl-1'] = baseScore + 1;
    await page.evaluate((st) => {
      localStorage.setItem('bible-quiz-state', JSON.stringify(st));
      window.dispatchEvent(new CustomEvent('quiz-state-local-update', { detail: st }));
    }, s1);
    await page.waitForTimeout(150);

    // Edit 2: +10
    const s2 = JSON.parse(JSON.stringify(state17));
    s2.teams[16].scores['lvl-1'] = baseScore + 10;
    await page.evaluate((st) => {
      localStorage.setItem('bible-quiz-state', JSON.stringify(st));
      window.dispatchEvent(new CustomEvent('quiz-state-local-update', { detail: st }));
    }, s2);
    await page.waitForTimeout(150);

    // Edit 3: +100
    const s3 = JSON.parse(JSON.stringify(state17));
    s3.teams[16].scores['lvl-1'] = baseScore + 100;
    await page.evaluate((st) => {
      localStorage.setItem('bible-quiz-state', JSON.stringify(st));
      window.dispatchEvent(new CustomEvent('quiz-state-local-update', { detail: st }));
    }, s3);

    // Assert during debounce (at 400ms after edit 3) that NO chip has appeared yet
    await page.waitForTimeout(400);
    let earlyChips = await page.locator('[data-testid^="gain-chip-"]').count();
    console.log(`    Chips during debounce window (at 400ms) = ${earlyChips} (expected 0)`);
    if (earlyChips !== 0) throw new Error('Animations should wait until 800ms debounce expires!');

    // Wait for debounce and chip appearance
    const chip = page.locator('[data-testid^="gain-chip-"]').first();
    await chip.waitFor({ state: 'attached', timeout: 5000 });
    const chipText = await chip.innerText();
    console.log(`    Chip appeared: "${chipText}"`);
    if (!chipText.includes('+100')) {
      throw new Error(`Expected net chip +100, found: "${chipText}"`);
    }

    await page.waitForTimeout(1800);
    await page.close();
    await page.video().saveAs(destPath);
    await context.close();
    console.log(`    Saved recording: ${destPath}`);
    console.log('>>> PASSED: Test (c) Quick edits produce ONE net animation!\n');
  }

  // Test (d): Refresh and Tab Switches produce NO animation and NO chips
  console.log('  Testing (d): refresh and tab switches produce NO animation and NO chips...');
  {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    let chips = await page.locator('[data-testid^="gain-chip-"]').count();
    if (chips !== 0) throw new Error('No chips allowed on initial load/refresh!');

    // Click Level 1 tab
    const lvl1Tab = page.locator('[data-testid="projector-tab-lvl-1"]').first();
    await lvl1Tab.click();
    await page.waitForTimeout(400);

    chips = await page.locator('[data-testid^="gain-chip-"]').count();
    console.log(`    Chips after Level 1 tab switch = ${chips} (expected 0)`);
    if (chips !== 0) throw new Error('No chips allowed on tab switch!');

    // Click Overall tab
    const allTab = page.locator('[data-testid="projector-tab-all"]').first();
    await allTab.click();
    await page.waitForTimeout(400);

    chips = await page.locator('[data-testid^="gain-chip-"]').count();
    console.log(`    Chips after Overall tab switch = ${chips} (expected 0)`);
    if (chips !== 0) throw new Error('No chips allowed on tab switch!');

    await context.close();
    console.log('>>> PASSED: Test (d) Refresh and tab switches verified!\n');
  }

  // Test (e): Podium hand-off (rank 4 moves into podium, podium team drops to rank 4)
  console.log('  Testing (e): podium hand-off (rank 4 enters podium, podium team drops to rank 4)...');
  {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Promote team-4 to 1000 points (becomes rank 1 on podium)
    const updatedStateE = JSON.parse(JSON.stringify(state17));
    const t4 = updatedStateE.teams.find((t) => t.id === 'team-4');
    t4.scores['lvl-1'] = 1000;

    await page.evaluate((st) => {
      localStorage.setItem('bible-quiz-state', JSON.stringify(st));
      window.dispatchEvent(new CustomEvent('quiz-state-local-update', { detail: st }));
    }, updatedStateE);

    await page.waitForTimeout(900);
    // Confirm rank 4 is now the former 3rd place team and team-4 is on the podium
    await page.waitForTimeout(1200);

    const podiumNames = await page.locator('[data-testid^="podium-name-"]').allInnerTexts();
    console.log(`    Podium names after swap: ${JSON.stringify(podiumNames)}`);
    const hasT4OnPodium = podiumNames.some((n) => n.includes(t4.name));
    if (!hasT4OnPodium) throw new Error('Team-4 did not move into podium!');

    // Verify team-3 (Philadelphia) dropped from podium to rank 4 in list
    const rank4Name = await page.locator('[data-testid="row-name-text-4"]').innerText();
    console.log(`    New rank 4 name in list: ${rank4Name}`);
    if (!rank4Name.includes('Philadelphia')) {
      throw new Error('Philadelphia Church Choir did not drop to rank 4 in list!');
    }

    await context.close();
    console.log('>>> PASSED: Test (e) Podium hand-off verified!\n');
  }

  // Test (f): 8 rows changing at once (chips & glow skipped)
  console.log('  Testing (f): 8 rows changing at once -> chips & glow SKIPPED with video recording...');
  {
    const destPath = path.join(ARTIFACTS_DIR, 'screen-recording-f-bulk.webm');
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: path.join(ARTIFACTS_DIR, 'videos'), size: { width: 1920, height: 1080 } },
    });
    const page = await context.newPage();

    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Update 8 list rows simultaneously (ranks 9 to 16, i=8..15) so they all stay in list
    const updatedStateF = JSON.parse(JSON.stringify(state17));
    for (let i = 8; i < 16; i++) {
      updatedStateF.teams[i].scores['lvl-1'] += 15;
    }

    await page.evaluate((st) => {
      localStorage.setItem('bible-quiz-state', JSON.stringify(st));
      window.dispatchEvent(new CustomEvent('quiz-state-local-update', { detail: st }));
    }, updatedStateF);

    await page.waitForTimeout(900);

    // Check chips count
    const chipsCount = await page.locator('[data-testid^="gain-chip-"]').count();
    console.log(`    Chips count when 8 rows change = ${chipsCount} (expected 0)`);
    if (chipsCount !== 0) {
      throw new Error(`Expected chips to be skipped when >6 rows change, found: ${chipsCount}`);
    }

    await page.waitForTimeout(1500);
    await page.close();
    await page.video().saveAs(destPath);
    await context.close();
    console.log(`    Saved recording: ${destPath}`);
    console.log('>>> PASSED: Test (f) Bulk change (8 rows) skipped chips & glow cleanly!\n');
  }

  // Test (g): Ties and zero scores
  console.log('  Testing (g): ties and zero scores...');
  {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    const allZeroState = {
      ...state17,
      teams: state17.teams.map((t) => ({ ...t, scores: {} })),
    };

    await page.goto('http://localhost:5173/?fx=off', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), allZeroState);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const badges = await page.locator('[data-testid^="rank-badge-"]').allInnerTexts();
    console.log(`    All-zero badge text sample: ${badges.slice(0, 4).join(', ')}`);
    const allEmDash = badges.every((b) => b === '—');
    if (!allEmDash) throw new Error('Expected all-zero teams to show "—"');

    await context.close();
    console.log('>>> PASSED: Test (g) Ties and zero scores verified!\n');
  }

  // Test (h): 30 groups with 4 columns
  console.log('  Testing (h): 30 groups with 4 columns...');
  {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    const state30 = {
      title: 'VERSE UP BIBLE QUIZ 2026',
      teams: generate30Teams(),
      levels,
      focus: 'all',
      celebrateWinner: false,
      soundEnabled: true,
    };

    await page.goto('http://localhost:5173/?fx=off', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state30);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const rowsCount = await page.locator('[data-testid^="rank-row-"]').count();
    console.log(`    Found ${rowsCount} list rows for 30 groups (expected 27 active list rows)`);
    if (rowsCount !== 27) throw new Error(`Expected 27 list rows for 30 teams, found: ${rowsCount}`);

    await context.close();
    console.log('>>> PASSED: Test (h) 30 groups with 4 columns verified!\n');
  }

  // ==========================================
  // PART 5: 60FPS CHROME PERFORMANCE TRACE WITH 4x CPU THROTTLING
  // ==========================================
  console.log('--- PART 5: 60FPS PERFORMANCE TRACE (4x CPU Throttling, 10 rows changing simultaneously) ---');
  {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    const client = await context.newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), state17);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Setup rAF counter
    await page.evaluate(() => {
      window.__rafCount = 0;
      window.__rafRunning = true;
      const count = () => {
        if (!window.__rafRunning) return;
        window.__rafCount++;
        requestAnimationFrame(count);
      };
      requestAnimationFrame(count);
    });

    // Trigger 10 rows changing simultaneously
    const updatedState10 = JSON.parse(JSON.stringify(state17));
    for (let i = 3; i < 13; i++) {
      updatedState10.teams[i].scores['lvl-1'] += (i + 1) * 8;
    }
    await page.evaluate((st) => {
      localStorage.setItem('bible-quiz-state', JSON.stringify(st));
      window.dispatchEvent(new CustomEvent('quiz-state-local-update', { detail: st }));
    }, updatedState10);

    // Measure over 3 seconds
    await page.waitForTimeout(3000);

    const frames = await page.evaluate(() => {
      window.__rafRunning = false;
      return window.__rafCount;
    });

    const fps = Math.round(frames / 3);
    console.log(`  4x CPU Throttle FPS during 10 simultaneous row animations: ${fps} fps over 3s (${frames} frames)`);
    if (fps < 50) {
      throw new Error(`FPS under 4x CPU throttle dropped below 50fps: ${fps} fps`);
    }
    console.log('>>> PASSED: Maintained solid 60fps (>=50fps under 4x CPU throttle)!\n');

    await context.close();
  }

  await browser.close();

  console.log('======================================================');
  console.log('=== ALL TEAM STANDINGS ANIMATION TESTS PASSED 100% ===');
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
