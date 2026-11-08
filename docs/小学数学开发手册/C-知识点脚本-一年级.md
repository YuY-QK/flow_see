# C · 知识点脚本 · 一年级（31 个）

> 格式和记号见 [README 第 6 节](./README.md#6-知识点脚本c-文件的格式)。已上线的 `make-ten`、`clock-basics`、`borrow-ten`、`level-ten` 不在本文件。
> 一年级讲解要短：每句以 20 字以内为主，最多 30 字。
> 动手做的统一前提（已有规则）：`drag` 的 `from` 必须在这一步**开头**就存在，所以“先拆出来再拖”时，拆分放在上一步。

---

## 一年级上册

### `count-to-10` 数一数
- 位置：一上 · `numbers-10` · 3.1 · item-set
- 元信息：summary：一个一个数，最后数到几就是几个；tags [数数, 1到10, 认数, 点数]；cover “1 2 3”；related [cardinal-ordinal, zero]；recommended
- 舞台：800 × 360；params `n: 7`；explore n 滑块“有几个” 1–10
- 零件：
  - `fruits` = item-set，items `[{ repeat: '{n}', asset: apple }]`，layout row，size 56，at [40, 60]
  - `dots` = counters，count `{n}`，row，size 36，color blue，at [40, 170]，hidden
  - `num` = text，text `'[{n}](blank)'`，size 72，at [640, 110]
  - `word` = label，text `'{n} 个苹果'`，at [640, 210]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 有几个苹果 | 盘子里有几个苹果？我们一起数一数。 | 高亮 fruits | — |
| 2 | 一个一个数 | 一个一个地数，数一个记一个圆点。 | 显示 dots；重复 n 次：高亮 fruits.{i}（0.4s） | — |
| 3 | 数到几就是几 | 最后数到 {n}，就是有 {n} 个苹果。 | 高亮 dots ‖ num.text → `'{n}'`；显示 word | choose 答案 {n}（min 1，max 10）“一共有几个苹果？”；提示：用手指着，一个一个数。；高亮提示：dots |
| 4 | 写一写 | {n} 个苹果，写作数字 {n}。 | 高亮 num | — |

- 要点：数的时候一个一个数，不重复、不漏掉；最后数到几，就有几个；{n} 个苹果写作 {n}

### `compare-within-10` 比大小
- 位置：一上 · `numbers-10` · 随时（用到 E3 比较、F2 的 `sel`，排在这两张卡之后）
- 元信息：summary：一个对一个，多出来的那边就多；tags [比大小, 大于, 小于, 等于, 一一对应]；cover “5 > 3”；related [count-to-10]
- 舞台：800 × 360；params `a: 5`、`b: 3`；explore a 滑块“上面几个” 1–9，b 滑块“下面几个” 1–9
- 零件：
  - `top` = counters，count `{a}`，row，size 48，color blue，at [60, 70]
  - `bottom` = counters，count `{b}`，row，size 48，color orange，at [60, 190]
  - `l{i}`（repeat `{min(a, b)}`）= line，from [`{84 + (i - 1) * 48}`, 118]，to [`{84 + (i - 1) * 48}`, 190]，dashed，color line，hidden
  - `sign` = text，text `'[{a}](@top) [>](blank) [{b}](@bottom)'`，size 56，at [640, 150]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 哪边多 | 上面 {a} 个，下面 {b} 个，哪边多？ | 高亮 top；高亮 bottom | — |
| 2 | 一个对一个 | 一个对一个连起来。 | 重复 min(a, b) 次：显示 l{i}（0.3s） | — |
| 3 | 多出来的 | {sel(a == b, '一样多，用等号。', '多出来的那边多。')} | 高亮 sign ‖ sign.text → `'[{a}](@top) {sel(a > b, '>', sel(a < b, '<', '='))} [{b}](@bottom)'` | choose 答案 `{sel(a > b, '>', sel(a < b, '<', '='))}`（选项 > = <）“{a} 和 {b} 中间填什么？”；提示：开口朝着多的那边。 |
| 4 | 记一记 | 大于号、小于号，开口朝着大数。 | 高亮 sign | — |

- 要点：一个对一个，多出来的那边多；开口朝着大数，尖尖对着小数；同样多用“=”

### `cardinal-ordinal` 几个和第几个
- 位置：一上 · `numbers-10` · 3.1 · item-set、T1
- 元信息：summary：“几个”是一共几个，“第几个”只是其中一个；tags [几个, 第几个, 基数, 序数, 排队]；cover “第4”；related [count-to-10]；recommended
- 舞台：800 × 360；params `n: 4`；explore n 滑块“第几个” 2–7
- 零件：
  - `animals` = item-set，items 依次 rabbit、cat、dog、chick、duck、monkey、bear、squirrel，row，size 64，gap 14，at [40, 120]
  - `arrow` = arrow，from [40, 230]，to [660, 230]，color dim
  - `t1` = label，`'{n} 个'`，at [640, 60]，hidden；`t2` = label，`'第 {n} 个'`，at [640, 60]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 排好队 | 小动物排好队，从左往右数。 | 高亮 arrow | — |
| 2 | 几个 | 左边 {n} 个，要把前 {n} 个都圈起来。 | 显示 t1；重复 n 次：高亮 animals.{i}（together） | — |
| 3 | 第几个 | 第 {n} 个，只是其中的一个。 | 隐藏 t1；显示 t2 ‖ 高亮 animals.{n} | tap 答案 animals.{n}（可点 animals.*）“点出从左数第 {n} 个。”；提示：从左边第一个开始数，数到 {n} 停下。 |
| 4 | 比一比 | “{n} 个”是一共几个，“第 {n} 个”只有一个。 | 高亮 animals.{n} | — |

- 要点：“几个”表示一共有多少；“第几个”表示排在哪个位置，只指其中一个；从不同方向数，第几个会不一样

### `zero` 0 的认识
- 位置：一上 · `numbers-10` · 随时
- 元信息：summary：一个也没有用 0 表示，0 也是起点；tags [0, 零, 没有, 起点]；cover “0”；related [count-to-10, order-within-10]
- 舞台：800 × 360；无参数
- 零件：
  - `plate` = counters，count 3，layout grid，cols 3，capacity 3，size 52，color red，at [80, 90]
  - `num` = text，text `3`，size 72，at [420, 130]
  - `line` = numberline，from 0，to 5，length 520，labelEvery 1，at [140, 290]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 盘子里的桃 | 盘子里有 3 个桃。 | 高亮 plate | — |
| 2 | 吃掉一个 | 吃掉一个，还剩 2 个。 | plate.count → 2 ＋ num.text → 2 | — |
| 3 | 再吃一个 | 再吃一个，还剩 1 个。 | plate.count → 1 ＋ num.text → 1 | — |
| 4 | 一个也没有 | 全吃完了，一个也没有，用 0 表示。 | plate.count → 0 ＋ num.text → `'[0](blank)'` ‖ num.text → 0；高亮 num | choose 答案 0（选项 0 1 2）“盘子里还有几个桃？”；提示：盘子里一个也没有了。 |
| 5 | 0 是起点 | 尺子和数轴都从 0 开始。 | 显示 line；高亮 line | — |

- 要点：一个也没有，用 0 表示；0 比 1 小；尺子、数轴上 0 是起点

### `order-within-10` 10 以内数的顺序
- 位置：一上 · `numbers-10` · 随时
- 元信息：summary：数轴上越往右数越大；前一个少 1，后一个多 1；tags [数的顺序, 数轴, 前一个, 后一个]；cover “0→10”；related [zero, compare-within-10]
- 舞台：800 × 300；params `n: 5`；explore n 滑块“哪个数” 1–9
- 零件：
  - `line` = numberline，from 0，to 10，length 680，labelEvery 1，pointer 0，at [60, 140]
  - `q` = text，text `'[?](blank)  [{n}](blue)  [?](blank)'`，size 48，at [400, 240]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 从 0 跳到 10 | 从 0 开始，一格一格往右跳。 | 重复 10 次：hop line 从 {i - 1} 到 {i}（0.4s） | — |
| 2 | 越往右越大 | 越往右，数越大。 | 高亮 line | — |
| 3 | 前一个 | {n} 的前一个是 {n - 1}，少 1。 | line.pointer → {n}；高亮 q ‖ q.text → `'[{n - 1}](orange)  [{n}](blue)  [?](blank)'` | choose 答案 {n - 1}（min 0，max 10）“{n} 前面一个数是几？”；提示：在数轴上往左看一格。 |
| 4 | 后一个 | {n} 的后一个是 {n + 1}，多 1。 | ‖ q.text → `'[{n - 1}](orange)  [{n}](blue)  [{n + 1}](green)'` | choose 答案 {n + 1}（min 0，max 10）“{n} 后面一个数是几？”；提示：往右看一格。 |

- 要点：数轴上从左往右，数越来越大；一个数的前一个数比它少 1，后一个数比它多 1

### `compose-10` 10 以内数的组成
- 位置：一上 · `numbers-10` · 3.1 · number-bond
- 元信息：summary：一个数可以分成两个数，按顺序分不重复不遗漏；tags [分与合, 数的组成, 分成, 合成]；cover “7=3+4”；related [add-sub-by-bond, make-ten]；recommended
- 舞台：800 × 400；params `n: 6`；explore n 滑块“分哪个数” 3–10
- 零件：
  - `pile` = counters，count `{n}`，row，size 44，at [40, 60]
  - `bond` = number-bond，whole `{n}`，parts [1, `{n - 1}`]，show 0，at [620, 70]
  - `w{i}`（repeat `{n - 1}`）= text，text `'[{i}](blue) 和 [{n - i}](orange)'`，size 26，at [`{60 + floor((i - 1) / 5) * 170}`, `{190 + ((i - 1) % 5) * 38}`]，hidden
  - `w2q` = text，text `'[2](blue) 和 [?](blank)'`，size 26，at 与 w2 相同，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 分一分 | {n} 个圆片，分成两堆，可以怎么分？ | 高亮 pile；bond.show → 1 | — |
| 2 | 先分 1 个 | 左边 1 个，右边 {n - 1} 个。 | 从 pile 拆 1 个为 p1；bond.show → 2；显示 w1 | — |
| 3 | 再分 2 个 | 左边 2 个，右边 {n - 2} 个。 | bond.parts → [2, `{n - 2}`] ＋ bond.blank → [q]；显示 w2q ‖ bond.blank → []；隐藏 w2q ＋ 显示 w2 | choose 答案 {n - 2}（min 1）“{n} 分成 2 和几？”；提示：{n} 个里拿走 2 个，还剩几个？；高亮提示：bond |
| 4 | 按顺序分完 | 按顺序一直分下去，就不会漏掉。 | 重复 n − 3 次：显示 w{i + 2}（0.4s） ＋ bond.parts → [`{i + 2}`, `{n - i - 2}`] | — |
| 5 | 合起来 | 两部分合起来，又是 {n}。 | bond.dir → up；高亮 bond | — |

- 要点：{n} 可以分成 1 和 {n - 1}、2 和 {n - 2}……；按顺序分，不重复也不遗漏；两部分合起来就是 {n}

### `add-meaning` 加法的意义
- 位置：一上 · `add-sub-10` · 随时
- 元信息：summary：把两部分合起来，用加法；tags [加法, 合起来, 加号, 一共]；cover “3+2”；related [sub-meaning, add-sub-by-bond]
- 舞台：800 × 360；params `a: 3`、`b: 2`；derived `s: a + b`；explore a 滑块“左边” 1–8，b 滑块“右边” 1–`9 - a`
- 零件：
  - `left` = counters，count `{a}`，row，size 48，color blue，at [40, 140]
  - `right` = counters，count `{b}`，row，size 48，color orange，at [420, 140]
  - `box` = tenframe，count 0，size 48，at [40, 250]
  - `eq` = text，`'[{a}](@left) + [{b}](@right) = [{s}](blank)'`，size 48，at [640, 160]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 两堆 | 左边 {a} 个，右边 {b} 个。 | 高亮 left；高亮 right | — |
| 2 | 合起来 | 把它们合到一起。 | left 移到 box ‖ right 移到 box | drag right → box ×{b}“把橙色圆片也放进十格框。”；提示：拖到下面的十格框里。 |
| 3 | 一共几个 | 一共 {s} 个，写成 {a} + {b} = {s}。 | 高亮 box ‖ eq.text → `'[{a}](@left) + [{b}](@right) = [{s}](green)'` | choose 答案 {s}（min 2，max 10）“一共几个？”；提示：数一数十格框里有几个。 |

- 要点：把两部分合起来，求一共有多少，用加法；“+”读作加号

### `sub-meaning` 减法的意义
- 位置：一上 · `add-sub-10` · 随时
- 元信息：summary：从一共里拿走一部分，求还剩多少，用减法；tags [减法, 去掉, 拿走, 还剩, 减号]；cover “5−2”；related [add-meaning]
- 舞台：800 × 360；params `a: 6`、`b: 2`；derived `r: a - b`；explore a 滑块“一共” 2–10，b 滑块“拿走” 1–`a - 1`
- 零件：
  - `all` = counters，count `{a}`，row，size 48，color blue，at [40, 150]
  - `away` = shape rect，width 260，height 90，fill false，stroke line，at [560, 290]
  - `eq` = text，`'[{a}](@all) − [{b}](orange) = [{r}](blank)'`，size 48，at [620, 140]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 一共几个 | 一共有 {a} 个，要拿走 {b} 个。 | 高亮 all；从 all 拆 {b} 个为 gone；gone.color → orange | — |
| 2 | 拿走 | 把 {b} 个拿走。 | ‖ gone 移到 away | drag gone → away ×{b}“把橙色的 {b} 个拖到下面的框里。”；提示：拖到右下角的框里。 |
| 3 | 还剩几个 | 还剩 {r} 个，写成 {a} − {b} = {r}。 | 高亮 all ‖ eq.text → `'[{a}](@all) − [{b}](orange) = [{r}](green)'` | choose 答案 {r}（min 0，max 9）“还剩几个？” |

- 要点：从一共里拿走一部分，求还剩多少，用减法；“−”读作减号

### `add-sub-by-bond` 用数的组成算加减
- 位置：一上 · `add-sub-10` · 3.1 · number-bond
- 元信息：summary：想“几和几组成几”，一幅图能写四个算式；tags [一图四式, 数的组成, 加减法]；cover “3+4=7”；related [compose-10, think-add-for-sub]
- 舞台：800 × 400；params `w: 7`、`p: 3`；derived `q: w - p`；explore w 滑块“总数” 3–10，p 滑块“一部分” 1–`w - 1`
- 零件：
  - `bond` = number-bond，whole `{w}`，parts [`{p}`, `{q}`]，colors `{ whole: green, p: blue, q: orange }`，at [200, 80]
  - `e1` = text，`'[{p}](blue) + [{q}](orange) = [{w}](green)'`，size 34，at [580, 70]，hidden
  - `e2` = text，`'[{q}](orange) + [{p}](blue) = [{w}](green)'`，size 34，at [580, 130]，hidden
  - `e3` = text，`'[{w}](green) − [{p}](blue) = [{q}](blank)'`，size 34，at [580, 190]，hidden
  - `e4` = text，`'[{w}](green) − [{q}](orange) = [{p}](blank)'`，size 34，at [580, 250]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 看分合图 | {p} 和 {q} 组成 {w}。 | 高亮 bond | — |
| 2 | 两道加法 | 合起来用加法：{p} + {q} = {w}，{q} + {p} = {w}。 | 显示 e1；显示 e2；高亮 bond.whole | — |
| 3 | 第一道减法 | 从 {w} 里去掉 {p}，剩下 {q}。 | 显示 e3；高亮 bond.p ‖ e3.text → `'[{w}](green) − [{p}](blue) = [{q}](orange)'` | choose 答案 {q}（min 0，max 10）“{w} − {p} 等于几？”；提示：看分合图，{w} 分成 {p} 和几？；高亮提示：bond |
| 4 | 第二道减法 | 从 {w} 里去掉 {q}，剩下 {p}。 | 显示 e4；高亮 bond.q ‖ e4.text → `'[{w}](green) − [{q}](orange) = [{p}](blue)'` | choose 答案 {p}（min 0，max 10） |

- 要点：想“几和几组成几”就能算加减；一幅分合图可以写两道加法、两道减法

### `count-on` 点数法与接着数
- 位置：一上 · `add-within-20` · 随时。**完整配置见开发文档 5.7**，照抄即可。

### `commute-add` 交换加数的位置
- 位置：一上 · `add-within-20` · 随时
- 元信息：summary：两个数交换位置，和不变；大数在前更好凑十；tags [交换加数, 加法交换, 凑十]；cover “3+9=9+3”；related [make-ten, count-on]
- 舞台：800 × 360；params `a: 3`、`b: 9`；derived `s: a + b`、`gap: 10 - b`、`rest: a - gap`；explore a 滑块“小数” 2–5，b 滑块“大数” `11 - a`–9
- 零件：
  - `small` = counters，count `{a}`，row，size 40，color orange，at [40, 80]
  - `big` = counters，count `{b}`，row，size 40，color blue，at [`{60 + a * 40}`, 80]
  - `eq1` = text，`'[{a}](@small) + [{b}](@big) = [{s}](blank)'`，size 40，at [620, 70]
  - `eq2` = text，`'[{b}](@big) + [{a}](@small)'`，size 40，at [620, 140]，hidden
  - `calc` = split-calc，a `{b}`，op +，b `{a}`，split b，parts [`{gap}`, `{rest}`]，first `{ join: [a, p], op: +, value: 10 }`，second `{ join: [m, q], op: +, value: '{s}' }`，show 0，size 30，colors `{ a: '@big', b: '@small' }`，at [620, 200]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 提出问题 | {a} 加 {b}，小数在前，不好凑十。 | 高亮 eq1 | — |
| 2 | 交换位置 | 两堆交换位置，一共还是这么多。 | small 移到 [`{60 + b * 40}`, 80] ＋ big 移到 [40, 80]；显示 eq2 | — |
| 3 | 大数在前凑十 | 把 {a} 拆成 {gap} 和 {rest}，{b} 和 {gap} 凑成 10。 | 显示 calc；calc.show → 3（1.6s） | — |
| 4 | 和不变 | 10 加 {rest} 等于 {s}，{a} + {b} 也等于 {s}。 | calc.blank → [r] ‖ calc.show → 4 ＋ calc.blank → []；eq1.text → `'[{a}](@small) + [{b}](@big) = [{s}](green)'` | choose 答案 {s}（min 10，max 18）“{a} + {b} 等于几？”；提示：10 再加 {rest}。 |

- 要点：两个数相加，交换位置，和不变；小数在前时，可以换成大数在前再凑十

### `compare-height-length` 比高矮、比长短
- 位置：一上 · `compare-quantity` · 3.4 · T1、T4、E4
- 元信息：summary：一端对齐，再看另一端；tags [比长短, 比高矮, 对齐, 起点]；cover “长 短”；related [measure-length]
- 舞台：800 × 400；params `la: 7`、`lb: 5`（1 单位 = 50 像素；红色总比绿色长）；explore la 滑块“红色长度” 4–10，lb 滑块“绿色长度” 3–`la - 1`
- 零件：
  - `start` = line，from [100, 70]，to [100, 260]，dashed，color line，hidden（起点线）
  - `ra` = shape rect，width `{la * 50}`，height 28，color red，at [`{100 + la * 25}`, 110]
  - `rb` = shape rect，width `{lb * 50}`，height 28，color green，at [`{220 + lb * 25}`, 200]（左端在 195，没对齐）

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 哪根长 | 红色和绿色，哪根长？ | 高亮 ra；高亮 rb | — |
| 2 | 没对齐会看错 | 两根没对齐，这样比不准。 | 高亮 rb | — |
| 3 | 一端对齐 | 先把左边对齐。 | 显示 start ‖ rb 移到 [`{100 + lb * 25}`, 200] | place rb 到 [`{100 + lb * 25}`, 200]（showGoal）“把绿色的左端拖到虚线上。”；提示：左端对齐虚线。 |
| 4 | 看另一端 | 左边对齐了，看右边，红色更长。 | ‖ 高亮 ra | tap 答案 ra（可点 ra、rb）“点出更长的那根。” |
| 5 | 比高矮也一样 | 比高矮也要先把底下对齐。 | 隐藏 start；ra 绕 [100, 330] 转 −90 ＋ rb 绕 [100, 330] 转 −90（先各自 set `at`，使左端都在 [100, 330]，再转） | — |

- 要点：比长短、比高矮，先把一端对齐；再看另一端，超出来的就长（高）

### `compare-size-weight` 比大小、比轻重
- 位置：一上 · `compare-quantity` · 3.3 · balance、T1
- 元信息：summary：叠起来比大小，往下沉的一边重；tags [比大小, 比轻重, 天平, 跷跷板]；cover “重 轻”；related [compare-height-length, gram-kilogram]
- 舞台：800 × 400；无参数
- 零件：
  - `big` = shape circle，radius 80，color orange，at [200, 160]
  - `small` = shape circle，radius 56，color blue，at [440, 160]
  - `sw` = balance，kind seesaw，left 1，right 1，leftItems [bear]，rightItems [rabbit]，width 420，at [400, 360]，hidden
  - `scale` = balance，kind beam，left 5，right 5，width 360，at [400, 360]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 哪个大 | 两个圆，哪个大？ | 高亮 big；高亮 small | — |
| 2 | 叠在一起比 | 叠在一起，大的能把小的盖住。 | ‖ small 移到 [200, 160] | tap 答案 big（可点 big、small）“点出大的那个圆。” |
| 3 | 跷跷板 | 小熊和小兔坐跷跷板。 | 隐藏 big ＋ 隐藏 small；显示 sw | — |
| 4 | 往下沉的重 | 小熊那边沉下去了，小熊重。 | sw.left → 3（1s） | tap 答案 sw.left（可点 sw.left、sw.right）“哪边重？点一点。”；提示：往下沉的那边重。 |
| 5 | 天平也一样 | 天平也是往下沉的一边重，平了就一样重。 | 隐藏 sw；显示 scale | — |

- 要点：比大小可以叠在一起比；比轻重看哪边往下沉；天平平了就一样重

### `solids-intro` 认识立体图形
- 位置：一上 · `solids-intro` · 3.7 · solid、T1
- 元信息：summary：长方体、正方体、圆柱、球；tags [立体图形, 长方体, 正方体, 圆柱, 球]；cover “■●”；related [shapes-2d-intro]；recommended
- 舞台：800 × 420；无参数
- 零件：
  - 实物：`o1` gift-box、`o2` cube-toy、`o3` can、`o4` ball（image，width/height 110），at [120 / 300 / 480 / 660, 120]
  - 图形：`s1` = solid cuboid a 3 b 2 h 2，unit 30；`s2` = solid cube a 2，unit 30；`s3` = solid cylinder r 1 h 2.4，unit 30；`s4` = solid sphere r 1.1，unit 30；at [120 / 300 / 480 / 660, 320]，hidden
  - 名称：`n1`…`n4` = label（长方体、正方体、圆柱、球），at [120 / 300 / 480 / 660, 390]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 生活中的物体 | 礼盒、魔方、罐子、皮球，形状不一样。 | 依次高亮 o1、o2、o3、o4 | — |
| 2 | 变成图形 | 画成图形，就是长方体、正方体、圆柱、球。 | 显示 s1 ＋ 显示 s2 ＋ 显示 s3 ＋ 显示 s4；显示 n1 ＋ 显示 n2 ＋ 显示 n3 ＋ 显示 n4 | — |
| 3 | 推一推 | 球往哪儿都能滚，圆柱能滚也能立住。 | s4 移到 by [50, 0]；s4 移到 by [−50, 0]；s3 移到 by [30, 0]；s3 移到 by [−30, 0] | — |
| 4 | 放得稳 | 长方体和正方体放得很稳。 | 高亮 s1 ＋ 高亮 s2 | — |
| 5 | 找一找 | 哪个是圆柱？ | ‖ 高亮 s3 | tap 答案 s3（可点 s1、s2、s3、s4）“点出圆柱。” |

- 要点：长方体、正方体有平平的面，放得稳；圆柱上下是圆，能滚也能立住；球往哪个方向都能滚

### `classify-single` 按一个标准分类
- 位置：一上 · `classify-1` · 3.1 · item-set、table、T3
- 元信息：summary：按同一个标准分，每样只放进一类；tags [分类, 整理, 标准, 统计表]；cover “分一分”；related [classify-count, classify-multi]
- 舞台：800 × 420；params `r: 4`、`y: 3`；explore r 滑块“红色几个” 1–5，y 滑块“黄色几个” 1–5
- 零件：
  - `items` = item-set，items `[{ repeat: '{r}', shape: circle, color: red, tags: { color: red } }, { repeat: '{y}', shape: circle, color: yellow, tags: { color: yellow } }]`，layout pile，size 52，at [80, 60]
  - `binR` = shape rect，width 240，height 130，fill false，stroke red，at [180, 330]
  - `binY` = shape rect，width 240，height 130，fill false，stroke yellow，at [520, 330]
  - `tbl` = table，rows `[[颜色, 红色, 黄色], [个数, '[{r}](blank)', '[{y}](blank)']]`，headerCol true，colWidth 100，at [460, 60]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 一堆圆片 | 圆片乱乱的，按颜色分一分。 | 高亮 items | — |
| 2 | 放进筐里 | 红色放左边，黄色放右边。 | 重复 r 次：items.{i} 移到 binR；重复 y 次：items.{r + i} 移到 binY | sort items 按 color 到 { red: binR, yellow: binY }“按颜色把圆片放进筐里。”；提示：红色的放进红框里。 |
| 3 | 数一数 | 红色 {r} 个，黄色 {y} 个。 | 显示 tbl ‖ tbl.rows → `[[颜色, 红色, 黄色], [个数, '{r}', '{y}']]` | choose 答案 {r}（min 1，max 6）“红色有几个？” |
| 4 | 记下来 | 分好、数好，记在统计表里。 | 高亮 tbl | — |

- 说明：物品 `移到` 筐的 id 时，落点按 T3 的筐内网格排列（T3 卡负责 `do` 播放时也这样排）。
- 要点：分类时要按同一个标准；每样东西只能分进一类；分好后数一数、记下来

### `classify-count` 分类后数一数
- 位置：一上 · `classify-1` · 3.5 · item-set、chart（picto）、T1
- 元信息：summary：分好的东西排整齐，哪类多一眼看出来；tags [分类, 统计, 比多少, 象形]；cover “▮▮▯”；related [classify-single, pictograph]
- 舞台：800 × 420；params `a: 5`、`b: 3`、`c: 4`；presets：`{a:5,b:3,c:4}`（标签“苹果最多”）、`{a:2,b:6,c:4}`（“梨最多”）、`{a:3,b:4,c:6}`（“桃最多”）；derived `most: a > b && a > c ? 1 : (b > c ? 2 : 3)`
- 零件：
  - `pile` = item-set，items `[{ repeat: '{a}', asset: apple }, { repeat: '{b}', asset: pear }, { repeat: '{c}', asset: peach }]`，pile，size 48，at [40, 60]
  - `pic` = chart，kind picto，categories [苹果, 梨, 桃]，values [`{a}`, `{b}`, `{c}`]，icon [apple, pear, peach]，width 300，height 280，show 0，at [440, 360]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 水果有多少 | 一堆水果，哪种最多？ | 高亮 pile | — |
| 2 | 排成一列一列 | 每种排成一列，底下对齐。 | pic.show → 1（2s） ＋ pile.opacity → 0.3 | — |
| 3 | 哪种最多 | 最高的那一列最多。 | ‖ 高亮 pic.col.{most} | tap 答案 pic.col.{most}（可点 pic.col.*）“点出最多的那种水果。”；提示：看哪一列最高。 |
| 4 | 差几个 | 苹果和梨差 {abs(a - b)} 个。 | 高亮 pic.col.1 ＋ 高亮 pic.col.2 | — |

- 要点：分好的东西排成一列一列，底下对齐，就能比出多少；最高的一列最多

---

## 一年级下册

### `count-to-100` 数数：十个十是一百
- 位置：一下 · `numbers-100` · 3.1 · base-ten、T1
- 元信息：summary：10 根捆成一捆是 1 个十，10 个十是一百；tags [数数, 一百, 十个一, 捆小棒, 计数单位]；cover “10个十”；related [place-value-100, tens-add-sub]；recommended
- 舞台：800 × 400；无参数
- 零件：
  - `sticks` = base-ten，style stick，ones 0，tens 0，columns true，at [80, 60]
  - `cnt` = text，text `'{value}'`，value 0，size 56，at [660, 120]
  - `note` = label，text `10 个一是 1 个十`，at [660, 220]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 一根一根数 | 一根一根数小棒：1、2、3……9。 | sticks.ones → 9（3s，linear） ＋ count cnt 0→9（3s） | — |
| 2 | 满十捆一捆 | 再添一根是 10 根，捆成一捆，是 1 个十。 | sticks.ones → 10 ＋ cnt.value → 10；显示 note ‖ sticks.ones → 0 ＋ sticks.tens → 1 | tap 答案 sticks.ones（可点 sticks.ones）“10 根了，点一下把它们捆起来。”；提示：点个位那一堆小棒。 |
| 3 | 一捆一捆数 | 一捆一捆地数：一十、二十……九十。 | 重复 8 次：sticks.tens → {i + 1}（0.4s） ＋ cnt.value → {(i + 1) * 10} | — |
| 4 | 接着数 | 九十九再添一根，是一百。 | sticks.ones → 9 ＋ cnt.value → 99；sticks.ones → 10 ‖ sticks.ones → 0 ＋ sticks.tens → 10 ＋ cnt.value → 100 | choose 答案 100（选项 99 100 110）“九十九再添一是多少？” |
| 5 | 十个十 | 10 个十是一百。 | 高亮 sticks.tens | — |

- 要点：10 个一是 1 个十；10 个十是一百；数到九十九，再添一就是一百

### `place-value-100` 数的组成与读写
- 位置：一下 · `numbers-100` · 3.1 · place-value、base-ten、F2（cn）
- 元信息：summary：十位写几个十，个位写几个一；tags [数位, 十位, 个位, 计数器, 读数, 写数]；cover “35”；related [count-to-100, order-compare-100]
- 舞台：800 × 420；params `t: 3`、`o: 5`；derived `n: t * 10 + o`；explore t 滑块“几个十” 1–9，o 滑块“几个一” 1–9
- 零件：
  - `blocks` = base-ten，style stick，tens `{t}`，ones `{o}`，at [40, 60]
  - `abacus` = place-value，value 0，places 1，style abacus，at [580, 190]
  - `num` = text，text `'[{n}](blank)'`，size 56，at [580, 380]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 几个十几个一 | {t} 捆是 {t} 个十，{o} 根是 {o} 个一。 | 高亮 blocks.tens；高亮 blocks.ones | — |
| 2 | 拨十位 | 计数器十位上拨 {t} 颗珠子。 | 高亮 abacus.d1 ‖ abacus.value → {t * 10} | choose 答案 {t}（min 1，max 9）“十位上拨几颗？” |
| 3 | 拨个位 | 个位上拨 {o} 颗。 | 高亮 abacus.d0 ‖ abacus.value → {n} | choose 答案 {o}（min 0，max 9）“个位上拨几颗？” |
| 4 | 写出来 | 这个数是 {n}，读作{cn(n)}。 | 高亮 abacus ‖ num.text → `'{n}'` | choose 答案 {n}（min 10，max 99）“这个数是多少？” |
| 5 | 0 占位 | 如果个位一颗也没有，要写 0 占位。 | abacus.value → {t * 10} ＋ num.text → `'{t * 10}'`；高亮 abacus.d0 | — |

- 要点：两位数由几个十和几个一组成；十位上的数表示几个十，个位上的数表示几个一；哪一位一个也没有，写 0 占位

### `order-compare-100` 数的顺序与大小比较
- 位置：一下 · `numbers-100` · 3.1 · number-chart、T1、F2（sel）
- 元信息：summary：百数表横看多 1、竖看多 10；比大小先比十位；tags [百数表, 数的顺序, 比大小, 十位]；cover “百数表”；related [place-value-100, compare-within-10]
- 舞台：800 × 450；params `a: 47`、`b: 52`；explore a 滑块 10–99，b 滑块 10–99
- 零件：
  - `chart` = number-chart，from 1，to 100，cols 10，cell 38，at [20, 30]
  - `cmp` = text，`'[{a}](blue) [>](blank) [{b}](orange)'`，size 44，at [620, 200]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 百数表 | 1 到 100 排成一张表，一行 10 个。 | 高亮 chart | — |
| 2 | 横着看 | 横着往右，每次多 1。 | 高亮 chart.row.3 | — |
| 3 | 竖着看 | 竖着往下，每次多 10。 | 高亮 chart.col.7 | — |
| 4 | 找一找 | {a} 在这里。 | ‖ 高亮 chart.n.{a} | tap 答案 chart.n.{a}（可点 chart.n.*）“在表里点出 {a}。”；提示：先找十位是 {floor(a / 10)} 的那一行。 |
| 5 | 比大小 | 先比十位，十位大的就大；十位一样再比个位。 | 高亮 cmp ‖ cmp.text → `'[{a}](blue) {sel(a > b, '>', sel(a < b, '<', '='))} [{b}](orange)'` | choose 答案 `{sel(a > b, '>', sel(a < b, '<', '='))}`（选项 > = <）“{a} 和 {b} 比大小。” |

- 要点：百数表横着看相邻两个数差 1，竖着看差 10；比两位数先比十位，十位相同再比个位

### `think-add-for-sub` 想加算减法
- 位置：一下 · `subtract-within-20` · 3.1 · number-bond
- 元信息：summary：算减法时想“几加几等于这个数”；tags [想加算减, 退位减法, 十几减几]；cover “13−9”；related [borrow-ten, level-ten, add-sub-by-bond]
- 舞台：800 × 360；params `a: 13`、`b: 9`；derived `r: a - b`；explore a 滑块“被减数” 11–18，b 滑块“减数” `a - 9`–9
- 零件：
  - `bond` = number-bond，whole `{a}`，parts [`{b}`, `{r}`]，show 1，blank [q]，colors `{ whole: green, p: blue, q: orange }`，at [200, 70]
  - `add` = text，`'[{b}](blue) + [?](blank) = [{a}](green)'`，size 40，at [580, 110]
  - `sub` = text，`'[{a}](green) − [{b}](blue) = [?](blank)'`，size 40，at [580, 210]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 提出问题 | {a} 减 {b} 等于几？ | 高亮 sub | — |
| 2 | 想加法 | 想：{b} 加几等于 {a}？{b} 加 {r} 等于 {a}。 | bond.show → 2 ＋ 高亮 add ‖ add.text → `'[{b}](blue) + [{r}](orange) = [{a}](green)'` ＋ bond.blank → [] | choose 答案 {r}（min 1，max 9）“{b} 加几等于 {a}？”；提示：从 {b} 往后数到 {a}，数了几下？ |
| 3 | 得出减法 | 所以 {a} − {b} = {r}。 | sub.text → `'[{a}](green) − [{b}](blue) = [{r}](orange)'`；高亮 sub | — |

- 要点：做减法可以想加法：{b} 加几等于 {a}，{a} 减 {b} 就等于几；加法和减法互相联系

### `tens-add-sub` 整十数加减整十数
- 位置：一下 · `add-sub-100-oral` · 3.1 · base-ten
- 元信息：summary：几个十加减几个十；tags [整十数, 口算, 加法, 减法]；cover “30+20”；related [count-to-100, two-digit-add]
- 舞台：800 × 400；params `a: 3`、`b: 2`（几个十）；derived `s: a + b`；explore a 滑块 1–8，b 滑块 1–`9 - a`
- 零件：
  - `x` = base-ten，tens `{a}`，columns false，color blue，at [40, 70]
  - `y` = base-ten，tens `{b}`，columns false，color orange，at [380, 70]
  - `think` = label，`'{a} 个十 + {b} 个十 = {s} 个十'`，at [400, 260]，hidden
  - `eq` = text，`'{a * 10} + {b * 10} = [{s * 10}](blank)'`，size 44，at [400, 340]
  - `eq2` = text，`'{s * 10} − {b * 10} = {a * 10}'`，size 36，at [400, 390]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 几捆 | {a * 10} 是 {a} 捆，{b * 10} 是 {b} 捆。 | 高亮 x；高亮 y | — |
| 2 | 合起来 | 合起来一共 {s} 捆。 | y 移到 [`{60 + a * 22}`, 70]；显示 think | — |
| 3 | 得数 | {s} 个十是 {s * 10}。 | 高亮 think ‖ eq.text → `'{a * 10} + {b * 10} = [{s * 10}](green)'` | choose 答案 {s * 10}（选项 {s}、{s * 10}、{s * 10 + 10}）“{a * 10} + {b * 10} 等于几？” |
| 4 | 减法也一样 | 减法也一样：{s} 个十减 {b} 个十，是 {a} 个十。 | 显示 eq2 | — |

- 要点：整十数加减，想几个十加减几个十；算出几个十，就是几十

### `two-digit-add` 两位数加一位数、整十数
- 位置：一下 · `add-sub-100-oral` · 3.1 · base-ten、E2
- 元信息：summary：相同数位对齐，个位加个位，满十进一；tags [两位数加一位数, 进位, 口算]；cover “36+8”；related [tens-add-sub, column-intro, make-ten]
- 舞台：800 × 420；params `a: 36`、`b: 8`；derived `t: floor(a / 10)`、`o: a % 10`、`s: a + b`、`carry: o + b >= 10`；explore a 滑块“两位数” 11–89，b 滑块“一位数” 1–9
- 零件：
  - `x` = base-ten，tens `{t}`，ones `{o}`，columns true，at [40, 60]
  - `y` = base-ten，ones `{b}`，columns true，color orange，at [40, 270]
  - `eq` = text，`'[{a}](blue) + [{b}](orange) = [{s}](blank)'`，size 44，at [620, 140]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 摆小棒 | {a} 是 {t} 捆和 {o} 根，再加 {b} 根。 | 高亮 x；高亮 y | — |
| 2 | 个位和个位加 | 根和根放一起：{o} 加 {b} 是 {o + b} 根。 | x.ones → {o + b} ＋ y.opacity → 0 | — |
| 3（when `{carry}`） | 满十捆一捆 | 满 10 根，捆成一捆，放到十位。 | ‖ x.ones → {o + b - 10} ＋ x.tens → {t + 1} | tap 答案 x.ones（可点 x.ones）“满十了，点一下捆起来。” |
| 4 | 得数 | 一共 {floor(s / 10)} 捆和 {s % 10} 根，是 {s}。 | 高亮 x ‖ eq.text → `'[{a}](blue) + [{b}](orange) = [{s}](green)'` | choose 答案 {s}（min 12，max 98） |

- 要点：相同数位对齐，个位加个位；个位满十，向十位进一

### `two-digit-sub` 两位数减一位数、整十数（不退位）
- 位置：一下 · `add-sub-100-oral` · 3.1 · base-ten
- 元信息：summary：个位减个位，十位减十位；tags [两位数减一位数, 减整十数, 口算]；cover “48−5”；related [break-ten, two-digit-add]
- 舞台：800 × 400；params `a: 48`、`b: 5`；derived `r: a - b`；presets（不用 explore，保证不退位）：`48 − 5`、`67 − 4`、`39 − 6`、`85 − 30`、`76 − 50`
- 零件：
  - `x` = base-ten，tens `{floor(a / 10)}`，ones `{a % 10}`，at [40, 80]
  - `eq` = text，`'[{a}](blue) − [{b}](orange) = [{r}](blank)'`，size 44，at [600, 160]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 摆小棒 | {a} 是 {floor(a / 10)} 捆和 {a % 10} 根。 | 高亮 x | — |
| 2 | 拿走 | 减一位数从根里拿，减整十数拿走几捆。 | x.ones → {a % 10 - b % 10} ＋ x.tens → {floor(a / 10) - floor(b / 10)} | — |
| 3 | 得数 | 还剩 {r}。 | 高亮 x ‖ eq.text → `'[{a}](blue) − [{b}](orange) = [{r}](green)'` | choose 答案 {r}（min 1，max 99） |

- 要点：减一位数，个位减个位；减整十数，十位减十位；个位不够减时用“破十法”

### `column-intro` 竖式初步（加法）
- 位置：一下 · `add-sub-100-oral` · 3.1 · column-calc（+）、base-ten
- 元信息：summary：竖式里相同数位对齐，从个位算起；tags [竖式, 笔算, 数位对齐]；cover “竖式”；related [two-digit-add, column-add-100]
- 舞台：800 × 420；params `a: 34`、`b: 25`；presets：`34 + 25`、`47 + 2`、`52 + 36`、`61 + 8`（都不进位；减法竖式在 `column-sub-100`）
- 零件：
  - `x` = base-ten，tens `{floor(a / 10)}`，ones `{a % 10}`，at [40, 60]
  - `y` = base-ten，tens `{floor(b / 10)}`，ones `{b % 10}`，color orange，at [40, 240]
  - `calc` = column-calc，a `{a}`，b `{b}`，op +，show 0，at [600, 200]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 横式变竖式 | 竖着写，十位对十位，个位对个位。 | 高亮 calc | — |
| 2 | 先算个位 | 先算个位：{a % 10} + {b % 10} = {a % 10 + b % 10}。 | 高亮 x.ones ＋ 高亮 y.ones ‖ calc.show → 1 | choose 答案 {a % 10 + b % 10}（min 0，max 9）“个位上写几？” |
| 3 | 再算十位 | 再算十位：{floor(a / 10)} + {floor(b / 10)} = {floor(a / 10) + floor(b / 10)}。 | 高亮 x.tens ＋ 高亮 y.tens ‖ calc.show → 2 | choose 答案 {floor(a / 10) + floor(b / 10)}（min 0，max 9）“十位上写几？” |
| 4 | 得数 | 所以 {a} + {b} = {a + b}。 | 高亮 calc | — |

- 要点：用竖式计算，相同数位要对齐；从个位算起

### `continuous-add-sub` 连加、连减与加减混合
- 位置：一下 · `add-sub-100-oral` · 3.1 · item-set、expr-steps
- 元信息：summary：从左往右一步一步算，上一步的得数接着算；tags [连加, 连减, 加减混合, 运算顺序]；cover “8+5−3”；related [two-digit-add]
- 舞台：800 × 420；params `a: 8`、`b: 5`、`c: 3`；derived `m: a + b`、`r: a + b - c`；explore a 滑块“车上原来” 3–10，b 滑块“上车” 1–6，c 滑块“下车” 1–`a + b - 1`
- 零件：
  - `bus` = image asset bus，width 460，height 200，at [260, 160]
  - `people` = item-set，items `[{ repeat: '{m}', asset: kid }]`，layout grid，cols 8，size 34，show `{a}`，at [70, 100]
  - `eq` = expr-steps，lines [`'{a} + {b} − {c}'`, `'{m} − {c}'`, `'{r}'`]，show 1，underline true，at [540, 60]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 车上原来 | 车上原来有 {a} 人。 | 高亮 people | — |
| 2 | 上车 | 到站了，上来 {b} 人。 | people.show → {m}（1.5s） | — |
| 3 | 先算前两个 | 从左往右，先算 {a} + {b} = {m}。 | 高亮 eq.op.1 ‖ eq.show → 2 | choose 答案 {m}（min 2，max 20）“车上现在有几人？” |
| 4 | 下车 | 又下去 {c} 人，{m} − {c} = {r}。 | people.show → {r}（1.5s） ‖ eq.show → 3 | choose 答案 {r}（min 0，max 19）“现在车上有几人？” |

- 要点：连加、连减、加减混合，都从左往右依次算；前一步的得数是下一步的开头

### `money-intro` 认识元、角、分与换算
- 位置：一下 · `money-1` · 3.3 · money、T5
- 元信息：summary：1 元 = 10 角，1 角 = 10 分；tags [人民币, 元, 角, 分, 换钱]；cover “1元=10角”；related [money-shopping-1, decimal-intro]；recommended
- 舞台：800 × 420；无参数
- 零件：
  - `all` = money，items [100, '1n', 5, 1, 0.5, 0.1, 0.05, 0.01]，layout row，size 0.9，at [30, 60]
  - `one` = money，items [1]，at [80, 230]，hidden
  - `ten` = money，items [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]，layout row，size 0.9，show 0，at [220, 230]，hidden（money 和 item-set 一样有 `show`）
  - `eq` = text，`'1 元 = [10](blank) 角'`，size 40，at [520, 360]
  - `wallet` = money，items [0.5, 0.5, 0.1, 0.1, 0.1, 0.1, 0.1]，layout row，at [40, 230]，hidden
  - `tray` = shape rect，width 260，height 110，fill false，stroke line，at [620, 260]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 认识人民币 | 人民币有纸币和硬币，单位是元、角、分。 | 重复 8 次：高亮 all.{i}（0.5s） | — |
| 2 | 1 元换角 | 1 元可以换 10 个 1 角。 | 隐藏 all；显示 one；显示 ten；ten.show → 10（2s） ‖ eq.text → `'1 元 = 10 角'` | choose 答案 10（选项 1 5 10）“1 元能换几个 1 角？”；提示：数一数 1 角的硬币。 |
| 3 | 1 角换分 | 1 角可以换 10 个 1 分。 | eq.text → `'1 角 = 10 分'` | — |
| 4 | 凑一凑 | 两个 5 角合起来就是 1 元。 | 隐藏 one ＋ 隐藏 ten；显示 wallet ＋ 显示 tray ‖ wallet.1 移到 tray；wallet.2 移到 tray | 付钱 wallet → tray 共 1 元“从下面拿硬币，凑出 1 元。”；提示：两个 5 角就是 1 元。 |

- 说明：`money` 和 `item-set` 一样支持 `show`、`hiddenItems`（B8 照 B1 实现）；`wallet.1 移到 tray` 是 T5 的标准做法。
- 要点：人民币的单位有元、角、分；1 元 = 10 角，1 角 = 10 分；同样多的钱可以有不同的组成

### `money-shopping-1` 简单的购物计算
- 位置：一下 · `money-1` · 3.3 · money、T5、E2
- 元信息：summary：付的钱减价格，就是找回的钱；tags [购物, 付钱, 找零, 人民币]；cover “找零”；related [money-intro, money-shopping-2]
- 舞台：800 × 420；params `p: 7`；derived `back: 10 - p`；explore p 滑块“价格” 1–9
- 零件：
  - `toy` = image asset toy-car，width 140，height 100，at [140, 110]
  - `tag` = label，`'{p} 元'`，at [140, 200]
  - `wallet` = money，items [5, 1, 1, 1, 1, 1, '10n']，layout row，size 0.8，at [40, 290]
  - `tray` = shape rect，width 260，height 110，fill false，stroke line，at [620, 150]
  - `eq` = text，`'10 − {p} = [{back}](blank)（元）'`，size 36，at [580, 330]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 看价格 | 小汽车 {p} 元。 | 高亮 tag | — |
| 2a（when `{p >= 5}`） | 正好付钱 | 正好付 {p} 元：一张 5 元，再加 {p - 5} 个 1 元。 | ‖ wallet.1 移到 tray；重复 p − 5 次：wallet.{i + 1} 移到 tray | 付钱 wallet → tray 共 {p} 元“付出正好 {p} 元。”；提示：先放一张 5 元。 |
| 2b（when `{p < 5}`） | 正好付钱 | 正好付 {p} 元：{p} 个 1 元。 | ‖ 重复 p 次：wallet.{i + 1} 移到 tray | 付钱 wallet → tray 共 {p} 元“付出正好 {p} 元。” |
| 3 | 付 10 元找零 | 付 10 元，找回 {back} 元。 | 显示 eq ‖ eq.text → `'10 − {p} = [{back}](green)（元）'` | choose 答案 {back}（min 1，max 9）“付 10 元，找回几元？” |

- 要点：付钱可以有不同的付法；找回的钱 = 付的钱 − 价格

### `shapes-2d-intro` 认识长方形、正方形、三角形、圆
- 位置：一下 · `shapes-2d` · 3.7 · solid、T1
- 元信息：summary：立体图形的面印下来，就是平面图形；tags [平面图形, 长方形, 正方形, 三角形, 圆]；cover “▭○△”；related [solids-intro, shapes-compose]
- 舞台：800 × 420；无参数
- 零件：
  - `s1` = solid cuboid a 3 b 2 h 1.5，unit 30；`s2` = solid cube a 1.8，unit 30；`s3` = solid cylinder r 0.9 h 2，unit 30；`s4` = image asset tri-block，width 110，height 90；at [110 / 290 / 460 / 640, 190]
  - `f1` = shape rect 120 × 60；`f2` = shape rect 72 × 72；`f3` = shape circle radius 36；`f4` = shape triangle width 80 height 70；at [110 / 290 / 460 / 640, 320]，hidden
  - `n1`…`n4` = label（长方形、正方形、圆、三角形），at [110 / 290 / 460 / 640, 395]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 印一印 | 把积木的一个面印在纸上。 | 高亮 s1.face.front | — |
| 2 | 长方形和正方形 | 长方体印出长方形，正方体印出正方形。 | 显示 f1 ＋ 显示 n1；显示 f2 ＋ 显示 n2 | — |
| 3 | 圆和三角形 | 圆柱印出圆，这块积木印出三角形。 | 显示 f3 ＋ 显示 n3；显示 f4 ＋ 显示 n4 | — |
| 4 | 找一找 | 四条边一样长的是正方形。 | ‖ 高亮 f2 | tap 答案 f2（可点 f1、f2、f3、f4）“点出正方形。”；提示：四条边一样长的。 |

- 要点：立体图形的面印下来就是平面图形；长方形、正方形、三角形、圆是常见的平面图形

### `shapes-compose` 图形的拼组
- 位置：一下 · `shapes-2d` · 3.4 · polygon、E4、E5、T4
- 元信息：summary：两个同样的三角形能拼成新图形；tags [图形拼组, 拼一拼, 三角形, 正方形]；cover “△+△”；related [tangram, shapes-2d-intro]
- 舞台：800 × 420；无参数
- 零件：
  - `t1` = polygon，points [[100, 300], [260, 300], [100, 140]]，color blue
  - `t2` = polygon，points [[420, 300], [580, 300], [420, 140]]，color orange
  - `goal` = polygon，points [[260, 300], [260, 140], [100, 140]]，dashed，fill false，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 两个三角形 | 两个一模一样的三角形。 | 高亮 t1；高亮 t2 | — |
| 2 | 拼成正方形 | 转一转、拼一拼，拼成一个正方形。 | 显示 goal ‖ t2 绕 [500, 220] 转 180；t2.points → [[260, 140], [100, 140], [260, 300]]；隐藏 goal | place t2 到 [180, 220]（转 180，showGoal）“把橙色三角形转一转，拼成正方形。”；提示：转半圈再放上去。 |
| 3 | 拼成大三角形 | 换一种拼法，拼成一个大三角形。 | t2.points → [[260, 300], [420, 300], [260, 140]] | — |
| 4 | 数一数 | 大三角形里有 3 个三角形。 | ‖ 高亮 t1 ＋ 高亮 t2 | choose 答案 3（选项 2 3 4）“现在一共有几个三角形？”；提示：两个小的，还有拼成的大的。 |

- 说明：第 2 步 place 的 `to` 是 t2 包围盒中心的目标位置；第 3 步 t2 直接变到新位置（points 数组插值，F1），形成“滑过去”的动画。
- 要点：两个完全一样的三角形可以拼成正方形、大三角形等；数图形时别忘了拼成的大图形

### `classify-multi` 按不同标准分类
- 位置：一下 · `classify-2` · 3.1 · item-set、T3
- 元信息：summary：标准不同，分法不同，总数不变；tags [分类, 标准, 按形状, 按颜色]；cover “分两次”；related [classify-single]
- 舞台：800 × 420；无参数（红圆 2、红方 2、蓝圆 3、蓝方 1，共 8 个）
- 零件：
  - `items` = item-set，items：`{ repeat: 2, shape: circle, color: red, tags: { color: red, shape: circle } }`、`{ repeat: 2, shape: square, color: red, tags: { color: red, shape: square } }`、`{ repeat: 3, shape: circle, color: blue, tags: { color: blue, shape: circle } }`、`{ repeat: 1, shape: square, color: blue, tags: { color: blue, shape: square } }`，pile，size 52，at [80, 60]
  - `b1` = shape rect 240 × 130 fill false，at [180, 330]；`b2` = 同，at [520, 330]
  - `l1` = label，`红色`，at [180, 250]；`l2` = label，`蓝色`，at [520, 250]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 按颜色分 | 先按颜色分。 | ‖ 红色 4 个（items.1–4）移到 b1；蓝色 4 个（items.5–8）移到 b2 | sort items 按 color 到 { red: b1, blue: b2 }“按颜色分。” |
| 2 | 数一数 | 红色 4 个，蓝色 4 个，一共 8 个。 | 高亮 b1 ＋ 高亮 b2 | — |
| 3 | 按形状分 | 再按形状分。 | l1.text → 圆形 ＋ l2.text → 方形 ‖ 圆形（items.1、2、5、6、7）移到 b1；方形（items.3、4、8）移到 b2 | sort items 按 shape 到 { circle: b1, square: b2 }“这次按形状分。” |
| 4 | 比一比 | 分法不一样，但总数还是 8 个。 | ‖ 高亮 b1 | choose 答案 5（min 1，max 8）“圆形有几个？” |

- 说明：有 sort 的步骤开头，物品都在 item-set 自身的布局位置（T3 的 sortFrame 每步重置），所以第 3 步“倒出来”不用写动作。
- 要点：分类的标准不同，分出的结果不同；不管怎么分，总数不变

### `data-collect-1` 简单数据的收集与整理
- 位置：一下 · `classify-2` · 3.5 · table（tally）
- 元信息：summary：一票画一笔，整理成统计表；tags [数据收集, 统计表, 投票, 正字]；cover “正正”；related [classify-single, survey-table]
- 舞台：800 × 420；params `a: 7`、`b: 4`、`c: 5`；presets `{7,4,5}`、`{3,8,6}`、`{6,5,9}`
- 零件：
  - `fruits` = item-set，items [apple, banana, strawberry]（asset），row，size 64，gap 66，at [190, 40]
  - `rec` = table，rows `[[水果, 苹果, 香蕉, 草莓], [记录, '{a}', '{b}', '{c}']]`，headerCol true，tally true，tallyShow 0，colWidth 130，at [60, 150]
  - `cnt` = table，rows `[[票数, '[{a}](blank)', '[{b}](blank)', '[{c}](blank)']]`，header false，headerCol true，colWidth 130，at [60, 250]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 投票 | 大家最喜欢哪种水果？每人投一票。 | 高亮 fruits | — |
| 2 | 画正字 | 一票画一笔，五笔是一个“正”。 | rec.tallyShow → {a + b + c}（4s，linear） | — |
| 3 | 数一数 | 苹果有 {a} 票。 | 高亮 rec.cell.2.2 ‖ cnt.rows → `[[票数, '{a}', '[{b}](blank)', '[{c}](blank)']]` | choose 答案 {a}（min 1，max 10）“苹果有几票？”；提示：一个“正”是 5 票。 |
| 4 | 填好统计表 | 填好票数，就能看出哪种最多。 | cnt.rows → `[[票数, '{a}', '{b}', '{c}']]`；高亮 cnt | — |

- 要点：收集数据可以用画“正”字的方法记录；整理成统计表，一眼就能看出多少
