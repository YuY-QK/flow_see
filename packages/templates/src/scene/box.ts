// 舞台“贴合内容”：求一个动画所有步骤里所有零件包围盒的并集（含高亮框外扩），
// 手机上用它当画面范围，让动画在窄屏上尽量放大（site.yaml 的 scene.fit）。
import { getPart, num, sceneStyle, type Box } from '@flow-see/blocks';
import type { Animation } from '@flow-see/core';
import { sceneFrame, type SceneDef, type SceneObject } from './evaluate';
import { sceneOf } from './scene';

/** 一个零件在画面里占的范围：包围盒，按 scale、rotate 变换后再取外接矩形；高亮时外扩 */
export function objectBox(o: SceneObject): Box | undefined {
  const part = getPart(o.type);
  const opacity = num(o.props.opacity, 1);
  if (!part || opacity <= 0.001) return undefined;
  const b = part.bbox(o.props);
  if (!(b.w >= 0) || !(b.h >= 0) || ![b.x, b.y].every(Number.isFinite)) return undefined;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const scale = Math.abs(num(o.props.scale, 1));
  const rad = (num(o.props.rotate, 0) * Math.PI) / 180;
  const hl = num(o.props.highlight, 0) > 0;
  const { padX, padY } = sceneStyle().highlight;
  // 高亮框跟零件一起缩放、旋转，所以先算上外扩再变换
  const w = (b.w + (hl ? padX * 2 : 0)) * scale;
  const h = (b.h + (hl ? padY * 2 : 0)) * scale;
  const bw = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
  const bh = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
  return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
}

function union(a: Box | undefined, b: Box): Box {
  if (!a) return b;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

const cache = new WeakMap<SceneDef, Box | undefined>();

/**
 * 所有步骤里所有零件包围盒的并集：每一步取放完后的画面（再加开头的画面），
 * 零件在步骤之间的移动有起点和终点，两头都在并集里。没有任何可见零件时返回 undefined。
 */
export function contentBox(def: SceneDef): Box | undefined {
  if (cache.has(def)) return cache.get(def);
  let box: Box | undefined;
  const add = (index: number, progress: number) => {
    for (const o of sceneFrame(def, index, progress).objects) {
      const b = objectBox(o);
      if (b) box = union(box, b);
    }
  };
  add(0, 0);
  for (let i = 0; i < def.steps.length; i++) add(i, 1);
  cache.set(def, box);
  return box;
}

/**
 * 手机上的画面范围：内容包围盒加边距，宽高比不低于 minRatio（太高时左右补空），
 * 再限制在“舞台 ± 边距”内，免得个别零件飘在舞台很远的地方把画面撑得很大。
 * 配置里关了 fit.phone 或没有内容时返回 undefined（用整个舞台）。
 */
export function fitBox(def: SceneDef): Box | undefined {
  const { phone, margin, minRatio } = sceneStyle().fit;
  const c = phone ? contentBox(def) : undefined;
  if (!c) return undefined;
  const { width: W, height: H } = def.stage;
  const x0 = Math.max(c.x - margin, -margin);
  const y0 = Math.max(c.y - margin, -margin);
  const x1 = Math.min(c.x + c.w + margin, W + margin);
  const y1 = Math.min(c.y + c.h + margin, H + margin);
  let box: Box = { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
  if (box.w / box.h < minRatio) {
    const w = box.h * minRatio;
    box = { ...box, x: box.x - (w - box.w) / 2, w };
  }
  return box;
}

/** Template.viewBox：由动画取场景再求手机上的画面范围 */
export function sceneViewBox(animation: Animation): Box | undefined {
  return fitBox(sceneOf(animation));
}
