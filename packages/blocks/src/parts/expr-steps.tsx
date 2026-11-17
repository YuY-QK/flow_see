// 递等式零件：四则混合运算的运算顺序、简便运算、连加连减。
import {
  color,
  num,
  pt,
  textWidth,
  type Box,
  type PartContext,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';

export type ExprTokenType =
  | 'num'
  | 'text'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'lbracket'
  | 'rbracket';

export interface ExprToken {
  type: ExprTokenType;
  value: string;
}

export interface FormattedTokenRange {
  start: number;
  end: number;
}

export interface FormattedLine {
  text: string;
  tokenRanges: FormattedTokenRange[];
}

export interface ExprStepsLine {
  index: number; // 0-based
  text: string; // 显示的文本，第 2 行起带 "= "
  rawExpr: string; // 算式部分（第 2 行起不带 "= "）
  hasEquals: boolean;
  baseline: Point;
  opacity: number;
  box: Box;
  underline?: {
    x1: number;
    x2: number;
    y: number;
  };
  note?: {
    text: string;
    x: number;
    y: number;
  };
}

export interface ExprStepsOpSubitem {
  index: number; // 1-based (第 n 个运算符)
  op: string;
  box: Box;
}

export interface ExprStepsLayoutResult {
  at: Point;
  size: number;
  show: number;
  lines: ExprStepsLine[];
  box: Box;
  opBoxes: ExprStepsOpSubitem[];
}

/* ───────────── 词法解析与 Tokenize ───────────── */

const IS_OP = /^[+\-−×÷*/]$/;

function normalizeOp(op: string): string {
  if (op === '-' || op === '−') return '−';
  if (op === '*' || op === '×') return '×';
  if (op === '/' || op === '÷') return '÷';
  return op;
}

export function tokenizeExpr(expr: string): ExprToken[] {
  const tokens: ExprToken[] = [];
  let i = 0;
  const s = expr.trim();
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen', value: '(' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ')' });
      i++;
      continue;
    }
    if (ch === '[') {
      tokens.push({ type: 'lbracket', value: '[' });
      i++;
      continue;
    }
    if (ch === ']') {
      tokens.push({ type: 'rbracket', value: ']' });
      i++;
      continue;
    }
    if (IS_OP.test(ch)) {
      tokens.push({ type: 'op', value: normalizeOp(ch) });
      i++;
      continue;
    }
    // 匹配数值：整数或小数
    if (/^[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < s.length && /^[0-9.]/.test(s[i])) {
        numStr += s[i];
        i++;
      }
      tokens.push({ type: 'num', value: numStr });
      continue;
    }
    // 匹配其他文本（如字母、中文代数项）
    let textStr = '';
    while (
      i < s.length &&
      !/\s/.test(s[i]) &&
      !IS_OP.test(s[i]) &&
      s[i] !== '(' &&
      s[i] !== ')' &&
      s[i] !== '[' &&
      s[i] !== ']'
    ) {
      textStr += s[i];
      i++;
    }
    tokens.push({ type: 'text', value: textStr });
  }

  // 校验括号匹配
  const stack: string[] = [];
  for (const t of tokens) {
    if (t.type === 'lparen') stack.push('(');
    else if (t.type === 'lbracket') stack.push('[');
    else if (t.type === 'rparen') {
      if (stack.pop() !== '(') {
        throw new Error(`expr parse failed: unmatched parenthesis: "${expr}"`);
      }
    } else if (t.type === 'rbracket') {
      if (stack.pop() !== '[') {
        throw new Error(`expr parse failed: unmatched bracket: "${expr}"`);
      }
    }
  }
  if (stack.length > 0) {
    throw new Error(`expr parse failed: unclosed parenthesis: "${expr}"`);
  }

  return tokens;
}

/* ───────────── 格式化 Token 列表为排版字符串 ───────────── */

