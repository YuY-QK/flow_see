// 约定检查的例外清单。每一条都要写明原因；能不加就不加，加了说明这里有个待还的债或确有必要的例外。
export interface Allow {
  /** 适用的文件（相对仓库根目录，用 / 分隔） */
  path: RegExp;
  reason: string;
}

/** 允许在代码里直接写中文字符串的文件 */
export const ALLOW_CHINESE: Allow[] = [
  {
    path: /^packages\/content\/src\/(?!examples\/)/,
    reason: '内容校验、JSON Schema 的说明和报错，面向写配置的人，不是产品界面',
  },
  {
    path: /^packages\/templates\/src\/scene\/(check|actions)\.ts$/,
    reason: '场景模板的配置检查报错和动作名，面向写配置的人（出现在 content:check 里）',
  },
  {
    path: /^packages\/blocks\//,
    reason: '零件的中文名和提示，只用于 content:check 的报错，面向写配置的人',
  },
  {
    path: /^packages\/content\/src\/examples\//,
    reason:
      '【待还】创作页的示例动画数据，计划在 dev/phase1-examples-data 里迁到 packages/content/examples/*.yaml',
  },
];
