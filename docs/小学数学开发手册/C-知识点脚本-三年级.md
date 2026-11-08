# C · 知识点脚本 · 三年级（34 个）

> 格式和记号见 [README 第 6 节](./README.md#6-知识点脚本c-文件的格式)。已上线的 `fraction-intro`、`mult-column`、`rect-area` 不在本文件。
> 三年级讲解可以稍长（≤ 30 字），开始出现“为什么”的推理。

---

## 三年级上册

### `mult-oral` 口算乘法（整十、整百乘一位数）
- 位置：三上 · `mult-one-digit` · 3.1 · base-ten
- 元信息：summary：几个十乘几，就是几十个十；tags [口算乘法, 整十数, 整百数]；cover “20×3”；related [mult-column-1]
- 舞台：800 × 400；params `a: 2`、`k: 3`（a 个十乘 k）；derived `p: a * k`；explore a 滑块“几个十” 1–9，k 滑块“乘几” 2–9（检查：p ≤ 9 时用 tens 表示，p ≥ 10 时 base-ten 列内换行，B3 已支持）
- 零件：
  - `g{i}`（repeat `{k}`）= base-ten，tens `{a}`，columns false，at [`{40 + (i - 1) * 150}`, 60]
  - `eq` = text，`'{a * 10} × {k} = [{p * 10}](blank)'`，size 40，at [560, 330]
  - `think` = label，`'{a} 个十 × {k} = {p} 个十'`，at [300, 330]，hidden
  - `eq2` = text，`'{a * 100} × {k} = {p * 100}'`，size 30，at [560, 390]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | {k} 个 {a * 10} | {a * 10} × {k}，就是 {k} 个 {a * 10}。 | 重复 k 次：高亮 g{i}（0.3s） | — |
| 2 | 几个十 | {a * 10} 是 {a} 个十，{k} 个就是 {p} 个十。 | 显示 think | — |
| 3 | 得数 | {p} 个十是 {p * 10}。 | ‖ eq.text → `'{a * 10} × {k} = {p * 10}'` | choose 答案 {p * 10}（选项 {p}、{p * 10}、{p * 100}） |
| 4 | 整百也一样 | 整百数也一样：{a} 个百乘 {k} 是 {p} 个百。 | 显示 eq2 | — |

- 要点：整十数乘一位数，先算几个十乘几，再在积的末尾添 0；整百数同理，添两个 0

### `mult-column-1` 笔算乘法（多位数乘一位数）
- 位置：三上 · `mult-one-digit` · 3.2 · column-calc（×）、E1
- 元信息：summary：用一位数依次乘各位，满几十就向前一位进几；tags [笔算乘法, 竖式, 进位, 多位数乘一位数]；cover “236×3”；related [mult-oral, mult-column]；recommended
- 舞台：800 × 420；params `a: 236`、`k: 3`；derived `p: a * k`、`n: len(a)`；explore a 滑块 12–999，k 滑块 2–9
- 零件：
  - `calc` = column-calc，a `{a}`，b `{k}`，op ×，show 0，at [400, 190]
  - `res` = text，`'{a} × {k} = [{p}](blank)'`，size 36，at [400, 380]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 列竖式 | 一位数和被乘数的个位对齐。 | 高亮 calc | — |
| 2（repeat `{n}`） | 乘{sel(i == 1, '个', sel(i == 2, '十', sel(i == 3, '百', '千')))}位 | {k} 乘 {digit(a, i - 1)}{sel(i > 1, '，再加上进上来的数', '')}，这一位写 {digit(p, i - 1)}。 | ‖ calc.show → {i} | choose 答案 {digit(p, i - 1)}（min 0，max 9）“这一位写几？”；提示：满几十就向前一位进几。 |
| 3（when `{len(p) > n}`） | 最高位 | 最后进上来的 {floor(p / pow(10, n))} 直接写在最前面。 | calc.show → {n + 1} | — |
| 4 | 得数 | 所以 {a} × {k} = {p}。 | ‖ res.text → `'{a} × {k} = {p}'` | choose 答案 {p}（min 10，max 9000） |

- 说明：column-calc 一位乘数时，每一步就是乘一位并写出这一位（含进位小字）；`calc.show` 超过总步数时显示全部（已有行为），所以第 3 步写 `{n + 1}` 在没有多出的最高位时也安全——但它带 `when`，只在积比被乘数多一位时出现。
- 要点：从个位乘起，用一位数依次去乘每一位；哪一位上乘得的积满几十，就向前一位进几；中间有 0 时，0 乘任何数得 0，但要加上进位

### `mult-estimate` 乘法估算
- 位置：三上 · `mult-one-digit` · 3.1 · numberline（X4）
- 元信息：summary：把接近整百整十的数看成整百整十来估；tags [估算, 乘法, 约等于]；cover “198×4≈800”；related [mult-column-1, div-estimate]
- 舞台：800 × 380；params `a: 198`、`k: 4`；derived `ap: round(a / 100) * 100`、`e: ap * k`、`p: a * k`；explore a 滑块 101–899，k 滑块 2–9
- 零件：
  - `line` = numberline，from `{floor(a / 100) * 100}`，to `{floor(a / 100) * 100 + 100}`，step 10，labelEvery 5，length 600，marks [`{a}`]，at [100, 120]
  - `est` = text，`'{a} × {k} ≈ [{e}](blank)'`，size 40，at [400, 250]
  - `real` = text，`'实际：{a} × {k} = {p}'`，size 28，at [400, 330]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 不用算准 | 只想知道大约多少时，可以估算。 | 高亮 est | — |
| 2 | 看成整百数 | {a} 接近 {ap}，把它看成 {ap}。 | 高亮 line | — |
| 3 | 估一估 | {ap} × {k} = {e}，所以 {a} × {k} 大约是 {e}。 | ‖ est.text → `'{a} × {k} ≈ {e}'` | choose 答案 {e}（选项 {e}、{e / 10}、{e * 10}）“{a} × {k} 大约是多少？” |
| 4 | 比一比 | 实际是 {p}，和估的差不多。 | 显示 real | — |

- 要点：估算时，把因数看成接近它的整十、整百数再算；估算结果用“≈”

### `div-oral` 口算除法
- 位置：三上 · `div-one-digit` · 3.1 · base-ten（拆捆）
- 元信息：summary：先分整捆，不够分的捆拆开再分；tags [口算除法, 整十数除法, 两位数除以一位数]；cover “52÷4”；related [div-column-1]
- 舞台：800 × 450；params `a: 52`、`d: 4`；derived `t: floor(a / 10)`、`o: a % 10`、`q1: floor(t / d)`、`rt: t % d`、`q: a / d`；presets（整除）：`60 ÷ 3`、`42 ÷ 2`、`52 ÷ 4`、`72 ÷ 3`、`96 ÷ 4`
- 零件：
  - `pile` = base-ten，tens `{t}`，ones `{o}`，columns true，at [40, 40]
  - `p{i}`（repeat `{d}`）= base-ten，tens 0，ones 0，columns false，at [`{40 + (i - 1) * 180}`, 260]
  - `eq` = text，`'{a} ÷ {d} = [{q}](blank)'`，size 40，at [600, 100]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 平均分 | {a} 根小棒平均分成 {d} 份。 | 高亮 pile | — |
| 2 | 先分整捆 | 先分整捆：{t} 捆，每份分 {q1} 捆。 | pile.tens → {rt} ＋ 重复 d 次：p{i}.tens → {q1} | — |
| 3（when `{rt > 0}`） | 拆开再分 | 剩下 {rt} 捆不够每份一捆，拆开是 {rt * 10} 根，和 {o} 根合起来。 | pile.tens → 0 ＋ pile.ones → {rt * 10 + o}（拆捆，B3 一次拆一个十，rt > 1 时用 repeat） | — |
| 4 | 再分根 | {rt * 10 + o} 根，每份分 {(rt * 10 + o) / d} 根。 | pile.ones → 0 ＋ 重复 d 次：p{i}.ones → {(rt * 10 + o) / d} | — |
| 5 | 得数 | 每份 {q1} 捆和 {(rt * 10 + o) / d} 根，是 {q}。 | ‖ eq.text → `'{a} ÷ {d} = {q}'` | choose 答案 {q}（min 10，max 50） |

- 要点：两位数除以一位数，先分十位（整捆），再分个位；十位分剩下的，拆开和个位合起来再分

### `div-column-1` 笔算除法：从高位除起
- 位置：三上 · `div-one-digit` · 3.2 · column-calc（÷，X2）、base-ten、E1
- 元信息：summary：从高位除起，每次“商、乘、减、落”；tags [笔算除法, 竖式, 除数是一位数]；cover “72÷3”；related [div-oral, div-column-zero, remainder-column]；recommended
- 舞台：800 × 450；params `a: 72`、`d: 3`；derived `q: floor(a / d)`、`r: a % d`；presets：`72 ÷ 3`、`84 ÷ 4`、`95 ÷ 4`、`156 ÷ 3`、`438 ÷ 6`
- 零件：
  - `calc` = column-calc，a `{a}`，b `{d}`，op ÷，show 0，at [240, 220]
  - `pile` = base-ten，hundreds `{digit(a, 2)}`，tens `{digit(a, 1)}`，ones `{digit(a, 0)}`，columns true，at [470, 40]
  - `res` = text，`'{a} ÷ {d} = [{q}](blank)'`，size 34，at [560, 400]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 写竖式 | 除数写在左边，被除数写在里面，从最高位除起。 | 高亮 calc | — |
| 2（repeat `{len(q)}`） | 第 {i} 次除 | 前面剩下的和这一位合起来除以 {d}，商 {digit(q, len(q) - i)}，再乘、减、落。 | calc.show → {i * 4 - 4} ‖ calc.show → {i * 4 - 3}；calc.show → {i * 4 - 2}；calc.show → {i * 4 - 1}；calc.show → {i * 4} | choose 答案 {digit(q, len(q) - i)}（min 0，max 9）“这一位商几？”；提示：想 {d} 的乘法口诀，几乘 {d} 最接近又不超过。 |
| 3 | 得数 | 所以 {a} ÷ {d} = {q}，余数是 {a % d}。 | 高亮 calc ‖ res.text → `'{a} ÷ {d} = {q}'` | choose 答案 {q}（min 1，max 200） |

- 说明：余数为 0 时读作“余数是 0”，表示正好除尽。
- 说明：第 2 步每份四小步（商、乘、减、落），提问在“商”之前，答对后放商、乘、减、落。被除数最高位比除数小时（如 156 ÷ 3），column-calc 会先跳过这一位，小步编号以零件导出的 `columnCalcPlan` 为准——写配置时对每个 preset 用它核对 `show` 的值，只调数值，不改结构。
- 要点：除数是一位数的除法，从被除数的最高位除起；每次除都是“商、乘、减、落”；每次减下来的数要比除数小

### `div-check` 除法的验算
- 位置：三上 · `div-one-digit` · 随时
- 元信息：summary：商 × 除数 + 余数 = 被除数；tags [验算, 除法, 余数]；cover “验算”；related [div-column-1, remainder-meaning]
- 舞台：800 × 420；params `t: 23`、`g: 5`；derived `q: floor(t / g)`、`r: t % g`；explore g 滑块 2–6，t 滑块 `g + 1`–`10 * g - 1`
- 零件：
  - `p{i}`（repeat `{g}`）= counters，count `{q}`，layout grid，cols 3，capacity `{q}`，size 26，at [`{40 + (i - 1) * 120}`, 60]
  - `rest` = counters，count `{r}`，row，size 26，color orange，at [40, 240]
  - `all` = counters，count 0，layout grid，cols 8，size 26，at [520, 60]
  - `eq` = text，`'{q} × {g} + {r} = [{t}](blank)'`，size 36，at [520, 330]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 分好了 | {t} ÷ {g} = {q} …… {r}，对不对？倒回去算一算。 | 重复 g 次：高亮 p{i}（together）；高亮 rest | — |
| 2 | 合回去 | 把 {g} 份合起来，是 {q} × {g} = {q * g} 个。 | 重复 g 次：p{i} 合并到 all | — |
| 3 | 加上余数 | 再加上剩下的 {r} 个，正好是 {t} 个。 | rest 合并到 all ‖ eq.text → `'{q} × {g} + {r} = {t}'` | choose 答案 {t}（min 2，max 60）“{q} × {g} + {r} 等于几？” |
| 4 | 验算对了 | 和被除数一样，说明算对了。 | 高亮 eq | — |

- 要点：有余数的除法可以这样验算：商 × 除数 + 余数 = 被除数；没有余数时，商 × 除数 = 被除数

### `times-concept` 倍的认识与应用
- 位置：三上 · `times-concept` · 3.6 · counters、tape-diagram
- 元信息：summary：把一个数看作一份，另一个数有几个这样的一份就是几倍；tags [倍, 几倍, 求一个数的几倍, 线段图]；cover “3倍”；related [mult-meaning, divide-by-table]；recommended
- 舞台：800 × 420；params `u: 2`、`k: 4`；derived `w: u * k`；explore u 滑块“胡萝卜几根” 2–5，k 滑块“几倍” 2–6
- 零件：
  - `carrot` = counters，count `{u}`，row，size 36，color orange，at [140, 60]
  - `radish` = counters，count `{w}`，row，size 36，color blue，at [140, 140]
  - `rl1` = label，`胡萝卜`，at [70, 78]；`rl2` = label，`白萝卜`，at [70, 158]
  - `tape` = tape-diagram，lens `[['{u}'], ['{w}']]`，ticks `[1, '{k}']`（第一行不分，第二行等分 k 份），rowLabels [胡萝卜, 白萝卜]，unit 30，at [140, 260]，hidden
  - `eq` = text，`'{w} ÷ {u} = [{k}](blank)'`，size 36，at [620, 300]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 一份 | 胡萝卜 {u} 根，把 {u} 根看作一份。 | 高亮 carrot | — |
| 2 | 圈一圈 | 白萝卜每 {u} 根圈一圈，圈出 {k} 份。 | 重复 k 次：从 radish 拆 {u} 个为 grp{i}（offset [`{(i - 1) * 8}`, 0]，每组之间留出 8 像素空隙） | — |
| 3 | 几倍 | 白萝卜有 {k} 个 {u} 根，是胡萝卜的 {k} 倍。 | ‖ 重复 k 次：高亮 grp{i}（together） | choose 答案 {k}（min 2，max 9）“白萝卜是胡萝卜的几倍？”；提示：数一数圈出了几份。 |
| 4 | 线段图 | 画成线段图：一份是 {u}，白萝卜有 {k} 份。 | 显示 tape | — |
| 5 | 列算式 | 求几倍用除法：{w} ÷ {u} = {k}。 | ‖ eq.text → `'{w} ÷ {u} = {k}'` | choose 答案 {k} |

- 要点：求一个数是另一个数的几倍，就是看它里面有几个另一个数，用除法；求一个数的几倍是多少，用乘法

### `fraction-compare` 分数的大小比较
- 位置：三上 · `fraction` · 随时
- 元信息：summary：分子都是 1，分母越大每份越小；分母相同，分子越大越大；tags [分数比较, 分数大小, 几分之一]；cover “1/3>1/4”；related [fraction-intro, fraction-add-sub-same]
- 舞台：800 × 420；params `m: 3`、`n: 4`；explore m 滑块 2–9，n 滑块 `m + 1`–10
- 零件：
  - `c1` = fraction-circle，parts `{m}`，take 1，radius 100，color orange，at [200, 170]
  - `c2` = fraction-circle，parts `{n}`，take 1，radius 100，color blue，at [460, 170]
  - `cmp` = text，`'[1/{m}](frac) [>](blank) [1/{n}](frac)'`，size 44，at [330, 340]
  - `b1` = fraction-bar，parts 6，take 2，width 360，height 44，at [600, 330]，hidden；`b2` = fraction-bar，parts 6，take 5，width 360，height 44，at [600, 390]，hidden（同分母对比）

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 同样大的饼 | 两个同样大的饼，一个平均分成 {m} 份，一个分成 {n} 份。 | 高亮 c1；高亮 c2 | — |
| 2 | 各取一份 | 各取一份，分的份数越多，每份越小。 | 高亮 c1 ＋ 高亮 c2 ‖ cmp.text → `'[1/{m}](frac) > [1/{n}](frac)'` | choose 答案 >（选项 > = <）“1/{m} 和 1/{n} 哪个大？”；提示：分的份数越多，每一份越小。 |
| 3 | 分母相同 | 分母相同时，分子大的分数大：5/6 > 2/6。 | 显示 b1；显示 b2 | — |

- 要点：分子都是 1 的分数，分母越大，分数越小；分母相同的分数，分子越大，分数越大

### `fraction-add-sub-same` 同分母分数加减、1 减几分之几
- 位置：三上 · `fraction` · 随时
- 元信息：summary：几个几分之一加减几个几分之一；1 可以看成分母分之分母；tags [同分母分数加减, 分数加法, 分数减法]；cover “2/8+3/8”；related [fraction-intro, fraction-add-sub-diff]
- 舞台：800 × 420；params `n: 8`、`a: 2`、`b: 3`；explore n 滑块“分母” 4–10，a 滑块 1–`n - 2`，b 滑块 1–`n - a - 1`
- 零件：
  - `bar` = fraction-bar，parts `{n}`，take `{a}`，width 560，height 60，color orange，at [400, 120]
  - `eq` = text，`'[{a}/{n}](frac) + [{b}/{n}](frac) = [{a + b}/{n}](frac blank)'`，size 44，at [400, 230]
  - `eq2` = text，`'1 − [{a + b}/{n}](frac) = [{n - a - b}/{n}](frac blank)'`，size 44，at [400, 330]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 先涂 {a} 份 | {a}/{n} 是 {a} 个 1/{n}。 | 高亮 bar | — |
| 2 | 再涂 {b} 份 | 再加 {b} 个 1/{n}，一共 {a + b} 个 1/{n}。 | bar.take → {a + b}（1s） ‖ eq.text → `'… = [{a + b}/{n}](frac)'` | choose 答案 `{a + b}/{n}`（选项 `{a + b}/{n}`、`{a + b}/{2 * n}`、`{a * b}/{n}`）“{a}/{n} + {b}/{n} 等于多少？”；提示：数一数涂了几份。 |
| 3 | 1 减几分之几 | 整条是 1，也就是 {n}/{n}；去掉 {a + b} 份，还剩 {n - a - b}/{n}。 | 显示 eq2；高亮 bar ‖ eq2.text → `'1 − [{a + b}/{n}](frac) = [{n - a - b}/{n}](frac)'` | choose 答案 `{n - a - b}/{n}`（选项 `{n - a - b}/{n}`、`{n - a - b}/1`、`{a + b}/{n}`） |

- 要点：同分母分数相加减，分母不变，分子相加减；计算 1 减几分之几，先把 1 写成分母和分子相同的分数

### `ton` 吨的认识
- 位置：三上 · `mass-2` · 3.3 · image、balance
- 元信息：summary：1 吨 = 1000 千克，称很重的东西用吨；tags [吨, 千克, 质量单位, 换算]；cover “1t=1000kg”；related [gram-kilogram]
- 舞台：800 × 400；无参数
- 零件：
  - `bags` = item-set，items `[{ repeat: 10, asset: rice-bag, label: '100 千克' }]`，layout grid，cols 5，size 70，at [60, 60]
  - `truck` = image asset truck，width 220，height 130，at [620, 160]
  - `eq` = text，`'1 吨 = [1000](blank) 千克'`，size 40，at [400, 360]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 一袋大米 | 一大袋大米重 100 千克。 | 高亮 bags.1 | — |
| 2 | 十袋 | 10 袋是 1000 千克，就是 1 吨。 | 高亮 bags ‖ eq.text → `'1 吨 = 1000 千克'` | choose 答案 1000（选项 100 1000 10000）“10 袋 100 千克的大米重多少千克？” |
| 3 | 用吨的地方 | 称货车、轮船上很重的东西，常用吨作单位。 | 高亮 truck | — |

- 要点：1 吨 = 1000 千克；计量很重的物品，常用吨作单位

### `elapsed-time` 秒的认识与经过时间
- 位置：三上 · `time-2` · 3.3 · clock、numberline（time）、F2（hm）
- 元信息：summary：先算到整时，再加剩下的分；tags [经过时间, 时间计算, 秒]；cover “8:30→9:15”；related [hour-minute-second, 24-hour]；recommended
- 舞台：800 × 420；params `s: 510`、`e: 555`（分钟，8:30、9:15）；derived `h1: ceil(s / 60) * 60`、`d1: h1 - s`、`d2: e - h1`、`d: e - s`；explore s 滑块“开始” 420–700（步长 5），e 滑块“结束” `s + 10`–`s + 115`（步长 5）（检查：e 必须跨过整点——用 `min: '{ceil(s / 60) * 60 + 5}'` 保证）
- 零件：
  - `clk` = clock，time `{s}`，radius 120，at [180, 200]
  - `line` = numberline，from `{floor(s / 60) * 60}`，to `{floor(s / 60) * 60 + 120}`，step 5，labelEvery 6，labels time，length 480，pointer `{s}`，at [300, 330]
  - `eq` = text，`'{d1} + {d2} = [{d}](blank) 分'`，size 36，at [560, 160]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 从几点到几点 | 从 {time(s)} 到 {time(e)}，经过多长时间？ | 高亮 clk；高亮 line | — |
| 2 | 先到整时 | 先走到整时 {time(h1)}，经过 {d1} 分。 | clk.time → {h1}（2s，linear）＋ hop line 从 {s} 到 {h1}（label `'{d1} 分'`） | — |
| 3 | 再走一段 | 再到 {time(e)}，又经过 {d2} 分。 | clk.time → {e}（2s，linear）＋ hop line 从 {h1} 到 {e}（label `'{d2} 分'`） | — |
| 4 | 合起来 | 合起来是 {d} 分。 | ‖ eq.text → `'{d1} + {d2} = {d} 分'` | choose 答案 {d}（min 10，max 120）“一共经过多少分？”；提示：{d1} + {d2}。 |

- 要点：计算经过的时间，可以先算到整时，再加上剩下的部分；也可以用结束时刻减开始时刻

### `line-ray-segment` 直线、射线、线段
- 位置：三上 · `lines-angles-1` · 3.4 · line（X7）、T1
- 元信息：summary：线段有两个端点，射线一端无限长，直线两端都无限长；tags [直线, 射线, 线段, 端点]；cover “—•”；related [angle-intro, parallel-perpendicular]；recommended
- 舞台：800 × 420；无参数
- 零件：
  - `seg` = line，from [240, 120]，to [560, 120]，ends [point, point]，width 4
  - `ray` = line，from [240, 220]，to [560, 220]，ends [point, open]，extend 0，width 4，hidden
  - `full` = line，from [240, 320]，to [560, 320]，ends [open, open]，extend 0，width 4，hidden
  - `pt` = shape circle，radius 6，color accent，at [400, 400]，hidden
  - `fan1`…`fan6` = line，过点 [400, 400]、方向分别为 0°、30°、60°、90°、120°、150°、长 300 的线段（两端坐标 = 点 ± 150 × (cos θ, −sin θ)，写配置时算好写死），ends [open, open]，hidden
  - `n1`、`n2`、`n3` = label：`线段`、`射线`、`直线`，at [680, 120 / 220 / 320]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 线段 | 线段是直直的，有两个端点，能量出长度。 | 高亮 seg；显示 n1 | — |
| 2 | 射线 | 把线段的一端无限延长，就是射线，只有一个端点。 | 显示 ray；ray.extend → 1（1.5s）；显示 n2 | — |
| 3 | 直线 | 两端都无限延长，就是直线，没有端点。 | 显示 full；full.extend → 1（1.5s）；显示 n3 | — |
| 4 | 认一认 | 射线有一个端点，向一边无限延长。 | ‖ 高亮 ray | tap 答案 ray（可点 seg、ray、full）“点出射线。”；提示：只有一个端点的。 |
| 5 | 过一点、过两点 | 过一点能画无数条直线；过两点只能画一条。 | 隐藏 seg ＋ 隐藏 ray ＋ 隐藏 full；显示 pt；依次显示 fan1…fan6 | — |

- 要点：线段有两个端点，有长度；射线有一个端点，可以向一端无限延长；直线没有端点，可以向两端无限延长；过两点只能画一条直线

### `angle-measure-1` 角的初步度量（认识度）
- 位置：三上 · `lines-angles-1` · 3.4 · angle、protractor
- 元信息：summary：用同样大的小角去量，半圆平均分成 180 份，每份是 1 度；tags [角的度量, 度, 量角]；cover “1°”；related [angle-intro, protractor-use]
- 舞台：800 × 420；params `g: 60`；explore g 按钮组 30 / 60 / 90 / 120
- 零件：
  - `big` = angle，from 0，size `{g}`，length 220，arc true，at [180, 330]
  - `unit{i}`（repeat `{g / 30}`）= angle，from `{(i - 1) * 30}`，size 30，length 120，color orange，arcColor orange，at [180, 330]，hidden
  - `prot` = protractor，radius 200，at [580, 330]，hidden
  - `eq` = text，`'这个角是 [{g}](blank)°'`，size 36，at [580, 80]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 多大的角 | 这个角有多大？用一个小角去量。 | 高亮 big | — |
| 2 | 拼一拼 | 用 30 度的小角一个一个拼，拼了 {g / 30} 个。 | 重复 g/30 次：显示 unit{i}（0.5s） | — |
| 3 | 更小的单位 | 把半圆平均分成 180 份，每一份的角是 1 度。 | 显示 prot | — |
| 4 | 读一读 | 这个角是 {g} 度。 | ‖ eq.text → `'这个角是 {g}°'` | choose 答案 {g}（选项 30 60 90 120）“这个角是多少度？” |

- 要点：量角要用统一的单位；把半圆平均分成 180 份，每份的角是 1 度，记作 1°

### `perimeter-meaning` 周长的含义
- 位置：三上 · `perimeter` · 3.4 · path、E6、T1
- 元信息：summary：沿着图形的边线围一周的长度，就是周长；tags [周长, 一周, 边线]；cover “一周”；related [rect-perimeter, area-meaning]；recommended
- 舞台：800 × 420；无参数
- 零件：
  - `leaf` = image asset leaf，width 260，height 200，at [240, 200]
  - `edge` = path，points（沿树叶轮廓的 16 个点，写配置时按素材轮廓取点，首尾相同），closed true，draw 0，marker ant（素材），width 5
  - `rope` = path，points [[460, 360], [760, 360]]，draw 0，width 5，hidden
  - `opts` = 三个零件：`a` = polygon（树叶内部的一块阴影，示意“面”），`b` = edge 本身，`c` = line（树叶中间的叶脉）——tap 的可点项是 [a, edge, c]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 小蚂蚁爬一圈 | 小蚂蚁从这里出发，沿着树叶的边爬一圈。 | edge.draw → 1（4s，linear） | — |
| 2 | 回到起点 | 爬了一整圈，又回到起点。 | 高亮 edge | — |
| 3 | 拉直量一量 | 把这一圈边线拉直，量出的长度就是树叶的周长。 | 显示 rope；rope.draw → 1（2s） | — |
| 4 | 哪个是周长 | 周长是边线一周，不是里面的面。 | ‖ 高亮 edge | tap 答案 edge（可点 a、edge、c）“点出表示周长的那条线。”；提示：沿着最外面的边一整圈。 |

- 要点：封闭图形一周的长度，就是它的周长；量周长要从一点出发，沿边线围一周回到起点

### `rect-perimeter` 长方形、正方形的周长
- 位置：三上 · `perimeter` · 3.4 · polygon、path
- 元信息：summary：长方形周长 = (长 + 宽) × 2，正方形周长 = 边长 × 4；tags [周长, 长方形周长, 正方形周长, 公式]；cover “(长+宽)×2”；related [perimeter-meaning, rect-area]；recommended
- 舞台：800 × 420；params `l: 6`、`w: 4`（厘米，1 = 40 像素）；derived `c: (l + w) * 2`；explore l 滑块 3–8，w 滑块 1–`l`
- 零件：
  - `rect` = polygon，points [[80, 80], [`{80 + l * 40}`, 80], [`{80 + l * 40}`, `{80 + w * 40}`], [80, `{80 + w * 40}`]]，sideLabels [`'{l} 厘米'`, `'{w} 厘米'`, `''`, `''`]，color blue
  - `unroll` = path，points [[80, 360], [`{80 + c * 20}`, 360]]，lengths []，draw 0，width 6，hidden（拉直后的长度按 1 厘米 = 20 像素画，避免太长）
  - `ways` = expr-steps，lines [`'{l} + {w} + {l} + {w} = {c}'`]，show 0，size 28，at [460, 120]
  - `w2` = text，`'{l} × 2 + {w} × 2 = {c}'`，size 28，at [460, 180]，hidden
  - `w3` = text，`'({l} + {w}) × 2 = [{c}](blank)'`，size 28，at [460, 240]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 四条边 | 长方形的周长，就是四条边的总长。 | 高亮 rect | — |
| 2 | 拉直 | 把四条边首尾接起来拉直。 | 显示 unroll；unroll.draw → 1（2s） | — |
| 3 | 方法一 | 四条边依次加起来。 | ways.show → 1 | — |
| 4 | 方法二 | 两条长、两条宽：{l} × 2 + {w} × 2。 | 显示 w2 | — |
| 5 | 方法三 | 一条长加一条宽是周长的一半，再乘 2。 | 显示 w3 ‖ w3.text → `'({l} + {w}) × 2 = {c}'` | choose 答案 {c}（min 8，max 40）“周长是多少厘米？” |
| 6 | 正方形 | 正方形四条边一样长，周长 = 边长 × 4。 | rect.points → [[80, 80], [`{80 + l * 40}`, 80], [`{80 + l * 40}`, `{80 + l * 40}`], [80, `{80 + l * 40}`]] | — |

- 说明：第 6 步把长方形变成边长为 l 的正方形（l 最大 8，高 320，在舞台内）。
- 要点：长方形的周长 = (长 + 宽) × 2；正方形的周长 = 边长 × 4

### `perimeter-on-grid` 在方格纸上数周长
- 位置：三上 · `perimeter` · 3.4 · coordinate-grid、path
- 元信息：summary：沿着边数格子的边，不是数格子；tags [周长, 方格纸, 数一数]；cover “方格周长”；related [rect-perimeter, area-meaning]
- 舞台：800 × 420；无参数（固定 L 形：占 3 × 2 加 1 × 1）
- 零件：
  - `grid` = coordinate-grid，cols 10，rows 8，cell 40，origin top-left，at [40, 40]
  - `shape` = polygon，points [[120, 120], [240, 120], [240, 160], [280, 160], [280, 200], [120, 200]]，color blue
  - `edge` = path，points 同 shape（首尾相同），closed true，draw 0，marker dot，lengths []，width 5
  - `cnt` = text，`'周长 = [12](blank) 个格子边长'`，size 30，at [560, 200]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 怎么数 | 方格纸上，一小格的边长是 1，这个图形周长是多少？ | 高亮 shape | — |
| 2 | 沿边数 | 沿着边一段一段数，数的是格子的边。 | edge.draw → 1（6s，linear） | — |
| 3 | 结果 | 一共 12 段，周长是 12。 | ‖ cnt.text → `'周长 = 12 个格子边长'` | choose 答案 12（选项 6 10 12）“周长是几个小格边长？”；提示：数边，不是数格子。 |

- 说明：L 形周长：120→240 是 3、向下 1、向右 1、向下 1、向左 4、向上 2，共 3 + 1 + 1 + 1 + 4 + 2 = 12。
- 要点：在方格纸上求周长，沿着图形的边数有几个小格的边长

### `div-word` 除法解决问题
- 位置：三上 · `div-word-unit` · 随时
- 元信息：summary：每份几个、能分几份，都用除法；tags [除法应用, 解决问题, 平均分]；cover “分一分”；related [division-two-meanings, div-column-1]
- 舞台：800 × 420；params `t: 48`、`g: 4`；derived `e: t / g`；presets `{48, 4}`、`{60, 5}`、`{84, 7}`
- 零件：
  - `books` = counters，count `{t}`，layout grid，cols 12，shape square，size 22，color blue，at [40, 40]
  - `q1` = text，`'{t} 本书平均分给 {g} 个班，每班几本？'`，size 26，at [400, 230]
  - `a1` = text，`'{t} ÷ {g} = [{e}](blank)（本）'`，size 32，at [400, 280]
  - `q2` = text，`'{t} 本书，每班 {e} 本，能分给几个班？'`，size 26，at [400, 340]，hidden
  - `a2` = text，`'{t} ÷ {e} = [{g}](blank)（个）'`，size 32，at [400, 390]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 读题 | {t} 本书平均分给 {g} 个班。 | 高亮 books；高亮 q1 | — |
| 2 | 每班几本 | 平均分，求每份几本，用除法。 | ‖ a1.text → `'{t} ÷ {g} = {e}（本）'` | choose 答案 {e}（min 2，max 20）“每班几本？” |
| 3 | 换个问法 | 每班 {e} 本，能分给几个班？ | 显示 q2；显示 a2 ‖ a2.text → `'{t} ÷ {e} = {g}（个）'` | choose 答案 {g}（min 2，max 9） |

- 要点：平均分求每份是多少，用除法；求一个数里有几个另一个数，也用除法

---

## 三年级下册

### `mult-2x2-oral` 两位数乘整十数的口算与估算
- 位置：三下 · `multiplication-2` · 随时
- 元信息：summary：12 × 20 先算 12 × 2，再在末尾添 0；估算看成整十数；tags [口算乘法, 两位数乘整十数, 估算]；cover “12×20”；related [mult-column, mult-2x2-area]
- 舞台：800 × 420；params `a: 12`、`b: 2`（乘 b 个十）；derived `p: a * b * 10`；explore a 滑块 11–40，b 滑块 2–9
- 零件：
  - `g` = grid，rows `{a}`，cols `{b * 10}`，cell 6，filled 0，at [40, 60]（每行 b×10 格，共 a 行，表示 a × b×10）
  - `eq1` = text，`'{a} × {b} = {a * b}'`，size 32，at [600, 120]
  - `eq2` = text，`'{a} × {b * 10} = [{p}](blank)'`，size 36，at [600, 200]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 先算 {a} × {b} | {a} × {b} = {a * b}。 | 高亮 eq1 | — |
| 2 | 乘 {b * 10} | {b * 10} 是 {b} 个十，积就是 {a * b} 个十。 | g.filled → {a * b * 10}（2s） ‖ eq2.text → `'{a} × {b * 10} = {p}'` | choose 答案 {p}（选项 {a * b}、{p}、{p * 10}）“{a} × {b * 10} 等于几？” |
| 3 | 估一估 | 估算时把两位数看成整十数：{a} 看成 {round(a / 10) * 10}。 | 高亮 eq2 | — |

- 要点：两位数乘整十数，先用两位数乘十位上的数，再在积的末尾添一个 0；估算时可以把两位数看成整十数

### `mult-2x2-area` 为什么竖式第二行要错一位
- 位置：三下 · `multiplication-2` · 随时
- 元信息：summary：第二行是十位上的数去乘，得的是几个十，所以末尾对齐十位；tags [两位数乘两位数, 竖式, 错位, 面积模型]；cover “14×12”；related [mult-column, mult-2x2-oral]；recommended
- 舞台：800 × 450；params `a: 14`、`b: 12`；derived `p1: a * (b % 10)`、`p2: a * (b - b % 10)`、`p: a * b`；explore a 滑块 11–19，b 滑块 11–19
- 零件：
  - `g` = grid，rows `{b}`，cols `{a}`，cell 18，filled 0，at [40, 40]
  - `cut` = line，from [36, `{40 + 10 * 18}`]，to [`{44 + a * 18}`, `{40 + 10 * 18}`]，dashed，color red，hidden（把 b 行分成 10 行和 b%10 行）
  - `calc` = column-calc，a `{a}`，b `{b}`，op ×，show 0，at [560, 200]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 方格长方形 | {a} × {b} 就是 {b} 行、每行 {a} 格的长方形。 | 高亮 g | — |
| 2 | 分成两块 | 把 {b} 行分成 {b % 10} 行和 10 行。 | 显示 cut | — |
| 3 | 第一块 | {b % 10} 行：{a} × {b % 10} = {p1}，是竖式第一行。 | 高亮 g.row.{b}（下面 b%10 行逐行高亮：重复 b%10 次 高亮 g.row.{10 + i}，together）；calc.show → 2（个位乘完） | — |
| 4 | 第二块 | 10 行：{a} × 10 = {p2}，竖式第二行写 {p2 / 10}，末尾的 0 不写，所以对着十位。 | 重复 10 次：高亮 g.row.{i}（together） ‖ calc.show → 4 | choose 答案 {p2}（选项 {p2 / 10}、{p2}、{p2 * 10}）“第二块一共几格？”；提示：10 行，每行 {a} 格。 |
| 5 | 合起来 | 两块合起来：{p1} + {p2} = {p}。 | calc.show → 99 | — |

- 说明：`calc.show → 99` 表示全部写出（超过总步数时显示全部，已有行为）；第 3、4 步的 `show` 值对应 column-calc 两位乘两位的小步：个位乘两步、十位乘两步——写配置时用 `columnCalcPlan` 核对，以它为准。
- 要点：用乘数十位上的数去乘，得的是几个十，所以积的末位要和十位对齐；两次乘得的积相加就是结果

### `div-column-zero` 商中间或末尾有 0 的除法
- 位置：三下 · `div-one-digit-2` · 3.2 · column-calc（÷）、E1、E2
- 元信息：summary：哪一位不够商 1，就商 0 占位；tags [除法, 商中间有0, 商末尾有0, 竖式]；cover “612÷3”；related [div-column-1, div-check]
- 舞台：800 × 450；params `a: 612`、`d: 3`；derived `q: floor(a / d)`；presets：`612 ÷ 3`（商 204）、`120 ÷ 4`（商 30）、`824 ÷ 4`（商 206）、`450 ÷ 5`（商 90）
- 零件：
  - `calc` = column-calc，a `{a}`，b `{d}`，op ÷，show 0，at [300, 220]
  - `res` = text，`'{a} ÷ {d} = [{q}](blank)'`，size 34，at [600, 400]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 写竖式 | {a} 除以 {d}，从最高位除起。 | 高亮 calc | — |
| 2（repeat `{len(q)}`） | 第 {i} 位商 | 这一位商 {digit(q, len(q) - i)}{sel(digit(q, len(q) - i) == 0, '，不够商 1 就商 0 占位', '')}。 | calc.show → {i * 4 - 3} ‖ calc.show → {i * 4 + 2} | choose 答案 {digit(q, len(q) - i)}（min 0，max 9）“这一位商几？”；提示：不够商 1 的时候商 0。 |
| 3 | 得数 | 所以 {a} ÷ {d} = {q}。 | ‖ res.text → `'{a} ÷ {d} = {q}'` | choose 答案 {q}（min 10，max 300） |

- 说明：商 0 时 column-calc 省略“乘、减”两小步（X2 规定），小步编号随之变化——写配置时用 `columnCalcPlan` 核对每个 preset 的 `show` 值，以它为准。
- 要点：除到哪一位不够商 1，就在那一位上商 0；商的末尾有 0 也不能漏写

### `div-estimate` 除法的估算
- 位置：三下 · `div-one-digit-2` · 3.1 · numberline（X4）
- 元信息：summary：把被除数看成接近的、能整除的整十整百数；tags [估算, 除法, 约等于]；cover “182÷3≈60”；related [mult-estimate]
- 舞台：800 × 380；params `a: 182`、`d: 3`、`ap: 180`；presets `{182, 3, 180}`、`{245, 6, 240}`、`{398, 4, 400}`、`{638, 8, 640}`
- 零件：
  - `line` = numberline，from `{ap - 20}`，to `{ap + 20}`，step 2，labelEvery 5，length 560，marks [`{a}`, `{ap}`]，at [120, 120]
  - `est` = text，`'{a} ÷ {d} ≈ [{ap / d}](blank)'`，size 40，at [400, 250]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 大约多少 | {a} ÷ {d} 大约是多少？ | 高亮 est | — |
| 2 | 找好算的数 | {a} 接近 {ap}，{ap} 正好能被 {d} 整除。 | 高亮 line | — |
| 3 | 估一估 | {ap} ÷ {d} = {ap / d}，所以大约是 {ap / d}。 | ‖ est.text → `'{a} ÷ {d} ≈ {ap / d}'` | choose 答案 {ap / d}（选项 `{ap / d}`、`{ap / d * 10}`、`{ap / d + 10}`） |

- 要点：除法估算，把被除数看成和它接近、又能被除数整除的整十或整百数

### `year-month-day` 年、月、日
- 位置：三下 · `ymd` · 3.3 · calendar、T1
- 元信息：summary：一年 12 个月，大月 31 天，小月 30 天，2 月特殊；tags [年月日, 大月, 小月, 日历]；cover “大月小月”；related [leap-year, elapsed-days]；recommended
- 舞台：800 × 450；params `y: 2026`
- 零件：
  - `cal` = calendar，year `{y}`，month all，show 0，at [60, 30]
  - `fist` = image asset fist-months（拳头记忆法示意图），width 220，height 160，at [620, 300]，hidden
  - `q` = text，`'大月有 [7](blank) 个'`，size 30，at [620, 120]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 12 个月 | 一年有 12 个月，每个月的天数不一样。 | cal.show → 12（4s） | — |
| 2 | 大月 | 31 天的是大月：1、3、5、7、8、10、12 月。 | 高亮 cal.month.1 ＋ cal.month.3 ＋ cal.month.5 ＋ cal.month.7 ＋ cal.month.8 ＋ cal.month.10 ＋ cal.month.12（together） | — |
| 3 | 小月 | 30 天的是小月：4、6、9、11 月。 | 高亮 cal.month.4 ＋ month.6 ＋ month.9 ＋ month.11 | — |
| 4 | 2 月 | 2 月特殊，{y} 年 2 月有 {sel(isLeap, '29', '28')} 天。 | 高亮 cal.month.2 | — |
| 5 | 拳头记 | 用拳头记：凸起的是大月，凹下的是小月。 | 显示 fist | — |
| 6 | 点一点 | 一共有 7 个大月。 | ‖ q.text → `'大月有 7 个'` | tap 答案 [cal.month.1, cal.month.3, cal.month.5, cal.month.7, cal.month.8, cal.month.10, cal.month.12]（可点 cal.month.*）“点出所有的大月。”；提示：31 天的就是大月。 |

- derived：`isLeap: (y % 4 == 0 && y % 100 != 0) || y % 400 == 0`。
- 要点：一年有 12 个月；1、3、5、7、8、10、12 月是大月，每月 31 天；4、6、9、11 月是小月，每月 30 天；2 月平年 28 天，闰年 29 天

### `leap-year` 平年和闰年
- 位置：三下 · `ymd` · 3.3 · calendar、numberline
- 元信息：summary：公历年份是 4 的倍数一般是闰年，整百年份要是 400 的倍数；tags [闰年, 平年, 2月29日]；cover “2月29日”；related [year-month-day]；recommended
- 舞台：800 × 420；params `y: 2024`；derived `leap: (y % 4 == 0 && y % 100 != 0) || y % 400 == 0`；explore y 滑块“年份” 1900–2100
- 零件：
  - `orbit` = text，`'地球绕太阳一圈 ≈ 365 天 5 时 48 分 46 秒'`，size 26，at [400, 50]
  - `years` = numberline，from 2021，to 2025，step 1，labelEvery 1，length 600，at [100, 160]
  - `acc` = text，`'每年多约 6 小时 × 4 = 约 1 天'`，size 26，at [400, 230]，hidden
  - `feb` = calendar，year `{y}`，month 2，cell 36，at [80, 270]
  - `ans` = text，`'{y} 年是 [{sel(leap, '闰年', '平年')}](blank)'`，size 32，at [580, 330]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 一年的时间 | 地球绕太阳一圈，大约是 365 天又将近 6 小时。 | 高亮 orbit | — |
| 2 | 攒出一天 | 每年多出将近 6 小时，4 年攒起来差不多一天。 | 重复 4 次：hop years 从 {2020 + i} 到 {2021 + i}；显示 acc | — |
| 3 | 2 月 29 日 | 多出的一天加在 2 月，这一年有 366 天，叫闰年。 | 高亮 feb | — |
| 4 | 怎么判断 | 年份是 4 的倍数一般是闰年；整百的年份要是 400 的倍数才是闰年。 | 高亮 ans | — |
| 5 | 判断一下 | {y} 年是{sel(leap, '闰年', '平年')}。 | ‖ ans.text → `'{y} 年是 {sel(leap, '闰年', '平年')}'` | choose 答案 `{sel(leap, '闰年', '平年')}`（选项 闰年 平年）“{y} 年是平年还是闰年？”；提示：{sel(y % 100 == 0, '整百的年份看能不能被 400 整除。', '看能不能被 4 整除。')} |

- 要点：平年 365 天，2 月 28 天；闰年 366 天，2 月 29 天；公历年份是 4 的倍数的一般是闰年，整百年份必须是 400 的倍数才是闰年

### `24-hour` 24 时计时法
- 位置：三下 · `ymd` · 3.3 · clock（X5 hour24）、numberline（X4 双刻度）
- 元信息：summary：一天 24 小时，下午几时就是“几 + 12”时；tags [24时计时法, 普通计时法, 时间]；cover “下午3时=15时”；related [elapsed-time, clock-basics]；recommended
- 舞台：800 × 420；params `h: 3`；explore h 滑块“下午几时” 1–11
- 零件：
  - `clk` = clock，time 0，hour24 true，radius 130，at [180, 210]
  - `day` = numberline，from 0，to 24，step 1，labelEvery 2，length 480，layers [{ labels: integer, step: 12 }]（第二行只标 0、12、24），pointer 0，at [300, 340]
  - `ans` = text，`'下午 {h} 时 = [{h + 12}](blank) 时'`，size 34，at [560, 120]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 一天两圈 | 一天里，时针在钟面上走两圈，共 24 小时。 | clk.time → 1440（6s，linear）＋ day.pointer → 24（6s，linear） | — |
| 2 | 第一圈 | 从半夜 0 时到中午 12 时，是第一圈。 | clk.time → 720 ＋ day.pointer → 12 | — |
| 3 | 第二圈 | 中午以后的第二圈，接着记作 13 时、14 时……24 时。 | 高亮 clk（外圈数字） | — |
| 4 | 下午 {h} 时 | 下午 {h} 时，就是 {h} + 12 = {h + 12} 时。 | clk.time → {(h + 12) * 60}（1.5s） ＋ day.pointer → {h + 12} ‖ ans.text → `'下午 {h} 时 = {h + 12} 时'` | choose 答案 {h + 12}（选项 {h}、{h + 12}、{h + 10}）“下午 {h} 时用 24 时计时法是几时？” |

- 要点：24 时计时法一天从 0 时到 24 时；下午和晚上的时刻，用“几时 + 12”表示

### `elapsed-days` 经过的天数
- 位置：三下 · `ymd` · 3.3 · calendar
- 元信息：summary：数经过的天数，跨月要看上个月有几天；tags [经过天数, 日历, 年月日]；cover “5.28→6.3”；related [year-month-day]
- 舞台：800 × 420；无参数（5 月 28 日到 6 月 3 日，首尾都算是 7 天）
- 零件：
  - `may` = calendar，year 2026，month 5，marks [[5, 28], [5, 29], [5, 30], [5, 31]]，cell 40，at [40, 40]
  - `jun` = calendar，year 2026，month 6，marks [[6, 1], [6, 2], [6, 3]]，cell 40，at [420, 40]
  - `eq` = text，`'4 + 3 = [7](blank)（天）'`，size 34，at [400, 380]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 去夏令营 | 从 5 月 28 日到 6 月 3 日，一共几天？ | 高亮 may.day.28；高亮 jun.day.3 | — |
| 2 | 5 月的几天 | 5 月是大月，有 31 天，5 月里有 28、29、30、31 日，4 天。 | 高亮 may | — |
| 3 | 6 月的几天 | 6 月里 1、2、3 日，3 天。 | 高亮 jun | — |
| 4 | 合起来 | 首尾都算，一共 7 天。 | ‖ eq.text → `'4 + 3 = 7（天）'` | choose 答案 7（选项 6 7 8）“一共几天？”；提示：28 日和 3 日都要算。 |

- 要点：计算经过的天数，要知道每个月有几天；开始和结束那天都算时，别漏数

### `decimal-intro` 一位小数的意义、读写
- 位置：三下 · `decimal-intro` · 3.3 · money、ruler、fraction-bar
- 元信息：summary：十分之几可以写成零点几；tags [小数, 一位小数, 十分之几, 小数点]；cover “0.3”；related [fraction-intro, decimal-meaning, money-intro]；recommended
- 舞台：800 × 420；params `k: 3`；explore k 滑块“几角” 1–9
- 零件：
  - `coins` = money，items [0.1 ×10]（写 10 个 0.1），layout row，size 0.9，show `{k}`，at [40, 60]
  - `bar` = fraction-bar，parts 10，take `{k}`，width 500，height 44，at [300, 170]
  - `r` = ruler，from 0，to 10，unit dm，length 500，at [50, 230]
  - `eq` = text，`'{k} 角 = [{k}/10](frac) 元 = [0.{k}](blank) 元'`，size 34，at [400, 360]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 1 元分 10 份 | 1 元 = 10 角，1 角是 1 元的十分之一。 | coins.show → 10（1.5s）；coins.show → {k}（0.8s） | — |
| 2 | 几角是几元 | {k} 角是十分之 {k} 元。 | 高亮 bar | — |
| 3 | 写成小数 | 十分之 {k} 元，也可以写成 0.{k} 元，读作零点{cn(k)}。 | ‖ eq.text → `'{k} 角 = [{k}/10](frac) 元 = 0.{k} 元'` | choose 答案 `0.{k}`（选项 `0.{k}`、`{k}.0`、`0.0{k}`）“{k} 角是多少元？” |
| 4 | 尺子上的小数 | 1 米分成 10 份，1 份是 1 分米，也就是 0.1 米。 | 高亮 r | — |

- 要点：十分之几可以写成一位小数；0.{k} 读作零点{cn(k)}；{k} 角 = 0.{k} 元

### `decimal-add-sub-1` 简单的小数加减
- 位置：三下 · `decimal-intro` · 3.2 · column-calc（X3 小数）
- 元信息：summary：元和元加、角和角加，就是小数点对齐；tags [小数加法, 小数减法, 小数点对齐]；cover “2.5+3.8”；related [decimal-intro, decimal-add-sub]
- 舞台：800 × 420；params `a: 2.5`、`b: 3.8`；presets `{2.5, 3.8}`、`{4.6, 1.2}`、`{0.7, 3.5}`
- 零件：
  - `calc` = column-calc，a `{a}`，b `{b}`，op +，decimals [1, 1]，show 0，at [300, 200]
  - `say` = text，`'{a} 元 + {b} 元 = [{a + b}](blank) 元'`，size 34，at [560, 360]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 买两样 | 一支笔 {a} 元，一个本子 {b} 元，一共多少元？ | 高亮 say | — |
| 2 | 对齐 | 元对着元，角对着角，就是小数点对齐。 | 高亮 calc | — |
| 3 | 先算角 | 先算十分位（角）。 | ‖ calc.show → 1 | choose 答案 {digit(a + b, -1)}（min 0，max 9）“十分位写几？”；提示：满十向个位进 1。 |
| 4 | 再算元 | 再算个位（元），点上小数点。 | calc.show → 3 ‖ say.text → `'{a} 元 + {b} 元 = {a + b} 元'` | choose 答案 {a + b}（选项 `{a + b}`、`{(a + b) * 10}`、`{a + b + 1}`） |

- 要点：小数加减，小数点要对齐；从低位算起，满十进一

### `directions-8` 认识东、南、西、北与八个方向
- 位置：三下 · `directions-8` · 3.4 · direction、T1、T2
- 元信息：summary：面向太阳升起的方向是东；地图上上北下南、左西右东；tags [方向, 东南西北, 东北, 西南, 地图]；cover “N”；related [route-description, clock-direction, direction-distance]；recommended
- 舞台：800 × 450；params `t: 2`（第几个地点作答）；presets：`{t: 2}`（东北）、`{t: 6}`（西南）
- 零件：
  - `rose` = direction，mode compass，radius 120，pointer 0，at [220, 230]，targets []
  - `map` = direction，mode compass，radius 150，showPointer false，at [580, 230]，targets [{ bearing: 0, distance: 150, asset: library, label: 图书馆 }, { bearing: 45, distance: 150, asset: park, label: 公园 }, { bearing: 90, distance: 150, asset: shop, label: 商店 }, { bearing: 135, distance: 150, asset: hospital, label: 医院 }, { bearing: 180, distance: 150, asset: school, label: 学校 }, { bearing: 225, distance: 150, asset: zoo, label: 动物园 }, { bearing: 270, distance: 150, asset: cinema, label: 电影院 }, { bearing: 315, distance: 150, asset: museum, label: 博物馆 }]，hidden
  - `sun` = image asset sun，width 60，height 60，at [380, 230]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 太阳升起的地方 | 早晨面向太阳，前面是东，后面是西。 | rose.pointer → 90（1s）；高亮 rose.dir.E | — |
| 2 | 左北右南 | 面向东，左手是北，右手是南。 | 高亮 rose.dir.N；高亮 rose.dir.S | — |
| 3 | 地图上的方向 | 地图上通常是上北、下南、左西、右东。 | rose.pointer → 0 | — |
| 4 | 中间的方向 | 东和北中间是东北，还有西北、东南、西南。 | 高亮 rose.dir.NE；rose.dir.NW；rose.dir.SE；rose.dir.SW | — |
| 5 | 找一找 | 在中心的东北方向是公园。 | 隐藏 sun；显示 map ‖ 高亮 map.target.2 | tap 答案 map.target.{t}（可点 map.target.*）“点出在中心{sel(t == 2, '东北', '西南')}方向的地方。”；提示：先找到{sel(t == 2, '东和北', '西和南')}，再看它们中间。 |
| 6 | 转一转 | 把指针转到西南。 | 隐藏 map ‖ rose.pointer → 225 | turn rose.pointer 到 225（容差 0，步长 45）“把指针转到西南方向。” |

- 说明：第 5 步讲解随 preset 不同：讲解写 `在中心的{sel(t == 2, '东北', '西南')}方向是{sel(t == 2, '公园', '动物园')}。`，画面 `高亮 map.target.{t}`。
- 要点：早晨面向太阳，前东后西、左北右南；地图上一般上北下南、左西右东；东北、西北、东南、西南在两个方向的中间

### `route-description` 描述简单路线
- 位置：三下 · `directions-8` · 3.4 · coordinate-grid、path、E6
- 元信息：summary：说清楚从哪里出发、向哪个方向走、走多远、到哪里；tags [路线, 方向, 位置]；cover “路线图”；related [directions-8, direction-distance]
- 舞台：800 × 450；无参数
- 零件：
  - `grid` = coordinate-grid，cols 12，rows 8，cell 50，origin top-left，color line，at [100, 30]
  - 地点 `home` asset home at [150, 380]；`shop` asset shop at [350, 380]；`park` asset park at [350, 180]；`school` asset school at [650, 180]（image，width 60）
  - `route` = path，points [[150, 380], [350, 380], [350, 180], [650, 180]]，draw 0，width 6，lengths ['200 米', '200 米', '300 米']
  - `kid` = image asset kid-walk，width 40，height 40，at [150, 380]
  - `n` = direction，mode compass，radius 40，showPointer false，at [740, 70]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 上学的路 | 小明从家去学校，怎么走？ | 高亮 home；高亮 school；高亮 n | — |
| 2 | 第一段 | 从家向东走 200 米到商店。 | kid 沿 route 走（只走第一段：follow path [[150,380],[350,380]]，draw 同步——draw 设到 0.29） | — |
| 3 | 第二段 | 再向北走 200 米到公园。 | ‖ kid 沿 [[350,380],[350,180]] 走 ＋ route.draw → 0.57 | choose 答案 北（选项 东 南 西 北）“从商店到公园，向哪个方向走？”；提示：地图上往上是北。 |
| 4 | 第三段 | 最后向东走 300 米到学校。 | kid 沿 [[350,180],[650,180]] 走 ＋ route.draw → 1 | — |
| 5 | 回家 | 放学回家，方向都反过来：先向西，再向南，再向西。 | 高亮 route | — |

- 说明：draw 比例按路程长度算：200 / 700 ≈ 0.29，400 / 700 ≈ 0.57。
- 要点：描述路线要说清：从哪里出发，向什么方向走，走多远，到达哪里；回来时方向相反

### `area-meaning` 面积的含义与比较
- 位置：三下 · `area` · 3.4 · grid、polygon
- 元信息：summary：物体表面或封闭图形的大小，就是面积；不好比时数方格；tags [面积, 比较面积, 数方格]；cover “面积”；related [perimeter-meaning, area-units, rect-area]；recommended
- 舞台：800 × 420；无参数
- 零件：
  - `a` = polygon，points [[80, 100], [320, 100], [320, 220], [80, 220]]，color blue（6 × 3 格，1 格 = 40）
  - `b` = polygon，points [[440, 60], [640, 60], [640, 260], [440, 260]]，color orange（5 × 5 格）
  - `ga` = grid，rows 3，cols 6，cell 40，filled 0，at [80, 100]，hidden
  - `gb` = grid，rows 5，cols 5，cell 40，filled 0，at [440, 60]，hidden
  - `tip` = text，`'周长一样，面积可以不一样'`，size 26，at [400, 380]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 摸一摸 | 黑板面比课本封面大，表面的大小就是面积。 | 高亮 a；高亮 b | — |
| 2 | 哪个大 | 这两个图形，哪个面积大？重叠也比不出来。 | b 移到 by [−360, 40]；b 移到 by [360, −40] | — |
| 3 | 数方格 | 用同样大的方格去铺，再数一数。 | 显示 ga；显示 gb；ga.filled → 18 ＋ gb.filled → 25 | — |
| 4 | 比较 | 蓝色 18 格，橙色 25 格，橙色的面积大。 | ‖ — | choose 答案 橙色（选项 蓝色 橙色）“哪个面积大？” |
| 5 | 周长和面积 | 蓝色周长 18 格，橙色周长 20 格；周长和面积是两回事。 | 显示 tip | — |

- 要点：物体表面或封闭图形的大小，叫作它们的面积；比较面积可以用同样大的方格来数

### `area-units` 常用面积单位
- 位置：三下 · `area` · 随时
- 元信息：summary：边长 1 厘米的正方形面积是 1 平方厘米；tags [面积单位, 平方厘米, 平方分米, 平方米]；cover “1cm²”；related [area-meaning, area-unit-convert]
- 舞台：800 × 420；无参数
- 零件：
  - `cm` = shape rect，width 40，height 40，color blue，at [100, 200]；`cml` = label，`'1 cm[2](sup)'`，at [100, 260]
  - `dm` = shape rect，width 160，height 160，color orange，at [320, 200]；`dml` = label，`'1 dm[2](sup)'`，at [320, 310]
  - `m` = text，`'1 m[2](sup)：边长 1 米的正方形，能站下 8–10 个同学'`，size 26，at [560, 200]
  - `q` = text，`'课桌面大约 [24](blank) dm[2](sup)'`，size 28，at [400, 380]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 平方厘米 | 边长 1 厘米的正方形，面积是 1 平方厘米，大约一个指甲盖。 | 高亮 cm；高亮 cml | — |
| 2 | 平方分米 | 边长 1 分米的正方形，面积是 1 平方分米，大约一个手掌。 | 高亮 dm；高亮 dml | — |
| 3 | 平方米 | 边长 1 米的正方形，面积是 1 平方米。 | 高亮 m | — |
| 4 | 选单位 | 课桌面用平方分米合适，大约 24 平方分米。 | ‖ q.text → `'课桌面大约 24 dm[2](sup)'` | choose 答案 平方分米（选项 平方厘米 平方分米 平方米）“课桌面的面积用什么单位合适？” |

- 要点：常用的面积单位有平方厘米、平方分米、平方米；边长 1 厘米的正方形面积是 1 平方厘米，其余同理

### `area-unit-convert` 面积单位换算
- 位置：三下 · `area` · 随时
- 元信息：summary：1 平方分米 = 100 平方厘米，面积单位进率是 100；tags [面积单位换算, 进率, 平方分米, 平方厘米]；cover “1dm²=100cm²”；related [area-units, rect-area]；recommended
- 舞台：800 × 420；无参数
- 零件：
  - `g` = grid，rows 10，cols 10，cell 30，filled 0，at [60, 50]
  - `row` = text，`'一行 10 个 1 cm[2](sup)'`，size 26，at [560, 100]，hidden
  - `eq` = text，`'1 dm[2](sup) = [100](blank) cm[2](sup)'`，size 36，at [560, 200]
  - `cmp` = text，`'长度进率 10，面积进率 10 × 10 = 100'`，size 24，at [560, 300]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 1 平方分米 | 边长 1 分米，也就是 10 厘米的正方形。 | 高亮 g | — |
| 2 | 铺一行 | 一行能铺 10 个 1 平方厘米。 | g.filled → 10（1s）；显示 row | — |
| 3 | 铺满 | 能铺 10 行，10 × 10 = 100 个。 | ‖ g.filled → 100（2s） ＋ eq.text → `'1 dm[2](sup) = 100 cm[2](sup)'` | choose 答案 100（选项 10 100 1000）“1 平方分米等于多少平方厘米？”；提示：一行 10 个，有 10 行。 |
| 4 | 为什么是 100 | 长度是 10 倍，面积是 10 × 10 = 100 倍；1 平方米 = 100 平方分米也一样。 | 显示 cmp | — |

- 要点：1 平方分米 = 100 平方厘米；1 平方米 = 100 平方分米；相邻两个面积单位的进率是 100

### `data-analysis-1` 复式统计表
- 位置：三下 · `average` · 3.5 · table
- 元信息：summary：两张单式表合成一张复式表，比较更方便；tags [复式统计表, 统计表, 数据分析]；cover “复式表”；related [survey-table, bar-chart]
- 舞台：800 × 420；无参数
- 零件：
  - `t1` = table，rows [[三(1)班, 跳绳, 踢毽, 跑步], [人数, 12, 8, 15]]，headerCol true，colWidth 90，at [40, 50]
  - `t2` = table，rows [[三(2)班, 跳绳, 踢毽, 跑步], [人数, 10, 13, 11]]，headerCol true，colWidth 90，at [440, 50]
  - `t3` = table，rows [['', 跳绳, 踢毽, 跑步], [三(1)班, 12, 8, 15], [三(2)班, 10, 13, 11]]，diagonal [项目, 班级]，headerCol true，colWidth 100，at [200, 200]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 两张表 | 两个班各有一张统计表。 | 高亮 t1；高亮 t2 | — |
| 2 | 合成一张 | 把两张表合成一张，叫复式统计表。 | t1.opacity → 0.2 ＋ t2.opacity → 0.2；显示 t3 | — |
| 3 | 读表头 | 左上角斜线：右上写项目，左下写班级。 | 高亮 t3.cell.1.1 | — |
| 4 | 比一比 | 喜欢踢毽的，三(2)班多 5 人。 | 高亮 t3.col.3 ‖ — | choose 答案 5（min 1，max 9）“喜欢踢毽的，三(2)班比三(1)班多几人？” |

- 要点：复式统计表能把几组数据放在一起比较；读表时先看表头的项目和类别

### `average-meaning` 平均数的意义与计算
- 位置：三下 · `average` · 3.5 · chart（bar + average）、counters
- 元信息：summary：移多补少，让每份一样多，这个数就是平均数；tags [平均数, 移多补少, 先合后分]；cover “平均数”；related [average-apply, data-analysis-1]；recommended
- 舞台：800 × 450；params `x1: 7`、`x2: 4`、`x3: 6`、`x4: 3`；derived `avg: (x1 + x2 + x3 + x4) / 4`；presets：`{7,4,6,3}`（平均 5）、`{9,5,6,8}`（平均 7）、`{2,6,4,4}`（平均 4）
- 零件：
  - `s1`…`s4` = counters，count 分别 `{x1}`、`{x2}`、`{x3}`、`{x4}`，layout column，shape square，size 32，color blue，at [80 / 170 / 260 / 350, `{400 - x1 * 32}` / `{400 - x2 * 32}` / `{400 - x3 * 32}` / `{400 - x4 * 32}`]
  - `line` = line，from [60, `{400 - avg * 32}`]，to [420, `{400 - avg * 32}`]，dashed，color accent，hidden
  - `eq` = expr-steps，lines [`'({x1} + {x2} + {x3} + {x4}) ÷ 4'`, `'{x1 + x2 + x3 + x4} ÷ 4'`, `'{avg}'`]，show 0，at [480, 120]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 四个人收集瓶子 | 四个人收集的瓶子：{x1}、{x2}、{x3}、{x4} 个，不一样多。 | 高亮 s1；s2；s3；s4 | — |
| 2a（when `{x1 == 7 && x2 == 4}`） | 移多补少 | 从多的拿给少的，直到一样多。 | 显示 line；从 s1 拆 2 个为 m1；m1 移到 s4；从 s3 拆 1 个为 m2；m2 移到 s2 | — |
| 2b（when `{x1 == 9}`） | 移多补少 | 从多的拿给少的，直到一样多。 | 显示 line；从 s1 拆 2 个为 m1；m1 移到 s2；从 s4 拆 1 个为 m2；m2 移到 s3 | — |
| 2c（when `{x1 == 2}`） | 移多补少 | 从多的拿给少的，直到一样多。 | 显示 line；从 s2 拆 2 个为 m1；m1 移到 s1 | — |
| 3 | 一样多了 | 每人都是 {avg} 个，{avg} 就是平均数。 | ‖ 高亮 line | choose 答案 {avg}（min 1，max 9）“现在每摞有几个？” |
| 4 | 先合后分 | 也可以先合起来，再平均分：({x1} + {x2} + {x3} + {x4}) ÷ 4 = {avg}。 | eq.show → 3（2s） | — |
| 5 | 平均数的位置 | 平均数在最大数和最小数之间。 | 高亮 line | — |

- 说明：三组数据的移动方式不同，用三个带 `when` 的步骤分别写（每次只有一个出现）；`move` 计数块到另一摞时会飞进它的空位并合并（已有能力），column 布局从上往下排，所以写配置时把每摞的 at 设在“顶端”，并让 4 摞的底端对齐在 y = 400。
- 要点：平均数可以用“移多补少”找到；也可以先求总数，再除以份数；平均数在最大数和最小数之间
