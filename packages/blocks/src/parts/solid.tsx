// 立体图形零件（伪 3D）：长方体、正方体、展开图、圆柱、圆锥、球、水深、旋转扫出、切拼。
import type { ComponentType } from 'react';
import {
  boxAround,
  color,
  mixColor,
  num,
  pt,
  str,
  textWidth,
  type Box,
  type PartContext,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';
import { sceneStyle } from '../style';
import { circleCutLayout, type CircleCutLayout } from './circlecut';
import { richSpans } from './text';

export type SolidKind = 'cuboid' | 'cube' | 'cylinder' | 'cone' | 'sphere';
export type FaceName = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right' | 'side';

export interface CubeNet {
  id: number;
  type: '1-4-1' | '2-3-1' | '2-2-2' | '3-3';
  grid: Record<'bottom' | 'top' | 'front' | 'back' | 'left' | 'right', [number, number]>;
}

/**
 * 正方体 11 种标准展开图网格坐标表（几何常量，来源：人教版小学数学五年级下册）
 * 1-4-1 型 6 种（1–6），2-3-1 型 3 种（7–9），2-2-2 型 1 种（10），3-3 型 1 种（11）
 */
export const CUBE_NETS: readonly CubeNet[] = [
  // 1-4-1 型（6 种）：中间 4 个一排（left(0,1), bottom(1,1), right(2,1), top(3,1)），两边各 1 个
  {
    id: 1,
    type: '1-4-1',
    grid: { left: [0, 1], bottom: [1, 1], right: [2, 1], top: [3, 1], back: [0, 0], front: [0, 2] },
  },
  {
    id: 2,
    type: '1-4-1',
    grid: { left: [0, 1], bottom: [1, 1], right: [2, 1], top: [3, 1], back: [0, 0], front: [1, 2] },
  },
  {
    id: 3,
    type: '1-4-1',
    grid: { left: [0, 1], bottom: [1, 1], right: [2, 1], top: [3, 1], back: [0, 0], front: [2, 2] },
  },
  {
    id: 4,
    type: '1-4-1',
    grid: { left: [0, 1], bottom: [1, 1], right: [2, 1], top: [3, 1], back: [0, 0], front: [3, 2] },
  },
  {
    id: 5,
    type: '1-4-1',
    grid: { left: [0, 1], bottom: [1, 1], right: [2, 1], top: [3, 1], back: [1, 0], front: [1, 2] },
  },
  {
    id: 6,
    type: '1-4-1',
    grid: { left: [0, 1], bottom: [1, 1], right: [2, 1], top: [3, 1], back: [1, 0], front: [2, 2] },
  },
  // 2-3-1 型（3 种）：上 2、中 3、下 1
  {
    id: 7,
    type: '2-3-1',
    grid: { top: [0, 0], back: [1, 0], bottom: [1, 1], right: [2, 1], front: [3, 1], left: [1, 2] },
  },
  {
    id: 8,
    type: '2-3-1',
    grid: { top: [0, 0], back: [1, 0], bottom: [1, 1], right: [2, 1], front: [3, 1], left: [2, 2] },
  },
  {
    id: 9,
    type: '2-3-1',
    grid: { top: [0, 0], back: [1, 0], bottom: [1, 1], right: [2, 1], front: [3, 1], left: [3, 2] },
  },
  // 2-2-2 型（1 种）：三级台阶状
  {
    id: 10,
    type: '2-2-2',
    grid: { top: [0, 0], back: [1, 0], left: [1, 1], bottom: [2, 1], right: [2, 2], front: [3, 2] },
  },
  // 3-3 型（1 种）：两级台阶状
  {
    id: 11,
    type: '3-3',
    grid: { top: [0, 0], back: [1, 0], left: [2, 0], bottom: [1, 1], right: [2, 1], front: [3, 1] },
  },
];

export interface SolidFaceDef {
  name: FaceName;
  points: Point[];
  center: Point;
  visible: boolean;
  box: Box;
}

export interface SolidEdgeDef {
  index: number;
  from: Point;
  to: Point;
  visible: boolean;
  box: Box;
}

export interface SolidLayoutResult {
  kind: SolidKind;
  at: Point;
  a: number;
  b: number;
  h: number;
  r: number;
  unit: number;
  view: number;
  theta: number;
  unfold: number;
  net: number;
  water: number;
  waterHeight: number;
  sweep: number;
  cutParts: number;
  cutT: number;
  hiddenEdges: boolean;
  visibleFaces: FaceName[];
  vertices: Point[];
  edges: SolidEdgeDef[];
  faces: Record<string, SolidFaceDef>;
  subitems: Subitem[];
  bbox: Box;
  // 曲线几何信息
  cylinder?: {
    rx: number;
    ry: number;
    bottomCenter: Point;
    topCenter: Point;
    unfoldedRect?: { x: number; y: number; w: number; h: number };
    topCircle?: { cx: number; cy: number; r: number };
    bottomCircle?: { cx: number; cy: number; r: number };
  };
  cone?: {
    rx: number;
    ry: number;
    bottomCenter: Point;
    apex: Point;
  };
  sphere?: {
    r: number;
    center: Point;
    rx: number;
    ry: number;
    highlightCenter: Point;
  };
  cylinderCut?: {
    stripW: number;
    stripH: number;
    length: number;
    layout: CircleCutLayout;
  };
  waterSurface?: {
    kind: 'poly' | 'ellipse';
    points?: Point[];
    center?: Point;
    rx?: number;
    ry?: number;
  };
  edgeLabelItems?: { key: 'a' | 'b' | 'h'; text: string; x: number; y: number; box: Box }[];
}

function estimateLabelWidth(raw: string, size: number): number {
  const plain = richSpans(raw)
    .map((sp) => sp.text)
    .join('');
  try {
    return Math.max(24, textWidth(plain, size));
  } catch {
    return Math.max(24, plain.length * size * 0.8);
  }
}

function boundingBoxOfPoints(pts: Point[], pad = 0): Box {
  if (pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = pts[0][0];
  let maxX = pts[0][0];
  let minY = pts[0][1];
  let maxY = pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
}

function centroidOfPoints(pts: Point[]): Point {
  if (pts.length === 0) return [0, 0];
  let sx = 0;
  let sy = 0;
  for (const [x, y] of pts) {
    sx += x;
    sy += y;
  }
  return [sx / pts.length, sy / pts.length];
}

function unionBoxes(boxes: Box[], pad = 0): Box {
  if (boxes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = boxes[0].x;
  let maxX = boxes[0].x + boxes[0].w;
  let minY = boxes[0].y;
  let maxY = boxes[0].y + boxes[0].h;
  for (let i = 1; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.x < minX) minX = b.x;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y < minY) minY = b.y;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
}

export function solidLayout(p: Props): SolidLayoutResult {
  const rawKind = str(p.kind, 'cuboid') as SolidKind;
  const kind: SolidKind = ['cuboid', 'cube', 'cylinder', 'cone', 'sphere'].includes(rawKind)
    ? rawKind
    : 'cuboid';
  const isCube = kind === 'cube';
  const unit = Math.max(1, num(p.unit, 40));

  let a = num(p.a, 4);
  let b = num(p.b, 3);
  let h = num(p.h, 2);
  if (isCube) {
    const side = num(p.a, num(p.h, num(p.b, 3)));
    a = side;
    b = side;
    h = side;
  }
  const r = Math.max(0.1, num(p.r, 2));

  const view = num(p.view, 0.5);
  const unfold = Math.max(0, Math.min(1, num(p.unfold, 0)));
  const net = Math.max(1, Math.min(11, Math.round(num(p.net, 1))));
  const water = Math.max(0, Math.min(1, num(p.water, 0)));
  const sweep = Math.max(0, Math.min(1, num(p.sweep, 1)));
  const rawParts = Math.round(num(p.cutParts, 16));
  const cutParts = rawParts < 2 ? 2 : rawParts % 2 === 0 ? rawParts : rawParts + 1;
  const cutT = Math.max(0, Math.min(1, num(p.cutT, 0)));
  const hiddenEdges = p.hiddenEdges !== false;

  const [atX, atY] = pt(p.at, [400, 300]);

  let obliqueAngle = 30;
  let depthRatio = 0.5;
  try {
    const s = sceneStyle().solid;
    if (s) {
      obliqueAngle = s.obliqueAngle ?? 30;
      depthRatio = s.depthRatio ?? 0.5;
    }
  } catch {
    // sceneStyle 未注入时的保底
  }

  const theta = view * obliqueAngle * (Math.PI / 180);
  const absTheta = Math.abs(view) * obliqueAngle * (Math.PI / 180);

  // 可见面判定
  let visibleFaces: FaceName[];
  if (kind === 'cylinder') {
    visibleFaces = ['top', 'bottom', 'side'];
  } else if (kind === 'cone') {
    visibleFaces = ['bottom', 'side'];
  } else if (kind === 'sphere') {
    visibleFaces = ['side'];
  } else if (view > 0) {
    visibleFaces = ['front', 'top', 'right'];
  } else if (view < 0) {
    visibleFaces = ['front', 'top', 'left'];
  } else {
    visibleFaces = ['front'];
  }

  const L = a * unit;
  const D = b * unit;
  const H = h * unit;
  const waterHeight = H * water;

  const subitems: Subitem[] = [];
  const vertices: Point[] = [];
  const edges: SolidEdgeDef[] = [];
  const faces: Record<string, SolidFaceDef> = {};
  let bbox: Box = { x: atX, y: atY, w: 0, h: 0 };

  let cylinderInfo: SolidLayoutResult['cylinder'];
  let coneInfo: SolidLayoutResult['cone'];
  let sphereInfo: SolidLayoutResult['sphere'];
  let cylinderCutInfo: SolidLayoutResult['cylinderCut'];
  let waterSurface: SolidLayoutResult['waterSurface'];
  let edgeLabelItems: SolidLayoutResult['edgeLabelItems'];

  if (kind === 'cuboid' || kind === 'cube') {
    // 投影变换参数（含 unfold 插值）
    const u = unfold;
    const effTheta = absTheta * (1 - u);
    const zProjX = (1 - u) * Math.sign(view) * Math.cos(effTheta) * depthRatio;
    const zProjY = (1 - u) * Math.sin(effTheta) * depthRatio + u * 1.0;
    const yProjScale = 1 - u;

    const project3D = (x: number, y: number, z: number): Point => [
      atX + x + z * zProjX,
      atY - (y * yProjScale + z * zProjY),
    ];

    // 8 个标准顶点的 3D 旋转与投影（v1..v8）
    // v1: 前左底, v2: 前右底, v3: 后右底, v4: 后左底
    // v5: 前左顶, v6: 前右顶, v7: 后右顶, v8: 后左顶
    const phiFront = (Math.PI / 2) * u;
    const yFrontRot = H * Math.cos(phiFront);
    const zFrontRot = -H * Math.sin(phiFront);

    const phiBack = (Math.PI / 2) * u;
    const yBackRot = H * Math.cos(phiBack);
    const zBackRot = D + H * Math.sin(phiBack);

    // 标准顶点坐标（用于 edge/v 子项与标准 3D 观察）
    const v1: Point = [atX - L / 2, atY];
    const v2: Point = [atX + L / 2, atY];
    const v3: Point = project3D(L / 2, 0, D);
    const v4: Point = project3D(-L / 2, 0, D);
    const v5: Point = project3D(-L / 2, yFrontRot, zFrontRot);
    const v6: Point = project3D(L / 2, yFrontRot, zFrontRot);
    const v7: Point = project3D(L / 2, yBackRot, zBackRot);
    const v8: Point = project3D(-L / 2, yBackRot, zBackRot);

    vertices.push(v1, v2, v3, v4, v5, v6, v7, v8);

    // 12 条棱定义
    const edgeDefs: [number, Point, Point, string][] = [
      [1, v1, v2, 'front-bottom'],
      [2, v2, v3, 'right-bottom'],
      [3, v3, v4, 'back-bottom'],
      [4, v4, v1, 'left-bottom'],
      [5, v5, v6, 'front-top'],
      [6, v6, v7, 'right-top'],
      [7, v7, v8, 'back-top'],
      [8, v8, v5, 'left-top'],
      [9, v1, v5, 'front-left'],
      [10, v2, v6, 'front-right'],
      [11, v3, v7, 'back-right'],
      [12, v4, v8, 'back-left'],
    ];

    // 可见棱集合判定
    const isEdgeVisible = (idx: number): boolean => {
      if (u > 0) return true; // 展开过程中棱线全部画出
      if (view > 0) {
        // 可见面 front, top, right
        return [1, 2, 5, 6, 7, 8, 9, 10, 11].includes(idx);
      }
      if (view < 0) {
        // 可见面 front, top, left
        return [1, 4, 5, 6, 7, 8, 9, 10, 12].includes(idx);
      }
      return [1, 5, 9, 10].includes(idx);
    };

    for (const [idx, from, to] of edgeDefs) {
      const eBox = boundingBoxOfPoints([from, to], 8);
      // 保证最小点击范围 24x24
      if (eBox.w < 24) {
        eBox.x -= (24 - eBox.w) / 2;
        eBox.w = 24;
      }
      if (eBox.h < 24) {
        eBox.y -= (24 - eBox.h) / 2;
        eBox.h = 24;
      }
      const vis = isEdgeVisible(idx);
      edges.push({ index: idx, from, to, visible: vis, box: eBox });
      subitems.push({ name: `edge.${idx}`, box: eBox });
    }

    // 顶点子项
    for (let i = 0; i < vertices.length; i++) {
      const pt = vertices[i];
      const vBox = boxAround(pt[0], pt[1], 28, 28);
      subitems.push({ name: `v${i + 1}`, box: vBox });
    }

    // 面多边形计算（支持展开）
    // 底面
    const bottomPts: Point[] = [v1, v2, v3, v4];
    // 前面
    const frontPts: Point[] = [v1, v2, v6, v5];
    // 后面
    const backPts: Point[] = [v4, v3, v7, v8];

    // 左右与顶面在展开时的独立顶点
    const phiLeft = (Math.PI / 2) * u;
    const xLeftRot = -L / 2 - H * Math.sin(phiLeft);
    const yLeftRot = H * Math.cos(phiLeft);
    const v5Left = project3D(xLeftRot, yLeftRot, 0);
    const v8Left = project3D(xLeftRot, yLeftRot, D);
    const leftPts: Point[] = [v1, v4, v8Left, v5Left];

    const phiRight = (Math.PI / 2) * u;
    const xRightRot = L / 2 + H * Math.sin(phiRight);
    const yRightRot = H * Math.cos(phiRight);
    const v6Right = project3D(xRightRot, yRightRot, 0);
    const v7Right = project3D(xRightRot, yRightRot, D);
    const rightPts: Point[] = [v2, v3, v7Right, v6Right];

    const phiTopRel = u <= 0.6 ? 0 : (Math.PI / 2) * ((u - 0.6) / 0.4);
    const phiTop = phiBack + phiTopRel;
    // 闭合时（u = 0）顶面从后上棱（y = H, z = D）朝前（-z 方向）延伸 D 到前上棱（y = H, z = 0）；
    // 随两级铰链转过 phiTop（0 → π），向量 (0, -D) 在 (y, z) 平面内旋转为 (D·sin, -D·cos)。
    const yTopRot = yBackRot + D * Math.sin(phiTop);
    const zTopRot = zBackRot - D * Math.cos(phiTop);
    const v5Top = project3D(-L / 2, yTopRot, zTopRot);
    const v6Top = project3D(L / 2, yTopRot, zTopRot);
    const topPts: Point[] = [v5Top, v6Top, v7, v8];

    // 正方体 11 种展开图的处理（u > 0 时插值到目标网格）
    const facePointsMap: Record<'bottom' | 'top' | 'front' | 'back' | 'left' | 'right', Point[]> = {
      bottom: bottomPts,
      front: frontPts,
      back: backPts,
      left: leftPts,
      right: rightPts,
      top: topPts,
    };

    if (isCube && net >= 1 && net <= 11 && u > 0) {
      const netConfig = CUBE_NETS[net - 1];
      const botGrid = netConfig.grid.bottom;
      const S = L; // a * unit

      for (const fName of ['bottom', 'top', 'front', 'back', 'left', 'right'] as const) {
        const [gc, gr] = netConfig.grid[fName];
        const dc = gc - botGrid[0];
        const dr = gr - botGrid[1];
        // 目标网格中心与矩形顶点
        const ncx = atX + dc * S;
        const ncy = atY - S / 2 + dr * S;
        const targetPts: Point[] = [
          [ncx - S / 2, ncy + S / 2],
          [ncx + S / 2, ncy + S / 2],
          [ncx + S / 2, ncy - S / 2],
          [ncx - S / 2, ncy - S / 2],
        ];

        // u 插值
        const curPts = facePointsMap[fName];
        const blendedPts = curPts.map((cp, idx) => {
          const tp = targetPts[idx];
          return [cp[0] + (tp[0] - cp[0]) * u, cp[1] + (tp[1] - cp[1]) * u] as Point;
        });
        facePointsMap[fName] = blendedPts;
      }
    }

    // 登记各面
    const allFaceBoxes: Box[] = [];
    for (const [fName, pts] of Object.entries(facePointsMap)) {
      const fBox = boundingBoxOfPoints(pts);
      const fCenter = centroidOfPoints(pts);
      const isVis = u > 0 ? true : visibleFaces.includes(fName as FaceName);
      faces[fName] = {
        name: fName as FaceName,
        points: pts,
        center: fCenter,
        visible: isVis,
        box: fBox,
      };
      subitems.push({ name: `face.${fName}`, box: fBox });
      allFaceBoxes.push(fBox);
    }

    // 水面计算（仅在有装水且未完全展开时）
    if (water > 0 && u === 0) {
      const wPts: Point[] = [
        project3D(-L / 2, waterHeight, 0),
        project3D(L / 2, waterHeight, 0),
        project3D(L / 2, waterHeight, D),
        project3D(-L / 2, waterHeight, D),
      ];
      waterSurface = {
        kind: 'poly',
        points: wPts,
        center: centroidOfPoints(wPts),
      };
    }

    // 棱长文字标签包围盒（闭合态下绘制，纳入零件整体 bbox 以免手机端贴合裁切文字或顶点高亮框）
    const bboxParts: Box[] = [...allFaceBoxes];
    if (u === 0) {
      for (const s of subitems) {
        bboxParts.push(s.box);
      }
      const rawEdgeLabels = (p.edgeLabels as Record<string, string> | undefined) ?? {};
      const labelSize = 22;
      const items: NonNullable<SolidLayoutResult['edgeLabelItems']> = [];
      if (rawEdgeLabels.a) {
        const lx = (v1[0] + v2[0]) / 2;
        const ly = v1[1] + 22;
        const lBox = boxAround(lx, ly, estimateLabelWidth(rawEdgeLabels.a, labelSize), labelSize + 4);
        items.push({ key: 'a', text: rawEdgeLabels.a, x: lx, y: ly, box: lBox });
        bboxParts.push(lBox);
      }
      if (rawEdgeLabels.b) {
        const lx = view >= 0 ? (v2[0] + v3[0]) / 2 + 28 : (v1[0] + v4[0]) / 2 - 28;
        const ly = view >= 0 ? (v2[1] + v3[1]) / 2 + 16 : (v1[1] + v4[1]) / 2 + 16;
        const lBox = boxAround(lx, ly, estimateLabelWidth(rawEdgeLabels.b, labelSize), labelSize + 4);
        items.push({ key: 'b', text: rawEdgeLabels.b, x: lx, y: ly, box: lBox });
        bboxParts.push(lBox);
      }
      if (rawEdgeLabels.h) {
        const lx = v1[0] - 30;
        const ly = (v1[1] + v5[1]) / 2;
        const lBox = boxAround(lx, ly, estimateLabelWidth(rawEdgeLabels.h, labelSize), labelSize + 4);
        items.push({ key: 'h', text: rawEdgeLabels.h, x: lx, y: ly, box: lBox });
        bboxParts.push(lBox);
      }
      if (items.length > 0) edgeLabelItems = items;
    }

    bbox = unionBoxes(bboxParts, 8);
  } else if (kind === 'cylinder') {
    const R = r * unit;
    const rx = R;
    const ry = R * depthRatio * 0.8;
    const bottomCenter: Point = [atX, atY - ry];
    const topCenter: Point = [atX, atY - ry - H];

    cylinderInfo = {
      rx,
      ry,
      bottomCenter,
      topCenter,
    };

    // 子项
    const bottomBox = boxAround(bottomCenter[0], bottomCenter[1], rx * 2 + 8, ry * 2 + 8);
    const topBox = boxAround(topCenter[0], topCenter[1], rx * 2 + 8, ry * 2 + 8);
    const sideBox: Box = {
      x: atX - rx - 4,
      y: topCenter[1] - 4,
      w: rx * 2 + 8,
      h: H + ry * 2 + 8,
    };
    const heightBox: Box = {
      x: atX - 16,
      y: topCenter[1],
      w: 32,
      h: H,
    };

    faces.bottom = {
      name: 'bottom',
      points: [bottomCenter],
      center: bottomCenter,
      visible: true,
      box: bottomBox,
    };
    faces.top = {
      name: 'top',
      points: [topCenter],
      center: topCenter,
      visible: true,
      box: topBox,
    };
    faces.side = {
      name: 'side',
      points: [],
      center: [atX, atY - ry - H / 2],
      visible: true,
      box: sideBox,
    };

    subitems.push(
      { name: 'face.top', box: topBox },
      { name: 'face.bottom', box: bottomBox },
      { name: 'face.side', box: sideBox },
      { name: 'height', box: heightBox },
    );

    // 展开长方形与底面圆
    const rectW = 2 * Math.PI * R;
    const rectH = H;
    cylinderInfo.unfoldedRect = {
      x: atX - rectW / 2,
      y: atY - rectH,
      w: rectW,
      h: rectH,
    };
    cylinderInfo.topCircle = { cx: atX, cy: atY - rectH - R, r: R };
    cylinderInfo.bottomCircle = { cx: atX, cy: atY + R, r: R };

    // 切拼
    if (cutParts >= 2) {
      const cutL = circleCutLayout({ radius: R, parts: cutParts });
      cylinderCutInfo = {
        stripW: cutL.stripW,
        stripH: cutL.stripH,
        length: cutL.stripW,
        layout: cutL,
      };
    }

    if (unfold >= 1) {
      const unfoldBoxes: Box[] = [
        cylinderInfo.unfoldedRect,
        boxAround(atX, atY - rectH - R, R * 2, R * 2),
        boxAround(atX, atY + R, R * 2, R * 2),
      ];
      bbox = unionBoxes(unfoldBoxes, 8);
    } else {
      bbox = unionBoxes([bottomBox, topBox, sideBox], 8);
    }

    // 水面
    if (water > 0 && unfold === 0) {
      const wc: Point = [atX, atY - ry - waterHeight];
      waterSurface = {
        kind: 'ellipse',
        center: wc,
        rx,
        ry,
      };
    }
  } else if (kind === 'cone') {
    const R = r * unit;
    const rx = R;
    const ry = R * depthRatio * 0.8;
    const bottomCenter: Point = [atX, atY - ry];
    const apex: Point = [atX, atY - ry - H];

    coneInfo = {
      rx,
      ry,
      bottomCenter,
      apex,
    };

    const bottomBox = boxAround(bottomCenter[0], bottomCenter[1], rx * 2 + 8, ry * 2 + 8);
    const sideBox: Box = {
      x: atX - rx - 4,
      y: apex[1] - 4,
      w: rx * 2 + 8,
      h: H + ry + 8,
    };
    const heightBox: Box = {
      x: atX - 16,
      y: apex[1],
      w: 32,
      h: H,
    };

    faces.bottom = {
      name: 'bottom',
      points: [bottomCenter],
      center: bottomCenter,
      visible: true,
      box: bottomBox,
    };
    faces.side = {
      name: 'side',
      points: [],
      center: [atX, atY - ry - H / 3],
      visible: true,
      box: sideBox,
    };

    subitems.push(
      { name: 'face.bottom', box: bottomBox },
      { name: 'face.side', box: sideBox },
      { name: 'height', box: heightBox },
    );

    bbox = unionBoxes([bottomBox, sideBox], 8);
  } else if (kind === 'sphere') {
    const R = r * unit;
    const center: Point = [atX, atY - R];
    const rx = R;
    const ry = R * depthRatio * 0.8;
    const hlCenter: Point = [atX - R * 0.35, atY - R - R * 0.35];

    sphereInfo = {
      r: R,
      center,
      rx,
      ry,
      highlightCenter: hlCenter,
    };

    const sBox = boxAround(center[0], center[1], R * 2 + 8, R * 2 + 8);
    faces.side = {
      name: 'side',
      points: [],
      center,
      visible: true,
      box: sBox,
    };
    subitems.push({ name: 'face.side', box: sBox });
    bbox = sBox;
  }

  return {
    kind,
    at: [atX, atY],
    a,
    b,
    h,
    r,
    unit,
    view,
    theta,
    unfold,
    net,
    water,
    waterHeight,
    sweep,
    cutParts,
    cutT,
    hiddenEdges,
    visibleFaces,
    vertices,
    edges,
    faces,
    subitems,
    bbox,
    cylinder: cylinderInfo,
    cone: coneInfo,
    sphere: sphereInfo,
    cylinderCut: cylinderCutInfo,
    waterSurface,
    edgeLabelItems,
  };
}

/** 渲染带排版标记（如 sup 面积平方）的文字 */
function RenderRichLabel({
  text,
  x,
  y,
  size,
  fill,
}: {
  text: string;
  x: number;
  y: number;
  size: number;
  fill: string;
}) {
  const spans = richSpans(text);
  if (spans.length === 1 && !spans[0].sup && !spans[0].frac) {
    return (
      <text
        x={x}
        y={y}
        fill={fill}
        fontSize={size}
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {spans[0].text}
      </text>
    );
  }

  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize={size}
      fontWeight="bold"
      textAnchor="middle"
      dominantBaseline="central"
    >
      {spans.map((sp, i) => {
        if (sp.sup) {
          return (
            <tspan key={i} dy={-size * 0.35} fontSize={size * 0.65}>
              {sp.text}
            </tspan>
          );
        }
        return (
          <tspan key={i} dy={i > 0 && spans[i - 1]?.sup ? size * 0.35 : 0} fontSize={size}>
            {sp.text}
          </tspan>
        );
      })}
    </text>
  );
}

const SolidRender: ComponentType<{ p: Props; ctx: PartContext }> = ({ p, ctx }) => {
  const L = solidLayout(p);
  const theme = ctx.theme;
  const userFaces = (p.faces as Record<string, string> | undefined) ?? {};
  const faceLabels = (p.faceLabels as Record<string, string> | undefined) ?? {};

  let hiddenDash = '6 5';
  let counterDarken = 0.45;
  try {
    const s = sceneStyle();
    if (s.solid?.hiddenDash) hiddenDash = s.solid.hiddenDash;
    if (s.counterBorder?.darken !== undefined) counterDarken = s.counterBorder.darken;
  } catch {
    // 保底
  }

  const getFaceColor = (name: string, fallback: string): string => {
    const cName = userFaces[name] ?? fallback;
    return color(cName, theme);
  };

  const ink = theme.ink;
  const line = theme.line;
  const strokeW = 3;

  // 1. 长方体 / 正方体渲染
  if (L.kind === 'cuboid' || L.kind === 'cube') {
    const defaultFaceColors: Record<string, string> = {
      front: 'blue',
      top: 'orange',
      right: 'green',
      back: 'blue',
      bottom: 'orange',
      left: 'green',
    };

    // 绘制顺序：
    // a. 隐藏棱（虚线）
    // b. 展开图或 3D 表面填充与描边
    // c. 可见棱
    // d. 水体
    // e. 文字标注
    const hiddenEdges = L.edges.filter((e) => !e.visible && L.hiddenEdges);
    const visibleEdges = L.edges.filter((e) => e.visible);

    // 面渲染顺序：按由深至浅（画家算法），展开过程中顶面位于最上方最后绘制，避免被后方侧面遮挡
    const faceRenderOrder: string[] =
      L.unfold > 0
        ? L.view >= 0
          ? ['bottom', 'back', 'left', 'right', 'front', 'top']
          : ['bottom', 'back', 'right', 'left', 'front', 'top']
        : L.view > 0
          ? ['bottom', 'back', 'left', 'front', 'top', 'right']
          : ['bottom', 'back', 'right', 'front', 'top', 'left'];

    return (
      <g className="part-solid">
        {/* 隐藏棱 */}
        {hiddenEdges.map((e) => (
          <line
            key={`hidden-${e.index}`}
            x1={e.from[0]}
            y1={e.from[1]}
            x2={e.to[0]}
            y2={e.to[1]}
            stroke={line}
            strokeWidth={2}
            strokeDasharray={hiddenDash}
            strokeLinecap="round"
          />
        ))}

        {/* 面的填充与轮廓 */}
        {faceRenderOrder.map((fName) => {
          const fDef = L.faces[fName];
          if (!fDef || fDef.points.length < 3) return null;
          if (!fDef.visible && L.unfold === 0) return null;
          const fc = getFaceColor(fName, defaultFaceColors[fName] ?? 'blue');
          const strokeCol = mixColor(fc, ink, counterDarken);
          const ptsStr = fDef.points.map((pt) => `${pt[0]},${pt[1]}`).join(' ');

          return (
            <polygon
              key={`face-${fName}`}
              points={ptsStr}
              fill={fc}
              fillOpacity={0.85}
              stroke={strokeCol}
              strokeWidth={strokeW}
              strokeLinejoin="round"
            />
          );
        })}

        {/* 可见棱描边加强 */}
        {L.unfold === 0 &&
          visibleEdges.map((e) => {
            const eColor = mixColor(getFaceColor('front', 'blue'), ink, counterDarken);
            return (
              <line
                key={`edge-${e.index}`}
                x1={e.from[0]}
                y1={e.from[1]}
                x2={e.to[0]}
                y2={e.to[1]}
                stroke={eColor}
                strokeWidth={strokeW}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

        {/* 水体渲染 */}
        {L.waterSurface?.points && (
          <g>
            <polygon
              points={L.waterSurface.points.map((pt) => `${pt[0]},${pt[1]}`).join(' ')}
              fill={color('blue', theme)}
              fillOpacity={0.4}
              stroke={color('blue', theme)}
              strokeWidth={1.5}
            />
          </g>
        )}

        {/* 面文字标签 */}
        {Object.entries(faceLabels).map(([fName, text]) => {
          const fDef = L.faces[fName];
          if (!fDef) return null;
          if (!fDef.visible && L.unfold === 0) return null;
          return (
            <RenderRichLabel
              key={`fl-${fName}`}
              text={text}
              x={fDef.center[0]}
              y={fDef.center[1]}
              size={22}
              fill={ink}
            />
          );
        })}

        {/* 棱长文字标签（a: 长, b: 宽, h: 高） */}
        {L.unfold === 0 && L.edgeLabelItems && (
          <g>
            {L.edgeLabelItems.map((item) => (
              <RenderRichLabel
                key={`el-${item.key}`}
                text={item.text}
                x={item.x}
                y={item.y}
                size={22}
                fill={ink}
              />
            ))}
          </g>
        )}
      </g>
    );
  }

  // 2. 圆柱渲染
  if (L.kind === 'cylinder' && L.cylinder) {
    const { rx, ry, bottomCenter, topCenter, unfoldedRect, topCircle, bottomCircle } = L.cylinder;
    const bodyCol = getFaceColor('front', 'blue');
    const topCol = getFaceColor('top', 'orange');
    const strokeCol = mixColor(bodyCol, ink, counterDarken);

    if (L.unfold >= 1 && unfoldedRect && topCircle && bottomCircle) {
      // 完全展开状态：长方形 + 两个底面圆
      return (
        <g className="part-solid-cylinder-unfolded">
          <rect
            x={unfoldedRect.x}
            y={unfoldedRect.y}
            width={unfoldedRect.w}
            height={unfoldedRect.h}
            fill={bodyCol}
            fillOpacity={0.85}
            stroke={strokeCol}
            strokeWidth={strokeW}
          />
          <circle
            cx={topCircle.cx}
            cy={topCircle.cy}
            r={topCircle.r}
            fill={topCol}
            fillOpacity={0.85}
            stroke={mixColor(topCol, ink, counterDarken)}
            strokeWidth={strokeW}
          />
          <circle
            cx={bottomCircle.cx}
            cy={bottomCircle.cy}
            r={bottomCircle.r}
            fill={topCol}
            fillOpacity={0.85}
            stroke={mixColor(topCol, ink, counterDarken)}
            strokeWidth={strokeW}
          />
        </g>
      );
    }

    // 圆柱切拼
    if (L.cutT > 0 && L.cylinderCut) {
      const cutL = L.cylinderCut.layout;
      const t = L.cutT;
      const c1 = bodyCol;
      const c2 = topCol;
      return (
        <g className="part-solid-cylinder-cut">
          {cutL.sectors.map((s, i) => {
            const ax = bottomCenter[0] + s.stripAt[0] * t;
            const ay = bottomCenter[1] + s.stripAt[1] * t;
            return (
              <g key={i}>
                <line
                  x1={ax}
                  y1={ay}
                  x2={ax}
                  y2={ay - L.h * L.unit}
                  stroke={i % 2 === 0 ? c1 : c2}
                  strokeWidth={1.5}
                />
              </g>
            );
          })}
        </g>
      );
    }

    // 旋转扫出
    if (L.sweep < 1) {
      const rectW = L.r * L.unit;
      const rectH = L.h * L.unit;
      return (
        <g className="part-solid-cylinder-sweep">
          <rect
            x={bottomCenter[0]}
            y={topCenter[1]}
            width={rectW}
            height={rectH}
            fill={bodyCol}
            fillOpacity={0.85}
            stroke={strokeCol}
            strokeWidth={strokeW}
          />
          <line
            x1={bottomCenter[0]}
            y1={bottomCenter[1] + 16}
            x2={bottomCenter[0]}
            y2={topCenter[1] - 16}
            stroke={ink}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        </g>
      );
    }

    // 正常圆柱立体
    return (
      <g className="part-solid-cylinder">
        {/* 后半个底椭圆（虚线） */}
        {L.hiddenEdges && (
          <path
            d={`M${bottomCenter[0] - rx},${bottomCenter[1]} A${rx},${ry} 0 0,1 ${bottomCenter[0] + rx},${bottomCenter[1]}`}
            fill="none"
            stroke={line}
            strokeWidth={2}
            strokeDasharray={hiddenDash}
          />
        )}

        {/* 侧面曲面主体 */}
        <path
          d={`M${bottomCenter[0] - rx},${bottomCenter[1]} L${topCenter[0] - rx},${topCenter[1]} A${rx},${ry} 0 0,0 ${topCenter[0] + rx},${topCenter[1]} L${bottomCenter[0] + rx},${bottomCenter[1]} A${rx},${ry} 0 0,1 ${bottomCenter[0] - rx},${bottomCenter[1]} Z`}
          fill={bodyCol}
          fillOpacity={0.85}
          stroke={strokeCol}
          strokeWidth={strokeW}
          strokeLinejoin="round"
        />

        {/* 前半个底椭圆轮廓（实线） */}
        <path
          d={`M${bottomCenter[0] - rx},${bottomCenter[1]} A${rx},${ry} 0 0,0 ${bottomCenter[0] + rx},${bottomCenter[1]}`}
          fill="none"
          stroke={strokeCol}
          strokeWidth={strokeW}
        />

        {/* 顶椭圆（完整） */}
        <ellipse
          cx={topCenter[0]}
          cy={topCenter[1]}
          rx={rx}
          ry={ry}
          fill={topCol}
          fillOpacity={0.85}
          stroke={mixColor(topCol, ink, counterDarken)}
          strokeWidth={strokeW}
        />

        {/* 水面 */}
        {L.waterSurface?.center && (
          <ellipse
            cx={L.waterSurface.center[0]}
            cy={L.waterSurface.center[1]}
            rx={rx}
            ry={ry}
            fill={color('blue', theme)}
            fillOpacity={0.4}
            stroke={color('blue', theme)}
            strokeWidth={1.5}
          />
        )}
      </g>
    );
  }

  // 3. 圆锥渲染
  if (L.kind === 'cone' && L.cone) {
    const { rx, ry, bottomCenter, apex } = L.cone;
    const bodyCol = getFaceColor('front', 'blue');
    const strokeCol = mixColor(bodyCol, ink, counterDarken);

    // 旋转扫出
    if (L.sweep < 1) {
      const rw = L.r * L.unit;
      return (
        <g className="part-solid-cone-sweep">
          <polygon
            points={`${bottomCenter[0]},${apex[1]} ${bottomCenter[0]},${bottomCenter[1]} ${bottomCenter[0] + rw},${bottomCenter[1]}`}
            fill={bodyCol}
            fillOpacity={0.85}
            stroke={strokeCol}
            strokeWidth={strokeW}
          />
          <line
            x1={bottomCenter[0]}
            y1={bottomCenter[1] + 16}
            x2={bottomCenter[0]}
            y2={apex[1] - 16}
            stroke={ink}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        </g>
      );
    }

    return (
      <g className="part-solid-cone">
        {/* 后半个底椭圆（虚线） */}
        {L.hiddenEdges && (
          <path
            d={`M${bottomCenter[0] - rx},${bottomCenter[1]} A${rx},${ry} 0 0,1 ${bottomCenter[0] + rx},${bottomCenter[1]}`}
            fill="none"
            stroke={line}
            strokeWidth={2}
            strokeDasharray={hiddenDash}
          />
        )}

        {/* 侧面曲面锥体 */}
        <path
          d={`M${apex[0]},${apex[1]} L${bottomCenter[0] - rx},${bottomCenter[1]} A${rx},${ry} 0 0,0 ${bottomCenter[0] + rx},${bottomCenter[1]} Z`}
          fill={bodyCol}
          fillOpacity={0.85}
          stroke={strokeCol}
          strokeWidth={strokeW}
          strokeLinejoin="round"
        />

        {/* 前半个底椭圆轮廓（实线） */}
        <path
          d={`M${bottomCenter[0] - rx},${bottomCenter[1]} A${rx},${ry} 0 0,0 ${bottomCenter[0] + rx},${bottomCenter[1]}`}
          fill="none"
          stroke={strokeCol}
          strokeWidth={strokeW}
        />
      </g>
    );
  }

  // 4. 球渲染
  if (L.kind === 'sphere' && L.sphere) {
    const { r, center, rx, ry, highlightCenter } = L.sphere;
    const bodyCol = getFaceColor('front', 'blue');
    const strokeCol = mixColor(bodyCol, ink, counterDarken);
    const hlCol = color('white', theme);

    return (
      <g className="part-solid-sphere">
        {/* 球本体圆 */}
        <circle
          cx={center[0]}
          cy={center[1]}
          r={r}
          fill={bodyCol}
          fillOpacity={0.85}
          stroke={strokeCol}
          strokeWidth={strokeW}
        />

        {/* 赤道椭圆后半段（虚线） */}
        {L.hiddenEdges && (
          <path
            d={`M${center[0] - rx},${center[1]} A${rx},${ry} 0 0,1 ${center[0] + rx},${center[1]}`}
            fill="none"
            stroke={line}
            strokeWidth={2}
            strokeDasharray={hiddenDash}
          />
        )}

        {/* 赤道椭圆前半段（实线） */}
        <path
          d={`M${center[0] - rx},${center[1]} A${rx},${ry} 0 0,0 ${center[0] + rx},${center[1]}`}
          fill="none"
          stroke={strokeCol}
          strokeWidth={2}
        />

        {/* 左上高光 */}
        <ellipse
          cx={highlightCenter[0]}
          cy={highlightCenter[1]}
          rx={r * 0.18}
          ry={r * 0.1}
          transform={`rotate(-35 ${highlightCenter[0]} ${highlightCenter[1]})`}
          fill={hlCol}
          fillOpacity={0.5}
        />
      </g>
    );
  }

  return null;
};

export const solidPart: PartDef = {
  type: 'solid',
  name: '立体图形',
  anchor: 'start',
  props: [
    'kind',
    'a',
    'b',
    'h',
    'r',
    'unit',
    'view',
    'faces',
    'faceLabels',
    'edgeLabels',
    'hiddenEdges',
    'unfold',
    'net',
    'water',
    'sweep',
    'cutParts',
    'cutT',
    'labels',
  ],
  bbox(p) {
    return solidLayout(p).bbox;
  },
  subitems(p) {
    return solidLayout(p).subitems;
  },
  Render: SolidRender,
};
