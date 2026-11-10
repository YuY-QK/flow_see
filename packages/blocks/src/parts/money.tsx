// 人民币（示意）：面值示意图，用于认识货币、换钱、购物、小数初步。
import {
  color,
  mixColor,
  num,
  numList,
  pt,
  str,
  textWidth,
  type Box,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';
import { sceneStyle } from '../style';

export const MONEY_LAYOUTS = ['row', 'grid', 'pile'] as const;
export type MoneyLayoutKind = (typeof MONEY_LAYOUTS)[number];

export interface MoneyLabels {
  yuan?: string;
  jiao?: string;
  fen?: string;
  sample?: string;
}

export interface MoneyDenomination {
  value: number; // 面值（单位元）
  isNote: boolean; // 是否为纸币
  width: number; // size = 1 基础宽
  height: number; // size = 1 基础高
  digits: string; // 票面数字
  unitKey: 'yuan' | 'jiao' | 'fen';
  colorKey: string;
}

export interface MoneySlot {
  index: number; // 1-based 序号
  rawItem: unknown;
  denom: MoneyDenomination;
  value: number; // 面值（元）
  at: Point;
  box: Box;
  visible: boolean;
  opacity: number;
  hidden: boolean;
}

export interface MoneyLayout {
  at: Point;
  layout: MoneyLayoutKind;
  cols: number;
  size: number;
  gap: number;
  show: number;
  slots: MoneySlot[];
  box: Box;
}

/** 默认面值对应的颜色名 */
export const DEFAULT_MONEY_COLORS: Record<string, string> = {
  '0.01': 'gray',
  '0.02': 'gray',
  '0.05': 'gray',
  '0.1': 'gray',
  '0.5': 'yellow',
  '1': 'gray',
  '1n': 'gray',
  '5': 'purple',
  '10': 'blue',
  '20': 'brown',
  '50': 'green',
  '100': 'red',
};

/**
 * 解析单项面值定义
 * 硬币：0.01、0.02、0.05、0.1、0.5、1
 * 纸币：'1n'、5、10、20、50、100（5 及以上默认纸币，1 必须写 '1n' 才是纸币）
 */
export function parseDenomination(raw: unknown): MoneyDenomination {
  let isNote = false;
  let val = 0;

  if (typeof raw === 'string') {
    const s = raw.trim();
    if (/n$/i.test(s)) {
      isNote = true;
      val = parseFloat(s.slice(0, -1));
    } else {
      val = parseFloat(s);
      if (val >= 5) {
        isNote = true;
      }
    }
  } else if (typeof raw === 'number') {
    val = raw;
    if (val >= 5) {
      isNote = true;
    }
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    val = num(obj.value, 1);
    isNote = Boolean(obj.isNote ?? obj.note ?? (val >= 5));
  }

  // 消除浮点误差
  val = Math.round(val * 100) / 100;

  if (isNote) {
    let width = 120;
    let height = 60;
    let colorKey = '1n';
    const digits = String(val);

    if (val >= 100) {
      width = 160;
      height = 80;
      colorKey = '100';
    } else if (val >= 50) {
      width = 152;
      height = 76;
      colorKey = '50';
    } else if (val >= 20) {
      width = 144;
      height = 72;
      colorKey = '20';
    } else if (val >= 10) {
      width = 136;
      height = 68;
      colorKey = '10';
    } else if (val >= 5) {
      width = 128;
      height = 64;
      colorKey = '5';
    } else {
      width = 120;
      height = 60;
      colorKey = '1n';
    }

    return {
      value: val,
      isNote: true,
      width,
      height,
      digits,
      unitKey: 'yuan',
      colorKey,
    };
  }

  // 硬币：直径 1分 30、2分 34、5分 38、1角 40、5角 44、1元 50
  let d = 40;
  let digits = '1';
  let unitKey: 'yuan' | 'jiao' | 'fen' = 'yuan';
  let colorKey = '1';

  if (Math.abs(val - 0.01) < 0.005) {
    d = 30;
    digits = '1';
    unitKey = 'fen';
    colorKey = '0.01';
  } else if (Math.abs(val - 0.02) < 0.005) {
    d = 34;
    digits = '2';
    unitKey = 'fen';
    colorKey = '0.02';
  } else if (Math.abs(val - 0.05) < 0.005) {
    d = 38;
    digits = '5';
    unitKey = 'fen';
    colorKey = '0.05';
  } else if (Math.abs(val - 0.1) < 0.05) {
    d = 40;
    digits = '1';
    unitKey = 'jiao';
    colorKey = '0.1';
  } else if (Math.abs(val - 0.5) < 0.05) {
    d = 44;
    digits = '5';
    unitKey = 'jiao';
    colorKey = '0.5';
  } else if (Math.abs(val - 1) < 0.05) {
    d = 50;
    digits = '1';
    unitKey = 'yuan';
    colorKey = '1';
  } else if (val < 0.1) {
    d = 34;
    digits = String(Math.round(val * 100));
    unitKey = 'fen';
    colorKey = '0.01';
  } else if (val < 1) {
    d = 40;
    digits = String(Math.round(val * 10));
    unitKey = 'jiao';
    colorKey = '0.1';
  } else {
    d = 50;
    digits = String(val);
    unitKey = 'yuan';
    colorKey = '1';
  }

  return {
    value: val,
    isNote: false,
    width: d,
    height: d,
    digits,
    unitKey,
    colorKey,
  };
}

function layoutOf(p: Props): MoneyLayoutKind {
  const l = str(p.layout, 'row');
  return (MONEY_LAYOUTS as readonly string[]).includes(l)
    ? (l as MoneyLayoutKind)
    : 'row';
}

function labelsOf(p: Props): MoneyLabels {
  let defaults: MoneyLabels = {};
  try {
    defaults = (sceneStyle().parts.money?.labels as MoneyLabels | undefined) ?? {};
  } catch {
    // sceneStyle 未注入时的保底
  }
  const custom = (p.labels && typeof p.labels === 'object' ? p.labels : {}) as MoneyLabels;
  return {
    yuan: str(custom.yuan ?? defaults.yuan, ''),
    jiao: str(custom.jiao ?? defaults.jiao, ''),
    fen: str(custom.fen ?? defaults.fen, ''),
    sample: str(custom.sample ?? defaults.sample, ''),
  };
}

function colorsOf(p: Props): Record<string, string> {
  let defaults: Record<string, string> = {};
  try {
    defaults = (sceneStyle().parts.money?.colors as Record<string, string> | undefined) ?? {};
  } catch {
    // sceneStyle 未注入时的保底
  }
  const custom = (p.colors && typeof p.colors === 'object' && !Array.isArray(p.colors)
    ? (p.colors as Record<string, string>)
    : {});
  return { ...DEFAULT_MONEY_COLORS, ...defaults, ...custom };
}

/** 计算颜色亮度，判断是否为深色（深色选白色字，浅色选墨色字） */
export function isDarkBackground(hexStr: string): boolean {
  const m = hexStr.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return false;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 140;
}

/** 人民币零件的纯函数布局计算 */
export function moneyLayout(p: Props): MoneyLayout {
  const at = pt(p.at, [0, 0]);
  const lk = layoutOf(p);
  const rawItems = Array.isArray(p.items) ? p.items : [];
  const count = rawItems.length;
  const size = Math.max(0.01, num(p.size, 1));
  const gap = Math.max(0, num(p.gap, 12));

  let cols = 1;
  if (lk === 'row') {
    cols = Math.max(1, count);
  } else if (lk === 'grid') {
    cols = Math.max(1, Math.round(num(p.cols, 5)));
  } else if (lk === 'pile') {
    cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  }

  const denoms = rawItems.map(parseDenomination);
  const rows = Math.max(1, Math.ceil(count / cols));

  // 计算每列的最大宽度、每行的最大高度（按缩放后的尺寸）
  const colW = Array.from({ length: cols }, () => 0);
  const rowH = Array.from({ length: rows }, () => 0);

  denoms.forEach((denom, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const itemW = denom.width * size;
    const itemH = denom.height * size;
    if (itemW > colW[c]) colW[c] = itemW;
    if (itemH > rowH[r]) rowH[r] = itemH;
  });

  // 计算每列起始 X、每行起始 Y
  const colX = Array.from({ length: cols }, () => 0);
  let curX = at[0];
  for (let c = 0; c < cols; c++) {
    colX[c] = curX;
    curX += colW[c] + gap;
  }

  const rowY = Array.from({ length: rows }, () => 0);
  let curY = at[1];
  for (let r = 0; r < rows; r++) {
    rowY[r] = curY;
    curY += rowH[r] + gap;
  }

  const show = typeof p.show === 'number' && Number.isFinite(p.show) ? p.show : count;
  const hiddenList = numList(p.hiddenItems);
  const hiddenSet = new Set<number>(hiddenList);

  const maxVisibleIndex = Math.ceil(show);
  const fullVisibleIndex = Math.floor(show);

  const slots: MoneySlot[] = denoms.map((denom, i) => {
    const n = i + 1; // 1-based index
    const c = i % cols;
    const r = Math.floor(i / cols);
    const itemW = denom.width * size;
    const itemH = denom.height * size;

    let x = colX[c] + (colW[c] - itemW) / 2;
    let y = rowY[r] + (rowH[r] - itemH) / 2;

    if (lk === 'pile') {
      const maxCell = Math.max(colW[c], rowH[r]);
      const dx = Math.sin(n * 2.4) * maxCell * 0.35;
      const dy = Math.cos(n * 1.7) * maxCell * 0.25;
      x += dx;
      y += dy;
    }

    const box: Box = { x, y, w: itemW, h: itemH };

    const isHidden = hiddenSet.has(n);
    let opacity = 0;
    let visible = false;

    if (!isHidden && show > 0) {
      if (n <= fullVisibleIndex) {
        visible = true;
        opacity = 1;
      } else if (n === maxVisibleIndex) {
        visible = true;
        opacity = Math.max(0, Math.min(1, show - fullVisibleIndex));
      }
    }

    return {
      index: n,
      rawItem: rawItems[i],
      denom,
      value: denom.value,
      at: [x, y],
      box,
      visible,
      opacity,
      hidden: isHidden,
    };
  });

  // 包围盒：包住当前画出的全部内容
  const drawnSlots = slots.filter((s) => s.visible && s.opacity > 0);
  const targetBoxes = (drawnSlots.length > 0 ? drawnSlots : slots).map((s) => s.box);

  let bbox: Box;
  if (!targetBoxes.length) {
    bbox = { x: at[0], y: at[1], w: 0, h: 0 };
  } else {
    const minX = Math.min(...targetBoxes.map((b) => b.x));
    const minY = Math.min(...targetBoxes.map((b) => b.y));
    const maxX = Math.max(...targetBoxes.map((b) => b.x + b.w));
    const maxY = Math.max(...targetBoxes.map((b) => b.y + b.h));
    bbox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  return {
    at,
    layout: lk,
    cols,
    size,
    gap,
    show,
    slots,
    box: bbox,
  };
}

export const moneyPart: PartDef = {
  type: 'money',
  name: '人民币',
  anchor: 'start',
  required: ['items'],
  props: ['items', 'layout', 'cols', 'size', 'gap', 'show', 'hiddenItems', 'labels', 'colors'],
  bbox(p) {
    return moneyLayout(p).box;
  },
  subitems(p) {
    const layout = moneyLayout(p);
    return layout.slots.map((slot) => {
      const isBeyondShow = slot.index > Math.ceil(layout.show);
      const sub: Subitem = {
        name: String(slot.index),
        box: slot.box,
        value: slot.value,
        disabled: slot.hidden || isBeyondShow,
      };
      return sub;
    });
  },
  Render({ p, ctx }) {
    const layout = moneyLayout(p);
    const labels = labelsOf(p);
    const colorMap = colorsOf(p);
    const { darken } = sceneStyle().counterBorder;
    const darkest = color('black', ctx.theme);
    const whiteColor = color('white', ctx.theme);

    return (
      <g>
        {layout.slots.map((slot) => {
          if (!slot.visible || slot.opacity <= 0.001) return null;
          const { box, opacity, index, denom } = slot;
          const size = layout.size;

          const colorName = colorMap[denom.colorKey] ?? DEFAULT_MONEY_COLORS[denom.colorKey] ?? 'gray';
          const fillColor = color(colorName, ctx.theme, 'gray');
          const strokeColor = mixColor(fillColor, darkest, darken);
          const textColor = isDarkBackground(fillColor) ? whiteColor : ctx.theme.ink;
          const unitText = labels[denom.unitKey] ?? '';
          const sampleText = labels.sample ?? '';

          if (denom.isNote) {
            // 纸币：圆角长方形（圆角 6），面值色填充 0.85，内缩 6 画细边框
            const rx = 6 * size;
            const innerInset = 6 * size;
            const innerW = Math.max(1, box.w - innerInset * 2);
            const innerH = Math.max(1, box.h - innerInset * 2);
            const innerRx = Math.max(1, 4 * size);

            const numSize = box.h * 0.45;
            const unitSize = box.h * 0.22;
            const leftX = box.x + 14 * size;
            const baseY = box.y + box.h * 0.62;
            const numW = textWidth(denom.digits, numSize);
            const unitX = leftX + numW + 4 * size;

            // 右侧两条平行细线装饰
            const line1X = box.x + box.w - 36 * size;
            const line2X = box.x + box.w - 28 * size;
            const lineY1 = box.y + 12 * size;
            const lineY2 = box.y + box.h * 0.62;

            return (
              <g key={index} opacity={opacity}>
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.w}
                  height={box.h}
                  rx={rx}
                  fill={fillColor}
                  fillOpacity={0.85}
                />
                <rect
                  x={box.x + innerInset}
                  y={box.y + innerInset}
                  width={innerW}
                  height={innerH}
                  rx={innerRx}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={Math.max(1, 1.5 * size)}
                />
                <text
                  x={leftX}
                  y={baseY}
                  textAnchor="start"
                  dominantBaseline="auto"
                  fill={textColor}
                  fontSize={numSize}
                  fontWeight="bold"
                >
                  {denom.digits}
                </text>
                {unitText ? (
                  <text
                    x={unitX}
                    y={baseY}
                    textAnchor="start"
                    dominantBaseline="auto"
                    fill={textColor}
                    fontSize={unitSize}
                  >
                    {unitText}
                  </text>
                ) : null}
                <line
                  x1={line1X}
                  y1={lineY1}
                  x2={line1X}
                  y2={lineY2}
                  stroke={strokeColor}
                  strokeWidth={Math.max(1, 1.5 * size)}
                  opacity={0.45}
                />
                <line
                  x1={line2X}
                  y1={lineY1}
                  x2={line2X}
                  y2={lineY2}
                  stroke={strokeColor}
                  strokeWidth={Math.max(1, 1.5 * size)}
                  opacity={0.45}
                />
                {sampleText ? (
                  <text
                    x={box.x + box.w - 12 * size}
                    y={box.y + box.h - 10 * size}
                    textAnchor="end"
                    dominantBaseline="auto"
                    fill={ctx.theme.dim}
                    fontSize={12 * size}
                  >
                    {sampleText}
                  </text>
                ) : null}
              </g>
            );
          }

          // 硬币：圆形，面值色填充，外圈加深细圈（线宽 2，内缩 4）
          const cx = box.x + box.w / 2;
          const cy = box.y + box.h / 2;
          const r = box.w / 2;
          const innerR = Math.max(1, r - 4 * size);
          const digitSize = box.w * 0.42;
          const unitSize = box.w * 0.22;
          const sampleSize = Math.max(8, 12 * size);

          return (
            <g key={index} opacity={opacity}>
              <circle cx={cx} cy={cy} r={r} fill={fillColor} />
              <circle
                cx={cx}
                cy={cy}
                r={innerR}
                fill="none"
                stroke={strokeColor}
                strokeWidth={Math.max(1, 2 * size)}
              />
              <text
                x={cx}
                y={cy - r * 0.16}
                textAnchor="middle"
                dominantBaseline="central"
                fill={textColor}
                fontSize={digitSize}
                fontWeight="bold"
              >
                {denom.digits}
              </text>
              {unitText ? (
                <text
                  x={cx}
                  y={cy + r * 0.3}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={textColor}
                  fontSize={unitSize}
                >
                  {unitText}
                </text>
              ) : null}
              {sampleText ? (
                <text
                  x={cx}
                  y={cy + r * 0.72}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={ctx.theme.dim}
                  fontSize={sampleSize}
                >
                  {sampleText}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>
    );
  },
};
