import { copyFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { getTheme, type ThemeId } from '../packages/core/src';
import { fractionAreaPart, getPart, type Props } from '../packages/blocks/src';
import { initConfig } from './lessons/walk';

initConfig();

const outDir = resolve(process.cwd(), '.wt/screens/b23');
const backupDir =
  '/Users/yumo/.gemini/antigravity/brain/c8b1b3a8-7c0a-4bb1-9780-11bec572e354/round7-previews/b23';

mkdirSync(outDir, { recursive: true });
mkdirSync(backupDir, { recursive: true });

const CAMEL_SVG_ATTRS = new Set([
  'viewBox',
  'preserveAspectRatio',
  'gradientUnits',
  'gradientTransform',
  'clipPathUnits',
]);

function attrName(k: string): string {
  if (k === 'className') return 'class';
  if (CAMEL_SVG_ATTRS.has(k)) return k;
  return k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function escapeXml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function vnodeToMarkup(node: unknown, ctx: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return escapeXml(String(node));
  if (Array.isArray(node)) return node.map((c) => vnodeToMarkup(c, ctx)).join('');
  if (typeof node === 'object') {
    const el = node as {
      type?: unknown;
      props?: Record<string, unknown>;
    };
    if (typeof el.type === 'function') {
      const rendered = (el.type as (props: Record<string, unknown>) => unknown)(el.props ?? {});
      return vnodeToMarkup(rendered, ctx);
    }
    if (typeof el.type === 'string') {
      const props = el.props ?? {};
      const attrs: string[] = [];
      for (const [k, v] of Object.entries(props)) {
        if (k === 'children' || k === 'key' || k === 'ref' || v === undefined || v === null || v === false) {
          continue;
        }
        if (k === 'style' && typeof v === 'object') {
          const css = Object.entries(v as Record<string, unknown>)
            .filter(([, sv]) => sv !== undefined && sv !== null)
            .map(([sk, sv]) => `${sk.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${String(sv)}`)
            .join(';');
          if (css) attrs.push(`style="${escapeXml(css)}"`);
          continue;
        }
        attrs.push(`${attrName(k)}="${escapeXml(String(v))}"`);
      }
      const children = vnodeToMarkup(props.children, ctx);
      const open = attrs.length > 0 ? `<${el.type} ${attrs.join(' ')}>` : `<${el.type}>`;
      return `${open}${children}</${el.type}>`;
    }
  }
  return '';
}

function renderStageSvg(
  themeId: ThemeId,
  items: Array<{ type: 'fraction-area' | 'label' | 'text'; p: Props }>,
): string {
  const theme = getTheme(themeId);
  const ctx = { theme };
  const inner = items
    .map((item) => {
      const def =
        item.type === 'fraction-area'
          ? fractionAreaPart
          : getPart(item.type)!;
      const resolvedDefaults = getPart(def.type)?.defaults ?? {};
      const mergedProps: Props = { ...resolvedDefaults, ...item.p };
      const tree = (def.Render as unknown as (args: { p: Props; ctx: unknown }) => unknown)({
        p: mergedProps,
        ctx,
      });
      return vnodeToMarkup(tree, ctx);
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" style="background:${theme.stageBg};font-family:${escapeXml(theme.font)};width:100%;height:auto;display:block;">${inner}</svg>`;
}

function showcaseItems(): Array<{ type: 'fraction-area' | 'label' | 'text'; p: Props }> {
  return [
    { type: 'label', p: { text: '分数乘法 2/3 × 3/5', at: [145, 58], size: 18, color: 'accent' } },
    {
      type: 'fraction-area',
      p: {
        rows: 3,
        cols: 5,
        shadeRows: 2,
        shadeCols: 3,
        size: 200,
        at: [45, 110],
      },
    },
    { type: 'text', p: { text: '重叠 6/15', at: [145, 360], size: 24, color: 'green' } },

    { type: 'label', p: { text: '小数乘法 0.3 × 0.4', at: [400, 58], size: 18, color: 'accent' } },
    {
      type: 'fraction-area',
      p: {
        rows: 10,
        cols: 10,
        shadeRows: 3,
        shadeCols: 4,
        size: 200,
        at: [300, 110],
      },
    },
    { type: 'text', p: { text: '0.3 × 0.4 = 0.12', at: [400, 360], size: 24, color: 'green' } },

    { type: 'label', p: { text: '连续涂色 1.5 × 2.5', at: [655, 58], size: 18, color: 'accent' } },
    {
      type: 'fraction-area',
      p: {
        rows: 3,
        cols: 4,
        shadeRows: 1.5,
        shadeCols: 2.5,
        size: 200,
        color: 'blue',
        color2: 'orange',
        overlapColor: 'green',
        grid: true,
        at: [555, 110],
      },
    },
    { type: 'text', p: { text: '平滑过渡动画态', at: [655, 360], size: 24, color: 'ink' } },
  ];
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const themes: ThemeId[] = ['flat', 'chalk', 'cute', 'pro'];

  // 1. 截取 4 套动画主题效果图
  for (const themeId of themes) {
    const theme = getTheme(themeId);
    const svg = renderStageSvg(themeId, showcaseItems());
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: ${theme.stageBg}; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  </style>
</head>
<body>${svg}</body>
</html>`;
    await page.setViewportSize({ width: 800, height: 450 });
    await page.setContent(html);
    const fileName = `theme-${themeId}.png`;
    const screenPath = join(outDir, fileName);
    await page.screenshot({ path: screenPath });
    copyFileSync(screenPath, join(backupDir, fileName));
    console.log(`Saved: ${screenPath}`);
  }

  // 2. 截取响应式宽度截图 (1280, 820, 390)
  const responsiveViewports = [
    { name: '1280', width: 1280, height: 800 },
    { name: '820', width: 820, height: 1180 },
    { name: '390', width: 390, height: 844 },
  ];

  for (const vp of responsiveViewports) {
    const theme = getTheme('flat');
    const svg = renderStageSvg('flat', showcaseItems());
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .card {
      width: 100%;
      max-width: 800px;
      background: ${theme.stageBg};
      border: 1px solid ${theme.stageBorder};
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
    }
    .caption {
      margin-top: 14px;
      width: 100%;
      max-width: 800px;
      background: #ffffff;
      border-radius: 10px;
      padding: 14px 18px;
      box-sizing: border-box;
      color: #1e293b;
      font-size: 16px;
      border: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="card">${svg}</div>
  <div class="caption">小数乘小数 · 分数与小数面积模型（视口宽度 ${vp.width}px）</div>
</body>
</html>`;
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.setContent(html);
    const fileName = `responsive-${vp.name}.png`;
    const screenPath = join(outDir, fileName);
    await page.screenshot({ path: screenPath });
    copyFileSync(screenPath, join(backupDir, fileName));
    console.log(`Saved: ${screenPath}`);
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
