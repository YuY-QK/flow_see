# C · 知识点脚本 · 六年级（35 个）

> 格式和记号见 [README 第 6 节](./README.md#6-知识点脚本c-文件的格式)。已上线的 `circle-area` 不在本文件。
> 坐标格的换算同五年级文件开头的说明（格子边长 40，格纸左上角 [80, 40]）。
> 六年级的应用题统一用线段图（`tape-diagram`）：单位“1”画在第一行，用蓝色；要求的量用大括号标“?”。

---

## 六年级上册

### `fraction-word-mult` 求一个数的几分之几是多少
- 位置：六上 · `fraction-apply` · 3.6 · tape-diagram
- 元信息：summary：找准单位“1”，把它平均分，取几份，用乘法；tags [分数乘法应用, 单位1, 线段图]；cover “40×3/5”；related [fraction-times, fraction-word-div]；recommended
- 舞台：800 × 420；params `w: 40`、`n: 3`、`d: 5`；derived `r: w * n / d`；presets：`{40, 3, 5}`、`{36, 3, 4}`、`{48, 5, 6}`（题：一本书 w 页，已经看了它的 n/d，看了多少页？）
- 零件：
  - `t` = tape-diagram，lens [[`{d}`]]，segLabels [['']]，ticks [`{d}`]，rowLabels [全书]，braces [{ row: 1, from: 1, to: 1, label: '{w} 页', side: top }]，unit 80，at [140, 120]
  - `part` = tape-diagram，lens [[`{n}`]]，segColors [[orange]]，unit 80，at [140, 150]，hidden（已看的部分，画在全书线段正下方）
  - `q` = text，`'看了多少页？'`，size 26，at [400, 230]
  - `eq` = text，`'{w} × [{n}/{d}](frac) = [{r}](blank)（页）'`，size 32，at [400, 300]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 读题 | 一本书 {w} 页，已经看了它的 {n}/{d}，看了多少页？ | 高亮 t | — |
| 2 | 单位“1” | “它的 {n}/{d}”，是全书的 {n}/{d}，全书是单位“1”。 | 高亮 t.row.1 ‖ — | choose 答案 全书的页数（选项 全书的页数、看了的页数）“这道题把谁看作单位“1”？”；提示：是谁的 {n}/{d}？ |
| 3 | 平均分 | 把全书平均分成 {d} 份，看了其中 {n} 份。 | 显示 part | — |
| 4 | 列式 | 求 {w} 的 {n}/{d} 是多少，用乘法。 | ‖ eq.text → `'{w} × [{n}/{d}](frac) = {r}（页）'` | choose 答案 {r}（min 1，max 60）“看了多少页？” |

- 要点：求一个数的几分之几是多少，用乘法；关键是找准单位“1”：“谁的几分之几”，谁就是单位“1”

### `fraction-word-div` 已知一个数的几分之几是多少，求这个数
- 位置：六上 · `fraction-apply` · 3.6 · tape-diagram
- 元信息：summary：单位“1”不知道时，用除法（或列方程）：已知量 ÷ 对应分率；tags [分数除法应用, 单位1, 线段图, 方程]；cover “24÷3/5”；related [fraction-word-mult, fraction-divide]；recommended
- 舞台：800 × 420；params `r: 24`、`n: 3`、`d: 5`；derived `w: r / n * d`；presets：`{24, 3, 5}`、`{27, 3, 4}`、`{40, 5, 6}`（题：看了 r 页，正好是全书的 n/d，全书多少页？）
- 零件：
  - `t` = tape-diagram，lens [[`{d}`]]，ticks [`{d}`]，rowLabels [全书]，braces [{ row: 1, from: 1, to: 1, label: '?', side: top }]，unit 80，at [140, 120]
  - `part` = tape-diagram，lens [[`{n}`]]，segColors [[orange]]，segLabels [[`'{r} 页'`]]，unit 80，at [140, 150]
  - `one` = text，`'1 份：{r} ÷ {n} = [{r / n}](blank)（页）'`，size 28，at [400, 240]
  - `eq` = text，`'{r} ÷ [{n}/{d}](frac) = [{w}](blank)（页）'`，size 32，at [400, 310]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 读题 | 看了 {r} 页，正好是全书的 {n}/{d}，全书多少页？ | 高亮 t ＋ 高亮 part | — |
| 2 | 单位“1”未知 | 全书是单位“1”，这回它是要求的。 | 高亮 t.brace.1 | — |
| 3 | 先求 1 份 | {n} 份是 {r} 页，1 份是 {r} ÷ {n} = {r / n} 页。 | ‖ one.text → `'1 份：{r} ÷ {n} = {r / n}（页）'` | choose 答案 {r / n}（min 1，max 20）“1 份是多少页？” |
| 4 | 再求全书 | 全书 {d} 份，{r / n} × {d} = {w} 页；合起来就是 {r} ÷ {n}/{d}。 | 显示 eq ‖ eq.text → `'{r} ÷ [{n}/{d}](frac) = {w}（页）'` | choose 答案 {w}（min 10，max 80） |

- 要点：已知一个数的几分之几是多少，求这个数，用除法：已知量 ÷ 对应的分率；也可以设单位“1”为 x，列方程 x × 分率 = 已知量

### `fraction-more-less` 比一个数多（少）几分之几
- 位置：六上 · `fraction-apply` · 3.6 · tape-diagram
- 元信息：summary：比单位“1”多几分之几，就是单位“1”的 (1 + 几分之几)；tags [分数应用, 多几分之几, 少几分之几, 线段图]；cover “×(1+1/4)”；related [fraction-word-mult, percent-apply]
- 舞台：800 × 420；params `w: 40`、`n: 1`、`d: 4`；derived `r: w * (d + n) / d`；presets：`{40, 1, 4}`、`{30, 2, 5}`、`{60, 1, 3}`（题：去年种树 w 棵，今年比去年多 n/d，今年种多少棵？）
- 零件：
  - `t` = tape-diagram，lens [[`{d}`], [`{d}`, `{n}`]]，segColors [[blue], [blue, orange]]，segLabels [[`'{w} 棵'`], ['', '']]，ticks [`{d}`, `{d + n}`]，rowLabels [去年, 今年]，braces [{ row: 2, from: 1, to: 2, label: '?', side: bottom }]，unit 70，at [140, 100]
  - `s1` = text，`'今年是去年的 1 + [{n}/{d}](frac) = [{d + n}/{d}](frac)'`，size 28，at [400, 260]，hidden
  - `eq` = text，`'{w} × (1 + [{n}/{d}](frac)) = [{r}](blank)（棵）'`，size 30，at [400, 330]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 读题 | 去年种 {w} 棵，今年比去年多 {n}/{d}，今年种多少棵？ | 高亮 t | — |
| 2 | 多出的一段 | 去年是单位“1”，今年比它多出 {n}/{d}。 | 高亮 t.seg.2.2 | — |
| 3 | 今年是去年的几分之几 | 今年是去年的 1 + {n}/{d} = {d + n}/{d}。 | 显示 s1 | — |
| 4 | 列式 | {w} × {d + n}/{d} = {r}。 | ‖ eq.text → `'{w} × (1 + [{n}/{d}](frac)) = {r}（棵）'` | choose 答案 {r}（min 10，max 100）“今年种多少棵？” |

- 要点：比一个数多几分之几，可以先求多的部分再相加，也可以用这个数 × (1 + 几分之几)；少几分之几同理用 (1 − 几分之几)

### `work-problem` 工程问题
- 位置：六上 · `fraction-apply` · 3.6 · tape-diagram（fill）
- 元信息：summary：把工作总量看作单位“1”，工作效率是每天完成几分之一；合做的天数 = 1 ÷ 效率和；tags [工程问题, 工作效率, 单位1]；cover “1÷(1/10+1/15)”；related [fraction-add-sub-diff, meeting-problem]；recommended
- 舞台：800 × 420；params `p: 10`、`q: 15`；derived `days: p * q / (p + q)`；presets：`{10, 15}`（6 天）、`{12, 6}`（4 天）、`{20, 30}`（12 天）
- 零件：
  - `road` = tape-diagram，lens [[`{lcm(p, q)}`]]，ticks [`{lcm(p, q)}`]（整条路平均分成 lcm(p, q) 小格，1/p 和 1/q 都落在格线上），rowLabels [一条路]，fill 0，unit `{600 / lcm(p, q)}`，at [120, 100]
  - `ea` = text，`'甲每天修 [1/{p}](frac)'`，size 26，color blue，at [250, 200]
  - `eb` = text，`'乙每天修 [1/{q}](frac)'`，size 26，color orange，at [550, 200]
  - `sum` = text，`'合修每天 [1/{p}](frac) + [1/{q}](frac) = [{1}/{days}](frac)'`，size 28，at [400, 260]，hidden
  - `eq` = text，`'1 ÷ [1/{days}](frac) = [{days}](blank)（天）'`，size 30，at [400, 330]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 读题 | 一条路，甲队单独修 {p} 天修完，乙队单独修 {q} 天修完，两队合修几天修完？ | 高亮 road | — |
| 2 | 看作单位“1” | 不知道路有多长，把整条路看作单位“1”。 | 高亮 road | — |
| 3 | 每天修多少 | 甲每天修 1/{p}，乙每天修 1/{q}。 | 高亮 ea；高亮 eb | — |
| 4 | 合修 | 合修每天修 1/{p} + 1/{q} = 1/{days}。 | 显示 sum；重复 `{days}` 次：road.fill → {i / days}（0.6s） | — |
| 5 | 几天修完 | 1 ÷ 1/{days} = {days} 天。 | ‖ eq.text → `'1 ÷ [1/{days}](frac) = {days}（天）'` | choose 答案 {days}（min 2，max 20）“合修几天修完？”；提示：每天修 1/{days}，几天修满？ |

- 要点：工程问题中，通常把工作总量看作单位“1”，工作效率 = 1 ÷ 工作时间；合作时间 = 1 ÷ 效率和

### `ratio-meaning` 比的意义
- 位置：六上 · `ratio` · 3.6 · counters、table
- 元信息：summary：两个数相除又叫两个数的比；比的后项不能是 0；tags [比, 比值, 前项, 后项]；cover “3:5”；related [ratio-simplify, fraction-and-division]
- 舞台：800 × 420；params `a: 3`、`b: 5`；explore a 滑块“果汁几杯” 1–5，b 滑块“水几杯” 1–8
- 零件：
  - `juice` = counters，count `{a}`，row，shape square，size 40，color orange，at [60, 80]；`jl` = label，`果汁`，at [60, 60]
  - `water` = counters，count `{b}`，row，shape square，size 40，color blue，at [60, 170]；`wl` = label，`水`，at [60, 150]
  - `r` = text，`'果汁 : 水 = [{a} : {b}](blank)'`，size 34，at [560, 120]
  - `tbl` = table，rows [[比, 前项, ':', 后项, 比值], [除法, 被除数, '÷', 除数, 商], [分数, 分子, '—', 分母, 分数值]]，colWidth 90，size 20，at [80, 280]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 调果汁 | {a} 杯果汁兑 {b} 杯水。 | 高亮 juice；高亮 water | — |
| 2 | 比 | 果汁和水的杯数比是 {a} 比 {b}，写作 {a} : {b}。 | ‖ r.text → `'果汁 : 水 = {a} : {b}'` | choose 答案 `{a} : {b}`（选项 `{a} : {b}`、`{b} : {a}`、`{a} : {a + b}`）“果汁和水的比是多少？” |
| 3 | 比值 | 前项除以后项的商叫比值，{a} : {b} 的比值是 {a}/{b}。 | 高亮 r | — |
| 4 | 和除法、分数的关系 | 比的前项像被除数、分子，后项像除数、分母；所以后项不能是 0。 | 高亮 tbl | — |

- 要点：两个数相除又叫作两个数的比；比的前项除以后项所得的商叫比值；比的后项不能是 0

### `ratio-simplify` 比的基本性质、化简与按比分配
- 位置：六上 · `ratio` · 3.6 · counters、tape-diagram
- 元信息：summary：比的前项和后项同时乘或除以相同的数（0 除外），比值不变；按比分配先求总份数；tags [比的基本性质, 化简比, 按比分配]；cover “6:10=3:5”；related [ratio-meaning, fraction-basic-property]
- 舞台：800 × 450；params `a: 2`、`b: 3`、`t: 40`；derived `s: a + b`；presets：`{2, 3, 40}`、`{3, 5, 48}`、`{1, 4, 30}`
- 零件：
  - `g1` = counters，count `{2 * a}`，row，shape square，size 32，color orange，at [60, 70]；`g2` = counters，count `{2 * b}`，row，shape square，size 32，color blue，at [60, 120]
  - `r` = text，`'{2 * a} : {2 * b} = [{a} : {b}](blank)'`，size 32，at [560, 100]
  - `tp` = tape-diagram，lens [[`{a}`, `{b}`]]，segColors [[orange, blue]]，ticks [`{s}`]，braces [{ row: 1, from: 1, to: 2, label: '{t}', side: top }]，unit `{480 / s}`，at [120, 260]，hidden
  - `split` = text，`'{t} ÷ {s} = {t / s}，甲 [{t / s * a}](blank)，乙 {t / s * b}'`，size 28，at [400, 380]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 两份果汁 | 调两份一样的果汁，是 {2 * a} : {2 * b}，味道和 {a} : {b} 一样。 | 高亮 g1 ＋ 高亮 g2 | — |
| 2 | 基本性质 | 前项和后项同时除以 2，比值不变。 | ‖ r.text → `'{2 * a} : {2 * b} = {a} : {b}'` | choose 答案 `{a} : {b}`（选项 `{a} : {b}`、`{2 * a} : {b}`、`{a} : {2 * b}`）“化成最简整数比是多少？” |
| 3 | 按比分配 | {t} 个苹果按 {a} : {b} 分给甲、乙，一共 {s} 份。 | 显示 tp | — |
| 4 | 每份几个 | 1 份是 {t} ÷ {s} = {t / s} 个，甲得 {a} 份。 | 显示 split ‖ split.text → `'{t} ÷ {s} = {t / s}，甲 {t / s * a}，乙 {t / s * b}'` | choose 答案 {t / s * a}（min 1，max 40）“甲分到几个？” |

- 要点：比的前项和后项同时乘或者除以相同的数（0 除外），比值不变；按比分配：先求总份数，再求一份是多少

### `proportion-meaning` 比例的意义和基本性质
- 位置：六上 · `proportion-1` · 3.6 · polygon、text
- 元信息：summary：表示两个比相等的式子叫比例；两个外项的积等于两个内项的积；tags [比例, 比例的基本性质, 内项, 外项]；cover “2:3=4:6”；related [ratio-simplify, direct-proportion]
- 舞台：800 × 420；无参数（照片长 3 宽 2，放大后长 6 宽 4，1 = 40 像素）
- 零件：
  - `p1` = polygon，points [[80, 300], [200, 300], [200, 220], [80, 220]]，color blue，sideLabels ['3', '2', '', '']
  - `p2` = polygon，points [[260, 300], [500, 300], [500, 140], [260, 140]]，color orange，sideLabels ['6', '4', '', '']
  - `eq` = text，`'3 : 2 = 6 : 4'`，size 34，at [640, 120]
  - `prod` = text，`'3 × 4 = 2 × 6 = [12](blank)'`，size 30，at [640, 220]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 放大照片 | 照片按同样的比例放大，长和宽的比没有变。 | 高亮 p1；高亮 p2 | — |
| 2 | 比例 | 3 : 2 = 6 : 4，表示两个比相等的式子叫比例。 | 高亮 eq | — |
| 3 | 内项和外项 | 两端的 3 和 4 是外项，中间的 2 和 6 是内项。 | 高亮 eq | — |
| 4 | 基本性质 | 外项的积等于内项的积。 | 显示 prod ‖ prod.text → `'3 × 4 = 2 × 6 = 12'` | choose 答案 12（选项 6 8 12）“3 × 4 等于多少？2 × 6 呢？” |

- 要点：表示两个比相等的式子叫作比例；组成比例的四个数中，两端的两项叫外项，中间的两项叫内项；在比例里，两个外项的积等于两个内项的积

### `direct-proportion` 正比例
- 位置：六上 · `proportion-1` · 3.5 · table、chart（xy）
- 元信息：summary：两种量相对应的两个数的比值一定，就成正比例；图像是一条过原点的直线；tags [正比例, 比值一定, 正比例图像]；cover “y/x=k”；related [proportion-meaning, inverse-proportion]；recommended
- 舞台：800 × 450；params `k: 2`（单价，元）；explore k 滑块“单价” 1–5
- 零件：
  - `tbl` = table，rows [[数量/支, 1, 2, 3, 4, 5], [总价/元, '{k}', '{2 * k}', '{3 * k}', '{4 * k}', '{5 * k}']]，headerCol true，colWidth 70，size 20，at [40, 40]
  - `ch` = chart，kind xy，xs [1, 2, 3, 4, 5]，values [`{k}`, `{2 * k}`, `{3 * k}`, `{4 * k}`, `{5 * k}`]，unit `{k}`，max `{6 * k}`，axisNames [数量, 总价]，line true，width 360，height 260，show 0，at [80, 400]
  - `ratio` = text，`'总价 ÷ 数量 = 单价 {k}（一定）'`，size 26，at [600, 200]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 买铅笔 | 铅笔每支 {k} 元，买的数量变，总价也跟着变。 | 高亮 tbl | — |
| 2 | 比值一定 | 总价 ÷ 数量都等于 {k}，比值一定。 | 显示 ratio | — |
| 3 | 正比例 | 两种相关联的量，比值一定，就叫成正比例的量。 | ‖ — | choose 答案 成正比例（选项 成正比例、不成比例）“总价和数量成什么关系？” |
| 4 | 画图像 | 把表里的数描成点，连起来是一条经过原点的直线。 | ch.show → 1（2s） | — |

- 要点：两种相关联的量，一种量变化，另一种量也随着变化，如果这两种量中相对应的两个数的比值一定，这两种量就叫作成正比例的量；正比例的图像是一条经过原点的直线

### `percent-meaning` 百分数的意义与读写
- 位置：六上 · `percent` · 随时
- 元信息：summary：表示一个数是另一个数的百分之几；只表示两个数的关系，后面不带单位；tags [百分数, 百分率, 百分号]；cover “25%”；related [percent-convert, decimal-meaning]；recommended
- 舞台：800 × 420；params `k: 25`；explore k 滑块“涂几格” 1–99
- 零件：
  - `g` = grid，rows 10，cols 10，cell 30，filled 0，at [60, 60]
  - `t` = text，`'[{k}/100](frac) = [{k}%](blank)'`，size 36，at [580, 140]
  - `note` = text，`'百分数不能带单位：不能说“25% 米”'`，size 24，at [560, 260]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 百格图 | 一个正方形平均分成 100 格。 | 高亮 g | — |
| 2 | 涂一涂 | 涂了 {k} 格，占 {k}/100。 | g.filled → {k}（1.5s） | — |
| 3 | 百分数 | 分母是 100 的这种分数，写作 {k}%，读作百分之{cn(k)}。 | ‖ t.text → `'[{k}/100](frac) = {k}%'` | choose 答案 `{k}%`（选项 `{k}%`、`{k / 10}%`、`{100 - k}%`）“涂色部分占百分之几？” |
| 4 | 不带单位 | 百分数只表示两个数的关系，后面不能带单位。 | 显示 note | — |

- 要点：表示一个数是另一个数的百分之几的数叫百分数，也叫百分率或百分比；百分数后面不能带单位名称

### `percent-convert` 百分数与分数、小数的互化
- 位置：六上 · `percent` · 3.6 · grid、numberline（X4 layers）
- 元信息：summary：同一个量三种写法：0.25 = 1/4 = 25%；tags [百分数互化, 小数化百分数, 分数化百分数]；cover “0.25=25%”；related [percent-meaning, decimal-meaning]
- 舞台：800 × 420；无参数
- 零件：
  - `g` = grid，rows 10，cols 10，cell 26，filled 25，at [60, 50]
  - `three` = text，`'0.25 = [1/4](frac) = 25%'`，size 34，at [580, 120]
  - `line` = numberline，from 0，to 1，step 0.25，labels decimal，layers [{ labels: fraction }, { labels: percent }]，length 600，at [100, 340]
  - `q` = text，`'0.6 = [60%](blank)'`，size 30，at [580, 220]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 三种写法 | 涂了 25 格：小数是 0.25，分数是 1/4，百分数是 25%。 | 高亮 g；高亮 three | — |
| 2 | 数轴上对齐 | 在数轴上，三种写法表示同一个点。 | 高亮 line | — |
| 3 | 小数化百分数 | 小数化成百分数，小数点向右移动两位，添上百分号。 | ‖ q.text → `'0.6 = 60%'` | choose 答案 60%（选项 6%、60%、0.6%）“0.6 化成百分数是多少？”；提示：小数点向右移动两位。 |
| 4 | 分数化百分数 | 分数化成百分数，先化成小数，再化成百分数：1/4 = 0.25 = 25%。 | 高亮 three | — |

- 要点：小数化成百分数，把小数点向右移动两位，添上百分号；百分数化成小数，去掉百分号，小数点向左移动两位；分数化成百分数，一般先化成小数

### `percent-apply` 百分数的简单应用
- 位置：六上 · `percent` · 3.6 · counters、tape-diagram
- 元信息：summary：求百分率 = 部分 ÷ 总数 × 100%；求一个数的百分之几是多少，用乘法；tags [百分率, 发芽率, 出勤率, 百分数应用]；cover “发芽率92%”；related [percent-meaning, fraction-word-mult]
- 舞台：800 × 450；params `n: 92`；explore n 滑块“发芽几粒” 60–100
- 零件：
  - `seeds` = grid，rows 10，cols 10，cell 18，filled 0，color green，at [60, 40]（涂色格 = 发芽的种子）
  - `rate` = text，`'发芽率 = {n} ÷ 100 × 100% = [{n}%](blank)'`，size 28，at [400, 230]
  - `tp` = tape-diagram，lens [[10]]，ticks [10]，rowLabels [全班 40 人]，braces [{ row: 1, from: 1, to: 1, label: '40 人', side: top }]，unit 50，at [140, 320]
  - `q` = text，`'40 × 95% = [38](blank)（人）'`，size 28，at [400, 410]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 种子发芽 | 100 粒种子，发芽了 {n} 粒。 | seeds.filled → {n}（2s） | — |
| 2 | 发芽率 | 发芽率 = 发芽的粒数 ÷ 种子总数 × 100% = {n}%。 | ‖ rate.text → `'发芽率 = {n} ÷ 100 × 100% = {n}%'` | choose 答案 `{n}%`（选项 `{n}%`、`{100 - n}%`、`{n / 10}%`）“发芽率是多少？” |
| 3 | 出勤 | 全班 40 人，出勤率 95%，来了多少人？ | 高亮 tp | — |
| 4 | 求百分之几是多少 | 求 40 的 95% 是多少，用乘法：40 × 95% = 38。 | ‖ q.text → `'40 × 95% = 38（人）'` | choose 答案 38（选项 36 38 40）“来了多少人？” |

- 要点：百分率 = 部分数量 ÷ 总数量 × 100%，如发芽率、出勤率；求一个数的百分之几是多少，用乘法

### `coordinate-pairs` 用数对表示位置
- 位置：六上 · `position-pairs` · 3.4 · coordinate-grid、T1
- 元信息：summary：先列后行，(3, 2) 表示第 3 列第 2 行；tags [数对, 位置, 列, 行]；cover “(3,2)”；related [route-description, direction-distance]；recommended
- 舞台：800 × 450；params `c: 3`、`r: 2`；explore c 滑块“第几列” 1–6，r 滑块“第几行” 1–6（两个数都不超过 6，第 4 步互换后仍在 8 × 6 的格子里；两数相同时第 4 步自动去掉）
- 零件：
  - `grid` = coordinate-grid，cols 8，rows 6，cell 50，labels true，origin bottom-left，axisLabels [列, 行]，at [100, 60]
  - `kid` = image asset kid-seat，width 40，height 40，at [`{100 + c * 50}`, `{360 - r * 50}`]
  - `pair` = text，`'[({c}, {r})](blank)'`，size 36，at [620, 150]
  - `rule` = text，`'先说列，再说行'`，size 26，at [620, 230]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 教室座位 | 竖排叫列，从左往右数；横排叫行，从下往上数。 | 高亮 grid；高亮 rule | — |
| 2 | 小明的位置 | 小明在第 {c} 列、第 {r} 行。 | 高亮 kid | — |
| 3 | 写成数对 | 先列后行，写作 ({c}, {r})。 | ‖ pair.text → `'({c}, {r})'` | choose 答案 `({c}, {r})`（选项 `({c}, {r})`、`({r}, {c})`、`({c}, {r + 1})`）“小明的位置用数对表示是？” |
| 4（when `{c != r}`） | 找一找 | 在图上点出 ({r}, {c})，它和 ({c}, {r}) 不是同一个位置。 | ‖ 高亮 grid.pt.{r}.{c} | tap 答案 grid.pt.{r}.{c}（可点 grid.pt.*）“点出 ({r}, {c}) 的位置。”；提示：先找第 {r} 列。 |

- 说明：`grid.pt.<列>.<行>` 的行号在 `origin: bottom-left` 下从下往上数（B16 的子项名与 `labels` 一致）。
- 要点：用数对表示位置时，先表示列，再表示行；(3, 2) 和 (2, 3) 表示不同的位置

### `circle-parts` 圆的认识
- 位置：六上 · `circle` · 3.4 · circle-draw、T1
- 元信息：summary：圆心决定位置，半径决定大小；同一个圆里直径是半径的 2 倍；tags [圆, 圆心, 半径, 直径, 圆规]；cover “O r d”；related [circle-circumference, circle-area]；recommended
- 舞台：800 × 420；params `r: 3`（厘米，1 = 40 像素）；presets：`{r: 2}`、`{r: 3}`、`{r: 4}`（弦的端点要用三角函数算，所以用 presets 并写死坐标）
- 零件：
  - `c` = circle-draw，radius `{r * 40}`，draw 0，compass true，center true，radii 0，diameter false，at [260, 210]
  - `d1` = line，from [`{260 - r * 40}`, 210]，to [`{260 + r * 40}`, 210]，color green，hidden（直径）
  - `d2` = line，from [260, 210]，to [260, `{210 - r * 40}`]，color orange，hidden（半径）
  - `d3` = line，两端是圆上 225° 和 20° 方向的点（不过圆心的弦），color purple，hidden；端点 = 圆心 [260, 210] + r × 40 × (cos θ, −sin θ)，三个 preset 各算一组整数坐标写死
  - `eq` = text，`'d = 2r = [{2 * r}](blank) 厘米'`，size 30，at [600, 200]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 画圆 | 用圆规画圆：针尖固定的点是圆心，两脚张开的距离是半径。 | c.draw → 1（3s） | — |
| 2 | 无数条半径 | 从圆心到圆上任意一点都是半径，有无数条，长度都相等。 | c.radii → 8 | — |
| 3 | 直径 | 通过圆心、两端在圆上的线段是直径，是半径的 2 倍。 | c.radii → 0；c.diameter → true ‖ eq.text → `'d = 2r = {2 * r} 厘米'` | choose 答案 {2 * r}（min 2，max 10）“半径 {r} 厘米，直径是多少厘米？” |
| 4 | 认一认 | 哪条是直径？ | 显示 d1 ＋ 显示 d2 ＋ 显示 d3 ‖ 高亮 d1 | tap 答案 d1（可点 d1、d2、d3）“点出直径。”；提示：要通过圆心，两端都在圆上。 |

- 要点：圆心决定圆的位置，半径决定圆的大小；在同一个圆里，有无数条半径和直径，所有半径都相等，直径是半径的 2 倍

### `circle-circumference` 圆的周长与圆周率
- 位置：六上 · `circle` · 3.4 · circle-draw（roll）
- 元信息：summary：圆滚一周的长度是周长，周长约是直径的 3.14 倍；tags [圆的周长, 圆周率, π]；cover “C=πd”；related [circle-parts, circle-area]；recommended
- 舞台：800 × 420；params `d: 2`（单位长度，1 = 50 像素）；presets：`{d: 2}`、`{d: 1.5}`、`{d: 2.4}`
- 零件：
  - `c` = circle-draw，radius `{d * 25}`，roll 0，center true，diameter true，at [120, 200]
  - `marks` = 直径长度的标尺：`m{i}`（repeat 3）= line，from [`{120 - d * 25 + (i - 1) * d * 50}`, 290]，to [`{120 - d * 25 + i * d * 50}`, 290]，ends [point, point]，color orange，hidden（三段直径长）
  - `ratio` = text，`'周长 ÷ 直径 ≈ [3.14](blank)'`，size 30，at [560, 100]
  - `f` = text，`'C = πd = 2πr'`，size 30，color accent，at [560, 160]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 滚一圈 | 圆在直线上滚一周，滚过的长度就是圆的周长。 | c.roll → 1（3s，linear） | — |
| 2 | 量一量 | 用直径去量，三个直径还多一点。 | 显示 m1；显示 m2；显示 m3 | — |
| 3 | 圆周率 | 不管圆多大，周长除以直径都约是 3.14，这个数叫圆周率 π。 | ‖ ratio.text → `'周长 ÷ 直径 ≈ 3.14'` | choose 答案 3.14（选项 3、3.14、4）“周长大约是直径的几倍？” |
| 4 | 公式 | 周长 = π × 直径 = 2 × π × 半径。 | 显示 f | — |

- 要点：圆的周长除以直径的商是一个固定的数，叫作圆周率，用 π 表示，π ≈ 3.14；C = πd 或 C = 2πr

### `sector-intro` 扇形的初步认识
- 位置：六上 · `circle` · 3.4 · shape（sector）、angle、T2
- 元信息：summary：两条半径和它们之间的弧围成扇形；圆心角越大，扇形越大；tags [扇形, 圆心角, 弧]；cover “扇形”；related [circle-parts, pie-chart]
- 舞台：800 × 420；无参数
- 零件：
  - `whole` = shape，shape circle，radius 140，fill false，stroke line，at [260, 220]
  - `sec` = shape，shape sector，radius 140，angle 60，color orange，at [260, 220]
  - `ang` = angle，from 0，size 60，length 140，arc true，label true，color ink，at [260, 220]
  - `q` = text，`'90° 的扇形是圆的 [1/4](frac blank)'`，size 28，at [600, 200]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 扇形 | 两条半径和它们之间的一段弧围成的图形叫扇形。 | 高亮 sec | — |
| 2 | 圆心角 | 顶点在圆心的角叫圆心角。 | 高亮 ang | — |
| 3 | 变大 | 圆心角越大，扇形越大。 | sec.angle → 150 ＋ ang.size → 150（1.5s） | — |
| 4 | 调到 1/4 | 把扇形调到圆的 1/4。 | ‖ ang.size → 90 ＋ sec.angle → 90 | turn ang.size 到 90（容差 0，步长 15）“拖动半径，把扇形调到圆的 1/4。”；提示：圆周角 360°，1/4 是多少度？ |
| 5 | 占几分之几 | 90° 的扇形占整个圆的 90/360 = 1/4。 | q.text → `'90° 的扇形是圆的 [1/4](frac)'` | — |

- 说明：第 4 步 turn 的是 `ang.size`，`sec.angle` 在答对后跟着变（`do` 里同时 set）；拖动过程中扇形不跟手（只有角的边在动），这是 turn 只改一个属性的限制，可以接受。
- 要点：一条弧和经过这条弧两端的两条半径所围成的图形叫扇形；顶点在圆心的角叫圆心角；同一个圆里，圆心角越大，扇形越大

### `ring-area` 圆环的面积
- 位置：六上 · `circle` · 随时
- 元信息：summary：圆环面积 = 外圆面积 − 内圆面积；tags [圆环, 圆环面积, 外圆, 内圆]；cover “S=π(R²−r²)”；related [circle-area]
- 舞台：800 × 420；params `R: 5`、`r: 3`；derived `S: round(3.14 * (R * R - r * r) * 100) / 100`；presets：`{5, 3}`、`{4, 2}`、`{6, 4}`
- 零件：
  - `outer` = shape，shape circle，radius `{R * 28}`，color blue，at [240, 210]
  - `inner` = shape，shape circle，radius `{r * 28}`，color white，at [240, 210]，hidden
  - `eq` = expr-steps，lines [`'3.14 × {R}[2](sup) − 3.14 × {r}[2](sup)'`, `'3.14 × ({R * R} − {r * r})'`, `'3.14 × {R * R - r * r}'`, `'{S}'`]，show 1，at [500, 140]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 大圆 | 先看外面的大圆，半径 {R}。 | 高亮 outer | — |
| 2 | 挖掉小圆 | 从中间挖掉半径 {r} 的小圆，剩下的是圆环。 | 显示 inner | — |
| 3 | 面积 | 圆环面积 = 大圆面积 − 小圆面积。 | eq.show → 3 ‖ eq.show → 4 | choose 答案 {S}（选项 `{S}`、`{round(3.14 * (R - r) * (R - r) * 100) / 100}`、`{round(3.14 * R * R * 100) / 100}`）“圆环的面积是多少？” |

- 要点：圆环的面积 = 外圆面积 − 内圆面积，S = π(R² − r²)

### `pie-chart` 扇形统计图
- 位置：六上 · `pie-chart` · 3.5 · chart（pie）
- 元信息：summary：用整个圆表示总数，用扇形表示各部分占总数的百分比；tags [扇形统计图, 百分数, 统计图]；cover “饼图”；related [sector-intro, percent-meaning, bar-chart]；recommended
- 舞台：800 × 450；无参数（某班 40 人最喜欢的运动：跳绳 14、跑步 10、踢毽 8、其他 8）
- 零件：
  - `ch` = chart，kind pie，categories [跳绳, 跑步, 踢毽, 其他]，values [14, 10, 8, 8]，width 320，height 320，show 0，at [100, 400]
  - `q` = text，`'跳绳占 [35%](blank)'`，size 28，at [600, 150]
  - `cmp` = table，rows [[条形图, 看多少], [折线图, 看变化], [扇形图, 看部分与整体]]，size 20，colWidth 120，at [520, 260]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 整个圆是全班 | 整个圆表示全班 40 人。 | ch.show → 1（3s） | — |
| 2 | 每一块 | 每个扇形表示一部分人数占全班的百分之几。 | 高亮 ch.slice.1 | — |
| 3 | 跳绳占多少 | 14 ÷ 40 = 35%。 | ‖ q.text → `'跳绳占 35%'` | choose 答案 35%（选项 14%、35%、40%）“喜欢跳绳的占全班的百分之几？” |
| 4 | 三种统计图 | 条形图看多少，折线图看变化，扇形图看部分和整体的关系。 | 显示 cmp | — |

- 要点：扇形统计图用整个圆表示总数，用圆内各个扇形表示各部分占总数的百分比；能清楚地看出各部分与总数的关系

---

## 六年级下册

### `negative-meaning` 负数的意义与读写
- 位置：六下 · `negative-numbers` · 随时
- 元信息：summary：0 上和 0 下、收入和支出这样相反意义的量，用正数和负数表示；0 既不是正数也不是负数；tags [负数, 正数, 相反意义的量, 温度]；cover “−5℃”；related [negative-numberline]；recommended
- 舞台：800 × 420；params `t: -5`；presets：`{t: -5}`、`{t: -12}`、`{t: -2}`
- 零件：
  - `th` = thermometer，value 8，min -20，max 30，showValue true，at [200, 210]
  - `say` = text，`'零下 {abs(t)} 摄氏度，记作 [{t}](blank) ℃'`，size 30，at [560, 120]
  - `money` = text，`'收入 +100 元　支出 −60 元'`，size 28，at [560, 220]，hidden
  - `zero` = text，`'0 既不是正数，也不是负数'`，size 26，at [560, 300]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 零上 | 白天 8 ℃，比 0 ℃ 高，是零上 8 摄氏度。 | 高亮 th | — |
| 2 | 零下 | 夜里降到比 0 ℃ 还低 {abs(t)} 度，是零下 {abs(t)} 摄氏度。 | th.value → {t}（2s） ‖ say.text → `'零下 {abs(t)} 摄氏度，记作 {t} ℃'` | choose 答案 `{t}`（选项 `{t}`、`{abs(t)}`、`+{abs(t)}`）“零下 {abs(t)} 摄氏度怎么记？” |
| 3 | 相反意义 | 收入和支出、上升和下降，意义相反，可以用正数和负数表示。 | 显示 money | — |
| 4 | 0 | 0 是正数和负数的分界，既不是正数也不是负数。 | 显示 zero | — |

- 说明：`t` 为负数，代入讲解时 `formatNumber` 写成“−5”（F2），读作“负五”（F3 的规则）。
- 要点：像 +8、+100 这样的数是正数，正号可以省略；像 −5、−60 这样的数是负数；0 既不是正数也不是负数

### `negative-numberline` 在数轴上表示正负数与比较大小
- 位置：六下 · `negative-numbers` · 3.1 · numberline（X4 负数）、T1、F2（sel）
- 元信息：summary：数轴上 0 左边是负数；左边的数总比右边的数小；tags [数轴, 负数, 比大小]；cover “−3<−1”；related [negative-meaning, order-within-10]
- 舞台：800 × 400；params `a: -3`、`b: -1`；explore a 滑块 −6–6，b 滑块 −6–6
- 零件：
  - `line` = numberline，from -6，to 6，step 1，labelEvery 1，length 700，marks [`{a}`, `{b}`]，at [50, 150]
  - `cmp` = text，`'{a} [<](blank) {b}'`，size 36，at [400, 280]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 向左延伸 | 数轴从 0 向左延伸，左边是负数：−1、−2、−3…… | 高亮 line | — |
| 2 | 找一找 | {a} 在 0 的{sel(a < 0, '左边', sel(a > 0, '右边', '位置上'))}。 | ‖ 高亮 line.tick.{a} | tap 答案 line.tick.{a}（可点 line.tick.*）“在数轴上点出 {a}。”；提示：负数在 0 的左边。 |
| 3 | 比大小 | 数轴上左边的数小，右边的数大。 | 高亮 cmp ‖ cmp.text → `'{a} {sel(a > b, '>', sel(a < b, '<', '='))} {b}'` | choose 答案 `{sel(a > b, '>', sel(a < b, '<', '='))}`（选项 > = <）“{a} 和 {b} 比大小。”；提示：看谁在左边。 |
| 4 | 负数比大小 | 两个负数，离 0 越远的越小。 | 高亮 line | — |

- 要点：在数轴上，0 左边的数是负数，右边的数是正数；左边的数总比右边的数小；负数都比 0 小，正数都比 0 大

### `inverse-proportion` 反比例
- 位置：六下 · `proportion-2` · 3.5 · grid、chart（xy）、table
- 元信息：summary：两种量相对应的两个数的积一定，就成反比例；图像是一条曲线；tags [反比例, 积一定, 反比例图像]；cover “xy=k”；related [direct-proportion, proportion-solve]；recommended
- 舞台：800 × 450；无参数（面积 24 的长方形）
- 零件：
  - `rect` = grid，rows 2，cols 12，cell 20，filled 24，at [60, 60]
  - `tbl` = table，rows [[长, 12, 8, 6, 4, 3, 2], [宽, 2, 3, 4, 6, 8, 12]]，headerCol true，colWidth 56，size 20，at [360, 50]
  - `ch` = chart，kind xy，xs [2, 3, 4, 6, 8, 12]，values [12, 8, 6, 4, 3, 2]，unit 2，max 14，axisNames [长, 宽]，line true，width 300，height 240，show 0，at [420, 400]
  - `prod` = text，`'长 × 宽 = 24（一定）'`，size 26，at [200, 300]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 面积不变 | 用 24 个小方格拼长方形，面积都是 24。 | 高亮 rect | — |
| 2 | 长变宽也变 | 长变短，宽就变长。 | rect.rows → 3 ＋ rect.cols → 8；rect.rows → 4 ＋ rect.cols → 6；rect.rows → 6 ＋ rect.cols → 4 | — |
| 3 | 积一定 | 长 × 宽总是 24，积一定。 | 显示 prod；高亮 tbl | — |
| 4 | 反比例 | 两种量，积一定，就叫成反比例的量。 | ‖ — | choose 答案 成反比例（选项 成正比例、成反比例、不成比例）“长和宽成什么关系？” |
| 5 | 图像 | 描点连线，是一条曲线，不过原点。 | ch.show → 1（2s） | — |

- 要点：两种相关联的量，一种量变化，另一种量也随着变化，如果这两种量中相对应的两个数的积一定，这两种量就叫作成反比例的量；反比例的图像是一条曲线

### `map-scale` 比例尺
- 位置：六下 · `proportion-2` · 3.8 · image、ruler、coordinate-grid
- 元信息：summary：比例尺 = 图上距离 : 实际距离；图形可以按比例放大或缩小；tags [比例尺, 图上距离, 实际距离, 放大, 缩小]；cover “1:5000000”；related [proportion-meaning, direction-distance]；recommended
- 舞台：800 × 450；params `cm: 4`；presets：`{cm: 4}`、`{cm: 6}`、`{cm: 2.5}`（比例尺 1 : 5000000，即图上 1 厘米表示实际 50 千米）
- 零件：
  - `map` = image asset map-two-cities（虚构的两个城市地图），width 420，height 280，at [240, 190]
  - `r` = ruler，from 0，to 8，unit cm，length 320，objectShape rect，objectFrom 0，objectLength `{cm}`，at [60, 360]
  - `scale` = text，`'比例尺 1 : 5000000（图上 1 厘米 = 实际 50 千米）'`，size 22，at [560, 60]
  - `eq` = text，`'{cm} × 50 = [{cm * 50}](blank)（千米）'`，size 30，at [600, 200]
  - `big` = polygon，points [[520, 360], [580, 360], [580, 320]]，color blue（小三角形）；`big2` = polygon，points [[620, 400], [740, 400], [740, 320]]，color orange，hidden（按 2 : 1 放大）

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 地图 | 地图是按一定比例缩小画出来的。 | 高亮 map；高亮 scale | — |
| 2 | 量图上距离 | 两城在图上相距 {cm} 厘米。 | 高亮 r.object | — |
| 3 | 求实际距离 | 1 厘米表示 50 千米，{cm} 厘米就是 {cm} × 50 = {cm * 50} 千米。 | ‖ eq.text → `'{cm} × 50 = {cm * 50}（千米）'` | choose 答案 {cm * 50}（选项 `{cm * 50}`、`{cm * 5}`、`{cm * 500}`）“两城实际相距多少千米？” |
| 4 | 放大 | 比例尺也可以把小图形放大：按 2 : 1 放大，每条边都变成原来的 2 倍。 | 显示 big2 | — |

- 要点：图上距离 : 实际距离 = 比例尺；求实际距离 = 图上距离 ÷ 比例尺；计算时单位要统一；图形按比例放大或缩小后，形状不变，大小改变

### `proportion-solve` 用正、反比例解决问题
- 位置：六下 · `proportion-2` · 3.6 · table、text
- 元信息：summary：先判断两种量是比值一定还是积一定，再列比例式；tags [正比例应用, 反比例应用, 解比例]；cover “列比例”；related [direct-proportion, inverse-proportion]
- 舞台：800 × 450；无参数
- 零件：
  - `q1` = text，`'3 小时行 180 千米，照这样 5 小时行多少千米？'`，size 24，at [400, 60]
  - `j1` = text，`'路程 ÷ 时间 = 速度（一定）→ 正比例'`，size 24，at [400, 110]，hidden
  - `e1` = text，`'180 : 3 = x : 5　x = [300](blank)'`，size 28，at [400, 160]，hidden
  - `q2` = text，`'每天看 20 页，6 天看完；每天看 30 页，几天看完？'`，size 24，at [400, 250]
  - `j2` = text，`'每天页数 × 天数 = 总页数（一定）→ 反比例'`，size 24，at [400, 300]，hidden
  - `e2` = text，`'30 × x = 20 × 6　x = [4](blank)'`，size 28，at [400, 350]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 判断关系 | 速度不变，路程和时间的比值一定，成正比例。 | 高亮 q1；显示 j1 | — |
| 2 | 列比例 | 180 : 3 = x : 5，x = 300。 | 显示 e1 ‖ e1.text → `'180 : 3 = x : 5　x = 300'` | choose 答案 300（选项 108 300 900）“5 小时行多少千米？” |
| 3 | 反比例 | 总页数不变，每天的页数和天数的积一定，成反比例。 | 高亮 q2；显示 j2 | — |
| 4 | 列等式 | 30 × x = 20 × 6，x = 4。 | 显示 e2 ‖ e2.text → `'30 × x = 20 × 6　x = 4'` | choose 答案 4（选项 4 9 6）“几天看完？” |

- 要点：用比例解决问题，先找出两种相关联的量，判断它们成正比例（比值一定）还是反比例（积一定），再列出比例式或等式求解

### `direction-distance` 用方向和距离确定位置
- 位置：六下 · `position-distance` · 3.8 · direction（bearing）、protractor、ruler、T2
- 元信息：summary：先说方向（北偏东 30°），再说距离；相对位置互换时方向相反、度数不变；tags [方向, 距离, 北偏东, 确定位置]；cover “北偏东30°”；related [directions-8, map-scale, coordinate-pairs]；recommended
- 舞台：800 × 450；params `g: 30`、`km: 2`；presets：`{30, 2}`、`{45, 3}`、`{60, 1.5}`
- 零件：
  - `dir` = direction，mode bearing，radius 160，pointer 0，scaleBar { km: 1, px: 60 }，targets [{ bearing: '{g}', distance: '{km * 60}', asset: lighthouse, label: 灯塔 }]，at [300, 240]
  - `prot` = protractor，radius 120，rotate -90，at [300, 240]，hidden（0 刻度线对准正北）
  - `ans` = text，`'灯塔在小岛的 [北偏东 {g}°](blank) 方向 {km} 千米处'`，size 26，at [600, 100]
  - `back` = text，`'小岛在灯塔的南偏西 {g}° 方向 {km} 千米处'`，size 24，at [600, 380]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 以小岛为中心 | 以小岛为观测点，画出东南西北。 | 高亮 dir | — |
| 2 | 量方向 | 量角器的 0 刻度线对准正北，灯塔偏向东 {g}°。 | 显示 prot；高亮 dir.target.1 | — |
| 3 | 转到灯塔 | 把指针从正北向东转 {g}°。 | ‖ dir.pointer → {g} ＋ dir.bearing → {g} | turn dir.pointer 到 {g}（容差 0，步长 15）“把指针从正北向东转 {g}°。”；提示：从“北”开始，顺时针转。 |
| 4 | 量距离 | 按比例尺，量得距离是 {km} 千米。 | ‖ ans.text → `'灯塔在小岛的北偏东 {g}° 方向 {km} 千米处'` | choose 答案 `北偏东 {g}°`（选项 `北偏东 {g}°`、`东偏北 {g}°`、`北偏西 {g}°`）“灯塔在小岛的什么方向？” |
| 5 | 反过来看 | 从灯塔看小岛，方向相反、度数相同：南偏西 {g}°。 | 显示 back | — |

- 要点：确定位置要知道方向和距离；描述方向时先说偏离的主方向（北或南），再说偏转的度数；两个地点的相对位置，方向相反、角度相同、距离相等

### `cylinder-cone-features` 圆柱、圆锥的特征
- 位置：六下 · `cylinder-cone` · 3.7 · solid（sweep）、T1
- 元信息：summary：长方形绕一边旋转一周成圆柱，直角三角形绕直角边旋转一周成圆锥；tags [圆柱, 圆锥, 底面, 侧面, 高]；cover “圆柱 圆锥”；related [solids-intro, cylinder-surface, cone-volume]
- 舞台：800 × 450；无参数
- 零件：
  - `cy` = solid，kind cylinder，r 2，h 3，unit 40，sweep 0，at [220, 380]
  - `co` = solid，kind cone，r 2，h 3，unit 40，sweep 0，at [560, 380]
  - `t` = table，rows [['', 圆柱, 圆锥], [底面, '两个相同的圆', '一个圆'], [侧面, '曲面', '曲面'], [高, '无数条', '[一条](blank)']]，headerCol true，size 20，colWidth 130，at [220, 40]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 转出圆柱 | 长方形绕着一条边旋转一周，就成了圆柱。 | cy.sweep → 1（3s） | — |
| 2 | 转出圆锥 | 直角三角形绕着一条直角边旋转一周，就成了圆锥。 | co.sweep → 1（3s） | — |
| 3 | 圆柱的特征 | 圆柱上下两个底面是相同的圆，两个底面之间的距离是高，有无数条。 | 高亮 cy.face.top ＋ 高亮 cy.face.bottom；高亮 cy.height | — |
| 4 | 圆锥的高 | 圆锥只有一个底面，从顶点到底面圆心的距离是高，只有一条。 | ‖ 高亮 co.height ＋ t.rows → 最后一格写“一条” | tap 答案 co.height（可点 co.height、co.face.side）“点出圆锥的高。”；提示：从尖尖的顶点到底面圆心。 |

- 要点：圆柱有两个相同的圆形底面，侧面是曲面，有无数条高；圆锥有一个圆形底面，侧面是曲面，只有一条高

### `cylinder-surface` 圆柱的表面积
- 位置：六下 · `cylinder-cone` · 3.7 · solid（unfold）
- 元信息：summary：侧面展开是长方形，长 = 底面周长，宽 = 高；表面积 = 侧面积 + 两个底面积；tags [圆柱表面积, 侧面积, 展开图]；cover “2πrh+2πr²”；related [cuboid-surface, cylinder-volume]；recommended
- 舞台：900 × 450；params `r: 2`、`h: 5`；derived `side: round(2 * 3.14 * r * h * 100) / 100`、`base: round(3.14 * r * r * 100) / 100`、`s: round((side + 2 * base) * 100) / 100`；presets：`{2, 5}`、`{1, 4}`、`{3, 2}`
- 零件：
  - `cy` = solid，kind cylinder，r `{r}`，h `{h}`，unit 30，unfold 0，at [240, 400]
  - `l1` = text，`'长 = 底面周长 = 2 × 3.14 × {r}'`，size 24，at [640, 120]，hidden
  - `l2` = text，`'宽 = 高 = {h}'`，size 24，at [640, 170]，hidden
  - `eq` = expr-steps，lines [`'侧面积 + 底面积 × 2'`, `'{side} + {base} × 2'`, `'{s}'`]，show 0，at [600, 260]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 沿高剪开 | 把圆柱的侧面沿一条高剪开。 | 高亮 cy.height | — |
| 2 | 展开 | 侧面展开是一个长方形，两个底面翻到两边。 | cy.unfold → 1（3s） | — |
| 3 | 长和宽 | 长方形的长是底面周长，宽是圆柱的高。 | 显示 l1；显示 l2 | — |
| 4 | 表面积 | 表面积 = 侧面积 + 两个底面积。 | eq.show → 2 ‖ eq.show → 3 | choose 答案 {s}（选项 `{s}`、`{side}`、`{round((side + base) * 100) / 100}`）“表面积是多少？” |

- 要点：圆柱的侧面沿高展开是一个长方形，长等于底面周长，宽等于高；圆柱的侧面积 = 底面周长 × 高；圆柱的表面积 = 侧面积 + 两个底面积

### `cylinder-volume` 圆柱的体积
- 位置：六下 · `cylinder-cone` · 3.7 · solid（cutT）
- 元信息：summary：把圆柱切拼成近似长方体：体积 = 底面积 × 高；tags [圆柱体积, 转化, 底面积乘高]；cover “V=Sh”；related [circle-area, cuboid-volume, cone-volume]；recommended
- 舞台：800 × 450；params `r: 2`、`h: 4`；derived `v: round(3.14 * r * r * h * 100) / 100`；presets：`{2, 4}`、`{3, 2}`、`{1, 5}`
- 零件：
  - `cy` = solid，kind cylinder，r `{r}`，h `{h}`，unit 30，cutParts 16，cutT 0，at [260, 380]
  - `l` = text，`'长方体的长 ≈ 底面周长的一半，宽 = 半径，高不变'`，size 22，at [560, 100]，hidden
  - `eq` = text，`'3.14 × {r}[2](sup) × {h} = [{v}](blank)'`，size 30，at [560, 200]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 切开 | 把圆柱的底面平均分成 16 份，沿高切开。 | 高亮 cy | — |
| 2 | 拼一拼 | 拼起来，近似一个长方体；份数越多，越接近长方体。 | cy.cutT → 1（3s） | — |
| 3 | 对应关系 | 长方体的底面积就是圆柱的底面积，高就是圆柱的高。 | 显示 l | — |
| 4 | 体积 | 圆柱的体积 = 底面积 × 高。 | ‖ eq.text → `'3.14 × {r}[2](sup) × {h} = {v}'` | choose 答案 {v}（选项 `{v}`、`{round(3.14 * 2 * r * h * 100) / 100}`、`{round(3.14 * r * h * 100) / 100}`）“圆柱的体积是多少？” |

- 要点：圆柱的体积 = 底面积 × 高，V = Sh = πr²h；推导方法是把圆柱切拼成近似的长方体

### `cone-volume` 圆锥的体积
- 位置：六下 · `cylinder-cone` · 3.7 · solid（water）
- 元信息：summary：等底等高的圆锥装满水倒进圆柱，3 次正好倒满：V = Sh ÷ 3；tags [圆锥体积, 等底等高, 三分之一]；cover “V=Sh/3”；related [cylinder-volume]；recommended
- 舞台：800 × 450；params `r: 2`、`h: 3`；derived `v: round(3.14 * r * r * h / 3 * 100) / 100`；presets：`{2, 3}`、`{3, 4}`、`{1, 6}`
- 零件：
  - `co` = solid，kind cone，r `{r}`，h `{h}`，unit 30，water 1，at [200, 380]
  - `cy` = solid，kind cylinder，r `{r}`，h `{h}`，unit 30，water 0，at [520, 380]
  - `cnt` = text，`'倒了 0 次'`，size 26，at [520, 80]
  - `eq` = text，`'[1/3](frac) × 3.14 × {r}[2](sup) × {h} = [{v}](blank)'`，size 28，at [400, 420]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 等底等高 | 一个圆锥和一个圆柱，底面一样大，高也一样。 | 高亮 co ＋ 高亮 cy | — |
| 2 | 倒一次 | 圆锥装满水，倒进圆柱，水面升到三分之一。 | co.water → 0 ＋ cy.water → 0.333（1.5s）；cnt.text → `'倒了 1 次'` | — |
| 3 | 倒三次 | 再装满、再倒，一共倒了 3 次，正好倒满。 | co.water → 1（0.5s）；co.water → 0 ＋ cy.water → 0.667（1s）；co.water → 1；co.water → 0 ＋ cy.water → 1（1s） ‖ cnt.text → `'倒了 3 次'` | choose 答案 3（选项 2 3 4）“倒了几次正好倒满？” |
| 4 | 公式 | 圆锥的体积是等底等高圆柱的 1/3。 | ‖ eq.text → `'[1/3](frac) × 3.14 × {r}[2](sup) × {h} = {v}'` | choose 答案 {v}（min 1，max 100）“这个圆锥的体积是多少？” |
| 5 | 必须等底等高 | 不等底等高时，就不是 1/3 了。 | 高亮 co | — |

- 说明：第 3 步提问在倒完之后（`‖` 之后只改文字），孩子看着三次倒水回答。
- 要点：圆锥的体积等于和它等底等高的圆柱体积的 1/3，V = Sh ÷ 3 = πr²h ÷ 3；必须是等底等高才成立

### `review-number-system` 数的认识整理
- 位置：六下 · `review-number` · 3.8 · numberline（X4）、T3、item-set
- 元信息：summary：自然数、分数、小数、负数都能在数轴上找到位置；tags [总复习, 数的认识, 数轴, 整数, 分数, 小数, 负数]；cover “数轴”；related [negative-numberline, decimal-meaning, proper-improper]
- 舞台：800 × 450；无参数
- 零件：
  - `line` = numberline，from -3，to 3，step 1，labelEvery 1，length 680，marks []，at [60, 120]
  - `nums` = item-set，items [{ label: '5', shape: circle, color: blue, tags: { kind: int } }, { label: '0', shape: circle, color: blue, tags: { kind: int } }, { label: '−2', shape: circle, color: blue, tags: { kind: int } }, { label: '3/4', shape: circle, color: orange, tags: { kind: frac } }, { label: '0.5', shape: circle, color: orange, tags: { kind: frac } }, { label: '25%', shape: circle, color: orange, tags: { kind: frac } }]，layout row，size 56，at [120, 220]
  - `b1` = shape rect 260 × 110 fill false，at [220, 380]；`b2` 同，at [580, 380]；`l1` = label，`整数`，at [220, 310]；`l2` = label，`分数（小数、百分数）`，at [580, 310]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 自然数 | 0、1、2、3……是自然数，在数轴上 0 的右边。 | line.marks → [0, 1, 2, 3] | — |
| 2 | 分数和小数 | 整数之间还有分数、小数，比如 0.5 在 0 和 1 中间。 | line.marks → [0, 0.5, 1, 2, 3] | — |
| 3 | 负数 | 0 的左边是负数：−1、−2…… | line.marks → [-2, -1, 0, 0.5, 1, 2, 3] | — |
| 4 | 分一分 | 把这些数分成整数和分数两类；小数、百分数都可以写成分数。 | ‖ （标准做法）kind int 的移到 b1，kind frac 的移到 b2 | sort nums 按 kind 到 { int: b1, frac: b2 }“把这些数分成整数和分数两类。”；提示：0 和负整数都是整数。 |

- 要点：自然数、0、负整数统称整数；分数、小数、百分数可以互相转化；所有这些数都能在数轴上找到对应的点，右边的数总比左边的大

### `review-operations` 四则运算的意义与关系
- 位置：六下 · `review-number` · 3.8 · tape-diagram、column-calc
- 元信息：summary：加减互逆、乘除互逆；整数、小数、分数加减的道理相同：相同计数单位才能直接相加减；tags [总复习, 四则运算, 运算关系, 计数单位]；cover “+−×÷”；related [column-add-100, decimal-add-sub, fraction-add-sub-diff]
- 舞台：800 × 450；无参数
- 零件：
  - `tp` = tape-diagram，lens [[3, 2]]，segLabels [['a', 'b']]，braces [{ row: 1, from: 1, to: 2, label: 'c', side: top }]，unit 80，at [140, 70]
  - `rel` = text，`'a + b = c　c − b = a　c − a = b'`，size 26，at [400, 160]
  - `rel2` = text，`'a × b = c　c ÷ b = a　c ÷ a = b'`，size 26，at [400, 210]，hidden
  - `same` = table，rows [[整数, '23 + 45', '个位加个位'], [小数, '2.3 + 4.5', '十分位加十分位'], [分数, '[1/5](frac) + [2/5](frac)', '1/5 加 1/5']]，size 20，colWidth 150，at [130, 280]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 加减互逆 | 两部分合起来用加法；知道整体和一部分，求另一部分用减法。 | 高亮 tp；高亮 rel | — |
| 2 | 乘除互逆 | 乘法和除法也是互逆的。 | 显示 rel2 | — |
| 3 | 道理相同 | 整数、小数、分数加减，都是相同计数单位的个数相加减。 | 显示 same ‖ — | choose 答案 计数单位相同（选项 计数单位相同、位数相同、末尾对齐）“为什么要相同数位对齐、通分？” |

- 要点：加法和减法互为逆运算，乘法和除法互为逆运算；整数、小数、分数的加减法，都要把相同计数单位的数相加减

### `review-ratio-family` 比、分数、除法、百分数的关系
- 位置：六下 · `review-number` · 3.8 · table
- 元信息：summary：3 : 4、3/4、3 ÷ 4、75% 表示同一个关系；正比例比值一定，反比例积一定；tags [总复习, 比, 分数, 除法, 百分数, 正比例, 反比例]；cover “3:4=3/4”；related [ratio-meaning, percent-convert, inverse-proportion]
- 舞台：800 × 450；无参数
- 零件：
  - `t1` = table，rows [[比, 分数, 除法, 百分数], ['3 : 4', '[3/4](frac)', '3 ÷ 4', '[75%](blank)']]，colWidth 120，size 24，at [160, 60]
  - `t2` = table，rows [['', 正比例, 反比例], [关系式, 'y ÷ x = k', 'x × y = k'], [一定的量, 比值, '[积](blank)'], [图像, 过原点的直线, 曲线]]，headerCol true，colWidth 150，size 20，at [160, 230]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 同一个关系 | 3 : 4、3/4、3 ÷ 4 表示的是同一个关系，写成百分数是 75%。 | 高亮 t1 ‖ t1.rows → 最后一格写“75%” | choose 答案 75%（选项 34%、75%、0.75%）“3/4 写成百分数是多少？” |
| 2 | 两种比例 | 正比例比值一定，反比例积一定。 | 高亮 t2 ‖ t2.rows → “一定的量”行反比例一格写“积” | choose 答案 积（选项 和、差、积）“成反比例的两种量，什么一定？” |

- 要点：比的前项相当于分数的分子、除法的被除数；比、分数、除法、百分数可以互相转化；正比例比值一定，反比例积一定

### `review-word-problems` 典型问题的线段图
- 位置：六下 · `review-number` · 3.8 · tape-diagram、track
- 元信息：summary：倍、分数、百分数、工程、相遇问题都能画成线段图，找单位“1”、找对应量；tags [总复习, 解决问题, 线段图, 单位1]；cover “线段图”；related [times-concept, fraction-word-div, work-problem, meeting-problem]
- 舞台：800 × 450；无参数
- 零件：
  - `a` = tape-diagram，lens [[2], [2, 2, 2]]，rowLabels [一份, 三倍]，unit 60，at [140, 60]
  - `b` = tape-diagram，lens [[5], [3]]，ticks [5, 3]，segColors [[blue], [orange]]，rowLabels [单位“1”, 3/5]，unit 60，at [140, 170]
  - `c` = track，length 420，distance 600，movers [{ from: 0, speed: 60, asset: boy }, { from: 1, speed: 40, asset: girl }]，t 0，at [160, 300]
  - `q` = text，`'分数问题先找 [单位“1”](blank)'`，size 26，at [400, 410]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 倍 | 倍的问题：先画一份，再画几个一份。 | 高亮 a | — |
| 2 | 分数 | 分数问题：先画单位“1”，再平均分、取几份。 | 高亮 b | — |
| 3 | 行程 | 相遇问题：两人合起来走的就是全程。 | c.t → 6（3s，linear） | — |
| 4 | 关键 | 解分数、百分数问题，关键是找准单位“1”。 | ‖ q.text → `'分数问题先找 单位“1”'` | choose 答案 单位“1”（选项 单位“1”、最大的数、问题里的数）“分数问题要先找什么？” |

- 要点：画线段图能把数量关系看清楚；倍的问题找“一份”，分数、百分数问题找单位“1”，行程问题看路程、速度、时间的关系

### `review-area-formulas` 平面图形面积公式的推导关系
- 位置：六下 · `review-geometry` · 3.8 · polygon、circle-cut、arrow
- 元信息：summary：长方形 → 平行四边形 → 三角形、梯形 → 圆，都是转化成学过的图形；tags [总复习, 面积公式, 转化, 推导]；cover “转化”；related [rect-area, parallelogram-area, triangle-area, trapezoid-area, circle-area]；recommended
- 舞台：800 × 450；无参数
- 零件：
  - 五个小图形（polygon / circle-cut，尺寸都缩小）：`n1` 长方形 at 中心 [120, 220]；`n2` 平行四边形 [320, 220]；`n3` 三角形 [520, 120]；`n4` 梯形 [520, 320]；`n5` = circle-cut，radius 50，parts 8，t 0，at [700, 220]
  - 五个公式 label：`S = ab`、`S = ah`、`S = ah ÷ 2`、`S = (a + b)h ÷ 2`、`S = πr[2](sup)`，各在图形下方 70 像素，hidden
  - 箭头：`a12`（n1→n2）、`a23`（n2→n3）、`a24`（n2→n4）、`a15`（n1→n5），arrow，draw 0
  - `q` = text，`'这些公式都是把新图形 [转化](blank) 成学过的图形推出来的'`，size 24，at [400, 420]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 长方形 | 一切从长方形的面积开始：长 × 宽。 | 高亮 n1；显示公式 1 | — |
| 2 | 平行四边形 | 平行四边形剪拼成长方形：底 × 高。 | a12.draw → 1（1s）；n2.points → 拼成长方形的样子 → 回原样（两次 set，示意割补）；显示公式 2 | — |
| 3 | 三角形和梯形 | 两个三角形、两个梯形都能拼成平行四边形，所以要除以 2。 | a23.draw → 1 ＋ a24.draw → 1；显示公式 3 ＋ 显示公式 4 | — |
| 4 | 圆 | 圆切拼成近似长方形：πr²。 | a15.draw → 1；n5.t → 1（2s）；显示公式 5 | — |
| 5 | 转化 | 新图形的面积，都是转化成学过的图形推出来的。 | ‖ q.text → 填上“转化” | choose 答案 转化（选项 测量、转化、估计）“这些公式是用什么方法推出来的？” |

- 第 2 步 `n2` 的两次 set：先 set 成长方形的 4 个顶点（宽高与原平行四边形的底、高相同），再 set 回原平行四边形的顶点；写配置时按 n2 的实际坐标写出这两组 points。
- 要点：平行四边形、三角形、梯形、圆的面积公式，都是通过“转化”成已学过的图形推导出来的

### `review-volume-formulas` 立体图形体积公式的统一
- 位置：六下 · `review-geometry` · 3.8 · solid、cube-stack
- 元信息：summary：长方体、正方体、圆柱的体积都是底面积 × 高；圆锥是等底等高圆柱的 1/3；tags [总复习, 体积公式, 底面积乘高]；cover “V=Sh”；related [cuboid-volume, cylinder-volume, cone-volume]
- 舞台：800 × 450；无参数
- 零件：
  - `s1` = solid，kind cuboid，a 3，b 2，h 0.1，unit 40，at [140, 330]（底面）
  - `s2` = solid，kind cuboid，a 2，b 2，h 0.1，unit 40，at [380, 330]（升高到 2 后就是正方体）
  - `s3` = solid，kind cylinder，r 1.2，h 0.1，unit 40，at [620, 330]
  - `f` = text，`'V = [Sh](blank)'`，size 34，at [400, 70]
  - `cone` = solid，kind cone，r 1.2，h 3，unit 40，at [620, 330]，hidden；`f2` = text，`'圆锥：V = [1/3](frac) Sh'`，size 28，at [620, 140]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 底面 | 长方体、正方体、圆柱都先看底面。 | 高亮 s1 ＋ 高亮 s2 ＋ 高亮 s3 | — |
| 2 | 往上平移 | 底面一层层往上平移，扫出的就是立体图形。 | s1.h → 3 ＋ s2.h → 2 ＋ s3.h → 3（2s） | — |
| 3 | 统一的公式 | 所以它们的体积都是底面积 × 高。 | ‖ f.text → `'V = Sh'` | choose 答案 Sh（选项 Sh、2Sh、Sh ÷ 3）“它们的体积都等于什么？” |
| 4 | 圆锥 | 圆锥是等底等高圆柱的 1/3。 | 显示 cone；显示 f2 | — |

- 要点：长方体、正方体、圆柱的体积都可以用 V = Sh 计算；圆锥的体积是等底等高圆柱的 1/3

### `review-measure-units` 计量单位整理
- 位置：六下 · `review-geometry` · 3.8 · table
- 元信息：summary：长度进率 10，面积 100，体积 1000；时间、质量的进率另记；tags [总复习, 单位换算, 进率]；cover “10 100 1000”；related [length-units, area-unit-convert, volume-meaning]
- 舞台：800 × 450；无参数
- 零件：
  - `t` = table，rows [[长度, 'km →(1000)→ m →(10)→ dm →(10)→ cm →(10)→ mm'], [面积, 'm[2](sup) →(100)→ dm[2](sup) →(100)→ cm[2](sup)'], [体积, 'm[3](sup) →(1000)→ dm[3](sup) →(1000)→ cm[3](sup)'], [质量, 't →(1000)→ kg →(1000)→ g'], [时间, '时 →(60)→ 分 →(60)→ 秒']]，header false，headerCol true，colWidth [90, 520]，size 22，at [80, 60]
  - `q` = text，`'1 m[3](sup) = [1000](blank) dm[3](sup)'`，size 30，at [400, 380]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 长度 | 相邻长度单位的进率一般是 10，千米和米是 1000。 | 高亮 t.row.1 | — |
| 2 | 面积 | 面积单位的进率是 100，因为长和宽各是 10 倍。 | 高亮 t.row.2 | — |
| 3 | 体积 | 体积单位的进率是 1000，长、宽、高各是 10 倍。 | 高亮 t.row.3 ‖ q.text → `'1 m[3](sup) = 1000 dm[3](sup)'` | choose 答案 1000（选项 10 100 1000）“1 立方米等于多少立方分米？” |
| 4 | 质量和时间 | 吨、千克、克进率 1000；时、分、秒进率 60。 | 高亮 t.row.4 ＋ 高亮 t.row.5 | — |

- 要点：长度单位相邻进率一般是 10，面积单位是 100，体积单位是 1000；质量单位吨、千克、克之间进率是 1000；时间单位时、分、秒之间进率是 60

### `review-shapes-relations` 图形的特征与关系
- 位置：六下 · `review-geometry` · 3.8 · polygon、T3
- 元信息：summary：四边形家族：平行四边形包含长方形，长方形包含正方形；梯形单独一类；tags [总复习, 四边形, 图形关系, 分类]；cover “四边形家族”；related [parallelogram-height, triangle-classify]
- 舞台：800 × 450；无参数
- 零件：
  - 关系图（三个嵌套框 + 梯形框）：`r1` = shape rect 360 × 240 fill false，at [240, 180]（平行四边形）；`r2` = shape rect 240 × 150，fill false，at [260, 200]（长方形）；`r3` = shape rect 120 × 80，fill false，at [280, 215]（正方形）；`r4` = shape rect 200 × 240 fill false，at [600, 180]（梯形）；四个 label 写在各框左上角内侧
  - `items` = item-set，items：素材 para-a（tags.kind para）、rect（rect）、square（square）、trap-a（trap），layout row，size 70，at [200, 360]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 家族图 | 正方形是特殊的长方形，长方形是特殊的平行四边形。 | 高亮 r1；高亮 r2；高亮 r3 | — |
| 2 | 梯形 | 梯形只有一组对边平行，不在平行四边形里面。 | 高亮 r4 | — |
| 3 | 放一放 | 把每个图形放到它最小的那个框里。 | ‖ （标准做法）para → r1，rect → r2，square → r3，trap → r4 | sort items 按 kind 到 { para: r1, rect: r2, square: r3, trap: r4 }“把每个图形放进最小的、能包住它的框里。”；提示：正方形放最里面的框。 |

- 说明：r2 在 r1 里面、r3 在 r2 里面；T3 规定筐有嵌套时，落点属于包含它的面积最小的筐。
- 要点：长方形和正方形都是特殊的平行四边形，正方形又是特殊的长方形；梯形只有一组对边平行，不是平行四边形
