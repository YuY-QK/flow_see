import { copyFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { getTheme, type ThemeId } from '../packages/core/src';
import { chancePart, getPart, type Props } from '../packages/blocks/src';
import { initConfig } from './lessons/walk';

initConfig();

const outDir = resolve(process.cwd(), '.wt/screens/b20');
const backupDir =
  '/Users/yumo/.gemini/antigravity/brain/c8b1b3a8-7c0a-4bb1-9780-11bec572e354/round6-previews/b20';

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
  items: Array<{ type: 'chance' | 'label'; p: Props }>,
): string {
  const theme = getTheme(themeId);
  const ctx = { theme };
  const inner = items
    .map((item) => {
      const def = item.type === 'label' ? getPart('label')! : chancePart;
      const mergedProps: Props = { ...(def.defaults ?? {}), ...item.p };
      const tree = (def.Render as unknown as (args: { p: Props; ctx: unknown }) => unknown)({
        p: mergedProps,
        ctx,
      });
      return vnodeToMarkup(tree, ctx);
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" style="background:${theme.stageBg};font-family:${escapeXml(theme.font)};width:100%;height:auto;display:block;">${inner}</svg>`;
}

function combinedShowcaseItems(): Array<{ type: 'chance' | 'label'; p: Props }> {
  return [
    { type: 'label', p: { text: '摸球 (bag)', at: [145, 58], size: 22, color: 'accent' } },
    {
      type: 'chance',
      p: {
        kind: 'bag',
        items: [
          { color: 'red', count: 3 },
          { color: 'yellow', count: 1 },
        ],
        results: ['red', 'yellow', 'red'],
        draw: 2.68,
        size: 0.85,
        at: [90, 230],
      },
    },
    { type: 'label', p: { text: '转盘 (spinner)', at: [445, 58], size: 22, color: 'accent' } },
    {
      type: 'chance',
      p: {
        kind: 'spinner',
        items: [
          { color: 'red', count: 5 },
          { color: 'yellow', count: 1 },
        ],
        results: ['red', 'red', 'yellow', 'red', 'red', 'red'],
        draw: 6,
        tally: true,
        size: 0.82,
        at: [395, 230],
      },
    },
    { type: 'label', p: { text: '硬币 (coin)', at: [695, 58], size: 22, color: 'accent' } },
    {
      type: 'chance',
      p: {
        kind: 'coin',
        results: ['heads', 'tails', 'heads', 'heads', 'tails'],
        draw: 5,
        tally: false,
        size: 0.9,
        at: [695, 190],
      },
    },
    {
      type: 'chance',
      p: {
        kind: 'coin',
        results: ['heads', 'tails', 'heads'],
        draw: 2.38,
        tally: false,
        size: 0.78,
        at: [695, 345],
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

  // 2. 截取三种形态独立特写图 (bag / spinner / coin)
  const kindConfigs: Array<{
    name: string;
    items: Array<{ type: 'chance' | 'label'; p: Props }>;
  }> = [
    {
      name: 'kind-bag.png',
      items: [
        { type: 'label', p: { text: '3 红 1 黄 · 正在摸第 5 次', at: [400, 62], size: 26, color: 'accent' } },
        {
          type: 'chance',
          p: {
            kind: 'bag',
            items: [
              { color: 'red', count: 3 },
              { color: 'yellow', count: 1 },
            ],
            seed: 1,
            draw: 4.65,
            tally: true,
            at: [185, 240],
          },
        },
      ],
    },
    {
      name: 'kind-spinner.png',
      items: [
        { type: 'label', p: { text: '红 5 份 · 黄 1 份 · 累计 20 次', at: [400, 62], size: 26, color: 'accent' } },
        {
          type: 'chance',
          p: {
            kind: 'spinner',
            items: [
              { color: 'red', count: 5 },
              { color: 'yellow', count: 1 },
            ],
            results: [
              'red', 'red', 'yellow', 'red', 'red', 'red', 'red', 'yellow', 'red', 'red',
              'red', 'red', 'red', 'red', 'yellow', 'red', 'red', 'red', 'red', 'red',
            ],
            draw: 20,
            tally: true,
            size: 1.05,
            at: [310, 245],
          },
        },
      ],
    },
    {
      name: 'kind-coin.png',
      items: [
        { type: 'label', p: { text: '翻转中 (draw=2.4) 与 稳定态 + 统计面板', at: [400, 62], size: 26, color: 'accent' } },
        {
          type: 'chance',
          p: {
            kind: 'coin',
            seed: 1,
            draw: 2.4,
            tally: false,
            at: [200, 250],
          },
        },
        {
          type: 'chance',
          p: {
            kind: 'coin',
            seed: 1,
            draw: 10,
            tally: true,
            at: [470, 250],
          },
        },
      ],
    },
  ];

  for (const kc of kindConfigs) {
    const theme = getTheme('cute');
    const svg = renderStageSvg('cute', kc.items);
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
    const screenPath = join(outDir, kc.name);
    await page.screenshot({ path: screenPath });
    copyFileSync(screenPath, join(backupDir, kc.name));
    console.log(`Saved: ${screenPath}`);
  }

  // 3. 截取响应式宽度截图 (1280, 820, 390)
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
  <div class="caption">一定、可能、不可能 · 摸球袋、转盘与抛硬币（视口宽度 ${vp.width}px）</div>
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
