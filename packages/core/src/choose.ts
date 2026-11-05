// 动手做的“点选答案”（choose）：选项的生成和判断。纯函数，浏览器和 Node 都能用。
//
// 配置（知识点步骤的 try.choose）：
//   answer：正确答案（数字，或文字如 "3/4"）；可以写成 "{参数}" 由参数代入。
//           写成列表时是多选：要把列表里的都选出来才算做对（选对的留着，选错的弹回）。
//   options：选项列表。不写时，答案是数字就自动生成：答案和离它最近的两个数（在 min–max 之内）。
//   min / max：自动生成选项时数字的范围。

export type ChooseValue = number | string;

export interface ChooseSpec {
  answer: ChooseValue | ChooseValue[];
  options?: ChooseValue[];
  min?: number;
  max?: number;
  /** 做错几次后高亮这些零件（零件 id） */
  show?: string[];
}

/** 一个选项的显示文字 */
export const chooseLabel = (v: ChooseValue): string => String(v);

/** 所有正确答案（单选时只有一个） */
export const chooseAnswers = (spec: ChooseSpec): ChooseValue[] =>
  Array.isArray(spec.answer) ? spec.answer : [spec.answer];

/** 是不是多选（答案写成了列表） */
export const isMultiChoose = (spec: ChooseSpec): boolean => Array.isArray(spec.answer);

/** 选对了吗（数字 3 和文字 "3" 算一样）；多选时是“这一项是不是答案之一” */
export const isAnswer = (spec: ChooseSpec, v: ChooseValue): boolean =>
  chooseAnswers(spec).some((a) => String(a) === String(v));

/**
 * 选项（已去重，答案一定在里面；没有打乱，由界面打乱）。
 * 配置错误时（选项少于 2 个、自动生成不出来）返回的个数会少于 2，由 content:check 报错。
 */
export function chooseOptions(spec: ChooseSpec): ChooseValue[] {
  const seen = new Set<string>();
  const out: ChooseValue[] = [];
  const add = (v: ChooseValue) => {
    if (!seen.has(String(v))) {
      seen.add(String(v));
      out.push(v);
    }
  };
  chooseAnswers(spec).forEach(add);
  if (spec.options) {
    spec.options.forEach(add);
    return out;
  }
  if (Array.isArray(spec.answer)) return out;
  const a = Number(spec.answer);
  if (!Number.isFinite(a)) return out;
  const lo = spec.min ?? 0;
  const hi = spec.max ?? Infinity;
  // 离答案最近的数优先：±1、±2、±3……取够 3 个
  for (let d = 1; out.length < 3 && d <= 20; d++)
    for (const c of [a - d, a + d]) if (c >= lo && c <= hi && out.length < 3) add(c);
  return out;
}

/** 打乱选项顺序（Fisher–Yates）；random 可以传入固定的随机数，测试用 */
export function shuffled<T>(list: readonly T[], random: () => number = Math.random): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 随机取一个；列表为空时返回 undefined */
export function pickOne<T>(list: readonly T[], random: () => number = Math.random): T | undefined {
  return list.length ? list[Math.floor(random() * list.length)] : undefined;
}
