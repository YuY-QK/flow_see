/** 数据格式版本：结构变化时递增，并在 migrate() 里补上升级逻辑。 */
export const SCHEMA_VERSION = 1;

export type ThemeId = 'pro' | 'flat' | 'cute' | 'chalk';

/** 动画里的“元素”：参与者、节点等，具体含义由模板决定。 */
export interface FlowElement {
  id: string;
  name: string;
}

export interface Step {
  id: string;
  /** 这一步发生了什么 */
  title: string;
  /** 一句话解释（显示 + 朗读） */
  desc: string;
  /** 单独的朗读文本；为空时朗读 desc */
  narration?: string;
  /** 停留秒数；为空时按朗读长度自动决定 */
  duration?: number;
  /** 模板专属字段 */
  data: Record<string, unknown>;
}

export interface AnimationSettings {
  autoNarrate: boolean;
  allowParamEdit: boolean;
}

/** 分享信息：上传到服务器后得到的短链接 id 与修改凭证 */
export interface ShareInfo {
  id: string;
  /** 再次分享（更新服务器上的内容）时使用的凭证，只保存在作者本地 */
  token: string;
  sharedAt: number;
}

export interface Animation {
  id: string;
  schemaVersion: number;
  title: string;
  /** 署名，与账号无关 */
  author?: string;
  /** 预留：以后接入账号 */
  ownerId?: string;
  templateId: string;
  themeId: ThemeId;
  elements: FlowElement[];
  steps: Step[];
  params?: Record<string, unknown>;
  settings: AnimationSettings;
  /** 分享过的作品才有 */
  share?: ShareInfo;
  createdAt: number;
  updatedAt: number;
}
