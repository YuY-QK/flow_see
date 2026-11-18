// 步骤展开与过滤（Node 和浏览器都能用）。
import { evalExpr } from '@flow-see/core/params.ts';
import { fillParams } from '@flow-see/core/fill.ts';
import type { StepConfig } from './schema.ts';

export type ExpandedStep = Omit<StepConfig, 'repeat' | 'when'>;

export interface ExpandedStepEntry {
  step: ExpandedStep;
  /** 原配置 steps 数组的下标（0 起） */
  sourceIndex: number;
  /** repeat 展开时的序号（1 起）；非 repeat 步骤为 0 */
  repeatIndex: number;
}

/**
 * 展开步骤并保留原步骤下标与重复序号：按 repeat 复制每一步（代入 {i}），按 when 过滤条件为 0 的步骤。
 */
export function expandStepsWithMeta(
  steps: StepConfig[] = [],
  params: Record<string, unknown> = {},
): ExpandedStepEntry[] {
  const result: ExpandedStepEntry[] = [];

  for (let sourceIndex = 0; sourceIndex < steps.length; sourceIndex++) {
    const step = steps[sourceIndex];
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
        result.push({
          step: fillParams(stepData, stepScope),
          sourceIndex,
          repeatIndex: i,
        });
      }
    } else {
      if (step.when !== undefined) {
        const cond = evalExpr(step.when, params);
        if (cond === 0 || cond === undefined) {
          continue;
        }
      }
      const { repeat: _r, when: _w, ...stepData } = step;
      result.push({
        step: fillParams(stepData, params),
        sourceIndex,
        repeatIndex: 0,
      });
    }
  }

  return result;
}

/**
 * 展开步骤：按 repeat 复制每一步（代入 {i}），按 when 过滤条件为 0 的步骤。
 */
export function expandSteps(
  steps: StepConfig[] = [],
  params: Record<string, unknown> = {},
): ExpandedStep[] {
  return expandStepsWithMeta(steps, params).map((entry) => entry.step);
}
