import { mkdirSync, readFileSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { getTheme, type ThemeId } from '../packages/core/src';
import { color, directionLayout, COMPASS_LABEL_SIZE, CLOCK_NUM_SIZE, TARGET_ICON_SIZE } from '../packages/blocks/src';
import { initConfig } from './lessons/walk';

initConfig();

const outDir = resolve(process.cwd(), '.wt/screens/b17');
const backupDir = '/Users/yumo/.gemini/antigravity/brain/c8b1b3a8-7c0a-4bb1-9780-11bec572e354/round5-previews/b17';

mkdirSync(outDir, { recursive: true });
mkdirSync(backupDir, { recursive: true });

function getAssetDataUri(id: string): string | undefined {
  const assetPaths = [
    resolve(process.cwd(), `packages/content/assets/math/places/${id}.svg`),
    resolve(process.cwd(), `packages/content/assets/math/people/${id}.svg`),
    resolve(process.cwd(), `packages/content/assets/science/${id}.svg`),
  ];
  for (const p of assetPaths) {
    try {
      const content = readFileSync(p, 'utf8');
      const base64 = Buffer.from(content).toString('base64');
      return `data:image/svg+xml;base64,${base64}`;
    } catch {
      // not found
    }
  }
  return undefined;
}

function renderDirectionSvg(themeId: ThemeId, customProps?: Record<string, unknown>): string {
  const theme = getTheme(themeId);
  const defaultProps = {
    at: [400, 210] as [number, number],
    radius: 95,
    pointer: 45,
    showPointer: true,
    scaleBar: { km: 1, px: 70 },
    targets: [
      { bearing: 45, distance: 155, asset: 'park', label: '公园' },
      { bearing: 135, distance: 155, asset: 'hospital', label: '医院' },
      { bearing: 225, distance: 155, asset: 'zoo', label: '动物园' },
      { bearing: 315, distance: 155, asset: 'museum', label: '博物馆' },
    ],
  };

  const p = { ...defaultProps, ...customProps };
  const L = directionLayout(p);

  const lineColor = color('line', theme);
  const inkColor = color('ink', theme);
  const dimColor = color('dim', theme);
  const redColor = color('red', theme);
  const accentColor = color('accent', theme);
  const whiteColor = color('white', theme);
  const labelBgColor = color('labelBg', theme);

  let innerSvg = '';

  // 外圈圆
  if (L.compassCircle) {
    innerSvg += `<circle cx="${L.compassCircle.cx}" cy="${L.compassCircle.cy}" r="${L.compassCircle.r}" fill="none" stroke="${lineColor}" stroke-width="1.5" />\n`;
  }

  // 罗盘箭头
  if (L.compassArrows) {
    for (const arrow of L.compassArrows) {
      const fillColor = arrow.colorKey === 'red' ? redColor : inkColor;
      innerSvg += `<path d="${arrow.path}" fill="${fillColor}" opacity="${arrow.isMajor ? 0.9 : 0.65}" />\n`;
    }
  }

  // 方向文字
  if (L.dirLabels.length > 0) {
    for (const lbl of L.dirLabels) {
      const textColor = lbl.colorKey === 'red' ? redColor : inkColor;
      const weight = lbl.isMajor ? 'bold' : 'normal';
      innerSvg += `<text x="${lbl.pos[0]}" y="${lbl.pos[1]}" text-anchor="middle" dominant-baseline="central" font-size="${COMPASS_LABEL_SIZE}" font-weight="${weight}" fill="${textColor}">${lbl.text}</text>\n`;
    }
  }

  // 钟面刻度与数字
  if (L.clockTicks) {
    for (const tick of L.clockTicks) {
      const strokeC = tick.isMajor ? inkColor : dimColor;
      const strokeW = tick.isMajor ? 2.5 : 1.5;
      innerSvg += `<line x1="${tick.outer[0]}" y1="${tick.outer[1]}" x2="${tick.inner[0]}" y2="${tick.inner[1]}" stroke="${strokeC}" stroke-width="${strokeW}" stroke-linecap="round" />\n`;
    }
  }
  if (L.clockNumbers) {
    for (const numItem of L.clockNumbers) {
      innerSvg += `<text x="${numItem.pos[0]}" y="${numItem.pos[1]}" text-anchor="middle" dominant-baseline="central" font-size="${CLOCK_NUM_SIZE}" font-weight="500" fill="${inkColor}">${numItem.hour}</text>\n`;
    }
  }
  if (L.mode === 'clock') {
    const kidUrl = getAssetDataUri('kid');
    if (kidUrl) {
      innerSvg += `<image href="${kidUrl}" x="${L.cx - 20}" y="${L.cy - 20}" width="40" height="40" />\n`;
    } else {
      innerSvg += `<circle cx="${L.cx}" cy="${L.cy}" r="12" fill="${accentColor}" />\n<text x="${L.cx}" y="${L.cy}" text-anchor="middle" dominant-baseline="central" font-size="12" fill="${whiteColor}" font-weight="bold">${L.labels.me ?? ''}</text>\n`;
    }
  }

  // 十字标线与角弧
  if (L.bearingCross) {
    innerSvg += `<line x1="${L.bearingCross.ns[0][0]}" y1="${L.bearingCross.ns[0][1]}" x2="${L.bearingCross.ns[1][0]}" y2="${L.bearingCross.ns[1][1]}" stroke="${lineColor}" stroke-width="1.5" />\n`;
    innerSvg += `<line x1="${L.bearingCross.ew[0][0]}" y1="${L.bearingCross.ew[0][1]}" x2="${L.bearingCross.ew[1][0]}" y2="${L.bearingCross.ew[1][1]}" stroke="${lineColor}" stroke-width="1.5" />\n`;
  }
  if (L.bearingArc) {
    innerSvg += `<path d="${L.bearingArc.path}" fill="none" stroke="${accentColor}" stroke-width="2" />\n`;
    innerSvg += `<text x="${L.bearingArc.textPos[0]}" y="${L.bearingArc.textPos[1]}" text-anchor="middle" dominant-baseline="central" font-size="18" font-weight="bold" fill="${accentColor}">${L.bearingArc.text}</text>\n`;
  }

  // targets
  if (L.targets.length > 0) {
    for (const tgt of L.targets) {
      innerSvg += `<line x1="${L.cx}" y1="${L.cy}" x2="${tgt.pos[0]}" y2="${tgt.pos[1]}" stroke="${lineColor}" stroke-width="1" stroke-dasharray="4 3" opacity="0.7" />\n`;
      const url = tgt.asset ? getAssetDataUri(tgt.asset) : undefined;
      if (url) {
        innerSvg += `<image href="${url}" x="${tgt.pos[0] - TARGET_ICON_SIZE / 2}" y="${tgt.pos[1] - TARGET_ICON_SIZE / 2}" width="${TARGET_ICON_SIZE}" height="${TARGET_ICON_SIZE}" />\n`;
      } else {
        innerSvg += `<rect x="${tgt.pos[0] - TARGET_ICON_SIZE / 2}" y="${tgt.pos[1] - TARGET_ICON_SIZE / 2}" width="${TARGET_ICON_SIZE}" height="${TARGET_ICON_SIZE}" rx="8" fill="${labelBgColor}" stroke="${lineColor}" stroke-width="1.5" />\n`;
        innerSvg += `<circle cx="${tgt.pos[0]}" cy="${tgt.pos[1] - 4}" r="10" fill="${accentColor}" />\n`;
        innerSvg += `<circle cx="${tgt.pos[0]}" cy="${tgt.pos[1] - 4}" r="4" fill="${whiteColor}" />\n`;
      }
      if (tgt.label) {
        innerSvg += `<text x="${tgt.pos[0]}" y="${tgt.pos[1] + TARGET_ICON_SIZE / 2 + 14}" text-anchor="middle" dominant-baseline="central" font-size="18" font-weight="500" fill="${inkColor}">${tgt.label}</text>\n`;
      }
    }
  }

  // scaleBar
  if (L.scaleBar) {
    const sb = L.scaleBar;
    innerSvg += `<line x1="${sb.line[0][0]}" y1="${sb.line[0][1]}" x2="${sb.line[1][0]}" y2="${sb.line[1][1]}" stroke="${inkColor}" stroke-width="2" />\n`;
    innerSvg += `<line x1="${sb.leftTick[0][0]}" y1="${sb.leftTick[0][1]}" x2="${sb.leftTick[1][0]}" y2="${sb.leftTick[1][1]}" stroke="${inkColor}" stroke-width="2" />\n`;
    innerSvg += `<line x1="${sb.rightTick[0][0]}" y1="${sb.rightTick[0][1]}" x2="${sb.rightTick[1][0]}" y2="${sb.rightTick[1][1]}" stroke="${inkColor}" stroke-width="2" />\n`;
    innerSvg += `<text x="${sb.leftTextPos[0]}" y="${sb.leftTextPos[1]}" text-anchor="start" dominant-baseline="baseline" font-size="14" fill="${inkColor}">${sb.leftText}</text>\n`;
    innerSvg += `<text x="${sb.rightTextPos[0]}" y="${sb.rightTextPos[1]}" text-anchor="end" dominant-baseline="baseline" font-size="14" fill="${inkColor}">${sb.rightText}</text>\n`;
  }

  // pointer
  if (L.showPointer) {
    const rad = (L.pointer * Math.PI) / 180;
    const perpX = -Math.cos(rad);
    const perpY = -Math.sin(rad);

    const pTip = L.pointerTip;
    const halfBase = 5;
    const tailLen = 16;
    const tailTip = [
      L.cx - Math.sin(rad) * tailLen,
      L.cy + Math.cos(rad) * tailLen,
    ];

    const pLeft = [L.cx + perpX * halfBase, L.cy + perpY * halfBase];
    const pRight = [L.cx - perpX * halfBase, L.cy - perpY * halfBase];

    const pointerPath = `M ${tailTip[0]} ${tailTip[1]} L ${pLeft[0]} ${pLeft[1]} L ${pTip[0]} ${pTip[1]} L ${pRight[0]} ${pRight[1]} Z`;

    innerSvg += `<path d="${pointerPath}" fill="${redColor}" stroke="${inkColor}" stroke-width="1" />\n`;
    innerSvg += `<circle cx="${L.cx}" cy="${L.cy}" r="6" fill="${inkColor}" stroke="${whiteColor}" stroke-width="1.5" />\n`;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" style="background: ${theme.stageBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      ${innerSvg}
    </svg>
  `;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const themes: Array<{ id: ThemeId; name: string }> = [
    { id: 'flat', name: 'flat' },
    { id: 'chalk', name: 'chalk' },
    { id: 'cute', name: 'cute' },
    { id: 'pro', name: 'pro' },
  ];

  // 1. 截取 4 个主题效果图
  for (const t of themes) {
    const theme = getTheme(t.id);
    const svg = renderDirectionSvg(t.id);
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

    await page.setContent(html);
    await page.setViewportSize({ width: 800, height: 450 });

    const fileName = `theme-${t.name}.png`;
    const screenPath = join(outDir, fileName);
    await page.screenshot({ path: screenPath });
    copyFileSync(screenPath, join(backupDir, fileName));
    console.log(`Saved theme: ${screenPath}`);
  }

  // 2. 截取响应式宽度截图 (1280, 820, 390)
  const responsiveViewports = [
    { name: '1280', width: 1280, height: 800 },
    { name: '820', width: 820, height: 1180 },
    { name: '390', width: 390, height: 844 },
  ];

  for (const vp of responsiveViewports) {
    const theme = getTheme('flat');
    const svg = renderDirectionSvg('flat');
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
  <div class="header">方向标与方位图（direction） · ${vp.width}px</div>
  <div class="stage-container">
    ${svg}
  </div>
</body>
</html>`;

    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.setContent(html);

    const fileName = `responsive-${vp.name}.png`;
    const screenPath = join(outDir, fileName);
    await page.screenshot({ path: screenPath });
    copyFileSync(screenPath, join(backupDir, fileName));
    console.log(`Saved responsive: ${screenPath}`);
  }

  // 3. 截取额外模式（clock 与 bearing）
  const extraModes = [
    {
      name: 'mode-clock',
      props: {
        mode: 'clock' as const,
        radius: 150,
        pointer: 90,
        showPointer: true,
      },
    },
    {
      name: 'mode-bearing',
      props: {
        mode: 'bearing' as const,
        radius: 150,
        bearing: 30,
        pointer: 30,
        showPointer: true,
        scaleBar: { km: 2, px: 70 },
        targets: [
          { bearing: 30, distance: 140, asset: 'hospital', label: '灯塔' },
        ],
      },
    },
  ];

  for (const m of extraModes) {
    const theme = getTheme('flat');
    const svg = renderDirectionSvg('flat', m.props);
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

    await page.setContent(html);
    await page.setViewportSize({ width: 800, height: 450 });

    const fileName = `${m.name}.png`;
    const screenPath = join(outDir, fileName);
    await page.screenshot({ path: screenPath });
    copyFileSync(screenPath, join(backupDir, fileName));
    console.log(`Saved extra mode: ${screenPath}`);
  }

  await browser.close();
  console.log('All screenshots generated and backed up successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
