const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';
const img1920 = path.join(ARTIFACTS_DIR, 'projector-fixed-1920x1080.png');
const img1024 = path.join(ARTIFACTS_DIR, 'projector-fixed-1024x768.png');
const img923 = path.join(ARTIFACTS_DIR, 'projector-fixed-923x846.png');

async function createComparison() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1400 } });

  const b64_1920 = fs.readFileSync(img1920).toString('base64');
  const b64_1024 = fs.readFileSync(img1024).toString('base64');
  const b64_923 = fs.readFileSync(img923).toString('base64');

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
          font-size: 17px;
          margin-bottom: 24px;
          color: rgba(255, 255, 255, 0.7);
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        .card {
          background: #1a0f4a;
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
        }
        .card-header {
          padding: 12px 20px;
          font-size: 18px;
          font-weight: 700;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(251, 191, 36, 0.15);
          color: #fde68a;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .badge {
          font-size: 12px;
          padding: 3px 10px;
          border-radius: 9999px;
          background: rgba(251, 191, 36, 0.25);
          border: 1px solid #fbbf24;
          color: #fff;
          font-weight: 800;
        }
        .img-wrap {
          padding: 12px;
          background: #13073a;
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1;
        }
        img {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 10px;
        }
      </style>
    </head>
    <body>
      <h1>PROJECTOR VIEW ("/") · RESPONSIVENESS ACROSS ASPECT RATIOS</h1>
      <p class="subtitle">Fixed 1920x1080 Stage · Uniform Scale & Centering · Tabs Fully Visible · 14 List Rows Fully Visible · Zero Clipping</p>

      <div class="grid">
        <div class="card">
          <div class="card-header">
            <span>16:9 FULLSCREEN (1920x1080)</span>
            <span class="badge">16:9 Full</span>
          </div>
          <div class="img-wrap">
            <img src="data:image/png;base64,${b64_1920}" />
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span>4:3 TRADITIONAL PROJECTOR (1024x768)</span>
            <span class="badge">4:3 Aspect</span>
          </div>
          <div class="img-wrap">
            <img src="data:image/png;base64,${b64_1024}" />
          </div>
        </div>
      </div>

      <div class="card" style="max-width: 900px; margin: 0 auto;">
        <div class="card-header">
          <span>NEAR-SQUARE RESIZED WINDOW (923x846)</span>
          <span class="badge">Square Window</span>
        </div>
        <div class="img-wrap">
          <img src="data:image/png;base64,${b64_923}" />
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(400);

  const outPath = path.join(ARTIFACTS_DIR, 'projector-responsiveness-comparison.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Saved responsiveness comparison to:', outPath);

  await browser.close();
}

createComparison().catch(console.error);
