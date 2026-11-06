// 重复（repeat）：零件和动作都可以按次数复制，复制出来的每一份里 {i} 是第几份（从 1 开始），
// 还可以写算式，如 {total - 3 * i}。次数可以写参数，如 repeat: "{per}"。
//
//   objects:
//     - { repeat: "{per}", id: "sub{i}", type: text, text: "{total - 3 * i + 3} − 3 = {total - 3 * i}", at: [620, "{20 + 40 * i}"] }
//   do:
//     - repeat: "{per}"
//       do:
//         - deal: { target: pool, into: [pl1, pl2, pl3] }
//         - show: "sub{i}"
import { evalExpr, fillParams } from '@flow-see/core';

/** 重复次数的上限（防止写错时卡死） */
const MAX_REPEAT = 50;

function times(v: unknown, scope: Record<string, unknown>): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? evalExpr(v, scope) : undefined;
  return n === undefined ? 0 : Math.max(0, Math.min(MAX_REPEAT, Math.floor(n)));
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/** 展开零件列表里的 repeat */
export function expandObjects(
  list: readonly unknown[],
  scope: Record<string, unknown>,
): Record<string, unknown>[] {
  return list.flatMap((raw) => {
    if (!isObj(raw)) return [];
    if (!('repeat' in raw)) return [raw];
    const { repeat, ...rest } = raw;
    return Array.from({ length: times(repeat, scope) }, (_, k) =>
      fillParams(rest, { ...scope, i: k + 1 }),
    );
  });
}

/** 展开动作列表里的 repeat（不要嵌套：里面一层的 {i} 会被外面一层先代入） */
export function expandActions(
  list: readonly unknown[] | undefined,
  scope: Record<string, unknown>,
): unknown[] {
  return (list ?? []).flatMap((raw) => {
    if (!isObj(raw) || !('repeat' in raw)) return [raw];
    const body = Array.isArray(raw.do) ? raw.do : [];
    return Array.from({ length: times(raw.repeat, scope) }, (_, k) => {
      const inner = { ...scope, i: k + 1 };
      return expandActions(fillParams(body, inner) as unknown[], inner);
    }).flat();
  });
}

/** 是不是一条 repeat（检查工具用） */
export const isRepeat = (raw: unknown): boolean => isObj(raw) && 'repeat' in raw;
