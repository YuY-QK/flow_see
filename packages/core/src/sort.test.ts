import { describe, expect, it } from 'vitest';
import {
  binItemPosition,
  findDropBin,
  sortResult,
  type BinBox,
  type SortItem,
  type SortSpec,
} from './sort';

describe('sortResult 分类拖放判定', () => {
  const spec: SortSpec = {
    from: 'fruits',
    by: 'color',
    bins: {
      red: 'binRed',
      yellow: 'binYellow',
    },
  };

  const item1: SortItem = { index: 1, tags: { color: 'red' } };
  const item2: SortItem = { index: 2, tags: { color: 'red' } };
  const item3: SortItem = { index: 3, tags: { color: 'yellow' } };

  it('放错：放进错误的筐或放在筐外，返回 status: wrong 且 miss: true', () => {
    // 放进错误的筐
    const r1 = sortResult(spec, item1, 'binYellow', [], 3);
    expect(r1.status).toBe('wrong');
    expect(r1.correct).toBe(false);
    expect(r1.miss).toBe(true);
    expect(r1.solved).toBe(false);
    expect(r1.moved).toEqual([]);
    expect(r1.expectedBin).toBe('binRed');
    expect(r1.targetBin).toBe('binYellow');

    // 落在筐外
    const r2 = sortResult(spec, item1, undefined, [], 3);
    expect(r2.status).toBe('wrong');
    expect(r2.correct).toBe(false);
    expect(r2.miss).toBe(true);
    expect(r2.moved).toEqual([]);

    // 物品没有对应标签
    const r3 = sortResult(spec, { index: 4 }, 'binRed', [], 3);
    expect(r3.status).toBe('wrong');
    expect(r3.correct).toBe(false);
    expect(r3.miss).toBe(true);
  });

  it('部分完成：放进正确的筐但尚未放完，返回 status: correct 且 solved: false', () => {
    const r1 = sortResult(spec, item1, 'binRed', [], 3);
    expect(r1.status).toBe('correct');
    expect(r1.correct).toBe(true);
    expect(r1.miss).toBe(false);
    expect(r1.solved).toBe(false);
    expect(r1.moved).toEqual([1]);
    expect(r1.targetBin).toBe('binRed');

    // 第二个物品放对
    const r2 = sortResult(spec, item2, 'binRed', [1], 3);
    expect(r2.status).toBe('correct');
    expect(r2.correct).toBe(true);
    expect(r2.solved).toBe(false);
    expect(r2.moved).toEqual([1, 2]);
  });

  it('全对：全部物品正确放进对应的筐，返回 status: correct 且 solved: true', () => {
    const r3 = sortResult(spec, item3, 'binYellow', [1, 2], 3);
    expect(r3.status).toBe('correct');
    expect(r3.correct).toBe(true);
    expect(r3.miss).toBe(false);
    expect(r3.solved).toBe(true);
    expect(r3.moved).toEqual([1, 2, 3]);
    expect(r3.targetBin).toBe('binYellow');
  });

  it('已放入的物品重复判定不重复追加索引', () => {
    const r = sortResult(spec, item1, 'binRed', [1], 3);
    expect(r.correct).toBe(true);
    expect(r.moved).toEqual([1]);
  });
});

describe('findDropBin 判定落点落在哪个筐', () => {
  const bins: BinBox[] = [
    { id: 'outer', box: { x: 100, y: 100, w: 300, h: 200 } },
    { id: 'inner', box: { x: 150, y: 150, w: 100, h: 80 } },
    { id: 'right', box: { x: 500, y: 100, w: 200, h: 200 } },
  ];

  it('落点在独立筐内', () => {
    expect(findDropBin([550, 150], bins)).toBe('right');
  });

  it('落点在所有筐外', () => {
    expect(findDropBin([50, 50], bins)).toBeUndefined();
  });

  it('在 dropPadding 外扩范围内有效', () => {
    // [500, 100] 外左侧 10px：[490, 100]
    expect(findDropBin([490, 150], bins, 0)).toBeUndefined();
    expect(findDropBin([490, 150], bins, 20)).toBe('right');
  });

  it('多个筐嵌套时取包含落点的面积最小的那个', () => {
    // [180, 180] 既在 outer 内，也在 inner 内；inner 面积 100*80=8000 < outer 300*200=60000
    expect(findDropBin([180, 180], bins)).toBe('inner');
    // [120, 120] 仅在 outer 内
    expect(findDropBin([120, 120], bins)).toBe('outer');
  });
});

describe('binItemPosition 筐内网格位置', () => {
  const binBox = { x: 180, y: 330, w: 240, h: 130 };
  const itemSize = 52;
  // cols = floor(240 / 52) = 4
  // padX = (240 - 4 * 52) / 2 = 16
  // maxRows = floor(130 / 52) = 2
  // padY = (130 - 2 * 52) / 2 = 13

  it('第 1 行物品按序排列，每行 4 个', () => {
    const p0 = binItemPosition(binBox, itemSize, 0);
    expect(p0.box.x).toBe(180 + 16);
    expect(p0.box.y).toBe(330 + 13);
    expect(p0.at).toEqual([180 + 16 + 26, 330 + 13 + 26]);

    const p1 = binItemPosition(binBox, itemSize, 1);
    expect(p1.box.x).toBe(180 + 16 + 52);
    expect(p1.box.y).toBe(330 + 13);

    const p3 = binItemPosition(binBox, itemSize, 3);
    expect(p3.box.x).toBe(180 + 16 + 52 * 3);
    expect(p3.box.y).toBe(330 + 13);
  });

  it('超过每行容量后自动折行至第 2 行', () => {
    const p4 = binItemPosition(binBox, itemSize, 4);
    expect(p4.box.x).toBe(180 + 16);
    expect(p4.box.y).toBe(330 + 13 + 52);
  });
});
