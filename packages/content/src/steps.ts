// 步骤展开与过滤（Node 和浏览器都能用）。
import { evalExpr } from '@flow-see/core/params.ts';
import { fillParams } from '@flow-see/core/fill.ts';
import type { StepConfig } from './schema.ts';

export type ExpandedStep = Omit<StepConfig, 'repeat' | 'when'>;

/**
 * 展开步骤：按 repeat 复制每一步（代入 {i}），按 when 过滤条件为 0 的步骤。
 */
export function expandSteps(
  steps: StepConfig[] = [],
  params: Record<string, unknown> = {},
): ExpandedStep[] {
  const result: ExpandedStep[] = [];

  for (const step of steps) {
    if (step.repeat !== undefined) {
      const countVal =
        typeof step.repeat === 'number'
          ? step.repeat
          : evalExpr(step.repeat, params);
      const count =
        countVal !== undefined && Number.isFinite(countVal)
          ? Math.floor(countVal)
          : 0;

      if (count <= 0) {
        continue;
      }

      for (let i = 1; i <= count; i++) {
        const stepScope = { ...params, i };
        if (step.when !== undefined) {
          const cond = evalExpr(step.when, stepScope);
          if (cond === 0 || cond === undefined) {
            continue;
          }
        }
        const { repeat: _r, when: _w, ...stepData } = step;
        result.push(fillParams(stepData, stepScope));
      }
    } else {
      if (step.when !== undefined) {
        const cond = evalExpr(step.when, params);
        if (cond === 0 || cond === undefined) {
          continue;
        }
      }
      const { repeat: _r, when: _w, ...stepData } = step;
      result.push(fillParams(stepData, params));
    }
  }

  return result;
}
