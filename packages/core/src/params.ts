// 知识点参数：派生值、动手试一试的取值范围与收回。纯函数，浏览器和 Node 都能用。
//
// 配置里的算式支持四则运算、取余 %、括号、
// min/max/floor/ceil/round/abs/digit/len/gcd/lcm/isPrime/dec/pow，
// 比较运算（> < >= <= == !=）、逻辑运算（&& || !）、三元条件（c ? x : y），
// 变量是参数名（写成 a 或 {a} 都行），例如 "10 - a"、"{b} - {gap}"。

export type Scope = Record<string, unknown>;

/** 取 n 的第 k 位（k = 0 个位，k = 1 十位，k = -1 十分位） */
export function digit(n: number, k: number): number {
  k = Math.round(k);
  const factor = k >= 0 ? 1 / Math.pow(10, k) : Math.pow(10, -k);
  const scaled = Math.abs(n) * factor;
  return Math.floor(scaled + 1e-9) % 10;
}

/** 整数部分位数，len(0) = 1 */
export function len(n: number): number {
  const intPart = Math.floor(Math.abs(n) + 1e-9);
  return intPart === 0 ? 1 : String(intPart).length;
}

/** 最大公因数（非负整数；有 0 时 gcd(a,0)=a） */
export function gcd(a: number, b: number): number {
  a = Math.round(Math.abs(a));
  b = Math.round(Math.abs(b));
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/** 最小公倍数（非负整数；有 0 时 lcm(a,0)=0） */
export function lcm(a: number, b: number): number {
  a = Math.round(Math.abs(a));
  b = Math.round(Math.abs(b));
  if (a === 0 || b === 0) return 0;
  return (a * b) / gcd(a, b);
}

/** 质数判断（1 / 0；n < 2 为 0） */
export function isPrime(n: number): number {
  n = Math.round(n);
  if (n < 2) return 0;
  if (n === 2 || n === 3) return 1;
  if (n % 2 === 0 || n % 3 === 0) return 0;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return 0;
  }
  return 1;
}

/** 四舍五入保留 k 位小数，返回数字（先乘 10^k 后加 1e-9 再 round，避免 2.345 的浮点问题） */
export function dec(n: number, k: number): number {
  k = Math.round(k);
  const sign = n < 0 ? -1 : 1;
  const factor = Math.pow(10, k);
  const scaled = Math.abs(n) * factor;
  const rounded = Math.round(scaled + 1e-9) / factor;
  return sign * Number(rounded.toFixed(Math.max(0, Math.min(12, k))));
}

/** 整数次幂 */
export function pow(a: number, b: number): number {
  return Math.pow(a, Math.round(b));
}

export const FUNCS: Record<string, (...n: number[]) => number> = {
  min: Math.min,
  max: Math.max,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  abs: Math.abs,
  digit,
  len,
  gcd,
  lcm,
  isPrime,
  dec,
  pow,
};

function checkArity(name: string, count: number): boolean {
  switch (name) {
    case 'floor':
    case 'ceil':
    case 'round':
    case 'abs':
    case 'len':
    case 'isPrime':
      return count === 1;
    case 'digit':
    case 'gcd':
    case 'lcm':
    case 'dec':
    case 'pow':
      return count === 2;
    case 'min':
    case 'max':
      return count >= 1;
    default:
      return true;
  }
}

function stripOuterBraces(src: string): string {
  let s = src.trim();
  if (s.startsWith('{') && s.endsWith('}')) {
    let depth = 0;
    let isOuter = true;
    for (let i = 0; i < s.length - 1; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}') {
        depth--;
        if (depth === 0) {
          isOuter = false;
          break;
        }
      }
    }
    if (isOuter && depth === 1) {
      s = s.slice(1, -1).trim();
    }
  }
  return s;
}

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

function tokenize(src: string): Tok[] | undefined {
  src = stripOuterBraces(src);
  const out: Tok[] = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|\{?([A-Za-z_]\w*)\}?|(>=|<=|==|!=|&&|\|\||[-+*/%(),><!?:&|=]))/y;
  let i = 0;
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

type AST =
  | { type: 'num'; value: number }
  | { type: 'id'; name: string }
  | { type: 'call'; name: string; args: AST[] }
  | { type: 'unary'; op: '+' | '-' | '!'; expr: AST }
  | {
      type: 'binary';
      op:
        | '+'
        | '-'
        | '*'
        | '/'
        | '%'
        | '>'
        | '<'
        | '>='
        | '<='
        | '=='
        | '!='
        | '&&'
        | '||';
      left: AST;
      right: AST;
    }
  | { type: 'cond'; cond: AST; then: AST; else: AST };

