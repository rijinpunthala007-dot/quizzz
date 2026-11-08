const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';
const beforeImgPath = path.join(ARTIFACTS_DIR, 'list-before-inside-layout.png');
const afterImgPath = path.join(ARTIFACTS_DIR, 'list-after-inside-layout.png');

async function createComparison() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1280 } });

  const beforeBase64 = fs.readFileSync(beforeImgPath).toString('base64');
  const afterBase64 = fs.readFileSync(afterImgPath).toString('base64');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #0d0628;
          color: #f4ecd8;
          font-family: 'Outfit', system-ui, -apple-system, sans-serif;
          padding: 32px;
        }
        h1 {
          text-align: center;
          font-size: 32px;
          margin-bottom: 8px;
          color: #FFD54A;
          letter-spacing: 0.05em;
        }
        .subtitle {
          text-align: center;
          font-size: 18px;
          margin-bottom: 24px;
          color: rgba(255, 255, 255, 0.7);
        }
        .container {
          display: flex;
          flex-direction: column;
          gap: 28px;
          width: 100%;
        }
        .card {
          background: #1a0f4a;
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .card-header {
          padding: 14px 24px;
          font-size: 20px;
          font-weight: 700;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .card-header.before {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }
        .card-header.after {
          background: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
        }
        .badge {
          font-size: 13px;
          padding: 4px 12px;
          border-radius: 9999px;
          text-transform: uppercase;
          font-weight: 800;
          letter-spacing: 0.05em;
        }
        .badge.before {
          background: rgba(239, 68, 68, 0.3);
          border: 1px solid #ef4444;
          color: #fee2e2;
        }
        .badge.after {
          background: rgba(16, 185, 129, 0.3);
          border: 1px solid #10b981;
          color: #d1fae5;
        }
        .img-wrap {
          padding: 16px;
          background: #250f6d;
          display: flex;
          justify-content: center;
        }
        img {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 12px;
        }
      </style>
    </head>
    <body>
      <h1>TEAM STANDINGS (RANKS 4+) · BEFORE VS AFTER</h1>
      <p class="subtitle">Surgical Inside-Row Layout Optimization: Flex structure (rank | avatar | name block [flex: 1 1 0] | score + PTS) · Zero wasted middle gap · Binary search fit text</p>

      <div class="container">
        <div class="card">
          <div class="card-header before">
            <span>BEFORE: Large Empty Gap in Middle of Rows (Cramped Name on Left)</span>
            <span class="badge before">BEFORE</span>
          </div>
          <div class="img-wrap">
            <img src="data:image/png;base64,${beforeBase64}" />
          </div>
        </div>

        <div class="card">
          <div class="card-header after">
            <span>AFTER: Name Block Takes All Available Width · Large Fit Text · Minimal Gap to Score</span>
            <span class="badge after">AFTER</span>
          </div>
          <div class="img-wrap">
            <img src="data:image/png;base64,${afterBase64}" />
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(500);

  const outPath = path.join(ARTIFACTS_DIR, 'list-before-after-comparison.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Saved side-by-side comparison to:', outPath);

  await browser.close();
}

createComparison().catch((err) => {
  console.error('Error creating side-by-side comparison:', err);
  process.exit(1);
});

