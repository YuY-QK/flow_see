// 零件的外观与默认值：全部来自 packages/content/site.yaml 的 scene 一节，代码里不写死。
// 网站启动时调用 configureScene() 注入；测试和 content:check 也要先注入（见 vitest.setup.ts）。

export interface SceneStyle {
  /** 没有写 stage 的知识点用这个舞台大小 */
  stage: { width: number; height: number };
  /** 配置里可以直接写的颜色名 → #RRGGBB */
  colors: Record<string, string>;
  /** 高亮框和颜色标记底块的统一间距（横向、纵向分开；底块的单位是字号的倍数） */
  highlight: {
    padX: number;
    padY: number;
    strokeWidth: number;
    fillOpacity: number;
    dash: string;
    markPadX: number;
    markPadY: number;
    markRadius: number;
  };
  /** 文字宽度估算：各类字符的宽度（字号的倍数） */
  textMetrics: { digit: number; latin: number; space: number; operator: number; wide: number };
  /** 手机上舞台贴合内容 */
  fit: { phone: boolean; margin: number; topPx: number; minRatio: number };
  /** 要孩子答的数：虚线空框和闪烁 */
  blank: {
    strokeWidth: number;
    dash: string;
    fillOpacity: number;
    minOpacity: number;
    seconds: number;
    padX: number;
  };
  /** 各动作没写 duration 时的默认时长（秒） */
  actionSeconds: Record<string, number>;
  /** 拆分出来的计数块默认往上抬多少（相对格子大小） */
  splitLift: number;
  /** 十格框之间的间距（相对格子大小） */
  tenframeGap: number;
  /** 点阵计数块写了 capacity 时画的“盘子”：比格子外扩多少、圆角（舞台坐标） */
  counterPlate: { pad: number; radius: number };
  /** 计数块的边框：粗细（舞台坐标）、比填充色深多少（0–1）；边框让靠在一起、叠在一起的块也分得清 */
  counterBorder: { width: number; darken: number };
  /** 计数块的阴影：偏移（舞台坐标）和深浅（0–1），用一个错开的深色块画出，导出视频里也有 */
  counterShadow: { dx: number; dy: number; opacity: number };
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