function parse(toks: Tok[]): AST | undefined {
  let pos = 0;
  const peek = () => toks[pos];
  const eat = (op: string) => {
    if (peek()?.t === 'op' && peek()?.v === op) {
      pos++;
      return true;
    }
    return false;
  };

  const parseConditional = (): AST | undefined => {
    const cond = parseLogicalOr();
    if (!cond) return undefined;
    if (eat('?')) {
      const thenExpr = parseConditional();
      if (!thenExpr) return undefined;
      if (!eat(':')) return undefined;
      const elseExpr = parseConditional();
      if (!elseExpr) return undefined;
      return { type: 'cond', cond, then: thenExpr, else: elseExpr };
    }
    return cond;
  };

  const parseLogicalOr = (): AST | undefined => {
    let left = parseLogicalAnd();
    if (!left) return undefined;
    while (eat('||')) {
      const right = parseLogicalAnd();
      if (!right) return undefined;
      left = { type: 'binary', op: '||', left, right };
    }
    return left;
  };

  const parseLogicalAnd = (): AST | undefined => {
    let left = parseEquality();
    if (!left) return undefined;
    while (eat('&&')) {
      const right = parseEquality();
      if (!right) return undefined;
      left = { type: 'binary', op: '&&', left, right };
    }
    return left;
  };

  const parseEquality = (): AST | undefined => {
    let left = parseRelational();
    if (!left) return undefined;
    while (peek()?.t === 'op' && (peek().v === '==' || peek().v === '!=')) {
      const op = (toks[pos++] as { t: 'op'; v: string }).v as '==' | '!=';
      const right = parseRelational();
      if (!right) return undefined;
      left = { type: 'binary', op, left, right };
    }
    return left;
  };

  const parseRelational = (): AST | undefined => {
    let left = parseAdditive();
    if (!left) return undefined;
    while (
      peek()?.t === 'op' &&
      (peek().v === '<' || peek().v === '<=' || peek().v === '>' || peek().v === '>=')
    ) {
      const op = (toks[pos++] as { t: 'op'; v: string }).v as '<' | '<=' | '>' | '>=';
      const right = parseAdditive();
      if (!right) return undefined;
      left = { type: 'binary', op, left, right };
    }
    return left;
  };

  const parseAdditive = (): AST | undefined => {
    let left = parseMultiplicative();
    if (!left) return undefined;
    while (peek()?.t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = (toks[pos++] as { t: 'op'; v: string }).v as '+' | '-';
      const right = parseMultiplicative();
      if (!right) return undefined;
      left = { type: 'binary', op, left, right };
    }
    return left;
  };

  const parseMultiplicative = (): AST | undefined => {
    let left = parseUnary();
    if (!left) return undefined;
    while (peek()?.t === 'op' && (peek().v === '*' || peek().v === '/' || peek().v === '%')) {
      const op = (toks[pos++] as { t: 'op'; v: string }).v as '*' | '/' | '%';
      const right = parseUnary();
      if (!right) return undefined;
      left = { type: 'binary', op, left, right };
    }
    return left;
  };

  const parseUnary = (): AST | undefined => {
    if (peek()?.t === 'op' && (peek().v === '+' || peek().v === '-' || peek().v === '!')) {
      const op = (toks[pos++] as { t: 'op'; v: string }).v as '+' | '-' | '!';
      const expr = parseUnary();
      if (!expr) return undefined;
      return { type: 'unary', op, expr };
    }
    return parsePrimary();
  };

  const parsePrimary = (): AST | undefined => {
    const t = toks[pos++];
    if (!t) return undefined;
    if (t.t === 'num') {
      return { type: 'num', value: t.v };
    }
    if (t.t === 'id') {
      if (t.v in FUNCS && peek()?.t === 'op' && peek().v === '(') {
        pos++;
        const args: AST[] = [];
        if (!eat(')')) {
          do {
            const arg = parseConditional();
            if (!arg) return undefined;
            args.push(arg);
          } while (eat(','));
          if (!eat(')')) return undefined;
        }
        if (!checkArity(t.v, args.length)) return undefined;
        return { type: 'call', name: t.v, args };
      }
      if (peek()?.t === 'op' && peek().v === '(') {
        return undefined;
      }
      return { type: 'id', name: t.v };
    }
    if (t.t === 'op' && t.v === '(') {
      const expr = parseConditional();
      if (!expr) return undefined;
      if (!eat(')')) return undefined;
      return expr;
    }
    return undefined;
  };

  const ast = parseConditional();
  if (!ast || pos !== toks.length) return undefined;
  return ast;
}

