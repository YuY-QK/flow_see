// 数字格式化与文字函数：纯函数，浏览器和 Node 都能用。
// 汉字从 texts.yaml 的 num 分组读取，代码里不写中文字符串。
import { exprNames } from './params.ts';
import { t } from './texts.ts';

const NF = new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: 20 });

/**
 * 数字转为去浮点误差的标准字符串：
 * Number(v.toPrecision(10)) 后转字符串；去掉末尾多余的 0；负号用 −（U+2212）。
 */
export function formatNumber(v: number): string {
  if (Object.is(v, -0)) v = 0;
  if (!Number.isFinite(v)) return String(v);
  const n = Number(v.toPrecision(10));
  if (Object.is(n, -0) || n === 0) return '0';
  let s = NF.format(n);
  if (s.startsWith('-')) {
    s = '\u2212' + s.slice(1);
  }
  return s;
}

function toDecimalString(v: number): string {
  if (Object.is(v, -0)) v = 0;
  const n = Number(v.toPrecision(10));
  if (Object.is(n, -0) || n === 0) return '0';
  let s = NF.format(n);
  if (s.startsWith('-')) s = s.slice(1);
  return s;
}

/**
 * 汉字读法（小学读数规则）：
 * - 按四位一级（个级、万级、亿级）读；
 * - 每级末尾的 0 不读；
 * - 每级中间连续的 0 只读一个“零”；
 * - 某一级全是 0 且后面还有非零数字时读一个“零”（100005 → 十万零五）；
 * - 最高位是十位的“一十”读作“十”（10、15、100000 十万），但不在最高位时读“一十”（110 一百一十）；
 * - 小数部分逐位读（0.05 零点零五）；
 * - 千位上的 2 读“两”（2000 两千、2700 两千七百）；
 * - 万级、亿级的数只有一位且是 2 时读“两”（20000 两万、200000000 两亿、22000 两万两千）；
 * - 其余读“二”（200 二百、12 十二、120000 十二万）。
 */
export function cn(n: number): string {
  if (Object.is(n, -0)) n = 0;
  if (!Number.isFinite(n)) return String(n);

  const minusText = t('num.minus');
  if (n < 0) return minusText + cn(-n);

  const digits = t('num.digits');
  const units = t('num.units');
  const groups = t('num.groups');
  const two = t('num.two');
  const point = t('num.point');

  const s = toDecimalString(n);
  const parts = s.split('.');
  const intStr = parts[0];
  const decStr = parts[1];

  if (intStr === '0' && !decStr) return digits[0];

  let result = readInteger(intStr, digits, units, groups, two);

  if (decStr) {
    let decRead = '';
    for (const ch of decStr) {
      decRead += digits[Number(ch)];
    }
    result = (result === '' ? digits[0] : result) + point + decRead;
  }
  return result;
}

function readInteger(
  str: string,
  digits: string,
  units: string,
  groups: string,
  two: string,
): string {
  if (str === '0') return digits[0];
  const grps: string[] = [];
  let cur = str;
  while (cur.length > 0) {
    const take = Math.min(4, cur.length);
    grps.unshift(cur.slice(cur.length - take));
    cur = cur.slice(0, cur.length - take);
  }
  const totalGroups = grps.length;
  let out = '';
  let prevGroupAllZero = false;
  let hasOutputBefore = false;

  for (let i = 0; i < totalGroups; i++) {
    const gStr = grps[i];
    const gNum = Number(gStr);
    const groupIdxFromRight = totalGroups - 1 - i;
    const groupUnit = groupIdxFromRight > 0 ? groups[groupIdxFromRight - 1] : '';

    if (gNum === 0) {
      if (hasOutputBefore) prevGroupAllZero = true;
      continue;
    }

    let groupRead = '';
    const padded = gStr.padStart(4, '0');
    const hasLeadingZero = gStr.length < 4 || padded[0] === '0';

    if (hasOutputBefore && (prevGroupAllZero || hasLeadingZero)) {
      out += digits[0];
    }
    prevGroupAllZero = false;

    let zeroPending = false;
    for (let p = 0; p < 4; p++) {
      const d = Number(padded[p]);
      const posUnit = p === 0 ? units[2] : p === 1 ? units[1] : p === 2 ? units[0] : '';
      if (d === 0) {
        if (groupRead.length > 0) zeroPending = true;
      } else {
        if (zeroPending) {
          groupRead += digits[0];
          zeroPending = false;
        }
        let dChar = digits[d];
        if (d === 2) {
          // 千位上的 2 读“两”
          if (p === 0) {
            dChar = two;
          }
          // 万级、亿级的数只有一位且是 2 时读“两”
          else if (groupIdxFromRight > 0 && gNum === 2 && p === 3) {
            dChar = two;
          }
        }
        // 最高位是十位的“一十”读作“十”，不在最高位时读“一十”
        if (p === 2 && d === 1 && !hasOutputBefore && groupRead === '') {
          groupRead += posUnit;
        } else {
          groupRead += dChar + posUnit;
        }
      }
    }

    out += groupRead + groupUnit;
    hasOutputBefore = true;
  }
  return out;
}

/**
 * 保留 k 位小数，保留末尾 0
 */
export function fixed(x: number, k: number): string {
  if (!Number.isFinite(x) || !Number.isFinite(k)) return String(x);
  const places = Math.max(0, Math.min(20, Math.round(k)));
  const sign = x < 0 ? '\u2212' : '';
  const abs = Math.abs(x);
  const factor = Math.pow(10, places);
  const rounded = Math.round(abs * factor + 1e-9) / factor;
  return sign + rounded.toFixed(places);
}

