import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { getTheme, type ThemeId } from '../packages/core/src';
import { color, coordinateGridLayout } from '../packages/blocks/src';
import { initConfig } from './lessons/walk';

initConfig();

const outDir = resolve(process.cwd(), '.wt/screens/b16');
const backupDir =
  '/Users/yumo/.gemini/antigravity/brain/c8b1b3a8-7c0a-4bb1-9780-11bec572e354/round5-previews/b16';
mkdirSync(outDir, { recursive: true });
mkdirSync(backupDir, { recursive: true });

function renderCoordinateGridSvg(themeId: ThemeId): string {
  const theme = getTheme(themeId);

  const gridProps = {
    at: [120, 60],
    cols: 10,
    rows: 6,
    cell: 50,
    origin: 'bottom-left' as const,
    labels: true,
    axisLabels: ['列', '行'] as [string, string],
    color: 'line',
    points: [
      { at: [0, 0], label: 'O(0,0)', color: 'ink' },
      { at: [3, 2], label: 'A(3,2)', color: 'blue' },
      { at: [6, 4], label: 'B(6,4)', color: 'orange' },
      { at: [9, 5], label: 'C(9,5)', color: 'red' },
    ],
  };

  const L = coordinateGridLayout(gridProps);
  const strokeColor = color(L.color, theme, 'line');
  const dimColor = color('dim', theme);
  const inkColor = color('ink', theme);

  const innerColsSvg = L.innerCols
    .map(
      (c) =>
        `<line x1="${c.x}" y1="${c.y1}" x2="${c.x}" y2="${c.y2}" stroke="${strokeColor}" stroke-width="1"/>`,
    )
    .join('\n');

  const innerRowsSvg = L.innerRows
    .map(
      (r) =>
        `<line x1="${r.x1}" y1="${r.y}" x2="${r.x2}" y2="${r.y}" stroke="${strokeColor}" stroke-width="1"/>`,
    )
    .join('\n');

  const borderSvg = `<rect x="${L.border.x}" y="${L.border.y}" width="${L.border.w}" height="${L.border.h}" fill="none" stroke="${strokeColor}" stroke-width="2"/>`;

  const labelItemsSvg = L.labelItems
    .map((item) => {
      let anchor = 'middle';
      if (item.kind === 'row' || item.kind === 'axis-row') anchor = 'end';
      if (item.kind === 'axis-col') anchor = 'start';
      return `<text x="${item.x}" y="${item.y}" text-anchor="${anchor}" dominant-baseline="central" font-size="18" fill="${dimColor}">${item.text}</text>`;
    })
    .join('\n');

  const pointsSvg = L.points
    .map((pt) => {
      const ptColor = color(pt.color ?? 'blue', theme, 'blue');
      const circleSvg = `<circle cx="${pt.x}" cy="${pt.y}" r="7" fill="${ptColor}"/>`;
      const textSvg = pt.label
        ? `<text x="${pt.x + 10}" y="${pt.y - 10}" text-anchor="start" dominant-baseline="central" font-size="20" font-weight="600" fill="${inkColor}">${pt.label}</text>`
        : '';
      return `${circleSvg}\n${textSvg}`;
    })
    .join('\n');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" style="background: ${theme.stageBg}; font-family: ${theme.font || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"};">
      <g>
        ${innerColsSvg}
        ${innerRowsSvg}
        ${borderSvg}
        ${labelItemsSvg}
        ${pointsSvg}
      </g>
    </svg>
  `;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const themes: ThemeId[] = ['flat', 'chalk', 'cute', 'pro'];

  for (const themeId of themes) {
    const theme = getTheme(themeId);
    const svg = renderCoordinateGridSvg(themeId);
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
    const screenPath = join(outDir, `theme-${themeId}.png`);
    await page.screenshot({ path: screenPath });
    console.log(`Saved theme: ${screenPath}`);
  }

  // 响应式宽度截图 (1280, 820, 390)
  const responsiveViewports = [
    { name: '1280', width: 1280, height: 800 },
    { name: '820', width: 820, height: 1180 },
    { name: '390', width: 390, height: 844 },
  ];

  for (const vp of responsiveViewports) {
    const theme = getTheme('flat');
    const svg = renderCoordinateGridSvg('flat');
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
  <div class="header">方格纸与数对格（coordinate-grid） · ${vp.width}px</div>
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

  // 备份到 brain round5-previews
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
