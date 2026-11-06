// 视频与 GIF 编码。视频优先用 WebCodecs 快速生成 MP4，不支持时退回 MediaRecorder（WebM，按实际时长录制）。
import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import type { Animation } from '@flow-see/core';
import type { Template } from '../../template';
import { blend, planFrames } from './frames';

import { exportStyle, t } from '@flow-see/core';
export type ExportFormat = 'video' | 'gif';

export interface ExportResult {
  blob: Blob;
  filename: string;
}

export interface ExportOptions {
  onProgress?: (stage: string, p: number) => void;
  signal?: AbortSignal;
}

function safeName(title: string) {
  return (
    (title || t('encode.dong_hua'))
      .replace(/[\\/:*?"<>|]+/g, '')
      .trim()
      .slice(0, 40) || t('encode.dong_hua')
  );
}

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException(t('encode.yi_qu_xiao'), 'AbortError');
}

export async function exportAnimation(
  animation: Animation,
  template: Template,
  format: ExportFormat,
  opts: ExportOptions = {},
): Promise<ExportResult> {
  if (animation.steps.length === 0) throw new Error(t('encode.hai_mei_you_bu'));
  const name = safeName(animation.title);
  if (format === 'gif') {
    const blob = await encodeGif(animation, template, opts);
    return { blob, filename: `${name}.gif` };
  }
  if (await canUseWebCodecs()) {
    const blob = await encodeMp4(animation, template, opts);
    return { blob, filename: `${name}.mp4` };
  }
  const blob = await recordWebm(animation, template, opts);
  return { blob, filename: `${name}.webm` };
}

// ---------- GIF ----------

async function encodeGif(animation: Animation, template: Template, opts: ExportOptions) {
  const { width: W, height: H, colors, fadeFrames: FADE_FRAMES } = exportStyle().gif;
  const plan = await planFrames(animation, template, W, H, (p) =>
    opts.onProgress?.(t('encode.hui_zhi_hua_mian'), p * 0.5),
  );
  const gif = GIFEncoder();
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const write = (delay: number) => {
    const { data } = ctx.getImageData(0, 0, W, H);
    const palette = quantize(data, colors);
    gif.writeFrame(applyPalette(data, palette), W, H, { palette, delay });
  };

  for (let i = 0; i < plan.frames.length; i++) {
    checkAbort(opts.signal);
    if (i > 0) {
      for (let k = 1; k <= FADE_FRAMES; k++) {
        blend(ctx, plan.frames[i - 1], plan.frames[i], k / (FADE_FRAMES + 1));
        write(exportStyle().fadeMs / FADE_FRAMES);
      }
    }
    // GIF 每一帧可以有自己的停留时间，静止部分只写一帧，文件更小
    blend(ctx, plan.frames[i], plan.frames[i], 1);
    write(plan.holds[i]);
    opts.onProgress?.(t('encode.sheng_cheng'), 0.5 + ((i + 1) / plan.frames.length) * 0.5);
    await new Promise((r) => setTimeout(r));
  }
  gif.finish();
  return new Blob([gif.bytes() as BlobPart], { type: 'image/gif' });
}

// ---------- MP4（WebCodecs） ----------

async function canUseWebCodecs() {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return false;
  try {
    const r = await VideoEncoder.isConfigSupported({
      codec: exportStyle().video.codec,
      width: exportStyle().video.width,
      height: exportStyle().video.height,
      bitrate: exportStyle().video.bitrate,
    });
    return !!r.supported;
  } catch {
    return false;
  }
}

/** 按时间轴逐帧生成画面：叠化 + 停留 */
function* timeline(plan: { frames: HTMLCanvasElement[]; holds: number[] }, fps: number) {
  const frameMs = 1000 / fps;
  for (let i = 0; i < plan.frames.length; i++) {
    if (i > 0) {
      const n = Math.round(exportStyle().fadeMs / frameMs);
      for (let k = 1; k <= n; k++)
        yield { from: plan.frames[i - 1], to: plan.frames[i], t: k / n, step: i };
    }
    const n = Math.round(plan.holds[i] / frameMs);
    for (let k = 0; k < n; k++) yield { from: plan.frames[i], to: plan.frames[i], t: 1, step: i };
  }
}

async function encodeMp4(animation: Animation, template: Template, opts: ExportOptions) {
  const { width, height, fps } = exportStyle().video;
  const plan = await planFrames(animation, template, width, height, (p) =>
    opts.onProgress?.(t('encode.hui_zhi_hua_mian'), p * 0.3),
  );
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height },
    fastStart: 'in-memory',
  });
  let failure: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => (failure = e),
  });
  encoder.configure({
    codec: exportStyle().video.codec,
    width,
    height,
    bitrate: exportStyle().video.bitrate,
    framerate: fps,
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const totalFrames = [...timeline(plan, fps)].length;
  let n = 0;
  for (const f of timeline(plan, fps)) {
    checkAbort(opts.signal);
    if (failure) throw failure;
    blend(ctx, f.from, f.to, f.t);
    const frame = new VideoFrame(canvas, { timestamp: (n * 1e6) / fps, duration: 1e6 / fps });
    encoder.encode(frame, { keyFrame: n % (fps * 2) === 0 });
    frame.close();
    n++;
    // 控制编码队列长度，避免占用过多内存
    if (encoder.encodeQueueSize > 10) await new Promise((r) => setTimeout(r, 0));
    if (n % 15 === 0)
      opts.onProgress?.(t('encode.sheng_cheng_shi_pin'), 0.3 + (n / totalFrames) * 0.7);
  }
  await encoder.flush();
  if (failure) throw failure;
  encoder.close();
  muxer.finalize();
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}

// ---------- WebM（MediaRecorder 兜底） ----------

async function recordWebm(animation: Animation, template: Template, opts: ExportOptions) {
  if (typeof MediaRecorder === 'undefined') throw new Error(t('encode.zhe_ge_liu_lan'));
  const { width, height, fps } = exportStyle().video;
  const plan = await planFrames(animation, template, width, height, (p) =>
    opts.onProgress?.(t('encode.hui_zhi_hua_mian'), p * 0.2),
  );
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  blend(ctx, plan.frames[0], plan.frames[0], 1);
  const stream = canvas.captureStream(fps);
  const type = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'].find((t) =>
    MediaRecorder.isTypeSupported(t),
  );
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((r) => (rec.onstop = r));
  rec.start(500);

  const frames = [...timeline(plan, fps)];
  const start = performance.now();
  for (let n = 0; n < frames.length; n++) {
    checkAbort(opts.signal);
    // 按真实时间推进（录制是实时的）
    const due = start + (n * 1000) / fps;
    const wait = due - performance.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const f = frames[n];
    blend(ctx, f.from, f.to, f.t);
    if (n % 15 === 0)
      opts.onProgress?.(t('encode.lu_zhi_shi_pin'), 0.2 + (n / frames.length) * 0.8);
  }
  rec.stop();
  await stopped;
  return new Blob(chunks, { type: rec.mimeType || 'video/webm' });
}
