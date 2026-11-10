// 动手做：按面值凑数（drag sum）的判定、可达性判断与贪心演示序列计算。纯函数，浏览器和 Node 都能用。

export interface SumItem {
  index: number;
  value: number;
}

export interface SumResult {
  status: 'correct' | 'over' | 'under';
  correct: boolean;
  solved: boolean;
  over: boolean;
  currentSum: number;
  targetSum: number;
  diff: number;
}

/**
 * 判定当前已放入柜台的面值之和：
 * - 柜台里面值之和 = sum → 做对（correct: true, solved: true）；
 * - > sum → 提示多了（over: true, correct: false）；
 * - < sum → 还没放够（status: 'under'）。
 */
export function sumResult(
  targetSum: number,
  current: number | { items: readonly SumItem[]; moved: readonly number[] },
): SumResult {
  let currentSum = 0;
  if (typeof current === 'number') {
    currentSum = current;
  } else {
    const itemMap = new Map<number, number>();
    for (const it of current.items) itemMap.set(it.index, it.value);
    for (const idx of current.moved) currentSum += itemMap.get(idx) ?? 0;
  }
  // 消除浮点误差（精确到分：0.01）
  currentSum = Math.round(currentSum * 100) / 100;
  const target = Math.round(targetSum * 100) / 100;
  const diffCents = Math.round((target - currentSum) * 100);

  if (diffCents === 0) {
    return {
      status: 'correct',
      correct: true,
      solved: true,
      over: false,
      currentSum,
      targetSum: target,
      diff: 0,
    };
  }

  if (diffCents < 0) {
    return {
      status: 'over',
      correct: false,
      solved: false,
      over: true,
      currentSum,
      targetSum: target,
      diff: Math.round(-diffCents) / 100,
    };
  }

  return {
    status: 'under',
    correct: false,
    solved: false,
    over: false,
    currentSum,
    targetSum: target,
    diff: Math.round(diffCents) / 100,
  };
}

/**
 * 动态规划判定：面值组合能否凑出目标金额（0/1 背包子集和问题）。
 * @param targetSum 目标金额（单位：元）
 * @param denominations 可选面值列表（单位：元）
 */
export function canMakeSum(targetSum: number, denominations: readonly number[]): boolean {
  const targetCents = Math.round(targetSum * 100);
  if (targetCents <= 0) return false;

  const coinCents = denominations
    .map((d) => Math.round(d * 100))
    .filter((c) => c > 0);

  const totalCents = coinCents.reduce((acc, c) => acc + c, 0);
  if (totalCents < targetCents) return false;

  const dp = new Uint8Array(targetCents + 1);
  dp[0] = 1;

  for (const c of coinCents) {
    for (let s = targetCents; s >= c; s--) {
      if (dp[s - c]) {
        dp[s] = 1;
      }
    }
  }

  return dp[targetCents] === 1;
}

/**
 * 贪心取面值（从大到小）凑出 sum 的演示序列。
 * 返回要移动的物品序号列表（按移动先后顺序排列）。
 * 若纯贪心未恰好凑齐，则回溯选取从大到小优先的最优解。
 */
export function greedySumSequence(
  targetSum: number,
  items: readonly SumItem[],
): number[] | undefined {
  const targetCents = Math.round(targetSum * 100);
  if (targetCents <= 0) return [];

  // 从大到小排序，面值相同按原 index 升序
  const sorted = [...items]
    .filter((it) => it.value > 0)
    .sort((a, b) => {
      const diff = b.value - a.value;
      return Math.abs(diff) > 1e-5 ? diff : a.index - b.index;
    });

  // 1. 优先尝试纯贪心：从大到小能选就选
  let remCents = targetCents;
  const greedyChosen: number[] = [];
  for (const it of sorted) {
    const valCents = Math.round(it.value * 100);
    if (valCents <= remCents) {
      greedyChosen.push(it.index);
      remCents -= valCents;
      if (remCents === 0) break;
    }
  }

  if (remCents === 0) {
    return greedyChosen;
  }

  // 2. 若纯贪心未恰好凑齐，采用回溯寻找从大到小优先的合法解
  function backtrack(idx: number, remaining: number, chosen: number[]): number[] | undefined {
    if (remaining === 0) return chosen;
    if (idx >= sorted.length) return undefined;

    for (let i = idx; i < sorted.length; i++) {
      const it = sorted[i];
      const val = Math.round(it.value * 100);
      if (val <= remaining) {
        const res = backtrack(i + 1, remaining - val, [...chosen, it.index]);
        if (res) return res;
      }
    }
    return undefined;
  }

  return backtrack(0, targetCents, []);
}
