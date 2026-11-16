// 小正方体组合：用斜二测和三视图展示小正方体堆叠，支持视角切换、铺满和下落动画。
import type { ReactNode } from 'react';
import {
  color,
  mixColor,
  num,
  pt,
  str,
  type Box,
  type PartDef,
  type Point,
  type Props,
  type Subitem,
} from '../base';
import { sceneStyle } from '../style';

export type CubeCoord = [number, number, number];

export interface CubeStackCamera {
  azimuth: number;
  elevation: number;
  obliqueAngle: number;
  depthRatio: number;
  perspective: false;
}

export interface PlacedCube {
  index: number;
  coord: CubeCoord;
  x: number;
  y: number;
  z: number;
  effectiveZ: number;
  fallOffset: number;
  isFalling: boolean;
  box: Box;
}

export interface CubeStackLabels {
  front: string;
  left: string;
  top: string;
}

export interface CubeStackLayoutResult {
  at: Point;
  unit: number;
  view: number;
  viewName: string;
  project: boolean;
  colorName: string;
  count: number;
  cubes: PlacedCube[];
  drawnCubes: PlacedCube[];
  camera: CubeStackCamera;
  projections: {
    front: number[][];
    left: number[][];
    top: number[][];
  };
  labels: CubeStackLabels;
  box: Box;
  projectBox?: Box;
}

const VIEW_MAP: Record<string, number> = {
  iso: 0,
  front: 1,
  left: 2,
  top: 3,
};

/** 解析视角为数字 0–3 */
export function parseView(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s in VIEW_MAP) return VIEW_MAP[s];
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/** 按层铺满 a × b × h（先第 0 层从前到后、从左到右，再第 1 层） */
export function fillCubes([a, b, h]: [number, number, number]): CubeCoord[] {
  const result: CubeCoord[] = [];
  for (let z = 0; z < h; z++) {
    for (let y = 0; y < b; y++) {
      for (let x = 0; x < a; x++) {
        result.push([x, y, z]);
      }
    }
  }
  return result;
}

/** 计算相机参数（view: 0=iso, 1=front, 2=left, 3=top，相邻视图平滑插值） */
export function cameraForView(view: unknown): CubeStackCamera {
  const v = parseView(view);
  const obliqueAngleDefault = 30;
  const depthRatioDefault = 0.5;

  if (v <= 0) {
    return {
      azimuth: 0,
      elevation: 0,
      obliqueAngle: obliqueAngleDefault,
      depthRatio: depthRatioDefault,
      perspective: false,
    };
  }
  if (v <= 1) {
    // 0 -> 1: iso -> front, θ 从 obliqueAngle 过渡到 0，进深比例从 depthRatio 过渡到 0
    const t = v;
    return {
      azimuth: 0,
      elevation: 0,
      obliqueAngle: obliqueAngleDefault * (1 - t),
      depthRatio: depthRatioDefault * (1 - t),
      perspective: false,
    };
  }
  if (v <= 2) {
    // 1 -> 2: front -> left, 绕竖轴旋转 90°
    const t = v - 1;
    return {
      azimuth: 90 * t,
      elevation: 0,
      obliqueAngle: 0,
      depthRatio: 0,
      perspective: false,
    };
  }
  // 2 -> 3: left -> top
  const t = Math.min(1, v - 2);
  return {
    azimuth: 90 * (1 - t),
    elevation: 90 * t,
    obliqueAngle: 0,
    depthRatio: 0,
    perspective: false,
  };
}

/** count 小数部分下落偏移量（ease: 先快后慢，上方 3 × unit 处落下） */
export function cubeFallOffset(frac: number, unit: number): number {
  if (frac <= 0 || frac >= 1) return 0;
  // ease: 先快后慢 (ease-out quad)
  const progress = 1 - (1 - frac) * (1 - frac);
  return (1 - progress) * 3 * unit;
}

/** 画家算法排序：从后往前（y 降序）、从下往上（z 升序）、从左往右（x 升序） */
export function sortCubesPainter(cubes: CubeCoord[]): CubeCoord[] {
  return [...cubes].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    if (a[2] !== b[2]) return a[2] - b[2];
    return a[0] - b[0];
  });
}

/** 剔除被完全遮挡的方块（在当前视角下，挡住三个可见面的方向上都有相邻方块的不画） */
export function cullOccludedCubes(cubes: CubeCoord[], view = 0): CubeCoord[] {
  const cubeSet = new Set(cubes.map(([x, y, z]) => `${x},${y},${z}`));
  return cubes.filter(([x, y, z]) => {
    if (view === 0) {
      const topBlocked = cubeSet.has(`${x},${y},${z + 1}`);
      const frontBlocked = cubeSet.has(`${x},${y - 1},${z}`);
      const rightBlocked = cubeSet.has(`${x + 1},${y},${z}`);
      if (topBlocked && frontBlocked && rightBlocked) return false;
    }
    return true;
  });
}

