// 排序算法的步骤生成器：把算法的每一步记录成一帧快照，供舞台绘制。
import { createStep, type Step } from '@/engine';

export type Algorithm = 'bubble' | 'selection' | 'insertion';
export type Order = 'asc' | 'desc';

export interface DataParams {
  values: number[];
  algorithm: Algorithm;
  order: Order;
}

/** 每一步的快照 */
export interface DataFrame {
  /** 原始数值，按“元素编号”排列 */
  values: number[];
  /** 当前每个位置上是哪个元素（元素编号） */
  order: number[];
  /** 正在比较或移动的位置 */
  active: number[];
  /** 本步是否发生了交换 */
  swapped: boolean;
  /** 已经排好的位置 */
  sorted: number[];
  /** 选择排序中“目前最小（最大）”的位置 */
  marker?: number;
  compares: number;
  swaps: number;
}

export const ALGORITHM_NAMES: Record<Algorithm, string> = {
  bubble: '冒泡排序',
  selection: '选择排序',
  insertion: '插入排序',
};

export const DEFAULT_PARAMS: DataParams = {
  values: [5, 2, 8, 1, 9],
  algorithm: 'bubble',
  order: 'asc',
};

export function normalizeParams(raw: Record<string, unknown> | undefined): DataParams {
  const p = raw ?? {};
  const values = Array.isArray(p.values)
    ? p.values.map(Number).filter((v) => Number.isFinite(v))
    : DEFAULT_PARAMS.values;
  const algorithm =
    (p.algorithm as Algorithm) in ALGORITHM_NAMES ? (p.algorithm as Algorithm) : 'bubble';
  const order: Order = p.order === 'desc' ? 'desc' : 'asc';
  return { values: values.length ? values : DEFAULT_PARAMS.values, algorithm, order };
}

class Recorder {
  steps: Step[] = [];
  order: number[];
  compares = 0;
  swaps = 0;

  constructor(readonly values: number[]) {
    this.order = values.map((_, i) => i);
  }

  v(pos: number) {
    return this.values[this.order[pos]];
  }

  swap(i: number, j: number) {
    [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
    this.swaps++;
  }

  frame(
    title: string,
    desc: string,
    opts: { active?: number[]; swapped?: boolean; sorted?: number[]; marker?: number } = {},
  ) {
    const data: DataFrame = {
      values: this.values,
      order: [...this.order],
      active: opts.active ?? [],
      swapped: opts.swapped ?? false,
      sorted: opts.sorted ?? [],
      marker: opts.marker,
      compares: this.compares,
      swaps: this.swaps,
    };
    this.steps.push(createStep({ title, desc, data: data as unknown as Record<string, unknown> }));
  }
}

const range = (from: number, to: number) =>
  Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);

/** a 是否应该排在 b 后面（即需要交换） */
function outOfOrder(a: number, b: number, order: Order) {
  return order === 'asc' ? a > b : a < b;
}

function bubble(r: Recorder, order: Order) {
  const n = r.values.length;
  const big = order === 'asc' ? '大' : '小';
  r.frame('开始', `冒泡排序会反复比较相邻的两个数，把较${big}的往后“冒”。`);
  for (let i = 0; i < n - 1; i++) {
    let swappedThisPass = false;
    const sorted = range(n - i, n);
    for (let j = 0; j < n - 1 - i; j++) {
      const a = r.v(j);
      const b = r.v(j + 1);
      r.compares++;
      const need = outOfOrder(a, b, order);
      r.frame(
        `比较 ${a} 和 ${b}`,
        need ? `${a} 比 ${b} ${big}，位置不对，要交换。` : '顺序没问题，不用动。',
        { active: [j, j + 1], sorted },
      );
      if (need) {
        r.swap(j, j + 1);
        swappedThisPass = true;
        r.frame(`交换 ${a} 和 ${b}`, '两个数换了位置。', {
          active: [j, j + 1],
          swapped: true,
          sorted,
        });
      }
    }
    const done = range(n - 1 - i, n);
    if (!swappedThisPass) {
      r.frame(`第 ${i + 1} 轮没有交换`, '一次交换都没有，说明已经全部排好，可以提前结束。', {
        sorted: range(0, n),
      });
      break;
    }
    r.frame(`第 ${i + 1} 轮结束`, `${r.v(n - 1 - i)} 已经到了它最终的位置。`, { sorted: done });
  }
}