function evalAST(
  node: AST,
  get: (name: string) => number | undefined,
  dry = false,
): number | undefined {
  switch (node.type) {
    case 'num':
      return node.value;
    case 'id': {
      if (dry) return get(node.name) ?? 1;
      const v = get(node.name);
      return v !== undefined && Number.isFinite(v) ? v : undefined;
    }
    case 'call': {
      const fn = FUNCS[node.name];
      if (!fn) return undefined;
      const evaluatedArgs: number[] = [];
      for (const arg of node.args) {
        const val = evalAST(arg, get, dry);
        if (val === undefined || !Number.isFinite(val)) return undefined;
        evaluatedArgs.push(val);
      }
      if (dry) return 1;
      const res = fn(...evaluatedArgs);
      return Number.isFinite(res) ? res : undefined;
    }
    case 'unary': {
      const val = evalAST(node.expr, get, dry);
      if (val === undefined || !Number.isFinite(val)) return undefined;
      if (node.op === '+') return val;
      if (node.op === '-') return -val;
      if (node.op === '!') return Math.abs(val) < 1e-9 ? 1 : 0;
      return undefined;
    }
    case 'binary': {
      if (node.op === '&&') {
        const left = evalAST(node.left, get, dry);
        if (left === undefined || !Number.isFinite(left)) return undefined;
        if (!dry && Math.abs(left) < 1e-9) return 0;
        const right = evalAST(node.right, get, dry);
        if (right === undefined || !Number.isFinite(right)) return undefined;
        if (dry) return 1;
        return Math.abs(left) >= 1e-9 && Math.abs(right) >= 1e-9 ? 1 : 0;
      }
      if (node.op === '||') {
        const left = evalAST(node.left, get, dry);
        if (left === undefined || !Number.isFinite(left)) return undefined;
        if (!dry && Math.abs(left) >= 1e-9) return 1;
        const right = evalAST(node.right, get, dry);
        if (right === undefined || !Number.isFinite(right)) return undefined;
        if (dry) return 1;
        return Math.abs(left) >= 1e-9 || Math.abs(right) >= 1e-9 ? 1 : 0;
      }

      const left = evalAST(node.left, get, dry);
      if (left === undefined || !Number.isFinite(left)) return undefined;
      const right = evalAST(node.right, get, dry);
      if (right === undefined || !Number.isFinite(right)) return undefined;

      switch (node.op) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          if (Math.abs(right) < 1e-9) return dry ? 1 : undefined;
          return left / right;
        case '%':
          if (Math.abs(right) < 1e-9) return dry ? 1 : undefined;
          return left % right;
        case '>':
          return left - right > 1e-9 ? 1 : 0;
        case '<':
          return right - left > 1e-9 ? 1 : 0;
        case '>=':
          return left - right >= -1e-9 ? 1 : 0;
        case '<=':
          return right - left >= -1e-9 ? 1 : 0;
        case '==':
          return Math.abs(left - right) < 1e-9 ? 1 : 0;
        case '!=':
          return Math.abs(left - right) >= 1e-9 ? 1 : 0;
        default:
          return undefined;
      }
    }
    case 'cond': {
      const cond = evalAST(node.cond, get, dry);
      if (cond === undefined || !Number.isFinite(cond)) return undefined;
      if (dry) {
        const t = evalAST(node.then, get, dry);
        const e = evalAST(node.else, get, dry);
        return t !== undefined && e !== undefined ? 1 : undefined;
      }
      if (Math.abs(cond) >= 1e-9) {
        return evalAST(node.then, get, false);
      } else {
        return evalAST(node.else, get, false);
      }
    }
  }
}

function collectIds(node: AST, out: string[] = []): string[] {
  switch (node.type) {
    case 'num':
      break;
    case 'id':
      out.push(node.name);
      break;
    case 'call':
      for (const arg of node.args) collectIds(arg, out);
      break;
    case 'unary':
      collectIds(node.expr, out);
      break;
    case 'binary':
      collectIds(node.left, out);
      collectIds(node.right, out);
      break;
    case 'cond':
      collectIds(node.cond, out);
      collectIds(node.then, out);
      collectIds(node.else, out);
      break;
  }
  return out;
}

function evalTokens(
  toks: Tok[],
  get: (name: string) => number | undefined,
  dry = false,
): number | undefined {
  const ast = parse(toks);
  if (!ast) return undefined;
  const v = evalAST(ast, get, dry);
  if (v === undefined || !Number.isFinite(v)) return undefined;
  return v;
}

