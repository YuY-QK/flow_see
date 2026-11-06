/** 把输入的数收回到范围内，并对齐到步长（从 min 起每 step 一格） */
export function snapToRange(v: number, min: number, max: number, step: number): number {
  const clamped = Math.max(min, Math.min(max, v));
  const k = Math.round((clamped - min) / step);
  const snapped = min + k * step;
  // 步长是小数时去掉浮点误差
  return Math.max(min, Math.min(max, Math.round(snapped * 1e6) / 1e6));
}
