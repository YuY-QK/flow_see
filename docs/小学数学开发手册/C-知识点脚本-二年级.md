# C · 知识点脚本 · 二年级（25 个）

> 格式和记号见 [README 第 6 节](./README.md#6-知识点脚本c-文件的格式)。已上线的 `mult-meaning`、`break-ten`、`divide-equal` 不在本文件。
> 竖式零件 `column-calc` 的 `show`：每加 1 写出一步（加减法每一位一步，含进位 / 退位的标记；除法每一位四小步，见 A 文件 X1–X2）。

---

## 二年级上册

### `column-add-100` 进位加法竖式
- 位置：二上 · `add-within-100` · 3.1 · column-calc（+）、base-ten、E2
- 元信息：summary：个位满十，向十位进 1，十位相加时加上进位；tags [竖式, 进位加法, 笔算, 两位数加法]；cover “38+45”；related [column-intro, two-digit-add, column-sub-100]；recommended
- 舞台：800 × 420；params `a: 38`、`b: 45`；derived `a0: a % 10`、`b0: b % 10`、`a1: floor(a / 10)`、`b1: floor(b / 10)`、`c: a0 + b0 >= 10`、`s0: (a0 + b0) % 10`、`s1: a1 + b1 + c`、`s: a + b`；explore a 滑块 11–89，b 滑块 11–`99 - a`
- 零件：
  - `x` = base-ten，tens `{a1}`，ones `{a0}`，columns true，at [40, 50]
  - `y` = base-ten，tens `{b1}`，ones `{b0}`，columns true，color orange，at [40, 230]
  - `calc` = column-calc，a `{a}`，b `{b}`，op +，show 0，blank []，at [620, 190]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 列竖式 | {a} 加 {b}，相同数位对齐。 | 高亮 calc | — |
| 2 | 个位相加 | 个位 {a0} 加 {b0} 等于 {a0 + b0}。 | 高亮 x.ones ＋ 高亮 y.ones；calc.blank → [r2c0] ‖ calc.show → 1 ＋ calc.blank → [] | choose 答案 {s0}（min 0，max 9）“个位上写几？”；提示：{sel(c, '满十了，写个位上的数。', '直接写和。')} |
| 3（when `{c}`） | 满十进一 | 满十进一：10 根捆成一捆，送到十位，竖式上记一个小 1。 | x.ones → {a0 + b0 - 10} ＋ x.tens → {a1 + 1} ＋ y.ones → 0 | — |
| 4 | 十位相加 | 十位 {a1} 加 {b1}{sel(c, '，再加进上来的 1', '')}，等于 {s1}。 | 高亮 x.tens ＋ 高亮 y.tens ‖ calc.show → 2 | choose 答案 {s1}（min 1，max 9）“十位上写几？”；提示：别忘了加进位的 1。 |
| 5 | 得数 | 所以 {a} + {b} = {s}。 | 高亮 calc | — |

- 说明：column-calc 加法的第 1 步本身就画出进位小 1（已有能力）；第 3 步只是让小棒同步。
- 要点：相同数位对齐，从个位加起；个位满十，向十位进 1；十位相加时，别忘了加进位的 1

### `column-sub-100` 退位减法竖式
- 位置：二上 · `subtract-within-100` · 3.1 · column-calc（−，X1）、base-ten、E2
- 元信息：summary：个位不够减，从十位退 1 当 10；tags [竖式, 退位减法, 笔算, 退位点]；cover “52−27”；related [break-ten, column-add-100]；recommended
- 舞台：800 × 420；params `a: 52`、`b: 27`；derived `a0: a % 10`、`b0: b % 10`、`a1: floor(a / 10)`、`b1: floor(b / 10)`、`br: a0 < b0`、`r0: a0 + 10 * br - b0`、`r1: a1 - br - b1`、`r: a - b`；explore a 滑块 20–99，b 滑块 11–`a - 1`
- 零件：
  - `x` = base-ten，tens `{a1}`，ones `{a0}`，columns true，at [40, 70]
  - `calc` = column-calc，a `{a}`，b `{b}`，op −，show 0，at [620, 190]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 列竖式 | {a} 减 {b}，相同数位对齐，从个位减起。 | 高亮 calc | — |
| 2（when `{br}`） | 个位不够减 | 个位 {a0} 减 {b0} 不够减，从十位退 1 当 10。 | 高亮 x.ones；x.tens → {a1 - 1} ＋ x.ones → {a0 + 10}（拆捆） | — |
| 3 | 个位相减 | 个位 {a0 + 10 * br} 减 {b0} 等于 {r0}。 | calc.blank → [r2c0] ‖ calc.show → 1 ＋ calc.blank → []；x.ones → {r0} | choose 答案 {r0}（min 0，max 9）“个位上写几？”；提示：个位不够减时，十位退 1 当 10。 |
| 4 | 十位相减 | 十位剩下 {a1 - br}，减 {b1} 等于 {r1}。 | ‖ calc.show → 2；x.tens → {r1} | choose 答案 {r1}（min 0，max 9）“十位上写几？”；提示：十位已经退走 1 了。 |
| 5 | 得数 | 所以 {a} − {b} = {r}。 | 高亮 calc | — |

- 说明：不退位时（br = 0）第 2 步自动去掉，第 4 步“十位剩下”的就是原来的十位数，讲解同样成立。
- 要点：相同数位对齐，从个位减起；个位不够减，从十位退 1，在个位上加 10 再减；十位上的数要先减去退走的 1

### `times-table-2-5` 2～5 的乘法口诀
- 位置：二上 · `multiplication-1` · 3.2 · table
- 元信息：summary：每多一行就多几个，口诀一句一句编出来；tags [乘法口诀, 2的口诀, 5的口诀, 表内乘法]；cover “二三得六”；related [mult-meaning, times-table-6-9]
- 舞台：800 × 450；params `n: 4`、`k: 6`；derived `p: n * k`；explore n 按钮组“几的口诀” 2 / 3 / 4 / 5，k 滑块“问第几句” 2–9
- 零件：
  - `dots` = counters，count `{n}`，layout grid，cols `{n}`，size 30，color blue，at [40, 40]（一行 n 个；逐步增加 count）
  - `tbl` = table，rows 共 9 行、每行一格：第 k 行是 `'{k} × {n} = {k * n}'`（k = 1…9，写配置时写出 9 行，例如第 3 行 `['3 × {n} = {3 * n}']`），header false，colWidth 220，rowHeight 36，size 22，show 1，at [520, 30]
  - `q` = text，`'{k} × {n} = [{p}](blank)'`，size 40，at [260, 400]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 一行几个 | 每行 {n} 个，1 行是 {n} 个。 | 高亮 dots | — |
| 2 | 一行一行加 | 每多一行，就多 {n} 个。 | 重复 8 次：dots.count → {(i + 1) * n}（0.5s） ＋ tbl.show → {i + 1} | — |
| 3 | 编口诀 | 一句算式编一句口诀，从小到大背。 | 高亮 tbl | — |
| 4 | 考考你 | {k} 个 {n} 是 {p}。 | 显示 q；高亮 tbl.row.{k} ‖ q.text → `'{k} × {n} = {p}'` | choose 答案 {p}（min {n}，max {9 * n}）“{k} × {n} 等于几？”；提示：从 {k - 1} × {n} = {(k - 1) * n} 再加 {n}。 |
| 5（when `{n == 5}`） | 5 的规律 | 5 的口诀，积的个位不是 5 就是 0。 | 高亮 tbl | — |

- 要点：几个几相加，可以用乘法口诀算；每多一个 {n}，积就多 {n}；口诀可以从前一句推出后一句

### `times-table-6-9` 6～9 的乘法口诀
- 位置：二上 · `multiplication-2-table` · 3.2 · table
- 元信息：summary：用记得的口诀推出新口诀；tags [乘法口诀, 7的口诀, 9的口诀, 表内乘法]；cover “七六四十二”；related [times-table-2-5, times-table-map]；recommended
- 舞台：800 × 450；params `n: 7`、`k: 6`；derived `p: n * k`、`q: (k - 1) * n`；explore n 按钮组 6 / 7 / 8 / 9，k 滑块 2–9
- 零件：
  - `dots` = counters，count `{q}`，layout grid，cols `{n}`，size 26，color blue，at [40, 40]
  - `extra` = counters，count `{n}`，layout row，size 26，color orange，at [40, `{40 + (k - 1) * 30}`]，hidden
  - `known` = text，`'{k - 1} × {n} = {q}'`，size 36，at [580, 80]
  - `ask` = text，`'{k} × {n} = [{p}](blank)'`，size 40，at [580, 170]
  - `nine` = text，`'9 的口诀：积的十位 + 个位 = 9'`，size 26，at [560, 300]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 记得的口诀 | {k - 1} 个 {n} 是 {q}，这句我们记得。 | 高亮 dots；高亮 known | — |
| 2 | 再多一行 | {k} 个 {n}，就是再多一行 {n} 个。 | 显示 extra；高亮 extra | — |
| 3 | 推出新口诀 | {q} 加 {n} 等于 {p}，所以 {k} × {n} = {p}。 | 高亮 ask ‖ ask.text → `'{k} × {n} = {p}'` | choose 答案 {p}（min {n * 2}，max {n * 9}）“{k} × {n} 等于几？”；提示：{q} 再加 {n}。 |
| 4（when `{n == 9}`） | 9 的规律 | 9 的口诀，积的十位和个位加起来是 9。 | 显示 nine | — |

- 要点：不会的口诀，可以用前一句口诀再加一个几推出来；9 的口诀里，积的两位数字加起来是 9

### `times-table-map` 乘法口诀表的规律
- 位置：二上 · `multiplication-2-table` · 3.2 · table、T1
- 元信息：summary：口诀表左右对称，横着看每格多一个因数；tags [乘法口诀表, 规律, 对称]；cover “九九表”；related [times-table-6-9]
- 舞台：800 × 450；params `a: 3`、`b: 7`；derived `p: a * b`；explore a 滑块 1–9，b 滑块 `a`–9
- 零件：
  - `tbl` = table，9 行：第 r 行有 r 个单元格 `'c × r = c * r'`（c = 1..r）——表格写成 9 × 9 的 `rows`，r 行 c 列（c ≤ r）文字 `'{c}×{r}={c * r}'`，c > r 的格子写空字符串；header false，colWidth 80，rowHeight 40，size 16，at [40, 40]（**完整 rows 由写配置的人按此规则写出 9 行**）
  - `ask` = text，`'{a} × {b} = [{p}](blank)'`，size 36，at [600, 420]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 口诀表 | 把 81 句里不重复的 45 句排成一张表。 | 高亮 tbl | — |
| 2 | 横着看 | 横着看，每往右一格，第一个数多 1。 | 高亮 tbl.row.6 | — |
| 3 | 竖着看 | 竖着看，每往下一格，积多一个这一列的数。 | 高亮 tbl.col.3 | — |
| 4 | 斜着看 | 斜着的这一条，两个数一样：1×1、2×2……9×9。 | 重复 9 次：高亮 tbl.cell.{i}.{i}（together） | — |
| 5 | 找一找 | {a} × {b} 在第 {b} 行第 {a} 格。 | 显示 ask ‖ 高亮 tbl.cell.{b}.{a} ＋ ask.text → `'{a} × {b} = {p}'` | tap 答案 tbl.cell.{b}.{a}（可点 tbl.cell.*）“在表里点出 {a} × {b}。”；提示：先找第 {b} 行。 |

- 要点：乘法口诀表横着看、竖着看、斜着看都有规律；两个因数交换位置积不变，所以表里只写一半

### `divide-by-table` 用乘法口诀求商
- 位置：二上 · `division-1` · 随时
- 元信息：summary：求商时想乘法口诀；tags [表内除法, 用口诀求商, 乘除关系]；cover “12÷3”；related [divide-equal, times-table-2-5]
- 舞台：800 × 400；params `d: 3`、`q: 4`；derived `t: d * q`；explore d 滑块“除数” 2–9，q 滑块“商” 2–9
- 零件：
  - `dots` = counters，count `{t}`，layout grid，cols `{d}`，size 34，color blue，at [60, 50]
  - `div` = text，`'{t} ÷ {d} = [{q}](blank)'`，size 44，at [600, 120]
  - `rhyme` = text，`'想：[?](blank) × {d} = {t}'`，size 36，at [600, 210]
  - `two` = text，`'{q} × {d} = {t}　{t} ÷ {q} = {d}'`，size 30，at [600, 300]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 提出问题 | {t} 个圆片，每行 {d} 个，能排几行？ | 高亮 dots；高亮 div | — |
| 2 | 想口诀 | 想：几乘 {d} 等于 {t}？ | 高亮 rhyme ‖ rhyme.text → `'想：{q} × {d} = {t}'` | choose 答案 {q}（min 1，max 9）“几乘 {d} 等于 {t}？”；提示：背一背 {d} 的口诀。 |
| 3 | 得出商 | 所以 {t} ÷ {d} = {q}，排 {q} 行。 | div.text → `'{t} ÷ {d} = {q}'`；高亮 dots | — |
| 4 | 一图三式 | 一个点阵，能写一道乘法、两道除法。 | 显示 two | — |

- 要点：用乘法口诀求商：想“几乘除数等于被除数”；乘法和除法互相联系

### `division-two-meanings` 除法的两种分法
- 位置：二上 · `division-1` · 随时
- 元信息：summary：平均分成几份、每几个一份，都用除法；tags [除法, 平均分, 包含除, 等分除]；cover “12÷4”；related [divide-equal, divide-by-table]
- 舞台：800 × 450；params `t: 12`、`g: 4`；derived `e: t / g`；presets `{12, 4}`、`{12, 3}`、`{15, 5}`、`{18, 6}`
- 零件：
  - `pool` = counters，count `{t}`，layout grid，cols 6，size 34，color orange，at [40, 40]
  - `p{i}`（repeat `{g}`）= counters，count 0，layout grid，cols 3，capacity `{e}`，size 30，at [`{40 + (i - 1) * 180}`, 220]
  - `eq1` = text，`'{t} ÷ {g} = [{e}](blank)'`，size 36，at [620, 70]
  - `eq2` = text，`'{t} ÷ {e} = [{g}](blank)'`，size 36，at [620, 380]，hidden
  - `pool2` = counters，count `{t}`，layout row，size 30，color green，at [40, 330]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 平均分成 {g} 份 | {t} 个平均分成 {g} 份，每份几个？ | 高亮 pool | — |
| 2 | 一个一个分 | 一个一个轮流分，每份分到 {e} 个。 | ‖ pool 一个一个分到 [p1…p{g}]（count {t}） | drag pool → [p1…p{g}] ×{t}（each {e}）“把圆片一个一个分到盘子里。”；提示：每个盘子轮流放一个。 |
| 3 | 写算式 | {t} ÷ {g} = {e}。 | ‖ eq1.text → `'{t} ÷ {g} = {e}'` | choose 答案 {e}（min 1，max 9）“每份几个？” |
| 4 | 每 {e} 个一份 | 换个分法：每 {e} 个一份，能分几份？ | 显示 pool2；显示 eq2；重复 g 次：从 pool2 拆 {e} 个为 grp{i}（offset [`{(i - 1) * 20}`, 50]） | — |
| 5 | 也是除法 | 能分 {g} 份，{t} ÷ {e} = {g}。 | ‖ eq2.text → `'{t} ÷ {e} = {g}'` | choose 答案 {g}（min 1，max 9）“能分几份？” |

- 要点：把一些东西平均分成几份，求每份几个，用除法；每几个一份，求能分几份，也用除法

### `money-shopping-2` 复杂购物：总价、够不够、怎样付
- 位置：二上 · `money-2` · 3.3 · money、T5
- 元信息：summary：先估一估够不够，再算总价和找零；tags [购物, 总价, 估算, 找零, 人民币]；cover “够不够”；related [money-shopping-1]
- 舞台：800 × 420；params `p1: 28`、`p2: 45`；derived `s: p1 + p2`、`back: 100 - s`；explore p1 滑块“书包” 15–49，p2 滑块“文具盒” 15–49
- 零件：
  - `g1` = image asset schoolbag，width 120，height 110，at [130, 110]；`t1` = label，`'{p1} 元'`，at [130, 200]
  - `g2` = image asset pencil-box，width 120，height 80，at [330, 110]；`t2` = label，`'{p2} 元'`，at [330, 200]
  - `wallet` = money，items ['100n']，at [560, 90]
  - `est` = text，`'{p1} ≈ {round(p1 / 10) * 10}　{p2} ≈ {round(p2 / 10) * 10}'`，size 30，at [240, 280]，hidden
  - `eq` = expr-steps，lines [`'100 − {p1} − {p2}'`, `'{100 - p1} − {p2}'`, `'{back}'`]，show 0，at [220, 340]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 带 100 元 | 带 100 元，买书包和文具盒，够吗？ | 高亮 wallet；高亮 t1 ＋ 高亮 t2 | — |
| 2 | 估一估 | 看成整十数估一估：大约 {round(p1 / 10) * 10 + round(p2 / 10) * 10} 元，不到 100，够了。 | 显示 est | — |
| 3 | 算总价 | 一共 {s} 元。 | ‖ — | choose 答案 {s}（min 30，max 98）“一共多少元？”；提示：{p1} + {p2}。 |
| 4 | 找回多少 | 100 元减去两样东西的价钱，找回 {back} 元。 | eq.show → 2 ‖ eq.show → 3 | choose 答案 {back}（min 1，max 70）“找回多少元？” |

- 要点：买东西先估一估钱够不够；总价 = 各样东西的价钱相加；找回的钱 = 付的钱 − 总价

### `angle-intro` 角的初步认识
- 位置：二上 · `angle-intro` · 3.4 · angle、T2
- 元信息：summary：角有一个顶点两条边，大小和边长无关；比直角小是锐角，大是钝角；tags [角, 直角, 锐角, 钝角, 顶点]；cover “∠”；related [line-ray-segment, protractor-use]；recommended
- 舞台：800 × 420；params `g: 60`；explore g 滑块“角的大小” 30–150（步长 15）
- 零件：
  - `ang` = angle，from 0，size `{g}`，length 160，arc true，at [200, 300]
  - `name` = label，`'角'`，at [200, 340]
  - `tri` = image asset set-square（三角尺），width 140，height 140，at [560, 220]，hidden
  - `right` = angle，from 0，size 90，length 140，kindLabel true，at [500, 330]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 认识角 | 角有一个顶点，两条边。 | 高亮 ang.vertex；高亮 ang.side1 ＋ 高亮 ang.side2 | — |
| 2 | 张口变大 | 两条边张得越开，角越大。 | ang.size → 120（1s）；ang.size → {g}（1s） | — |
| 3 | 边长不影响 | 把边画长，角的大小不变。 | ang.length → 240（1s）；高亮 ang | — |
| 4 | 直角 | 三角尺上有一个直角。 | 显示 tri；显示 right | — |
| 5 | 开到直角 | 把角开到直角。 | ‖ ang.size → 90 | turn ang.size 到 90（容差 0，步长 15）“拖动角的一条边，把它变成直角。”；提示：和三角尺的直角一样大。 |
| 6 | 锐角和钝角 | 比直角小的是锐角，比直角大的是钝角。 | ang.size → 45；ang.kindLabel → true；ang.size → 135 | — |

- 要点：角有一个顶点和两条边；角的大小和边张开的大小有关，和边的长短无关；比直角小的是锐角，比直角大的是钝角

### `tangram` 七巧板
- 位置：二上 · `tangram-shapes` · 3.4 · polygon、E4、T4
- 元信息：summary：七块拼成正方形，也能拼出别的图形；tags [七巧板, 拼图, 平面图形, 三角形]；cover “七巧板”；related [shapes-compose]
- 舞台：800 × 450；无参数
- 零件（边长 240 的正方形，左上角在 [100, 80]；这是七巧板的标准分法）：
  - `big1` = polygon，points [[100, 80], [340, 80], [220, 200]]，color red
  - `big2` = polygon，points [[100, 80], [220, 200], [100, 320]]，color orange
  - `mid` = polygon，points [[340, 200], [340, 320], [220, 320]]，color yellow
  - `small1` = polygon，points [[280, 140], [340, 80], [340, 200]]，color green
  - `sq` = polygon，points [[220, 200], [280, 140], [340, 200], [280, 260]]，color blue
  - `small2` = polygon，points [[160, 260], [220, 200], [280, 260]]，color purple
  - `para` = polygon，points [[100, 320], [160, 260], [280, 260], [220, 320]]，color pink
  - `goal` = polygon，points [[520, 140], [640, 140], [640, 260], [520, 260]]，dashed，fill false，hidden（拼正方形的目标）

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 七块板 | 一个正方形分成七块，就是七巧板。 | 依次高亮 big1、big2、mid、small1、sq、small2、para | — |
| 2 | 拆开 | 把它们拆开看看：5 个三角形、1 个正方形、1 个平行四边形。 | big1.points → 各自外移 40 像素（每块 set points，同时进行） | — |
| 3 | 两个小三角形 | 两个小三角形，能拼成一个正方形。 | 显示 goal；small1.points → [[520, 140], [640, 140], [640, 260]] ‖ small2.points → [[520, 140], [640, 260], [520, 260]] | place small2 到 goal 的左下半（to = [560, 220]，转 −45，showGoal）“把紫色小三角形拼进来，拼成正方形。”；提示：转一转，斜边贴着斜边。 |
| 4 | 小的拼出大的 | 两个小三角形也能拼成中三角形那么大。 | 高亮 mid | — |
| 5 | 拼回去 | 七块拼回去，又是一个大正方形。 | 隐藏 goal；七块 points 都回到“零件”里的初始坐标（同时） | — |

- 说明：第 2 步每块外移方向 = 该块重心相对正方形中心 [220, 200] 的方向；写配置时直接写出外移后的坐标（每块各加同一个偏移向量的 40 像素）。第 3 步 small2 的 place 判定看重心位置（T4 用包围盒中心作为锚点）。
- 要点：七巧板由 5 个三角形、1 个正方形、1 个平行四边形组成；两个小三角形能拼成一个正方形或中三角形；七块能拼出很多图形

### `observe-directions` 从不同方向观察物体
- 位置：二上 · `observe-1` · 3.4 · image、T1
- 元信息：summary：从不同方向看，看到的样子不一样；tags [观察物体, 前面, 侧面, 上面]；cover “看一看”；related [observe-cubes]
- 舞台：800 × 450；无参数
- 零件：
  - `car` = image asset car-top（玩具车俯视图），width 140，height 90，at [400, 225]
  - 四个小朋友：`kF` asset kid-front at [400, 360]；`kB` asset kid-back at [400, 90]；`kL` asset kid-left at [200, 225]；`kR` asset kid-right at [600, 225]（各 width 60）
  - 四张“看到的样子”：`vF` asset car-view-front at [400, 410]；`vB` car-view-back at [400, 40]；`vL` car-view-left at [90, 225]；`vR` car-view-right at [710, 225]（各 width 120，hidden）
  - `opts` = item-set，items [{ asset: car-view-front, value: 1 }, { asset: car-view-left, value: 2 }, { asset: car-view-top, value: 3 }]，row，size 100，at [560, 330]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 围着看 | 四个小朋友，从四个方向看一辆小汽车。 | 依次高亮 kF、kB、kL、kR | — |
| 2 | 前面看 | 从前面看，看到车头。 | 显示 vF；高亮 vF | — |
| 3 | 侧面看 | 从左边看、从右边看，看到的是车的侧面，方向相反。 | 显示 vL；显示 vR | — |
| 4 | 后面看 | 从后面看，看到车尾。 | 显示 vB | — |
| 5 | 选一选 | 从左边看到的是这一张。 | 隐藏 vF ＋ 隐藏 vB ＋ 隐藏 vL ＋ 隐藏 vR；显示 opts ‖ 高亮 opts.2 | tap 答案 opts.2（可点 opts.*）“哪一张是从左边看到的？”；提示：车头朝哪边？ |

- 素材：小汽车俯视图 + 前、后、左、右、上五个视图（开发文档 5.6），四个方向的小朋友。
- 要点：从不同的方向观察同一个物体，看到的样子可能不同；从左边和右边看，看到的样子左右相反

### `pictograph` 象形统计
- 位置：二上 · `pictograph` · 3.5 · chart（picto）
- 元信息：summary：一个图标代表几个，排齐了比多少；tags [象形统计图, 统计, 数据整理]；cover “🍎×5”；related [classify-count, bar-chart]
- 舞台：800 × 420；params `a: 6`、`b: 4`、`c: 8`；presets `{6,4,8}`、`{5,3,9}`、`{7,2,6}`（三组都满足 c > b）；derived `most: a > b && a > c ? 1 : (b > c ? 2 : 3)`
- 零件：
  - `pic` = chart，kind picto，categories [苹果, 香蕉, 草莓]，values [`{a}`, `{b}`, `{c}`]，icon [apple, banana, strawberry]，unit 1，width 360，height 300，show 0，at [80, 360]
  - `pic2` = chart，同上，unit 2，show 0，at [480, 360]，hidden
  - `q` = text，`'草莓比香蕉多 [{c - b}](blank) 个'`，size 30，at [600, 70]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 排一排 | 每个图标代表 1 个，一种排一列。 | pic.show → 1（2s） | — |
| 2 | 底下对齐 | 底下对齐，最高的一列最多。 | 高亮 pic.col.{most} | — |
| 3 | 多几个 | 草莓比香蕉多 {c - b} 个（两列差几个图标）。 | 高亮 pic.col.3 ＋ 高亮 pic.col.2 ‖ q.text → `'草莓比香蕉多 {c - b} 个'` | choose 答案 {c - b}（min 1，max 9）“草莓比香蕉多几个？” |
| 4 | 一个代表 2 | 一个图标也可以代表 2 个，半个就是 1 个。 | 显示 pic2；pic2.show → 1 | — |

- 要点：用图标表示数量，一种排一列、底下对齐，就能比出多少；一个图标可以代表 1 个，也可以代表几个

---

## 二年级下册

### `count-to-10000` 千和万：计数单位
- 位置：二下 · `numbers-10000` · 3.1 · base-ten（block）
- 元信息：summary：十个一百是一千，十个一千是一万，每满十进一；tags [千, 万, 计数单位, 十进制]；cover “10个千”；related [count-to-100, read-write-10000]；recommended
- 舞台：800 × 450；无参数
- 零件：
  - `b` = base-ten，style block，ones 0，tens 0，hundreds 0，thousands 0，columns true，unit 8，at [40, 40]
  - `chain` = text，`'个 → 十 → 百 → 千 → 万'`，size 32，at [400, 410]，hidden
  - `cnt` = text，text `'{value}'`，value 0，size 48，at [660, 80]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 一个一个数 | 1 个小方块是一个一。 | b.ones → 9（2s，linear）＋ count cnt 0→9 | — |
| 2 | 十个一是一十 | 10 个一是一十，排成一条。 | b.ones → 10 ＋ cnt.value → 10；b.ones → 0 ＋ b.tens → 1 | — |
| 3 | 十个十是一百 | 10 个十是一百，拼成一片。 | b.tens → 9 ＋ cnt.value → 90；b.tens → 10 ＋ cnt.value → 100；b.tens → 0 ＋ b.hundreds → 1 | — |
| 4 | 十个一百是一千 | 10 个一百是一千，摞成一个大正方体。 | b.hundreds → 9 ＋ cnt.value → 900 ‖ b.hundreds → 10 ＋ cnt.value → 1000；b.hundreds → 0 ＋ b.thousands → 1 | choose 答案 1000（选项 100 1000 10000）“10 个一百是多少？” |
| 5 | 十个一千是一万 | 10 个一千是一万。 | b.thousands → 10 ＋ cnt.value → 10000；显示 chain | — |

- 说明：base-ten 的“捆”约定是一次改 10（B3），这里 tens 10 → 0、hundreds 0 → 1 同理适用于方块的“拼”。B3 对 block 的拼合过程按同样规则画（10 条并成一片，10 片摞成一块）。
- 要点：一、十、百、千、万都是计数单位；相邻两个计数单位之间满十进一

### `read-write-10000` 读数和写数（中间、末尾有 0）
- 位置：二下 · `numbers-10000` · 3.1 · place-value、F2（cn）
- 元信息：summary：从高位读起；中间一个或几个 0 只读一个零，末尾的 0 不读；tags [读数, 写数, 万以内的数, 0的读法]；cover “3005”；related [count-to-10000, place-value-100]；recommended
- 舞台：800 × 420；params `n: 3005`（不换题：读法选项要逐个写出，所以固定一个数）
- 零件：
  - `abacus` = place-value，value `{n}`，places 3，style abacus，at [240, 210]
  - `read` = text，`'读作：[{cn(n)}](blank)'`，size 36，at [600, 160]
  - `rule` = text，`'中间有 0 读一个零，末尾的 0 不读'`，size 24，at [600, 260]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 看计数器 | 千位 {digit(n, 3)}、百位 {digit(n, 2)}、十位 {digit(n, 1)}、个位 {digit(n, 0)}。 | 依次高亮 abacus.d3、d2、d1、d0 | — |
| 2 | 写数 | 哪一位一颗珠子也没有，就写 0。这个数写作 {n}。 | 高亮 abacus | — |
| 3 | 读数 | 从高位读起：{cn(n)}。 | 显示 rule ‖ read.text → `'读作：{cn(n)}'` | choose 答案 三千零五（选项 三千零五 三千五 三千零零五）“{n} 怎么读？”；提示：中间的 0 读一个“零”，末尾的 0 不读。 |

- 说明：再加一步讲末尾的 0：在第 3 步之后加第 4 步“末尾的 0 不读”：abacus.value → 2700；read.text → `'读作：{cn(2700)}'`（两千七百），讲解“2700 末尾的两个 0 都不读，读作两千七百。”，无动手做。
- 要点：读万以内的数，从高位读起；中间有一个 0 或连续两个 0，只读一个“零”；末尾不管有几个 0 都不读

### `compare-10000` 大小比较与近似数
- 位置：二下 · `numbers-10000` · 3.1 · place-value、numberline（X4）、F2（sel）
- 元信息：summary：位数多的大；位数相同从最高位比；tags [比大小, 万以内的数, 近似数, 约等于]；cover “3980≈4000”；related [read-write-10000, order-compare-100]
- 舞台：800 × 420；params `a: 3980`、`b: 4020`；explore a 滑块 1000–9999（步长 10），b 滑块 1000–9999（步长 10）
- 零件：
  - `pa` = place-value，value `{a}`，places 3，style chart，at [220, 90]
  - `pb` = place-value，value `{b}`，places 3，style chart，at [220, 200]
  - `cmp` = text，`'{a} [>](blank) {b}'`，size 40，at [620, 140]
  - `line` = numberline，from `{floor(a / 1000) * 1000}`，to `{floor(a / 1000) * 1000 + 1000}`，step 100，labelEvery 1，length 600，marks [`{a}`]，at [100, 340]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 比位数 | 先看位数，位数多的数大。 | 高亮 pa ＋ 高亮 pb | — |
| 2 | 从最高位比 | 位数一样，从千位比起，千位一样再比百位。 | 高亮 pa.d3 ＋ 高亮 pb.d3 | — |
| 3 | 比一比 | {a} 和 {b} 比。 | 高亮 cmp ‖ cmp.text → `'{a} {sel(a > b, '>', sel(a < b, '<', '='))} {b}'` | choose 答案 `{sel(a > b, '>', sel(a < b, '<', '='))}`（选项 > = <） |
| 4 | 近似数 | 在数轴上，{a} 离 {round(a / 1000) * 1000} 更近，{a} ≈ {round(a / 1000) * 1000}。 | 高亮 line | — |

- 要点：位数不同，位数多的数大；位数相同，从最高位比起；接近整千数的数，可以说“大约是”几千，用“≈”表示

### `remainder-meaning` 有余数的除法
- 位置：二下 · `division-remainder` · 随时
- 元信息：summary：分到不够再分一份时停下，剩下的是余数，余数比除数小；tags [有余数的除法, 余数, 平均分]；cover “13÷4”；related [divide-equal, remainder-column]；recommended
- 舞台：800 × 450；params `t: 13`、`g: 4`；derived `q: floor(t / g)`、`r: t % g`；explore t 滑块“一共” 7–30，g 滑块“分几份” 2–6
- 零件：
  - `pool` = counters，count `{t}`，layout grid，cols 8，size 32，color orange，at [40, 40]
  - `p{i}`（repeat `{g}`）= counters，count 0，layout grid，cols 3，capacity `{q + 1}`，size 28，at [`{40 + (i - 1) * 125}`, 220]
  - `eq` = text，`'{t} ÷ {g} = [{q}](blank) …… [{r}](blank)'`，size 36，at [400, 400]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 平均分 | {t} 个平均分给 {g} 个盘子。 | 高亮 pool | — |
| 2 | 一个一个分 | 一轮一轮地分，每个盘子分到 {q} 个。 | ‖ pool 一个一个分到 [p1…p{g}]（count {q * g}） | drag pool → [p1…p{g}] ×{q * g}（each {q}）“一个一个分到盘子里，分到不够再分一轮为止。”；提示：每个盘子轮流放一个。 |
| 3 | 还剩几个 | 还剩 {r} 个，不够每个盘子再分一个了。 | 高亮 pool ‖ eq.text → `'{t} ÷ {g} = {q} …… {r}'` | choose 答案 {r}（min 0，max {g - 1}）“还剩几个？”；提示：数一数没分出去的。 |
| 4 | 余数比除数小 | 剩下的要是够分，就还能再分一轮，所以余数一定比除数小。 | 高亮 eq | — |

- 说明：`r` 可能为 0（如 12 ÷ 4），讲解第 3 步在 r = 0 时“还剩 0 个”仍正确；第 2 步 `each {q}` 让每盘最多放 q 个。
- 要点：平均分后有剩余，剩下的数叫余数；余数一定比除数小

### `remainder-column` 有余数除法的竖式
- 位置：二下 · `division-remainder` · 3.2 · column-calc（÷，X2）
- 元信息：summary：竖式里商是每份几个，减下来的是余数；tags [除法竖式, 有余数的除法, 余数]；cover “竖式÷”；related [remainder-meaning, div-column-1]
- 舞台：800 × 420；params `t: 23`、`g: 5`；derived `q: floor(t / g)`、`r: t % g`；explore t 滑块 10–50，g 滑块 2–9（检查：q ≤ 9，表内除法，即 t < 10 × g——用 t 的 max 写成 `10 * g - 1`；g 先于 t 定义：explore 顺序 g、t）
- 零件：
  - `calc` = column-calc，a `{t}`，b `{g}`，op ÷，show 0，at [220, 200]
  - `dots` = counters，count `{t}`，layout grid，cols `{g}`，size 26，at [520, 60]
  - `eq` = text，`'{t} ÷ {g} = [{q}](blank) …… [{r}](blank)'`，size 34，at [560, 380]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 写成竖式 | {t} 除以 {g}，写成竖式。 | 高亮 calc | — |
| 2 | 商 | 想口诀：几乘 {g} 最接近 {t} 又不超过？商 {q}。 | 高亮 dots ‖ calc.show → 1 | choose 答案 {q}（min 1，max 9）“商几？”；提示：{q} × {g} = {q * g}，{q + 1} × {g} = {(q + 1) * g} 就超过了。 |
| 3 | 乘 | {q} 乘 {g} 等于 {q * g}，是分掉的。 | calc.show → 2 | — |
| 4 | 减 | {t} 减 {q * g} 等于 {r}，是剩下的余数。 | ‖ calc.show → 3 ＋ eq.text → `'{t} ÷ {g} = {q} …… {r}'` | choose 答案 {r}（min 0，max {g - 1}）“余数是几？” |
| 5 | 检查余数 | 余数 {r} 比除数 {g} 小，对了。 | 高亮 calc | — |

- 要点：除法竖式里，商写在被除数上面；商乘除数是分掉的部分；被除数减去它就是余数，余数要比除数小

### `oral-add-sub-1000` 整百、整千数加减
- 位置：二下 · `add-sub-10000` · 3.1 · base-ten（block）
- 元信息：summary：几个百加减几个百，几个千加减几个千；tags [整百数, 整千数, 口算]；cover “300+500”；related [tens-add-sub, column-add-sub-10000]
- 舞台：800 × 400；params `a: 3`、`b: 5`（几个百）；derived `s: a + b`；explore a 滑块 1–8，b 滑块 1–`9 - a`
- 零件：
  - `x` = base-ten，style block，hundreds `{a}`，columns false，unit 6，at [40, 70]
  - `y` = base-ten，style block，hundreds `{b}`，columns false，unit 6，color orange，at [40, 220]
  - `eq` = text，`'{a * 100} + {b * 100} = [{s * 100}](blank)'`，size 40，at [600, 160]
  - `eq2` = text，`'{a * 1000} + {b * 1000} = {s * 1000}'`，size 32，at [600, 260]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 几个百 | {a * 100} 是 {a} 个百，{b * 100} 是 {b} 个百。 | 高亮 x；高亮 y | — |
| 2 | 合起来 | 合起来是 {s} 个百，就是 {s * 100}。 | y 移到 [`{60 + a * 70}`, 70] ‖ eq.text → `'{a * 100} + {b * 100} = {s * 100}'` | choose 答案 {s * 100}（选项 {s}、{s * 10}、{s * 100}） |
| 3 | 整千也一样 | 整千数也一样：{a} 个千加 {b} 个千是 {s} 个千。 | 显示 eq2 | — |

- 要点：整百数加减，想几个百加减几个百；整千数加减，想几个千加减几个千

### `column-add-sub-10000` 三位数加减（连续进位、连续退位）
- 位置：二下 · `add-sub-10000` · 3.1 · column-calc（+、−）、E1、E2
- 元信息：summary：从个位算起，哪一位满十就进一，不够减就退一；tags [三位数加法, 三位数减法, 连续进位, 连续退位, 竖式]；cover “305−128”；related [column-add-100, column-sub-100]
- 舞台：800 × 420；params `a: 305`、`b: 128`；presets（减法，含中间有 0 的连续退位）：`305 − 128`、`400 − 156`、`523 − 247`、`612 − 385`
- derived：`b0: digit(a,0) < digit(b,0)`、`b1: digit(a,1) - b0 < digit(b,1)`、`r: a - b`
- 零件：`calc` = column-calc，a `{a}`，b `{b}`，op −，show 0，at [400, 200]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 列竖式 | {a} 减 {b}，数位对齐，从个位减起。 | 高亮 calc | — |
| 2 | 个位 | 个位{sel(b0, '不够减，向十位退 1', '够减')}，得 {digit(r, 0)}。 | ‖ calc.show → 1 | choose 答案 {digit(r, 0)}（min 0，max 9）“个位上写几？” |
| 3（when `{b0 && digit(a, 1) == 0}`） | 十位是 0 | 十位是 0，没得退，先从百位退 1，十位变成 10，再退给个位，十位剩 9。 | 高亮 calc.borrow.1 ＋ 高亮 calc.borrow.2 | — |
| 4 | 十位 | 十位{sel(b1, '不够减，再向百位退 1', '够减')}，得 {digit(r, 1)}。 | ‖ calc.show → 2 | choose 答案 {digit(r, 1)}（min 0，max 9）“十位上写几？” |
| 5 | 百位 | 百位要先减去退走的 1，得 {digit(r, 2)}。 | ‖ calc.show → 3 | choose 答案 {digit(r, 2)}（min 0，max 9）“百位上写几？” |
| 6 | 得数 | 所以 {a} − {b} = {r}。 | 高亮 calc | — |

- 说明：presets 里 `523 − 247`、`612 − 385` 的十位不是 0，第 3 步自动去掉（E2）；`400 − 156` 十位是 0、个位退位，第 3 步出现。
- 要点：从个位算起，哪一位不够减就从前一位退 1；中间是 0 不够退时，要再向更高一位退 1，0 变成 9

### `gram-kilogram` 认识克和千克
- 位置：二下 · `mass-1` · 3.3 · balance
- 元信息：summary：轻的用克，重的用千克，1 千克 = 1000 克；tags [克, 千克, 质量, 天平]；cover “1kg=1000g”；related [compare-size-weight, ton]
- 舞台：800 × 420；无参数
- 零件：
  - `s1` = balance，kind beam，left 1，right 1，leftItems [paperclip]，rightItems [weight-1g]，width 300，at [200, 330]
  - `s2` = balance，kind dial，left 0，max 2000，unit 克，width 300，at [580, 330]
  - `salt` = image asset salt-bag，width 70，height 90，at [580, 150]，hidden
  - `eq` = text，`'1 千克 = [1000](blank) 克'`，size 36，at [400, 410]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 很轻的东西 | 一枚回形针大约重 1 克，很轻的东西用克作单位。 | 高亮 s1 | — |
| 2 | 秤一袋盐 | 一袋盐重 500 克。 | 显示 salt；salt 移到 [580, 200]；s2.left → 500（1s） | — |
| 3 | 两袋盐 | 两袋盐重 1000 克，也就是 1 千克。 | s2.left → 1000（1s） ‖ eq.text → `'1 千克 = 1000 克'` | choose 答案 1000（选项 10 100 1000）“1 千克等于多少克？” |
| 4 | 选单位 | 一个鸡蛋大约 50 克，一个西瓜大约 5 千克。 | 高亮 eq | — |

- 要点：比较轻的东西用克作单位，比较重的东西用千克作单位；1 千克 = 1000 克

### `hour-minute-second` 时、分、秒的关系与换算
- 位置：二下 · `time-hms` · 3.3 · clock（X5 秒针）、T2
- 元信息：summary：秒针走一圈是 1 分，分针走一圈是 1 时；tags [时, 分, 秒, 钟表, 时间换算]；cover “60秒=1分”；related [clock-basics, elapsed-time]
- 舞台：800 × 420；params `h: 8`、`m: 20`；derived `t: h * 60 + m`；explore h 滑块 1–11，m 滑块 0–55（步长 5）
- 零件：
  - `clk` = clock，time `{t}`，seconds 0，radius 140，at [220, 210]
  - `dig` = digital-clock，time `{t}`，size 44，at [560, 110]
  - `eq1` = text，`'1 分 = [60](blank) 秒'`，size 34，at [560, 220]
  - `eq2` = text，`'1 时 = [60](blank) 分'`，size 34，at [560, 290]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 秒针 | 最细最长的是秒针，走一小格是 1 秒。 | 高亮 clk | — |
| 2 | 秒针走一圈 | 秒针走一圈是 60 秒，分针正好走一小格。 | clk.seconds → 60（6s，linear）＋ clk.time → {t + 1}（6s，linear）＋ dig.time → {t + 1} ‖ eq1.text → `'1 分 = 60 秒'` | choose 答案 60（选项 10 60 100）“秒针走一圈是多少秒？” |
| 3 | 分针走一圈 | 分针走一圈是 60 分，时针走一大格，是 1 时。 | clk.time → {t + 61}（4s，linear）＋ dig.time → {t + 61} ‖ eq2.text → `'1 时 = 60 分'` | choose 答案 60（选项 12 60 100） |
| 4 | 拨一拨 | 把钟拨到 {h + 1} 时 {m} 分。 | clk.time → {t}；dig.time → {t} ‖ clk.time → {t + 60} | turn clk.time 到 {t + 60}（容差 0，步长 5）“拨动分针，拨到 {h + 1} 时 {m} 分。”；提示：分针走一圈，时针走一大格。 |

- 要点：1 分 = 60 秒；1 时 = 60 分；秒针走一圈，分针走一小格；分针走一圈，时针走一大格

### `rect-square-features` 长方形、正方形的特征
- 位置：二下 · `rect-square` · 3.4 · polygon、E5、T1
- 元信息：summary：对边相等，四个角都是直角；正方形四条边都相等；tags [长方形, 正方形, 对边, 直角]；cover “▭”；related [shapes-2d-intro, rect-perimeter]
- 舞台：800 × 420；params `l: 6`、`w: 4`（1 = 40 像素）；explore l 滑块 4–8，w 滑块 2–`l - 1`
- 零件：
  - `rect` = polygon，points [[100, 100], [`{100 + l * 40}`, 100], [`{100 + l * 40}`, `{100 + w * 40}`], [100, `{100 + w * 40}`]]，color blue，sideLabels [`'{l}'`, `'{w}'`, `'{l}'`, `'{w}'`]
  - `copy` = polygon，同 rect 的 points，color orange，opacity 0.6，hidden
  - `sq` = polygon，points [[560, 100], [720, 100], [720, 260], [560, 260]]，color green，sideLabels ['4', '4', '4', '4']，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 长方形 | 这是一个长方形。 | 高亮 rect | — |
| 2 | 上下对折 | 上下对折，上下两条边完全重合，相等。 | 显示 copy；copy 沿 [[80, `{100 + w * 20}`], [600, `{100 + w * 20}`]] 翻折 | — |
| 3 | 左右对折 | 左右对折，左右两条边也相等。 | copy 沿 [[`{100 + l * 20}`, 60], [`{100 + l * 20}`, 400]] 翻折；隐藏 copy | — |
| 4 | 对边相等 | 长方形对边相等。点出和上面这条边一样长的边。 | 高亮 rect.e1 ‖ 高亮 rect.e3 | tap 答案 rect.e3（可点 rect.e2、rect.e3、rect.e4）“点出和上边一样长的边。” |
| 5 | 四个直角 | 四个角都是直角。 | rect.rightAngles → [1, 2, 3, 4] | — |
| 6 | 正方形 | 正方形四条边都相等，四个角也都是直角。 | 显示 sq；sq.rightAngles → [1, 2, 3, 4] | — |

- 要点：长方形对边相等，四个角都是直角；正方形四条边都相等，四个角都是直角；正方形是特殊的长方形

### `length-units` 分米、毫米、千米
- 位置：二下 · `length-units` · 3.3 · ruler
- 元信息：summary：10 毫米 = 1 厘米，10 厘米 = 1 分米，10 分米 = 1 米，1000 米 = 1 千米；tags [长度单位, 毫米, 分米, 千米, 米, 厘米]；cover “1dm=10cm”；related [measure-length, decimal-intro]；recommended
- 舞台：800 × 420；无参数
- 零件：
  - `r` = ruler，from 0，to 12，unit cm，length 720，minor 10，zoomAt 3，zoomScale 1，at [40, 120]
  - `seg` = line，from [40, 100]，to [640, 100]，width 6，color orange，draw 0（10 厘米 = 600 像素）
  - `chain` = text，`'1 厘米 = 10 毫米　1 分米 = 10 厘米'`，size 28，at [400, 300]，hidden
  - `km` = text，`'1 千米 = [1000](blank) 米'`，size 34，at [400, 380]
  - `track` = image asset playground-track（操场跑道，400 米一圈），width 200，height 110，at [660, 300]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 放大看 | 放大看 1 厘米，里面有 10 小格，每格 1 毫米。 | r.zoomScale → 5（1s） | — |
| 2 | 毫米 | 很短的东西用毫米，1 厘米 = 10 毫米。 | 显示 chain；r.zoomScale → 1 | — |
| 3 | 分米 | 10 厘米是 1 分米。 | seg.draw → 1（1.5s） | — |
| 4 | 米 | 10 分米是 1 米。 | 高亮 chain | — |
| 5 | 千米 | 走 1000 米是 1 千米，大约绕操场跑道 2 圈半。 | 显示 track ‖ km.text → `'1 千米 = 1000 米'` | choose 答案 1000（选项 10 100 1000）“1 千米是多少米？” |

- 要点：1 厘米 = 10 毫米；1 分米 = 10 厘米；1 米 = 10 分米；1 千米 = 1000 米；量很短的用毫米，很远的路程用千米

### `measure-length` 简单的长度测量
- 位置：二下 · `length-units` · 3.3 · ruler、T2
- 元信息：summary：一端对准 0 刻度，看另一端；不从 0 开始就用终点减起点；tags [测量, 直尺, 长度, 刻度]；cover “量一量”；related [length-units, compare-height-length]
- 舞台：800 × 400；params `L: 6`、`s: 2`；explore L 滑块“铅笔长” 3–9，s 滑块“起点” 1–`12 - L`
- 零件：
  - `r` = ruler，from 0，to 12，unit cm，length 720，objectAsset pencil，objectFrom `{s}`，objectLength `{L}`，at [40, 160]
  - `eq` = text，`'{s + L} − {s} = [{L}](blank)（厘米）'`，size 34，at [400, 340]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 量铅笔 | 铅笔有多长？ | 高亮 r.object | — |
| 2 | 对准 0 | 把铅笔的一端对准 0 刻度。 | ‖ r.objectFrom → 0 | turn r.objectFrom 到 0（容差 0，步长 1）“把铅笔拖到左端对准 0。”；提示：对准尺子上写 0 的那条线。 |
| 3 | 读数 | 另一端对着 {L}，铅笔长 {L} 厘米。 | 高亮 r.tick.{L} ‖ — | choose 答案 {L}（min 1，max 12）“铅笔长几厘米？” |
| 4 | 不从 0 开始 | 断了头的尺子也能量：终点减起点。 | r.objectFrom → {s}；显示 eq ‖ eq.text → `'{s + L} − {s} = {L}（厘米）'` | choose 答案 {L}（min 1，max 12）“从 {s} 量到 {s + L}，长几厘米？” |

- 要点：量长度时，把物体的一端对准尺子的 0 刻度，另一端对着几就是几；不从 0 开始量，长度 = 终点刻度 − 起点刻度

### `survey-table` 简单的数据调查与整理
- 位置：二下 · `survey-1` · 3.5 · table（tally）
- 元信息：summary：调查、记录、整理成统计表，再回答问题；tags [调查, 统计表, 记录, 数据整理]；cover “调查”；related [data-collect-1, bar-chart]
- 舞台：800 × 420；params `a: 9`、`b: 6`、`c: 12`、`d: 5`（跳绳、踢毽、跑步、拍球）；presets `{9,6,12,5}`、`{11,4,7,8}`
- 零件：
  - `rec` = table，rows `[[运动, 跳绳, 踢毽, 跑步, 拍球], [记录, '{a}', '{b}', '{c}', '{d}']]`，headerCol true，tally true，tallyShow 0，colWidth 120，at [40, 60]
  - `cnt` = table，rows `[[人数, '[{a}](blank)', '[{b}](blank)', '[{c}](blank)', '[{d}](blank)']]`，header false，headerCol true，colWidth 120，at [40, 170]
  - `q` = text，`'最喜欢 [跑步](blank) 的人最多'`，size 30，at [400, 330]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 调查 | 调查全班同学最喜欢的运动。 | 高亮 rec | — |
| 2 | 记录 | 一人选一样，用画“正”字记录。 | rec.tallyShow → {a + b + c + d}（4s，linear） | — |
| 3 | 整理 | 数一数，填进统计表。 | cnt.rows → `[[人数, '{a}', '{b}', '{c}', '{d}']]` | — |
| 4 | 回答问题 | 喜欢{sel(c >= a && c >= b && c >= d, '跑步', sel(a >= b && a >= d, '跳绳', sel(b >= d, '踢毽', '拍球')))}的人最多。 | ‖ q.text → 答案文字 | choose 答案 `{sel(c >= a && c >= b && c >= d, '跑步', sel(a >= b && a >= d, '跳绳', sel(b >= d, '踢毽', '拍球')))}`（选项 跳绳 踢毽 跑步 拍球）“喜欢哪种运动的人最多？” |

- 要点：调查时先确定调查什么、怎样记录；把记录整理成统计表；从统计表里能看出最多、最少、相差多少
