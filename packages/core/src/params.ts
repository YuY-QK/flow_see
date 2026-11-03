// 知识点参数：派生值、动手试一试的取值范围与收回。纯函数，浏览器和 Node 都能用。
//
// 配置里的算式只支持四则运算、括号、min/max/floor/ceil/round/abs，
// 变量是参数名（写成 a 或 {a} 都行），例如 "10 - a"、"{b} - {gap}"。

export type Scope = Record<string, unknown>;

const FUNCS: Record<string, (...n: number[]) => number> = {
  min: Math.min,
  max: Math.max,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  abs: Math.abs,
};

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

function tokenize(src: string): Tok[] | undefined {
  const out: Tok[] = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|\{?([A-Za-z_]\w*)\}?|([-+*/(),]))/y;
  let i = 0;
  src = src.trim();
  while (i < src.length) {
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) return undefined;
    i = re.lastIndex;
    if (m[1] !== undefined) out.push({ t: 'num', v: Number(m[1]) });
    else if (m[2] !== undefined) out.push({ t: 'id', v: m[2] });
    else out.push({ t: 'op', v: m[3] });
  }
  return out;
}

/** 算式里用到的变量名（检查配置用）；算式写错时返回 undefined */
export function exprNames(src: string): string[] | undefined {
  const toks = tokenize(src);
  if (!toks || evalTokens(toks, () => 1, true) === undefined) return undefined;
  return toks.flatMap((t) => (t.t === 'id' && !(t.v in FUNCS) ? [t.v] : []));
}

function evalTokens(
  toks: Tok[],
  get: (name: string) => number | undefined,
  dry = false,
): number | undefined {
  let pos = 0;
  let bad = false;
  const peek = () => toks[pos];
  const eat = (v: string) => (peek()?.t === 'op' && peek().v === v ? (pos++, true) : false);
  const expr = (): number => {
    let v = term();
    for (;;) {
      if (eat('+')) v += term();
      else if (eat('-')) v -= term();
      else return v;
    }
  };
  const term = (): number => {
    let v = unary();
    for (;;) {
      if (eat('*')) v *= unary();
      else if (eat('/')) {
        const d = unary();
        v = dry ? v : v / d;
      } else return v;
    }
  };
  const unary = (): number => (eat('-') ? -unary() : eat('+') ? unary() : atom());
  const atom = (): number => {
    const t = toks[pos++];
    if (!t) return ((bad = true), 0);
    if (t.t === 'num') return t.v;
    if (t.t === 'id') {
      if (t.v in FUNCS && peek()?.t === 'op' && peek().v === '(') {
        pos++;
        const args: number[] = [];
        if (!eat(')')) {
          do args.push(expr());
          while (eat(','));
          if (!eat(')')) bad = true;
        }
        return FUNCS[t.v](...args);
      }
      const v = get(t.v);
      if (v === undefined) bad = true;
      return v ?? 0;
    }
    if (t.v === '(') {
      const v = expr();
      if (!eat(')')) bad = true;
      return v;
    }
    return ((bad = true), 0);
  };
  const v = expr();
  if (bad || pos !== toks.length || !Number.isFinite(v)) return undefined;
  return v;
}

/** 计算算式；写错、用到不存在的参数、结果不是有限数时返回 undefined */
export function evalExpr(src: string | number, scope: Scope = {}): number | undefined {
  if (typeof src === 'number') return Number.isFinite(src) ? src : undefined;
  const toks = tokenize(src);
  if (!toks) return undefined;
  return evalTokens(toks, (k) => (typeof scope[k] === 'number' ? (scope[k] as number) : undefined));
}

/** 派生值：由参数算出来的值，按写的顺序计算，后面的可以用前面的 */
export type Derived = Record<string, number | string>;

/** 参数 + 派生值（派生值算不出来时不放进去） */
export function resolveParams(params: Scope, derived: Derived = {}): Scope {
  const out: Scope = { ...params };
  for (const [k, expr] of Object.entries(derived)) {
    const v = evalExpr(expr, out);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/* ───────────── 动手试一试 ───────────── */

export interface ExploreControl {
  param: string;
  control: 'slider' | 'buttons' | 'switch';
  label: string;
  /** 数字，或用其他参数算出来的式子，如 "11 - a" */
  min?: number | string;
  max?: number | string;
  step?: number;
  options?: { value: unknown; label: string }[];
}

export interface Range {
  min: number;
  max: number;
  step: number;
}

/** 某个滑块当前的取值范围（范围可能随其他参数变化） */
export function sliderRange(c: ExploreControl, scope: Scope): Range {
  const step = c.step ?? 1;
  const min = evalExpr(c.min ?? 0, scope) ?? 0;
  const max = evalExpr(c.max ?? 10, scope) ?? min;
  return { min, max: Math.max(min, max), step };
}

/**
 * 把参数收回到各控件允许的范围内（规格 P3：取值超出范围时自动收回）。
 * 范围可能依赖其他参数（“取几份”不能超过“分成几份”），所以按控件顺序算两遍。
 */
export function clampParams(
  controls: readonly ExploreControl[],
  params: Scope,
  derived: Derived = {},
): Scope {
  let cur: Scope = { ...params };
  for (let pass = 0; pass < 2; pass++) {
    for (const c of controls) {
      const v = cur[c.param];
      if (c.control === 'slider') {
        const { min, max, step } = sliderRange(c, resolveParams(cur, derived));
        const n = typeof v === 'number' && Number.isFinite(v) ? v : min;
        const snapped = min + Math.round((n - min) / step) * step;
        cur[c.param] = Math.min(max, Math.max(min, Math.round(snapped * 1e6) / 1e6));
      } else if (c.control === 'buttons') {
        const opts = c.options ?? [];
        if (!opts.some((o) => o.value === v) && opts.length) cur[c.param] = opts[0].value;
      } else if (typeof v !== 'boolean') cur[c.param] = !!v;
    }
    cur = { ...cur };
  }
  return cur;
}

/** 列出所有控件取值的组合（检查配置用）；组合太多时只取两端和中间，最多 limit 个 */
export function exploreCombos(
  controls: readonly ExploreControl[],
  params: Scope,
  derived: Derived = {},
  limit = 400,
): Scope[] {
  let combos: Scope[] = [clampParams(controls, params, derived)];
  for (const c of controls) {
    const next: Scope[] = [];
    for (const base of combos) {
      let values: unknown[];
      if (c.control === 'slider') {
        const { min, max, step } = sliderRange(c, resolveParams(base, derived));
        values = [];
        for (let v = min; v <= max + 1e-9 && values.length < 200; v += step) values.push(v);
      } else if (c.control === 'buttons') values = (c.options ?? []).map((o) => o.value);
      else values = [false, true];
      for (const v of values) next.push(clampParams(controls, { ...base, [c.param]: v }, derived));
    }
    // 去重；太多时抽样
    const seen = new Set<string>();
    combos = next.filter((p) => {
      const k = JSON.stringify(p);
      return seen.has(k) ? false : (seen.add(k), true);
    });
    if (combos.length > limit) {
      const stride = Math.ceil(combos.length / limit);
      combos = combos.filter((_, i) => i % stride === 0);
    }
  }
  return combos;
}
