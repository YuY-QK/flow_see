// 动手做：分类拖放（sort）的判定与筐内网格布局计算。纯函数，浏览器和 Node 都能用。

export interface SortSpec {
  from: string;
  by: string;
  bins: Record<string, string>;
}

export interface SortItem {
  index: number;
  tags?: Record<string, string>;
}

export interface SortResult {
  status: 'correct' | 'wrong';
  correct: boolean;
  miss: boolean;
  solved: boolean;
  moved: number[];
  targetBin?: string;
  expectedBin?: string;
}

export interface BinBox {
  id: string;
  box: { x: number; y: number; w: number; h: number };
}

/**
 * 判定分类拖放的结果：
 * 放进的筐 = 物品类别对应的筐 → 留下；
 * 否则弹回、做错一次；
 * 全部放完 → 做对。
 */
export function sortResult(
  spec: SortSpec,
  item: SortItem,
  targetBin: string | undefined,
  moved: readonly number[],
  totalCount: number,
): SortResult {
  const tagValue = item.tags?.[spec.by];
  const expectedBin = tagValue !== undefined ? spec.bins[tagValue] : undefined;

  if (targetBin !== undefined && expectedBin !== undefined && targetBin === expectedBin) {
    const newMoved = moved.includes(item.index) ? [...moved] : [...moved, item.index];
    const solved = newMoved.length >= totalCount;
    return {
      status: 'correct',
      correct: true,
      miss: false,
      solved,
      moved: newMoved,
      targetBin,
      expectedBin,
    };
  }

  return {
    status: 'wrong',
    correct: false,
    miss: true,
    solved: false,
    moved: [...moved],
    targetBin,
    expectedBin,
  };
}

/**
 * 判定落点落在哪个筐：
 * - 落点在筐的包围盒内（外扩 pad）；
 * - 多个筐嵌套时取包含落点的面积最小的那个；
 * - 都不在时返回 undefined。
 */
export function findDropBin(
  point: [number, number],
  bins: readonly BinBox[],
  pad = 0,
): string | undefined {
  const [px, py] = point;
  const candidates: { id: string; area: number }[] = [];

  for (const bin of bins) {
    const b = bin.box;
    const inBox =
      px >= b.x - pad &&
      px <= b.x + b.w + pad &&
      py >= b.y - pad &&
      py <= b.y + b.h + pad;
    if (inBox) {
      candidates.push({ id: bin.id, area: b.w * b.h });
    }
  }

  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => a.area - b.area);
  return candidates[0].id;
}

/**
 * 已放好的物品在筐里的网格位置计算：
 * - 按筐内顺序排成网格；
 * - 每行 floor(筐宽 / 物品格子) 个；
 * - 水平与垂直在筐内居中。
 */
export function binItemPosition(
  binBox: { x: number; y: number; w: number; h: number },
  itemSize: number,
  indexInBin: number,
): { at: [number, number]; box: { x: number; y: number; w: number; h: number } } {
  const size = Math.max(1, itemSize);
  const cols = Math.max(1, Math.floor(binBox.w / size));
  const maxRows = Math.max(1, Math.floor(binBox.h / size));
  const padX = (binBox.w - cols * size) / 2;
  const padY = (binBox.h - maxRows * size) / 2;

  const col = indexInBin % cols;
  const row = Math.floor(indexInBin / cols);

  const x = binBox.x + padX + col * size;
  const y = binBox.y + padY + row * size;

  return {
    at: [x + size / 2, y + size / 2],
    box: { x, y, w: size, h: size },
  };
}
