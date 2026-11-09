// 底块与空框的几何：间距、圆角来自 site.yaml 的 scene.highlight / scene.blank。
import { sceneStyle } from '../style';

/** 底块的几何：中心 x、文字中心 y、文字宽度（估算）、字号、可选实际高度（如 frac） → 矩形 */
export function markRect(cx: number, cy: number, textW: number, size: number, actualH?: number) {
  const { markPadX, markPadY, markRadius } = sceneStyle().highlight;
  const w = textW + size * markPadX * 2;
  const baseH = actualH ?? size;
  const h = baseH + size * markPadY * 2;
  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: size * markRadius };
}

/** 空框的几何：比底块的横向间距小一点，和数字等高，支持可选实际高度（如 frac） */
export function blankRect(cx: number, cy: number, textW: number, size: number, actualH?: number) {
  const { padX } = sceneStyle().blank;
  const { markPadY, markRadius } = sceneStyle().highlight;
  const w = textW + size * padX * 2;
  const baseH = actualH ?? size;
  const h = baseH + size * markPadY * 2;
  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: size * markRadius };
}

/** 分数底块几何：以 (cx, cy) 为中心，高度按分数实际高度 size * 1.6 算 */
export function fracMarkRect(cx: number, cy: number, textW: number, size: number) {
  return markRect(cx, cy, textW, size, size * 1.6);
}

/** 用户设置了“减少动态效果”时为 true（SVG 里的闪烁动画要自己判断） */
export function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}
