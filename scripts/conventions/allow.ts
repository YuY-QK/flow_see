// 约定检查的例外清单。每一条都要写明原因；能不加就不加，加了说明这里有个待还的债或确有必要的例外。
export interface Allow {
  /** 适用的文件（相对仓库根目录，用 / 分隔） */
  path: RegExp;
  reason: string;
}

/** 允许在代码里直接写中文字符串的文件 */
export const ALLOW_CHINESE: Allow[] = [
  {
    path: /^packages\/content\/src\//,
    reason: '内容校验、JSON Schema 的说明和报错，面向写配置的人，不是产品界面',
  },
  {
    path: /^packages\/templates\/src\/scene\/(check|actions)\.ts$/,
    reason: '场景模板的配置检查报错和动作名，面向写配置的人（出现在 content:check 里）',
  },
  {
    path: /^packages\/core\/src\/(texts|style)\.ts$/,
    reason: '文案、样式还没注入时给开发者看的报错（此时读不到文案）',
  },
  {
    path: /^packages\/blocks\//,
    reason: '零件的中文名和提示，只用于 content:check 的报错，面向写配置的人',
  },
];

/** 允许在代码里直接写颜色值（#RRGGBB、rgba(...)）的文件 */
export const ALLOW_COLOR_IN_CODE: Allow[] = [];

/** 允许在样式文件里直接写颜色值或固定字号的文件（颜色和字号变量只能在 global.css 的变量块里定义，不在此列） */
export const ALLOW_CSS_LITERALS: Allow[] = [];

/** 允许在代码里直接给 setTimeout / setInterval 写数字时长的文件（时长要放 site.yaml，能不加就不加） */
export const ALLOW_TIMING: Allow[] = [];
