# 由参数生成画面的模板

这些模板不用摆零件：知识点里只写参数、每一步的 `show`（这一步显示哪种画面）和讲解。画面、动画时长、导出都复用场景模板的引擎；图形的位置、大小、颜色在 `packages/content/style.yaml` 的 `templates` 里。

`pnpm content:check` 会检查 `show` 的值和参数；配了 `explore` 时，还会把每一种取值组合都生成一遍。

## fraction 分数

把一个整体平均分，取其中几份。示例：[math/g3/fraction-intro.yaml](./math/g3/fraction-intro.yaml)。

| 参数    | 含义         | 取值                          |
| ------- | ------------ | ----------------------------- |
| `shape` | 图形         | `circle` 圆（饼），`bar` 长条 |
| `parts` | 平均分成几份 | 正整数                        |
| `take`  | 取其中几份   | 0 到 `parts`                  |

| show        | 画面                                                |
| ----------- | --------------------------------------------------- |
| `whole`     | 一个完整的图形（整体涂色），不显示说明和分数        |
| `split`     | 平均分成 `parts` 份，下方说明“平均分成 N 份”        |
| `take-one`  | 涂色 1 份，右侧显示分数 1/`parts`                   |
| `take-many` | 涂色逐渐变到 `take` 份，右侧显示分数 `take`/`parts` |
