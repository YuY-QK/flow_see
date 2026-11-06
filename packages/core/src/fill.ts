// 参数代入：把文字里的 {参数名} 换成参数值。纯函数，浏览器和 Node 都能用。
// 也可以写算式：{total - 3 * i}（四则运算、括号、min/max/floor/ceil/round/abs，见 params.ts）。
import { evalExpr } from './params.ts';

const PLACEHOLDER = /\{([^{}]+)\}/g;
const IDENT = /^[A-Za-z_]\w*$/;

/** 一个 {…} 的值：参数名直接取值；算式算出来；算不出来（如用到还没有的参数）时为 undefined */
function valueOf(src: string, params: Record<string, unknown>): unknown {
  const k = src.trim();
  if (IDENT.test(k)) return params[k] === null ? undefined : params[k];
  if (!/[-+*/%()]/.test(k)) return undefined;
  const v = evalExpr(k, params);
  // 去掉浮点误差（0.1 + 0.2）
  return v === undefined ? undefined : Number(v.toFixed(6));
}

/** 把文字里的 {参数名} / {算式} 换成值；算不出来的保持原样 */
export function fillText(text: string, params: Record<string, unknown>): string {
  return text.replace(PLACEHOLDER, (m, k: string) => {
    const v = valueOf(k, params);
    return v === undefined ? m : String(v);
  });
}

/**
 * 深度代入：配置里所有字符串中的 {参数名} 都换成参数值。
 * 整个字符串只是一个 "{参数名}"（或 "{算式}"）时，保留值原来的类型（数字仍是数字）。
 */
export function fillParams<T>(value: T, params: Record<string, unknown>): T {
  if (typeof value === 'string') {
    const whole = value.match(/^\{([^{}]+)\}$/);
    if (whole) {
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