/** 算式里用到的变量名（检查配置用）；算式写错时返回 undefined */
export function exprNames(src: string): string[] | undefined {
  const toks = tokenize(src);
  if (!toks) return undefined;
  const ast = parse(toks);
  if (!ast || evalAST(ast, () => 1, true) === undefined) return undefined;
  return collectIds(ast);
}

/** 计算算式；写错、用到不存在的参数、结果不是有限数时返回 undefined */
export function evalExpr(src: string | number, scope: Scope = {}): number | undefined {
  if (typeof src === 'number') return Number.isFinite(src) ? src : undefined;
  const toks = tokenize(src);
  if (!toks) return undefined;
  return evalTokens(toks, (k) => (typeof scope[k] === 'number' ? (scope[k] as number) : undefined));
}

/**
 * 由起点、终点、步长生成数字列表（包含两端，步长为正且 from > to 时返回空列表）。
 * 只能作为整个属性值 '{range(1, n, 1)}' 使用。
 */
export function range(from: number, to: number, step = 1): number[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || !Number.isFinite(step)) return [];
  if (step <= 0) return [];
  if (from > to) return [];
  const out: number[] = [];
  for (let v = from; v <= to + 1e-9 && out.length < 1000; v += step) {
    out.push(Number(v.toFixed(6)));
  }
  return out;
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

/**
 * 列出所有控件取值的全部组合（不抽样）。
 * 超过 maxLimit（默认 20000）时返回 overflow: true 和总数估算，避免内存暴涨。
 */
export function allExploreCombos(
  controls: readonly ExploreControl[],
  params: Scope,
  derived: Derived = {},
  maxLimit = 20000,
): { combos: Scope[]; total: number; overflow: boolean } {
  if (controls.length === 0) {
    return { combos: [clampParams(controls, params, derived)], total: 1, overflow: false };
  }

  let combos: Scope[] = [clampParams(controls, params, derived)];
  for (const c of controls) {
    const next: Scope[] = [];
    for (const base of combos) {
      let values: unknown[];
      if (c.control === 'slider') {
        const { min, max, step } = sliderRange(c, resolveParams(base, derived));
        if (step <= 0 || min > max) {
          values = [min];
        } else {
          const count = Math.floor((max - min) / step + 1e-9) + 1;
          if (count > maxLimit) {
            return { combos: [], total: count, overflow: true };
          }
          values = [];
          for (let v = min; v <= max + 1e-9; v += step) {
            values.push(Math.round(v * 1e6) / 1e6);
          }
        }
      } else if (c.control === 'buttons') {
        values = (c.options ?? []).map((o) => o.value);
      } else {
        values = [false, true];
      }

      for (const v of values) {
        next.push(clampParams(controls, { ...base, [c.param]: v }, derived));
      }
      if (next.length > maxLimit) {
        const estTotal = combos.length * values.length;
        return { combos: [], total: Math.max(estTotal, next.length), overflow: true };
      }
    }

    // 去重
    const seen = new Set<string>();
    combos = next.filter((p) => {
      const k = JSON.stringify(p);
      return seen.has(k) ? false : (seen.add(k), true);
    });

    if (combos.length > maxLimit) {
      return { combos: [], total: combos.length, overflow: true };
    }
  }

  return { combos, total: combos.length, overflow: false };
}

/**
 * 列出所有控件取值的组合（检查配置用）；超过 limit 时按规则抽样，最多 limit 个。
 * 抽样规则：
 * ① 先放入“每个参数取最小值 / 最大值，其他参数取标准值”的组合；
 * ② 放入全部参数都取最小、都取最大的组合；
 * ③ 其余按间隔抽样补到 limit。
 */
