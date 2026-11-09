// 参数代入：把文字里的 {参数名} 换成参数值。纯函数，浏览器和 Node 都能用。
// 也可以写算式：{total - 3 * i}（四则运算、括号、min/max/floor/ceil/round/abs，见 params.ts）。
// 以及文字函数：{fixed(2.5, 2)}、{cn(n)}、{time(m)}、{hm(m)}、{mixed(a, b)}、{sel(c, x, y)}（见 format.ts）。
import { evalExpr, range } from './params.ts';
import {
  formatNumber,
  cn,
  fixed,
  time,
  hm,
  mixed,
  isValidTextFunc,
  parseOutermostCall,
  splitCallArgs,
  TEXT_FUNC_RE,
} from './format.ts';

const PLACEHOLDER = /\{([^{}]+)\}/g;
const IDENT = /^[A-Za-z_]\w*$/;

function evalRange(inner: string, params: Record<string, unknown>): number[] | undefined {
  const args = splitCallArgs(inner);
  if (args.length !== 2 && args.length !== 3) return undefined;
  const from = evalExpr(args[0], params);
  const to = evalExpr(args[1], params);
  const step = args.length === 3 ? evalExpr(args[2], params) : 1;
  if (from === undefined || to === undefined || step === undefined) return undefined;
  return range(from, to, step);
}

function evalBranch(arg: string, params: Record<string, unknown>): string | undefined {
  arg = arg.trim();
  if (
    (arg.startsWith("'") && arg.endsWith("'") && arg.length >= 2) ||
    (arg.startsWith('"') && arg.endsWith('"') && arg.length >= 2)
  ) {
    return arg.slice(1, -1);
  }
  if (isValidTextFunc(arg)) {
    return evalTextFunc(arg, params);
  }
  return undefined;
}

function evalTextFunc(src: string, params: Record<string, unknown>): string | undefined {
  if (!isValidTextFunc(src)) return undefined;
  const call = parseOutermostCall(src);
  if (!call) return undefined;
  const args = splitCallArgs(call.inner);
  switch (call.name) {
    case 'cn': {
      const v = evalExpr(args[0], params);
      return v === undefined ? undefined : cn(v);
    }
    case 'time': {
      const v = evalExpr(args[0], params);
      return v === undefined ? undefined : time(v);
    }
    case 'hm': {
      const v = evalExpr(args[0], params);
      return v === undefined ? undefined : hm(v);
    }
    case 'fixed': {
      const v0 = evalExpr(args[0], params);
      const v1 = evalExpr(args[1], params);
      return v0 === undefined || v1 === undefined ? undefined : fixed(v0, v1);
    }
    case 'mixed': {
      const v0 = evalExpr(args[0], params);
      const v1 = evalExpr(args[1], params);
      return v0 === undefined || v1 === undefined ? undefined : mixed(v0, v1);
    }
    case 'sel': {
      const c = evalExpr(args[0], params);
      if (c === undefined) return undefined;
      const isTrue = Math.abs(c) >= 1e-9;
      const branch = isTrue ? args[1] : args[2];
      return evalBranch(branch, params);
    }
    default:
      return undefined;
  }
}

/** 一个 {…} 的值：参数名直接取值；算式算出来；文字函数计算出来；算不出来（如用到还没有的参数）时为 undefined */
function valueOf(src: string, params: Record<string, unknown>): unknown {
  const k = src.trim();
  if (TEXT_FUNC_RE.test(k)) {
    return evalTextFunc(k, params);
  }
  if (IDENT.test(k)) {
    const val = params[k];
    if (val === undefined || val === null) return undefined;
    if (typeof val === 'number') return Number(val.toPrecision(10));
    return val;
  }
  if (!/[-+*/%()]/.test(k)) return undefined;
  const v = evalExpr(k, params);
  // 去掉浮点误差（0.1 + 0.2）
  return v === undefined ? undefined : Number(v.toPrecision(10));
}

/** 把文字里的 {参数名} / {算式} / {文字函数} 换成值；算不出来的保持原样 */
export function fillText(text: string, params: Record<string, unknown>): string {
  return text.replace(PLACEHOLDER, (m, k: string) => {
    const v = valueOf(k, params);
    return v === undefined ? m : (typeof v === 'number' ? formatNumber(v) : String(v));
  });
}

/**
 * 深度代入：配置里所有字符串中的 {参数名} 都换成参数值。
 * 整个字符串只是一个 "{参数名}"（或 "{算式}"、"{文字函数}"）时，保留值原来的类型（数字仍是数字）。
 */
export function fillParams<T>(value: T, params: Record<string, unknown>): T {
  if (typeof value === 'string') {
    const whole = value.trim().match(/^\{([^{}]+)\}$/);
    if (whole) {
      const k = whole[1].trim();
      const mRange = k.match(/^range\((.*)\)$/);
      if (mRange) {
        const arr = evalRange(mRange[1], params);
        if (arr !== undefined) return arr as T;
      }
      const v = valueOf(whole[1], params);
      if (v !== undefined) return v as T;
    }
    return fillText(value, params) as T;
  }
  if (Array.isArray(value)) return value.map((v) => fillParams(v, params)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, fillParams(v, params)]),
    ) as T;
  }
  return value;
}
