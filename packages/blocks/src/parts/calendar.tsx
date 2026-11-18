// 日历与时间周期零件：年月日、大月小月、平年闰年、经过天数、星期排布。
import type { ReactNode } from 'react';
import { sceneStyle } from '../style';
import {
  color,
  num,
  pt,
  type Box,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';

export interface CalendarLabels {
  weekdays?: string[];
  month?: string;
  days?: string;
  title?: string;
}

export const FALLBACK_CALENDAR_LABELS: Required<CalendarLabels> = {
  weekdays: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  month: '{m}',
  days: '{d}d',
  title: '{y}/{m}',
};

/** 是否为闰年（4 年一闰，百年不闰，四百年又闰） */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** 某年某月的天数（month: 1-12） */
export function daysInMonth(year: number, month: number): number {
  const m = Math.round(month);
  if (m < 1 || m > 12) return 30;
  if (m === 2) return isLeapYear(year) ? 29 : 28;
  if (m === 4 || m === 6 || m === 9 || m === 11) return 30;
  return 31;
}

/**
 * 某年某月某日的星期几（纯数学算法，无时区偏差）
 * 返回值：0 (星期日), 1 (星期一), ..., 6 (星期六)
 */
export function getDayOfWeek(year: number, month: number, day: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = year;
  const m = Math.round(month);
  if (m < 3) {
    y -= 1;
  }
  const dow = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + day) % 7;
  return (dow + 7) % 7;
}

export interface CalendarDayItem {
  day: number;
  row: number; // 0-based
  col: number; // 0-based
  x: number;
  y: number;
  box: Box;
  dayOfWeek: number; // 0-6
  isWeekend: boolean;
  isMarked: boolean;
}

export interface CalendarWeekdayHeader {
  text: string;
  col: number;
  dayOfWeek: number; // 0-6
  isWeekend: boolean;
  box: Box;
}

export interface CalendarMonthBarItem {
  month: number; // 1-12
  days: number;
  label: string; // 如 "1 月"
  daysLabel: string; // 如 "31 天"
  fullWidth: number; // days * 8
  currentWidth: number; // fullWidth * progress
  progress: number; // 0..1
  visible: boolean;
  colorName: 'blue' | 'orange' | 'green';
  box: Box; // 整行包围盒（子项 month.<n> 用）
  barBox: Box; // 横条包围盒
}

export interface CalendarLayout {
  mode: 'month' | 'all';
  at: Point;
  year: number;
  month: number | 'all';
  weekStart: 0 | 1;
  cell: number;
  show: number;
  marks: [number, number][];
  markColor: string;
  labels: Required<CalendarLabels>;
  box: Box;
  // 月历模式专属
  title?: string;
  titleBox?: Box;
  weekdayHeaders?: CalendarWeekdayHeader[];
  days?: CalendarDayItem[];
  // 全年条模式专属
  monthBars?: CalendarMonthBarItem[];
}

function parseMarks(raw: unknown): [number, number][] {
  if (!Array.isArray(raw)) return [];
  const result: [number, number][] = [];
  for (const item of raw) {
    if (Array.isArray(item) && item.length >= 2) {
      const m = Math.round(num(item[0], 0));
      const d = Math.round(num(item[1], 0));
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        result.push([m, d]);
      }
    }
  }
  return result;
}

function labelsOf(p: Props): Required<CalendarLabels> {
  let defaults: CalendarLabels = {};
  try {
    defaults = (sceneStyle().parts.calendar?.labels as CalendarLabels | undefined) ?? {};
  } catch {
    // sceneStyle 未配置时的保底
  }
  const custom = (p.labels && typeof p.labels === 'object' ? p.labels : {}) as Partial<CalendarLabels>;
  const weekdays =
    Array.isArray(custom.weekdays) && custom.weekdays.length === 7
      ? custom.weekdays.map(String)
      : Array.isArray(defaults.weekdays) && defaults.weekdays.length === 7
        ? defaults.weekdays.map(String)
        : FALLBACK_CALENDAR_LABELS.weekdays;
  const month = typeof custom.month === 'string' ? custom.month : defaults.month ?? FALLBACK_CALENDAR_LABELS.month;
  const days = typeof custom.days === 'string' ? custom.days : defaults.days ?? FALLBACK_CALENDAR_LABELS.days;
  const title = typeof custom.title === 'string' ? custom.title : defaults.title ?? FALLBACK_CALENDAR_LABELS.title;
  return { weekdays, month, days, title };
}

