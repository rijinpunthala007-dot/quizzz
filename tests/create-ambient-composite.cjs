const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/rijin/.gemini/antigravity/brain/f7ca2686-2d53-4a4b-8731-6d332b66ffe4';

async function generateComposite() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });

  const offBuf = fs.readFileSync(path.join(ARTIFACTS_DIR, 'ambient-fx-off-1920x1080.png'));
  const softBuf = fs.readFileSync(path.join(ARTIFACTS_DIR, 'ambient-fx-soft-1920x1080.png'));
  const fullBuf = fs.readFileSync(path.join(ARTIFACTS_DIR, 'ambient-fx-full-1920x1080.png'));
  const doveBuf = fs.readFileSync(path.join(ARTIFACTS_DIR, 'ambient-dove-flight.png'));

  const compositeHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 30px;
        background: #140733;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      h1 {
        text-align: center;
        color: #FFE27A;
        font-size: 28px;
        letter-spacing: 2px;
        margin-bottom: 24px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        max-width: 1860px;
        margin: 0 auto;
      }
      .card {
        background: rgba(36, 16, 96, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        padding: 16px;
      }
      .card-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .badge {
        padding: 3px 10px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
      }
      .badge-off { background: #4B5563; color: white; }
      .badge-soft { background: #F5C542; color: #140733; }
      .badge-full { background: #A855F7; color: white; }
      .badge-dove { background: #10B981; color: white; }
      img {
        width: 100%;
        height: auto;
        border-radius: 10px;
        display: block;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      }
    </style>
  </head>
  <body>
    <h1>PROJECTOR VIEW · SPIRITUAL AMBIENCE (AMBIENT FX) COMPARISON</h1>
    <div class="grid">
      <div class="card">
        <div class="card-title">
          <span class="badge badge-off">?fx=off</span>
          <span>Baseline · Pure Original Leaderboard</span>
        </div>
        <img src="data:image/png;base64,${offBuf.toString('base64')}" />
      </div>
      <div class="card">
        <div class="card-title">
          <span class="badge badge-soft">?fx=soft (Default)</span>
          <span>5 Light Rays, 8 Light Motes, Avatar Breathing Halo</span>
        </div>
        <img src="data:image/png;base64,${softBuf.toString('base64')}" />
      </div>
      <div class="card">
        <div class="card-title">
          <span class="badge badge-full">?fx=full</span>
          <span>Stained-Glass Arches, 16 Motes, Candle Glow Flicker</span>
        </div>
        <img src="data:image/png;base64,${fullBuf.toString('base64')}" />
      </div>
      <div class="card">
        <div class="card-title">
          <span class="badge badge-dove">Event Trigger</span>
          <span>White Dove Flight on New Leader (+ Winner Glow Swell)</span>
        </div>
        <img src="data:image/png;base64,${doveBuf.toString('base64')}" />
      </div>
    </div>
  </body>
  </html>
  `;

  const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
  await page.setContent(compositeHtml);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ambient-fx-comparison.png') });
  console.log('Saved ambient-fx-comparison.png');
  await browser.close();
}

generateComposite().catch((err) => {
  console.error(err);
  process.exit(1);
});