export function formatTokens(tokens: ExprToken[]): FormattedLine {
  let text = '';
  const tokenRanges: FormattedTokenRange[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = i > 0 ? tokens[i - 1] : undefined;

    // 确定当前 token 前面是否需要加空格
    let needSpace = false;
    if (prev) {
      if (t.type === 'op' || prev.type === 'op') {
        needSpace = true;
      } else if (t.type === 'lparen' || t.type === 'lbracket') {
        needSpace = prev.type === 'num' || prev.type === 'text' || prev.type === 'rparen' || prev.type === 'rbracket';
      } else if (prev.type === 'rparen' || prev.type === 'rbracket') {
        needSpace = t.type === 'num' || t.type === 'text';
      }
    }

    if (needSpace) {
      text += ' ';
    }

    const start = text.length;
    text += t.value;
    const end = text.length;
    tokenRanges.push({ start, end });
  }

  return { text, tokenRanges };
}

/* ───────────── 浮点数格式化 ───────────── */

function formatNum(n: number): string {
  // 处理浮点精度问题（如 0.30000000000000004 -> 0.3）
  const precision = Number(n.toPrecision(12));
  return String(precision);
}

/* ───────────── 单步计算化简 ───────────── */

export interface StepReductionResult {
  nextTokens: ExprToken[];
  /** 在当前行 tokens 中先算部分的索引范围 [startIdx, endIdx]（闭区间） */
  underlineTokenRange?: [number, number];
  isDone: boolean;
}

export function simplifyStep(tokens: ExprToken[]): StepReductionResult {
  // 检查是否只剩下一个数
  if (tokens.length === 1 && tokens[0].type === 'num') {
    return { nextTokens: tokens, isDone: true };
  }

  // 1. 计算括号嵌套深度
  let currentDepth = 0;
  let maxDepth = 0;
  for (const t of tokens) {
    if (t.type === 'lparen' || t.type === 'lbracket') {
      currentDepth++;
      if (currentDepth > maxDepth) maxDepth = currentDepth;
    } else if (t.type === 'rparen' || t.type === 'rbracket') {
      currentDepth--;
    }
  }

  // 2. 确定搜索区间 [searchStart, searchEnd] 以及外层括号 [outerL, outerR]
  let searchStart = 0;
  let searchEnd = tokens.length - 1;
  let outerL = -1;
  let outerR = -1;

  if (maxDepth > 0) {
    let d = 0;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type === 'lparen' || t.type === 'lbracket') {
        d++;
        if (d === maxDepth && outerL === -1) {
          outerL = i;
        }
      } else if (t.type === 'rparen' || t.type === 'rbracket') {
        if (d === maxDepth && outerL !== -1) {
          outerR = i;
          break;
        }
        d--;
      }
    }
    searchStart = outerL + 1;
    searchEnd = outerR - 1;
  }

  // 3. 在搜索范围内寻找运算符：先乘除后加减
  let targetOpIdx = -1;
  for (let i = searchStart; i <= searchEnd; i++) {
    if (tokens[i].type === 'op' && (tokens[i].value === '×' || tokens[i].value === '÷')) {
      targetOpIdx = i;
      break;
    }
  }
  if (targetOpIdx === -1) {
    for (let i = searchStart; i <= searchEnd; i++) {
      if (tokens[i].type === 'op' && (tokens[i].value === '+' || tokens[i].value === '−')) {
        targetOpIdx = i;
        break;
      }
    }
  }

  // 如果搜索范围内没有运算符（括号内只剩一个数，例如 (36) 或 [36]）
  if (targetOpIdx === -1) {
    if (maxDepth > 0 && outerL !== -1 && outerR !== -1) {
      // 消除这对外层括号
      const nextTokens = [
        ...tokens.slice(0, outerL),
        ...tokens.slice(outerL + 1, outerR),
        ...tokens.slice(outerR + 1),
      ];
      return {
        nextTokens,
        underlineTokenRange: [outerL, outerR],
        isDone: nextTokens.length === 1 && nextTokens[0].type === 'num',
      };
    }
    throw new Error('expr parse failed: no valid operator');
  }

  // 4. 执行计算
  const leftIdx = targetOpIdx - 1;
  const rightIdx = targetOpIdx + 1;
  if (leftIdx < 0 || rightIdx >= tokens.length) {
    throw new Error('expr parse failed: missing operand');
  }

  const leftToken = tokens[leftIdx];
  const rightToken = tokens[rightIdx];
  const a = Number(leftToken.value);
  const b = Number(rightToken.value);
  if (Number.isNaN(a) || Number.isNaN(b)) {
    throw new Error('expr parse failed: cannot compute non-numeric values');
  }

  const op = tokens[targetOpIdx].value;
  let res: number;
  if (op === '+') {
    res = a + b;
  } else if (op === '−') {
    res = a - b;
  } else if (op === '×') {
    res = a * b;
  } else if (op === '÷') {
    if (b === 0) {
      throw new Error('expr result is not finite: division by zero');
    }
    res = a / b;
  } else {
    throw new Error(`expr parse failed: unknown operator ${op}`);
  }

  if (!Number.isFinite(res)) {
    throw new Error('expr result is not finite');
  }

  const resultToken: ExprToken = { type: 'num', value: formatNum(res) };

  // 5. 检查是否消除外层括号
  // 规则：“括号里只剩一个数时去掉括号”
  const isOnlyOpInParen =
    maxDepth > 0 &&
    outerL !== -1 &&
    outerR !== -1 &&
    outerL === leftIdx - 1 &&
    outerR === rightIdx + 1;

  let replaceStart: number;
  let replaceEnd: number;
  let underlineRange: [number, number];

  if (isOnlyOpInParen) {
    // 连带消除外层括号
    replaceStart = outerL;
    replaceEnd = outerR;
    underlineRange = [outerL, outerR];
  } else {
    replaceStart = leftIdx;
    replaceEnd = rightIdx;
    underlineRange = [leftIdx, rightIdx];
  }

  const nextTokens = [
    ...tokens.slice(0, replaceStart),
    resultToken,
    ...tokens.slice(replaceEnd + 1),
  ];

  const isDone = nextTokens.length === 1 && nextTokens[0].type === 'num';

  return {
    nextTokens,
    underlineTokenRange: underlineRange,
    isDone,
  };
}

