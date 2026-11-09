import type { ComponentType } from 'react';
import type { Animation, ChooseSpec, Step, Theme } from '@flow-see/core';

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

/** 画面范围（舞台坐标） */
export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StageProps {
  animation: Animation;
  /** 当前播放到第几步（从 0 开始） */
  index: number;
  theme: Theme;
  /** 静止画面（导出视频/GIF 时用）：不播放进场动画，直接画出这一步的最终样子 */
  still?: boolean;
  /**
   * 连续时间模型：这一步动画段的进度 t∈[0,1]（教学平台方案 4.1）。
   * 不传时按 1 处理（这一步的完整画面）；现有四个模板可以不管它。
   */
  progress?: number;
  /** 动手做（跟着做 / 自己做）：这一步由孩子来做；不传时照常播放 */
  tryIt?: StageTry;
  /** 画面范围：不传时是整个舞台。手机上贴合内容时由播放器传入（见 Template.viewBox） */
  viewBox?: ViewBox;
}

/** 动手做的配置（知识点步骤里的 try，已代入参数） */
export interface TrySpec {
  task: string;
  /**
   * 拖动：把 from 这组计数块拖 count 个到 to 上。to 写成列表时是“一个一个分”：
   * 每个目标最多放 each 个（不写时平均：count ÷ 目标个数）。
   */
  drag?: { from: string; to: string | string[]; count: number | string; each?: number | string };
  choose?: ChooseSpec;
  tap?: { answer?: string[] | string; among?: string[]; pick?: number | string; valid?: string };
  turn?: {
    target: string;
    prop: string;
    answer: number | string;
    tolerance?: number | string;
    step?: number | string;
  };
  hints?: string[];
}

/**
 * 舞台上的动手做：
 * - doing：画面停在这一步开头，孩子拖动；moved 是已经拖对的计数块（按原来的序号）；
 * - solved：孩子做对了，这一步接着放，被孩子做掉的动作（拖动对应的拆分、移动）直接到位。
 */
export interface StageTry {
  phase: 'doing' | 'solved';
  moved?: number[];
  /** 拖动到多个目标时：moved 里每一个放进了哪个目标（和 moved 一一对应） */
  placed?: string[];
  /** doing 时，提问前那一段动作（do 里 ask 之前的）放到哪了，0–1 */
  progress?: number;
  /** 高亮该放到哪里 / 该看哪里（做错几次后） */
  showTarget?: boolean;
  /** 孩子放下一个计数块：target = 放进了哪个目标（零件 id），放在外面时为 undefined */
  onDrop?(index: number, target: string | undefined): void;
  tap?: { among?: string[] } | boolean;
  turn?: { target: string; prop?: string; step?: number } | boolean;
  onTap?(id: string, sub?: string): void;
  onTurn?(value: number, done: boolean): void;
  /** 已点对的子项，画成保持描边 */
  tapped?: string[];
  /** 把手当前的转动数值 */
  turnValue?: number;
}

/** 知识点配置里与模板有关的部分（结构与 packages/content 的 lesson 一致，这里不依赖 content） */
export interface LessonLike {
  params: Record<string, unknown>;
  /** 派生值：由参数算出来的值（算式） */
  derived?: Record<string, number | string>;
  stage?: { width: number; height: number };
  objects?: Record<string, unknown>[];
  steps: {
    say: string;
    title?: string;
    show?: string;
    do?: Record<string, unknown>[];
    try?: TrySpec;
  }[];
}

/** 模板对配置的检查结果；path 相对知识点文件根，如 ['steps', 1, 'do', 0] */
export interface ConfigIssue {
  path: (string | number)[];
  message: string;
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
  /**
   * 手机上舞台贴合内容：所有步骤里所有零件包围盒的并集（加边距）。
   * 没有或返回 undefined 时用整个舞台；只有场景类模板需要（site.yaml 的 scene.fit）。
   */
  viewBox?(animation: Animation): ViewBox | undefined;
  /**
   * 连续时间模型：第 index 步动画段的时长（毫秒，按 1 倍速）。
   * 没有或返回 0 时，这一步没有动画段，进入即是完整画面。
   */
  motionMs?(animation: Animation, index: number, tryPhase?: StageTry['phase']): number;
  /** 检查知识点配置里模板专属的部分（零件、动作等），供 pnpm content:check 使用 */
  checkConfig?(lesson: LessonLike): ConfigIssue[];
}

/** 选模板页展示用的信息；available=false 表示后续版本开放。 */
export interface TemplateCard {
  id: string;
  name: string;
  tagline: string;
  scenes: string;
  available: boolean;
}
