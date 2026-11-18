import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { getTheme, type ThemeId } from '../packages/core/src';
import { getPart, trackPart, type Props } from '../packages/blocks/src';
import { initConfig } from './lessons/walk';

initConfig();

const outDir = resolve(process.cwd(), '.wt/screens/b22');
const backupDir =
  '/Users/yumo/.gemini/antigravity/brain/c8b1b3a8-7c0a-4bb1-9780-11bec572e354/round7-previews/b22';

mkdirSync(outDir, { recursive: true });
mkdirSync(backupDir, { recursive: true });

function loadSvgDataUri(relPath: string): string {
  const raw = readFileSync(resolve(process.cwd(), relPath), 'utf8');
  return `data:image/svg+xml;base64,${Buffer.from(raw, 'utf8').toString('base64')}`;
}

const ASSET_MAP: Record<string, string> = {
  boy: loadSvgDataUri('packages/content/assets/math/figures/boy.svg'),
  girl: loadSvgDataUri('packages/content/assets/math/figures/girl.svg'),
};

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

type StageItem = { type: 'track' | 'label' | 'expr-steps'; p: Props };

function renderStageSvg(themeId: ThemeId, items: StageItem[]): string {
  const theme = getTheme(themeId);
  const ctx = {
    theme,
    assetUrl: (id: string) => ASSET_MAP[id],
  };
  const inner = items
    .map((item) => {
      const def = item.type === 'track' ? trackPart : getPart(item.type)!;
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

function showcaseItems(): StageItem[] {
  return [
    {
      type: 'track',
      p: {
        length: 600,
        distance: 500,
        unitText: '米',
        ends: ['小明家', '小红家'],
        movers: [
          { from: 0, speed: 60, asset: 'boy', label: '60 米/分' },
          { from: 1, speed: 40, asset: 'girl', label: '40 米/分' },
        ],
        t: 2,
        showGap: true,
        marks: [1],
        at: [100, 175],
      },
    },
    {
      type: 'expr-steps',
      p: {
        lines: ['(60 + 40) × 5', '100 × 5', '500（米）'],
        size: 28,
        show: 3,
        at: [305, 338],
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

  // 2. 截取相遇态特写（t >= meetTime 停在相遇点）
  {
    const theme = getTheme('cute');
    const svg = renderStageSvg('cute', [
      {
        type: 'label',
        p: { text: '5 分钟相遇 · 两人路程合起来正好是全程 500 米', at: [400, 32], size: 22, color: 'accent' },
      },
      {
        type: 'track',
        p: {
          length: 600,
          distance: 500,
          unitText: '米',
          ends: ['小明家', '小红家'],
          movers: [
            { from: 0, speed: 60, asset: 'boy', label: '60 米/分' },
            { from: 1, speed: 40, asset: 'girl', label: '40 米/分' },
          ],
          t: 5,
          showGap: true,
          marks: [1, 3],
          at: [100, 220],
        },
      },
    ]);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;background:${theme.stageBg};}</style></head><body>${svg}</body></html>`;
    await page.setViewportSize({ width: 800, height: 450 });
    await page.setContent(html);
    const fileName = 'state-met.png';
    const screenPath = join(outDir, fileName);
    await page.screenshot({ path: screenPath });
    copyFileSync(screenPath, join(backupDir, fileName));
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
  <div class="caption">相遇问题 · 两人相向而行，路程 = 速度和 × 相遇时间（视口宽度 ${vp.width}px）</div>
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
