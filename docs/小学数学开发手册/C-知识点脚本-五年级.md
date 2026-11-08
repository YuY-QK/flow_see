# C · 知识点脚本 · 五年级（37 个）

> 格式和记号见 [README 第 6 节](./README.md#6-知识点脚本c-文件的格式)。竖式小步编号以 `columnCalcPlan()` 为准（见四年级文件开头的说明）。
> 坐标格说明：用到 `coordinate-grid` 的知识点，格子边长都是 40，格纸左上角在 [80, 40]，第 c 列第 r 行（从左上数，从 0 开始）的格点坐标 = [80 + 40c, 40 + 40r]；脚本里 polygon 的坐标已按此换算。

---

## 五年级上册

### `decimal-times-int` 小数乘整数
- 位置：五上 · `decimal-mult` · 3.2 · grid、column-calc（X3）
- 元信息：summary：先按整数乘，再看因数有几位小数，就从积的右边数出几位点上小数点；tags [小数乘整数, 小数乘法, 竖式]；cover “0.8×3”；related [decimal-point-move, decimal-times-decimal]
- 舞台：800 × 420；params `a: 0.8`、`k: 3`；presets `0.8 × 3`、`2.35 × 4`、`0.25 × 6`
- 零件：
  - `g` = grid，rows 1，cols 10，cell 40，filled `{a * 10}`，at [60, 70]，opacity `{a * 10 == floor(a * 10)}`（只在一位小数的那组显示）
  - `think` = text，`'先看成整数乘，再点小数点'`，size 26，at [560, 80]
  - `calc` = column-calc，a `{a}`，b `{k}`，op ×，show 0，at [300, 250]
  - `res` = text，`'{a} × {k} = [{a * k}](blank)'`，size 34，at [600, 360]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | {k} 个 {a} | {a} × {k} 就是 {k} 个 {a} 相加。 | 高亮 g | — |
| 2 | 看成整数 | 先不看小数点，按整数相乘。 | 高亮 think；calc.show → （总步数 − 1） | — |
| 3 | 点小数点 | 因数里有几位小数，积就从右边数出几位，点上小数点。 | ‖ calc.show → 99 ＋ res.text → `'{a} × {k} = {a * k}'` | choose 答案 {a * k}（选项 `{a * k}`、`{a * k * 10}`、`{a * k / 10}`）“{a} × {k} 等于多少？” |

- 说明：第 2 步的 `show` 值 = columnCalcPlan 的总步数 − 1（X3 规定最后一小步才点小数点，所以停在点小数点之前），每个 preset 各算一次写死。
- 要点：小数乘整数，先按整数乘法算出积，再看因数中有几位小数，就从积的右边起数出几位点上小数点

### `decimal-times-decimal` 小数乘小数
- 位置：五上 · `decimal-mult` · 3.6 · fraction-area、column-calc（X3）
- 元信息：summary：0.3 × 0.4 是 1 的十分之三的十分之四，是 12 个 0.01；积的小数位数等于因数小数位数之和；tags [小数乘小数, 面积模型, 积的小数位数]；cover “0.3×0.4”；related [decimal-times-int, fraction-times]；recommended
- 舞台：800 × 450；params `x: 3`、`y: 4`（表示 0.x × 0.y）；derived `p: x * y`；explore x 滑块 1–9，y 滑块 1–9
- 零件：
  - `sq` = fraction-area，rows 10，cols 10，shadeRows 0，shadeCols 0，size 300，at [60, 60]
  - `t1` = text，`'0.{x} × 0.{y} = [{p / 100}](blank)'`，size 34，at [560, 120]
  - `rule` = text，`'1 位 + 1 位 = 2 位小数'`，size 26，at [560, 200]，hidden
  - `calc` = column-calc，a `{x / 10}`，b `{y / 10}`，op ×，show 0，at [600, 320]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 边长 1 的正方形 | 一个边长 1 的正方形，平均分成 100 个小格，每格是 0.01。 | 高亮 sq | — |
| 2 | 取 0.{x} | 横着取 0.{x}，就是 {x} 行。 | sq.shadeRows → {x}（1s） | — |
| 3 | 再取 0.{y} | 竖着取 0.{y}，就是 {y} 列；重叠的部分就是 0.{x} × 0.{y}。 | sq.shadeCols → {y}（1s）；高亮 sq.overlap | — |
| 4 | 数一数 | 重叠部分有 {p} 个 0.01，是 {p / 100}。 | ‖ t1.text → `'0.{x} × 0.{y} = {p / 100}'` | choose 答案 {p / 100}（选项 `{p / 100}`、`{p / 10}`、`{p}`）“重叠部分是多少？”；提示：数一数有几个小格，每格 0.01。 |
| 5 | 小数位数 | 两个因数各有一位小数，积就有两位小数。 | 显示 rule；显示 calc；calc.show → 99 | — |

- 要点：小数乘小数，先按整数乘法算出积，再看因数中一共有几位小数，就从积的右边起数出几位点上小数点；位数不够时，在前面用 0 补足

### `product-round` 积的近似数
- 位置：五上 · `decimal-mult` · 3.1 · numberline（X4 zoom）
- 元信息：summary：保留几位小数，就看它的下一位，四舍五入；tags [积的近似数, 四舍五入, 保留小数]；cover “≈2.35”；related [big-numbers-round, quotient-round-repeating]
- 舞台：800 × 400；params `n: 2.346`；presets `2.346`、`0.875`、`5.168`（都是“五入”的情况，保证选项不重复）
- 零件：
  - `line` = numberline，from `{floor(n * 100) / 100}`，to `{floor(n * 100) / 100 + 0.01}`，step 0.001，labelEvery 5，labels decimal，length 600，marks [`{n}`]，at [100, 140]
  - `ans` = text，`'{n} ≈ [{dec(n, 2)}](blank)（保留两位小数）'`，size 32，at [400, 290]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 保留两位小数 | 保留两位小数，要看第三位小数。 | 高亮 ans | — |
| 2 | 看下一位 | 第三位是 {digit(n, -3)}，{sel(digit(n, -3) >= 5, '大于或等于 5，进 1', '小于 5，舍去')}。 | 高亮 line | — |
| 3 | 结果 | 所以 {n} ≈ {dec(n, 2)}。 | ‖ ans.text → `'{n} ≈ {dec(n, 2)}（保留两位小数）'` | choose 答案 {dec(n, 2)}（选项 `{dec(n, 2)}`、`{floor(n * 100) / 100}`、`{dec(n, 1)}`）“保留两位小数是多少？” |

- 要点：求积的近似数，要看保留位数的下一位，用四舍五入法；表示近似数时，末尾的 0 不能去掉

### `decimal-div-int` 除数是整数的小数除法
- 位置：五上 · `decimal-div` · 3.3 · column-calc（X3 ÷）、money
- 元信息：summary：商的小数点要和被除数的小数点对齐；除到末尾还有余数，添 0 继续除；tags [小数除法, 除数是整数, 商的小数点]；cover “22.4÷4”；related [decimal-div-decimal, div-column-1]；recommended
- 舞台：800 × 450；params `a: 22.4`、`d: 4`；presets `22.4 ÷ 4`、`9.6 ÷ 3`、`1 ÷ 4`（添 0）
- 零件：
  - `cash` = money，items ['20n', 1, 1, 0.1, 0.1, 0.1, 0.1]，layout row，size 0.8，at [40, 50]，opacity `{a == 22.4}`
  - `calc` = column-calc，a `{a}`，b `{d}`，op ÷，show 0，at [300, 250]
  - `res` = text，`'{a} ÷ {d} = [{a / d}](blank)'`，size 34，at [600, 400]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 先除整数部分 | 先按整数除法去除整数部分。 | 高亮 calc；calc.show → 4 | — |
| 2 | 点上小数点 | 除到被除数的小数点时，商也点上小数点，和它对齐。 | 高亮 calc | — |
| 3 | 接着除 | 余下的数和下一位合起来接着除{sel(a == 1, '；不够除就添 0 继续', '')}。 | ‖ calc.show → 99 ＋ res.text → `'{a} ÷ {d} = {a / d}'` | choose 答案 {a / d}（选项 `{a / d}`、`{a / d * 10}`、`{a / d / 10}`）“{a} ÷ {d} 等于多少？” |

- 说明：第 1 步的 `show → 4` 表示整数部分第一个商位的四小步写完；被除数整数部分是两位时（22.4）实际要更多小步，写配置时用 columnCalcPlan 取“商的小数点出现之前”的步数。`cash` 只在 22.4 这一组显示（20 元 + 2 元 + 4 角）。
- 要点：除数是整数的小数除法，按整数除法去除，商的小数点要和被除数的小数点对齐；如果有余数，在余数后面添 0 继续除

### `decimal-div-decimal` 除数是小数的除法
- 位置：五上 · `decimal-div` · 3.2 · column-calc（X3 小数点移动）、place-value
- 元信息：summary：被除数和除数同时扩大相同的倍数，商不变，把除数变成整数；tags [除数是小数, 商不变的规律, 小数除法]；cover “2.52÷0.6”；related [decimal-div-int, decimal-point-move]；recommended
- 舞台：800 × 450；params `a: 2.52`、`d: 0.6`；presets `2.52 ÷ 0.6`、`7.65 ÷ 0.85`、`12.6 ÷ 0.18`
- 零件：
  - `rule` = text，`'被除数和除数同时乘 10，商不变'`，size 26，at [560, 80]
  - `e1` = text，`'{a} ÷ {d}'`，size 32，at [560, 150]
  - `e2a` = text，`'= {a * 10} ÷ {d * 10}'`，size 32，at [560, 200]，hidden（除数是一位小数时用）
  - `e2b` = text，`'= {a * 100} ÷ {d * 100}'`，size 32，at [560, 200]，hidden（除数是两位小数时用）
  - `calc` = column-calc，a `{a}`，b `{d}`，op ÷，show 0，at [260, 250]
  - `res` = text，`'{a} ÷ {d} = [{a / d}](blank)'`，size 34，at [600, 400]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 除数是小数 | 除数是小数，先把它变成整数。 | 高亮 calc | — |
| 2a（when `{d * 10 == floor(d * 10)}`） | 同时乘 10 | 被除数和除数同时乘 10，小数点都向右移动一位，商不变。 | 显示 e2a；calc.show → 1（小数点移动的一小步） | — |
| 2b（when `{d * 10 != floor(d * 10)}`） | 同时乘 100 | 除数有两位小数，同时乘 100，小数点都向右移动两位。 | 显示 e2b；calc.show → 1 | — |
| 3 | 按整数除 | 现在除数是整数，按除数是整数的方法除。 | ‖ calc.show → 99 ＋ res.text → `'{a} ÷ {d} = {a / d}'` | choose 答案 {a / d}（选项 `{a / d}`、`{a / d * 10}`、`{a / d / 10}`） |

- 要点：除数是小数的除法，先移动除数的小数点使它变成整数；除数的小数点向右移动几位，被除数的小数点也向右移动几位，位数不够的在末尾用 0 补足

### `quotient-round-repeating` 商的近似数与循环小数
- 位置：五上 · `decimal-div` · 3.2 · column-calc
- 元信息：summary：有的除法除不尽，余数重复出现，商的数字也重复出现；tags [循环小数, 商的近似数, 除不尽]；cover “0.333…”；related [decimal-div-int, product-round]
- 舞台：800 × 450；params `a: 1`、`d: 3`；presets `1 ÷ 3`、`2 ÷ 3`、`5 ÷ 6`
- 零件：
  - `calc` = column-calc，a `{a}`，b `{d}`，op ÷，decimals [4, 0]（除到第四位小数为止），show 0，at [280, 240]
  - `rep` = text，`'{a} ÷ {d} = {fixed(a / d, 4)}…'`，size 32，at [600, 120]
  - `dot` = text，`'{fixed(a / d, 3)}…（最后一位一直重复）'`，size 26，at [600, 190]，hidden
  - `near` = text，`'{a} ÷ {d} ≈ [{dec(a / d, 2)}](blank)'`，size 32，at [600, 300]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 除一除 | {a} ÷ {d}，添 0 继续除。 | calc.show → 99（4s） | — |
| 2 | 余数重复 | 每次的余数都一样，商的数字也一样，永远除不完。 | 高亮 calc；显示 rep | — |
| 3 | 循环小数 | 从某一位起，一个或几个数字依次不断重复出现，叫循环小数。 | 显示 dot | — |
| 4 | 取近似数 | 实际计算时，按要求取近似值，保留两位小数是 {dec(a / d, 2)}。 | ‖ near.text → `'{a} ÷ {d} ≈ {dec(a / d, 2)}'` | choose 答案 {dec(a / d, 2)}（选项 `{dec(a / d, 2)}`、`{dec(a / d, 1)}`、`{fixed(a / d, 3)}`）“保留两位小数约是多少？” |

- 要点：一个数的小数部分，从某一位起，一个数字或几个数字依次不断重复出现，这样的小数叫循环小数；除不尽时可以按要求求商的近似数

### `decimal-mixed` 小数四则混合运算与简便运算
- 位置：五上 · `decimal-mixed` · 3.1 · expr-steps
- 元信息：summary：小数四则混合运算的顺序和整数一样；运算定律对小数同样适用；tags [小数混合运算, 简便运算, 运算定律]；cover “0.25×4”；related [mixed-order, simplify-calc]
- 舞台：800 × 420；params `e: 1`；presets：`{e: 1}`、`{e: 2}`
- 零件：
  - `x1` = expr-steps，lines ['0.25 × 3.2', '0.25 × (4 × 0.8)', '(0.25 × 4) × 0.8', '1 × 0.8', '0.8']，notes ['', '把 3.2 拆成 4 × 0.8', '乘法结合律', '', '']，show 1，at [100, 70]，opacity `{e == 1}`
  - `x2` = expr-steps，lines ['1.25 × 2.5 × 8', '1.25 × 8 × 2.5', '10 × 2.5', '25']，notes ['', '乘法交换律', '', '']，show 1，at [100, 70]，opacity `{e == 2}`

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 找好朋友数 | 0.25 和 4、1.25 和 8 相乘得整数，是“好朋友”。 | 高亮 x1 ＋ 高亮 x2 | — |
| 2 | 变形 | 用运算定律把好朋友凑到一起。 | x1.show → 3 ＋ x2.show → 2 | — |
| 3 | 算出来 | 凑整后口算。 | ‖ x1.show → 99 ＋ x2.show → 99 | choose 答案 `{sel(e == 1, '0.8', '25')}`（选项 `{sel(e == 1, '0.8', '25')}`、`{sel(e == 1, '8', '2.5')}`、`{sel(e == 1, '0.08', '250')}`） |

- 要点：小数四则混合运算的顺序与整数相同；整数乘法的运算定律对小数乘法同样适用；0.25 × 4 = 1，1.25 × 8 = 10

### `axis-symmetry` 轴对称
- 位置：五上 · `transformations-1` · 3.4 · coordinate-grid、polygon、E5、T1
- 元信息：summary：沿对称轴对折两边完全重合；对应点到对称轴的距离相等；tags [轴对称, 对称轴, 对应点, 补全图形]；cover “对称”；related [translation, rotation-intro]；recommended
- 舞台：800 × 450；无参数
- 零件：
  - `grid` = coordinate-grid，cols 14，rows 9，cell 40，origin top-left，at [80, 40]
  - `axis` = line，from [360, 40]，to [360, 400]，dashed，color red，width 3
  - `left` = polygon，points [[200, 120], [360, 120], [360, 320], [280, 320], [200, 240]]，color blue
  - `right` = polygon，同 left 的 points，color orange，opacity 0.7，hidden（翻折得到右半）
  - `A` = shape circle，radius 7，color accent，at [200, 120]；`Al` = label，`A`，at [184, 104]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 左半边 | 这是一个图形的左半边，红线是对称轴。 | 高亮 left；高亮 axis | — |
| 2 | 对折 | 沿对称轴对折，另一半和它完全重合。 | 显示 right；right 沿 [[360, 40], [360, 400]] 翻折 | — |
| 3 | 对应点 | 点 A 离对称轴 4 格，它的对应点在右边，也离对称轴 4 格。 | 高亮 A ‖ 高亮 grid.pt.11.2 | tap 答案 grid.pt.11.2（可点 grid.pt.*）“点出 A 的对应点。”；提示：A 离红线 4 格，对应点在右边也离红线 4 格。 |
| 4 | 轴对称图形 | 对折后两边完全重合的图形，叫轴对称图形。 | 高亮 left ＋ 高亮 right | — |

- 说明：A 在格点 (3, 2)，即 [200, 120]；对称轴 x = 360 是第 7 列；A 到轴 160 像素 = 4 格，对应点 x = 520，是第 11 列，所以答案是 `grid.pt.11.2`。
- 要点：如果一个图形沿着一条直线对折，两侧的图形能够完全重合，这个图形就是轴对称图形，折痕所在的直线叫作对称轴；对称点到对称轴的距离相等

### `translation` 平移
- 位置：五上 · `transformations-1` · 3.4 · coordinate-grid、polygon、T4
- 元信息：summary：看一个点移动了几格，而不是数中间的空格；tags [平移, 方格纸, 图形的运动]；cover “→5格”；related [axis-symmetry, rotation-intro]；recommended
- 舞台：800 × 450；params `dx: 5`；explore dx 滑块“向右移几格” 3–7
- 零件：
  - `grid` = coordinate-grid，cols 14，rows 9，cell 40，origin top-left，at [80, 40]
  - `house` = polygon，points [[120, 200], [200, 200], [200, 280], [120, 280]]，color blue（小方块房子的墙），另加 `roof` = polygon，points [[110, 200], [160, 150], [210, 200]]，color red
  - `ghost` = polygon，points [[`{120 + dx * 40}`, 200], [`{200 + dx * 40}`, 200], [`{200 + dx * 40}`, 280], [`{120 + dx * 40}`, 280]]，dashed，fill false，hidden
  - `P` = shape circle，radius 7，color accent，at [200, 200]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 平移 | 把小房子向右平移 {dx} 格。 | 高亮 house ＋ 高亮 roof；显示 ghost | — |
| 2 | 看一个点 | 盯住右上角这个点，数它走了几格。 | 高亮 P | — |
| 3 | 移过去 | 每个点都向右移动 {dx} 格。 | ‖ house 移到 by [`{dx * 40}`, 0] ＋ roof 移到 by [`{dx * 40}`, 0] ＋ P 移到 by [`{dx * 40}`, 0] | place house 到 [`{160 + dx * 40}`, 240]（showGoal）“把墙平移到虚线的位置。”；提示：看右上角的点，向右数 {dx} 格。 |
| 4 | 不是数空格 | 中间空了 {dx - 2} 格，可是图形移动了 {dx} 格。 | ‖ — | choose 答案 {dx}（选项 `{dx - 2}`、`{dx}`、`{dx + 2}`）“小房子向右平移了几格？” |

- 说明：place 只要求拖墙（house）；屋顶在答对后跟着移过去（`do` 里 roof 和 house 同时移动）。
- 要点：平移时，图形上每个点移动的方向和距离都相同；判断平移了几格，要看对应点移动了几格

### `rotation-intro` 旋转的认识
- 位置：五上 · `transformations-1` · 3.4 · polygon、E4、arc
- 元信息：summary：旋转要说清旋转中心、方向和角度；tags [旋转, 顺时针, 逆时针, 旋转中心]；cover “↻90°”；related [rotation-90, translation]
- 舞台：800 × 420；无参数
- 零件：
  - `clk` = clock，time 0，radius 110，at [180, 210]
  - `flag` = polygon，points [[500, 280], [500, 120], [580, 150], [500, 180]]，color red（小旗，旗杆底端 [500, 280] 是旋转中心）
  - `o` = shape circle，radius 6，color ink，at [500, 280]
  - `turn` = arc，radius 60，start 0，end 90，at [500, 280]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 指针在转 | 钟面上的分针绕着中心转，这是旋转。 | clk.time → 15（2s，linear） | — |
| 2 | 三要素 | 说旋转要说清：绕哪一点、往哪个方向、转多少度。 | 高亮 clk | — |
| 3 | 转小旗 | 小旗绕 O 点顺时针旋转 90°。 | 显示 turn；flag 绕 [500, 280] 转 90 | — |
| 4 | 方向 | 和钟表指针转动方向相同的叫顺时针，相反的叫逆时针。 | ‖ flag 绕 [500, 280] 转 −90 | choose 答案 逆时针（选项 顺时针 逆时针）“小旗转回来，是顺时针还是逆时针？” |

- 要点：旋转要说清旋转中心、旋转方向和旋转角度；和时针转动方向相同的是顺时针，相反的是逆时针

### `parallelogram-area` 平行四边形的面积
- 位置：五上 · `polygon-area` · 3.4 · polygon、grid、T4
- 元信息：summary：沿高剪下一个三角形，平移到另一边，拼成长方形：面积 = 底 × 高；tags [平行四边形面积, 割补, 转化, 底乘高]；cover “S=ah”；related [rect-area, triangle-area, parallelogram-height]；recommended
- 舞台：800 × 450；params `b: 6`、`h: 4`、`s: 2`（底、高、上边相对下边右移几格；1 = 40 像素）；explore b 滑块 4–8，h 滑块 2–5，s 滑块 1–3
- 零件：
  - `body` = polygon，points [[`{100 + s * 40}`, 300], [`{100 + b * 40}`, 300], [`{100 + b * 40 + s * 40}`, `{300 - h * 40}`], [`{100 + s * 40}`, `{300 - h * 40}`]]，color blue（剪掉左边三角形后剩下的部分）
  - `piece` = polygon，points [[100, 300], [`{100 + s * 40}`, 300], [`{100 + s * 40}`, `{300 - h * 40}`]]，color orange（左边要剪下的三角形）
  - `cut` = line，from [`{100 + s * 40}`, 300]，to [`{100 + s * 40}`, `{300 - h * 40}`]，dashed，color red
  - `labels` = text，`'底 {b}　高 {h}'`，size 26，at [`{100 + b * 20}`, 340]
  - `eq` = text，`'面积 = 底 × 高 = {b} × {h} = [{b * h}](blank)'`，size 30，at [560, 120]
  - `wrong` = text，`'不是邻边相乘'`，size 24，color red，at [560, 380]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 平行四边形 | 底是 {b}，高是 {h}，面积是多少？ | 高亮 body ＋ 高亮 piece | — |
| 2 | 沿高剪开 | 沿着高剪下左边的三角形。 | 高亮 cut；piece 移到 by [0, 20] | — |
| 3 | 平移过去 | 把它平移到右边。 | ‖ piece 移到 by [`{b * 40}`, −20] | place piece 到 [`{100 + b * 40 + s * 20}`, `{300 - h * 20}`]（showGoal）“把三角形平移到右边，拼成长方形。”；提示：向右平移，斜边对斜边。 |
| 4 | 变成长方形 | 拼成的长方形，长就是底，宽就是高。 | 高亮 body ＋ 高亮 piece | — |
| 5 | 面积公式 | 平行四边形的面积 = 底 × 高。 | ‖ eq.text → `'面积 = 底 × 高 = {b} × {h} = {b * h}'` | choose 答案 {b * h}（min 8，max 40） |
| 6 | 别用邻边 | 拉歪的框架邻边没变，高变小了，面积也变小了，所以不能用邻边相乘。 | 显示 wrong | — |

- 说明：place 的 `to` 是 piece 包围盒中心的目标位置（三角形包围盒宽 s×40、高 h×40）。
- 要点：平行四边形的面积 = 底 × 高，用字母表示 S = ah；推导方法是“剪、移、拼”，把平行四边形转化成长方形

### `triangle-area` 三角形的面积
- 位置：五上 · `polygon-area` · 3.4 · polygon、E4、T4
- 元信息：summary：两个完全一样的三角形能拼成平行四边形，三角形面积 = 底 × 高 ÷ 2；tags [三角形面积, 转化, 底乘高除以2]；cover “S=ah÷2”；related [parallelogram-area, trapezoid-area]；recommended
- 舞台：800 × 450；params `b: 6`、`h: 4`、`s: 2`；explore b 滑块 4–8，h 滑块 2–5，s 滑块 1–3
- 零件：
  - `t1` = polygon，points [[100, 300], [`{100 + b * 40}`, 300], [`{100 + s * 40}`, `{300 - h * 40}`]]，color blue，heights [{ from: 3, to: 1 }]
  - `t2` = polygon，同 t1 的 points，color orange，opacity 0.8
  - `eq` = text，`'{b} × {h} ÷ 2 = [{b * h / 2}](blank)'`，size 30，at [600, 120]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 两个一样的三角形 | 拿两个完全一样的三角形。 | 高亮 t1；t2 移到 by [0, 0] | — |
| 2 | 转一转 | 把第二个绕右上的边中点转半圈。 | ‖ t2 绕 [`{100 + (b + s) * 20}`, `{300 - h * 20}`] 转 180 | place t2 到拼好的位置（中心 [`{100 + b * 40 + (s * 40 - b * 40) / 2 + b * 20}`…]——place 目标写成“t2 转 180° 后的包围盒中心”，写配置时由 t2 旋转后的 points 算出）（转 180）“把橙色三角形转一转，拼成平行四边形。” |
| 3 | 拼成平行四边形 | 两个三角形拼成一个平行四边形，底和高都没变。 | 高亮 t1 ＋ 高亮 t2 | — |
| 4 | 面积公式 | 三角形面积是平行四边形的一半：底 × 高 ÷ 2。 | ‖ eq.text → `'{b} × {h} ÷ 2 = {b * h / 2}'` | choose 答案 {b * h / 2}（min 4，max 20） |

- place 的目标位置：t2 绕右边那条边（v2–v3）的中点转 180° 后的包围盒中心；写配置时用 polygon 的 points 算出数值写进 `to`（三角形三个顶点的中心对称点）。
- 要点：三角形的面积 = 底 × 高 ÷ 2，用字母表示 S = ah ÷ 2；两个完全一样的三角形能拼成一个平行四边形

### `trapezoid-area` 梯形的面积
- 位置：五上 · `polygon-area` · 3.4 · polygon、E4
- 元信息：summary：两个完全一样的梯形拼成平行四边形，梯形面积 = (上底 + 下底) × 高 ÷ 2；tags [梯形面积, 转化, 上底加下底]；cover “(a+b)h÷2”；related [triangle-area, parallelogram-area]
- 舞台：800 × 450；params `a: 3`、`b: 6`、`h: 4`；explore a 滑块 2–5，b 滑块 `a + 1`–8，h 滑块 2–5
- 零件：
  - `z1` = polygon，points [[80, 300], [`{80 + b * 30}`, 300], [`{80 + 30 + a * 30}`, `{300 - h * 30}`], [110, `{300 - h * 30}`]]，color blue
  - `z2` = polygon，同 z1，color orange，opacity 0.8
  - `eq` = text，`'({a} + {b}) × {h} ÷ 2 = [{(a + b) * h / 2}](blank)'`，size 30，at [600, 120]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 两个一样的梯形 | 上底 {a}，下底 {b}，高 {h}。 | 高亮 z1 | — |
| 2 | 转过来拼 | 把一个梯形转半圈，和另一个拼在一起。 | z2 绕右腰中点（[`{(80 + b * 30 + 80 + 30 + a * 30) / 2}`, `{300 - h * 15}`]）转 180 | — |
| 3 | 平行四边形 | 拼成的平行四边形，底是上底加下底 {a + b}，高是 {h}。 | 高亮 z1 ＋ 高亮 z2 | — |
| 4 | 面积公式 | 梯形面积是它的一半：(上底 + 下底) × 高 ÷ 2。 | ‖ eq.text → `'({a} + {b}) × {h} ÷ 2 = {(a + b) * h / 2}'` | choose 答案 {(a + b) * h / 2}（min 5，max 40） |

- 要点：梯形的面积 = (上底 + 下底) × 高 ÷ 2，用字母表示 S = (a + b)h ÷ 2

### `composite-area` 组合图形的面积
- 位置：五上 · `polygon-area` · 3.4 · polygon、grid、T1
- 元信息：summary：把组合图形分成或补成学过的图形；tags [组合图形, 分割, 添补, 面积]；cover “L形”；related [parallelogram-area, rect-area]
- 舞台：800 × 450；无参数（L 形：大长方形 8 × 6 去掉右上角 3 × 2，1 = 30 像素）
- 零件：
  - `L` = polygon，points [[100, 380], [340, 380], [340, 260], [250, 260], [250, 200], [100, 200]]，color blue，sideLabels ['8', '4', '3', '2', '5', '6']
  - `cutV` = line，from [250, 260]，to [250, 380]，dashed，color red，hidden（竖切）
  - `cutH` = line，from [100, 260]，to [250, 260]，dashed，color green，hidden（横切）
  - `fill` = polygon，points [[250, 260], [340, 260], [340, 200], [250, 200]]，dashed，fill false，color orange，hidden（补成大长方形）
  - `m1` = text，`'5 × 6 + 3 × 4 = 42'`，size 26，at [560, 120]，hidden
  - `m2` = text，`'8 × 4 + 5 × 2 = 42'`，size 26，at [560, 180]，hidden
  - `m3` = text，`'8 × 6 − 3 × 2 = [42](blank)'`，size 26，at [560, 240]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 不是学过的图形 | 这个图形的面积怎么求？ | 高亮 L | — |
| 2 | 竖着分 | 竖着分成两个长方形：5 × 6 + 3 × 4 = 42。 | 显示 cutV；显示 m1 | — |
| 3 | 横着分 | 横着分也行：8 × 4 + 5 × 2 = 42。 | 隐藏 cutV；显示 cutH；显示 m2 | — |
| 4 | 补一补 | 补成一个大长方形，再减去补上的部分。 | 隐藏 cutH；显示 fill；显示 m3 ‖ m3.text → `'8 × 6 − 3 × 2 = 42'` | choose 答案 42（选项 36 42 48）“面积是多少？”；提示：大长方形 8 × 6，减去 3 × 2。 |
| 5 | 选简单的 | 三种方法结果一样，选最简单的。 | 高亮 m1 ＋ 高亮 m2 ＋ 高亮 m3 | — |

- 说明：L 形的边长：下 8、右 4、上右缺口横 3、缺口竖 2、上 5、左 6（sideLabels 顺序按 points 的边顺序）。
- 要点：求组合图形的面积，可以把它分割成几个学过的图形，也可以补成一个学过的图形再减去补上的部分

### `clock-direction` 几点钟方向
- 位置：五上 · `clock-direction` · 3.4 · direction（clock）、T2
- 元信息：summary：以自己为中心，正前方是 12 点，钟面每个数字代表一个方向；tags [几点钟方向, 方向, 位置]；cover “3点钟方向”；related [directions-8, direction-distance]
- 舞台：800 × 450；params `k: 3`；presets：`{k: 3}`、`{k: 9}`、`{k: 1}`（球的落点要用三角函数算，所以用 presets 并写死坐标）
- 零件：
  - `me` = direction，mode clock，radius 160，pointer 0，at [300, 230]
  - `ball` = image asset basketball，width 40，height 40，at [300, 230]
  - `rule` = text，`'正前方是 12 点，每个数字之间 30°'`，size 24，at [620, 80]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 以我为中心 | 把自己想成钟面的中心，正前方是 12 点。 | 高亮 me；高亮 me.dir.12 | — |
| 2 | 每格 30 度 | 钟面 12 个方向，相邻两个之间是 30 度。 | 显示 rule | — |
| 3a（when `{k == 3}`） | 传球 | 把球传给 3 点钟方向的同学。 | ‖ me.pointer → 90 ＋ ball 移到 [460, 230] | turn me.pointer 到 90（容差 0，步长 30）“把箭头转到 3 点钟方向。”；提示：从 12 点开始，顺时针数到 3。 |
| 3b（when `{k == 9}`） | 传球 | 把球传给 9 点钟方向的同学。 | ‖ me.pointer → 270 ＋ ball 移到 [140, 230] | turn me.pointer 到 270（容差 0，步长 30）“把箭头转到 9 点钟方向。” |
| 3c（when `{k == 1}`） | 传球 | 把球传给 1 点钟方向的同学。 | ‖ me.pointer → 30 ＋ ball 移到 [380, 91] | turn me.pointer 到 30（容差 0，步长 30）“把箭头转到 1 点钟方向。” |

- 说明：球的落点 = 中心 [300, 230] + 160 × (sin 30k°, −cos 30k°)，已按三个 preset 算好。
- 要点：以自己为中心，正前方为 12 点方向，按钟面的位置确定方向；相邻两个钟点方向相差 30°

### `possibility-certain` 一定、可能、不可能
- 位置：五上 · `possibility` · 3.5 · chance
- 元信息：summary：事情的发生有一定、可能、不可能三种情况；tags [可能性, 一定, 可能, 不可能, 摸球]；cover “摸球”；related [possibility-size, fair-game]；recommended
- 舞台：800 × 450；无参数
- 零件：
  - `b1` = chance，kind bag，items [{ color: red, count: 4 }]，results [red, red, red]，draw 0，at [150, 220]；`n1` = label，`4 个红球`，at [150, 100]
  - `b2` = chance，kind bag，items [{ color: red, count: 2 }, { color: yellow, count: 2 }]，results [red, yellow, yellow]，draw 0，at [400, 220]；`n2` = label，`2 红 2 黄`，at [400, 100]
  - `b3` = chance，kind bag，items [{ color: yellow, count: 4 }]，results [yellow, yellow, yellow]，draw 0，at [650, 220]；`n3` = label，`4 个黄球`，at [650, 100]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 三个袋子 | 三个袋子里装着不同的球。 | 高亮 n1；n2；n3 | — |
| 2 | 一定 | 第一个袋子全是红球，摸出的一定是红球。 | b1.draw → 3（3s） | — |
| 3 | 可能 | 第二个袋子有红有黄，可能摸到红球，也可能摸到黄球。 | b2.draw → 3（3s） | — |
| 4 | 不可能 | 第三个袋子没有红球，不可能摸到红球。 | ‖ b3.draw → 3（3s） | choose 答案 不可能（选项 一定 可能 不可能）“从第三个袋子里摸红球，结果是？” |

- 要点：有些事情一定会发生，有些事情可能发生，有些事情不可能发生；摸球时，袋子里有什么颜色的球，才可能摸到什么颜色

### `possibility-size` 可能性的大小
- 位置：五上 · `possibility` · 3.5 · chance、chart
- 元信息：summary：哪种颜色多，摸到它的可能性就大；tags [可能性大小, 转盘, 统计]；cover “转盘”；related [possibility-certain, fair-game]
- 舞台：800 × 450；无参数
- 零件：
  - `sp` = chance，kind spinner，items [{ color: red, count: 5 }, { color: yellow, count: 1 }]，results [red, red, yellow, red, red, red, red, yellow, red, red, red, red, red, red, yellow, red, red, red, red, red]（20 次：红 17、黄 3），draw 0，tally true，at [220, 220]
  - `ch` = chart，kind bar，categories [红, 黄]，values [0, 0]，colors [red, yellow]，unit 2，max 20，showValues true，width 220，height 240，at [480, 380]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 转盘 | 红色占 5 份，黄色占 1 份。 | 高亮 sp | — |
| 2 | 猜一猜 | 指针停在哪种颜色的可能性大？ | ‖ — | choose 答案 红色（选项 红色 黄色 一样大）“停在哪种颜色的可能性大？”；提示：看哪种颜色占的地方大。 |
| 3 | 转 20 次 | 转 20 次，记下结果。 | sp.draw → 20（6s）＋ ch.values → [17, 3]（6s） | — |
| 4 | 结果 | 停在红色的次数多，但每一次停在哪里是不确定的。 | 高亮 ch | — |

- 要点：可能性有大有小；数量越多，摸到（转到）的可能性越大；但每一次的结果都是不确定的

### `fair-game` 游戏规则的公平性
- 位置：五上 · `possibility` · 3.5 · chance、T1
- 元信息：summary：双方获胜的可能性相等，游戏才公平；tags [公平, 游戏规则, 可能性]；cover “公平吗”；related [possibility-size]
- 舞台：800 × 450；无参数
- 零件：
  - `sp1` = chance，kind spinner，items [{ color: red, count: 3 }, { color: yellow, count: 1 }]，at [220, 220]
  - `sp2` = chance，kind spinner，items [{ color: red, count: 2 }, { color: yellow, count: 2 }]，at [580, 220]，hidden
  - `rule` = text，`'停在红色小明赢，停在黄色小红赢'`，size 26，at [400, 50]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 规则 | 停在红色小明赢，停在黄色小红赢。 | 高亮 rule；高亮 sp1 | — |
| 2 | 公平吗 | 红色占 3 份，黄色只占 1 份，小明赢的可能性大，不公平。 | ‖ — | choose 答案 不公平（选项 公平 不公平）“这个游戏公平吗？”；提示：两种颜色占的地方一样大吗？ |
| 3 | 改一改 | 改成红黄各 2 份，两人赢的可能性一样，就公平了。 | 显示 sp2 ‖ 高亮 sp2 | tap 答案 sp2（可点 sp1、sp2）“点出公平的转盘。” |

- 要点：游戏规则公平，就是参与双方获胜的可能性相等；不公平时可以修改规则使它公平

---

## 五年级下册

### `factor-multiple` 因数和倍数
- 位置：五下 · `factors-multiples` · 3.1 · counters、number-chart、T1
- 元信息：summary：12 个方块能拼成 1 × 12、2 × 6、3 × 4，1、2、3、4、6、12 都是 12 的因数；tags [因数, 倍数, 找因数, 找倍数]；cover “12的因数”；related [multiples-2-3-5, prime-composite]；recommended
- 舞台：800 × 450；无参数（n = 12）
- 零件：
  - `blk` = counters，count 12，layout grid，cols 12，shape square，size 30，at [40, 60]
  - `fs` = text，`'12 的因数：1, 12'`，size 28，at [520, 300]
  - `chart` = number-chart，from 1，to 60，cols 10，cell 30，marks [{ multiplesOf: 12, color: blue, style: circle }]，reveal 0，at [460, 40]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 拼长方形 | 12 个小方块拼成长方形：一行 12 个，1 × 12。 | 高亮 blk | — |
| 2 | 换一种 | 一行 6 个，拼 2 行：2 × 6。 | blk.cols → 6（1s）；fs.text → `'12 的因数：1, 2, 6, 12'` | — |
| 3 | 再换一种 | 一行 4 个，拼 3 行：3 × 4。 | ‖ blk.cols → 4（1s）；fs.text → `'12 的因数：1, 2, 3, 4, 6, 12'` | choose 答案 3（选项 3 5 7）“一行 4 个，能拼几行？” |
| 4 | 因数成对 | 12 的因数一对一对地找：1 和 12、2 和 6、3 和 4。 | 高亮 fs | — |
| 5 | 倍数 | 12 是 1、2、3、4、6、12 的倍数；12 的倍数有 12、24、36……无限多个。 | 显示 chart；chart.reveal → 1（2s） | — |

- 要点：如果 a × b = c（a、b、c 都是非 0 自然数），那么 a 和 b 是 c 的因数，c 是 a 和 b 的倍数；一个数的因数个数有限，最小是 1，最大是它本身；倍数的个数无限，最小是它本身

### `multiples-2-3-5` 2、3、5 的倍数特征
- 位置：五下 · `factors-multiples` · 3.1 · number-chart、T1（pick）
- 元信息：summary：个位是 0、2、4、6、8 的是 2 的倍数；个位是 0 或 5 的是 5 的倍数；各位数字之和是 3 的倍数的是 3 的倍数；tags [2的倍数, 3的倍数, 5的倍数, 倍数特征, 奇数, 偶数]；cover “2 3 5”；related [factor-multiple, prime-composite]；recommended
- 舞台：800 × 450；params `k: 3`；explore k 按钮组“找谁的倍数” 2 / 3 / 5（options 写成 `[{ value: 2, label: '2' }, { value: 3, label: '3' }, { value: 5, label: '5' }]`）
- 零件：
  - `chart` = number-chart，from 1，to 100，cols 10，cell 38，marks [{ multiplesOf: 2, color: blue, style: fill }, { multiplesOf: 5, color: orange, style: circle }, { multiplesOf: 3, color: green, style: circle }]，reveal 0，at [20, 30]
  - `t2` = text，`'个位是 0、2、4、6、8'`，size 24，color blue，at [600, 80]，hidden
  - `t5` = text，`'个位是 0 或 5'`，size 24，color orange，at [600, 140]，hidden
  - `t3` = text，`'各位数字之和是 3 的倍数：如 57，5 + 7 = 12'`，size 22，color green，at [600, 200]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 2 的倍数 | 把 2 的倍数涂上颜色，排成整齐的竖列。 | chart.reveal → 1（3s） | — |
| 2 | 看个位 | 个位是 0、2、4、6、8 的数，都是 2 的倍数，也叫偶数。 | 高亮 chart.col.2 ＋ col.4 ＋ col.6 ＋ col.8 ＋ col.10；显示 t2 | — |
| 3 | 5 的倍数 | 5 的倍数，个位不是 0 就是 5。 | chart.reveal → 2（3s）；显示 t5 | — |
| 4 | 3 的倍数 | 3 的倍数斜着排，看个位看不出来，要看各位数字的和。 | chart.reveal → 3（3s）；显示 t3 | — |
| 5 | 找一找 | 在表里点出 3 个 {k} 的倍数。 | ‖ — | tap 按条件（可点 chart.n.*，pick 3，valid `{n % k == 0}`）“点出 3 个 {k} 的倍数。”；提示：{sel(k == 3, '把各位上的数加起来，看是不是 3 的倍数。', sel(k == 2, '看个位是不是双数。', '看个位是不是 0 或 5。'))} |

- 要点：个位上是 0、2、4、6、8 的数都是 2 的倍数；个位上是 0 或 5 的数都是 5 的倍数；一个数各位上的数的和是 3 的倍数，这个数就是 3 的倍数

### `prime-composite` 质数与合数
- 位置：五下 · `factors-multiples` · 3.1 · number-chart（keepSelf）、counters
- 元信息：summary：只有 1 和它本身两个因数的是质数；1 既不是质数也不是合数；tags [质数, 合数, 素数, 筛法]；cover “2 3 5 7”；related [factor-multiple, gcf]；recommended
- 舞台：800 × 450；无参数
- 零件：
  - `chart` = number-chart，from 1，to 100，cols 10，cell 38，marks [{ multiplesOf: 2, color: gray, style: cross, keepSelf: true }, { multiplesOf: 3, color: gray, style: cross, keepSelf: true }, { multiplesOf: 5, color: gray, style: cross, keepSelf: true }, { multiplesOf: 7, color: gray, style: cross, keepSelf: true }]，reveal 0，at [20, 30]
  - `one` = text，`'1 既不是质数也不是合数'`，size 24，at [600, 80]，hidden
  - `blk` = counters，count 7，layout row，shape square，size 26，at [440, 300]（7 个方块只能拼一排）
  - `q` = text，`'1–100 的质数有 [25](blank) 个'`，size 26，at [600, 400]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 拼不了长方形 | 7 个方块只能拼成一排，7 只有 1 和 7 两个因数。 | 高亮 blk | — |
| 2 | 质数和合数 | 只有 1 和它本身两个因数的数叫质数；还有别的因数的叫合数。 | — | — |
| 3 | 1 不算 | 1 只有一个因数，既不是质数也不是合数。 | 高亮 chart.n.1；显示 one | — |
| 4 | 筛一筛 | 留下 2，划去 2 的倍数；留下 3，划去 3 的倍数；再划去 5、7 的倍数。 | chart.reveal → 4（8s） | — |
| 5 | 剩下的是质数 | 没被划去的（除了 1）都是质数，一共 25 个。 | ‖ q.text → `'1–100 的质数有 25 个'` | choose 答案 25（选项 15 25 35）“1 到 100 的质数有几个？” |

- 要点：一个数只有 1 和它本身两个因数，这个数叫质数；除了 1 和它本身还有别的因数的数叫合数；1 既不是质数也不是合数；2 是唯一的偶质数

### `lcm` 公倍数与最小公倍数
- 位置：五下 · `factors-multiples` · 3.1 · numberline（X4 两组 hop）
- 元信息：summary：两只青蛙一次跳 4 格、6 格，同时落到的点是公倍数，第一个是最小公倍数；tags [公倍数, 最小公倍数, 倍数]；cover “[4,6]=12”；related [factor-multiple, gcf, simplify-common-denominator]
- 舞台：800 × 400；params `a: 4`、`b: 6`；derived `m: lcm(a, b)`；presets：`{4, 6}`（12）、`{3, 4}`（12）、`{6, 8}`（24）、`{2, 5}`（10）（最小公倍数都不超过 24，数轴 0 到 2m 最长 48，刻度不会太密）
- 零件：
  - `line` = numberline，from 0，to `{2 * m}`，step 1，labelEvery `{m > 15 ? 4 : 2}`，length 680，marks []，at [60, 200]
  - `ans` = text，`'{a} 和 {b} 的最小公倍数是 [{m}](blank)'`，size 30，at [400, 320]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 两只青蛙 | 橙色青蛙一次跳 {a} 格，绿色青蛙一次跳 {b} 格。 | 高亮 line | — |
| 2 | 跳一跳 | 它们落下的点，分别是 {a} 的倍数和 {b} 的倍数。 | 重复 `{2 * m / a}` 次：hop line 从 {(i - 1) * a} 到 {i * a}（color orange，0.4s）；重复 `{2 * m / b}` 次：hop line 从 {(i - 1) * b} 到 {i * b}（color green，0.4s） | — |
| 3 | 同时落到 | 两只都落到的点是公倍数：{m}、{2 * m}…… | line.marks → [`{m}`, `{2 * m}`] | — |
| 4 | 最小的 | 第一个同时落到的点是 {m}，就是最小公倍数。 | ‖ ans.text → `'{a} 和 {b} 的最小公倍数是 {m}'` | choose 答案 {m}（min 2，max 30）“{a} 和 {b} 的最小公倍数是多少？” |

- 要点：两个数公有的倍数叫公倍数，其中最小的一个叫最小公倍数；公倍数有无限多个

### `proper-improper` 真分数、假分数、带分数与互化
- 位置：五下 · `fraction-forms` · 3.6 · fraction-circle（X6 wholes）、numberline（X4 fraction）
- 元信息：summary：分子比分母小的是真分数；分子大于或等于分母的是假分数，可以写成带分数；tags [真分数, 假分数, 带分数, 互化]；cover “7/4=1¾”；related [fraction-unit-one, fraction-and-division]；recommended
- 舞台：800 × 450；params `n: 7`、`d: 4`；explore d 滑块“分母” 2–6，n 滑块“分子” `d + 1`–`2 * d - 1`
- 零件：
  - `c` = fraction-circle，parts `{d}`，take 0，wholes 2，radius 80，at [200, 150]
  - `line` = numberline，from 0，to 2，step `{1 / d}`，labels fraction，length 600，marks [`{n / d}`]，at [100, 320]
  - `e1` = text，`'[{n}/{d}](frac) ='`，size 36，at [560, 120]
  - `e2` = text，`'{mixed(n, d)}'`，size 36，at [660, 120]，hidden（答对后显示带分数）

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 真分数 | 分子比分母小的分数叫真分数，比 1 小。 | c.take → {d - 1}（1s） | — |
| 2 | 超过一个 | 再涂，一个圆涂满了，就是 {d}/{d} = 1。 | c.take → {d}（0.5s） | — |
| 3 | 假分数 | 一共涂 {n} 份，是 {n}/{d}，分子比分母大，叫假分数。 | c.take → {n}（1s）；高亮 line | — |
| 4 | 写成带分数 | 涂满 1 个圆，还多 {n - d} 份，写成 {mixed(n, d)}，叫带分数。 | ‖ 显示 e2 | choose 答案 `{mixed(n, d)}`（选项 `{mixed(n, d)}`、`[{n - d}/{d}](frac)`、`[1 {d}/{n}](frac)`）“{n}/{d} 写成带分数是多少？”；提示：{n} 里面有几个 {d}，还剩几？ |

- 要点：分子比分母小的分数叫真分数，真分数小于 1；分子比分母大或者分子和分母相等的分数叫假分数，假分数大于或等于 1；假分数化带分数：用分子除以分母，商是整数部分，余数是分子

### `fraction-basic-property` 分数的基本性质
- 位置：五下 · `fraction-forms` · 3.6 · fraction-bar（X6 subdivide）
- 元信息：summary：分子分母同时乘或除以相同的数（0 除外），分数大小不变；tags [分数的基本性质, 分数大小不变]；cover “1/2=2/4”；related [simplify-common-denominator, fraction-unit-one]；recommended
- 舞台：800 × 420；params `a: 1`、`b: 2`、`k: 2`；explore b 滑块“分母” 2–5，a 滑块“分子” 1–`b - 1`，k 滑块“同乘几” 2–4
- 零件：
  - `bar` = fraction-bar，parts `{b}`，take `{a}`，subdivide 1，width 560，height 60，at [400, 120]
  - `eq` = text，`'[{a}/{b}](frac) = [{a * k}/{b * k}](frac blank)'`，size 40，at [400, 250]
  - `rule` = text，`'分子、分母同时乘 {k}，大小不变'`，size 26，at [400, 340]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 涂一涂 | 一条纸条平均分成 {b} 份，涂 {a} 份，是 {a}/{b}。 | 高亮 bar | — |
| 2 | 再细分 | 每一份再平均分成 {k} 份，涂色部分没变。 | bar.subdivide → {k}（1.5s） | — |
| 3 | 现在是几分之几 | 现在一共 {b * k} 份，涂了 {a * k} 份，是 {a * k}/{b * k}。 | ‖ eq.text → `'[{a}/{b}](frac) = [{a * k}/{b * k}](frac)'` | choose 答案 `{a * k}/{b * k}`（选项 `{a * k}/{b * k}`、`{a}/{b * k}`、`{a * k}/{b}`）“涂色部分现在是几分之几？” |
| 4 | 基本性质 | 分子、分母同时乘相同的数，分数大小不变；同时除以相同的数也一样，0 除外。 | 显示 rule | — |

- 要点：分数的分子和分母同时乘或者除以相同的数（0 除外），分数的大小不变

### `gcf` 公因数与最大公因数
- 位置：五下 · `fraction-forms` · 3.6 · shape、text、T1
- 元信息：summary：两个数公有的因数是公因数，最大的是最大公因数；tags [公因数, 最大公因数]；cover “(12,18)=6”；related [lcm, simplify-common-denominator]
- 舞台：800 × 450；无参数（12 和 18）
- 零件：
  - `c1` = shape circle，radius 150，fill false，stroke blue，at [300, 230]；`c2` = shape circle，radius 150，fill false，stroke orange，at [500, 230]；`l1` = label，`12 的因数`，at [220, 60]；`l2` = label，`18 的因数`，at [580, 60]
  - 因数文字（每个一个 text 零件，size 30）：只属于 12 的 `f4`（4）at [220, 200]、`f12`（12）at [220, 270]；只属于 18 的 `f9`（9）at [580, 200]、`f18`（18）at [580, 270]；公有的 `f1`（1）at [400, 170]、`f2`（2）at [400, 220]、`f3`（3）at [400, 270]、`f6`（6）at [400, 320]
  - `ans` = text，`'最大公因数是 [6](blank)'`，size 30，at [400, 420]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 两个数的因数 | 12 的因数：1、2、3、4、6、12；18 的因数：1、2、3、6、9、18。 | 高亮 c1；高亮 c2 | — |
| 2 | 公有的 | 两个圈重叠的部分是它们公有的因数：1、2、3、6。 | 高亮 f1 ＋ f2 ＋ f3 ＋ f6 | — |
| 3 | 最大的 | 公因数里最大的是 6，叫最大公因数。 | ‖ 高亮 f6 ＋ ans.text → `'最大公因数是 6'` | tap 答案 f6（可点 f1、f2、f3、f4、f6、f9、f12、f18）“点出 12 和 18 的最大公因数。”；提示：在中间重叠的部分里找最大的。 |

- 要点：几个数公有的因数叫这几个数的公因数，其中最大的一个叫最大公因数；1 是任意两个非 0 自然数的公因数

### `simplify-common-denominator` 约分与通分
- 位置：五下 · `fraction-forms` · 3.6 · fraction-bar
- 元信息：summary：约分把份数合并（用最大公因数约到最简）；通分把两个分数细分到相同的份数（用最小公倍数）；tags [约分, 通分, 最简分数, 公分母]；cover “6/8=3/4”；related [fraction-basic-property, gcf, lcm, fraction-add-sub-diff]；recommended
- 舞台：800 × 450；无参数
- 零件：
  - `b1` = fraction-bar，parts 8，take 6，width 480，height 50，at [360, 90]
  - `e1` = text，`'[6/8](frac) = [3/4](frac blank)'`，size 36，at [360, 170]
  - `p` = fraction-bar，parts 2，take 1，width 480，height 50，color blue，at [360, 260]
  - `q` = fraction-bar，parts 3，take 1，width 480，height 50，color green，at [360, 330]
  - `e2` = text，`'[1/2](frac) = [3/6](frac)，[1/3](frac) = [2/6](frac blank)'`，size 30，at [360, 410]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 约分 | 6/8：每 2 份合成 1 份，变成 3/4，大小不变。 | b1.parts → 4 ＋ b1.take → 3（1.5s） ‖ e1.text → `'[6/8](frac) = [3/4](frac)'` | choose 答案 3/4（选项 3/4、6/4、3/8）“6/8 约分后是多少？”；提示：分子分母同时除以 2。 |
| 2 | 最简分数 | 3 和 4 只有公因数 1，3/4 是最简分数；约分时用最大公因数一次就约好。 | 高亮 e1 | — |
| 3 | 通分 | 1/2 和 1/3 份不一样大，都细分成 6 份就能比了。 | p.subdivide → 3 ＋ q.subdivide → 2（1.5s）；显示 e2 ‖ e2.text → `'[1/2](frac) = [3/6](frac)，[1/3](frac) = [2/6](frac)'` | choose 答案 2/6（选项 1/6、2/6、3/6）“1/3 通分后是几分之几？” |
| 4 | 公分母 | 6 是 2 和 3 的最小公倍数，通分时用它作公分母。 | 高亮 p ＋ 高亮 q | — |

- 说明：第 1 步 fraction-bar 的 parts 从 8 变 4 是“合并”：X6 的 subdivide 只能细分，合并用 parts、take 直接 set（非连续，在动作过半时切换）；画面上是分割线突然减少，符合“合成一份”的意思。
- 要点：把一个分数化成和它相等、分子分母都比较小的分数叫约分，约到分子分母只有公因数 1 为止；把异分母分数化成和原来相等的同分母分数叫通分，一般用最小公倍数作公分母

### `fraction-add-sub-diff` 异分母分数加减
- 位置：五下 · `fraction-ops` · 3.6 · fraction-bar
- 元信息：summary：分数单位不同不能直接加减，先通分；tags [异分母分数加减, 通分, 分数加法]；cover “1/2+1/3”；related [simplify-common-denominator, fraction-add-sub-same]；recommended
- 舞台：800 × 420；params `p: 2`、`q: 3`；derived `m: lcm(p, q)`；explore p 滑块 2–5，q 滑块 `p + 1`–6
- 零件：
  - `a` = fraction-bar，parts `{p}`，take 1，width 480，height 50，color blue，at [360, 90]
  - `b` = fraction-bar，parts `{q}`，take 1，width 480，height 50，color green，at [360, 160]
  - `eq` = text，`'[1/{p}](frac) + [1/{q}](frac) = [{m / p}/{m}](frac) + [{m / q}/{m}](frac) = [{m / p + m / q}/{m}](frac blank)'`，size 30，at [400, 280]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 份不一样大 | 1/{p} 和 1/{q} 的一份不一样大，不能直接加。 | 高亮 a ＋ 高亮 b | — |
| 2 | 通分 | 都细分成 {m} 份：1/{p} = {m / p}/{m}，1/{q} = {m / q}/{m}。 | a.subdivide → {m / p} ＋ b.subdivide → {m / q}（1.5s） | — |
| 3 | 再相加 | 分数单位相同了，{m / p} 份加 {m / q} 份。 | ‖ eq.text → `'[1/{p}](frac) + [1/{q}](frac) = [{m / p}/{m}](frac) + [{m / q}/{m}](frac) = [{m / p + m / q}/{m}](frac)'` | choose 答案 `{m / p + m / q}/{m}`（选项 `{m / p + m / q}/{m}`、`2/{p + q}`、`2/{m}`）“1/{p} + 1/{q} 等于多少？”；提示：先通分，再把分子相加。 |

- 要点：异分母分数相加减，先通分，然后按照同分母分数加减法的方法计算；结果能约分的要约成最简分数

### `fraction-times` 分数乘法
- 位置：五下 · `fraction-ops` · 3.6 · fraction-bar、fraction-area
- 元信息：summary：分数乘整数是求几个相同分数的和；分数乘分数，分子乘分子、分母乘分母；tags [分数乘法, 分数乘整数, 分数乘分数, 面积模型]；cover “2/3×4/5”；related [decimal-times-decimal, fraction-divide, fraction-word-mult]；recommended
- 舞台：800 × 450；params `a: 2`、`b: 3`、`c: 4`、`d: 5`（a/b × c/d）；explore b 滑块 2–5，a 滑块 1–`b - 1`，d 滑块 2–6，c 滑块 1–`d - 1`
- 零件：
  - `bar` = fraction-bar，parts 9，take 0，width 450，height 40，at [300, 60]（3 个 2/9）
  - `e0` = text，`'[2/9](frac) × 3 = [2/9](frac) + [2/9](frac) + [2/9](frac) = [6/9](frac)'`，size 28，at [300, 120]
  - `sq` = fraction-area，rows `{d}`，cols `{b}`，shadeRows 0，shadeCols 0，size 260，at [60, 170]
  - `e1` = text，`'[{a}/{b}](frac) × [{c}/{d}](frac) = [{a * c}/{b * d}](frac blank)'`，size 34，at [560, 300]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 分数乘整数 | 2/9 × 3，就是 3 个 2/9 相加，等于 6/9。 | bar.take → 2；bar.take → 4；bar.take → 6（每步 0.6s） | — |
| 2 | 分数乘分数 | {a}/{b} × {c}/{d}，就是求 {a}/{b} 的 {c}/{d} 是多少。 | 高亮 sq | — |
| 3 | 先取 {a}/{b} | 竖着平均分成 {b} 份，取 {a} 份。 | sq.shadeCols → {a}（1s） | — |
| 4 | 再取 {c}/{d} | 横着平均分成 {d} 份，取 {c} 份；重叠部分就是结果。 | sq.shadeRows → {c}（1s）；高亮 sq.overlap | — |
| 5 | 数一数 | 一共 {b * d} 格，重叠 {a * c} 格，是 {a * c}/{b * d}。 | ‖ e1.text → `'[{a}/{b}](frac) × [{c}/{d}](frac) = [{a * c}/{b * d}](frac)'` | choose 答案 `{a * c}/{b * d}`（选项 `{a * c}/{b * d}`、`{a + c}/{b + d}`、`{a * d}/{b * c}`） |

- 要点：分数乘整数，用分子与整数相乘的积作分子，分母不变；分数乘分数，用分子相乘的积作分子，分母相乘的积作分母；能约分的先约分

### `fraction-divide` 分数除法与倒数
- 位置：五下 · `fraction-ops` · 3.6 · fraction-bar、tape-diagram
- 元信息：summary：乘积是 1 的两个数互为倒数；除以一个数（0 除外）等于乘它的倒数；tags [分数除法, 倒数, 除以分数]；cover “÷1/3=×3”；related [fraction-times, fraction-word-div]；recommended
- 舞台：800 × 450；无参数
- 零件：
  - `t` = tape-diagram，lens [[1, 1]]，segLabels [['1', '1']]，ticks [6]，unit 240，at [100, 100]
  - `e1` = text，`'2 ÷ [1/3](frac) = [6](blank)'`，size 34，at [400, 200]
  - `e2` = text，`'2 × 3 = 6'`，size 30，at [400, 260]，hidden
  - `rec` = text，`'[1/3](frac) 和 3 互为倒数：[1/3](frac) × 3 = 1'`，size 28，at [400, 330]，hidden
  - `rule` = text，`'除以一个数（0 除外），等于乘这个数的倒数'`，size 26，color accent，at [400, 400]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 2 里有几个 1/3 | 2 ÷ 1/3，就是求 2 里面有几个 1/3。 | 高亮 t | — |
| 2 | 数一数 | 每个 1 里有 3 个 1/3，2 里有 6 个。 | ‖ e1.text → `'2 ÷ [1/3](frac) = 6'` | choose 答案 6（选项 2/3、5、6）“2 里面有几个 1/3？”；提示：数一数线段上的小段。 |
| 3 | 等于乘 3 | 2 ÷ 1/3 和 2 × 3 结果一样。 | 显示 e2 | — |
| 4 | 倒数 | 1/3 × 3 = 1，乘积是 1 的两个数互为倒数。 | 显示 rec | — |
| 5 | 除法变乘法 | 除以一个数，等于乘这个数的倒数。 | 显示 rule | — |

- 要点：乘积是 1 的两个数互为倒数；甲数除以乙数（0 除外），等于甲数乘乙数的倒数

### `fraction-mixed` 分数四则混合运算与简便运算
- 位置：五下 · `fraction-ops` · 3.6 · expr-steps、F4
- 元信息：summary：分数混合运算顺序和整数一样，运算定律同样适用；tags [分数混合运算, 简便运算, 乘法分配律]；cover “(1/2+1/3)×6”；related [fraction-times, mixed-order]
- 舞台：800 × 420；无参数
- 零件：
  - `x` = expr-steps，lines ['([1/2](frac) + [1/3](frac)) × 6', '[1/2](frac) × 6 + [1/3](frac) × 6', '3 + 2', '5']，notes ['', '乘法分配律', '', '']，show 1，at [100, 80]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 看算式 | 括号里两个分数通分再加，比较麻烦。 | 高亮 x | — |
| 2 | 分配律 | 用乘法分配律，分别和 6 相乘。 | x.show → 2 | — |
| 3 | 口算 | 1/2 × 6 = 3，1/3 × 6 = 2。 | ‖ x.show → 99 | choose 答案 5（选项 5 5/6 6）“结果是多少？” |

- 要点：分数四则混合运算的运算顺序与整数相同；整数的运算定律对分数同样适用

### `cuboid-features` 长方体、正方体的特征
- 位置：五下 · `cuboid` · 3.7 · solid、T1
- 元信息：summary：6 个面、12 条棱、8 个顶点；相对的面完全相同，相对的棱长度相等；tags [长方体, 正方体, 面, 棱, 顶点, 长宽高]；cover “6面12棱8顶点”；related [solids-intro, cuboid-net, cuboid-surface]；recommended
- 舞台：800 × 450；params `a: 5`、`b: 3`、`h: 2`；explore a 滑块 3–6，b 滑块 2–`a`，h 滑块 1–4
- 零件：
  - `box` = solid，kind cuboid，a `{a}`，b `{b}`，h `{h}`，unit 40，view 0.5，edgeLabels { a: '长 {a}', b: '宽 {b}', h: '高 {h}' }，at [300, 360]
  - `cnt` = table，rows [[面, 棱, 顶点], ['[6](blank)', '[12](blank)', '[8](blank)']]，colWidth 90，at [560, 80]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 面 | 长方体有 6 个面，相对的面完全相同。 | 依次高亮 box.face.front、face.back、face.top、face.bottom、face.left、face.right；cnt.rows → [[面, 棱, 顶点], ['6', '[12](blank)', '[8](blank)']] | — |
| 2 | 棱 | 两个面相交的线段是棱，一共 12 条，分成 3 组，每组 4 条长度相等。 | ‖ 重复 12 次：高亮 box.edge.{i}（0.2s） ＋ cnt.rows → [[面, 棱, 顶点], ['6', '12', '[8](blank)']] | choose 答案 12（选项 6 8 12）“长方体有几条棱？”；提示：上面 4 条、下面 4 条，竖着的还有几条？ |
| 3 | 顶点 | 三条棱相交的点是顶点，一共 8 个。 | 重复 8 次：高亮 box.v{i}（0.2s）；cnt.rows → [[面, 棱, 顶点], ['6', '12', '8']] | — |
| 4 | 长宽高 | 相交于一个顶点的三条棱，分别叫长、宽、高；竖着的这条是高。 | ‖ 高亮 box.edge.9 | tap 答案 box.edge.9（可点 box.edge.*）“点出前面左边那条表示高的棱。”；提示：竖着的棱是高。 |
| 5 | 正方体 | 长、宽、高都相等的长方体是正方体，12 条棱都相等。 | box.a → {a} ＋ box.b → {a} ＋ box.h → {a}（1.5s） | — |

- 要点：长方体有 6 个面、12 条棱、8 个顶点；相对的面完全相同，相对的棱长度相等；相交于一个顶点的三条棱的长度分别叫长、宽、高；正方体是特殊的长方体

### `cuboid-net` 长方体和正方体的展开图
- 位置：五下 · `cuboid` · 3.7 · solid（unfold、net）、polygon
- 元信息：summary：沿棱剪开、展开铺平就是展开图；正方体展开图中相对的面不相邻；tags [展开图, 正方体展开图, 长方体展开图]；cover “展开图”；related [cuboid-features, cuboid-surface]；recommended
- 舞台：900 × 450；无参数
- 零件：
  - `cube` = solid，kind cube，a 2，unit 60，view 0.5，net 1，unfold 0，faces { front: blue, back: blue, top: orange, bottom: orange, left: green, right: green }，faceLabels { front: 前, back: 后, top: 上, bottom: 下, left: 左, right: 右 }，at [250, 380]
  - `bad1`…`bad6` = shape rect，width 60，height 60，color gray，at 依次 [630, 210]、[690, 210]、[630, 270]、[690, 270]、[750, 210]、[750, 270]（两行三列，左边四格是“田”字），hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 一个正方体盒子 | 把正方体盒子沿棱剪开。 | 高亮 cube | — |
| 2 | 展开 | 把各个面展开铺平，就得到展开图。 | cube.unfold → 1（3s） | — |
| 3 | 相对的面 | 同色的是相对的面，展开后它们不挨着。 | 高亮 cube.face.top ＋ 高亮 cube.face.bottom | — |
| 4 | 折回去 | 再折回去，又是一个正方体。 | cube.unfold → 0（2s） | — |
| 5 | 能折成吗 | 这个“田”字形的能折成正方体吗？有 4 个面挤在一起，折不成。 | 显示 bad1 ＋ bad2 ＋ bad3 ＋ bad4 ＋ bad5 ＋ bad6 ‖ — | choose 答案 不能（选项 能 不能）“这个图形能折成正方体吗？”；提示：展开图里不能有“田”字形。 |
| 6 | 其他展开图 | 正方体的展开图有 11 种，这是其中几种。 | cube.net → 7；cube.unfold → 1（2s） | — |

- 要点：长方体（正方体）沿棱剪开、展开得到的平面图形叫展开图；正方体展开图有 11 种，展开图中相对的面不相邻，不能出现“田”字形

### `cuboid-surface` 长方体、正方体的表面积
- 位置：五下 · `cuboid` · 3.7 · solid（unfold）
- 元信息：summary：6 个面的面积和；长方体表面积 = (长 × 宽 + 长 × 高 + 宽 × 高) × 2；tags [表面积, 长方体表面积, 正方体表面积]；cover “S=2(ab+ah+bh)”；related [cuboid-net, cylinder-surface]
- 舞台：900 × 450；params `a: 5`、`b: 3`、`h: 2`；derived `s: 2 * (a * b + a * h + b * h)`；explore a 滑块 3–6，b 滑块 2–`a`，h 滑块 1–4
- 零件：
  - `box` = solid，kind cuboid，a `{a}`，b `{b}`，h `{h}`，unit 30，view 0.5，unfold 0，at [260, 380]
  - `eq` = expr-steps，lines [`'({a} × {b} + {a} × {h} + {b} × {h}) × 2'`, `'({a * b} + {a * h} + {b * h}) × 2'`, `'{a * b + a * h + b * h} × 2'`, `'{s}'`]，show 0，at [560, 120]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 表面积 | 长方体 6 个面的总面积，叫它的表面积。 | 高亮 box | — |
| 2 | 展开 | 展开后 6 个面分成 3 组，每组两个一样大。 | box.unfold → 1（3s） | — |
| 3 | 三组 | 上下两个面 {a} × {b}，前后两个面 {a} × {h}，左右两个面 {b} × {h}。 | 高亮 box.face.top ＋ face.bottom；高亮 face.front ＋ face.back；高亮 face.left ＋ face.right | — |
| 4 | 算一算 | 三组面积相加再乘 2。 | eq.show → 3 ‖ eq.show → 4 | choose 答案 {s}（min 20，max 200）“表面积是多少？” |

- 要点：长方体的表面积 = (长 × 宽 + 长 × 高 + 宽 × 高) × 2；正方体的表面积 = 棱长 × 棱长 × 6

### `volume-meaning` 体积、容积与单位换算
- 位置：五下 · `cuboid` · 3.7 · solid（water）、cube-stack
- 元信息：summary：物体所占空间的大小叫体积；1 立方分米 = 1000 立方厘米，1 升 = 1 立方分米；tags [体积, 容积, 立方厘米, 立方分米, 升, 毫升]；cover “1dm³=1000cm³”；related [cuboid-volume, area-unit-convert]；recommended
- 舞台：800 × 450；无参数
- 零件：
  - `tank` = solid，kind cuboid，a 4，b 2，h 4，unit 40，view 0.4，water 0.5，at [200, 380]
  - `stone` = image asset stone，width 70，height 50，at [200, 60]
  - `cube1` = solid，kind cube，a 1，unit 40，at [520, 200]；`l1` = label，`'1 cm[3](sup)'`，at [520, 240]
  - `big` = cube-stack，fill [10, 10, 10]，unit 12，count 0，at [600, 400]，hidden
  - `eq` = text，`'1 dm[3](sup) = [1000](blank) cm[3](sup) = 1 L'`，size 30，at [560, 80]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 放进石头 | 把石头放进水里，水面升高了，石头占了空间。 | stone 移到 [200, 300]；tank.water → 0.62（1s） | — |
| 2 | 体积 | 物体所占空间的大小，叫物体的体积；容器能装多少，叫容积。 | 高亮 tank | — |
| 3 | 1 立方厘米 | 棱长 1 厘米的正方体，体积是 1 立方厘米。 | 高亮 cube1；高亮 l1 | — |
| 4 | 1 立方分米 | 棱长 1 分米的正方体里，能摆 10 × 10 × 10 个 1 立方厘米。 | 显示 big；big.count → 1000（4s） ‖ 显示 eq | choose 答案 1000（选项 10 100 1000）“1 立方分米等于多少立方厘米？”；提示：一层 100 个，有 10 层。 |
| 5 | 升 | 1 升也是 1 立方分米，1 毫升是 1 立方厘米。 | 高亮 eq | — |

- 说明：`big` 有 1000 个小方块；B25 规定渲染前剔除被完全挡住的小正方体，铺满时实际只画外层约 270 个，手机上也能流畅播放。
- 要点：物体所占空间的大小叫作物体的体积；容器所能容纳物体的体积叫作容积；1 立方分米 = 1000 立方厘米；1 升 = 1 立方分米，1 毫升 = 1 立方厘米

### `cuboid-volume` 长方体、正方体的体积
- 位置：五下 · `cuboid` · 3.7 · cube-stack
- 元信息：summary：一层摆几个，摆几层：体积 = 长 × 宽 × 高 = 底面积 × 高；tags [长方体体积, 正方体体积, 底面积乘高]；cover “V=abh”；related [volume-meaning, cylinder-volume]；recommended
- 舞台：800 × 450；params `a: 4`、`b: 3`、`h: 2`；explore a 滑块 2–6，b 滑块 2–5，h 滑块 1–4
- 零件：
  - `st` = cube-stack，fill [`{a}`, `{b}`, `{h}`]，unit 40，count 0，at [160, 380]
  - `eq` = text，`'{a} × {b} × {h} = [{a * b * h}](blank)（cm[3](sup)）'`，size 30，at [580, 120]
  - `f` = text，`'V = abh = Sh'`，size 30，color accent，at [580, 220]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 摆一层 | 用 1 立方厘米的小正方体摆，一层摆 {a} × {b} = {a * b} 个。 | st.count → {a * b}（2s） | — |
| 2 | 摆几层 | 高是 {h}，就摆 {h} 层。 | st.count → {a * b * h}（2s） | — |
| 3 | 一共几个 | 一共 {a} × {b} × {h} = {a * b * h} 个，体积是 {a * b * h} 立方厘米。 | ‖ eq.text → `'{a} × {b} × {h} = {a * b * h}（cm[3](sup)）'` | choose 答案 {a * b * h}（min 4，max 120）“体积是多少立方厘米？” |
| 4 | 公式 | 长方体体积 = 长 × 宽 × 高，也就是底面积 × 高。 | 显示 f | — |

- 要点：长方体的体积 = 长 × 宽 × 高，V = abh；正方体的体积 = 棱长 × 棱长 × 棱长，V = a³；长方体（正方体）的体积 = 底面积 × 高，V = Sh

### `rotation-90` 绕点旋转 90°
- 位置：五下 · `rotation-2` · 3.4 · coordinate-grid、polygon、E4、T1
- 元信息：summary：先转关键的一条边，再画其余部分；tags [旋转, 旋转90度, 画旋转后的图形]；cover “↻90°”；related [rotation-intro, axis-symmetry]；recommended
- 舞台：800 × 450；无参数
- 零件：
  - `grid` = coordinate-grid，cols 14，rows 9，cell 40，origin top-left，at [80, 40]
  - `fig` = polygon，points [[320, 240], [440, 240], [440, 200], [320, 120]]，color blue，vertexLabels [O, '', '', '']（O 点 [320, 240] 是旋转中心）
  - 三个候选结果（虚线轮廓）：`r1` = polygon，points [[320, 240], [320, 360], [360, 360], [440, 240]]，dashed，fill false，color green，hidden（顺时针 90°，正确）；`r2` = polygon，points [[320, 240], [320, 120], [280, 120], [200, 240]]，dashed，fill false，color orange，hidden（逆时针 90°）；`r3` = polygon，points [[320, 240], [200, 240], [200, 280], [320, 360]]，dashed，fill false，color purple，hidden（旋转 180°）

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 绕 O 点转 | 把图形绕 O 点顺时针旋转 90°。 | 高亮 fig；高亮 fig.v1 | — |
| 2 | 先转一条边 | 先看从 O 出发向右的这条边，顺时针转 90° 后朝下。 | 高亮 fig.e1 | — |
| 3 | 选一选 | 转完的图形是哪一个？ | 显示 r1 ＋ 显示 r2 ＋ 显示 r3 ‖ fig 绕 [320, 240] 转 90 | tap 答案 r1（可点 r1、r2、r3）“哪一个是顺时针旋转 90° 后的图形？”；提示：向右的边转完应该朝下。 |
| 4 | 形状大小不变 | 旋转后，图形的形状和大小都不变，只是位置变了。 | 高亮 fig ＋ 高亮 r1 | — |

- 说明：E4 对 polygon 直接旋转顶点，所以第 3 步答对后 fig 的顶点落在 r1 的位置上（顺时针 90° 在屏幕坐标里是 by +90，以 E4 的实现为准核对方向，结果必须和 r1 重合）。
- 要点：旋转时，图形绕旋转中心转动，形状、大小不变；画旋转后的图形，先确定关键的边转到的位置，再画其他部分

### `line-chart-double` 复式折线统计图
- 位置：五下 · `line-chart-2` · 3.5 · chart（line2）
- 元信息：summary：两条折线放在一起，比较两组数据的变化；tags [复式折线统计图, 折线统计图, 图例]；cover “两条折线”；related [line-chart-single, bar-chart]
- 舞台：800 × 450；无参数（甲、乙两城 1–6 月降水量）
- 零件：
  - `ch` = chart，kind line2，categories [1月, 2月, 3月, 4月, 5月, 6月]，values [20, 35, 50, 80, 120, 160]，values2 [60, 70, 85, 90, 100, 110]，names [甲城, 乙城]，unit 20，max 180，legend true，axisNames [月份, 降水量/毫米]，width 480，height 300，show 0，at [100, 380]
  - `q` = text，`'5 月甲城比乙城多 [20](blank) 毫米'`，size 26，at [640, 120]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 两条折线 | 甲城、乙城的降水量画在一张图上，用图例区分。 | ch.show → 1（3s） | — |
| 2 | 比变化 | 甲城增加得快，乙城增加得慢。 | 高亮 ch | — |
| 3 | 交叉 | 4 月到 5 月之间两条线相交，之后甲城超过乙城。 | 高亮 ch.pt.1.5 ＋ 高亮 ch.pt.2.5 | — |
| 4 | 比一比 | 5 月甲城 120 毫米，乙城 100 毫米，甲城多 20 毫米。 | ‖ q.text → `'5 月甲城比乙城多 20 毫米'` | choose 答案 20（min 5，max 60）“5 月甲城比乙城多多少毫米？” |

- 要点：复式折线统计图能同时表示两组数据的变化情况，便于比较；用图例区分不同的折线
