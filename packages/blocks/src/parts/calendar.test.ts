import { describe, expect, it } from 'vitest';
import {
  calendarLayout,
  calendarPart,
  daysInMonth,
  getDayOfWeek,
  isLeapYear,
} from './calendar';
import { findSubitem } from '../index';

describe('calendar 零件单元测试', () => {
  describe('1. 公历与闰年计算', () => {
    it('平年与闰年判断', () => {
      // 2024 是 4 的倍数且不是 100 的倍数 -> 闰年
      expect(isLeapYear(2024)).toBe(true);
      // 2023 不是 4 的倍数 -> 平年
      expect(isLeapYear(2023)).toBe(false);
      // 2100 是 100 的倍数但不是 400 的倍数 -> 平年
      expect(isLeapYear(2100)).toBe(false);
      // 2000 是 400 的倍数 -> 闰年
      expect(isLeapYear(2000)).toBe(true);
      // 1900 是平年
      expect(isLeapYear(1900)).toBe(false);
    });

    it('2 月天数：2024 年 29 天、2023 年 28 天、2100 年 28 天', () => {
      expect(daysInMonth(2024, 2)).toBe(29);
      expect(daysInMonth(2023, 2)).toBe(28);
      expect(daysInMonth(2100, 2)).toBe(28);
      expect(daysInMonth(2000, 2)).toBe(29);
    });

    it('大月与小月天数', () => {
      // 大月：1, 3, 5, 7, 8, 10, 12 月为 31 天
      const bigMonths = [1, 3, 5, 7, 8, 10, 12];
      for (const m of bigMonths) {
        expect(daysInMonth(2026, m)).toBe(31);
      }
      // 小月：4, 6, 9, 11 月为 30 天
      const smallMonths = [4, 6, 9, 11];
      for (const m of smallMonths) {
        expect(daysInMonth(2026, m)).toBe(30);
      }
    });

    it('星期几算法（getDayOfWeek）精确计算', () => {
      // 2026-11-01 是星期日 (0)
      expect(getDayOfWeek(2026, 11, 1)).toBe(0);
      // 2026-11-02 是星期一 (1)
      expect(getDayOfWeek(2026, 11, 2)).toBe(1);
      // 2026-11-07 是星期六 (6)
      expect(getDayOfWeek(2026, 11, 7)).toBe(6);
      // 2024-02-29 是星期四 (4)
      expect(getDayOfWeek(2024, 2, 29)).toBe(4);
    });
  });

  describe('2. 星期排布与表头', () => {
    it('2026 年 11 月 1 日在 weekStart: 0 时在第 1 列（索引 0）', () => {
      const layout = calendarLayout({
        year: 2026,
        month: 11,
        weekStart: 0,
      });

      expect(layout.mode).toBe('month');
      expect(layout.days).toBeDefined();
      const nov1 = layout.days!.find((d) => d.day === 1);
      expect(nov1).toBeDefined();
      expect(nov1!.col).toBe(0); // 第 1 列
      expect(nov1!.dayOfWeek).toBe(0); // 星期日
      expect(nov1!.isWeekend).toBe(true);

      // 表头排布：第 0 列是 '日'，第 6 列是 '六'
      const headers = layout.weekdayHeaders!;
      expect(headers).toHaveLength(7);
      expect(headers[0].text).toBe('日');
      expect(headers[0].isWeekend).toBe(true);
      expect(headers[6].text).toBe('六');
      expect(headers[6].isWeekend).toBe(true);
      expect(headers[1].text).toBe('一');
      expect(headers[1].isWeekend).toBe(false);
    });

    it('2026 年 11 月 1 日在 weekStart: 1 时在最后一列（索引 6）', () => {
      const layout = calendarLayout({
        year: 2026,
        month: 11,
        weekStart: 1,
      });

      expect(layout.days).toBeDefined();
      const nov1 = layout.days!.find((d) => d.day === 1);
      expect(nov1).toBeDefined();
      expect(nov1!.col).toBe(6); // 最后一列
      expect(nov1!.dayOfWeek).toBe(0); // 星期日
      expect(nov1!.isWeekend).toBe(true);

      // 表头排布：第 0 列是 '一'，第 5 列是 '六'，第 6 列是 '日'
      const headers = layout.weekdayHeaders!;
      expect(headers).toHaveLength(7);
      expect(headers[0].text).toBe('一');
      expect(headers[0].isWeekend).toBe(false);
      expect(headers[5].text).toBe('六');
      expect(headers[5].isWeekend).toBe(true);
      expect(headers[6].text).toBe('日');
      expect(headers[6].isWeekend).toBe(true);
    });
  });

  describe('3. marks 圆圈标记与子项包围盒', () => {
    it('只圈出当月的指定日期', () => {
      const layout = calendarLayout({
        year: 2026,
        month: 5,
        marks: [
          [5, 28],
          [5, 29],
          [6, 1], // 次月的不圈
        ],
        markColor: 'purple',
        cell: 40,
        at: [100, 100],
      });

      expect(layout.days).toHaveLength(31);
      const day28 = layout.days!.find((d) => d.day === 28);
      const day29 = layout.days!.find((d) => d.day === 29);
      const day1 = layout.days!.find((d) => d.day === 1);

      expect(day28!.isMarked).toBe(true);
      expect(day29!.isMarked).toBe(true);
      expect(day1!.isMarked).toBe(false); // 5月1日未被标记

      expect(layout.markColor).toBe('purple');

      // 格子包围盒尺寸
      expect(day28!.box.w).toBe(40);
      expect(day28!.box.h).toBe(40);
    });

    it('月历子项 subitems 包含所有日期格子 day.<d>', () => {
      const p = {
        year: 2026,
        month: 2, // 28 天
        cell: 40,
      };
      const items = calendarPart.subitems!(p);
      expect(items).toHaveLength(28);
      expect(items[0].name).toBe('day.1');
      expect(items[0].value).toBe(1);
      expect(items[27].name).toBe('day.28');
      expect(items[27].value).toBe(28);

      // findSubitem 精确查找
      const found = findSubitem(calendarPart, p, 'day.15');
      expect(found).toBeDefined();
      expect((found as { value?: number }).value).toBe(15);

      // findSubitem 通配符查找
      const allDays = findSubitem(calendarPart, p, 'day.*');
      expect(Array.isArray(allDays)).toBe(true);
      expect(allDays).toHaveLength(28);
    });
  });

  describe('4. all 模式下各月条长及颜色', () => {
    it('31 天用 blue (248), 30 天用 orange (240), 2 月用 green (平年 224, 闰年 232)', () => {
      // 2026 平年
      const layout2026 = calendarLayout({
        year: 2026,
        month: 'all',
      });

      expect(layout2026.mode).toBe('all');
      expect(layout2026.monthBars).toHaveLength(12);

      const m1 = layout2026.monthBars![0]; // 1月 31天
      expect(m1.days).toBe(31);
      expect(m1.fullWidth).toBe(31 * 8); // 248
      expect(m1.colorName).toBe('blue');

      const m2 = layout2026.monthBars![1]; // 2月 28天
      expect(m2.days).toBe(28);
      expect(m2.fullWidth).toBe(28 * 8); // 224
      expect(m2.colorName).toBe('green');

      const m4 = layout2026.monthBars![3]; // 4月 30天
      expect(m4.days).toBe(30);
      expect(m4.fullWidth).toBe(30 * 8); // 240
      expect(m4.colorName).toBe('orange');

      // 2024 闰年
      const layout2024 = calendarLayout({
        year: 2024,
        month: 'all',
      });
      const m2Leap = layout2024.monthBars![1]; // 2月 29天
      expect(m2Leap.days).toBe(29);
      expect(m2Leap.fullWidth).toBe(29 * 8); // 232
      expect(m2Leap.colorName).toBe('green');
    });
  });

  describe('5. show 连续展开进度', () => {
    it('show = 0 时所有条均未展开', () => {
      const layout = calendarLayout({
        month: 'all',
        show: 0,
      });
      for (const bar of layout.monthBars!) {
        expect(bar.visible).toBe(false);
        expect(bar.progress).toBe(0);
        expect(bar.currentWidth).toBe(0);
      }
    });

    it('show = 0.5 时第 1 月长出 50%，后续月份未显示', () => {
      const layout = calendarLayout({
        month: 'all',
        show: 0.5,
      });
      const bars = layout.monthBars!;
      expect(bars[0].visible).toBe(true);
      expect(bars[0].progress).toBe(0.5);
      expect(bars[0].currentWidth).toBeCloseTo(248 * 0.5); // 124

      expect(bars[1].visible).toBe(false);
      expect(bars[1].progress).toBe(0);
      expect(bars[1].currentWidth).toBe(0);
    });

    it('show = 1.5 时第 1 月完整，第 2 月长出 50%', () => {
      const layout = calendarLayout({
        year: 2026,
        month: 'all',
        show: 1.5,
      });
      const bars = layout.monthBars!;
      expect(bars[0].visible).toBe(true);
      expect(bars[0].progress).toBe(1);
      expect(bars[0].currentWidth).toBe(248);

      expect(bars[1].visible).toBe(true);
      expect(bars[1].progress).toBe(0.5);
      expect(bars[1].currentWidth).toBeCloseTo(224 * 0.5); // 112

      expect(bars[2].visible).toBe(false);
      expect(bars[2].progress).toBe(0);
    });

    it('show = 12 时全部完整展开', () => {
      const layout = calendarLayout({
        year: 2026,
        month: 'all',
        show: 12,
      });
      for (const bar of layout.monthBars!) {
        expect(bar.visible).toBe(true);
        expect(bar.progress).toBe(1);
        expect(bar.currentWidth).toBe(bar.fullWidth);
      }
    });
  });

  describe('6. 子项 month.<n> 判定与查找', () => {
    it('all 模式下 subitems 包含 12 个月份子项 month.1 到 month.12', () => {
      const p = {
        month: 'all',
        at: [60, 30],
      };
      const items = calendarPart.subitems!(p);
      expect(items).toHaveLength(12);
      expect(items[0].name).toBe('month.1');
      expect(items[0].value).toBe(1);
      expect(items[11].name).toBe('month.12');
      expect(items[11].value).toBe(12);

      // 单项查找
      const bar3 = findSubitem(calendarPart, p, 'month.3');
      expect(bar3).toBeDefined();
      expect((bar3 as { value?: number }).value).toBe(3);

      // 通配符查找
      const allBars = findSubitem(calendarPart, p, 'month.*');
      expect(Array.isArray(allBars)).toBe(true);
      expect(allBars).toHaveLength(12);
    });
  });

  describe('7. 默认值与自定义标签', () => {
    it('默认参数下正确生成 2026 年 1 月日历', () => {
      const layout = calendarLayout({});
      expect(layout.year).toBe(2026);
      expect(layout.month).toBe(1);
      expect(layout.weekStart).toBe(0);
      expect(layout.cell).toBe(48);
      expect(layout.title).toBe('2026 年 1 月');
      expect(calendarPart.bbox({})).toEqual(layout.box);
    });

    it('自定义 labels 模板替换', () => {
      const layout = calendarLayout({
        year: 2025,
        month: 10,
        labels: {
          title: '{y}/{m}',
          days: '{d}d',
          month: 'M{m}',
          weekdays: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
        },
      });

      expect(layout.title).toBe('2025/10');
      expect(layout.weekdayHeaders![0].text).toBe('Su');
    });
  });
});
