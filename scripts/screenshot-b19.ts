import { mkdirSync, readFileSync, copyFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { getTheme, type ThemeId } from '../packages/core/src';
import { chartPart, type Props } from '../packages/blocks/src';
import { initConfig } from './lessons/walk';

initConfig();

const outDir = resolve(process.cwd(), '.wt/screens/b19');
const backupDir =
  '/Users/yumo/.gemini/antigravity/brain/c8b1b3a8-7c0a-4bb1-9780-11bec572e354/round6-previews/b19';

mkdirSync(outDir, { recursive: true });
mkdirSync(backupDir, { recursive: true });

function getAssetDataUri(id: string): string | undefined {
  const candidates = [
    resolve(process.cwd(), `packages/content/assets/math/fruits/${id}.svg`),
    resolve(process.cwd(), `packages/content/assets/math/animals/${id}.svg`),
    resolve(process.cwd(), `packages/content/assets/math/life/${id}.svg`),
    resolve(process.cwd(), `packages/content/assets/science/${id}.svg`),
  ];
  for (const p of candidates) {
    try {
      const content = readFileSync(p, 'utf8');
      return `data:image/svg+xml;base64,${Buffer.from(content).toString('base64')}`;
    } catch {
      // ignore
    }
  }
  return undefined;
}

const ATTR_MAP: Record<string, string> = {
  strokeWidth: 'stroke-width',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeDasharray: 'stroke-dasharray',
  fillOpacity: 'fill-opacity',
  textAnchor: 'text-anchor',
  dominantBaseline: 'dominant-baseline',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  clipPath: 'clip-path',
  paintOrder: 'paint-order',
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function serializeReactNode(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return escapeXml(String(node));
  if (Array.isArray(node)) return node.map(serializeReactNode).join('');
  if (typeof node === 'object' && 'props' in node) {
    const el = node as { type: unknown; props: Record<string, unknown> };
    const childrenHtml = serializeReactNode(el.props?.children);
    if (typeof el.type !== 'string') {
      // React.Fragment or function component
      if (typeof el.type === 'function') {
        return serializeReactNode((el.type as (p: unknown) => unknown)(el.props));
      }
      return childrenHtml;
    }
    const attrs: string[] = [];
    for (const [k, v] of Object.entries(el.props ?? {})) {
      if (k === 'children' || k === 'key' || v === undefined || v === null || v === false) continue;
      const attrName = ATTR_MAP[k] ?? k;
      attrs.push(`${attrName}="${escapeXml(String(v))}"`);
    }
    const open = attrs.length > 0 ? `<${el.type} ${attrs.join(' ')}>` : `<${el.type}>`;
    return `${open}${childrenHtml}</${el.type}>`;
  }
  return '';
}

function renderStageSvg(themeId: ThemeId, chartProps: Props, width = 800, height = 450): string {
  const theme = getTheme(themeId);
  const renderFn = chartPart.Render as unknown as (arg: unknown) => unknown;
  const tree = renderFn({
    p: chartProps,
    ctx: {
      theme,
      assetUrl: getAssetDataUri,
    },
  });
  const inner = serializeReactNode(tree);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: ${theme.stageBg}; font-family: ${theme.font || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"};">${inner}</svg>`;
}

const barShowcaseProps: Props = {
  id: 'ch-bar',
  kind: 'bar2',
  at: [120, 390],
  width: 520,
  height: 300,
  categories: ['跳绳', '踢毽', '跑步', '拍球'],
  values: [24, 16, 30, 12],
  values2: [20, 22, 18, 15],
  names: ['男生', '女生'],
  unit: 5,
  max: 35,
  legend: true,
  average: true,
  showValues: true,
  axisNames: ['项目', '人数/人'],
  show: 1,
};

const kindShowcases: Array<{ name: string; title: string; props: Props }> = [
  {
    name: 'kind-bar',
    title: '条形统计图（bar + average）',
    props: {
      id: 'ch-bar-single',
      kind: 'bar',
      at: [120, 390],
      width: 520,
      height: 300,
      categories: ['小明', '小红', '小刚', '小丽', '小华'],
      values: [92, 85, 96, 88, 89],
      unit: 20,
      max: 120,
      average: true,
      showValues: true,
      axisNames: ['姓名', '成绩/个'],
      show: 1,
    },
  },
  {
    name: 'kind-line',
    title: '复式折线统计图（line2）',
    props: {
      id: 'ch-line2',
      kind: 'line2',
      at: [120, 390],
      width: 540,
      height: 300,
      categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
      values: [20, 35, 50, 80, 120, 160],
      values2: [60, 70, 85, 90, 100, 110],
      names: ['甲城', '乙城'],
      unit: 20,
      max: 180,
      legend: true,
      showValues: true,
      axisNames: ['月份', '降水量/毫米'],
      show: 1,
    },
  },
  {
    name: 'kind-pie',
    title: '扇形统计图（pie）',
    props: {
      id: 'ch-pie',
      kind: 'pie',
      at: [230, 395],
      width: 340,
      height: 340,
      categories: ['跳绳', '跑步', '踢毽', '其他'],
      values: [14, 10, 14, 2],
      show: 1,
    },
  },
  {
    name: 'kind-picto',
    title: '象形统计图（picto + 半图标裁切）',
    props: {
      id: 'ch-picto',
      kind: 'picto',
      at: [180, 385],
      width: 440,
      height: 310,
      categories: ['苹果', '梨', '桃', '草莓'],
      values: [6, 5, 8, 3],
      icon: ['apple', 'pear', 'peach', 'strawberry'],
      unit: 2,
      showValues: true,
      show: 1,
    },
  },
  {
    name: 'kind-xy',
    title: '反比例平滑坐标图（xy）',
    props: {
      id: 'ch-xy',
      kind: 'xy',
      at: [140, 390],
      width: 500,
      height: 300,
      xs: [2, 3, 4, 6, 8, 12],
      values: [12, 8, 6, 4, 3, 2],
      unit: 2,
      max: 14,
      axisNames: ['长', '宽'],
      line: true,
      showValues: true,
      show: 1,
    },
  },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const themes: ThemeId[] = ['flat', 'chalk', 'cute', 'pro'];

  // 1. 4 个主题截图
  for (const themeId of themes) {
    const theme = getTheme(themeId);
    const svg = renderStageSvg(themeId, barShowcaseProps);
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
<body>${svg}</body>
</html>`;
    await page.setViewportSize({ width: 800, height: 450 });
    await page.setContent(html);
    await page.screenshot({ path: join(outDir, `theme-${themeId}.png`) });
  }

  // 2. 多种统计图形态截图
  for (const item of kindShowcases) {
    const theme = getTheme('cute');
    const svg = renderStageSvg('cute', item.props);
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
<body>${svg}</body>
</html>`;
    await page.setViewportSize({ width: 800, height: 450 });
    await page.setContent(html);
    await page.screenshot({ path: join(outDir, `${item.name}.png`) });
  }

  // 3. 响应式宽度截图 (1280, 820, 390)
  const responsiveViewports = [
    { name: '1280', width: 1280, height: 800 },
    { name: '820', width: 820, height: 1180 },
    { name: '390', width: 390, height: 844 },
  ];

  for (const vp of responsiveViewports) {
    const theme = getTheme('flat');
    const svg = renderStageSvg('flat', barShowcaseProps);
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
  <div class="header">统计图（chart） · ${vp.width}px</div>
  <div class="stage-container">${svg}</div>
</body>
</html>`;
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.setContent(html);
    await page.screenshot({ path: join(outDir, `responsive-${vp.name}.png`) });
  }

  await browser.close();

  for (const file of readdirSync(outDir)) {
    if (file.endsWith('.png')) {
      copyFileSync(join(outDir, file), join(backupDir, file));
    }
  }
  console.log(`Saved and synced ${readdirSync(outDir).length} screenshots.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
