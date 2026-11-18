import { copyFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { getTheme, type ThemeId } from '../packages/core/src';
import { getPart, tapeDiagramPart, type Props } from '../packages/blocks/src';
import { initConfig } from './lessons/walk';

initConfig();

const outDir = resolve(process.cwd(), '.wt/screens/b21');
const backupDir =
  '/Users/yumo/.gemini/antigravity/brain/c8b1b3a8-7c0a-4bb1-9780-11bec572e354/round7-previews/b21';

mkdirSync(outDir, { recursive: true });
mkdirSync(backupDir, { recursive: true });

const CAMEL_SVG_ATTRS = new Set([
  'viewBox',
  'preserveAspectRatio',
  'gradientUnits',
  'gradientTransform',
  'clipPathUnits',
  'attributeName',
  'repeatCount',
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
        if (
          k === 'children' ||
          k === 'key' ||
          k === 'ref' ||
          v === undefined ||
          v === null ||
          v === false
        ) {
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
  items: Array<{ type: 'tape-diagram' | 'label' | 'text'; p: Props }>,
): string {
  const theme = getTheme(themeId);
  const ctx = { theme };
  const inner = items
    .map((item) => {
      const def =
        item.type === 'tape-diagram' ? tapeDiagramPart : getPart(item.type)!;
      const normalized = def.normalize ? def.normalize(item.p) : item.p;
      const mergedProps: Props = { ...(def.defaults ?? {}), ...normalized };
      const tree = (def.Render as unknown as (args: { p: Props; ctx: unknown }) => unknown)({
        p: mergedProps,
        ctx,
      });
      return vnodeToMarkup(tree, ctx);
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" style="background:${theme.stageBg};font-family:${escapeXml(theme.font)};width:100%;height:auto;display:block;">${inner}</svg>`;
}

function combinedShowcaseItems(): Array<{ type: 'tape-diagram' | 'label' | 'text'; p: Props }> {
  return [
    {
      type: 'label',
      p: { text: '多几分之几与大括号', at: [220, 36], size: 20, color: 'accent' },
    },
    {
      type: 'tape-diagram',
      p: {
        at: [110, 92],
        lens: [
          [4],
          [4, 1],
        ],
        segColors: [
          ['blue'],
          ['blue', 'orange'],
        ],
        segLabels: [
          ['40 棵'],
          ['', '[1/4](frac)'],
        ],
        ticks: [4, 5],
        rowLabels: ['去年', '今年'],
        braces: [{ row: 2, from: 1, to: 2, label: '? 棵', side: 'bottom' }],
        unit: 56,
        rowGap: 74,
      },
    },
    {
      type: 'label',
      p: { text: '倍的认识（等分刻度）', at: [615, 36], size: 20, color: 'accent' },
    },
    {
      type: 'tape-diagram',
      p: {
        at: [520, 95],
        lens: [[2], [8]],
        segColors: [['orange'], ['blue']],
        segLabels: [['2 根'], ['']],
        ticks: [1, 4],
        rowLabels: ['胡萝卜', '白萝卜'],
        braces: [{ row: 2, from: 1, to: 1, label: '[4](blank) 倍', side: 'bottom' }],
        unit: 28,
        rowGap: 72,
      },
    },
    {
      type: 'label',
      p: { text: '工程问题（fill = 0.6 进度填色）与逐段长出（reveal = 2.5）', at: [400, 290], size: 20, color: 'accent' },
    },
    {
      type: 'tape-diagram',
      p: {
        at: [115, 350],
        lens: [[6]],
        ticks: [6],
        rowLabels: ['一条路'],
        braces: [{ row: 1, from: 1, to: 1, label: '单位 1', side: 'bottom' }],
        fill: 0.6,
        unit: 42,
      },
    },
    {
      type: 'tape-diagram',
      p: {
        at: [490, 345],
        lens: [
          [2, 1.5],
          [3.5, 1.5],
        ],
        segLabels: [
          ['a', 'b'],
          ['c', 'd'],
        ],
        rowLabels: ['甲', '乙'],
        reveal: 2.5,
        unit: 52,
        rowGap: 58,
      },
    },
  ];
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const themes: ThemeId[] = ['flat', 'chalk', 'cute', 'pro'];

  // 1. 截取 4 套动画主题效果图
  for (const themeId of themes) {
    const theme = getTheme(themeId);
    const svg = renderStageSvg(themeId, combinedShowcaseItems());
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
    const svg = renderStageSvg('flat', combinedShowcaseItems());
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
  <div class="caption">倍的认识与应用 · 线段图零件 tape-diagram（视口宽度 ${vp.width}px）</div>
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