/* ───────────── 自动生成多行（expr 模式） ───────────── */

export interface StepLineData {
  rawExpr: string;
  tokens: ExprToken[];
  underlineTokenRange?: [number, number];
}

export function generateExprLines(exprStr: string): StepLineData[] {
  const initialTokens = tokenizeExpr(exprStr);
  if (initialTokens.length === 0) {
    throw new Error('expr parse failed: empty expression');
  }

  const lines: StepLineData[] = [];
  let curTokens = initialTokens;
  const maxSteps = 50;
  let step = 0;

  while (step < maxSteps) {
    step++;
    const formatted = formatTokens(curTokens);
    if (curTokens.length === 1 && curTokens[0].type === 'num') {
      lines.push({
        rawExpr: formatted.text,
        tokens: curTokens,
      });
      break;
    }

    const { nextTokens, underlineTokenRange, isDone } = simplifyStep(curTokens);
    lines.push({
      rawExpr: formatted.text,
      tokens: curTokens,
      underlineTokenRange,
    });

    curTokens = nextTokens;
    if (isDone) {
      const lastFormatted = formatTokens(curTokens);
      lines.push({
        rawExpr: lastFormatted.text,
        tokens: curTokens,
      });
      break;
    }
  }

  return lines;
}

/* ───────────── 手写多行处理（lines 模式） ───────────── */

function cleanLineText(t: string): string {
  const trimmed = t.trim();
  if (trimmed.startsWith('=')) {
    return trimmed.slice(1).trim();
  }
  return trimmed;
}

