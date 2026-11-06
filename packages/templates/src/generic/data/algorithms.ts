// 排序算法的步骤生成器：把算法的每一步记录成一帧快照，供舞台绘制。
import { createStep, type Step, t } from '@flow-see/core';

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
  bubble: t('common.mao_pao_pai_xu'),
  selection: t('algorithms.xuan_ze_pai_xu'),
  insertion: t('algorithms.cha_ru_pai_xu'),
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
  const big = order === 'asc' ? t('algorithms.da') : t('algorithms.xiao');
  r.frame(t('common.kai_shi'), t('algorithms.bubble_intro', { big }));
  for (let i = 0; i < n - 1; i++) {
    let swappedThisPass = false;
    const sorted = range(n - i, n);
    for (let j = 0; j < n - 1 - i; j++) {
      const a = r.v(j);
      const b = r.v(j + 1);
      r.compares++;
      const need = outOfOrder(a, b, order);
      r.frame(
        t('algorithms.compare', { a, b }),
        need ? t('algorithms.bubble_swap', { a, b, big }) : t('algorithms.shun_xu_mei_wen'),
        { active: [j, j + 1], sorted },
      );
      if (need) {
        r.swap(j, j + 1);
        swappedThisPass = true;
        r.frame(t('algorithms.swap_title', { a, b }), t('algorithms.liang_ge_shu_huan'), {
          active: [j, j + 1],
          swapped: true,
          sorted,
        });
      }
    }
    const done = range(n - 1 - i, n);
    if (!swappedThisPass) {
      r.frame(t('algorithms.pass_no_swap', { n: i + 1 }), t('algorithms.yi_ci_jiao_huan'), {
        sorted: range(0, n),
      });
      break;
    }
    r.frame(
      t('algorithms.pass_done', { n: i + 1 }),
      t('algorithms.pass_done_desc', { v: r.v(n - 1 - i) }),
      { sorted: done },
    );
  }
}

function selection(r: Recorder, order: Order) {
  const n = r.values.length;
  const small = order === 'asc' ? t('algorithms.xiao') : t('algorithms.da');
  r.frame(t('common.kai_shi'), t('algorithms.selection_intro', { small }));
  for (let i = 0; i < n - 1; i++) {
    const sorted = range(0, i);
    let m = i;
    r.frame(t('algorithms.pass_n', { n: i + 1 }), t('algorithms.assume', { v: r.v(i), small }), {
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
        t('algorithms.compare', { a: r.v(j), b: prev }),
        better
          ? t('algorithms.remember', { v: r.v(j), small })
          : t('algorithms.still', { v: prev, small }),
        { active: [j], marker: m, sorted },
      );
    }
    if (m !== i) {
      const a = r.v(i);
      const b = r.v(m);
      r.swap(i, m);
      r.frame(t('algorithms.swap_title', { a, b }), t('algorithms.place', { small, b, n: i + 1 }), {
        active: [i, m],
        swapped: true,
        sorted: range(0, i + 1),
      });
    } else {
      r.frame(t('algorithms.stay_title', { v: r.v(i) }), t('algorithms.stay_desc', { n: i + 1 }), {
        sorted: range(0, i + 1),
      });
    }
  }
}

function insertion(r: Recorder, order: Order) {
  const n = r.values.length;
  r.frame(t('common.kai_shi'), t('algorithms.cha_ru_pai_xu_2'), {
    sorted: [0],
  });
  for (let i = 1; i < n; i++) {
    r.frame(t('algorithms.pick', { v: r.v(i) }), t('algorithms.insert_into', { v: r.v(i) }), {
      active: [i],
      sorted: range(0, i),
    });
    let j = i;
    while (j > 0) {
      r.compares++;
      const a = r.v(j - 1);
      const b = r.v(j);
      if (!outOfOrder(a, b, order)) {
        r.frame(t('algorithms.compare', { a, b }), t('algorithms.found', { b }), {
          active: [j - 1, j],
          sorted: range(0, i),
        });
        break;
      }
      r.swap(j - 1, j);
      r.frame(t('algorithms.move_forward', { b }), t('algorithms.should_after', { a, b }), {
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
    r.frame(t('algorithms.zhi_you_yi_ge'), t('algorithms.yi_ge_shu_ben'), { sorted: range(0, n) });
    return r.steps;
  }
  ({ bubble, selection, insertion })[p.algorithm](r, p.order);
  r.frame(
    t('algorithms.pai_hao_le'),
    t('algorithms.summary', { compares: r.compares, swaps: r.swaps }),
    {
      sorted: range(0, n),
    },
  );
  return r.steps;
}

/** 从步骤里读出最后的排列结果（测试与调试用） */
export function resultOf(steps: Step[]): number[] {
  const f = steps[steps.length - 1].data as unknown as DataFrame;
  return f.order.map((id) => f.values[id]);
}
