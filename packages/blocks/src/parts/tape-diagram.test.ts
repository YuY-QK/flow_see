import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import { checkScene } from '../../../templates/src/scene/check';
import { blend, sceneFrame, type SceneDef } from '../../../templates/src/scene/evaluate';
import type { LessonLike } from '../../../runtime/src/template';
import {
  TAPE_BRACE_GAP,
  TAPE_BRACE_HEIGHT,
  TAPE_BRACE_LABEL_OFFSET,
  TAPE_END_TICK_HEIGHT,
  TAPE_FILL_HEIGHT,
  TAPE_ROW_LABEL_GAP,
  TAPE_SEG_LABEL_OFFSET,
  TAPE_SUB_TICK_HEIGHT,
  findSubitem,
  getPart,
  tapeDiagramLayout,
  tapeDiagramPart,
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
    if (typeof el.type === 'function') {
      const rendered = (el.type as (p: Record<string, unknown>) => ReactNode)(el.props ?? {});
      flatten(rendered, out);
    } else if (el.props && el.props.children) {
      flatten(el.props.children as ReactNode, out);
    }
  }
  return out;
}

const cuteCtx: PartContext = {
  theme: getTheme('cute'),
};

const chalkCtx: PartContext = {
  theme: getTheme('chalk'),
};

