import { describe, expect, it } from 'vitest';
import { tapDemoAnswers, tapResult, type TapSpec, type TapSubitem } from './tap';

describe('tapResult 判定函数', () => {
  it('单答案对 / 错', () => {
    const spec: TapSpec = {
      answer: 'c3',
      among: ['c1', 'c2', 'c3', 'c4', 'c5'],
    };

    // 点对
    const rCorrect = tapResult(spec, 'c3');
    expect(rCorrect.status).toBe('correct');
    expect(rCorrect.correct).toBe(true);
    expect(rCorrect.miss).toBe(false);
    expect(rCorrect.solved).toBe(true);
    expect(rCorrect.tapped).toEqual(['c3']);

    // 点错
    const rWrong = tapResult(spec, 'c2');
    expect(rWrong.status).toBe('wrong');
    expect(rWrong.correct).toBe(false);
    expect(rWrong.miss).toBe(true);
    expect(rWrong.solved).toBe(false);
    expect(rWrong.tapped).toEqual([]);
  });

  it('多答案逐个点完', () => {
    const spec: TapSpec = {
      answer: ['grid1.row.1', 'grid1.row.3'],
      among: ['grid1.row.*'],
    };

    // 第 1 个点对，尚未全部点完
    const r1 = tapResult(spec, 'grid1.row.1');
    expect(r1.status).toBe('correct');
    expect(r1.correct).toBe(true);
    expect(r1.miss).toBe(false);
    expect(r1.solved).toBe(false);
    expect(r1.tapped).toEqual(['grid1.row.1']);

    // 第 2 个点对，全部点完
    const r2 = tapResult(spec, 'grid1.row.3', r1.tapped);
    expect(r2.status).toBe('correct');
    expect(r2.correct).toBe(true);
    expect(r2.miss).toBe(false);
    expect(r2.solved).toBe(true);
    expect(r2.tapped).toEqual(['grid1.row.1', 'grid1.row.3']);
  });

  it('按条件点 3 个', () => {
    const spec: TapSpec = {
      pick: 3,
      among: ['chart.n.*'],
      valid: '{n % 2 == 0}',
    };
    const subitems: TapSubitem[] = [
      { id: 'chart', name: 'n.1', value: 1 },
      { id: 'chart', name: 'n.2', value: 2 },
      { id: 'chart', name: 'n.3', value: 3 },
      { id: 'chart', name: 'n.4', value: 4 },
      { id: 'chart', name: 'n.5', value: 5 },
      { id: 'chart', name: 'n.6', value: 6 },
    ];

    // 点第 1 个偶数 2
    const r1 = tapResult(spec, 'chart.n.2', [], subitems);
    expect(r1.status).toBe('correct');
    expect(r1.solved).toBe(false);
    expect(r1.tapped).toEqual(['chart.n.2']);

    // 点奇数 3 -> 做错
    const rWrong = tapResult(spec, 'chart.n.3', r1.tapped, subitems);
    expect(rWrong.status).toBe('wrong');
    expect(rWrong.miss).toBe(true);
    expect(rWrong.solved).toBe(false);
    expect(rWrong.tapped).toEqual(['chart.n.2']);

    // 点第 2 个偶数 4
    const r2 = tapResult(spec, 'chart.n.4', r1.tapped, subitems);
    expect(r2.status).toBe('correct');
    expect(r2.solved).toBe(false);
    expect(r2.tapped).toEqual(['chart.n.2', 'chart.n.4']);

    // 点第 3 个偶数 6 -> 达到 3 个，做对
    const r3 = tapResult(spec, 'chart.n.6', r2.tapped, subitems);
    expect(r3.status).toBe('correct');
    expect(r3.solved).toBe(true);
    expect(r3.tapped).toEqual(['chart.n.2', 'chart.n.4', 'chart.n.6']);
  });

  it('重复点同一个', () => {
    const spec: TapSpec = {
      answer: ['c1', 'c2'],
      among: ['c*'],
    };

    const r1 = tapResult(spec, 'c1');
    expect(r1.status).toBe('correct');

    // 再次点 c1
    const rRepeat = tapResult(spec, 'c1', r1.tapped);
    expect(rRepeat.status).toBe('repeat');
    expect(rRepeat.correct).toBe(false);
    expect(rRepeat.miss).toBe(false);
    expect(rRepeat.solved).toBe(false);
    expect(rRepeat.tapped).toEqual(['c1']);
  });

  it('点不可点的子项（忽略）', () => {
    const spec: TapSpec = {
      answer: 'c3',
      among: ['c1', 'c2', 'c3'],
    };

    // c9 不在 among 列表中，直接忽略，不计 miss
    const r = tapResult(spec, 'c9');
    expect(r.status).toBe('ignored');
    expect(r.correct).toBe(false);
    expect(r.miss).toBe(false);
    expect(r.solved).toBe(false);
  });

  it('支持传入数组形式的 tapped', () => {
    const spec: TapSpec = {
      answer: ['c1', 'c2'],
      among: ['c*'],
    };

    // 传入 [c1, c2]，最后一位为当前点击项
    const r = tapResult(spec, ['c1', 'c2']);
    expect(r.status).toBe('correct');
    expect(r.solved).toBe(true);
    expect(r.tapped).toEqual(['c1', 'c2']);
  });

  it('tapDemoAnswers 计算演示答案', () => {
    const specAns: TapSpec = {
      answer: ['c1', 'c2'],
    };
    expect(tapDemoAnswers(specAns)).toEqual(['c1', 'c2']);

    const specCond: TapSpec = {
      pick: 2,
      among: ['n.*'],
      valid: '{n % 3 == 0}',
    };
    const items: TapSubitem[] = [
      { name: 'n.1', value: 1 },
      { name: 'n.3', value: 3 },
      { name: 'n.5', value: 5 },
      { name: 'n.6', value: 6 },
      { name: 'n.9', value: 9 },
    ];
    expect(tapDemoAnswers(specCond, items)).toEqual(['n.3', 'n.6']);
  });
});
