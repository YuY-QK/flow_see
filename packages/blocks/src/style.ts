// 零件的外观与默认值：全部来自 packages/content/site.yaml 的 scene 一节，代码里不写死。
// 网站启动时调用 configureScene() 注入；测试和 content:check 也要先注入（见 vitest.setup.ts）。

export interface SceneStyle {
  /** 没有写 stage 的知识点用这个舞台大小 */
  stage: { width: number; height: number };
  /** 配置里可以直接写的颜色名 → #RRGGBB */
  colors: Record<string, string>;
  /** 高亮框 */
  highlight: { padding: number; strokeWidth: number; fillOpacity: number; dash: string };
  /** 各动作没写 duration 时的默认时长（秒） */
  actionSeconds: Record<string, number>;
  /** 拆分出来的计数块默认往上抬多少（相对格子大小） */
  splitLift: number;
  /** 十格框之间的间距（相对格子大小） */
  tenframeGap: number;
  /** 动手做时的拖动：放下的容差、按下范围、拖起来放大的倍数 */
  tryIt: { dropPadding: number; hitScale: number; liftScale: number };
  /** 各零件的默认属性：零件 type → 属性 */
  parts: Record<string, Record<string, unknown>>;
}

let current: SceneStyle | undefined;

export function configureScene(style: SceneStyle): void {
  current = style;
}

export function sceneStyle(): SceneStyle {
  if (!current)
    throw new Error('零件样式还没有设置：启动时要先用 site.yaml 的 scene 调用 configureScene()');
  return current;
}
