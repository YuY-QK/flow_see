import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { getTheme } from '../packages/core/src';
import { color, numberChartLayout } from '../packages/blocks/src';
import { initConfig } from './lessons/walk';

initConfig();

const outDir = resolve(process.cwd(), '.wt/screens/b5');
mkdirSync(outDir, { recursive: true });

function renderChartSvg(themeId: string): string {
  const theme = getTheme(themeId);
  const props = {
    from: 1,
    to: 100,
    cols: 10,
    cell: 38,
    marks: [
      { multiplesOf: 2, color: 'blue', style: 'fill' as const },
      { multiplesOf: 5, color: 'orange', style: 'circle' as const },
      { multiplesOf: 3, color: 'green', style: 'cross' as const },
    ],
    reveal: 3,
    at: [210, 30] as [number, number],
  };

  const layout = numberChartLayout(props);
  const lineColor = color('line', theme);
  const inkColor = color('ink', theme);

  const cellSvgs: string[] = [];

  for (const cell of layout.cells) {
    const { x, y, box, marks, num: cellNum } = cell;
    const cx = x + box.w / 2;
    const cy = y + box.h / 2;

    const fillMarks = marks.filter((m) => m.style === 'fill');
    const topMarks = marks.filter((m) => m.style !== 'fill');

    let marksSvg = '';

    // 1. 底层 fill
    for (const m of fillMarks) {
      const c = color(m.color, theme, 'blue');
      marksSvg += `<rect x="${x}" y="${y}" width="${box.w}" height="${box.h}" fill="${c}" fill-opacity="${0.35 * m.opacity}"/>`;
    }

    // 2. 文字
    const textSvg = `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${layout.size}" font-weight="500" fill="${inkColor}" style="font-variant-numeric: tabular-nums;">${cellNum}</text>`;

    // 3. 上层 circle 与 cross
    for (const m of topMarks) {
      const c = color(m.color, theme, 'blue');
      if (m.style === 'circle') {
        const r = box.w * 0.38;
        marksSvg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="3" opacity="${m.opacity}"/>`;
      } else if (m.style === 'cross') {
        marksSvg += `<line x1="${x}" y1="${y + box.h}" x2="${x + box.w}" y2="${y}" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="${m.opacity}"/>`;
      }
    }

    cellSvgs.push(`
      <g>
        <rect x="${x}" y="${y}" width="${box.w}" height="${box.h}" fill="none" stroke="${lineColor}" stroke-width="1"/>
        ${marksSvg}
        ${textSvg}
      </g>
    `);
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" style="background: ${theme.stageBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      ${cellSvgs.join('\n')}
    </svg>
  `;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const themes = ['flat', 'chalk', 'cute', 'pro'] as const;

  for (const themeId of themes) {
    const theme = getTheme(themeId);
    const svg = renderChartSvg(themeId);
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
    const svg = renderChartSvg('flat');
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
  <div class="header">百数表（number-chart） · ${vp.width}px</div>
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
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
