import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { getTheme, type ThemeId } from '../packages/core/src';
import {
  CIRCLE_DRAW_LABEL_SIZE,
  CIRCLE_DRAW_STROKE_WIDTH,
  circleDrawLayout,
  color,
  type Point,
  type Props,
} from '../packages/blocks/src';
import { initConfig } from './lessons/walk';

initConfig();

const outDir = resolve(process.cwd(), '.wt/screens/b18');
const backupDir =
  '/Users/yumo/.gemini/antigravity/brain/c8b1b3a8-7c0a-4bb1-9780-11bec572e354/round6-previews/b18';

mkdirSync(outDir, { recursive: true });
mkdirSync(backupDir, { recursive: true });

function lerpPt(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function renderOneCircleDraw(p: Props, themeId: ThemeId): string {
  const theme = getTheme(themeId);
  const L = circleDrawLayout(p);

  const circleColor = color(p.color, theme, 'blue');
  const inkColor = color('ink', theme);
  const dimColor = color('dim', theme);
  const lineColor = color('line', theme);
  const accentColor = color('accent', theme);
  const redColor = color('red', theme);
  const whiteColor = color('white', theme);
  const centerColor = color('ink', theme);
  const radiusColor = color('orange', theme);
  const diameterColor = color('green', theme);

  const haloAttr = `paint-order="stroke" stroke="${theme.stageBg}" stroke-width="4" stroke-linejoin="round"`;

  let svg = '<g>\n';

  if (L.isFullCircle) {
    svg += `<circle cx="${L.cx}" cy="${L.cy}" r="${L.radius}" fill="${circleColor}" fill-opacity="0.15" stroke="${circleColor}" stroke-width="${CIRCLE_DRAW_STROKE_WIDTH}" />\n`;
  } else if (!L.isZeroDraw && L.arcPath) {
    svg += `<path d="${L.arcPath}" fill="none" stroke="${circleColor}" stroke-width="${CIRCLE_DRAW_STROKE_WIDTH}" stroke-linecap="round" />\n`;
  }

  if (L.showRoll && L.rollLayout) {
    const rl = L.rollLayout;
    svg += `<line x1="${rl.baselineStart[0]}" y1="${rl.baselineStart[1]}" x2="${rl.baselineEnd[0]}" y2="${rl.baselineEnd[1]}" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" />\n`;
    svg += `<line x1="${rl.rolledStart[0]}" y1="${rl.rolledStart[1] - 5}" x2="${rl.rolledStart[0]}" y2="${rl.rolledStart[1] + 5}" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" />\n`;
    svg += `<line x1="${rl.rolledEnd[0]}" y1="${rl.rolledEnd[1] - 5}" x2="${rl.rolledEnd[0]}" y2="${rl.rolledEnd[1] + 5}" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" />\n`;
    svg += `<line x1="${rl.rolledStart[0]}" y1="${rl.rolledStart[1]}" x2="${rl.rolledEnd[0]}" y2="${rl.rolledEnd[1]}" stroke="${accentColor}" stroke-width="5" stroke-linecap="round" />\n`;
    if (rl.circumferenceLabel) {
      svg += `<text x="${rl.circumferenceLabelPos[0]}" y="${rl.circumferenceLabelPos[1]}" fill="${accentColor}" font-size="${CIRCLE_DRAW_LABEL_SIZE}" font-weight="bold" text-anchor="middle" dominant-baseline="central">${rl.circumferenceLabel}</text>\n`;
    }
  }

  if (L.showDiameter) {
    svg += `<line x1="${L.diameterStart[0]}" y1="${L.diameterStart[1]}" x2="${L.diameterEnd[0]}" y2="${L.diameterEnd[1]}" stroke="${diameterColor}" stroke-width="3" stroke-linecap="round" />\n`;
    svg += `<circle cx="${L.diameterStart[0]}" cy="${L.diameterStart[1]}" r="3.5" fill="${diameterColor}" />\n`;
    svg += `<circle cx="${L.diameterEnd[0]}" cy="${L.diameterEnd[1]}" r="3.5" fill="${diameterColor}" />\n`;
  }

  L.radiiEnds.forEach((end, idx) => {
    if (idx > 0) {
      svg += `<line x1="${L.cx}" y1="${L.cy}" x2="${end[0]}" y2="${end[1]}" stroke="${radiusColor}" stroke-width="2.5" stroke-opacity="0.8" stroke-linecap="round" />\n`;
    }
  });
  if (L.radiiEnds.length >= 1) {
    const end0 = L.radiiEnds[0];
    svg += `<line x1="${L.cx}" y1="${L.cy}" x2="${end0[0]}" y2="${end0[1]}" stroke="${radiusColor}" stroke-width="3" stroke-linecap="round" />\n`;
    svg += `<circle cx="${end0[0]}" cy="${end0[1]}" r="3.5" fill="${radiusColor}" />\n`;
  }

  if (L.showCenter) {
    svg += `<circle cx="${L.cx}" cy="${L.cy}" r="5" fill="${centerColor}" />\n`;
  }

  if (L.showRoll) {
    svg += `<circle cx="${L.rollPoint[0]}" cy="${L.rollPoint[1]}" r="6" fill="${redColor}" stroke="${whiteColor}" stroke-width="2" />\n`;
  }

  if (L.showCenter && L.labels.center) {
    svg += `<text x="${L.centerLabelPos[0]}" y="${L.centerLabelPos[1]}" fill="${centerColor}" font-size="${CIRCLE_DRAW_LABEL_SIZE}" font-weight="bold" text-anchor="middle" dominant-baseline="central" ${haloAttr}>${L.labels.center}</text>\n`;
  }
  if (L.showRadiusLabel && L.labels.r) {
    svg += `<text x="${L.radiusLabelPos[0]}" y="${L.radiusLabelPos[1]}" fill="${radiusColor}" font-size="${CIRCLE_DRAW_LABEL_SIZE}" font-weight="bold" text-anchor="middle" dominant-baseline="central" ${haloAttr}>${L.labels.r}</text>\n`;
  }
  if (L.showDiameter && L.labels.d) {
    svg += `<text x="${L.diameterLabelPos[0]}" y="${L.diameterLabelPos[1]}" fill="${diameterColor}" font-size="${CIRCLE_DRAW_LABEL_SIZE}" font-weight="bold" text-anchor="middle" dominant-baseline="central" ${haloAttr}>${L.labels.d}</text>\n`;
  }

  if (L.showCompass && L.compass) {
    const c = L.compass;
    const needleSplit = lerpPt(c.hinge, c.needleTip, 0.85);
    const penSplit = lerpPt(c.hinge, c.penTip, 0.85);
    svg += `<line x1="${c.hinge[0]}" y1="${c.hinge[1]}" x2="${c.handleTop[0]}" y2="${c.handleTop[1]}" stroke="${inkColor}" stroke-width="5" stroke-linecap="round" />\n`;
    svg += `<line x1="${c.hinge[0]}" y1="${c.hinge[1]}" x2="${needleSplit[0]}" y2="${needleSplit[1]}" stroke="${inkColor}" stroke-width="4" stroke-linecap="round" />\n`;
    svg += `<line x1="${needleSplit[0]}" y1="${needleSplit[1]}" x2="${c.needleTip[0]}" y2="${c.needleTip[1]}" stroke="${dimColor}" stroke-width="2.5" stroke-linecap="round" />\n`;
    svg += `<line x1="${c.hinge[0]}" y1="${c.hinge[1]}" x2="${penSplit[0]}" y2="${penSplit[1]}" stroke="${inkColor}" stroke-width="4" stroke-linecap="round" />\n`;
    svg += `<line x1="${penSplit[0]}" y1="${penSplit[1]}" x2="${c.penTip[0]}" y2="${c.penTip[1]}" stroke="${circleColor}" stroke-width="4" stroke-linecap="round" />\n`;
    svg += `<circle cx="${c.penTip[0]}" cy="${c.penTip[1]}" r="3.5" fill="${circleColor}" />\n`;
    svg += `<circle cx="${c.hinge[0]}" cy="${c.hinge[1]}" r="6" fill="${whiteColor}" stroke="${inkColor}" stroke-width="2.5" />\n`;
  }

  svg += '</g>';
  return svg;
}

function renderShowcaseSvg(themeId: ThemeId): string {
  const theme = getTheme(themeId);
  const items: Props[] = [
    // 1. 左侧：圆规动态画圆（92% 进度 + 圆规 + 圆心 O + 半径 r）
    {
      at: [185, 240],
      radius: 95,
      draw: 0.92,
      compass: true,
      center: true,
      radii: 1,
      radiusLabel: true,
      color: 'blue',
    },
    // 2. 右上：完整填充圆 + 6 条均匀分布半径 + 水平直径（O, r, d）
    {
      at: [575, 130],
      radius: 85,
      draw: 1,
      center: true,
      radii: 6,
      radiusLabel: true,
      diameter: true,
      color: 'blue',
    },
    // 3. 右下：圆向右滚动测周长（roll = 0.75，红点顺时针转 + 下方周长粗线）
    {
      at: [415, 325],
      radius: 42,
      draw: 1,
      center: true,
      diameter: true,
      roll: 0.75,
      color: 'blue',
    },
  ];

  const font =
    theme.font && theme.font !== 'inherit'
      ? theme.font
      : "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI', sans-serif";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" style="background: ${theme.stageBg}; font-family: ${font};">
      ${items.map((p) => renderOneCircleDraw(p, themeId)).join('\n')}
    </svg>
  `;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const themes: ThemeId[] = ['flat', 'chalk', 'cute', 'pro'];

  for (const themeId of themes) {
    const theme = getTheme(themeId);
    const svg = renderShowcaseSvg(themeId);
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: ${theme.stageBg};
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  ${svg}
</body>
</html>`;

    await page.setViewportSize({ width: 800, height: 450 });
    await page.setContent(html);
    const screenPath = join(outDir, `theme-${themeId}.png`);
    await page.screenshot({ path: screenPath });
    console.log(`Saved theme: ${screenPath}`);
  }

  const responsiveViewports = [
    { name: '1280', width: 1280, height: 800 },
    { name: '820', width: 820, height: 1180 },
    { name: '390', width: 390, height: 844 },
  ];

  for (const vp of responsiveViewports) {
    const theme = getTheme('flat');
    const svg = renderShowcaseSvg('flat');
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 24px;
      background: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .header {
      width: 100%;
      max-width: 800px;
      margin-bottom: 16px;
      font-size: 20px;
      font-weight: bold;
      color: #1e293b;
    }
    .stage-container {
      width: 100%;
      max-width: 800px;
      background: ${theme.stageBg};
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      overflow: hidden;
      display: flex;
      justify-content: center;
    }
    .stage-container svg {
      width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <div class="header">圆规画圆与圆的认识（circle-draw） · ${vp.width}px</div>
  <div class="stage-container">
    ${svg}
  </div>
</body>
</html>`;

    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.setContent(html);
    const screenPath = join(outDir, `responsive-${vp.name}.png`);
    await page.screenshot({ path: screenPath });
    console.log(`Saved responsive: ${screenPath}`);
  }

  await browser.close();

  const files = readdirSync(outDir);
  for (const file of files) {
    copyFileSync(join(outDir, file), join(backupDir, file));
  }
  console.log(`Backed up all screenshots to ${backupDir}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
