import type { ComponentType } from 'react';
import type { Animation, Step, Theme } from '@/engine';

/** 表单字段定义：编辑器按它自动生成表单，值存进 step.data[key]。 */
export interface FieldDef {
  key: string;
  label: string;
  /** element = 从作品的元素里选一个 */
  kind: 'text' | 'element' | 'select' | 'number';
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** true 时收进“更多设置” */
  advanced?: boolean;
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
  minElements: number;
  maxElements: number;
  stepFields: FieldDef[];
  /** 新建时带的示例内容 */
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
