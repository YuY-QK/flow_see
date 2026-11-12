import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { lessonToAnimation, type StepConfig, type LessonConfig } from '@flow-see/content';
import { loadContent } from '../../../../packages/content/src/load';
import { CONTENT_ROOT } from '../../../../packages/content/src/json-schema';
import { getTemplate } from '@flow-see/templates';
import { LessonPlayer, type HandsMode } from './LessonPlayer';
import {
  tapResult,
  turnResult,
  sortResult,
  placeResult,
  sumResult,
} from '@flow-see/core';

/**
 * 样板知识点与动手方式对应关系（涵盖全部 7 种动手方式）：
 * 1. choose (点选选项): count-to-10
 * 2. drag (计数块拖动): make-ten
 * 3. tap (点选零件/子项): cardinal-ordinal
 * 4. turn (转动把手): clock-half
 * 5. sort (分类拖放): classify-single
 * 6. place (拖到位): parallelogram-area
 * 7. drag-sum (按面值凑数): money-shopping-1
 */
const MECHANISM_SAMPLES: Array<{
  mechanism: 'choose' | 'drag' | 'tap' | 'turn' | 'sort' | 'place' | 'drag-sum';
  lessonId: string;
  checkStep: (step: StepConfig) => boolean;
}> = [
  {
    mechanism: 'choose',
    lessonId: 'count-to-10',
    checkStep: (step) => Boolean(step.try?.choose),
  },
  {
    mechanism: 'drag',
    lessonId: 'make-ten',
    checkStep: (step) => Boolean(step.try?.drag && !step.try.drag.sum),
  },
  {
    mechanism: 'tap',
    lessonId: 'cardinal-ordinal',
    checkStep: (step) => Boolean(step.try?.tap),
  },
  {
    mechanism: 'turn',
    lessonId: 'clock-half',
    checkStep: (step) => Boolean(step.try?.turn),
  },
  {
    mechanism: 'sort',
    lessonId: 'classify-single',
    checkStep: (step) => Boolean(step.try?.sort),
  },
  {
    mechanism: 'place',
    lessonId: 'parallelogram-area',
    checkStep: (step) => Boolean(step.try?.place),
  },
  {
    mechanism: 'drag-sum',
    lessonId: 'money-shopping-1',
    checkStep: (step) => Boolean(step.try?.drag?.sum),
  },
];

describe('每种动手方式样板知识点走通测试', () => {
  const { bundle } = loadContent(CONTENT_ROOT);
  const lessonsById = new Map<string, LessonConfig>(
    bundle ? bundle.lessons.map((item) => [item.lesson.id, item.lesson]) : [],
  );

  for (const { mechanism, lessonId, checkStep } of MECHANISM_SAMPLES) {
    describe(`动手方式 [${mechanism}] 样板知识点: ${lessonId}`, () => {
      const lesson = lessonsById.get(lessonId);

      it('知识点配置存在且包含对应动手方式的步骤', () => {
        expect(lesson, `知识点 ${lessonId} 应该在课程包中`).toBeDefined();
        if (!lesson) return;
        const hasMatchingStep = lesson.steps.some(checkStep);
        expect(hasMatchingStep, `知识点 ${lessonId} 必须包含动手方式 ${mechanism} 的步骤`).toBe(true);
      });

      it('能够在播放器内正常渲染所有学习模式与全部步骤，不崩溃（防止布局函数传入未经规整的原始属性）', () => {
        if (!lesson) return;
        const anim = lessonToAnimation(lesson);
        const template = getTemplate(anim.templateId);
        expect(template).toBeDefined();
        if (!template) return;
        const modes: HandsMode[] = ['watch', 'guided', 'self'];

        for (const mode of modes) {
          for (let step = 0; step < anim.steps.length; step++) {
            // 在 SSR / 静态渲染模式下渲染 LessonPlayer，模拟页面生命周期
            expect(() => {
              const html = renderToStaticMarkup(
                createElement(LessonPlayer, {
                  animation: anim,
                  template,
                  mode,
                  startIndex: step,
                  autoPlay: false,
                  largeCaption: false,
                  onVisit: () => {},
                  onFinish: () => {},
                }),
              );
              expect(html).toBeTruthy();
            }).not.toThrow();
          }
        }
      });
    });
  }

  describe('各动手方式核心判定与解题逻辑验证', () => {
    it('tap 判定逻辑能正常判断并达到做对条件', () => {
      const spec = { answer: 'o3', among: ['o1', 'o2', 'o3'] };
      const res = tapResult(spec, 'o3');
      expect(res.correct).toBe(true);
      expect(res.solved).toBe(true);
    });

    it('turn 判定逻辑能在容差范围内判断做对', () => {
      const spec = { target: 'clock', prop: 'minute', answer: 180, tolerance: 10 };
      const res = turnResult(spec, 182);
      expect(res.correct).toBe(true);
      expect(res.status).toBe('correct');
    });

    it('sort 判定逻辑能在全部物品放对后完成', () => {
      const spec = {
        from: 'items',
        by: 'color',
        bins: { red: 'bin_red', blue: 'bin_blue' },
      };
      const item = { index: 1, tags: { color: 'red' } };
      const res = sortResult(spec, item, 'bin_red', [1], 1);
      expect(res.correct).toBe(true);
      expect(res.solved).toBe(true);
    });

    it('place 判定逻辑能在坐标与角度满足容差时完成', () => {
      const spec = { target: 'poly', to: [100, 200] as [number, number], rotate: 0 };
      const res = placeResult(spec, [102, 199], 0, { defaultTolerance: 10 });
      expect(res.correct).toBe(true);
      expect(res.status).toBe('correct');
    });

    it('drag-sum 判定逻辑能在面值凑齐时完成', () => {
      const items = [
        { index: 1, value: 5 },
        { index: 2, value: 1 },
        { index: 3, value: 1 },
        { index: 4, value: 1 },
      ];
      // 5 元 + 1 元 + 1 元 + 1 元 = 8 元
      const res = sumResult(8, { items, moved: [1, 2, 3, 4] });
      expect(res.correct).toBe(true);
      expect(res.solved).toBe(true);
    });
  });
});
