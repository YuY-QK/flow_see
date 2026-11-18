import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { getTheme, type ThemeId } from '../packages/core/src';
import { color, angleLayout } from '../packages/blocks/src';
import { initConfig } from './lessons/walk';

initConfig();

const outDir = resolve(process.cwd(), '.wt/screens/b14');
const backupDir = '/Users/yumo/.gemini/antigravity/brain/c8b1b3a8-7c0a-4bb1-9780-11bec572e354/round5-previews/b14';
mkdirSync(outDir, { recursive: true });
mkdirSync(backupDir, { recursive: true });

function renderAnglesSvg(themeId: ThemeId): string {
  const theme = getTheme(themeId);

  const anglesProps = [
    { at: [150, 150], from: 0, size: 45, length: 100, arc: true, label: true, kindLabel: true },
    { at: [400, 150], from: 0, size: 90, length: 100, arc: true, label: true, kindLabel: true },
    { at: [650, 150], from: 0, size: 135, length: 100, arc: true, label: true, kindLabel: true, rays: true },
    { at: [240, 330], from: 0, size: 180, length: 110, arc: true, label: true, kindLabel: true },
    { at: [560, 330], from: 0, size: 360, length: 110, arc: true, label: true, kindLabel: true },
  ];

  const angleSvgs = anglesProps.map((p) => {
    const L = angleLayout(p);
    const strokeColor = color(p.color, theme, 'ink');
    const arcColor = color(p.arcColor, theme, 'accent');

    const s1End = L.ray1 ? L.ray1.lineEnd : L.side1End;
    const s2End = L.ray2 ? L.ray2.lineEnd : L.side2End;

    const ray1Svg = L.ray1
      ? `<path d="M ${L.ray1.tip[0]} ${L.ray1.tip[1]} L ${L.ray1.p1[0]} ${L.ray1.p1[1]} L ${L.ray1.p2[0]} ${L.ray1.p2[1]} Z" fill="${strokeColor}"/>`
      : '';
    const ray2Svg = L.ray2
      ? `<path d="M ${L.ray2.tip[0]} ${L.ray2.tip[1]} L ${L.ray2.p1[0]} ${L.ray2.p1[1]} L ${L.ray2.p2[0]} ${L.ray2.p2[1]} Z" fill="${strokeColor}"/>`
      : '';

    const arcSvg = L.showArc && L.arcD
      ? `<path d="${L.arcD}" fill="none" stroke="${arcColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="miter"/>`
      : '';

    const roundSvg = L.showArc && L.isRound
      ? `<circle cx="${L.cx}" cy="${L.cy}" r="${L.arcRadius}" fill="none" stroke="${arcColor}" stroke-width="2"/>` +
        (L.roundArrow ? `<path d="${L.roundArrow.d}" fill="${arcColor}"/>` : '')
      : '';

    const labelSvg = L.showLabel
      ? `<text x="${L.labelPos[0]}" y="${L.labelPos[1]}" fill="${theme.ink}" font-size="24" text-anchor="middle" dominant-baseline="central">${L.labelText}</text>`
      : '';

    const kindLabelSvg = L.showKindLabel
      ? `<text x="${L.kindLabelPos[0]}" y="${L.kindLabelPos[1]}" fill="${theme.ink}" font-size="24" text-anchor="middle" dominant-baseline="central">${L.kindText}</text>`
      : '';

    return `
      <g>
        <line x1="${L.cx}" y1="${L.cy}" x2="${s1End[0]}" y2="${s1End[1]}" stroke="${strokeColor}" stroke-width="4" stroke-linecap="round"/>
        ${ray1Svg}
        <line x1="${L.cx}" y1="${L.cy}" x2="${s2End[0]}" y2="${s2End[1]}" stroke="${strokeColor}" stroke-width="4" stroke-linecap="round"/>
        ${ray2Svg}
        ${arcSvg}
        ${roundSvg}
        <circle cx="${L.cx}" cy="${L.cy}" r="5" fill="${strokeColor}"/>
        ${labelSvg}
        ${kindLabelSvg}
      </g>
    `;
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" style="background: ${theme.stageBg}; font-family: ${theme.font || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"};">
      ${angleSvgs.join('\n')}
    </svg>
  `;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const themes: ThemeId[] = ['flat', 'chalk', 'cute', 'pro'];

  for (const themeId of themes) {
    const theme = getTheme(themeId);
    const svg = renderAnglesSvg(themeId);
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
    const svg = renderAnglesSvg('flat');
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
  <div class="header">角与旋转量度（angle） · ${vp.width}px</div>
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
