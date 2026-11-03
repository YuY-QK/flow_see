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
- 讲解、零件、动作里都可以用 `{参数名}` 代入 `params`。

## 零件

公共属性：`id`（必填）、`type`（必填）、`at: [x, y]`、`hidden: true`（开始时隐藏，用 `show` 让它出现）、`opacity`、`scale`、`rotate`（度）、`color`、`note`（备注，不显示）。

`at` 的含义：**计数块、十格框、方格是左上角，数轴是最左端，其他零件是中心。**

颜色：`blue` `orange` `red` `green` `purple` `yellow` `pink` `brown` `gray` `white` `black`，跟随动画主题的 `ink` `dim` `accent` `line`，或 `#RRGGBB`。

| type                               | 零件             | 属性                                                                                                                                                                                                                            |
| ---------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`（别名 `number`、`formula`） | 文字、数字、算式 | `text`、`size`（默认 36）、`weight`；`value` 会替换文字里的 `{value}`（配合“数字递增”）                                                                                                                                         |
| `fraction`                         | 分数             | `num`、`den`、`size`                                                                                                                                                                                                            |
| `label`                            | 标注框           | `text`、`size`                                                                                                                                                                                                                  |
| `counters`                         | 计数块           | `count`、`layout`（`row` 一排 / `column` 一列 / `grid` 点阵 / `tenframe` 十格框）、`cols`（点阵每行几个）、`shape`（`circle` 圆片 / `square` 方块 / `stick` 小棒）、`size`（格子大小，默认 44）、`capacity`（十格框至少画几格） |
| `tenframe`                         | 十格框           | 同计数块，默认按十格框排列、`count: 0`                                                                                                                                                                                          |
| `numberline`                       | 数轴             | `from`、`to`、`step`、`length`（像素）、`labelEvery`、`marks`（标点的数）、`pointer`（指针位置）、`size`                                                                                                                        |
| `clock`                            | 钟面             | `time`（`"3:30"` 或分钟数）、`radius`、`numbers`、`ticks`、`hands`（`both` / `hour` / `minute`）                                                                                                                                |
| `fraction-circle`                  | 分数圆           | `parts`（平均分成几份）、`take`（涂色几份）、`radius`                                                                                                                                                                           |
| `fraction-bar`                     | 分数条           | `parts`、`take`、`width`、`height`                                                                                                                                                                                              |
| `grid`                             | 方格             | `rows`、`cols`、`cell`、`filled`（涂色几格）                                                                                                                                                                                    |
| `shape`                            | 几何图形         | `shape`（`rect` / `circle` / `triangle` / `sector`）、`width`、`height`、`radius`、`angle`（扇形角度）、`fill`（`false` 只画边）、`stroke`                                                                                      |
| `line`、`arrow`                    | 线段、箭头       | `from: [x, y]`、`to: [x, y]`、`width`、`dashed`、`draw`（画出多少，0–1）                                                                                                                                                        |
| `image`                            | 图片素材         | `asset`（`assets/manifest.yaml` 里的 id）、`width`、`height`；加载失败显示灰色占位                                                                                                                                              |

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
