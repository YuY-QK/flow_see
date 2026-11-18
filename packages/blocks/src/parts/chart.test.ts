import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import { checkScene } from '../../../templates/src/scene/check';
import type { LessonLike } from '../../../runtime/src/template';
import {
  chartLayout,
  chartPart,
  findSubitem,
  piePoint,
  type PartContext,
  type Subitem,
} from '../index';

interface El {
  type: unknown;
  props: Record<string, unknown>;
}

function flatten(node: ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) {
    node.forEach((n) => flatten(n, out));
  } else if (isValidElement(node)) {
    const el = node as unknown as El;
    out.push(el);
    if (el.props && el.props.children) {
      flatten(el.props.children as ReactNode, out);
    }
  }
  return out;
}

const cuteCtx: PartContext = {
  theme: getTheme('cute'),
  assetUrl: (id) => `mock://${id}.svg`,
};

const chalkCtx: PartContext = {
  theme: getTheme('chalk'),
  assetUrl: (id) => `mock://${id}.svg`,
};

describe('B19 chart 统计图零件', () => {
  describe('1. 各 kind 关键几何坐标', () => {
    it('bar：计算第 2 根柱子的 x、宽、高与 y 坐标', () => {
      // at=[100, 360], width=400, height=200, 4 类 => colW=100, barW=60
      // values=[10, 25, 40, 15], unit=10 => auto max=40
      const L = chartLayout({
        kind: 'bar',
        at: [100, 360],
        width: 400,
        height: 200,
        unit: 10,
        categories: ['A', 'B', 'C', 'D'],
        values: [10, 25, 40, 15],
      });

      expect(L.max).toBe(40);
      expect(L.bars).toHaveLength(4);

      const bar2 = L.bars[1];
      // 第 2 列中心 cx = 100 + 1.5 * 100 = 250；barW = 100 * 0.6 = 60 => x = 220
      expect(bar2.name).toBe('bar.2');
      expect(bar2.w).toBeCloseTo(60, 5);
      expect(bar2.x).toBeCloseTo(220, 5);
      // h = (25 / 40) * 200 = 125，y = 360 - 125 = 235
      expect(bar2.h).toBeCloseTo(125, 5);
      expect(bar2.y).toBeCloseTo(235, 5);
    });

    it('bar2：两根并排柱各占柱宽一半，默认开启图例', () => {
      const L = chartLayout({
        kind: 'bar2',
        at: [80, 380],
        width: 400,
        height: 200,
        unit: 5,
        max: 40,
        categories: ['跳绳', '踢毽', '跑步', '拍球'],
        values: [20, 16, 30, 12],
        values2: [24, 20, 18, 16],
        names: ['男生', '女生'],
      });

      expect(L.bars).toHaveLength(8);
      // colW = 100, groupW = 60, halfW = 30
      // 第 2 类中心 cx = 80 + 150 = 230
      const b1_2 = L.bars.find((b) => b.name === 'bar.1.2')!;
      const b2_2 = L.bars.find((b) => b.name === 'bar.2.2')!;
      expect(b1_2.w).toBeCloseTo(30, 5);
      expect(b2_2.w).toBeCloseTo(30, 5);
      expect(b1_2.x).toBeCloseTo(200, 5);
      expect(b2_2.x).toBeCloseTo(230, 5);
      expect(b1_2.h).toBeCloseTo((16 / 40) * 200, 5);
      expect(b2_2.h).toBeCloseTo((20 / 40) * 200, 5);
      expect(L.legendItems).toHaveLength(2);
      expect(L.legendItems[0].text).toBe('男生');
      expect(L.legendItems[1].text).toBe('女生');
    });

    it('line 与 line2：计算第 3 个点的精确坐标', () => {
      const L = chartLayout({
        kind: 'line',
        at: [100, 380],
        width: 480,
        height: 300,
        unit: 5,
        max: 30,
        categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
        values: [2, 5, 12, 18, 22, 27],
      });

      expect(L.lineSeries).toHaveLength(1);
      const pts = L.lineSeries[0].points;
      expect(pts).toHaveLength(6);
      // colW = 480 / 6 = 80；第 3 个点 (index=2) x = 100 + 2.5 * 80 = 300
      // y = 380 - (12 / 30) * 300 = 260
      const pt3 = pts[2];
      expect(pt3.name).toBe('pt.3');
      expect(pt3.x).toBeCloseTo(300, 5);
      expect(pt3.y).toBeCloseTo(260, 5);
      expect(pt3.visible).toBe(true);

      const L2 = chartLayout({
        kind: 'line2',
        at: [100, 380],
        width: 480,
        height: 300,
        unit: 20,
        max: 180,
        categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
        values: [20, 35, 50, 80, 120, 160],
        values2: [60, 70, 90, 90, 100, 110],
        names: ['甲城', '乙城'],
      });
      expect(L2.lineSeries).toHaveLength(2);
      expect(L2.lineSeries[1].points[2].name).toBe('pt.2.3');
      expect(L2.lineSeries[1].points[2].x).toBeCloseTo(300, 5);
      expect(L2.lineSeries[1].points[2].y).toBeCloseTo(380 - (90 / 180) * 300, 5);
    });

    it('pie：12 点方向顺时针排布，计算第 2 个扇形的起止角、圆内标签与小于 20° 外引线', () => {
      // 总和 = 14 + 10 + 8 + 8 = 40
      // 扇形1: 14/40 = 35% => 0° ~ 126°
      // 扇形2: 10/40 = 25% => 126° ~ 216°
      const L = chartLayout({
        kind: 'pie',
        at: [100, 400],
        width: 320,
        height: 320,
        categories: ['跳绳', '跑步', '踢毽', '其他'],
        values: [14, 10, 8, 8],
      });

      expect(L.pie).toBeDefined();
      expect(L.pie!.cx).toBeCloseTo(260, 5);
      expect(L.pie!.cy).toBeCloseTo(240, 5);
      expect(L.pie!.r).toBeCloseTo(160, 5);

      const s2 = L.pie!.slices[1];
      expect(s2.startAngle).toBeCloseTo(126, 5);
      expect(s2.endAngle).toBeCloseTo(216, 5);
      expect(s2.percent).toBe(25);
      expect(s2.labelText).toBe('跑步 25%');
      expect(s2.outside).toBe(false);
      const expectedLabelPos = piePoint(260, 240, 160 * 0.6, 171);
      expect(s2.labelPos[0]).toBeCloseTo(expectedLabelPos[0], 5);
      expect(s2.labelPos[1]).toBeCloseTo(expectedLabelPos[1], 5);

      // 不写 colors 时自动取不同主色
      const uniqueColors = new Set(L.pie!.slices.map((s) => s.color));
      expect(uniqueColors.size).toBe(4);

      // 小扇形（角度 < 20°）：4 / 100 = 4% => 14.4° < 20°，应放到圆外并有引线
      const smallPie = chartLayout({
        kind: 'pie',
        at: [100, 400],
        width: 300,
        height: 300,
        categories: ['大项', '小项'],
        values: [96, 4],
      });
      const tinySlice = smallPie.pie!.slices[1];
      expect(tinySlice.sweepAngle).toBeCloseTo(14.4, 5);
      expect(tinySlice.outside).toBe(true);
      expect(tinySlice.leaderLine).toBeDefined();
      expect(tinySlice.leaderLine).toHaveLength(3);
      // 包围盒应包含圆外文字
      expect(smallPie.box.x).toBeLessThanOrEqual(tinySlice.labelBox.x);
    });

    it('picto：每类一列从底向上排列，支持按类别图标与半个图标裁切（clipRatio = 0.5）', () => {
      const L = chartLayout({
        kind: 'picto',
        at: [80, 360],
        width: 300,
        height: 280,
        unit: 2,
        categories: ['苹果', '梨', '桃'],
        values: [6, 5, 3],
        icon: ['apple', 'pear', 'peach'],
      });

      expect(L.pictoColumns).toHaveLength(3);
      // 第 1 列：6 / 2 = 3 个完整图标
      expect(L.pictoColumns[0].icons).toHaveLength(3);
      expect(L.pictoColumns[0].icons.every((ic) => ic.clipRatio === 1)).toBe(true);
      // 从底向上：第 2 个图标 y 小于第 1 个图标 y
      expect(L.pictoColumns[0].icons[1].box.y).toBeLessThan(L.pictoColumns[0].icons[0].box.y);

      // 第 2 列：5 / 2 = 2.5 => 3 个槽位，末尾图标 clipRatio = 0.5
      const col2Icons = L.pictoColumns[1].icons;
      expect(col2Icons).toHaveLength(3);
      expect(col2Icons[0].clipRatio).toBe(1);
      expect(col2Icons[1].clipRatio).toBe(1);
      expect(col2Icons[2].clipRatio).toBeCloseTo(0.5, 5);
      expect(col2Icons[2].clipBox.w).toBeCloseTo(col2Icons[2].box.w * 0.5, 5);
      expect(col2Icons[2].icon).toBe('pear');

      // 渲染验证：存在 clipPath 元素
      const RenderFn = chartPart.Render as unknown as (props: {
        p: Record<string, unknown>;
        ctx: PartContext;
      }) => ReactNode;
      const els = flatten(
        RenderFn({
          p: {
            id: 'picTest',
            kind: 'picto',
            at: [80, 360],
            width: 300,
            height: 280,
            unit: 2,
            categories: ['苹果', '梨', '桃'],
            values: [6, 5, 3],
            icon: ['apple', 'pear', 'peach'],
          },
          ctx: cuteCtx,
        }),
      );
      const clips = els.filter((e) => e.type === 'clipPath');
      expect(clips.length).toBeGreaterThanOrEqual(2); // 5/2 与 3/2 各有一个半图标
    });

    it('xy：正比例共线过原点连直线，反比例用 Catmull-Rom 平滑曲线', () => {
      // 正比例：y = 2x
      const direct = chartLayout({
        kind: 'xy',
        at: [80, 400],
        width: 360,
        height: 260,
        xs: [1, 2, 3, 4, 5],
        values: [2, 4, 6, 8, 10],
        unit: 2,
        max: 12,
        line: true,
      });
      expect(direct.xy).toBeDefined();
      expect(direct.xy!.throughOrigin).toBe(true);
      expect(direct.xy!.isSmooth).toBe(false);
      // 起点为原点 (80, 400)
      expect(direct.xy!.path.startsWith('M 80 400 L')).toBe(true);
      // 第 2 个点 (x=2, y=4): xMax=5 => x = 80 + (2/5)*360 = 224, y = 400 - (4/12)*260
      expect(direct.xy!.points[1].x).toBeCloseTo(80 + (2 / 5) * 360, 5);
      expect(direct.xy!.points[1].y).toBeCloseTo(400 - (4 / 12) * 260, 5);

      // 反比例：x * y = 24
      const inverse = chartLayout({
        kind: 'xy',
        at: [420, 400],
        width: 300,
        height: 240,
        xs: [2, 3, 4, 6, 8, 12],
        values: [12, 8, 6, 4, 3, 2],
        unit: 2,
        max: 14,
        line: true,
      });
      expect(inverse.xy!.isSmooth).toBe(true);
      expect(inverse.xy!.throughOrigin).toBe(false);
      expect(inverse.xy!.path).toContain(' C ');
      expect(inverse.xTicks.length).toBeGreaterThan(2);
    });
  });

  describe('2. show: 0.5 中间态与动画过程', () => {
    it('bar 在 show: 0.5 时柱高为目标值的一半', () => {
      const full = chartLayout({
        kind: 'bar',
        at: [100, 300],
        width: 300,
        height: 200,
        categories: ['甲', '乙', '丙'],
        values: [10, 20, 40],
        show: 1,
      });
      const half = chartLayout({
        kind: 'bar',
        at: [100, 300],
        width: 300,
        height: 200,
        categories: ['甲', '乙', '丙'],
        values: [10, 20, 40],
        show: 0.5,
      });

      expect(half.bars[1].h).toBeCloseTo(full.bars[1].h * 0.5, 5);
      expect(half.bars[2].h).toBeCloseTo(full.bars[2].h * 0.5, 5);
    });

    it('line 在 show: 0.5 时画出总长度的一半，后续未到达的点隐藏', () => {
      const half = chartLayout({
        kind: 'line',
        at: [100, 300],
        width: 400,
        height: 200,
        categories: ['1', '2', '3', '4'],
        values: [10, 10, 10, 10],
        show: 0.5,
      });
      const series = half.lineSeries[0];
      expect(series.drawnLength).toBeCloseTo(series.totalLength * 0.5, 5);
      // 4 个等距水平点：0, 100, 200, 300 => 总长 300，show=0.5 时画到 150
      expect(series.points[0].visible).toBe(true);
      expect(series.points[1].visible).toBe(true);
      expect(series.points[2].visible).toBe(false);
      expect(series.points[3].visible).toBe(false);
    });

    it('pie 在 show: 0.5 时总展开角为 180°', () => {
      const half = chartLayout({
        kind: 'pie',
        at: [100, 360],
        width: 240,
        height: 240,
        categories: ['A', 'B', 'C'],
        values: [10, 20, 10], // 90°, 180°, 90°
        show: 0.5,
      });
      const slices = half.pie!.slices;
      // 第 1 块 0..90 全部展开；第 2 块 90..270 截断到 90..180；第 3 块不可见
      expect(slices[0].drawnSweepAngle).toBeCloseTo(90, 5);
      expect(slices[1].drawnStartAngle).toBeCloseTo(90, 5);
      expect(slices[1].drawnEndAngle).toBeCloseTo(180, 5);
      expect(slices[1].drawnSweepAngle).toBeCloseTo(90, 5);
      expect(slices[2].drawnSweepAngle).toBeCloseTo(0, 5);
      expect(slices[2].visible).toBe(false);
    });

    it('picto 与 xy 在 show: 0.5 时呈现部分元素', () => {
      const picHalf = chartLayout({
        kind: 'picto',
        at: [100, 360],
        width: 300,
        height: 240,
        categories: ['A', 'B'],
        values: [4, 2],
        show: 0.5,
      });
      expect(picHalf.pictoColumns[0].icons.filter((i) => i.visible)).toHaveLength(2);
      expect(picHalf.pictoColumns[1].icons.filter((i) => i.visible)).toHaveLength(1);

      const xyHalf = chartLayout({
        kind: 'xy',
        at: [100, 360],
        width: 300,
        height: 240,
        xs: [2, 3, 4, 6, 8],
        values: [12, 8, 6, 4, 3],
        show: 0.5,
      });
      const visCount = xyHalf.xy!.points.filter((pt) => pt.visible).length;
      expect(visCount).toBeGreaterThan(0);
      expect(visCount).toBeLessThan(5);
    });
  });

  describe('3. unit: 5 刻度与 average: true 平均线', () => {
    it('unit: 5 时自动向上取整 max 并按每格 5 生成纵轴刻度与网格线', () => {
      const L = chartLayout({
        kind: 'bar',
        at: [100, 380],
        width: 400,
        height: 250,
        unit: 5,
        categories: ['甲', '乙', '丙'],
        values: [12, 23, 18],
      });

      // 最大值 23 向上取 5 的整数倍 = 25
      expect(L.max).toBe(25);
      expect(L.yTicks.map((t) => t.value)).toEqual([0, 5, 10, 15, 20, 25]);
      expect(L.yTicks.map((t) => t.text)).toEqual(['0', '5', '10', '15', '20', '25']);
      // 横向网格线不含 0 轴线，共 5 条
      expect(L.gridLinesH).toHaveLength(5);
      expect(L.yTicks[1].y).toBeCloseTo(380 - (5 / 25) * 250, 5);
    });

    it('average: true 计算平均线的精确 y 坐标与右端标注文字', () => {
      // values = [92, 85, 96, 88, 89] => 平均 = 90
      const L = chartLayout({
        kind: 'bar',
        at: [100, 380],
        width: 460,
        height: 300,
        unit: 10,
        max: 200,
        average: true,
        categories: ['小明', '小红', '小刚', '小丽', '小华'],
        values: [92, 85, 96, 88, 89],
      });

      expect(L.averageLine).toBeDefined();
      expect(L.averageLine!.value).toBeCloseTo(90, 5);
      // y = 380 - (90 / 200) * 300 = 245
      expect(L.averageLine!.y).toBeCloseTo(245, 5);
      expect(L.averageLine!.labelText).toBe('平均 90');
      // 包围盒包含右端平均线文字
      expect(L.box.x + L.box.w).toBeGreaterThanOrEqual(
        L.averageLine!.labelBox.x + L.averageLine!.labelBox.w,
      );
    });
  });

  describe('4. 子项（subitems）查询与多主题渲染', () => {
    it('支持 bar.<n>、bar.1.<n>、pt.<n>、slice.<n>、col.<n> 及通配查询', () => {
      const barProps = {
        kind: 'bar',
        at: [100, 360],
        width: 300,
        height: 240,
        categories: ['苹果', '梨', '桃'],
        values: [5, 3, 4],
      };
      const b2 = findSubitem(chartPart, barProps, 'bar.2') as Subitem | undefined;
      expect(b2).toBeDefined();
      expect(b2!.value).toBe(3);

      const c1 = findSubitem(chartPart, barProps, 'col.1') as Subitem | undefined;
      expect(c1).toBeDefined();
      expect(c1!.value).toBe(5);

      const allCols = findSubitem(chartPart, barProps, 'col.*');
      expect(allCols).toHaveLength(3);

      const bar2Props = {
        kind: 'bar2',
        at: [100, 360],
        categories: ['一班', '二班'],
        values: [12, 15],
        values2: [14, 13],
      };
      expect(findSubitem(chartPart, bar2Props, 'bar.1.2')).toBeDefined();
      expect(findSubitem(chartPart, bar2Props, 'bar.2.1')).toBeDefined();

      const lineProps = {
        kind: 'line',
        at: [100, 360],
        categories: ['周一', '周二', '周三'],
        values: [10, 15, 12],
      };
      const pt3 = findSubitem(chartPart, lineProps, 'pt.3') as Subitem | undefined;
      expect(pt3).toBeDefined();
      expect(pt3!.value).toBe(12);

      const pieProps = {
        kind: 'pie',
        at: [100, 360],
        categories: ['甲', '乙', '丙'],
        values: [20, 30, 50],
      };
      const s2 = findSubitem(chartPart, pieProps, 'slice.2') as Subitem | undefined;
      expect(s2).toBeDefined();
      expect(s2!.value).toBe(30);
    });

    it('在浅色与深色主题下正常渲染所有统计图形态并支持 _subColors', () => {
      const RenderFn = chartPart.Render as unknown as (props: {
        p: Record<string, unknown>;
        ctx: PartContext;
      }) => ReactNode;
      for (const ctx of [cuteCtx, chalkCtx]) {
        const node = RenderFn({
          p: {
            kind: 'bar',
            at: [100, 360],
            categories: ['A', 'B', 'C'],
            values: [10, 20, 15],
            average: true,
            showValues: true,
            axisNames: ['类别', '数量'],
            _subColors: { 'bar.2': 'red' },
          },
          ctx,
        });
        const els = flatten(node);
        expect(els.length).toBeGreaterThan(10);
      }
    });
  });

  describe('5. checkScene 场景属性校验', () => {
    it('values 与 categories 长度不一致时报错', () => {
      const lesson: LessonLike = {
        params: {},
        objects: [
          {
            id: 'ch',
            type: 'chart',
            kind: 'bar',
            categories: ['苹果', '梨', '桃'],
            values: [5, 3],
            at: [100, 360],
          },
        ],
        steps: [{ say: '测试', do: [{ highlight: 'ch' }] }],
      };
      const issues = checkScene(lesson);
      expect(issues.some((i) => i.message.includes('不一致'))).toBe(true);
    });

    it('bar2 的 values2 与 categories 长度不一致时报错', () => {
      const lesson: LessonLike = {
        params: {},
        objects: [
          {
            id: 'ch2',
            type: 'chart',
            kind: 'bar2',
            categories: ['甲', '乙', '丙'],
            values: [10, 20, 30],
            values2: [15, 25],
            at: [100, 360],
          },
        ],
        steps: [{ say: '测试', do: [{ highlight: 'ch2' }] }],
      };
      const issues = checkScene(lesson);
      expect(issues.some((i) => i.path.includes('values2') && i.message.includes('不一致'))).toBe(
        true,
      );
    });

    it('pie 模式 values 含负数时报错', () => {
      const lesson: LessonLike = {
        params: {},
        objects: [
          {
            id: 'pie1',
            type: 'chart',
            kind: 'pie',
            categories: ['甲', '乙'],
            values: [30, -5],
            at: [100, 360],
          },
        ],
        steps: [{ say: '测试', do: [{ highlight: 'pie1' }] }],
      };
      const issues = checkScene(lesson);
      expect(issues.some((i) => i.message.includes('负数'))).toBe(true);
    });

    it('合法的各模式 chart 配置通过 checkScene 校验', () => {
      const lesson: LessonLike = {
        params: {},
        objects: [
          {
            id: 'pic',
            type: 'chart',
            kind: 'picto',
            categories: ['苹果', '梨', '桃'],
            values: [5, 3, 4],
            icon: ['apple', 'pear', 'peach'],
            at: [440, 360],
          },
          {
            id: 'xy1',
            type: 'chart',
            kind: 'xy',
            xs: [1, 2, 3],
            values: [2, 4, 6],
            at: [80, 360],
          },
        ],
        steps: [{ say: '测试', do: [{ highlight: 'pic.col.1' }] }],
      };
      const issues = checkScene(lesson);
      expect(issues).toEqual([]);
    });
  });
});
