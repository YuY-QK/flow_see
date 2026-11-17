import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import { checkScene } from '../../../templates/src/scene/check';
import type { LessonLike } from '../../../runtime/src/template';
import {
  rulerLayout,
  rulerPart,
  rulerX,
  type RulerLayout,
} from '../index';
import type { Box, PartContext } from '../base';

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

const mockCtx: PartContext = {
  theme,
  assetUrl: (id: string) => (id === 'pencil' ? 'https://assets/pencil.svg' : undefined),
};

describe('B10 直尺零件（ruler）', () => {
  describe('1. 各主刻度与分度线位置精确计算', () => {
    it('标准 0-10 cm 尺子（长度 600，minor 10）：主刻度、中刻度与小刻度位置', () => {
      const p = {
        at: [100, 200] as [number, number],
        from: 0,
        to: 10,
        unit: 'cm',
        length: 600,
        minor: 10,
      };

      const layout: RulerLayout = rulerLayout(p);

      expect(layout.at).toEqual([100, 200]);
      expect(layout.length).toBe(600);
      expect(layout.rulerHeight).toBe(60);
      expect(layout.bodyBox).toEqual({ x: 100, y: 200, w: 600, h: 60 });

      // 总步数：10 * 10 = 100 格，101 个刻度线
      expect(layout.ticks).toHaveLength(101);

      // 主刻度：共 11 个（0 到 10）
      const majorTicks = layout.ticks.filter((t) => t.kind === 'major');
      expect(majorTicks).toHaveLength(11);

      // 验证第 0 个主刻度（刻度 0）：x = 100
      expect(majorTicks[0].value).toBe(0);
      expect(majorTicks[0].x).toBe(100);
      expect(majorTicks[0].height).toBe(24);
      expect(majorTicks[0].strokeWidth).toBe(2);
      expect(majorTicks[0].label).toBe('0');

      // 验证第 1 个主刻度（刻度 1）：x = 100 + 60 = 160
      expect(majorTicks[1].value).toBe(1);
      expect(majorTicks[1].x).toBe(160);
      expect(majorTicks[1].label).toBe('1');

      // 验证最后一个主刻度（刻度 10）：x = 100 + 600 = 700
      expect(majorTicks[10].value).toBe(10);
      expect(majorTicks[10].x).toBe(700);
      expect(majorTicks[10].label).toBe('10');

      // 中刻度（第 5 小格）：如 0.5，x = 100 + 30 = 130
      const midTicks = layout.ticks.filter((t) => t.kind === 'mid');
      expect(midTicks).toHaveLength(10); // 每个大格内各 1 个中刻度
      expect(midTicks[0].value).toBe(0.5);
      expect(midTicks[0].x).toBe(130);
      expect(midTicks[0].height).toBe(16);
      expect(midTicks[0].strokeWidth).toBe(1.5);
      expect(midTicks[0].label).toBeUndefined();

      // 小刻度：如 0.1，x = 100 + 6 = 106
      const minorTicks = layout.ticks.filter((t) => t.kind === 'minor');
      expect(minorTicks).toHaveLength(80); // 100 - 11 - 10 = 80（每个大格 8 个小刻度）
      expect(minorTicks[0].value).toBe(0.1);
      expect(minorTicks[0].x).toBe(106);
      expect(minorTicks[0].height).toBe(10);
      expect(minorTicks[0].strokeWidth).toBe(1);

      // 验证单位标签位于尺子右端
      expect(layout.unitLabel.text).toBe('cm');
      expect(layout.unitLabel.x).toBe(100 + 600 - 16);
    });

    it('自定义刻度范围与步长（from: 2, to: 6, length: 400, minor: 4）', () => {
      const p = {
        at: [0, 0] as [number, number],
        from: 2,
        to: 6,
        length: 400,
        minor: 4,
      };
      const layout = rulerLayout(p);
      expect(layout.ticks).toHaveLength(17); // 4 个大格 * 4 + 1 = 17

      const majors = layout.ticks.filter((t) => t.kind === 'major');
      expect(majors.map((m) => m.value)).toEqual([2, 3, 4, 5, 6]);
      expect(majors.map((m) => m.x)).toEqual([0, 100, 200, 300, 400]);

      // 中刻度（第 2 小格，4 / 2 = 2）：2.5 对应 x = 50
      const mids = layout.ticks.filter((t) => t.kind === 'mid');
      expect(mids[0].value).toBe(2.5);
      expect(mids[0].x).toBe(50);
      expect(mids[0].height).toBe(16);
    });

    it('rulerX 独立函数测试', () => {
      const p = { at: [50, 100] as [number, number], from: 0, to: 10, length: 500 };
      expect(rulerX(p, 0)).toBe(50);
      expect(rulerX(p, 2)).toBe(150);
      expect(rulerX(p, 5.5)).toBe(325);
      expect(rulerX(p, 10)).toBe(550);
    });
  });

  describe('2. objectFrom = 2 时物体的左端 x 坐标对齐测试', () => {
    it('objectFrom: 2, objectLength: 3 矩形物体对齐在刻度 2', () => {
      const p = {
        at: [40, 120] as [number, number],
        from: 0,
        to: 10,
        length: 600,
        objectShape: 'rect',
        objectFrom: 2,
        objectLength: 3,
        objectColor: 'orange',
      };

      const layout = rulerLayout(p);
      expect(layout.object).toBeDefined();

      const obj = layout.object!;
      // x 坐标应精确对齐刻度 2：40 + (2/10) * 600 = 160
      expect(obj.x).toBe(160);
      // 宽度为 3 个单位：(3/10) * 600 = 180
      expect(obj.width).toBe(180);
      // 物体画在尺子上方 8 像素：尺子 y 为 120，物体底部为 120 - 8 = 112，y 为 112 - 36 = 76
      expect(obj.y).toBe(76);
      expect(obj.height).toBe(36);
      expect(obj.color).toBe('orange');
      expect(obj.shape).toBe('rect');
    });

    it('未指定 objectAsset 或 objectShape 时，不布局物体', () => {
      const p = {
        at: [0, 0] as [number, number],
        from: 0,
        to: 10,
        length: 600,
        objectFrom: 2,
      };
      const layout = rulerLayout(p);
      expect(layout.object).toBeUndefined();
    });

    it('指定素材 objectAsset: "pencil" 时正确传入 asset', () => {
      const p = {
        at: [40, 160] as [number, number],
        from: 0,
        to: 12,
        length: 720,
        objectAsset: 'pencil',
        objectFrom: 0,
        objectLength: 6,
      };
      const layout = rulerLayout(p);
      expect(layout.object).toBeDefined();
      expect(layout.object!.asset).toBe('pencil');
      expect(layout.object!.x).toBe(40);
      expect(layout.object!.width).toBe(360); // 6 / 12 * 720 = 360
    });
  });

  describe('3. 放大镜 clipPath 区域及局部放大渲染测试', () => {
    it('zoomScale = 1 时不启用放大镜', () => {
      const p = {
        at: [40, 120] as [number, number],
        from: 0,
        to: 10,
        length: 600,
        zoomAt: 3,
        zoomScale: 1,
      };
      const layout = rulerLayout(p);
      expect(layout.magnifier).toBeUndefined();
    });

    it('zoomScale = 5, zoomAt = 3 时，放大镜几何布局与 clipCircle', () => {
      const p = {
        at: [40, 120] as [number, number],
        from: 0,
        to: 10,
        length: 600,
        zoomAt: 3,
        zoomScale: 5,
      };
      const layout = rulerLayout(p);
      expect(layout.magnifier).toBeDefined();

      const mag = layout.magnifier!;
      // 放大镜中心水平对齐刻度 3：40 + (3/10) * 600 = 220
      expect(mag.cx).toBe(220);
      // 垂直位置在尺子上方：120 - 50 = 70
      expect(mag.cy).toBe(70);
      expect(mag.r).toBe(70);
      expect(mag.scale).toBe(5);

      // 验证剪裁圆 clipCircle
      expect(mag.clipCircle).toEqual({
        cx: 220,
        cy: 70,
        r: 68,
      });

      // 验证 45° 手柄坐标
      const cos45 = Math.SQRT1_2;
      expect(mag.handle.x1).toBeCloseTo(220 + 70 * cos45, 3);
      expect(mag.handle.y1).toBeCloseTo(70 + 70 * cos45, 3);
      expect(mag.handle.x2).toBeCloseTo(220 + 130 * cos45, 3);
      expect(mag.handle.y2).toBeCloseTo(70 + 130 * cos45, 3);
      expect(mag.handle.strokeWidth).toBe(10);
    });

    it('Render 中正确生成 clipPath 剪裁与局部放大 transform', () => {
      const p = {
        id: 'r1',
        at: [40, 120] as [number, number],
        from: 0,
        to: 10,
        length: 600,
        zoomAt: 3,
        zoomScale: 5,
      };

      const Render = rulerPart.Render as unknown as (a: { p: Record<string, unknown>; ctx: PartContext }) => ReactNode;
      const vnode = Render({ p, ctx: mockCtx });
      const els = flatten(vnode);

      // 查找 clipPath 节点
      const clipPathEl = els.find((el) => el.type === 'clipPath');
      expect(clipPathEl).toBeDefined();
      expect(clipPathEl?.props.id).toContain('ruler-zoom-clip-r1');

      // 查找剪裁圆
      const clipCircle = flatten(clipPathEl?.props.children as ReactNode).find(
        (el) => el.type === 'circle',
      );
      expect(clipCircle).toBeDefined();
      expect(clipCircle?.props.cx).toBe(220);
      expect(clipCircle?.props.cy).toBe(70);
      expect(clipCircle?.props.r).toBe(68);

      // 查找带 clipPath 引用的剪裁分组
      const clippedGroup = els.find(
        (el) =>
          typeof el.props.clipPath === 'string' &&
          el.props.clipPath.includes('ruler-zoom-clip-r1'),
      );
      expect(clippedGroup).toBeDefined();

      // 查找带缩放变换的分组
      const transformGroup = els.find(
        (el) =>
          typeof el.props.transform === 'string' &&
          el.props.transform.includes('scale(5)'),
      );
      expect(transformGroup).toBeDefined();
      expect(transformGroup?.props.transform).toBe(
        'translate(220, 70) scale(5) translate(-220, -120)',
      );
    });
  });

  describe('4. 把手 valueAt 坐标到刻度转换函数精度测试', () => {
    it('存在物体时提供 objectFrom 把手，且 valueAt 换算精度正确', () => {
      const p = {
        at: [40, 120] as [number, number],
        from: 0,
        to: 10,
        length: 600,
        objectShape: 'rect',
        objectFrom: 2,
        objectLength: 3,
      };

      const handles = rulerPart.handles!(p);
      expect(handles).toHaveLength(1);

      const h = handles[0];
      expect(h.prop).toBe('objectFrom');
      expect(h.kind).toBe('drag');
      expect(h.min).toBe(0);
      expect(h.max).toBe(10);
      // 把手 at 处于物体左端垂直居中处：x = 160, y = 76 + 18 = 94
      expect(h.at).toEqual([160, 94]);

      // 精度测试：
      // pointer 位于 40px（0 刻度）=> 0
      expect(h.valueAt([40, 94])).toBe(0);

      // pointer 位于 160px（刻度 2）=> 2
      expect(h.valueAt([160, 94])).toBe(2);

      // pointer 位于 340px（刻度 5）=> 5
      expect(h.valueAt([340, 94])).toBe(5);

      // pointer 位于 490px（刻度 7.5）=> 7.5
      expect(h.valueAt([490, 94])).toBe(7.5);

      // pointer 位于 640px（刻度 10）=> 10
      expect(h.valueAt([640, 94])).toBe(10);

      // 边界 clamp 测试：
      expect(h.valueAt([0, 94])).toBe(0); // 小于 0 刻度
      expect(h.valueAt([800, 94])).toBe(10); // 超出 10 刻度
    });

    it('无物体时不提供 objectFrom 把手', () => {
      const p = {
        at: [40, 120] as [number, number],
        from: 0,
        to: 10,
        length: 600,
      };
      const handles = rulerPart.handles!(p);
      expect(handles).toHaveLength(0);
    });
  });

  describe('5. 子项（subitems）测试', () => {
    it('正确生成主刻度子项 tick.<数> 与物体子项 object', () => {
      const p = {
        at: [100, 100] as [number, number],
        from: 0,
        to: 5,
        length: 500,
        objectShape: 'rect',
        objectFrom: 1,
        objectLength: 2,
      };

      const subs = rulerPart.subitems!(p);
      const names = subs.map((s) => s.name);

      // 必须包含各刻度
      expect(names).toContain('tick.0');
      expect(names).toContain('tick.1');
      expect(names).toContain('tick.2');
      expect(names).toContain('tick.3');
      expect(names).toContain('tick.4');
      expect(names).toContain('tick.5');

      // 必须包含 object
      expect(names).toContain('object');

      // 校验 tick.1 的 box（至少 40 × 40）
      const tick1 = subs.find((s) => s.name === 'tick.1')!;
      expect(tick1.value).toBe(1);
      expect(tick1.box.w).toBeGreaterThanOrEqual(40);
      expect(tick1.box.h).toBeGreaterThanOrEqual(40);
      // tick.1 中心 x 应为 100 + (1/5)*500 = 200
      expect(tick1.box.x + tick1.box.w / 2).toBe(200);

      // 校验 object 的 box
      const objSub = subs.find((s) => s.name === 'object')!;
      expect(objSub.box.x).toBe(200);
      expect(objSub.box.w).toBe(200);
    });
  });

  describe('6. 包围盒（bbox）测试', () => {
    it('包围盒完全容纳尺身、上方物体及放大镜手柄', () => {
      const p = {
        at: [100, 200] as [number, number],
        from: 0,
        to: 10,
        length: 600,
        objectShape: 'rect',
        objectFrom: 2,
        objectLength: 3,
        zoomAt: 8,
        zoomScale: 2,
      };

      const bbox: Box = rulerPart.bbox(p);

      // 尺身 x 范围: 100 ~ 700, y: 200 ~ 260
      // 物体 y 范围: 200 - 8 - 36 = 156 ~ 192
      // 放大镜中心: cx = 100 + 480 = 580, cy = 150
      // 放大镜圆顶: cy - 70 = 80
      // 放大镜手柄末端: y 约为 150 + 130 * 0.7071 ≈ 242

      expect(bbox.x).toBeLessThanOrEqual(100);
      expect(bbox.y).toBeLessThanOrEqual(80);
      expect(bbox.x + bbox.w).toBeGreaterThanOrEqual(700);
      expect(bbox.y + bbox.h).toBeGreaterThanOrEqual(260);
    });
  });

  describe('7. 多主题支持与无硬编码颜色', () => {
    it('在 flat, chalk, cute, pro 四种主题下都能正常渲染', () => {
      const themes = ['flat', 'chalk', 'cute', 'pro'] as const;
      const p = {
        at: [0, 0] as [number, number],
        from: 0,
        to: 10,
        length: 600,
        objectShape: 'rect',
        objectFrom: 1,
        objectLength: 2,
        zoomAt: 3,
        zoomScale: 2,
      };

      const Render = rulerPart.Render as unknown as (a: { p: Record<string, unknown>; ctx: PartContext }) => ReactNode;
      for (const tid of themes) {
        const t = getTheme(tid);
        const vnode = Render({ p, ctx: { theme: t } });
        expect(isValidElement(vnode)).toBe(true);

        const els = flatten(vnode);
        // 尺身 rect
        const bodyRect = els.find((el) => el.type === 'rect' && el.props.width === 600);
        expect(bodyRect).toBeDefined();
        // 确保颜色跟随主题
        expect(bodyRect?.props.stroke).toBe(t.line);
      }
    });
  });

  describe('8. checkScene 场景属性校验测试', () => {
    it('正确配置的 ruler 零件通过 checkScene', () => {
      const lesson: LessonLike = {
        params: {},
        steps: [{ title: '第一步', say: '看直尺' }],
        stage: { width: 800, height: 420 },
        objects: [
          {
            id: 'r',
            type: 'ruler',
            from: 0,
            to: 10,
            unit: 'cm',
            length: 600,
            minor: 10,
            zoomAt: 2,
            zoomScale: 2,
            objectFrom: 0,
            objectLength: 3,
            at: [40, 120],
          },
        ],
      };
      const issues = checkScene(lesson);
      expect(issues).toHaveLength(0);
    });

    it('from >= to 时报错', () => {
      const lesson: LessonLike = {
        params: {},
        steps: [{ title: '步', say: '说' }],
        objects: [{ id: 'r', type: 'ruler', from: 10, to: 5, at: [0, 0] }],
      };
      const issues = checkScene(lesson);
      expect(issues.some((i) => i.message.includes('from 必须小于 to'))).toBe(true);
    });

    it('非法 unit 时报错', () => {
      const lesson: LessonLike = {
        params: {},
        steps: [{ title: '步', say: '说' }],
        objects: [{ id: 'r', type: 'ruler', unit: 'meter', at: [0, 0] }],
      };
      const issues = checkScene(lesson);
      expect(issues.some((i) => i.message.includes('unit 只能是'))).toBe(true);
    });

    it('zoomScale < 1 时报错', () => {
      const lesson: LessonLike = {
        params: {},
        steps: [{ title: '步', say: '说' }],
        objects: [{ id: 'r', type: 'ruler', zoomScale: 0.5, at: [0, 0] }],
      };
      const issues = checkScene(lesson);
      expect(issues.some((i) => i.message.includes('zoomScale 不能小于 1'))).toBe(true);
    });
  });
});