describe('B21 tape-diagram 线段图零件', () => {
  describe('1. 各行各段起止端点坐标与默认取色', () => {
    it('准确计算第 2 行第 1 段的起止端点坐标，以及第 1 行多段衔接与默认颜色', () => {
      const L = tapeDiagramLayout({
        at: [140, 100],
        lens: [
          [3, 2, 1],
          [5, 2],
        ],
        unit: 60,
        rowGap: 70,
      });

      expect(L.rows).toHaveLength(2);
      expect(L.segments).toHaveLength(5);

      // 第 1 行：y = 100，三段依次长 180、120、60，默认颜色 blue、orange、green
      const r1s1 = L.rows[0].segments[0];
      const r1s2 = L.rows[0].segments[1];
      const r1s3 = L.rows[0].segments[2];
      expect(r1s1.start).toEqual([140, 100]);
      expect(r1s1.end).toEqual([320, 100]);
      expect(r1s1.color).toBe('blue');

      expect(r1s2.start).toEqual([320, 100]);
      expect(r1s2.end).toEqual([440, 100]);
      expect(r1s2.color).toBe('orange');

      expect(r1s3.start).toEqual([440, 100]);
      expect(r1s3.end).toEqual([500, 100]);
      expect(r1s3.color).toBe('green');

      // 相邻段共用分界竖线：第 1 行只有 4 条分界竖线（140, 320, 440, 500），高 14
      expect(L.rows[0].boundaryTicks.map((t) => t.x)).toEqual([140, 320, 440, 500]);
      expect(L.rows[0].boundaryTicks[0].y2 - L.rows[0].boundaryTicks[0].y1).toBe(
        TAPE_END_TICK_HEIGHT,
      );

      // 第 2 行第 1 段：左端对齐在 x = 140，y = 100 + 70 = 170，长 5 * 60 = 300 => 终点 [440, 170]
      const r2s1 = L.rows[1].segments[0];
      expect(r2s1.name).toBe('seg.2.1');
      expect(r2s1.start).toEqual([140, 170]);
      expect(r2s1.end).toEqual([440, 170]);
      expect(r2s1.color).toBe('blue');

      // 第 2 行第 2 段：[440, 170] -> [560, 170]
      const r2s2 = L.rows[1].segments[1];
      expect(r2s2.name).toBe('seg.2.2');
      expect(r2s2.start).toEqual([440, 170]);
      expect(r2s2.end).toEqual([560, 170]);
      expect(r2s2.color).toBe('orange');
    });

    it('兼容参数填充后的数字字符串 lens 与 ticks（如 [["2"], ["8"]]）', () => {
      const L = tapeDiagramLayout({
        at: [140, 260],
        lens: [['2'], ['8']],
        ticks: ['1', '4'],
        unit: '30',
      });

      expect(L.rows[0].segments[0].start).toEqual([140, 260]);
      expect(L.rows[0].segments[0].end).toEqual([200, 260]);
      expect(L.rows[1].segments[0].start).toEqual([140, 330]);
      expect(L.rows[1].segments[0].end).toEqual([380, 330]);
      expect(L.rows[1].tickParts).toBe(4);
      // 第二行总宽 240 等分 4 份，内部 3 条刻度短竖线位于 200, 260, 320
      expect(L.rows[1].subTicks.map((t) => t.x)).toEqual([200, 260, 320]);
      expect(L.rows[1].subTicks[0].y2 - L.rows[1].subTicks[0].y1).toBe(TAPE_SUB_TICK_HEIGHT);
    });
  });

  describe('2. braces 大括号位置、二次贝塞尔曲线与 label', () => {
    it('准确计算 bottom 与 top 大括号的起止 x/y、尖端位置及外侧 label 位置', () => {
      const L = tapeDiagramLayout({
        at: [100, 140],
        lens: [
          [3, 2],
          [4, 1],
        ],
        segLabels: [
          ['', ''],
          ['40', '10'],
        ],
        unit: 50,
        rowGap: 80,
        braces: [
          { row: 1, from: 1, to: 2, label: '250', side: 'top' },
          { row: 2, from: 1, to: 2, label: '[?](blank)', side: 'bottom' },
          { row: 2, from: 1, to: 2, label: '50', side: 'top' },
        ],
      });

      expect(L.braces).toHaveLength(3);

      // 第 1 个大括号：第 1 行 1..2 段，无段上方文字，top
      // x1 = 100, x2 = 100 + (3+2)*50 = 350, midX = 225
      // baseY = 140 - 10 = 130, tipY = 130 - 18 = 112, labelY = 112 - 15 = 97
      const b1 = L.braces[0];
      expect(b1.name).toBe('brace.1');
      expect(b1.x1).toBe(100);
      expect(b1.x2).toBe(350);
      expect(b1.midX).toBe(225);
      expect(b1.baseY).toBe(140 - TAPE_BRACE_GAP);
      expect(b1.tip).toEqual([225, 140 - TAPE_BRACE_GAP - TAPE_BRACE_HEIGHT]);
      expect(b1.label).toBe('250');
      expect(b1.labelCenter).toEqual([
        225,
        140 - TAPE_BRACE_GAP - TAPE_BRACE_HEIGHT - TAPE_BRACE_LABEL_OFFSET,
      ]);
      expect(b1.path).toContain('Q ');

      // 第 2 个大括号：第 2 行（y = 220）1..2 段，bottom
      const b2 = L.braces[1];
      expect(b2.name).toBe('brace.2');
      expect(b2.x1).toBe(100);
      expect(b2.x2).toBe(350);
      expect(b2.baseY).toBe(220 + TAPE_BRACE_GAP);
      expect(b2.tip).toEqual([225, 220 + TAPE_BRACE_GAP + TAPE_BRACE_HEIGHT]);
      expect(b2.label).toBe('[?](blank)');
      expect(b2.labelCenter).toEqual([
        225,
        220 + TAPE_BRACE_GAP + TAPE_BRACE_HEIGHT + TAPE_BRACE_LABEL_OFFSET,
      ]);

      // 第 3 个大括号：第 2 行有上方段文字（y = 220 - 16 = 204），top 大括号自动上移避让段文字
      const b3 = L.braces[2];
      expect(b3.baseY).toBeLessThan(L.rows[1].segments[0].labelCenter[1] - 8);
      expect(b3.tipY).toBe(b3.baseY - TAPE_BRACE_HEIGHT);
    });
  });

  describe('3. reveal 逐段长出动画进度', () => {
    it('reveal: 2.5 时前 2 段完整、第 3 段长出一半、后续段未出现', () => {
      const L = tapeDiagramLayout({
        at: [100, 100],
        lens: [
          [3, 2],
          [4, 2],
        ],
        segLabels: [
          ['A', 'B'],
          ['C', 'D'],
        ],
        unit: 50,
        reveal: 2.5,
      });

      const [s1, s2, s3, s4] = L.segments;

      // 前 2 段完整
      expect(s1.progress).toBe(1);
      expect(s1.visible).toBe(true);
      expect(s1.drawnWidth).toBe(150);
      expect(s1.drawnEnd).toEqual([250, 100]);

      expect(s2.progress).toBe(1);
      expect(s2.visible).toBe(true);
      expect(s2.drawnWidth).toBe(100);
      expect(s2.drawnEnd).toEqual([350, 100]);

      // 第 3 段（第 2 行第 1 段，全长 4 * 50 = 200）长出一半 = 100
      expect(s3.progress).toBeCloseTo(0.5, 5);
      expect(s3.visible).toBe(true);
      expect(s3.fullWidth).toBe(200);
      expect(s3.drawnWidth).toBeCloseTo(100, 5);
      expect(s3.drawnEnd).toEqual([200, 170]);

      // 第 4 段尚未出现
      expect(s4.progress).toBe(0);
      expect(s4.visible).toBe(false);
      expect(s4.drawnWidth).toBe(0);

      // 子项中第 4 段标记为 disabled
      const sub4 = findSubitem(tapeDiagramPart, {
        at: [100, 100],
        lens: [
          [3, 2],
          [4, 2],
        ],
        reveal: 2.5,
      }, 'seg.2.2') as Subitem;
      expect(sub4.disabled).toBe(true);
    });
  });

  describe('4. fill 工程问题第一行进度填色', () => {
    it('fill: 0.3 时第一行填充宽度 = 第一行总宽 × 0.3，高度为 14px', () => {
      const L = tapeDiagramLayout({
        at: [120, 100],
        lens: [[3, 2], [4]],
        unit: 60,
        fill: 0.3,
      });

      // 第一行总宽 = (3 + 2) * 60 = 300；0.3 倍 = 90
      expect(L.rows[0].fullWidth).toBe(300);
      expect(L.fillBar).toBeDefined();
      expect(L.fillBar!.x).toBe(120);
      expect(L.fillBar!.y).toBe(100 - TAPE_FILL_HEIGHT / 2);
      expect(L.fillBar!.h).toBe(TAPE_FILL_HEIGHT);
      expect(L.fillBar!.w).toBeCloseTo(90, 5);
    });
  });

  describe('5. lens 经 F1 blend 插值后的端点连续变化', () => {
    it('blend 二维数组插值与 sceneFrame set 动作下端点平滑过渡', () => {
      const fromLens = [
        [2, 2],
        [4],
      ];
      const toLens = [
        [4, 6],
        [10],
      ];

      const midLens = blend(fromLens, toLens, 0.5, 'lens');
      expect(midLens).toEqual([
        [3, 4],
        [7],
      ]);

      const LMid = tapeDiagramLayout({
        at: [100, 80],
        lens: midLens,
        unit: 40,
      });
      expect(LMid.rows[0].segments[0].end).toEqual([100 + 3 * 40, 80]);
      expect(LMid.rows[0].segments[1].start).toEqual([220, 80]);
      expect(LMid.rows[0].segments[1].end).toEqual([220 + 4 * 40, 80]);
      expect(LMid.rows[1].segments[0].end).toEqual([100 + 7 * 40, 150]);

      // 通过真实场景求值器验证带字符串数字初始化后的连续插值
      const def: SceneDef = {
        stage: { width: 800, height: 450 },
        objects: [
          {
            id: 'tp',
            type: 'tape-diagram',
            at: [100, 100],
            unit: 50,
            lens: [['2'], ['4']],
          },
        ],
        steps: [
          [
            {
              set: {
                target: 'tp',
                lens: [[6], [8]],
                duration: '1s',
                ease: 'linear',
              },
            },
          ],
        ],
      };

      const frameHalf = sceneFrame(def, 0, 0.5);
      const tpObj = frameHalf.objects.find((o) => o.id === 'tp')!;
      const LScene = tapeDiagramLayout(tpObj.props);
      // t = 0.5 时：第 1 行 len = 4 (x2 = 300)，第 2 行 len = 6 (x2 = 400)
      expect(LScene.rows[0].segments[0].end[0]).toBeCloseTo(300, 5);
      expect(LScene.rows[1].segments[0].end[0]).toBeCloseTo(400, 5);
    });
  });

  describe('6. 包围盒 bbox 与子项 subitems 查询', () => {
    it('bbox 完整包裹左侧 rowLabels（bbox.x < at.x）、上方 segLabels 及下方 braces', () => {
      const props = {
        at: [160, 120],
        lens: [
          [3, 2],
          [5],
        ],
        segLabels: [['18', '12'], ['']],
        rowLabels: ['First', 'Second'],
        braces: [{ row: 2, from: 1, to: 1, label: '?', side: 'bottom' }],
        unit: 50,
        rowGap: 70,
      };

      const L = tapeDiagramLayout(props);
      const box = tapeDiagramPart.bbox(props);

      // 左侧有 rowLabels 写在 160 - 16 = 144 处右对齐，故 bbox.x 严格小于 at.x (160)
      expect(box.x).toBeLessThan(160 - TAPE_ROW_LABEL_GAP);
      // 上方包含第 1 行 above 段文字 (120 - 16 = 104)
      expect(box.y).toBeLessThan(120 - TAPE_SEG_LABEL_OFFSET);
      // 右侧至少到达 160 + 5 * 50 = 410
      expect(box.x + box.w).toBeGreaterThanOrEqual(410);
      // 下方包含第 2 行 bottom 大括号及 '?' 文字
      expect(box.y + box.h).toBeGreaterThan(L.braces[0].labelCenter[1]);
    });

    it('支持 seg.<行>.<段>、brace.<n>、row.<n> 及通配符子项查找', () => {
      const props = {
        at: [140, 100],
        lens: [
          [3, 2],
          [5],
        ],
        rowLabels: ['A', 'B'],
        braces: [{ row: 1, from: 1, to: 2, label: 'total', side: 'top' }],
        unit: 60,
      };

      const seg12 = findSubitem(tapeDiagramPart, props, 'seg.1.2') as Subitem;
      expect(seg12).toBeDefined();
      expect(seg12.value).toBe(2);
      expect(seg12.box.x).toBe(320);
      expect(seg12.box.w).toBe(120);

      const brace1 = findSubitem(tapeDiagramPart, props, 'brace.1') as Subitem;
      expect(brace1).toBeDefined();
      expect(brace1.box.w).toBe(300);

      const row1 = findSubitem(tapeDiagramPart, props, 'row.1') as Subitem;
      expect(row1).toBeDefined();
      expect(row1.box.x).toBeLessThan(140);
      expect(row1.box.x + row1.box.w).toBeGreaterThanOrEqual(440);

      const allSegs = findSubitem(tapeDiagramPart, props, 'seg.*') as Subitem[];
      expect(allSegs).toHaveLength(3);
    });
  });

  describe('7. checkScene 配置校验', () => {
    const makeLesson = (
      tapeObj: Record<string, unknown>,
      doList?: Record<string, unknown>[],
    ): LessonLike => ({
      params: {},
      objects: [{ id: 'tp', type: 'tape-diagram', at: [140, 120], ...tapeObj }],
      steps: [{ say: 'ok', do: doList ?? [{ highlight: 'tp' }] }],
    });

    it('合法配置（含参数表达式）不报错', () => {
      const lesson: LessonLike = {
        params: { u: 2, k: 4 },
        derived: { w: 'u * k' },
        objects: [
          {
            id: 'tp',
            type: 'tape-diagram',
            at: [140, 120],
            lens: [['{u}'], ['{w}']],
            segLabels: [['{u}'], ['[{w}](blank)']],
            segColors: [['blue'], ['orange']],
            ticks: [1, '{k}'],
            braces: [{ row: 2, from: 1, to: 1, label: '[?](blank)', side: 'bottom' }],
          },
        ],
        steps: [{ say: 'ok', do: [{ highlight: 'tp.seg.2.1' }] }],
      };
      expect(checkScene(lesson)).toEqual([]);
    });

    it('segLabels 或 segColors 形状与 lens 不一致时报错', () => {
      const issues1 = checkScene(
        makeLesson({
          lens: [
            [3, 2],
            [5],
          ],
          segLabels: [['3', '2']],
        }),
      );
      expect(issues1.some((i) => i.message.includes('segLabels 行数'))).toBe(true);

      const issues2 = checkScene(
        makeLesson({
          lens: [
            [3, 2],
            [5],
          ],
          segLabels: [['3'], ['5']],
        }),
      );
      expect(issues2.some((i) => i.message.includes('segLabels 第 1 行段数'))).toBe(true);

      const issues3 = checkScene(
        makeLesson({
          lens: [
            [3, 2],
            [5],
          ],
          segColors: [['blue', 'orange', 'green'], ['blue']],
        }),
      );
      expect(issues3.some((i) => i.message.includes('segColors 第 1 行段数'))).toBe(true);
    });

    it('braces 的 row 越界或 from / to 段序号越界时报错（含 set 动作修改时）', () => {
      const rowOutIssues = checkScene(
        makeLesson({
          lens: [[3, 2]],
          braces: [{ row: 2, from: 1, to: 1, label: '?' }],
        }),
      );
      expect(rowOutIssues.some((i) => i.message.includes('row（2）越界'))).toBe(true);

      const segOutIssues = checkScene(
        makeLesson({
          lens: [[3, 2]],
          braces: [{ row: 1, from: 1, to: 3, label: '?' }],
        }),
      );
      expect(segOutIssues.some((i) => i.message.includes('to（3）越界'))).toBe(true);

      const orderIssues = checkScene(
        makeLesson({
          lens: [[3, 2, 1]],
          braces: [{ row: 1, from: 3, to: 2, label: '?' }],
        }),
      );
      expect(orderIssues.some((i) => i.message.includes('from（3）不能大于 to（2）'))).toBe(true);

      const setIssues = checkScene(
        makeLesson({ lens: [[3, 2]] }, [
          {
            set: {
              target: 'tp',
              braces: [{ row: 1, from: 1, to: 4, label: '?' }],
            },
          },
        ]),
      );
      expect(setIssues.some((i) => i.message.includes('to（4）越界'))).toBe(true);
    });
  });

  describe('8. 多主题与 inside 标签渲染', () => {
    it('在浅色与深色主题下正常渲染线段、刻度、进度条、富文本及花括号', () => {
      const resolved = getPart('tape-diagram')!;
      expect(resolved).toBeDefined();

      const props = {
        ...resolved.defaults,
        at: [140, 120],
        lens: [
          [3, 2],
          [5],
        ],
        segLabels: [['[1/3](frac)', '[2/3](frac)'], ['[5](blank)']],
        rowLabels: ['Row1', 'Row2'],
        ticks: [1, 5],
        braces: [{ row: 2, from: 1, to: 1, label: '?', side: 'bottom' }],
        fill: 0.4,
        labelPos: 'inside',
        _subColors: { 'seg.1.2': 'red', 'brace.1': 'accent' },
      };

      for (const ctx of [cuteCtx, chalkCtx]) {
        const renderFn = resolved.Render as (args: {
          p: Record<string, unknown>;
          ctx: PartContext;
        }) => ReactNode;
        const tree = renderFn({ p: props, ctx });
        const els = flatten(tree);
        const lines = els.filter((e) => e.type === 'line');
        const paths = els.filter((e) => e.type === 'path');
        const rects = els.filter((e) => e.type === 'rect');

        expect(lines.length).toBeGreaterThan(5);
        expect(paths).toHaveLength(1);
        // 至少有 fillBar 的 rect 以及 inside 标签衬底 / BlankBox 的 rect
        expect(rects.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