/** 在 lines 模式下寻找两行差异推导下划线字符起止范围 */
function findDiffRange(curr: string, next: string): { start: number; end: number } | undefined {
  if (!curr || !next) return undefined;
  // 查找公共前缀
  let p = 0;
  while (p < curr.length && p < next.length && curr[p] === next[p]) {
    p++;
  }
  // 查找公共后缀
  let s = 0;
  while (
    s < curr.length - p &&
    s < next.length - p &&
    curr[curr.length - 1 - s] === next[next.length - 1 - s]
  ) {
    s++;
  }
  const start = p;
  const end = curr.length - s;
  if (start < end) {
    return { start, end };
  }
  return undefined;
}

/* ───────────── 第一行运算符子项计算 ───────────── */

export function calculateOpSubitems(
  _firstLineRaw: string,
  tokens: ExprToken[],
  x0: number,
  y0: number,
  size: number,
): ExprStepsOpSubitem[] {
  const formatted = formatTokens(tokens);
  const ranges = formatted.tokenRanges;
  const opSubs: ExprStepsOpSubitem[] = [];
  let opCount = 0;

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'op') {
      opCount++;
      // 确定左侧操作数范围
      let leftTokenIdx = i - 1;
      if (leftTokenIdx >= 0 && (tokens[leftTokenIdx].type === 'rparen' || tokens[leftTokenIdx].type === 'rbracket')) {
        // 向左寻找匹配的括号
        const targetType = tokens[leftTokenIdx].type === 'rparen' ? 'lparen' : 'lbracket';
        const closeType = tokens[leftTokenIdx].type;
        let d = 0;
        for (let k = leftTokenIdx; k >= 0; k--) {
          if (tokens[k].type === closeType) d++;
          else if (tokens[k].type === targetType) {
            d--;
            if (d === 0) {
              leftTokenIdx = k;
              break;
            }
          }
        }
      }

      // 确定右侧操作数范围
      let rightTokenIdx = i + 1;
      if (rightTokenIdx < tokens.length && (tokens[rightTokenIdx].type === 'lparen' || tokens[rightTokenIdx].type === 'lbracket')) {
        // 向右寻找匹配的括号
        const targetType = tokens[rightTokenIdx].type === 'lparen' ? 'rparen' : 'rbracket';
        const openType = tokens[rightTokenIdx].type;
        let d = 0;
        for (let k = rightTokenIdx; k < tokens.length; k++) {
          if (tokens[k].type === openType) d++;
          else if (tokens[k].type === targetType) {
            d--;
            if (d === 0) {
              rightTokenIdx = k;
              break;
            }
          }
        }
      }

      const leftCharStart = ranges[Math.max(0, leftTokenIdx)]?.start ?? ranges[i].start;
      const rightCharEnd = ranges[Math.min(tokens.length - 1, rightTokenIdx)]?.end ?? ranges[i].end;

      const xLeft = x0 + textWidth(formatted.text.slice(0, leftCharStart), size);
      const xRight = x0 + textWidth(formatted.text.slice(0, rightCharEnd), size);
      const w = Math.max(xRight - xLeft, size * 0.5);

      opSubs.push({
        index: opCount,
        op: tokens[i].value,
        box: {
          x: xLeft,
          y: y0 - size * 0.85,
          w,
          h: size * 1.1,
        },
      });
    }
  }

  return opSubs;
}

/* ───────────── 纯函数：递等式整体布局计算 ───────────── */