/**
 * 分钟数转为 h:mm；超过 1440 取模
 */
export function time(m: number): string {
  if (!Number.isFinite(m)) return String(m);
  const totalMinutes = Math.round(m);
  const mins = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${h}:${String(rem).padStart(2, '0')}`;
}

/**
 * 分钟数转为 h 时 mm 分；整点只写 h 时
 */
export function hm(m: number): string {
  if (!Number.isFinite(m)) return String(m);
  const totalMinutes = Math.round(m);
  const mins = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  const hourText = t('num.hour');
  if (rem === 0) {
    return `${h} ${hourText}`;
  }
  const minText = t('num.minute');
  return `${h} ${hourText} ${String(rem).padStart(2, '0')} ${minText}`;
}

/**
 * 假分数 a/b → 带分数标记 [w rem/b](frac)；整除时得整数；真分数 → [rem/b](frac)
 */
export function mixed(a: number, b: number): string {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return '';
  a = Math.round(a);
  b = Math.round(b);
  const sign = (a < 0 ? -1 : 1) * (b < 0 ? -1 : 1);
  const absA = Math.abs(a);
  const absB = Math.abs(b);
  const whole = Math.floor(absA / absB);
  const rem = absA % absB;
  const minus = sign < 0 ? '\u2212' : '';

  if (rem === 0) {
    return minus + String(whole);
  }
  if (whole === 0) {
    return `[${minus}${rem}/${absB}](frac)`;
  }
  return `[${minus}${whole} ${rem}/${absB}](frac)`;
}

/**
 * 条件选文字：c 为真（非 0）得 x，否则得 y
 */
export function sel(c: number | boolean, x: string, y: string): string {
  const isTrue = typeof c === 'boolean' ? c : Math.abs(c) >= 1e-9;
  return isTrue ? x : y;
}

/* ───────────── 文字函数解析与校验（供 fill.ts 与 load.ts 使用） ───────────── */

export const TEXT_FUNC_NAMES = new Set(['fixed', 'cn', 'time', 'hm', 'mixed', 'sel']);
export const TEXT_FUNC_RE = /\b(fixed|cn|time|hm|mixed|sel)\s*\(/;

export function parseOutermostCall(src: string): { name: string; inner: string } | null {
  src = src.trim();
  const m = src.match(/^([A-Za-z_]\w*)\s*\(/);
  if (!m) return null;
  const name = m[1];
  let depth = 0;
  let inQuote: string | null = null;
  const startPos = m[0].length - 1;
  for (let i = startPos; i < src.length; i++) {
    const ch = src[i];
    if (inQuote) {
      if (ch === inQuote && src[i - 1] !== '\\') inQuote = null;
    } else if (ch === "'" || ch === '"') {
      inQuote = ch;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        if (i === src.length - 1) {
          const inner = src.slice(startPos + 1, i);
          return { name, inner };
        } else {
          return null;
        }
      }
    }
  }
  return null;
}

export function splitCallArgs(inner: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let inQuote: string | null = null;
  let cur = '';
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (inQuote) {
      cur += ch;
      if (ch === inQuote && inner[i - 1] !== '\\') {
        inQuote = null;
      }
    } else if (ch === "'" || ch === '"') {
      inQuote = ch;
      cur += ch;
    } else if (ch === '(') {
      depth++;
      cur += ch;
    } else if (ch === ')') {
      depth--;
      cur += ch;
    } else if (ch === ',' && depth === 0) {
      args.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

function isQuoted(s: string): boolean {
  s = s.trim();
  return (
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2) ||
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2)
  );
}

export function isValidTextFunc(src: string): boolean {
  const call = parseOutermostCall(src);
  if (!call || !TEXT_FUNC_NAMES.has(call.name)) return false;
  const args = splitCallArgs(call.inner);
  switch (call.name) {
    case 'cn':
    case 'time':
    case 'hm':
      if (args.length !== 1) return false;
      return !TEXT_FUNC_RE.test(args[0]);
    case 'fixed':
    case 'mixed':
      if (args.length !== 2) return false;
      return !TEXT_FUNC_RE.test(args[0]) && !TEXT_FUNC_RE.test(args[1]);
    case 'sel': {
      if (args.length !== 3) return false;
      if (TEXT_FUNC_RE.test(args[0])) return false;
      for (const branch of [args[1], args[2]]) {
        if (isQuoted(branch)) continue;
        if (isValidTextFunc(branch)) continue;
        return false;
      }
      return true;
    }
  }
  return false;
}

export function textFuncParamNames(src: string): string[] {
  const call = parseOutermostCall(src);
  if (!call) return [];
  const args = splitCallArgs(call.inner);
  const names: string[] = [];
  switch (call.name) {
    case 'cn':
    case 'time':
    case 'hm': {
      if (args[0]) names.push(...(exprNames(args[0]) ?? []));
      break;
    }
    case 'fixed':
    case 'mixed': {
      if (args[0]) names.push(...(exprNames(args[0]) ?? []));
      if (args[1]) names.push(...(exprNames(args[1]) ?? []));
      break;
    }
    case 'sel': {
      if (args[0]) names.push(...(exprNames(args[0]) ?? []));
      for (const branch of [args[1], args[2]]) {
        if (!branch) continue;
        if (isValidTextFunc(branch)) {
          names.push(...textFuncParamNames(branch));
        }
      }
      break;
    }
  }
  return names;
}
