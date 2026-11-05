# 场景模板 scene：零件与动作

没有现成模板时，用 `template: scene`：先在 `objects` 里摆好零件，再在每一步的 `do` 里写对零件做什么。完整示例见 [math/g1/make-ten.yaml](./math/g1/make-ten.yaml)。

```yaml
template: scene
stage: { width: 800, height: 450 } # 舞台大小（坐标范围），默认 800 × 450
objects:
  - { id: left, type: counters, count: 9, layout: tenframe, at: [70, 112] }
steps:
  - say: 十格框里有 9 个，还空着 1 格。
    do:
      - highlight: left
```

- 画面只由“第几步 + 步内进度”决定：单步、拖进度条、刷新后回到某一步，看到的画面都一样。
- 每一步的动画时长 = 这一步最后一个动作结束的时间；朗读和动画同时开始，都结束后才进入下一步。
- `pnpm content:check` 会检查零件类型、属性拼写、动作写法、引用的零件是否存在，并指出行号。
- 讲解、零件、动作里都可以用 `{参数名}` 代入 `params` 和 `derived`。整个值就是 `"{a}"` 时保留数字类型，所以 `count: "{a}"`、`take: "{gap}"` 都行。
- 想让孩子换例子：把数字写成参数，用 `derived` 算出拆几个、剩几个、得数，再配 `explore` 和 `presets`（见 make-ten.yaml）。
- **舞台大小、零件默认属性、颜色名、动作默认时长、高亮样式都在 `packages/content/site.yaml` 的 `scene` 一节**，改它不用改代码；知识点里写了就用知识点的。

## 零件

公共属性：`id`（必填）、`type`（必填）、`at: [x, y]`、`hidden: true`（开始时隐藏，用 `show` 让它出现）、`opacity`、`scale`、`rotate`（度）、`color`、`note`（备注，不显示）。

`at` 的含义：**计数块、十格框、方格是左上角，数轴是最左端，其他零件是中心。**

颜色：`blue` `orange` `red` `green` `purple` `yellow` `pink` `brown` `gray` `white` `black`，跟随动画主题的 `ink` `dim` `accent` `line`，或 `#RRGGBB`。

