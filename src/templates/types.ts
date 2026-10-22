import type { ComponentType } from 'react';
import type { Animation, Step, Theme } from '@/engine';

/**
 * 表单字段定义：编辑器按它自动生成表单。
 * 步骤字段的值存进 step.data[key]，作品参数存进 animation.params[key]。
 */
export interface FieldDef {
  key: string;
  label: string;
  /** element = 从作品的元素里选一个；numbers = 用逗号分隔的一组数字 */
  kind: 'text' | 'element' | 'select' | 'number' | 'numbers';
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** true 时收进“更多设置” */
  advanced?: boolean;
  /** 字段下方的说明 */
  hint?: string;
  /** numbers 字段的个数与取值范围 */
  min?: number;
  max?: number;
  minCount?: number;
  maxCount?: number;
}

export interface StageProps {
  animation: Animation;
  /** 当前播放到第几步（从 0 开始） */
  index: number;
  theme: Theme;
}

export interface Template {
  id: string;
  name: string;
  tagline: string;
  /** 元素的叫法，如“角色”“节点” */
  elementNoun: string;
  /** 元素区域下方的提示 */
  elementHint?: string;
  /** 为 0 时不显示元素编辑区 */
  minElements: number;
  maxElements: number;
  stepFields: FieldDef[];
  /** 作品级参数（如排序的数字、布局方式），存进 animation.params */
  paramFields?: FieldDef[];
  /** 参数区域的标题 */
  paramTitle?: string;
  /**
   * 有它时，步骤由参数自动生成：编辑器显示参数表单代替步骤表单，
   * 播放器里观众可以“试试改参数”重新生成并播放。
   */
  generate?(params: Record<string, unknown>): Step[];
  /** 空白作品（选模板后进入编辑器） */
  createBlank(): Animation;
  /** 示例作品（“从示例改起”） */
  createDefault(): Animation;
  /** 新增一步时的默认值，可参考上一步 */
  newStep(animation: Animation, prev?: Step): Partial<Step>;
  Stage: ComponentType<StageProps>;
}

/** 选模板页展示用的信息；available=false 表示后续版本开放。 */
export interface TemplateCard {
  id: string;
  name: string;
  tagline: string;
  scenes: string;
  available: boolean;
}
