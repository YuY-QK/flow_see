import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { getTheme } from '../packages/core/src';
import { color, pathLayout, type PathLayoutResult, type Props } from '../packages/blocks/src';
import { initConfig } from './lessons/walk';

initConfig();

const outDir = resolve(process.cwd(), '.wt/screens/b13');
const backupDir = '/Users/yumo/.gemini/antigravity/brain/c8b1b3a8-7c0a-4bb1-9780-11bec572e354/round5-previews/b13';

mkdirSync(outDir, { recursive: true });
mkdirSync(backupDir, { recursive: true });

function renderPathSvg(themeId: string): string {
  const theme = getTheme(themeId);

  // 场景 1：闭合多边形路径，带 lengths 标注，小蚂蚁 marker 沿边缘前进 (draw: 0.7)
  const path1Props = {
    points: [
      [140, 100],
      [360, 100],
      [360, 240],
      [140, 240],
    ],
    closed: true,
    draw: 0.72,
    marker: 'ant',
    markerSize: 42,
    lengths: ['220 m', '140 m', '220 m', '140 m'],
    width: 5,
    color: 'accent',
  };
  const L1 = pathLayout(path1Props);

  // 场景 2：开放折线路径，虚线，dot marker 停在终点
  const path2Props = {
    points: [
      [460, 120],
      [560, 200],
      [660, 140],
      [740, 220],
    ],
    closed: false,
    draw: 1,
    marker: 'dot',
    lengths: ['128', '116', '113'],
    width: 4,
    color: 'blue',
    dashed: true,
  };
  const L2 = pathLayout(path2Props);

  // 场景 3：未闭合推进中的折线 (draw: 0.55)
  const path3Props = {
    points: [
      [140, 340],
      [320, 340],
      [440, 390],
      [740, 390],
    ],
    closed: false,
    draw: 0.65,
    marker: 'dot',
    lengths: ['180', '130', '300'],
    width: 5,
    color: 'green',
  };
  const L3 = pathLayout(path3Props);

  const renderSinglePath = (L: PathLayoutResult, p: Props, strokeHex: string) => {
    const isDashed = Boolean(p.dashed);
    const d = L.drawnPoints.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt[0]} ${pt[1]}` : `${acc} L ${pt[0]} ${pt[1]}`;
    }, '');

    const linesSvg = d
      ? `<path d="${d}" fill="none" stroke="${strokeHex}" stroke-width="${p.width ?? 5}" stroke-linecap="round" stroke-linejoin="round" ${isDashed ? 'stroke-dasharray="8 6"' : ''}/>`
      : '';

    const labelsSvg = L.segments
      .filter((s) => s.label)
      .map(
        (s) =>
          `<text x="${s.labelPos[0]}" y="${s.labelPos[1]}" fill="${theme.ink}" font-size="18" font-weight="500" text-anchor="middle" dominant-baseline="central">${s.label}</text>`,
      )
      .join('\n');

    let markerSvg = '';
    if (L.marker) {
      if (L.marker.type === 'dot') {
        markerSvg = `<circle cx="${L.marker.pt[0]}" cy="${L.marker.pt[1]}" r="8" fill="${strokeHex}"/>`;
      } else if (L.marker.type === 'asset') {
        const rot = L.marker.asset === 'ant' ? L.marker.angleDeg + 90 : L.marker.angleDeg;
        // ant 矢量图形精简内联展示，确保在无服务器环境下完美出图
        markerSvg = `
          <g transform="translate(${L.marker.pt[0]}, ${L.marker.pt[1]}) rotate(${rot})">
            <ellipse cx="0" cy="8" rx="6" ry="8" fill="#A2583E" stroke="#542314" stroke-width="1.5"/>
            <ellipse cx="0" cy="-2" rx="3.5" ry="4" fill="#A2583E" stroke="#542314" stroke-width="1.5"/>
            <ellipse cx="0" cy="-10" rx="4.5" ry="4" fill="#A2583E" stroke="#542314" stroke-width="1.5"/>
            <line x1="-3" y1="-12" x2="-8" y2="-16" stroke="#542314" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="3" y1="-12" x2="8" y2="-16" stroke="#542314" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="-3" y1="-2" x2="-10" y2="-4" stroke="#542314" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="3" y1="-2" x2="10" y2="-4" stroke="#542314" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="-3" y1="4" x2="-10" y2="10" stroke="#542314" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="3" y1="4" x2="10" y2="10" stroke="#542314" stroke-width="1.5" stroke-linecap="round"/>
          </g>
        `;
      }
    }

    return `
      <g>
        ${linesSvg}
        ${labelsSvg}
        ${markerSvg}
      </g>
    `;
  };

  const accentColor = color('accent', theme);
  const blueColor = color('blue', theme, 'blue');
  const greenColor = color('green', theme, 'green');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" style="background: ${theme.stageBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <!-- 标题提示 -->
      <text x="40" y="44" font-size="20" font-weight="bold" fill="${theme.ink}">FlowSee · 路径与路线零件 (path)</text>
      <text x="40" y="70" font-size="14" fill="${theme.dim}">周长测量、动态绘制动画 (draw)、切线方向跟随 (marker) 与法线标注 (lengths)</text>

      <!-- 场景 1：封闭图形与小蚂蚁 -->
      ${renderSinglePath(L1, path1Props, accentColor)}

      <!-- 场景 2：折线与虚线 -->
      ${renderSinglePath(L2, path2Props, blueColor)}

      <!-- 场景 3：路径绘制推进 -->
      ${renderSinglePath(L3, path3Props, greenColor)}
    </svg>
  `;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const themes = ['flat', 'chalk', 'cute', 'pro'] as const;

  for (const themeId of themes) {
    const theme = getTheme(themeId);
    const svg = renderPathSvg(themeId);
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
    const svg = renderPathSvg('flat');
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
  <div class="header">路径与路线（path） · ${vp.width}px</div>
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

  // 备份到指定预览目录
  const files = readdirSync(outDir);
  for (const file of files) {
    copyFileSync(join(outDir, file), join(backupDir, file));
  }
  console.log(`Backup completed: ${files.length} screenshots copied to ${backupDir}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
