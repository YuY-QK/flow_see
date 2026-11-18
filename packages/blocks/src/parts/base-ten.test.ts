import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import { checkScene } from '../../../templates/src/scene/check';
import type { LessonLike } from '../../../runtime/src/template';
import {
  baseTenLayout,
  baseTenPart,
  cubeMetrics,
  findSubitem,
} from '../index';

const theme = getTheme('cute');

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

describe('B3 十进制块（base-ten）', () => {
  it('1. 13 根 = 1 捆 + 3 根的位置', () => {
    const at: [number, number] = [100, 100];
    const unit = 16;
    const props = {
      at,
      style: 'stick' as const,
      tens: 1,
      ones: 3,
      columns: true,
      unit,
    };

    const layout = baseTenLayout(props);

    // 数位分列：十位在左，个位在右
    expect(layout.columnList).toHaveLength(2);
    const [tensCol, onesCol] = layout.columnList;

    expect(tensCol.name).toBe('tens');
    expect(onesCol.name).toBe('ones');

    // 十位：1 捆，宽 5 * unit = 80，高 6 * unit = 96
    expect(tensCol.items).toHaveLength(1);
    const bundle = tensCol.items[0];
    expect(bundle.box).toMatchObject({
      x: 100,
      y: 100,
      w: 80,
      h: 96,
    });
    // 绳子在中部
    const bundleItem = bundle as { rope?: { y1: number; y2: number } };
    expect(bundleItem.rope?.y1).toBe(100 + 48);

    // 列间距 unit * 2 = 32
    // 个位起始 x = 100 + 80 + 32 = 212
    expect(onesCol.items).toHaveLength(3);
    const stickW = unit * 0.5; // 8
    const stickGap = unit * 0.4; // 6.4

    // 3 根单根小棒位置
    expect(onesCol.items[0].box).toMatchObject({
      x: 212,
      y: 100,
      w: stickW,
      h: 96,
    });
    expect(onesCol.items[1].box.x).toBeCloseTo(212 + stickW + stickGap, 4);
    expect(onesCol.items[2].box.x).toBeCloseTo(212 + 2 * (stickW + stickGap), 4);

    // 子项测试
    const tensSub = findSubitem(baseTenPart, props, 'tens');
    expect(tensSub).toBeDefined();
    expect(Array.isArray(tensSub)).toBe(false);
    if (tensSub && !Array.isArray(tensSub)) {
      expect(tensSub.box).toEqual(tensCol.box);
    }

    const onesSub = findSubitem(baseTenPart, props, 'ones');
    expect(onesSub).toBeDefined();
    if (onesSub && !Array.isArray(onesSub)) {
      expect(onesSub.box).toEqual(onesCol.box);
    }

    const bundleSub = findSubitem(baseTenPart, props, 'tens.1');
    expect(bundleSub).toBeDefined();
    if (bundleSub && !Array.isArray(bundleSub)) {
      expect(bundleSub.box).toEqual(bundle.box);
    }

    const stick1Sub = findSubitem(baseTenPart, props, 'ones.1');
    expect(stick1Sub).toBeDefined();
    if (stick1Sub && !Array.isArray(stick1Sub)) {
      expect(stick1Sub.box).toEqual(onesCol.items[0].box);
    }

    // 通配符查找
    const allSticks = findSubitem(baseTenPart, props, 'ones.*');
    expect(allSticks).toHaveLength(3);
  });

  it('2. 中间状态 e = 0.25、0.75 画面元素数量', () => {
    // 从 ones: 13, tens: 2 到 ones: 3, tens: 3
    // e = 0.25: 前 50% 并拢，10 根聚拢，尚未形成绳子
    const props25 = {
      at: [80, 60],
      style: 'stick' as const,
      ones: 10.5,
      tens: 2.25,
      columns: true,
      unit: 16,
    };
    const layout25 = baseTenLayout(props25);
    expect(layout25.transition).toBeDefined();
    expect(layout25.transition?.phase).toBe('gather');
    expect(layout25.transition?.hasRope).toBe(false);
    expect(layout25.transition?.movingSticks).toHaveLength(10);

    const Render = baseTenPart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;
    const rendered25 = Render({ p: props25, ctx: { theme } });
    const els25 = flatten(rendered25);

    // e = 0.25 时无移动捆绑的绳子线段
    // 绳子线段是 strokeWidth 3 且带 strokeLinecap 的 line
    const ropeLines25 = els25.filter(
      (e) => e.type === 'line' && e.props.strokeWidth === 3,
    );
    // 此时仅有原有的 2 捆上的绳子，移动组中无绳子
    expect(ropeLines25).toHaveLength(2);

    // e = 0.75: 后 50% 移动并出现绳子
    const props75 = {
      at: [80, 60],
      style: 'stick' as const,
      ones: 5.5,
      tens: 2.75,
      columns: true,
      unit: 16,
    };
    const layout75 = baseTenLayout(props75);
    expect(layout75.transition).toBeDefined();
    expect(layout75.transition?.phase).toBe('move');
    expect(layout75.transition?.hasRope).toBe(true);
    expect(layout75.transition?.movingBundle?.rope).toBeDefined();

    const rendered75 = Render({ p: props75, ctx: { theme } });
    const els75 = flatten(rendered75);

    // e = 0.75 时出现移动中的绳子（原有 2 捆各 1 根 + 移动捆 1 根 = 3 根绳子）
    const ropeLines75 = els75.filter(
      (e) => e.type === 'line' && e.props.strokeWidth === 3,
    );
    expect(ropeLines75).toHaveLength(3);
  });

  it('3. block 千位的立方体包围盒', () => {
    const unit = 16;
    const metrics = cubeMetrics(unit);

    // 棱长 160，进深 80，斜角 30 度
    // dx = 80 * cos(30°) = 40 * sqrt(3) ≈ 69.282
    // dy = 80 * sin(30°) = 40
    expect(metrics.w).toBe(160);
    expect(metrics.h).toBe(160);
    expect(metrics.dx).toBeCloseTo(40 * Math.sqrt(3), 4);
    expect(metrics.dy).toBeCloseTo(40, 4);
    expect(metrics.totalW).toBeCloseTo(160 + 40 * Math.sqrt(3), 4); // ≈ 229.282
    expect(metrics.totalH).toBeCloseTo(200, 4); // 160 + 40 = 200

    const at: [number, number] = [100, 100];
    const props = {
      at,
      style: 'block' as const,
      thousands: 1,
      columns: false,
      unit,
    };

    const layout = baseTenLayout(props);
    expect(layout.columnList).toHaveLength(1);
    const cubeItem = layout.columnList[0].items[0];

    expect(cubeItem.box.x).toBe(100);
    expect(cubeItem.box.y).toBe(100);
    expect(cubeItem.box.w).toBeCloseTo(metrics.totalW, 4);
    expect(cubeItem.box.h).toBeCloseTo(metrics.totalH, 4);

    // 全局包围盒包含整个斜二测立方体
    const bbox = baseTenPart.bbox(props);
    expect(bbox.x).toBe(100);
    expect(bbox.y).toBe(100);
    expect(bbox.w).toBeCloseTo(metrics.totalW, 4);
    expect(bbox.h).toBeCloseTo(metrics.totalH, 4);
  });

  it('4. columns: false 排列', () => {
    const at: [number, number] = [50, 50];
    const unit = 16;
    const props = {
      at,
      style: 'stick' as const,
      tens: 1,
      ones: 3,
      columns: false,
      unit,
    };

    const layout = baseTenLayout(props);
    expect(layout.columns).toBe(false);

    // 混在一起从左往右按大到小排：十位在左，个位在右
    expect(layout.columnList).toHaveLength(2);
    const [tensPart, onesPart] = layout.columnList;

    // 没有列下方标签文本
    expect(tensPart.labelBox).toBeUndefined();
    expect(onesPart.labelBox).toBeUndefined();

    // 十位起始 x = 50，宽 80
    expect(tensPart.items[0].box.x).toBe(50);
    expect(tensPart.items[0].box.w).toBe(80);

    // 每一级之间间距 unit = 16
    // 个位起始 x = 50 + 80 + 16 = 146
    expect(onesPart.items[0].box.x).toBe(146);
    expect(onesPart.items[1].box.x).toBeCloseTo(146 + 8 + 6.4, 4);
    expect(onesPart.items[2].box.x).toBeCloseTo(146 + 2 * (8 + 6.4), 4);
  });

  it('5. checkScene 校验：style 必须是 stick 或 block', () => {
    const invalidLesson: LessonLike = {
            params: {},
      stage: { width: 800, height: 450 },
      objects: [
        { id: 'b1', type: 'base-ten', style: 'circle', at: [100, 100] },
      ],
      steps: [
        { title: 's1', say: 'test', do: [] },
      ],
    };

    const issues = checkScene(invalidLesson);
    expect(issues.some((i) => i.message.includes('style 只能是 stick、block'))).toBe(true);
  });

  it('6. checkScene 校验：捆/拆时 ones 变化量不是 0 或 ±10 时报错', () => {
    const invalidStepLesson: LessonLike = {
            params: {},
      stage: { width: 800, height: 450 },
      objects: [
        { id: 'sticks', type: 'base-ten', ones: 15, tens: 1, at: [100, 100] },
      ],
      steps: [
        {
          title: 's1',
          say: 'test',
          do: [
            // 一次改了 15 根（不是 ±10）
            { set: { target: 'sticks', ones: 0, tens: 2 } },
          ],
        },
      ],
    };

    const issues = checkScene(invalidStepLesson);
    expect(
      issues.some((i) =>
        i.message.includes('十进制块一次捆或拆只能改一个十（ones 变化量应为 0 或 ±10'),
      ),
    ).toBe(true);

    const validStepLesson: LessonLike = {
            params: {},
      stage: { width: 800, height: 450 },
      objects: [
        { id: 'sticks', type: 'base-ten', ones: 13, tens: 1, at: [100, 100] },
      ],
      steps: [
        {
          title: 's1',
          say: 'test',
          do: [
            // 捆一个十：ones -10, tens +1
            { set: { target: 'sticks', ones: 3, tens: 2 } },
          ],
        },
      ],
    };

    const validIssues = checkScene(validStepLesson);
    expect(
      validIssues.some((i) =>
        i.message.includes('十进制块一次捆或拆只能改一个十'),
      ),
    ).toBe(false);
  });

  it('7. columns: true 时个数为 0 的列不画位名，其余位名在各自列正下方且包围盒不重叠', () => {
    const Render = baseTenPart.Render as (p: { p: unknown; ctx: unknown }) => ReactNode;

    const boxesOverlap = (
      a: { x: number; y: number; w: number; h: number },
      b: { x: number; y: number; w: number; h: number },
    ) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    // 场景 A：ones、tens 有值，hundreds、thousands 为 0（带完整默认 labels）
    const props = {
      at: [80, 60] as [number, number],
      style: 'stick' as const,
      ones: 3,
      tens: 1,
      hundreds: 0,
      thousands: 0,
      columns: true,
      labels: ['个', '十', '百', '千'],
      unit: 16,
    };

    const layout = baseTenLayout(props);
    const colsWithLabel = layout.columnList.filter((c) => c.labelBox !== undefined);
    expect(colsWithLabel.map((c) => c.label)).toEqual(['十', '个']);

    const [tensCol, onesCol] = colsWithLabel;
    expect(tensCol.labelBox).toBeDefined();
    expect(onesCol.labelBox).toBeDefined();
    if (tensCol.labelBox && onesCol.labelBox) {
      // 位名各自居中于所属列正下方
      expect(tensCol.labelBox.x + tensCol.labelBox.w / 2).toBeCloseTo(
        tensCol.contentBox.x + tensCol.contentBox.w / 2,
        4,
      );
      expect(onesCol.labelBox.x + onesCol.labelBox.w / 2).toBeCloseTo(
        onesCol.contentBox.x + onesCol.contentBox.w / 2,
        4,
      );
      // 两个位名包围盒不重叠
      expect(boxesOverlap(tensCol.labelBox, onesCol.labelBox)).toBe(false);
    }

    const rendered = Render({ p: props, ctx: { theme } });
    const textEls = flatten(rendered).filter((el) => el.type === 'text');
    expect(textEls.map((el) => el.props.children)).toEqual(['十', '个']);

    // 场景 B：中间列与末尾列为 0（thousands=1, hundreds=0, tens=2, ones=0）时，个数为 0 的列也不画位名
    const sparseProps = {
      at: [60, 50] as [number, number],
      style: 'block' as const,
      thousands: 1,
      hundreds: 0,
      tens: 2,
      ones: 0,
      columns: true,
      labels: ['个', '十', '百', '千'],
      unit: 12,
    };
    const sparseLayout = baseTenLayout(sparseProps);
    const sparseLabeled = sparseLayout.columnList.filter((c) => c.labelBox !== undefined);
    expect(sparseLabeled.map((c) => c.label)).toEqual(['千', '十']);
    if (sparseLabeled[0].labelBox && sparseLabeled[1].labelBox) {
      expect(boxesOverlap(sparseLabeled[0].labelBox, sparseLabeled[1].labelBox)).toBe(false);
    }
    const sparseTextEls = flatten(Render({ p: sparseProps, ctx: { theme } })).filter(
      (el) => el.type === 'text',
    );
    expect(sparseTextEls.map((el) => el.props.children)).toEqual(['千', '十']);
  });
});
