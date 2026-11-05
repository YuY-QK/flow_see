// 参数代入：把文字里的 {参数名} 换成参数值。纯函数，浏览器和 Node 都能用。
const PLACEHOLDER = /\{([A-Za-z_]\w*)\}/g;

/** 把文字里的 {参数名} 换成参数值；没有的参数保持原样 */
export function fillText(text: string, params: Record<string, unknown>): string {
  return text.replace(PLACEHOLDER, (m, k: string) =>
    params[k] === undefined || params[k] === null ? m : String(params[k]),
  );
}

/**
 * 深度代入：配置里所有字符串中的 {参数名} 都换成参数值。
 * 整个字符串只是一个 "{参数名}" 时，保留参数原来的类型（数字仍是数字）。
 */
export function fillParams<T>(value: T, params: Record<string, unknown>): T {
  if (typeof value === 'string') {
    const whole = value.match(/^\{([A-Za-z_]\w*)\}$/);
    if (whole && params[whole[1]] !== undefined) return params[whole[1]] as T;
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
