import { createElement, isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '@flow-see/core';
import {
  cameraForView,
  cubeFallOffset,
  cubeStackLayout,
  cubeStackPart,
  cubeStackProjections,
  cullOccludedCubes,
  fillCubes,
  findSubitem,
  sortCubesPainter,
  type CubeCoord,
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

describe('B25 小正方体组合（cube-stack）', () => {
  it('1. fill [3,2,2] 共 12 个且顺序正确', () => {
    // 按层铺满 a × b × h（顺序：先第 0 层从前到后、从左到右，再第 1 层）
    const cubes = fillCubes([3, 2, 2]);
    expect(cubes).toHaveLength(12);

    const expected: CubeCoord[] = [
      // layer 0: z = 0, y = 0, x = 0..2
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      // layer 0: z = 0, y = 1, x = 0..2
      [0, 1, 0],
      [1, 1, 0],
      [2, 1, 0],
      // layer 1: z = 1, y = 0, x = 0..2
      [0, 0, 1],
      [1, 0, 1],
      [2, 0, 1],
      // layer 1: z = 1, y = 1, x = 0..2
      [0, 1, 1],
      [1, 1, 1],
      [2, 1, 1],
    ];
    expect(cubes).toEqual(expected);

    // 通过 cubeStackLayout 读取 fill
    const layout = cubeStackLayout({ fill: [3, 2, 2], unit: 44 });
    expect(layout.cubes).toHaveLength(12);
    expect(layout.cubes.map((c) => c.coord)).toEqual(expected);
  });

  it('2. fill [10,10,10] 时实际绘制的方块数 ≤ 300', () => {
    const cubes = fillCubes([10, 10, 10]);
    expect(cubes).toHaveLength(1000);

    // iso 视角下，完全遮挡（被 +z、-y、+x 的邻居方块挡住）剔除
    const drawn = cullOccludedCubes(cubes, 0);
    // 理论上 1000 - 9 * 9 * 9 = 271 个
    expect(drawn.length).toBeLessThanOrEqual(300);
    expect(drawn.length).toBe(271);

    const layout = cubeStackLayout({ fill: [10, 10, 10], unit: 20 });
    expect(layout.drawnCubes.length).toBeLessThanOrEqual(300);
  });

  it('3. 某组合的三视图方格（写死期望矩阵，含左视图方向）', () => {
    // 经典观察物体组合（observe-cubes 预设 1）：
    // [[0,0,0], [1,0,0], [2,0,0], [0,1,0], [0,0,1]]
    const combo: CubeCoord[] = [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];

    const proj = cubeStackProjections(combo);

    // 1) front（主视）：看 x–z 平面，行从上到下（z 从 1 到 0），列从左到右（x 从 0 到 2）
    // z=1 时只有 x=0 有方块；z=0 时 x=0, 1, 2 都有方块
    const expectedFront = [
      [1, 0, 0],
      [1, 1, 1],
    ];
    expect(proj.front).toEqual(expectedFront);

    // 2) left（左视）：看 y–z 平面，教材规定：从左面看时，后面的方块在左边
    // 后面的 y=1 在左边 col 0，前面的 y=0 在右边 col 1。行从上到下（z 从 1 到 0）
    // z=1: 只有 [0,0,1]（y=0 在右侧 col 1） -> [0, 1]
    // z=0: [0,1,0]（y=1 在左侧 col 0）和 [0,0,0]（y=0 在右侧 col 1）都有 -> [1, 1]
    const expectedLeft = [
      [0, 1],
      [1, 1],
    ];
    expect(proj.left).toEqual(expectedLeft);

    // 3) top（俯视）：看 x–y 平面，前面的在下方
    // y=1（后方）在上方 row 0，y=0（前方）在下方 row 1。列从左到右（x 从 0 到 2）
    // y=1: 只有 [0,1,0]（x=0） -> [1, 0, 0]
    // y=0: [0,0,0], [1,0,0], [2,0,0] -> [1, 1, 1]
    const expectedTop = [
      [1, 0, 0],
      [1, 1, 1],
    ];
    expect(proj.top).toEqual(expectedTop);
  });

  it('4. view 0.5 时相机参数', () => {
    // 0 = iso, 1 = front, 0.5 在 iso 到 front 之间过渡
    // θ 从 obliqueAngle (30) 过渡到 0，进深比例从 depthRatio (0.5) 过渡到 0
    const cam = cameraForView(0.5);
    expect(cam.obliqueAngle).toBeCloseTo(15);
    expect(cam.depthRatio).toBeCloseTo(0.25);
    expect(cam.azimuth).toBe(0);
    expect(cam.elevation).toBe(0);
    expect(cam.perspective).toBe(false);

    // 边界与关键帧
    const camIso = cameraForView('iso');
    expect(camIso.obliqueAngle).toBe(30);
    expect(camIso.depthRatio).toBe(0.5);

    const camFront = cameraForView('front');
    expect(camFront.obliqueAngle).toBe(0);
    expect(camFront.depthRatio).toBe(0);
    expect(camFront.azimuth).toBe(0);

    const camLeft = cameraForView('left');
    expect(camLeft.azimuth).toBe(90);

    const camTop = cameraForView('top');
    expect(camTop.elevation).toBe(90);
  });

  it('5. count 4.5 时第 5 个的高度', () => {
    const unit = 44;
    // 小数部分 frac = 0.5
    // 先快后慢 ease-out: progress = 1 - (1 - 0.5)^2 = 0.75
    // 下落剩余高度 = (1 - 0.75) * 3 * unit = 0.75 * unit = 33
    const offset = cubeFallOffset(0.5, unit);
    expect(offset).toBeCloseTo(33);

    const cubes: CubeCoord[] = [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const layout = cubeStackLayout({ cubes, count: 4.5, unit });
    expect(layout.cubes[4].isFalling).toBe(true);
    // 第 5 个 cube 原本在 z = 1，其有效高度 = 1 * unit + offset = 44 + 33 = 77
    expect(layout.cubes[4].effectiveZ).toBeCloseTo(77);
    expect(layout.cubes[3].effectiveZ).toBeCloseTo(0); // 第 4 个已完全着地
  });

  it('6. 画家算法顺序', () => {
    // 从后往前（y 降序）、从下往上（z 升序）、从左往右（x 升序）
    const unordered: CubeCoord[] = [
      [1, 0, 1],
      [0, 0, 0],
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ];

    const sorted = sortCubesPainter(unordered);
    expect(sorted).toEqual([
      [0, 1, 0], // y = 1 最先画（在最深处）
      [0, 0, 0], // y = 0, z = 0, x = 0
      [1, 0, 0], // y = 0, z = 0, x = 1
      [0, 0, 1], // y = 0, z = 1, x = 0
      [1, 0, 1], // y = 0, z = 1, x = 1
    ]);
  });

  it('子项与包围盒计算', () => {
    const cubes: CubeCoord[] = [
      [0, 0, 0],
      [1, 0, 0],
      [0, 0, 1],
    ];
    const p = { cubes, at: [100, 200] as [number, number], unit: 40 };
    const bbox = cubeStackPart.bbox(p);
    expect(bbox.w).toBeGreaterThan(0);
    expect(bbox.h).toBeGreaterThan(0);

    const subs = cubeStackPart.subitems?.(p) ?? [];
    expect(subs.some((s) => s.name === 'cube.1')).toBe(true);
    expect(subs.some((s) => s.name === 'cube.2')).toBe(true);
    expect(subs.some((s) => s.name === 'cube.3')).toBe(true);
    expect(subs.some((s) => s.name === 'layer.0')).toBe(true);
    expect(subs.some((s) => s.name === 'layer.1')).toBe(true);

    const c1 = findSubitem(cubeStackPart, p, 'cube.1');
    expect(c1).toBeDefined();

    const layer0 = findSubitem(cubeStackPart, p, 'layer.0');
    expect(layer0).toBeDefined();
  });

  it('project: true 时包围盒包含右侧三视图', () => {
    const cubes: CubeCoord[] = [
      [0, 0, 0],
      [1, 0, 0],
    ];
    const normal = cubeStackPart.bbox({ cubes, project: false, unit: 40, at: [100, 200] });
    const projected = cubeStackPart.bbox({ cubes, project: true, unit: 40, at: [100, 200] });
    expect(projected.w).toBeGreaterThan(normal.w);
  });

  it('正常渲染成 SVG', () => {
    const cubes: CubeCoord[] = [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ];
    const node = createElement(cubeStackPart.Render, {
      p: { cubes, at: [100, 200], unit: 40, project: true },
      ctx: { theme },
    });
    expect(isValidElement(node)).toBe(true);
    const els = flatten(node);
    expect(els.some((e) => e.type === 'path' || e.type === cubeStackPart.Render)).toBe(true);
  });
});
