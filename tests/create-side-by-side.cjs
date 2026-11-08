const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';
const origImgPath = path.join(ARTIFACTS_DIR, '.user_uploaded', 'media_1794077221733_87af5ca1.jpg');
const newImgPath = path.join(ARTIFACTS_DIR, 'projector-1920x1080-restored.png');

async function createSideBySide() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1100 } });

  const origBase64 = fs.readFileSync(origImgPath).toString('base64');
  const newBase64 = fs.readFileSync(newImgPath).toString('base64');

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
          font-family: system-ui, -apple-system, sans-serif;
          padding: 24px;
        }
        h1 {
          text-align: center;
          font-size: 28px;
          margin-bottom: 20px;
          color: #FFD54A;
          letter-spacing: 0.05em;
        }
        .container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
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
          padding: 12px 18px;
          background: rgba(255,255,255,0.06);
          font-weight: 800;
          font-size: 16px;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .badge {
          background: #FFD54A;
          color: #120835;
          padding: 2px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 900;
        }
        img {
          width: 100%;
          height: auto;
          display: block;
        }
      </style>
    </head>
    <body>
      <h1>Side-by-Side Comparison: Approved Original vs Restored Projector View</h1>
      <div class="container">
        <div class="card">
          <div class="card-header">
            <span>ORIGINAL DESIGN (Screenshot 2)</span>
            <span class="badge">Reference</span>
          </div>
          <img src="data:image/jpeg;base64,${origBase64}" alt="Original Design">
        </div>
        <div class="card">
          <div class="card-header">
            <span>RESTORED SURGICAL LOOK (1920x1080)</span>
            <span class="badge">Restored &amp; Enlarged</span>
          </div>
          <img src="data:image/png;base64,${newBase64}" alt="Restored Design">
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const outPath = path.join(ARTIFACTS_DIR, 'side-by-side-with-original.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Saved side-by-side comparison to:', outPath);

  await browser.close();
}

createSideBySide().catch(console.error);