export function exprStepsLayout(p: Props): ExprStepsLayoutResult {
  const at = pt(p.at, [0, 0]);
  const [x0, y0] = at;
  const size = Math.max(1, num(p.size, 36));
  const show = typeof p.show === 'number' && Number.isFinite(p.show) ? p.show : 1;
  const underlineEnabled = p.underline !== false;
  const notesProp = Array.isArray(p.notes) ? p.notes.map(String) : [];

  const rawExpr = typeof p.expr === 'string' ? p.expr.trim() : undefined;
  const rawLines = Array.isArray(p.lines) ? p.lines.map(String) : undefined;

  let stepDatas: StepLineData[];
  let isExprMode = false;

  if (rawLines && rawLines.length > 0) {
    // lines 手写模式
    stepDatas = rawLines.map((l) => {
      const cleaned = cleanLineText(l);
      let tokens: ExprToken[];
      try {
        tokens = tokenizeExpr(cleaned);
      } catch {
        tokens = [{ type: 'text', value: cleaned }];
      }
      return {
        rawExpr: cleaned,
        tokens,
      };
    });
  } else if (rawExpr !== undefined && rawExpr !== '') {
    // expr 自动生成模式
    isExprMode = true;
    stepDatas = generateExprLines(rawExpr);
  } else {
    // 默认空式子
    stepDatas = [
      {
        rawExpr: '',
        tokens: [],
      },
    ];
  }

  const lineGap = size * 1.5;
  const eqStr = '= ';
  const eqWidth = textWidth(eqStr, size);

  const lines: ExprStepsLine[] = [];
  const totalLines = stepDatas.length;

  for (let i = 0; i < totalLines; i++) {
    const data = stepDatas[i];
    const isFirst = i === 0;
    const hasEquals = !isFirst;
    const yBaseline = y0 + i * lineGap;

    // 不透明度：根据 show 连续插值
    // show = 1: line 0 opacity = 1, line 1 opacity = 0
    // show = 1.5: line 0 opacity = 1, line 1 opacity = 0.5
    let opacity: number;
    if (show >= i + 1) {
      opacity = 1;
    } else if (show <= i) {
      opacity = 0;
    } else {
      opacity = Math.max(0, Math.min(1, show - i));
    }

    const exprStartX = isFirst ? x0 : x0 + eqWidth;
    const formatted = formatTokens(data.tokens);
    const lineExprText = formatted.text.length > 0 ? formatted.text : data.rawExpr;
    const fullText = isFirst ? lineExprText : `${eqStr}${lineExprText}`;

    // 下划线计算
    let underline: { x1: number; x2: number; y: number } | undefined;
    if (underlineEnabled && i < totalLines - 1) {
      if (isExprMode && data.underlineTokenRange) {
        const [tokStart, tokEnd] = data.underlineTokenRange;
        const charStart = formatted.tokenRanges[tokStart]?.start ?? 0;
        const charEnd = formatted.tokenRanges[tokEnd]?.end ?? lineExprText.length;
        const uX1 = exprStartX + textWidth(lineExprText.slice(0, charStart), size);
        const uX2 = exprStartX + textWidth(lineExprText.slice(0, charEnd), size);
        underline = {
          x1: uX1,
          x2: uX2,
          y: yBaseline + size * 0.18,
        };
      } else if (!isExprMode) {
        // lines 模式下对比当前行与下一行
        const nextData = stepDatas[i + 1];
        const diff = findDiffRange(data.rawExpr, nextData.rawExpr);
        if (diff) {
          const uX1 = exprStartX + textWidth(data.rawExpr.slice(0, diff.start), size);
          const uX2 = exprStartX + textWidth(data.rawExpr.slice(0, diff.end), size);
          underline = {
            x1: uX1,
            x2: uX2,
            y: yBaseline + size * 0.18,
          };
        }
      }
    }

    // 说明 notes 计算
    let note: { text: string; x: number; y: number } | undefined;
    const noteText = notesProp[i];
    const exprWidth = textWidth(lineExprText, size);
    const lineContentEndX = exprStartX + exprWidth;
    if (noteText && noteText.trim() !== '') {
      note = {
        text: noteText,
        x: lineContentEndX + size * 0.8,
        y: yBaseline,
      };
    }

    // 当前行包围盒
    let lineMaxX = lineContentEndX;
    if (underline && underline.x2 > lineMaxX) {
      lineMaxX = underline.x2;
    }
    if (note) {
      const noteW = textWidth(note.text, 22);
      if (note.x + noteW > lineMaxX) {
        lineMaxX = note.x + noteW;
      }
    }

    const lineBox: Box = {
      x: x0,
      y: yBaseline - size * 0.85,
      w: Math.max(1, lineMaxX - x0),
      h: size * 1.1 + (underline ? size * 0.25 : 0),
    };

    lines.push({
      index: i,
      text: fullText,
      rawExpr: lineExprText,
      hasEquals,
      baseline: [x0, yBaseline],
      opacity,
      box: lineBox,
      underline,
      note,
    });
  }

  // 计算第一行的 op.<n> 子项
  const firstData = stepDatas[0];
  const opBoxes = firstData
    ? calculateOpSubitems(firstData.rawExpr, firstData.tokens, x0, y0, size)
    : [];

  // 计算整体包围盒
  // 包住当前 show 显示的行（若 show <= 0，保底包住第一行）
  const visibleCount = Math.max(1, Math.min(totalLines, Math.ceil(show)));
  let minX = x0;
  let minY = y0 - size * 0.85;
  let maxX = x0 + size;
  let maxY = y0 + size * 0.3;

  for (let i = 0; i < visibleCount; i++) {
    const l = lines[i];
    if (l) {
      minX = Math.min(minX, l.box.x);
      minY = Math.min(minY, l.box.y);
      maxX = Math.max(maxX, l.box.x + l.box.w);
      maxY = Math.max(maxY, l.box.y + l.box.h);
    }
  }

  const overallBox: Box = {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };

  return {
    at,
    size,
    show,
    lines,
    box: overallBox,
    opBoxes,
  };
}

