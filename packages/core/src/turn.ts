// 动手做的“转动把手”（turn）：判定与吸附。纯函数，浏览器和 Node 都能用。

export interface TurnSpec {
  target: string;
  prop: string;
  answer: number | string;
  tolerance?: number | string;
  step?: number | string;
}

export interface TurnResult {
  status: 'correct' | 'close' | 'wrong';
  correct: boolean;
  close: boolean;
  miss: boolean;
  snapped: number;
  diff: number;
  target: number;
}

/**
 * 将数值吸附到 step 的整数倍。若 step 为空或非正数则原样返回。
 */
export function snapToStep(val: number, step?: number | string): number {
  const s = step !== undefined ? Number(step) : 0;
  if (!s || s <= 0 || !Number.isFinite(s)) return val;
  const snapped = Math.round(val / s) * s;
  const decimals = (s.toString().split('.')[1] || '').length;
  return Number(snapped.toFixed(Math.min(decimals + 4, 8)));
}

/**
 * 解析 turn 答案为数值。支持数字、数字字符串、钟表时间字符串（如 "3:30" → 210）及自定义归一化函数。
 */
export function parseTurnAnswer(
  ans: number | string,
  normalize?: (v: number | string) => number,
): number {
  if (normalize) {
    const res = normalize(ans);
    if (Number.isFinite(res)) return res;
  }
  if (typeof ans === 'number' && Number.isFinite(ans)) return ans;
  if (typeof ans === 'string') {
    const m = ans.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (m && Number(m[2]) < 60) {
      return Number(m[1]) * 60 + Number(m[2]);
    }
    const n = Number(ans);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/**
 * 判定转动把手的结果：
 * 1. 先吸附到 step 的整数倍；
 * 2. |snapped - target| <= tolerance (默认 0) -> 做对；
 * 3. <= 2 * tolerance 或 <= 2 * step -> 提示“快对了”（不计做错）；
 * 4. 否则做错一次（miss）。
 */
export function turnResult(
  spec: TurnSpec,
  value: number,
  normalize?: (v: number | string) => number,
): TurnResult {
  const target = parseTurnAnswer(spec.answer, normalize);
  const step = spec.step !== undefined ? Number(spec.step) : 0;
  const tolerance = spec.tolerance !== undefined ? Math.max(0, Number(spec.tolerance)) : 0;

  const snapped = snapToStep(value, step);
  const diff = Math.abs(snapped - target);

  if (diff <= tolerance) {
    return {
      status: 'correct',
      correct: true,
      close: false,
      miss: false,
      snapped,
      diff,
      target,
    };
  }

  const closeThreshold = Math.max(2 * tolerance, step > 0 ? 2 * step : 0);
  if (closeThreshold > 0 && diff <= closeThreshold) {
    return {
      status: 'close',
      correct: false,
      close: true,
      miss: false,
      snapped,
      diff,
      target,
    };
  }

  return {
    status: 'wrong',
    correct: false,
    close: false,
    miss: true,
    snapped,
    diff,
    target,
  };
}
