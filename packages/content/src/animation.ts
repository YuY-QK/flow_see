// 知识点配置 → 播放器用的 Animation（浏览器和 Node 都能用）。
import { SCHEMA_VERSION, fillParams, type Animation, type ThemeId } from '@flow-see/core';
import type { LessonContent } from './index';

export interface LessonAnimationOptions {
  /** “动手试一试”调过的参数；不传时用配置里的标准取值 */
  params?: Record<string, unknown>;
  /** 知识点没指定动画主题时用的主题（来自设置） */
  themeId?: ThemeId;
}

/**
 * 讲解、零件、动作里的 {参数名} 都会代入参数值。
 * 每一步：desc = 讲解（朗读）；data.show = 模板约定的画面状态；data.do = 场景模板的动作。
 */
export function lessonToAnimation(
  lesson: LessonContent,
  opts: LessonAnimationOptions = {},
): Animation {
  const params = { ...lesson.params, ...opts.params };
  const filled = fillParams({ objects: lesson.objects ?? [], steps: lesson.steps }, params);
  return {
    id: `lesson-${lesson.id}`,
    schemaVersion: SCHEMA_VERSION,
    title: lesson.title,
    templateId: lesson.template,
    themeId: lesson.theme ?? opts.themeId ?? 'flat',
    elements: [],
    steps: filled.steps.map((st, i) => ({
      id: `${lesson.id}-${i + 1}`,
      title: st.title ?? '',
      desc: st.say,
      data: { show: st.show, do: st.do ?? [] },
    })),
    params,
    config: { stage: lesson.stage, objects: filled.objects },
    settings: { autoNarrate: true, allowParamEdit: false },
    createdAt: 0,
    updatedAt: 0,
  };
}