function selection(r: Recorder, order: Order) {
  const n = r.values.length;
  const small = order === 'asc' ? '小' : '大';
  r.frame('开始', `选择排序每一轮从没排好的数里挑出最${small}的，放到前面。`);
  for (let i = 0; i < n - 1; i++) {
    const sorted = range(0, i);
    let m = i;
    r.frame(`第 ${i + 1} 轮`, `先假设 ${r.v(i)} 是剩下的数里最${small}的。`, {
      active: [i],
      marker: m,
      sorted,
    });
    for (let j = i + 1; j < n; j++) {
      r.compares++;
      const better = outOfOrder(r.v(m), r.v(j), order);
      const prev = r.v(m);
      if (better) m = j;
      r.frame(
        `比较 ${r.v(j)} 和 ${prev}`,
        better ? `${r.v(j)} 更${small}，记住它。` : `${prev} 仍然是最${small}的。`,
        { active: [j], marker: m, sorted },
      );
    }
    if (m !== i) {
      const a = r.v(i);
      const b = r.v(m);
      r.swap(i, m);
      r.frame(`交换 ${a} 和 ${b}`, `把最${small}的 ${b} 放到第 ${i + 1} 个位置。`, {
        active: [i, m],
        swapped: true,
        sorted: range(0, i + 1),
      });
    } else {
      r.frame(`${r.v(i)} 不用动`, `它已经在第 ${i + 1} 个位置上了。`, {
        sorted: range(0, i + 1),
      });
    }
  }
}

function insertion(r: Recorder, order: Order) {
  const n = r.values.length;
  r.frame('开始', '插入排序像整理扑克牌：每次拿起一张，插到前面已排好的牌里合适的位置。', {
    sorted: [0],
  });
  for (let i = 1; i < n; i++) {
    r.frame(`拿起 ${r.v(i)}`, `把 ${r.v(i)} 插到前面已经排好的部分里。`, {
      active: [i],
      sorted: range(0, i),
    });
    let j = i;
    while (j > 0) {
      r.compares++;
      const a = r.v(j - 1);
      const b = r.v(j);
      if (!outOfOrder(a, b, order)) {
        r.frame(`比较 ${a} 和 ${b}`, `${b} 找到了位置，停在这里。`, {
          active: [j - 1, j],
          sorted: range(0, i),
        });
        break;
      }
      r.swap(j - 1, j);
      r.frame(`${b} 往前移`, `${a} 应该排在 ${b} 后面，两者交换。`, {
        active: [j - 1, j],
        swapped: true,
        sorted: range(0, i),
      });
      j--;
    }
  }
}

export function generateDataSteps(raw: Record<string, unknown> | undefined): Step[] {
  const p = normalizeParams(raw);
  const r = new Recorder(p.values);
  const n = p.values.length;
  if (n < 2) {
    r.frame('只有一个数', '一个数本身就是排好的。', { sorted: range(0, n) });
    return r.steps;
  }
  ({ bubble, selection, insertion })[p.algorithm](r, p.order);
  r.frame('排好了！', `一共比较了 ${r.compares} 次，交换了 ${r.swaps} 次。`, {
    sorted: range(0, n),
  });
  return r.steps;
}

/** 从步骤里读出最后的排列结果（测试与调试用） */
export function resultOf(steps: Step[]): number[] {
  const f = steps[steps.length - 1].data as unknown as DataFrame;
  return f.order.map((id) => f.values[id]);
}