/** 日历零件的纯函数布局计算 */
export function calendarLayout(p: Props): CalendarLayout {
  const at = pt(p.at, [0, 0]);
  const year = Math.round(num(p.year, 2026));
  const weekStart: 0 | 1 = p.weekStart === 1 ? 1 : 0;
  const cell = Math.max(20, num(p.cell, 48));
  const show = num(p.show, 12);
  const markColor = typeof p.markColor === 'string' && p.markColor ? p.markColor : 'red';
  const marks = parseMarks(p.marks);
  const labels = labelsOf(p);

  const isAll = p.month === 'all';

  if (isAll) {
    // ──────── 全年条模式（12 行天数条） ────────
    const rowHeight = 32;
    const labelWidth = 56;
    const gap = 12;
    const barStartX = at[0] + labelWidth + gap;
    const maxBarWidth = 31 * 8; // 248
    const textMargin = 10;
    const textWidthEstimate = 50; // "31 天" 约 50px
    const totalW = labelWidth + gap + maxBarWidth + textMargin + textWidthEstimate;
    const totalH = 12 * rowHeight;
    const totalBox: Box = { x: at[0], y: at[1], w: totalW, h: totalH };

    const monthBars: CalendarMonthBarItem[] = [];

    for (let m = 1; m <= 12; m++) {
      const idx = m - 1; // 0-based
      const days = daysInMonth(year, m);
      const fullWidth = days * 8;

      let progress = 0;
      let visible = false;
      if (show >= idx + 1) {
        progress = 1;
        visible = true;
      } else if (show > idx) {
        progress = show - idx;
        visible = true;
      }

      const currentWidth = fullWidth * Math.max(0, Math.min(1, progress));

      const colorName: 'blue' | 'orange' | 'green' =
        m === 2 ? 'green' : days === 30 ? 'orange' : 'blue';

      const label = labels.month.replace('{m}', String(m));
      const daysLabel = labels.days.replace('{d}', String(days));

      const rowY = at[1] + idx * rowHeight;
      const barH = 18;
      const barY = rowY + (rowHeight - barH) / 2;

      monthBars.push({
        month: m,
        days,
        label,
        daysLabel,
        fullWidth,
        currentWidth,
        progress,
        visible,
        colorName,
        box: { x: at[0], y: rowY, w: totalW, h: rowHeight },
        barBox: { x: barStartX, y: barY, w: currentWidth, h: barH },
      });
    }

    return {
      mode: 'all',
      at,
      year,
      month: 'all',
      weekStart,
      cell,
      show,
      marks,
      markColor,
      labels,
      box: totalBox,
      monthBars,
    };
  }

  // ──────── 单月日历模式（7 列格子） ────────
  const monthNum = Math.max(1, Math.min(12, Math.round(num(p.month, 1))));
  const totalDays = daysInMonth(year, monthNum);
  const firstDow = getDayOfWeek(year, monthNum, 1);
  const startCol = (firstDow - weekStart + 7) % 7;
  const rowCount = Math.ceil((startCol + totalDays) / 7);

  const titleHeight = Math.round(cell * 0.85);
  const headerHeight = Math.round(cell * 0.65);
  const totalW = 7 * cell;
  const totalH = titleHeight + headerHeight + rowCount * cell;
  const totalBox: Box = { x: at[0], y: at[1], w: totalW, h: totalH };

  // 标题
  const title = labels.title.replace('{y}', String(year)).replace('{m}', String(monthNum));
  const titleBox: Box = { x: at[0], y: at[1], w: totalW, h: titleHeight };

  // 星期表头
  const weekdayHeaders: CalendarWeekdayHeader[] = [];
  for (let c = 0; c < 7; c++) {
    const rawDow = (c + weekStart) % 7;
    const isWeekend = rawDow === 0 || rawDow === 6;
    weekdayHeaders.push({
      text: labels.weekdays[rawDow] ?? '',
      col: c,
      dayOfWeek: rawDow,
      isWeekend,
      box: {
        x: at[0] + c * cell,
        y: at[1] + titleHeight,
        w: cell,
        h: headerHeight,
      },
    });
  }

  // 圈出的日期（只筛选当月）
  const markedDays = new Set<number>();
  for (const [m, d] of marks) {
    if (m === monthNum && d >= 1 && d <= totalDays) {
      markedDays.add(d);
    }
  }

  // 日期格子
  const days: CalendarDayItem[] = [];
  const gridStartY = at[1] + titleHeight + headerHeight;

  for (let d = 1; d <= totalDays; d++) {
    const col = (startCol + d - 1) % 7;
    const row = Math.floor((startCol + d - 1) / 7);
    const cellX = at[0] + col * cell;
    const cellY = gridStartY + row * cell;
    const dow = (firstDow + d - 1) % 7;
    const isWeekend = dow === 0 || dow === 6;
    const isMarked = markedDays.has(d);

    days.push({
      day: d,
      col,
      row,
      x: cellX,
      y: cellY,
      box: { x: cellX, y: cellY, w: cell, h: cell },
      dayOfWeek: dow,
      isWeekend,
      isMarked,
    });
  }

  return {
    mode: 'month',
    at,
    year,
    month: monthNum,
    weekStart,
    cell,
    show,
    marks,
    markColor,
    labels,
    box: totalBox,
    title,
    titleBox,
    weekdayHeaders,
    days,
  };
}

