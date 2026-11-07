const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

async function testTiesAndLongNames() {
  console.log('--- Testing Ties & Long Team Names ---');
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // Set up mock state with a long team name and a tie in local storage
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  const tiedState = {
    title: 'Verse Up Bible Quiz 2026',
    focus: 'all',
    levels: [
      { id: 'l1', name: 'Level 1' },
      { id: 'l2', name: 'Level 2' },
      { id: 'l3', name: 'Level 3' },
      { id: 'l4', name: 'Level 4' },
    ],
    teams: [
      {
        id: 't1',
        name: 'The Good Samaritans of Galilee',
        out: '',
        scores: { l1: 75, l2: 75, l3: 75, l4: 75 }, // Total 300 (1st)
      },
      {
        id: 't2',
        name: 'Mount Zion Faithful Warriors',
        out: '',
        scores: { l1: 70, l2: 70, l3: 70, l4: 70 }, // Total 280 (Tied 2nd)
      },
      {
        id: 't3',
        name: 'Grace & Truth Fellowship',
        out: '',
        scores: { l1: 70, l2: 70, l3: 70, l4: 70 }, // Total 280 (Tied 2nd)
      },
      {
        id: 't4',
        name: 'Rock of Ages Youth',
        out: '',
        scores: { l1: 60, l2: 60, l3: 60, l4: 60 }, // Total 240
      },
    ],
    reveal: {
      active: true,
      step: 4, // Final podium
      mode: 'manual',
      sound: false,
      countdown: true,
      snapshot: [
        {
          id: 't1',
          name: 'The Good Samaritans of Galilee',
          total: 300,
          rank: 1,
          displayRank: '1',
          isTied: false,
        },
        {
          id: 't2',
          name: 'Mount Zion Faithful Warriors',
          total: 280,
          rank: 2,
          displayRank: 'T-2',
          isTied: true,
          subtitle: 'Tied Placement',
        },
        {
          id: 't3',
          name: 'Grace & Truth Fellowship',
          total: 280,
          rank: 2,
          displayRank: 'T-2',
          isTied: true,
          subtitle: 'Tied Placement',
        },
      ],
    },
  };

  await page.evaluate((st) => {
    localStorage.setItem('bible-quiz-state', JSON.stringify(st));
  }, tiedState);

  // Reload projector
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check overflow
  const hasOverflow = await page.evaluate(() => {
    const stage = document.querySelector('[data-testid="reveal-stage"]');
    if (!stage) return false;
    return stage.scrollHeight > stage.clientHeight || stage.scrollWidth > stage.clientWidth;
  });

  console.log(`Tied State Overflow Check: ${hasOverflow ? 'FAILED (overflow detected)' : 'PASSED (no overflow)'}`);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'reveal-tied-groups-long-names.png'),
    fullPage: false,
  });

  await browser.close();
  console.log('--- Ties & Long Team Names test complete! ---');
}

testTiesAndLongNames().catch((err) => {
  console.error(err);
  process.exit(1);
});

