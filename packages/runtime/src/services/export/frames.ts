// 把动画的每一步画成一张静止的画面（舞台 + 字幕），供视频和 GIF 编码使用。
import { runtimeConfig } from '../../config';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { exportStyle, getTheme, stepDurationMs, type Animation, t } from '@flow-see/core';
import type { Template } from '../../template';

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
  const theme = { ...base, font: base.font === 'inherit' ? exportStyle().font : base.font };
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
  const x = exportStyle();
  const u = width / x.baseWidth; // 以基准宽度缩放
  const { pad: padBase, titleH: titleBase, captionH: captionBase } = x.layout;
  const pad = padBase * u;
  const captionH = captionBase * u;
  const titleH = titleBase * u;
  const stageBox = {
    x: pad,
    y: pad + titleH,
    w: width - pad * 2,
    h: height - pad * 3 - titleH - captionH,
  };
  const dark = x.darkThemes.includes(theme.id);
  const font = (s: { weight: number; size: number }) => `${s.weight} ${s.size * u}px ${x.font}`;
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
    ctx.font = font(x.title);
    ctx.textBaseline = 'middle';
    ctx.fillText(animation.title || t('common.wei_ming_ming_dong'), pad, pad + titleH / 2);

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
    ctx.fillStyle = dark ? x.caption.darkBg : x.caption.bg;
    roundRect(ctx, pad, cy, width - pad * 2, captionH, x.layout.captionRadius * u);
    ctx.fill();
    ctx.strokeStyle = dark ? x.caption.darkBorder : x.caption.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    const tx = pad + x.layout.captionInset * u;
    const textW = width - pad * 2 - x.layout.captionInset * 2 * u;
    ctx.textBaseline = 'top';
    ctx.fillStyle = dark ? theme.dim : x.caption.counter;
    ctx.font = font(x.counter);
    ctx.fillText(t('common.step_counter', { n: i + 1, total }), tx, cy + x.counter.top * u);
    ctx.fillStyle = dark ? theme.ink : x.caption.step;
    ctx.font = font(x.step);
    ctx.fillText(wrapText(ctx, step.title || '', textW, 1)[0] ?? '', tx, cy + x.step.top * u);
    ctx.fillStyle = dark ? theme.ink : x.caption.desc;
    ctx.font = font(x.desc);
    wrapText(ctx, step.desc || '', textW, x.desc.maxLines).forEach((line, k) => {
      ctx.fillText(line, tx, cy + x.desc.top * u + k * x.desc.lineHeight * u);
    });

    // 署名
    ctx.fillStyle = dark ? theme.dim : x.caption.counter;
    ctx.font = font(x.signature);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(runtimeConfig().siteName, width - pad, pad + titleH / 2);
    ctx.textAlign = 'left';

    frames.push(canvas);
    holds.push(Math.min(x.hold.maxMs, Math.max(x.hold.minMs, stepDurationMs(step, 1))));
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
