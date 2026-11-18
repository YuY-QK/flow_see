import { copyFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { getTheme } from '../packages/core/src';
import { color, calendarLayout } from '../packages/blocks/src';
import { initConfig } from './lessons/walk';

initConfig();

const outDir = resolve(process.cwd(), '.wt/screens/b11');
const backupDir = '/Users/yumo/.gemini/antigravity/brain/c8b1b3a8-7c0a-4bb1-9780-11bec572e354/round5-previews/b11';
mkdirSync(outDir, { recursive: true });
mkdirSync(backupDir, { recursive: true });

function renderCalendarSvg(themeId: string): string {
  const theme = getTheme(themeId);

  // 1. 左侧：2026 年 5 月单月日历
  const monthProps = {
    year: 2026,
    month: 5,
    weekStart: 0,
    cell: 42,
    marks: [
      [5, 1],
      [5, 4],
      [5, 28],
    ] as [number, number][],
    markColor: 'red',
    at: [30, 35] as [number, number],
  };
  const monthLayout = calendarLayout(monthProps);

  // 2. 右侧：12 个月天数条 (all 模式)
  const allProps = {
    year: 2026,
    month: 'all',
    show: 12,
    at: [365, 30] as [number, number],
  };
  const allLayout = calendarLayout(allProps);

  const inkColor = color('ink', theme);
  const dimColor = color('dim', theme);
  const lineColor = color('line', theme);
  const redColor = color('red', theme);
  const markStrokeColor = color(monthLayout.markColor, theme, 'red');

  // 渲染月历
  const titleH = monthLayout.titleBox?.h ?? Math.round(monthLayout.cell * 0.85);
  const headerH = monthLayout.weekdayHeaders?.[0]?.box.h ?? Math.round(monthLayout.cell * 0.65);
  const titleCenterX = monthLayout.at[0] + monthLayout.box.w / 2;
  const titleCenterY = monthLayout.at[1] + titleH / 2;
  const headerCenterY = monthLayout.at[1] + titleH + headerH / 2;
  const gridDividerY = monthLayout.at[1] + titleH + headerH;

  const headerSvgs = (monthLayout.weekdayHeaders ?? []).map((h) => {
    const cx = h.box.x + h.box.w / 2;
    const fill = h.isWeekend ? redColor : dimColor;
    return `<text x="${cx}" y="${headerCenterY}" text-anchor="middle" dominant-baseline="central" font-size="18" font-weight="600" fill="${fill}">${h.text}</text>`;
  });

  const daySvgs = (monthLayout.days ?? []).map((d) => {
    const cx = d.x + d.box.w / 2;
    const cy = d.y + d.box.h / 2;
    const markR = monthLayout.cell * 0.42;
    const markSvg = d.isMarked
      ? `<circle cx="${cx}" cy="${cy}" r="${markR}" fill="none" stroke="${markStrokeColor}" stroke-width="3"/>`
      : '';
    return `
      <g>
        <rect x="${d.x}" y="${d.y}" width="${d.box.w}" height="${d.box.h}" fill="none" stroke="${lineColor}" stroke-width="1" stroke-opacity="0.25"/>
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="20" fill="${inkColor}" style="font-variant-numeric: tabular-nums;">${d.day}</text>
        ${markSvg}
      </g>
    `;
  });

  // 渲染全年条
  const barSvgs = (allLayout.monthBars ?? []).map((bar) => {
    if (!bar.visible) return '';
    const rowCenterY = bar.box.y + bar.box.h / 2;
    const barFill = color(bar.colorName, theme, 'blue');
    const barStartX = allLayout.at[0] + 56 + 12;
    return `
      <g>
        <text x="${allLayout.at[0] + 56}" y="${rowCenterY}" text-anchor="end" dominant-baseline="central" font-size="18" font-weight="500" fill="${inkColor}" style="font-variant-numeric: tabular-nums;">${bar.label}</text>
        <rect x="${barStartX}" y="${bar.barBox.y}" width="${bar.fullWidth}" height="${bar.barBox.h}" rx="9" ry="9" fill="${lineColor}" fill-opacity="0.25"/>
        <rect x="${barStartX}" y="${bar.barBox.y}" width="${bar.currentWidth}" height="${bar.barBox.h}" rx="9" ry="9" fill="${barFill}"/>
        <text x="${barStartX + bar.fullWidth + 10}" y="${rowCenterY}" text-anchor="start" dominant-baseline="central" font-size="16" fill="${dimColor}" style="font-variant-numeric: tabular-nums;">${bar.daysLabel}</text>
      </g>
    `;
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" style="background: ${theme.stageBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <!-- 左侧单月日历 -->
      <g>
        <text x="${titleCenterX}" y="${titleCenterY}" text-anchor="middle" dominant-baseline="central" font-size="24" font-weight="bold" fill="${inkColor}">${monthLayout.title}</text>
        ${headerSvgs.join('\n')}
        <line x1="${monthLayout.at[0]}" y1="${gridDividerY}" x2="${monthLayout.at[0] + monthLayout.box.w}" y2="${gridDividerY}" stroke="${lineColor}" stroke-width="1" opacity="0.4"/>
        ${daySvgs.join('\n')}
      </g>

      <!-- 中间装饰分割虚线 -->
      <line x1="345" y1="30" x2="345" y2="420" stroke="${lineColor}" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.3"/>

      <!-- 右侧全年天数条 -->
      <g>
        ${barSvgs.join('\n')}
      </g>
    </svg>
  `;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const themes = ['flat', 'chalk', 'cute', 'pro'] as const;

  for (const themeId of themes) {
    const theme = getTheme(themeId);
    const svg = renderCalendarSvg(themeId);
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
    const fileName = `theme-${themeId}.png`;
    const screenPath = join(outDir, fileName);
    await page.screenshot({ path: screenPath });
    copyFileSync(screenPath, join(backupDir, fileName));
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
    const svg = renderCalendarSvg('flat');
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
  <div class="header">日历与时间周期（calendar） · ${vp.width}px</div>
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

  await browser.close();
  console.log('Screenshots generated successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