/** 计算某组合的三视图正投影矩阵（front 看 x–z，left 看 y–z 后在左，top 看 x–y 前在下） */
export function cubeStackProjections(cubes: CubeCoord[]): {
  front: number[][];
  left: number[][];
  top: number[][];
} {
  if (!cubes.length) {
    return { front: [], left: [], top: [] };
  }
  let maxX = 0;
  let maxY = 0;
  let maxZ = 0;
  for (const [x, y, z] of cubes) {
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  const cubeSet = new Set(cubes.map(([x, y, z]) => `${x},${y},${z}`));

  // 1. front：看 x–z 平面，有方块的格子画方格。行从上到下（z 从 maxZ 到 0），列从左到右（x 从 0 到 maxX）
  const frontRows = maxZ + 1;
  const frontCols = maxX + 1;
  const front: number[][] = Array.from({ length: frontRows }, () =>
    Array.from({ length: frontCols }, () => 0),
  );
  for (let r = 0; r < frontRows; r++) {
    const z = maxZ - r;
    for (let c = 0; c < frontCols; c++) {
      const x = c;
      let has = false;
      for (let y = 0; y <= maxY; y++) {
        if (cubeSet.has(`${x},${y},${z}`)) {
          has = true;
          break;
        }
      }
      front[r][c] = has ? 1 : 0;
    }
  }

  // 2. left：看 y–z 平面。左视图左右方向：从左面看时，后面的方块在左边（教材规定）
  //    行从上到下（z 从 maxZ 到 0），列从左到右（后面的 y = maxY 在左边 col 0，前面的 y = 0 在右边）
  const leftRows = maxZ + 1;
  const leftCols = maxY + 1;
  const left: number[][] = Array.from({ length: leftRows }, () =>
    Array.from({ length: leftCols }, () => 0),
  );
  for (let r = 0; r < leftRows; r++) {
    const z = maxZ - r;
    for (let c = 0; c < leftCols; c++) {
      const y = maxY - c;
      let has = false;
      for (let x = 0; x <= maxX; x++) {
        if (cubeSet.has(`${x},${y},${z}`)) {
          has = true;
          break;
        }
      }
      left[r][c] = has ? 1 : 0;
    }
  }

  // 3. top：看 x–y 平面。前面的在下方（y = 0 在最下方行，y = maxY 在最上方行 row 0）
  //    行从上到下（y 从 maxY 到 0），列从左到右（x 从 0 到 maxX）
  const topRows = maxY + 1;
  const topCols = maxX + 1;
  const top: number[][] = Array.from({ length: topRows }, () =>
    Array.from({ length: topCols }, () => 0),
  );
  for (let r = 0; r < topRows; r++) {
    const y = maxY - r;
    for (let c = 0; c < topCols; c++) {
      const x = c;
      let has = false;
      for (let z = 0; z <= maxZ; z++) {
        if (cubeSet.has(`${x},${y},${z}`)) {
          has = true;
          break;
        }
      }
      top[r][c] = has ? 1 : 0;
    }
  }

  return { front, left, top };
}

function parseRawCubes(p: Props): CubeCoord[] {
  if (Array.isArray(p.cubes)) {
    return p.cubes.filter(
      (c): c is CubeCoord =>
        Array.isArray(c) &&
        c.length === 3 &&
        typeof c[0] === 'number' &&
        typeof c[1] === 'number' &&
        typeof c[2] === 'number',
    );
  }
  if (Array.isArray(p.fill) && p.fill.length === 3) {
    const a = Math.max(1, Math.round(Number(p.fill[0]) || 1));
    const b = Math.max(1, Math.round(Number(p.fill[1]) || 1));
    const h = Math.max(1, Math.round(Number(p.fill[2]) || 1));
    return fillCubes([a, b, h]);
  }
  return [];
}

function labelsOf(p: Props): CubeStackLabels {
  let defaults: Record<string, string> = {};
  try {
    defaults =
      (sceneStyle().parts['cube-stack']?.labels as Record<string, string> | undefined) ?? {};
  } catch {
    // sceneStyle 未注入时的保底
  }
  const custom = (p.labels as Record<string, string> | undefined) ?? {};
  return {
    front: str(custom.front ?? defaults.front, ''),
    left: str(custom.left ?? defaults.left, ''),
    top: str(custom.top ?? defaults.top, ''),
  };
}

/** 纯函数计算小正方体组合的布局 */
export function cubeStackLayout(p: Props): CubeStackLayoutResult {
  const at = pt(p.at, [0, 0]);
  const unit = Math.max(1, num(p.unit, 44));
  const rawView = p.view ?? 'iso';
  const viewVal = parseView(rawView);
  const viewName = typeof rawView === 'string' ? rawView.trim().toLowerCase() : String(rawView);
  const project = Boolean(p.project);
  const colorName = str(p.color, 'blue');
  const labels = labelsOf(p);

  const rawCubes = parseRawCubes(p);
  const totalCount = rawCubes.length;
  const count = typeof p.count === 'number' && Number.isFinite(p.count) ? p.count : totalCount;

  const cam = cameraForView(rawView);
  const theta = (cam.obliqueAngle * Math.PI) / 180;
  const dr = cam.depthRatio;
  const oblDx = unit * dr * Math.cos(theta);
  const oblDy = -unit * dr * Math.sin(theta);

  let maxY = 0;
  for (const [, y] of rawCubes) {
    if (y > maxY) maxY = y;
  }

  const placedCubes: PlacedCube[] = rawCubes.map((coord, idx) => {
    const index = idx + 1; // 1-based index
    const [x, y, z] = coord;
    let fallOffset = 0;
    let isFalling = false;

    if (count < index) {
      if (index === Math.ceil(count)) {
        const frac = count - Math.floor(count);
        if (frac > 0.0001 && frac < 0.9999) {
          fallOffset = cubeFallOffset(frac, unit);
          isFalling = true;
        }
      }
    }

    const effectiveZ = z * unit + fallOffset;

    let cubeBox: Box;
    if (viewVal <= 1) {
      const sx = at[0] + x * unit + y * oblDx;
      const sy = at[1] - effectiveZ + y * oblDy;
      const minX = Math.min(sx, sx + oblDx);
      const maxX = Math.max(sx + unit, sx + unit + oblDx);
      const minY = Math.min(sy - unit, sy - unit + oblDy);
      const maxYVal = Math.max(sy, sy + oblDy);
      cubeBox = { x: minX, y: minY, w: maxX - minX, h: maxYVal - minY };
    } else if (viewVal === 2) {
      // left view
      const col = maxY - y;
      const sx = at[0] + col * unit;
      const sy = at[1] - effectiveZ;
      cubeBox = { x: sx, y: sy - unit, w: unit, h: unit };
    } else if (viewVal === 3) {
      // top view: front (y=0) at bottom
      const row = maxY - y;
      const sx = at[0] + x * unit;
      const sy = at[1] - (row + 1) * unit;
      cubeBox = { x: sx, y: sy, w: unit, h: unit };
    } else {
      // 连续插值视角保底
      const sx = at[0] + x * unit + y * oblDx;
      const sy = at[1] - effectiveZ + y * oblDy;
      cubeBox = { x: sx, y: sy - unit, w: unit, h: unit };
    }

    return {
      index,
      coord,
      x,
      y,
      z,
      effectiveZ,
      fallOffset,
      isFalling,
      box: cubeBox,
    };
  });

  // 当前可见且已下落（或正在下落）的方块
  const activeCount = Math.ceil(count);
  const activeCubes = placedCubes.slice(0, activeCount);

  // 剔除完全遮挡的方块
  const activeCoords = activeCubes.map((c) => c.coord);
  const culledSet = new Set(
    cullOccludedCubes(activeCoords, viewVal).map(([x, y, z]) => `${x},${y},${z}`),
  );
  const drawnCubes = activeCubes.filter(
    (c) => c.isFalling || culledSet.has(`${c.x},${c.y},${c.z}`),
  );

  // 3D/主体包围盒
  let mainBbox: Box;
  if (!activeCubes.length) {
    mainBbox = { x: at[0], y: at[1] - unit, w: unit, h: unit };
  } else {
    const minX = Math.min(...activeCubes.map((c) => c.box.x));
    const minY = Math.min(...activeCubes.map((c) => c.box.y));
    const maxX = Math.max(...activeCubes.map((c) => c.box.x + c.box.w));
    const maxYVal = Math.max(...activeCubes.map((c) => c.box.y + c.box.h));
    mainBbox = { x: minX, y: minY, w: maxX - minX, h: maxYVal - minY };
  }

  const projections = cubeStackProjections(rawCubes);

  // 若 project: true，在右侧计算三视图包围盒
  let totalBbox = mainBbox;
  let projectBox: Box | undefined;
  if (project && rawCubes.length > 0) {
    const cell = unit * 0.6;
    const pGap = 24;
    const titleH = 28;
    const startX = mainBbox.x + mainBbox.w + 36;
    let curX = startX;

    const viewsList = [
      { key: 'front' as const, m: projections.front },
      { key: 'left' as const, m: projections.left },
      { key: 'top' as const, m: projections.top },
    ];

    let maxProjH = 0;
    for (const v of viewsList) {
      const vW = (v.m[0]?.length ?? 1) * cell;
      const vH = v.m.length * cell + titleH;
      if (vH > maxProjH) maxProjH = vH;
      curX += Math.max(vW, 60) + pGap;
    }
    const projW = curX - startX - pGap;
    projectBox = { x: startX, y: mainBbox.y, w: projW, h: Math.max(mainBbox.h, maxProjH) };

    const minX = Math.min(mainBbox.x, projectBox.x);
    const minY = Math.min(mainBbox.y, projectBox.y);
    const maxX = Math.max(mainBbox.x + mainBbox.w, projectBox.x + projectBox.w);
    const maxYVal = Math.max(mainBbox.y + mainBbox.h, projectBox.y + projectBox.h);
    totalBbox = { x: minX, y: minY, w: maxX - minX, h: maxYVal - minY };
  }

  return {
    at,
    unit,
    view: viewVal,
    viewName,
    project,
    colorName,
    count,
    cubes: placedCubes,
    drawnCubes,
    camera: cam,
    projections,
    labels,
    box: totalBbox,
    projectBox,
  };
}

export const cubeStackPart: PartDef = {
  type: 'cube-stack',
  name: '小正方体组合',
  anchor: 'start',
  required: [],
  props: ['cubes', 'fill', 'unit', 'view', 'project', 'count', 'color', 'labels'],
  normalize(p) {
    let next = p;
    if (p.view !== undefined) {
      next = { ...next, view: parseView(p.view) };
    }
    return next;
  },
  bbox(p) {
    return cubeStackLayout(p).box;
  },
  subitems(p) {
    const layout = cubeStackLayout(p);
    const subs: Subitem[] = [];

    // 1. cube.<n>
    for (const c of layout.cubes) {
      subs.push({
        name: `cube.${c.index}`,
        box: c.box,
        label: String(c.index),
        value: c.index,
        disabled: c.index > Math.ceil(layout.count),
      });
    }

    // 2. layer.<z>
    const layerMap = new Map<number, Box[]>();
    for (const c of layout.cubes) {
      const list = layerMap.get(c.coord[2]) ?? [];
      list.push(c.box);
      layerMap.set(c.coord[2], list);
    }
    for (const [z, boxes] of layerMap.entries()) {
      const minX = Math.min(...boxes.map((b) => b.x));
      const minY = Math.min(...boxes.map((b) => b.y));
      const maxX = Math.max(...boxes.map((b) => b.x + b.w));
      const maxYVal = Math.max(...boxes.map((b) => b.y + b.h));
      subs.push({
        name: `layer.${z}`,
        box: { x: minX, y: minY, w: maxX - minX, h: maxYVal - minY },
        label: String(z),
        value: z,
      });
    }
    return subs;
  },
  Render({ p, ctx }) {
    const layout = cubeStackLayout(p);
    const { at, unit, view, camera, colorName, drawnCubes, project, projections, labels } = layout;

    const baseColor = color(colorName, ctx.theme, 'blue');
    const whiteColor = color('white', ctx.theme);
    const inkColor = color('ink', ctx.theme);
    const darkest = color('black', ctx.theme);
    const darken = sceneStyle().counterBorder?.darken ?? 0.3;
    const borderW = sceneStyle().counterBorder?.width ?? 2;

    const topFill = mixColor(baseColor, whiteColor, 0.35);
    const frontFill = baseColor;
    const rightFill = mixColor(baseColor, inkColor, 0.25);
    const strokeColor = mixColor(baseColor, darkest, darken);

    const theta = (camera.obliqueAngle * Math.PI) / 180;
    const dr = camera.depthRatio;
    const oblDx = unit * dr * Math.cos(theta);
    const oblDy = -unit * dr * Math.sin(theta);

    // 1. 2D 正投影视角直接渲染网格图
    if (view === 1 || view === 2 || view === 3) {
      let gridMatrix: number[][] = [];
      const cellW = unit;
      const startX = at[0];
      const startY = at[1];

      if (view === 1) {
        // front: x-z
        gridMatrix = projections.front;
      } else if (view === 2) {
        // left: y-z (back on left)
        gridMatrix = projections.left;
      } else if (view === 3) {
        // top: x-y (front at bottom)
        gridMatrix = projections.top;
      }

      const rows = gridMatrix.length;
      const totalH = rows * cellW;

      return (
        <g>
          {gridMatrix.map((rowArr, r) =>
            rowArr.map((hasCube, c) => {
              if (!hasCube) return null;
              const cellX = startX + c * cellW;
              const cellY = startY - totalH + r * cellW;
              return (
                <rect
                  key={`${r}-${c}`}
                  x={cellX}
                  y={cellY}
                  width={cellW}
                  height={cellW}
                  rx={cellW * 0.12}
                  fill={frontFill}
                  stroke={strokeColor}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              );
            }),
          )}
        </g>
      );
    }

    // 2. iso 或过渡视角：画家算法按顺序画小正方体的可见面
    const sortedDrawn = [...drawnCubes].sort((a, b) => {
      if (b.y !== a.y) return b.y - a.y;
      if (a.effectiveZ !== b.effectiveZ) return a.effectiveZ - b.effectiveZ;
      return a.x - b.x;
    });

    const cubeElements: ReactNode[] = sortedDrawn.map((cube) => {
      const { x, y, effectiveZ, index } = cube;
      const sx = at[0] + x * unit + y * oblDx;
      const sy = at[1] - effectiveZ + y * oblDy;

      // 正面 (Front Face)
      const pBL = `${sx},${sy}`;
      const pBR = `${sx + unit},${sy}`;
      const pTR = `${sx + unit},${sy - unit}`;
      const pTL = `${sx},${sy - unit}`;
      const frontPath = `M ${pBL} L ${pBR} L ${pTR} L ${pTL} Z`;

      // 顶面 (Top Face)
      const pTopBR = `${sx + unit + oblDx},${sy - unit + oblDy}`;
      const pTopBL = `${sx + oblDx},${sy - unit + oblDy}`;
      const topPath = `M ${pTL} L ${pTR} L ${pTopBR} L ${pTopBL} Z`;

      // 右侧面 (Right Face)
      const pRightBR = `${sx + unit + oblDx},${sy + oblDy}`;
      const rightPath = `M ${pBR} L ${pTR} L ${pTopBR} L ${pRightBR} Z`;

      const hasSideFaces = dr > 0.001;

      return (
        <g key={index}>
          {/* 正面 */}
          <path
            d={frontPath}
            fill={frontFill}
            stroke={strokeColor}
            strokeWidth={borderW}
            strokeLinejoin="round"
          />
          {/* 顶面 */}
          {hasSideFaces ? (
            <path
              d={topPath}
              fill={topFill}
              stroke={strokeColor}
              strokeWidth={borderW}
              strokeLinejoin="round"
            />
          ) : null}
          {/* 右侧面 */}
          {hasSideFaces ? (
            <path
              d={rightPath}
              fill={rightFill}
              stroke={strokeColor}
              strokeWidth={borderW}
              strokeLinejoin="round"
            />
          ) : null}
        </g>
      );
    });

    // 3. 若开启 project: true，在右侧同时画出三视图小方格图
    let projectElement: ReactNode = null;
    if (project && layout.projectBox) {
      const cell = unit * 0.6;
      const titleH = 28;
      const pGap = 24;
      const startX = layout.projectBox.x;
      const startY = layout.projectBox.y;

      const viewsList = [
        { key: 'front', label: labels.front, m: projections.front },
        { key: 'left', label: labels.left, m: projections.left },
        { key: 'top', label: labels.top, m: projections.top },
      ];

      let curX = startX;
      projectElement = (
        <g>
          {viewsList.map((v) => {
            const vW = (v.m[0]?.length ?? 1) * cell;
            const thisX = curX;
            curX += Math.max(vW, 60) + pGap;

            return (
              <g key={v.key}>
                {v.label ? (
                  <text
                    x={thisX + vW / 2}
                    y={startY + 18}
                    textAnchor="middle"
                    fill={inkColor}
                    fontSize={20}
                  >
                    {v.label}
                  </text>
                ) : null}
                {v.m.map((rowArr, r) =>
                  rowArr.map((hasCube, c) => {
                    if (!hasCube) return null;
                    return (
                      <rect
                        key={`${v.key}-${r}-${c}`}
                        x={thisX + c * cell}
                        y={startY + titleH + r * cell}
                        width={cell}
                        height={cell}
                        rx={cell * 0.12}
                        fill={frontFill}
                        stroke={strokeColor}
                        strokeWidth={2}
                        strokeLinejoin="round"
                      />
                    );
                  }),
                )}
              </g>
            );
          })}
        </g>
      );
    }

    return (
      <g>
        {cubeElements}
        {projectElement}
      </g>
    );
  },
};