/* ───────────── PartDef 零件定义 ───────────── */

export const exprStepsPart: PartDef = {
  type: 'expr-steps',
  name: '递等式',
  anchor: 'start',
  props: ['expr', 'lines', 'show', 'underline', 'notes', 'size'],
  bbox(p: Props): Box {
    return exprStepsLayout(p).box;
  },
  subitems(p: Props): Subitem[] {
    const layout = exprStepsLayout(p);
    const subs: Subitem[] = [];

    // 行子项 line.<n>
    for (const l of layout.lines) {
      subs.push({
        name: `line.${l.index + 1}`,
        box: l.box,
      });
    }

    // 运算符子项 op.<n>
    for (const op of layout.opBoxes) {
      subs.push({
        name: `op.${op.index}`,
        box: op.box,
      });
    }

    return subs;
  },
  Render({ p, ctx }: { p: Props; ctx: PartContext }) {
    const layout = exprStepsLayout(p);
    const { lines, size } = layout;
    const textColor = color('ink', ctx.theme);
    const dimColor = color('dim', ctx.theme);
    const accentColor = color('accent', ctx.theme);
    const eqStr = '= ';
    const eqWidth = textWidth(eqStr, size);

    return (
      <g className="flowsee-expr-steps" data-part="expr-steps">
        {lines.map((line) => {
          if (line.opacity <= 0) return null;
          const [bx, by] = line.baseline;
          return (
            <g key={line.index} opacity={line.opacity}>
              {/* 行首等号 */}
              {line.hasEquals && (
                <text
                  x={bx}
                  y={by}
                  fontSize={size}
                  fontFamily="sans-serif"
                  fill={textColor}
                  textAnchor="start"
                >
                  {eqStr}
                </text>
              )}

              {/* 表达式文字 */}
              <text
                x={line.hasEquals ? bx + eqWidth : bx}
                y={by}
                fontSize={size}
                fontFamily="sans-serif"
                fill={textColor}
                textAnchor="start"
              >
                {line.rawExpr}
              </text>

              {/* 下划线：先算的部分 */}
              {line.underline && (
                <line
                  x1={line.underline.x1}
                  y1={line.underline.y}
                  x2={line.underline.x2}
                  y2={line.underline.y}
                  stroke={accentColor}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              )}

              {/* 行右侧说明注释 */}
              {line.note && (
                <text
                  x={line.note.x}
                  y={line.note.y}
                  fontSize={22}
                  fontFamily="sans-serif"
                  fill={dimColor}
                  textAnchor="start"
                >
                  {line.note.text}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  },
};