export const calendarPart: PartDef = {
  type: 'calendar',
  name: '日历与时间周期',
  anchor: 'start',
  props: ['year', 'month', 'marks', 'markColor', 'weekStart', 'show', 'cell', 'labels'],
  bbox(p: Props): Box {
    return calendarLayout(p).box;
  },
  subitems(p: Props): Subitem[] {
    const layout = calendarLayout(p);
    const items: Subitem[] = [];

    if (layout.mode === 'all') {
      // 全年条：month.<n>
      if (layout.monthBars) {
        for (const bar of layout.monthBars) {
          items.push({
            name: `month.${bar.month}`,
            value: bar.month,
            box: bar.box,
          });
        }
      }
    } else {
      // 月历：day.<日>
      if (layout.days) {
        for (const item of layout.days) {
          items.push({
            name: `day.${item.day}`,
            value: item.day,
            box: item.box,
          });
        }
      }
    }

    return items;
  },
  Render({ p, ctx }): ReactNode {
    const layout = calendarLayout(p);

    if (layout.mode === 'all') {
      const bars = layout.monthBars ?? [];
      const labelW = 56;
      const barStartX = layout.at[0] + labelW + 12;

      return (
        <g data-part="calendar" data-mode="all">
          {bars.map((bar) => {
            if (!bar.visible) return null;

            const rowCenterY = bar.box.y + bar.box.h / 2;
            const barFill = color(bar.colorName, ctx.theme, 'blue');
            const dimFill = color('dim', ctx.theme);
            const inkFill = color('ink', ctx.theme);
            const trackFill = color('line', ctx.theme);

            return (
              <g key={`m-${bar.month}`} opacity={Math.min(1, bar.progress * 1.5)}>
                {/* 左侧月份标签（右对齐） */}
                <text
                  x={layout.at[0] + labelW}
                  y={rowCenterY}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={20}
                  fill={inkFill}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {bar.label}
                </text>

                {/* 底槽轨道（浅色） */}
                <rect
                  x={barStartX}
                  y={bar.barBox.y}
                  width={bar.fullWidth}
                  height={bar.barBox.h}
                  rx={9}
                  ry={9}
                  fill={trackFill}
                  fillOpacity={0.25}
                />

                {/* 前景横条（按当前展开进度） */}
                {bar.currentWidth > 0 && (
                  <rect
                    x={barStartX}
                    y={bar.barBox.y}
                    width={bar.currentWidth}
                    height={bar.barBox.h}
                    rx={9}
                    ry={9}
                    fill={barFill}
                  />
                )}

                {/* 条右端文字（如 "31 天"） */}
                <text
                  x={barStartX + bar.fullWidth + 10}
                  y={rowCenterY}
                  textAnchor="start"
                  dominantBaseline="central"
                  fontSize={18}
                  fill={dimFill}
                  opacity={bar.progress}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {bar.daysLabel}
                </text>
              </g>
            );
          })}
        </g>
      );
    }

    // ──────── 单月日历模式 ────────
    const days = layout.days ?? [];
    const headers = layout.weekdayHeaders ?? [];
    const inkFill = color('ink', ctx.theme);
    const dimFill = color('dim', ctx.theme);
    const redColor = color('red', ctx.theme);
    const lineStroke = color('line', ctx.theme);
    const markStroke = color(layout.markColor, ctx.theme, 'red');

    const titleH = layout.titleBox?.h ?? Math.round(layout.cell * 0.85);
    const headerH = headers[0]?.box.h ?? Math.round(layout.cell * 0.65);
    const titleCenterY = layout.at[1] + titleH / 2;
    const titleCenterX = layout.at[0] + layout.box.w / 2;
    const headerCenterY = layout.at[1] + titleH + headerH / 2;
    const gridDividerY = layout.at[1] + titleH + headerH;

    return (
      <g data-part="calendar" data-mode="month">
        {/* 年月标题（字号 26） */}
        <text
          x={titleCenterX}
          y={titleCenterY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={26}
          fontWeight="bold"
          fill={inkFill}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {layout.title}
        </text>

        {/* 星期表头（字号 20，周末用 red，平日用 dim） */}
        {headers.map((h) => {
          const cx = h.box.x + h.box.w / 2;
          const fill = h.isWeekend ? redColor : dimFill;
          return (
            <text
              key={`h-${h.col}`}
              x={cx}
              y={headerCenterY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={20}
              fontWeight="500"
              fill={fill}
            >
              {h.text}
            </text>
          );
        })}

        {/* 表头与日期之间的分割线 */}
        <line
          x1={layout.at[0]}
          y1={gridDividerY}
          x2={layout.at[0] + layout.box.w}
          y2={gridDividerY}
          stroke={lineStroke}
          strokeWidth={1}
          opacity={0.4}
        />

        {/* 日期格子（7 列，日期字号 22，marks 画圆圈） */}
        {days.map((item) => {
          const cx = item.x + item.box.w / 2;
          const cy = item.y + item.box.h / 2;
          const markRadius = layout.cell * 0.42;

          return (
            <g key={`d-${item.day}`}>
              {/* 轻微的单元格边框 */}
              <rect
                x={item.x}
                y={item.y}
                width={item.box.w}
                height={item.box.h}
                fill="none"
                stroke={lineStroke}
                strokeWidth={1}
                strokeOpacity={0.2}
              />

              {/* 日期数字（字号 22） */}
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={22}
                fill={inkFill}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {item.day}
              </text>

              {/* marks 圈出标记（半径 cell × 0.42，线宽 3，markColor） */}
              {item.isMarked && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={markRadius}
                  fill="none"
                  stroke={markStroke}
                  strokeWidth={3}
                />
              )}
            </g>
          );
        })}
      </g>
    );
  },
};
