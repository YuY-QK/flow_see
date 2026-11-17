import { describe, expect, it } from 'vitest';
import { circleCutLayout } from './circlecut';
import { CUBE_NETS, solidLayout, solidPart } from './solid';

describe('solid 立体图形零件（任务卡 B24）', () => {
  it('1. PartDef 基本元信息与默认属性', () => {
    expect(solidPart.type).toBe('solid');
    expect(solidPart.name).toBe('立体图形');
    expect(solidPart.anchor).toBe('start');
    expect(solidPart.props).toContain('kind');
    expect(solidPart.props).toContain('unfold');
    expect(solidPart.props).toContain('net');
    expect(solidPart.props).toContain('water');
    expect(solidPart.props).toContain('cutT');
  });

  it('2. view 0.5 时 8 个顶点坐标', () => {
    const layout = solidLayout({
      kind: 'cuboid',
      a: 4,
      b: 3,
      h: 2,
      unit: 40,
      view: 0.5,
      at: [400, 300],
    });

    // L = 160, D = 120, H = 80
    // theta = 0.5 * 30° = 15°
    // dx = 120 * 0.5 * cos(15°) = 60 * cos(15°) ≈ 57.9555
    // dy = 120 * 0.5 * sin(15°) = 60 * sin(15°) ≈ 15.5291
    const dx = 60 * Math.cos((15 * Math.PI) / 180);
    const dy = 60 * Math.sin((15 * Math.PI) / 180);

    const [v1, v2, v3, v4, v5, v6, v7, v8] = layout.vertices;

    expect(v1[0]).toBeCloseTo(320);
    expect(v1[1]).toBeCloseTo(300);

    expect(v2[0]).toBeCloseTo(480);
    expect(v2[1]).toBeCloseTo(300);

    expect(v3[0]).toBeCloseTo(480 + dx);
    expect(v3[1]).toBeCloseTo(300 - dy);

    expect(v4[0]).toBeCloseTo(320 + dx);
    expect(v4[1]).toBeCloseTo(300 - dy);

    expect(v5[0]).toBeCloseTo(320);
    expect(v5[1]).toBeCloseTo(220);

    expect(v6[0]).toBeCloseTo(480);
    expect(v6[1]).toBeCloseTo(220);

    expect(v7[0]).toBeCloseTo(480 + dx);
    expect(v7[1]).toBeCloseTo(220 - dy);

    expect(v8[0]).toBeCloseTo(320 + dx);
    expect(v8[1]).toBeCloseTo(220 - dy);
  });

  it('3. θ 正负的可见面集合', () => {
    const pos = solidLayout({ view: 0.5 });
    expect(pos.visibleFaces).toEqual(['front', 'top', 'right']);

    const neg = solidLayout({ view: -0.5 });
    expect(neg.visibleFaces).toEqual(['front', 'top', 'left']);

    const zero = solidLayout({ view: 0 });
    expect(zero.visibleFaces).toEqual(['front']);
  });

  it('4. unfold 0 / 0.5 / 1 时前面四个顶点坐标', () => {
    const at = [400, 300] as const;
    const a = 4;
    const b = 3;
    const h = 2;
    const unit = 40;
    // unfold = 0
    const l0 = solidLayout({ kind: 'cuboid', a, b, h, unit, view: 0.5, unfold: 0, at });
    const f0 = l0.faces.front.points;
    expect(f0[0]).toEqual([320, 300]); // v1
    expect(f0[1]).toEqual([480, 300]); // v2
    expect(f0[2]).toEqual([480, 220]); // v6
    expect(f0[3]).toEqual([320, 220]); // v5

    // unfold = 1
    const l1 = solidLayout({ kind: 'cuboid', a, b, h, unit, view: 0.5, unfold: 1, at });
    const f1 = l1.faces.front.points;
    expect(f1[0]).toEqual([320, 300]);
    expect(f1[1]).toEqual([480, 300]);
    expect(f1[2][0]).toBeCloseTo(480);
    expect(f1[2][1]).toBeCloseTo(380); // 300 + H (80)
    expect(f1[3][0]).toBeCloseTo(320);
    expect(f1[3][1]).toBeCloseTo(380);

    // unfold = 0.5
    const lHalf = solidLayout({ kind: 'cuboid', a, b, h, unit, view: 0.5, unfold: 0.5, at });
    const fHalf = lHalf.faces.front.points;
    expect(fHalf[0]).toEqual([320, 300]);
    expect(fHalf[1]).toEqual([480, 300]);

    // 理论推导:
    // u = 0.5, effTheta = 7.5 deg
    // phi = 45 deg, yFrontRot = 80 * cos(45°), zFrontRot = -80 * sin(45°)
    const effTheta = (7.5 * Math.PI) / 180;
    const zProjX = 0.5 * Math.cos(effTheta) * 0.5;
    const zProjY = 0.5 * Math.sin(effTheta) * 0.5 + 0.5;
    const yFrontRot = 80 * Math.cos(Math.PI / 4);
    const zFrontRot = -80 * Math.sin(Math.PI / 4);
    const expPx5 = -80 + zFrontRot * zProjX;
    const expPx6 = 80 + zFrontRot * zProjX;
    const expPy = yFrontRot * 0.5 + zFrontRot * zProjY;

    expect(fHalf[3][0]).toBeCloseTo(400 + expPx5);
    expect(fHalf[3][1]).toBeCloseTo(300 - expPy);
    expect(fHalf[2][0]).toBeCloseTo(400 + expPx6);
    expect(fHalf[2][1]).toBeCloseTo(300 - expPy);
  });

  it('5. net 1–11 展开后 6 个面的网格位置（与常量表一致）并且不重叠', () => {
    expect(CUBE_NETS).toHaveLength(11);

    for (let netId = 1; netId <= 11; netId++) {
      const netDef = CUBE_NETS[netId - 1];
      expect(netDef.id).toBe(netId);

      const faceNames = ['bottom', 'top', 'front', 'back', 'left', 'right'] as const;
      const seenCoords = new Set<string>();

      for (const f of faceNames) {
        const coord = netDef.grid[f];
        expect(coord).toBeDefined();
        const key = `${coord[0]},${coord[1]}`;
        expect(seenCoords.has(key)).toBe(false); // 不重叠
        seenCoords.add(key);
      }

      // 测试在 unfold: 1 下布局各面不重叠且数量为 6
      const layout = solidLayout({
        kind: 'cube',
        a: 2,
        unit: 40,
        unfold: 1,
        net: netId,
      });

      const faceCenters = faceNames.map((fn) => layout.faces[fn].center);
      const centerKeys = new Set(faceCenters.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`));
      expect(centerKeys.size).toBe(6);
    }
  });

  it('6. 圆柱展开长方形的长 = 2πr × unit', () => {
    const r = 2;
    const unit = 40;
    const layout = solidLayout({
      kind: 'cylinder',
      r,
      unit,
      h: 3,
      unfold: 1,
    });

    const expectedWidth = 2 * Math.PI * r * unit;
    expect(layout.cylinder?.unfoldedRect).toBeDefined();
    expect(layout.cylinder!.unfoldedRect!.w).toBeCloseTo(expectedWidth, 3);
  });

  it('7. cutT 1 时近似长方体的长', () => {
    const r = 2;
    const unit = 40;
    const cutParts = 16;
    const layout = solidLayout({
      kind: 'cylinder',
      r,
      unit,
      h: 3,
      cutParts,
      cutT: 1,
    });

    const cutL = circleCutLayout({ radius: r * unit, parts: cutParts });
    expect(layout.cylinderCut).toBeDefined();
    expect(layout.cylinderCut!.length).toBeCloseTo(cutL.stripW, 3);
  });

  it('8. water 0.5 水面高度', () => {
    const layout = solidLayout({
      kind: 'cuboid',
      h: 4,
      unit: 40,
      water: 0.5,
    });

    expect(layout.water).toBe(0.5);
    expect(layout.waterHeight).toBe(4 * 0.5 * 40); // 80px
    expect(layout.waterSurface).toBeDefined();
    expect(layout.waterSurface?.kind).toBe('poly');
  });

  it('9. 包围盒（unfold 1 时包含整张展开图）', () => {
    // 长方体展开包围盒测试
    const cuboidUnfolded = solidLayout({
      kind: 'cuboid',
      a: 4,
      b: 3,
      h: 2,
      unit: 40,
      unfold: 1,
      at: [400, 300],
    });

    const bbox = cuboidUnfolded.bbox;
    // 检查所有展开面多边形顶点均在 bbox 内部
    for (const f of Object.values(cuboidUnfolded.faces)) {
      for (const [px, py] of f.points) {
        expect(px).toBeGreaterThanOrEqual(bbox.x - 1e-4);
        expect(px).toBeLessThanOrEqual(bbox.x + bbox.w + 1e-4);
        expect(py).toBeGreaterThanOrEqual(bbox.y - 1e-4);
        expect(py).toBeLessThanOrEqual(bbox.y + bbox.h + 1e-4);
      }
    }

    // 圆柱展开包围盒测试
    const cylinderUnfolded = solidLayout({
      kind: 'cylinder',
      r: 2,
      h: 3,
      unit: 40,
      unfold: 1,
      at: [400, 300],
    });
    const cBox = cylinderUnfolded.bbox;
    const rect = cylinderUnfolded.cylinder!.unfoldedRect!;
    expect(rect.x).toBeGreaterThanOrEqual(cBox.x);
    expect(rect.x + rect.w).toBeLessThanOrEqual(cBox.x + cBox.w);
  });

  it('10. 圆锥和球的几何与子项', () => {
    const cone = solidLayout({ kind: 'cone', r: 2, h: 4, unit: 40 });
    expect(cone.subitems.some((s) => s.name === 'height')).toBe(true);
    expect(cone.subitems.some((s) => s.name === 'face.bottom')).toBe(true);
    expect(cone.subitems.some((s) => s.name === 'face.side')).toBe(true);

    const sphere = solidLayout({ kind: 'sphere', r: 3, unit: 40 });
    expect(sphere.subitems.some((s) => s.name === 'face.side')).toBe(true);
    expect(sphere.sphere?.r).toBe(120);
  });
});