| type                               | 零件                                                                | 属性                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`（别名 `number`、`formula`） | 文字、数字、算式                                                    | `text`、`size`（默认 36）、`weight`；`value` 会替换文字里的 `{value}`（配合“数字递增”）                                                                                                                                                                                                                                                           |
| `fraction`                         | 分数                                                                | `num`、`den`、`size`                                                                                                                                                                                                                                                                                                                              |
| `label`                            | 标注框                                                              | `text`、`size`                                                                                                                                                                                                                                                                                                                                    |
| `counters`                         | 计数块（带边框，粗细和深浅在 `site.yaml` 的 `scene.counterBorder`） | `count`、`layout`（`row` 一排 / `column` 一列 / `grid` 点阵 / `tenframe` 十格框）、`cols`（点阵每行几个）、`shape`（`circle` 圆片 / `square` 方块 / `stick` 小棒）、`size`（格子大小，默认 44）、`capacity`（十格框至少画几格）                                                                                                                   |
| `tenframe`                         | 十格框                                                              | 同计数块，默认按十格框排列、`count: 0`                                                                                                                                                                                                                                                                                                            |
| `numberline`                       | 数轴                                                                | `from`、`to`、`step`、`length`（像素）、`labelEvery`、`marks`（标点的数）、`pointer`（指针位置）、`size`                                                                                                                                                                                                                                          |
| `clock`                            | 钟面                                                                | `time`（`"3:30"` 或分钟数）、`radius`、`numbers`、`ticks`、`hands`（`both` / `hour` / `minute`）、`emphasis`（`none` / `hour` / `minute`，突出一根指针）                                                                                                                                                                                          |
| `digital-clock`                    | 电子钟                                                              | `time`（同钟面，可连续变化）、`size`                                                                                                                                                                                                                                                                                                              |
| `fraction-circle`                  | 分数圆                                                              | `parts`（平均分成几份）、`take`（涂色几份）、`radius`                                                                                                                                                                                                                                                                                             |
| `fraction-bar`                     | 分数条                                                              | `parts`、`take`、`width`、`height`                                                                                                                                                                                                                                                                                                                |
| `grid`                             | 方格                                                                | `rows`、`cols`、`cell`、`filled`（涂色几格）                                                                                                                                                                                                                                                                                                      |
| `shape`                            | 几何图形                                                            | `shape`（`rect` / `circle` / `triangle` / `sector`）、`width`、`height`、`radius`、`angle`（扇形角度）、`fill`（`false` 只画边）、`stroke`                                                                                                                                                                                                        |
| `line`、`arrow`                    | 线段、箭头                                                          | `from: [x, y]`、`to: [x, y]`、`width`、`dashed`、`draw`（画出多少，0–1）                                                                                                                                                                                                                                                                          |
| `image`                            | 图片素材                                                            | `asset`（`assets/manifest.yaml` 里的 id）、`width`、`height`；加载失败显示灰色占位                                                                                                                                                                                                                                                                |
| `split-calc`                       | 拆分算式图（凑十法、破十法、借十法、平十法）                        | `a`、`op`、`b`（原题）、`split`（拆 `a` 还是 `b`）、`parts`（拆成的两部分）、`first`、`second`（两次合并：`{ join: [a, p], op: +, value: 10 }`，节点名 `a` `b` `p` `q` `m`，`m` 是第一次合并的结果）、`show`（0 原题、1 拆开、2 第一次合并、3 第二次合并、4 写出得数，用 `set` 逐步显示）、`size`、`partColor`、`accent`；`at` 是原题那一行的中心 |

## 动作

每个动作写成 `动作名: 参数`。参数只有目标零件时可以简写：`highlight: left`，或一次多个：`highlight: [left, left-num]`。

公共选项：`duration`（时长：`1s`、`500ms` 或秒数）、`delay`（先等一会儿）、`together: true`（和上一个动作同时开始；默认一个接一个）、`ease: linear`（匀速，适合指针转动这类连续变化；默认先快后慢）。

| 动作                        | 作用                                                           | 参数                                                          | 默认时长 |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- | -------- |
| `show` / `hide`             | 出现 / 隐藏                                                    | `target`                                                      | 0.5s     |
| `highlight` / `unhighlight` | 高亮 / 取消高亮。高亮只在这一步有效，`keep: true` 时一直保留   | `target`、`keep`                                              | 0.4s     |
| `move`                      | 移动。计数块移到另一组计数块时，会飞进它的空位并合并           | `target`、`to`（`[x, y]` 或零件 id）或 `by: [dx, dy]`         | 0.8s     |
| `split`                     | 拆分：从一组计数块末尾拿出几个，成为新的一组                   | `target`、`take`（默认 1）、`as`（新一组的 id）、`offset`     | 0.5s     |
| `merge`                     | 合并：一组计数块飞进另一组                                     | `target`、`into`                                              | 0.8s     |
| `set`                       | 改文字或数值：可以改零件的任意属性，数字、坐标、颜色会连续变化 | `target` + 要改的属性，如 `text: 10 + 3 = 13`、`time: "4:00"` | 0.6s     |
| `rotate`                    | 旋转                                                           | `target`、`to`（转到多少度）或 `by`                           | 0.8s     |
| `scale`                     | 缩放                                                           | `target`、`to`（倍数）                                        | 0.5s     |
| `color`                     | 颜色变化                                                       | `target`、`to`                                                | 0.5s     |
| `count`                     | 数字递增（文字零件的 `value`）                                 | `target`、`from`、`to`                                        | 1s       |
| `hop`                       | 数轴上跳一跳（画一条弧线，有指针时指针跟着跳）                 | `target`、`from`、`to`、`label`                               | 0.8s     |
| `wait`                      | 停一会儿                                                       | `wait: 1s`                                                    | 0.5s     |

按时间连续变化的例子（钟面分针走一圈）：

```yaml
- set: { target: clock, time: '4:00', duration: 6s, ease: linear }
```

## 动手做（try）

在某一步加 `try`，这一步在“跟着做”“自己做”时由孩子来做；`do` 仍写标准做法（“看一看”时播放、“看我做一遍”、做对后的画面都用它）。示例见 [math/g1/make-ten.yaml](./math/g1/make-ten.yaml) 第 4 步。

```yaml
try:
  task: 把 {gap} 个橙色圆片拖进十格框。 # 轮到孩子时显示并朗读（不超过约 30 字）
  drag: { from: one, to: left, count: '{gap}' } # 把 from 这组计数块拖 count 个到 to 上
  hints: # 做错时依次给出；不写用通用提示
    - 要放进左边的十格框里哦。
    - 看，放到亮起来的十格框里。
```

| 动手方式 | 写法                                    | 做对的条件                                                                                                             |
| -------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `drag`   | `from`（计数块）、`to`（零件）、`count` | 拖够 `count` 个到 `to` 上；`do` 里要有把 `from`（或从它拆出来的一组）移动/合并到 `to` 的动作，移过去的个数等于 `count` |

**点选答案（`choose`）**：字幕框里出现几个大按钮，孩子点出答案；所有模板（场景、分数、钟表）都能用。

```yaml
try:
  task: 十格框里还空着几格？
  choose: { answer: '{gap}', min: 1, show: [left] }
  hints:
    - 数一数十格框里空着的格子。
```

| 字段        | 含义                                                                             |
| ----------- | -------------------------------------------------------------------------------- |
| `answer`    | 正确答案，数字或文字，可以写参数，如 `'{gap}'`、`'{take}/{parts}'`               |
| `options`   | 选项（2–4 个）。数字答案可以不写：自动生成“答案和离它最近的两个数”，顺序每次打乱 |
| `min`/`max` | 自动生成选项时数字的范围，如钟面最大是 12                                        |
| `show`      | 做错几次后高亮这些零件（零件 id）                                                |

- 画面停在这一步开头：问的内容要能从那时的画面上看出来；这一步的 `do` 是答案揭晓后放的动画和“看我做一遍”。
- 选项少于 2 个、答案不在选项里、文字选项重复，`content:check` 会按每种参数组合报错。

- 做错几次高亮目标、几次自动演示、放下的容差、按下范围，在 `site.yaml` 的 `player.handsOn` 和 `scene.tryIt`。
- 点选零件（`tap`）、转动/拖动把手（`turn`）随后加。