export function exploreCombos(
  controls: readonly ExploreControl[],
  params: Scope,
  derived: Derived = {},
  limit = 400,
): Scope[] {
  if (limit <= 0) return [];
  if (controls.length === 0) return [clampParams(controls, params, derived)];

  const { combos: all, overflow } = allExploreCombos(controls, params, derived, 20000);
  const standard = clampParams(controls, params, derived);

  const chosen: Scope[] = [];
  const chosenKeys = new Set<string>();
  const add = (p: Scope) => {
    const k = JSON.stringify(p);
    if (!chosenKeys.has(k)) {
      chosenKeys.add(k);
      chosen.push(p);
    }
  };

  // ① 先放入“每个参数取最小值 / 最大值，其他参数取标准值”的组合
  for (const c of controls) {
    const stdScope = resolveParams(standard, derived);
    if (c.control === 'slider') {
      const { min, max } = sliderRange(c, stdScope);
      add(clampParams(controls, { ...standard, [c.param]: min }, derived));
      add(clampParams(controls, { ...standard, [c.param]: max }, derived));
    } else if (c.control === 'buttons') {
      const opts = c.options ?? [];
      if (opts.length > 0) {
        add(clampParams(controls, { ...standard, [c.param]: opts[0].value }, derived));
        add(clampParams(controls, { ...standard, [c.param]: opts[opts.length - 1].value }, derived));
      }
    } else {
      add(clampParams(controls, { ...standard, [c.param]: false }, derived));
      add(clampParams(controls, { ...standard, [c.param]: true }, derived));
    }
  }

  // ② 放入全部参数都取最小、都取最大的组合
  const curMin: Scope = { ...standard };
  const curMax: Scope = { ...standard };
  for (const c of controls) {
    if (c.control === 'slider') {
      const rMin = sliderRange(c, resolveParams(curMin, derived));
      curMin[c.param] = rMin.min;
      const rMax = sliderRange(c, resolveParams(curMax, derived));
      curMax[c.param] = rMax.max;
    } else if (c.control === 'buttons') {
      const optsMin = c.options ?? [];
      if (optsMin.length > 0) curMin[c.param] = optsMin[0].value;
      const optsMax = c.options ?? [];
      if (optsMax.length > 0) curMax[c.param] = optsMax[optsMax.length - 1].value;
    } else {
      curMin[c.param] = false;
      curMax[c.param] = true;
    }
  }
  add(clampParams(controls, curMin, derived));
  add(clampParams(controls, curMax, derived));

  if (!overflow && all.length <= limit) {
    return all;
  }

  // ③ 其余按间隔抽样补到 limit
  const remaining = all.filter((p) => !chosenKeys.has(JSON.stringify(p)));
  const needed = limit - chosen.length;
  if (needed > 0 && remaining.length > 0) {
    if (remaining.length <= needed) {
      for (const p of remaining) add(p);
    } else {
      const stride = remaining.length / needed;
      for (let i = 0; i < needed; i++) {
        const idx = Math.min(remaining.length - 1, Math.floor(i * stride));
        add(remaining[idx]);
      }
    }
  }

  return chosen.slice(0, limit);
}

export interface LessonForWhenCoverage {
  steps?: Array<{
    when?: string;
    repeat?: number | string;
    [key: string]: unknown;
  }>;
  derived?: Derived;
  params?: Scope;
}

export interface WhenStepCoverage {
  stepIndex: number;
  when: string;
  trueCount: number;
  falseCount: number;
  trueCombo?: Scope;
  falseCombo?: Scope;
}

/**
 * 统计每个带 when 的步骤在 combos 中的真 / 假出现次数，
 * 并记录一个真组合和一个假组合（若存在）。
 */
export function whenCoverage(
  lesson: LessonForWhenCoverage,
  combos: readonly Scope[],
): WhenStepCoverage[] {
  const steps = lesson.steps ?? [];
  const result: WhenStepCoverage[] = [];

  for (let si = 0; si < steps.length; si++) {
    const st = steps[si];
    if (st.when === undefined) continue;

    const cov: WhenStepCoverage = {
      stepIndex: si,
      when: st.when,
      trueCount: 0,
      falseCount: 0,
    };

    for (const combo of combos) {
      const scope = resolveParams(combo, lesson.derived);
      if (st.repeat !== undefined) {
        const countVal =
          typeof st.repeat === 'number'
            ? st.repeat
            : evalExpr(st.repeat, scope);
        const count =
          countVal !== undefined && Number.isFinite(countVal)
            ? Math.floor(countVal)
            : 0;

        if (count <= 0) {
          cov.falseCount++;
          if (!cov.falseCombo) cov.falseCombo = combo;
        } else {
          let hasTrue = false;
          let hasFalse = false;
          for (let i = 1; i <= count; i++) {
            const cond = evalExpr(st.when, { ...scope, i });
            if (cond !== undefined && Math.abs(cond) >= 1e-9) {
              hasTrue = true;
            } else {
              hasFalse = true;
            }
          }
          if (hasTrue) {
            cov.trueCount++;
            if (!cov.trueCombo) cov.trueCombo = combo;
          }
          if (hasFalse) {
            cov.falseCount++;
            if (!cov.falseCombo) cov.falseCombo = combo;
          }
        }
      } else {
        const cond = evalExpr(st.when, scope);
        if (cond !== undefined && Math.abs(cond) >= 1e-9) {
          cov.trueCount++;
          if (!cov.trueCombo) cov.trueCombo = combo;
        } else {
          cov.falseCount++;
          if (!cov.falseCombo) cov.falseCombo = combo;
        }
      }
    }

    result.push(cov);
  }

  return result;
}
