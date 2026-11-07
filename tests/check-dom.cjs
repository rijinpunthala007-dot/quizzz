const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto('http://localhost:5173/admin');
  const userState = JSON.parse(fs.readFileSync('tests/user-initial-state.json', 'utf8'));
  userState.celebrateWinner = true;
  userState.winnersSnapshot = [
    { id: 't-1', name: 'MELVIN', total: 289, rank: 1, displayRank: '1', isTied: false },
    { id: 't-2', name: 'MILAN', total: 287, rank: 2, displayRank: '2', isTied: false },
    { id: 't-3', name: 'JOHN', total: 231, rank: 3, displayRank: '3', isTied: false },
  ];
  await page.evaluate((st) => localStorage.setItem('bible-quiz-state', JSON.stringify(st)), userState);

  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);

  const text = await page.evaluate(() => document.body.innerText);
  console.log('Projector text snippet:', text.slice(0, 300).replace(/\n+/g, ' '));

  const card1 = await page.$('[data-testid="celebration-card-1"]');
  console.log('Celebration card 1 element found:', Boolean(card1));

  if (card1) {
    const box = await card1.boundingBox();
    console.log('Card 1 bounding box:', box);
  }

  await browser.close();
})();

