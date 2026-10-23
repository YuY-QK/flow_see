// 把动画的每一步画成一张静止的画面（舞台 + 字幕），供视频和 GIF 编码使用。
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getTheme, stepDurationMs, type Animation } from '@/engine';
import type { Template } from '@/templates/types';

const UI_FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif';

export interface FramePlan {
  /** 每一步的画面 */
  frames: HTMLCanvasElement[];
  /** 每一步停留的毫秒数 */
  holds: number[];
}

/** 舞台 SVG → 图片 */
async function stageImage(
  animation: Animation,
  template: Template,
  index: number,
  w: number,
  h: number,
): Promise<HTMLImageElement> {
  const base = getTheme(animation.themeId);
  const theme = { ...base, font: base.font === 'inherit' ? UI_FONT : base.font };
  let svg = renderToStaticMarkup(
    createElement(template.Stage, { animation, index, theme, still: true }),
  );
  // 作为独立图片使用时需要命名空间和明确的尺寸
  svg = svg
    .replace(/^<svg([^>]*?)\swidth="100%"/, '<svg$1')
    .replace(/^<svg([^>]*?)\sheight="100%"/, '<svg$1');
  svg = svg.replace(/^<svg/, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"`);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const lines: string[] = [];
  let line = '';
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch;
      if (lines.length === maxLines) break;
    } else line += ch;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && lines.join('').length < text.length) {
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…';
  }
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export async function planFrames(
  animation: Animation,
  template: Template,
  width: number,
  height: number,
  onProgress?: (p: number) => void,
): Promise<FramePlan> {
  const theme = getTheme(animation.themeId);
  const u = width / 1280; // 以 1280 宽为基准缩放
  const pad = 32 * u;
  const captionH = 150 * u;
  const titleH = 44 * u;
  const stageBox = {
    x: pad,
    y: pad + titleH,
    w: width - pad * 2,
    h: height - pad * 3 - titleH - captionH,
  };
  const dark = theme.id === 'chalk';
  const frames: HTMLCanvasElement[] = [];
  const holds: number[] = [];
  const total = animation.steps.length;

  for (let i = 0; i < total; i++) {
    const step = animation.steps[i];
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = theme.stageBg;
    ctx.fillRect(0, 0, width, height);

    // 标题
    ctx.fillStyle = theme.ink;
    ctx.font = `700 ${24 * u}px ${UI_FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(animation.title || '未命名动画', pad, pad + titleH / 2);

    // 舞台
    const img = await stageImage(
      animation,
      template,
      i,
      Math.round(stageBox.w),
      Math.round(stageBox.h),
    );
    ctx.drawImage(img, stageBox.x, stageBox.y, stageBox.w, stageBox.h);

    // 字幕
    const cy = height - pad - captionH;
    ctx.fillStyle = dark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.92)';
    roundRect(ctx, pad, cy, width - pad * 2, captionH, 18 * u);
    ctx.fill();
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(31,36,51,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const tx = pad + 28 * u;
    const textW = width - pad * 2 - 56 * u;
    const ink = dark ? theme.ink : '#1F2433';
    const sub = dark ? theme.dim : '#5B6275';
    ctx.textBaseline = 'top';
    ctx.fillStyle = sub;
    ctx.font = `400 ${17 * u}px ${UI_FONT}`;
    ctx.fillText(`第 ${i + 1} 步 / 共 ${total} 步`, tx, cy + 20 * u);
    ctx.fillStyle = ink;
    ctx.font = `700 ${28 * u}px ${UI_FONT}`;
    ctx.fillText(wrapText(ctx, step.title || '', textW, 1)[0] ?? '', tx, cy + 48 * u);
    ctx.fillStyle = dark ? theme.ink : '#3A4152';
    ctx.font = `400 ${20 * u}px ${UI_FONT}`;
    wrapText(ctx, step.desc || '', textW, 2).forEach((line, k) => {
      ctx.fillText(line, tx, cy + 90 * u + k * 28 * u);
    });

    // 署名
    ctx.fillStyle = sub;
    ctx.font = `600 ${15 * u}px ${UI_FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('动画流', width - pad, pad + titleH / 2);
    ctx.textAlign = 'left';

    frames.push(canvas);
    holds.push(Math.min(6000, Math.max(1600, stepDurationMs(step, 1))));
    onProgress?.((i + 1) / total);
  }
  return { frames, holds };
}

/** 两张画面按比例 t 叠化 */
export function blend(
  ctx: CanvasRenderingContext2D,
  a: HTMLCanvasElement,
  b: HTMLCanvasElement,
  t: number,
) {
  ctx.globalAlpha = 1;
  ctx.drawImage(a, 0, 0);
  ctx.globalAlpha = t;
  ctx.drawImage(b, 0, 0);
  ctx.globalAlpha = 1;
}
