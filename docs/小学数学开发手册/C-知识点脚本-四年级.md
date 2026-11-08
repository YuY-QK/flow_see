# C · 知识点脚本 · 四年级（33 个）

> 格式和记号见 [README 第 6 节](./README.md#6-知识点脚本c-文件的格式)。
> **竖式小步编号**：脚本里 `calc.show → n` 的 n 是按 A 文件 X1–X3 的规则算的；写配置时用零件导出的 `columnCalcPlan()` 对每个参数组合核对，以它为准（只调数值，不改步骤结构）。本文件所有竖式都适用这条。

---

## 四年级上册

### `big-numbers-read` 亿以内、亿以上数的读写
- 位置：四上 · `big-numbers` · 3.1 · place-value（groups）、F2（cn）
- 元信息：summary：从右往左四位一级，按级读、按级写；tags [大数, 亿, 万, 数位顺序表, 读数, 写数]；cover “亿 万 个”；related [read-write-10000, big-numbers-round]；recommended
- 舞台：800 × 420；params `n: 305000060`；presets：`305000060`、`40020000`、`1200500`、`2008000000`
- 零件：
  - `pv` = place-value，value `{n}`，places 9，style chart，groups true，at [400, 120]
  - `read` = text，`'读作：[{cn(n)}](blank)'`，size 32，at [400, 300]
  - `rule` = text，`'先读亿级，再读万级，最后读个级'`，size 24，at [400, 370]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 数位顺序表 | 从右往左，每四位是一级：个级、万级、亿级。 | 高亮 pv | — |
| 2 | 分级 | {n} 从右往左四位一分。 | 高亮 pv.d0 ＋ 高亮 pv.d4 ＋ 高亮 pv.d8（每级最低位） | — |
| 3 | 按级读 | 先读亿级，再读万级，最后读个级；每级末尾的 0 不读，中间的 0 只读一个零。 | 显示 rule ‖ read.text → `'读作：{cn(n)}'` | choose 答案 `{cn(n)}`（选项：每个 preset 的三个读法写在下面）“{n} 怎么读？” |

- choose 的选项（按 preset，用 E2 把第 3 步拆成四个带 `when` 的步骤 3a–3d，条件 `{n == 305000060}` 等，讲解、画面相同，只有选项不同）：
  - 305000060：三亿零五百万零六十 / 三亿五百万六十 / 三亿零五百零六十
  - 40020000：四千零二万 / 四千二万 / 四千万零二万
  - 1200500：一百二十万零五百 / 一百二十万五百 / 一百二十万零五百零
  - 2008000000：二十亿零八百万 / 二十亿八百万 / 两亿零八百万
- 要点：从个位起，每四个数位是一级；读数时从高位读起，先读亿级、万级，再读个级；每级末尾的 0 不读，其他数位上连续几个 0 只读一个零

### `big-numbers-round` 改写与近似数
- 位置：四上 · `big-numbers` · 3.1 · place-value、numberline（X4 zoom）
- 元信息：summary：整万数改写去掉末尾 4 个 0；求近似数用四舍五入；tags [改写, 近似数, 四舍五入, 万作单位, 亿作单位]；cover “≈38万”；related [big-numbers-read, compare-10000]
- 舞台：800 × 420；params `n: 376800`；derived `w: round(n / 10000)`；explore n 滑块 100000–999999（步长 100）
- 零件：
  - `pv` = place-value，value `{n}`，places 5，style chart，at [400, 80]
  - `line` = numberline，from `{floor(n / 10000) * 10000}`，to `{floor(n / 10000) * 10000 + 10000}`，step 1000，labelEvery 5，length 600，marks [`{n}`]，at [100, 210]
  - `ans` = text，`'{n} ≈ [{w}](blank) 万'`，size 36，at [400, 330]
  - `rule` = text，`'看千位：{digit(n, 3)} {sel(digit(n, 3) >= 5, '≥ 5，向万位进 1', '< 5，舍去')}'`，size 26，at [400, 390]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 改写成“万” | 整万数改写成用“万”作单位，去掉末尾 4 个 0，加上“万”字。 | 高亮 pv | — |
| 2 | 求近似数 | 不是整万数，可以求近似数：看千位上的数。 | 高亮 pv.d3；显示 rule | — |
| 3 | 四舍五入 | 千位上是 {digit(n, 3)}，{sel(digit(n, 3) >= 5, '五入', '四舍')}，{n} 更接近 {w} 万。 | 高亮 line ‖ ans.text → `'{n} ≈ {w} 万'` | choose 答案 {w}（min 10，max 100）“{n} 约等于多少万？”；提示：看千位，小于 5 舍去，大于或等于 5 进 1。 |

- 要点：整万数改写成用“万”作单位，去掉末尾 4 个 0；求近似数用“四舍五入”法：看省略部分的最高位，小于 5 舍去，大于或等于 5 向前一位进 1

### `mult-3x2` 三位数乘两位数的笔算
- 位置：四上 · `mult-3x2` · 3.2 · column-calc（X3 多位数、trimZeros）
- 元信息：summary：先用个位乘，再用十位乘，积对齐十位，最后相加；末尾有 0 的先不管 0；tags [三位数乘两位数, 笔算乘法, 竖式, 末尾有0]；cover “145×12”；related [mult-column, mult-2x2-area]
- 舞台：800 × 450；params `a: 145`、`b: 12`；presets：`145 × 12`、`236 × 34`、`350 × 24`（trimZeros）、`408 × 15`
- 零件：
  - `calc` = column-calc，a `{a}`，b `{b}`，op ×，trimZeros `{a % 10 == 0}`，show 0，at [400, 220]
  - `res` = text，`'{a} × {b} = [{a * b}](blank)'`，size 34，at [400, 420]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 列竖式 | 数位对齐{sel(a % 10 == 0, '；被乘数末尾的 0 先写在外面', '')}。 | 高亮 calc | — |
| 2 | 个位去乘 | 先用 {b % 10} 去乘 {a}，得 {a * (b % 10)}。 | ‖ calc.show → 3 | choose 答案 {a * (b % 10)}（min 0，max 9000）“{a} × {b % 10} 等于多少？” |
| 3 | 十位去乘 | 再用 {floor(b / 10)} 去乘，得 {a * floor(b / 10)} 个十，末位对齐十位。 | ‖ calc.show → 6 | choose 答案 {a * floor(b / 10)}（min 0，max 9000）“{a} × {floor(b / 10)} 等于多少？”；提示：这是几个十，末位写在十位上。 |
| 4 | 相加 | 两次的积相加{sel(a % 10 == 0, '，再把 0 补在末尾', '')}。 | calc.show → 99 ‖ res.text → `'{a} × {b} = {a * b}'` | choose 答案 {a * b}（min 100，max 30000） |

- 要点：三位数乘两位数，先用乘数个位上的数去乘，再用十位上的数去乘，所得的积末位与十位对齐，最后把两次的积相加；因数末尾有 0 时，先把 0 前面的数相乘，再在积的末尾添上 0

### `div-2digit` 除数是两位数的笔算（试商）
- 位置：四上 · `div-2digit` · 3.2 · column-calc（X2）
- 元信息：summary：把除数看作接近的整十数来试商；tags [除数是两位数, 试商, 笔算除法, 四舍五入]；cover “156÷12”；related [div-column-1, div-adjust]；recommended
- 舞台：800 × 450；params `a: 156`、`d: 12`；derived `q: floor(a / d)`、`r: a % d`；presets：`92 ÷ 23`、`156 ÷ 12`、`378 ÷ 42`、`912 ÷ 38`
- 零件：
  - `calc` = column-calc，a `{a}`，b `{d}`，op ÷，show 0，at [300, 220]
  - `think` = text，`'把 {d} 看作 {round(d / 10) * 10}'`，size 28，at [600, 100]
  - `res` = text，`'{a} ÷ {d} = [{q}](blank) …… {r}'`，size 32，at [600, 400]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 看前几位 | 除数是两位数，先看被除数前两位，不够除就看前三位。 | 高亮 calc | — |
| 2 | 试商 | 把 {d} 看作 {round(d / 10) * 10} 来试商。 | 高亮 think | — |
| 3（repeat `{len(q)}`） | 第 {i} 次除 | 这一位商 {digit(q, len(q) - i)}，再乘、减{sel(i < len(q), '、落', '')}。 | calc.show → {i * 4 - 4} ‖ calc.show → {i * 4} | choose 答案 {digit(q, len(q) - i)}（min 0，max 9）“这一位商几？”；提示：想 {round(d / 10) * 10} 乘几接近。 |
| 4 | 得数 | 所以 {a} ÷ {d} = {q}，余数是 {r}。 | ‖ res.text → `'{a} ÷ {d} = {q} …… {r}'` | choose 答案 {q}（min 1，max 99） |

- 要点：除数是两位数的除法，先看被除数的前两位，前两位不够除再看前三位；试商时把除数看作和它接近的整十数

### `div-adjust` 调商
- 位置：四上 · `div-2digit` · 3.2 · column-calc（X2 trial）
- 元信息：summary：乘积比被除数大，商大了改小；余数比除数大，商小了改大；tags [调商, 试商, 除数是两位数]；cover “商大了”；related [div-2digit]
- 舞台：800 × 450；params `a: 384`、`d: 48`、`tq: 7`；derived `q: floor(a / d)`；presets：`{384, 48, 7}`（把 48 看作 50 试商 7，7 × 48 = 336，余 48 不比除数小，商小了，改 8）、`{252, 36, 8}`（把 36 看作 30 试商 8，8 × 36 = 288 > 252，商大了，改 7）
- 零件：
  - `calc` = column-calc，a `{a}`，b `{d}`，op ÷，trial `{ place: 0, value: '{tq}' }`，show 0，at [300, 220]
  - `chk` = text，`'{tq} × {d} = {tq * d}'`，size 30，at [600, 120]
  - `cmp` = text，`'{sel(tq > q, '商大了', '商小了')}'`，size 32，at [600, 200]，hidden
  - `res` = text，`'{a} ÷ {d} = [{q}](blank)'`，size 34，at [600, 400]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 试商 | 把 {d} 看作整十数试商，先试 {tq}。 | calc.show → 1 | — |
| 2 | 检查 | {tq} × {d} = {tq * d}，{sel(tq > q, '比被除数大，不够减', '减完剩下的不比除数小')}。 | calc.show → 2 ＋ 高亮 chk ‖ 显示 cmp | choose 答案 `{sel(tq > q, '商大了', '商小了')}`（选项 商大了 商小了）“试的商大了还是小了？”；提示：{sel(tq > q, '积比被除数大，减不了。', '减完剩下的不比除数小，还能再分。')} |
| 3 | 调商 | 把商改成 {q}。 | calc.show → 99 ‖ res.text → `'{a} ÷ {d} = {q}'` | choose 答案 {q}（选项 {q - 1}、{q}、{q + 1}） |

- 要点：试商后，如果乘积比被除数（或被除数的前几位）大，说明商大了，要改小；如果余数比除数大，说明商小了，要改大

### `mixed-order` 运算顺序（含小括号、中括号）
- 位置：四上 · `mixed-ops` · 3.1 · expr-steps、T1
- 元信息：summary：先乘除后加减，有括号先算括号里的，中括号外、小括号里；tags [四则混合运算, 运算顺序, 小括号, 中括号]；cover “[ ( ) ]”；related [continuous-add-sub, simplify-calc, mixed-apply]；recommended
- 舞台：800 × 420；params `e: 1`（第几道）；presets：`{e: 1}` 算式 `36 + (48 − 12) × 2`、`{e: 2}` 算式 `[(5 + 3) × 4 − 2] ÷ 3`、`{e: 3}` 算式 `120 − 45 ÷ 5 × 3`
- 零件（每道一个 expr-steps，按 e 只显示一个）：
  - `x1` = expr-steps，expr `'36 + (48 − 12) × 2'`，show 1，at [120, 100]，opacity `{e == 1}`
  - `x2` = expr-steps，expr `'[(5 + 3) × 4 − 2] ÷ 3'`，show 1，at [120, 100]，opacity `{e == 2}`
  - `x3` = expr-steps，expr `'120 − 45 ÷ 5 × 3'`，show 1，at [120, 100]，opacity `{e == 3}`
  - `rules` = text，`'先乘除，后加减；有括号先算括号里面的'`，size 24，at [400, 390]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 看算式 | 先看有没有括号，再看有没有乘除。 | 高亮 rules | — |
| 2a（when `{e == 1}`） | 先算哪一步 | 有小括号，先算 48 − 12。 | ‖ x1.show → 2 | tap 答案 x1.op.2（可点 x1.op.*）“点出第一步要算的地方。”；提示：括号里的先算。 |
| 2b（when `{e == 2}`） | 先算哪一步 | 小括号在中括号里，先算 5 + 3。 | ‖ x2.show → 2 | tap 答案 x2.op.1（可点 x2.op.*） |
| 2c（when `{e == 3}`） | 先算哪一步 | 没有括号，先算乘除，从左往右，先算 45 ÷ 5。 | ‖ x3.show → 2 | tap 答案 x3.op.2（可点 x3.op.*） |
| 3 | 一步一步 | 每一步只算一处，其余照抄。 | x1.show → 99 ＋ x2.show → 99 ＋ x3.show → 99（2s） | — |

- 说明：三道题的运算符序号（expr-steps 的 `op.<n>`，按第一行从左到右）：第 1 道 `+`=1、`−`=2、`×`=3；第 2 道 `+`=1、`×`=2、`−`=3、`÷`=4；第 3 道 `−`=1、`÷`=2、`×`=3。opacity 用数字 1 / 0（条件表达式结果）。
- 要点：同级运算从左往右；先乘除，后加减；有括号先算小括号里的，再算中括号里的

### `add-laws` 加法交换律、结合律
- 位置：四上 · `operation-laws` · 3.6 · tape-diagram
- 元信息：summary：交换加数位置和不变；先加前两个或后两个，和不变；tags [加法交换律, 加法结合律, 运算定律, 简便计算]；cover “a+b=b+a”；related [commute-add, mult-laws, simplify-calc]
- 舞台：800 × 420；params `a: 88`、`b: 104`、`c: 96`；presets：`{88, 104, 96}`、`{45, 73, 27}`、`{125, 68, 75}`
- 零件：
  - `t` = tape-diagram，lens [[`{a / 20}`, `{b / 20}`]]，segLabels [[`'{a}'`, `'{b}'`]]，unit 20，at [100, 90]
  - `f1` = text，`'{a} + {b} = {b} + {a}'`，size 30，at [400, 170]，hidden
  - `law1` = text，`'a + b = b + a'`，size 28，color accent，at [400, 220]，hidden
  - `f2` = text，`'({a} + {b}) + {c} = {a} + ({b} + {c})'`，size 30，at [400, 290]，hidden
  - `law2` = text，`'(a + b) + c = a + (b + c)'`，size 28，color accent，at [400, 340]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 两段路 | 先走 {a} 米，再走 {b} 米。 | 高亮 t | — |
| 2 | 换个顺序 | 先走 {b} 米再走 {a} 米，总长一样。 | t.lens → [[`{b / 20}`, `{a / 20}`]] ＋ t.segLabels → [[`'{b}'`, `'{a}'`]]；显示 f1 | — |
| 3 | 交换律 | 两个数相加，交换位置，和不变，叫加法交换律。 | 显示 law1 | — |
| 4 | 三段路 | 三个数相加，先加前两个或先加后两个，和不变。 | t.lens → [[`{a / 20}`, `{b / 20}`, `{c / 20}`]] ＋ t.segLabels → [[`'{a}'`, `'{b}'`, `'{c}'`]]；显示 f2 | — |
| 5a（when `{a == 88}`） | 结合律 | 这叫加法结合律。104 和 96 能凑成 200，先加它们。 | 显示 law2 ‖ — | choose 答案 104 + 96（选项 88 + 104、104 + 96）“哪两个数先加更简便？” |
| 5b（when `{a == 45}`） | 结合律 | 这叫加法结合律。73 和 27 能凑成 100，先加它们。 | 显示 law2 ‖ — | choose 答案 73 + 27（选项 45 + 73、73 + 27） |
| 5c（when `{a == 125}`） | 结合律 | 这叫加法结合律。125 和 75 能凑成 200，先加它们。 | 显示 law2 ‖ — | choose 答案 125 + 75（选项 125 + 68、125 + 75） |

- 要点：加法交换律：a + b = b + a；加法结合律：(a + b) + c = a + (b + c)；运用它们把能凑成整十、整百的数先加，计算更简便

### `mult-laws` 乘法交换律、结合律
- 位置：四上 · `operation-laws` · 3.2 · counters、E4
- 元信息：summary：点阵转一转，行列互换个数不变；三个数相乘先乘哪两个积不变；tags [乘法交换律, 乘法结合律, 运算定律, 凑整]；cover “a×b=b×a”；related [add-laws, distributive-law]
- 舞台：800 × 420；params `r: 3`、`c: 5`；explore r 滑块 2–5，c 滑块 `r + 1`–7
- 零件：
  - `dots` = counters，count `{r * c}`，layout grid，cols `{c}`，size 34，color blue，at [80, 80]
  - `f1` = text，`'{r} × {c} = {c} × {r}'`，size 32，at [560, 100]，hidden
  - `law1` = text，`'a × b = b × a'`，size 28，color accent，at [560, 150]，hidden
  - `f2` = text，`'25 × 4 × 7 = 25 × (4 × 7)？　(25 × 4) × 7 = 700'`，size 26，at [400, 290]，hidden
  - `law2` = text，`'(a × b) × c = a × (b × c)'`，size 28，color accent，at [400, 340]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 点阵 | {r} 行，每行 {c} 个，{r} × {c}。 | 高亮 dots | — |
| 2 | 转一转 | 把点阵转 90 度，变成 {c} 行、每行 {r} 个，个数没变。 | dots 绕 [`{80 + c * 17}`, `{80 + r * 17}`] 转 90；显示 f1 | — |
| 3 | 交换律 | 两个数相乘，交换位置，积不变。 | 显示 law1 | — |
| 4 | 凑整 | 25 × 4 × 7：先算 25 × 4 = 100，再乘 7，更简便。 | 显示 f2 ‖ — | choose 答案 700（选项 175 700 2800）“25 × 4 × 7 等于多少？”；提示：先算 25 × 4。 |
| 5 | 结合律 | 三个数相乘，先乘前两个或后两个，积不变，叫乘法结合律。 | 显示 law2 | — |

- 要点：乘法交换律：a × b = b × a；乘法结合律：(a × b) × c = a × (b × c)；25 × 4 = 100，125 × 8 = 1000，可以先算它们

### `distributive-law` 乘法分配律
- 位置：四上 · `operation-laws` · 3.4 · grid、polygon、T4
- 元信息：summary：两块宽一样的长方形拼起来，a × c + b × c = (a + b) × c；tags [乘法分配律, 运算定律, 面积模型]；cover “(a+b)×c”；related [mult-laws, simplify-calc]；recommended
- 舞台：800 × 450；params `a: 6`、`b: 4`、`c: 5`（1 = 30 像素）；explore a 滑块 2–7，b 滑块 2–6，c 滑块 2–6
- 零件：
  - `g1` = grid，rows `{c}`，cols `{a}`，cell 30，filled `{a * c}`，color blue，at [60, 80]
  - `g2` = grid，rows `{c}`，cols `{b}`，cell 30，filled `{b * c}`，color orange，at [`{120 + a * 30}`, 80]
  - `e1` = text，`'[{a}](blue) × {c} + [{b}](orange) × {c} = {a * c + b * c}'`，size 30，at [560, 90]
  - `e2` = text，`'([{a}](blue) + [{b}](orange)) × {c} = [{(a + b) * c}](blank)'`，size 30，at [560, 160]，hidden
  - `law` = text，`'(a + b) × c = a × c + b × c'`，size 28，color accent，at [400, 400]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 两块方格 | 两块方格，宽都是 {c}，长分别是 {a} 和 {b}。 | 高亮 g1；高亮 g2 | — |
| 2 | 分开算 | 分开算面积：{a} × {c} + {b} × {c} = {a * c + b * c}。 | 高亮 e1 | — |
| 3 | 拼起来 | 把两块拼成一块。 | ‖ g2 移到 [`{60 + a * 30}`, 80] | place g2 到 [`{60 + a * 30 + b * 15}`, `{80 + c * 15}`]（showGoal）“把橙色方格拼到蓝色旁边。”；提示：对齐，不留缝。 |
| 4 | 合起来算 | 拼成长 {a + b}、宽 {c} 的长方形：({a} + {b}) × {c}。 | 显示 e2 ‖ e2.text → `'([{a}](blue) + [{b}](orange)) × {c} = {(a + b) * c}'` | choose 答案 {(a + b) * c}（min 4，max 100） |
| 5 | 分配律 | 两种算法结果一样，这叫乘法分配律。 | 显示 law | — |

- 说明：place 的 `to` 是 g2 包围盒中心（grid 的 at 是左上角，所以中心 = 左上角 + 半个宽高）。
- 要点：两个数的和与一个数相乘，可以先把它们分别与这个数相乘，再相加：(a + b) × c = a × c + b × c

### `simplify-calc` 简便运算
- 位置：四上 · `operation-laws` · 3.1 · expr-steps
- 元信息：summary：把接近整百的数拆开，用运算定律凑整；tags [简便运算, 乘法分配律, 拆数, 凑整]；cover “102×35”；related [distributive-law, add-laws, mult-laws]
- 舞台：800 × 420；params `e: 1`；presets：`{e: 1}` 102 × 35、`{e: 2}` 99 × 25、`{e: 3}` 480 − 76 − 24
- 零件：
  - `x1` = expr-steps，lines ['102 × 35', '(100 + 2) × 35', '100 × 35 + 2 × 35', '3500 + 70', '3570']，notes ['', '把 102 拆成 100 + 2', '乘法分配律', '', '']，show 1，at [100, 70]，opacity `{e == 1}`
  - `x2` = expr-steps，lines ['99 × 25', '(100 − 1) × 25', '100 × 25 − 1 × 25', '2500 − 25', '2475']，notes ['', '把 99 看成 100 − 1', '乘法分配律', '', '']，show 1，at [100, 70]，opacity `{e == 2}`
  - `x3` = expr-steps，lines ['480 − 76 − 24', '480 − (76 + 24)', '480 − 100', '380']，notes ['', '连续减两个数，等于减它们的和', '', '']，show 1，at [100, 70]，opacity `{e == 3}`

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 看数 | 先看算式里有没有接近整十、整百的数。 | 高亮 x1 ＋ 高亮 x2 ＋ 高亮 x3 | — |
| 2 | 拆一拆 | 把它拆成整百数和一个小数。 | x1.show → 2 ＋ x2.show → 2 ＋ x3.show → 2 | — |
| 3 | 用定律 | 用运算定律变形。 | x1.show → 3 ＋ x2.show → 3 ＋ x3.show → 3 | — |
| 4 | 算出结果 | 凑成整百后，口算就能算出来。 | ‖ x1.show → 99 ＋ x2.show → 99 ＋ x3.show → 99 | choose 答案 `{sel(e == 1, '3570', sel(e == 2, '2475', '380'))}`（选项按 e：`{sel(e == 1, '3570', sel(e == 2, '2475', '380'))}`、`{sel(e == 1, '3507', sel(e == 2, '2457', '480'))}`、`{sel(e == 1, '357', sel(e == 2, '2500', '400'))}`）“结果是多少？” |

- 要点：把接近整十、整百的数拆成整十、整百数加（减）一个数，再用乘法分配律；连续减去两个数，可以减去它们的和

### `protractor-use` 用量角器量角
- 位置：四上 · `angle-measure` · 3.4 · protractor、angle、T2
- 元信息：summary：中心对顶点，0 刻度线对一条边，看另一条边；从 0 起的那一圈读数；tags [量角器, 量角, 度数, 内圈, 外圈]；cover “量角器”；related [angle-measure-1, draw-angle]；recommended
- 舞台：800 × 450；params `g: 65`；explore g 滑块“角的度数” 10–170（步长 5）
- 零件：
  - `ang` = angle，from 0，size `{g}`，length 260，arc false，at [300, 360]
  - `prot` = protractor，radius 200，rotate 30，at [500, 300]（一开始没对准）
  - `ans` = text，`'这个角是 [{g}](blank)°'`，size 34，at [620, 80]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 要量的角 | 用量角器量这个角。 | 高亮 ang | — |
| 2 | 中心对顶点 | 量角器的中心对准角的顶点。 | prot 移到 [300, 360] | — |
| 3 | 0 刻度线对边 | 转一转，让 0 刻度线和角的一条边重合。 | ‖ prot.rotate → 0 | turn prot.rotate 到 0（容差 2，步长 1）“转动量角器，让 0 刻度线和下面的边对齐。”；提示：底边那条直线要和角的边重合。 |
| 4 | 选哪一圈 | 这条边对着外圈的 0，所以读外圈。 | prot.highlight → outer | — |
| 5 | 读数 | 另一条边对着 {g}，这个角是 {g} 度。 | ‖ ans.text → `'这个角是 {g}°'` | choose 答案 {g}（选项 {g}、{180 - g}、{g + 10}）“这个角是多少度？”；提示：从 0 开始的那一圈读。 |

- 要点：量角时，量角器的中心和角的顶点重合，0 刻度线和角的一条边重合；角的另一条边对着几，这个角就是几度；从哪一圈的 0 开始，就读哪一圈

### `draw-angle` 画角与角的分类
- 位置：四上 · `angle-measure` · 3.4 · angle（kindLabel）、T2
- 元信息：summary：射线绕端点旋转，依次成锐角、直角、钝角、平角、周角；tags [角的分类, 锐角, 直角, 钝角, 平角, 周角, 画角]；cover “180°”；related [protractor-use, angle-intro]
- 舞台：800 × 420；params `g: 65`；explore g 滑块“要画的角” 10–170（步长 5）
- 零件：
  - `ang` = angle，from 0，size 10，length 200，arc true，label true，kindLabel true，at [400, 260]
  - `tbl` = table，rows [[锐角, 直角, 钝角, 平角, 周角], ['< 90°', '= 90°', '90°–180°', '= 180°', '= 360°']]，colWidth 120，size 20，at [100, 340]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 转起来 | 一条射线绕着端点转。 | ang.size → 60（1.5s，linear） | — |
| 2 | 直角 | 转到 90 度是直角，比它小的是锐角。 | ang.size → 90（1s，linear） | — |
| 3 | 钝角和平角 | 再转，大于 90 度小于 180 度是钝角；转到 180 度，两条边成一条直线，是平角。 | ang.size → 135（1s，linear）；ang.size → 180（1s，linear） | — |
| 4 | 周角 | 转满一圈是 360 度，叫周角。 | ang.size → 360（2s，linear） | — |
| 5 | 画一个角 | 画一个 {g} 度的角。 | ang.size → 0 ‖ ang.size → {g} | turn ang.size 到 {g}（容差 0，步长 5）“拖动这条边，画一个 {g}° 的角。” |

- 要点：锐角小于 90°；直角等于 90°；钝角大于 90° 小于 180°；平角等于 180°；周角等于 360°；1 周角 = 2 平角 = 4 直角

### `parallel-perpendicular` 平行与垂直
- 位置：四上 · `parallel-perpendicular` · 3.4 · line（X7）、angle、T2
- 元信息：summary：同一平面内不相交的两条直线互相平行；相交成直角时互相垂直；tags [平行, 垂直, 垂线, 距离]；cover “∥ ⊥”；related [line-ray-segment, parallelogram-trapezoid]；recommended
- 舞台：800 × 450；无参数
- 零件：
  - `l1` = line，from [120, 140]，to [680, 140]，ends [open, open]，extend 1，width 4
  - `l2` = line，from [120, 260]，to [680, 230]，ends [open, open]，extend 1，width 4，color orange（一开始稍斜，会相交）
  - `ang` = angle，from 0，size 60，length 160，arc true，label true，at [400, 380]，hidden（用来转出垂直）
  - `pt` = shape circle，radius 6，color accent，at [600, 60]，hidden；`perp` = line，from [600, 60]，to [600, 140]，dashed，hidden；`slant` = line，from [600, 60]，to [480, 140]，dashed，color dim，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 两条直线 | 两条直线，延长后会相交吗？ | 高亮 l1；高亮 l2 | — |
| 2 | 会相交 | 稍微斜一点，延长后就会相交。 | 高亮 l2 | — |
| 3 | 平行 | 摆正了，怎么延长都不相交，它们互相平行。 | l2.to → [680, 260] | — |
| 4 | 垂直 | 两条直线相交成直角，就互相垂直。 | 隐藏 l2；显示 ang ‖ ang.size → 90 | turn ang.size 到 90（容差 0，步长 5）“把这个角转成直角，两条线就互相垂直。” |
| 5 | 垂线段最短 | 从直线外一点到直线，垂线段最短，它的长度叫点到直线的距离。 | 隐藏 ang；显示 pt；显示 slant；显示 perp；高亮 perp | — |

- 要点：在同一平面内，不相交的两条直线叫作平行线；两条直线相交成直角，就说它们互相垂直；从直线外一点到这条直线所画的垂直线段最短，它的长度叫作点到直线的距离

### `parallelogram-trapezoid` 平行四边形、梯形的特征
- 位置：四上 · `quadrilaterals` · 3.4 · polygon、T3
- 元信息：summary：平行四边形两组对边分别平行，容易变形；梯形只有一组对边平行；tags [平行四边形, 梯形, 四边形, 对边平行]；cover “▱ ⏢”；related [parallel-perpendicular, parallelogram-height, parallelogram-area]
- 舞台：800 × 450；无参数
- 零件：
  - `frame` = polygon，points [[100, 120], [340, 120], [340, 260], [100, 260]]，fill false，color blue（长方形框架）
  - `trap` = polygon，points [[460, 260], [700, 260], [640, 120], [520, 120]]，color orange，hidden
  - `shapes` = item-set，items [{ shape: square（平行四边形用素材：asset para-a）, tags: { kind: para } }……] —— 本知识点的分类物品用 6 个素材图形：para-a、para-b、trap-a、trap-b、rect、kite（菱形用作平行四边形的一种：rhombus），tags.kind 分别 para / para / trap / trap / para / none；asset 为对应名称的 SVG 素材，layout row，size 80，at [60, 300]，hidden
  - `b1` = shape rect 220 × 110 fill false，at [140, 400]，hidden；`b2` 同 at [400, 400]；`b3` 同 at [660, 400]；`bl` = 三个 label（平行四边形 / 梯形 / 都不是）在筐上方，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 拉一拉 | 长方形框架拉一拉，变成平行四边形。 | frame.points → [[140, 120], [380, 120], [340, 260], [100, 260]]（1.5s） | — |
| 2 | 对边平行 | 平行四边形两组对边分别平行，而且相等。 | 高亮 frame.e1 ＋ 高亮 frame.e3；高亮 frame.e2 ＋ 高亮 frame.e4 | — |
| 3 | 容易变形 | 平行四边形容易变形，伸缩门就用了这个特点。 | frame.points → [[180, 120], [420, 120], [340, 260], [100, 260]]（1s）；frame.points → [[140, 120], [380, 120], [340, 260], [100, 260]] | — |
| 4 | 梯形 | 只有一组对边平行的四边形是梯形。 | 显示 trap；高亮 trap.e1 ＋ 高亮 trap.e3 | — |
| 5 | 分一分 | 把这些图形分到对应的类里。 | 隐藏 frame ＋ 隐藏 trap；显示 shapes；显示 b1 ＋ b2 ＋ b3 ＋ bl ‖ （标准做法）按 kind 移到对应筐 | sort shapes 按 kind 到 { para: b1, trap: b2, none: b3 }“把图形分一分。”；提示：数一数有几组对边平行。 |

- 说明：`shapes` 的 6 个素材是 6 个四边形的 SVG（平行四边形 2 个、梯形 2 个、长方形 1 个、一般四边形 1 个，名字 para-a、para-b、trap-a、trap-b、rect、quad），tags.kind 依次 para、para、trap、trap、para、none。长方形也是平行四边形。
- 要点：两组对边分别平行的四边形叫平行四边形；只有一组对边平行的四边形叫梯形；平行四边形容易变形

### `observe-cubes` 小正方体组合的三视图
- 位置：四上 · `observe-2` · 3.7 · cube-stack、T1
- 元信息：summary：从前面、左面、上面看，看到的形状可能不同；tags [观察物体, 三视图, 小正方体, 前面, 上面, 左面]；cover “三视图”；related [observe-directions, observe-reconstruct]；recommended
- 舞台：800 × 450；params `k: 1`；presets：`{k: 1}` cubes [[0,0,0],[1,0,0],[2,0,0],[0,1,0],[0,0,1]]、`{k: 2}` cubes [[0,0,0],[1,0,0],[1,1,0],[1,0,1],[2,1,0]]
- 零件：
  - `st1` = cube-stack，cubes（k = 1 那组），view iso，project false，unit 50，at [140, 330]，opacity `{k == 1}`
  - `st2` = cube-stack，cubes（k = 2 那组），同上，opacity `{k == 2}`
  - 三个视图（用零件画，每组一套，按 opacity 只显示当前组）：`vf1`、`vl1`、`vt1` = cube-stack，cubes 同 st1，view 分别 front / left / top，unit 30，at [520 / 720 / 620, 160]，opacity `{k == 1}`，hidden；`vf2`、`vl2`、`vt2` 同理（cubes 同 st2，opacity `{k == 2}`）。前视图在左 [520]、俯视图在中间 [620]、左视图在右 [720]，提问时顺序不按“前、左、上”排

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 搭积木 | 用小正方体搭了一个组合。 | 高亮 st1 ＋ 高亮 st2 | — |
| 2 | 从前面看 | 从前面看，看到的是这样。 | st1.view → front ＋ st2.view → front（1.5s）；显示 vf1 ＋ 显示 vf2 | — |
| 3 | 从左面看 | 从左面看，看到的是这样。 | st1.view → left ＋ st2.view → left（1.5s）；显示 vl1 ＋ 显示 vl2 | — |
| 4 | 从上面看 | 从上面看，看到的是中间这一个。 | st1.view → iso ＋ st2.view → iso；显示 vt1 ＋ 显示 vt2 ‖ st1.view → top ＋ st2.view → top（1.5s） | tap 答案 vt{k}（可点 vf{k}、vl{k}、vt{k}）“哪一个是从上面看到的？”；提示：从上往下看，看到的是顶上的面。 |
| 5 | 回到立体 | 同一个物体，从不同方向看，形状可能不一样。 | st1.view → iso ＋ st2.view → iso | — |

- 说明：提问时三个视图都已显示，立体图回到斜着看的样子；答对后镜头转到正上方验证。
- 要点：从不同方向观察物体，看到的形状可能不同；观察时要站在正前方、正左方、正上方

### `average-apply` 平均数的特点
- 位置：四上 · `bar-chart` · 3.5 · chart（average）
- 元信息：summary：平均数不一定等于某个数据，容易受特别大或特别小的数影响；tags [平均数, 平均数的特点, 极端值]；cover “平均线”；related [average-meaning, bar-chart]
- 舞台：800 × 450；无参数（五个人的跳绳个数 92、85、96、88、89，平均 90）
- 零件：
  - `ch` = chart，kind bar，categories [小明, 小红, 小刚, 小丽, 小华]，values [92, 85, 96, 88, 89]，unit 10，max 200，average true，showValues true，width 460，height 300，at [100, 380]
  - `note` = text，`'平均数 90 不等于任何一个人的成绩'`，size 26，at [600, 100]，hidden
  - `q` = text，`'平均数变成 [112](blank)'`，size 30，at [600, 200]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 平均线 | 五个人跳绳，平均每人 90 个。 | 高亮 ch | — |
| 2 | 不是某个人的 | 平均数是 90，可是没有人正好跳 90 个。 | 显示 note | — |
| 3 | 来了一个高手 | 如果小刚跳了 206 个，平均数会怎样？ | 显示 q；ch.values → [92, 85, 206, 88, 89]（1.5s） ‖ q.text → `'平均数变成 112'` | choose 答案 112（选项 90 100 112）“现在平均数是多少？”；提示：(92 + 85 + 206 + 88 + 89) ÷ 5。 |
| 4 | 容易受影响 | 一个特别大的数，就把平均数拉高了，大部分人都在平均线下面。 | 高亮 ch | — |

- 要点：平均数反映一组数据的总体水平，不一定等于其中某个数据；平均数容易受特别大或特别小的数据影响

### `bar-chart` 条形统计图（单式、复式）
- 位置：四上 · `bar-chart` · 3.5 · chart（bar、bar2）
- 元信息：summary：用直条长短表示数量多少，一格可以代表多个；复式条形图加图例；tags [条形统计图, 复式条形统计图, 图例, 统计图]；cover “条形图”；related [pictograph, data-analysis-1, line-chart-single]；recommended
- 舞台：800 × 450；无参数
- 零件：
  - `tbl` = table，rows [[项目, 跳绳, 踢毽, 跑步, 拍球], [人数, 24, 16, 30, 12]]，colWidth 90，size 20，at [460, 40]
  - `ch` = chart，kind bar，categories [跳绳, 踢毽, 跑步, 拍球]，values [24, 16, 30, 12]，unit 5，max 35，showValues true，axisNames [项目, 人数/人]，width 420，height 280，show 0，at [80, 380]
  - `ch2` = chart，kind bar2，categories 同上，values [24, 16, 30, 12]，values2 [20, 22, 18, 15]，names [男生, 女生]，unit 5，max 35，legend true，width 420，height 280，show 0，at [80, 380]，hidden
  - `q` = text，`'喜欢踢毽的女生比男生多 [6](blank) 人'`，size 26，at [600, 300]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 从表到图 | 把统计表画成条形统计图。 | ch.show → 1（2s） | — |
| 2 | 一格代表 5 | 纵轴一格代表 5 人，24 在 20 和 25 之间。 | 高亮 ch.bar.1 | — |
| 3 | 一眼看出 | 直条越长，人数越多；喜欢跑步的最多。 | 高亮 ch.bar.3 | — |
| 4 | 复式条形图 | 男生、女生分开画，就是复式条形统计图，用图例区分。 | 隐藏 ch；显示 ch2；ch2.show → 1（2s） | — |
| 5 | 比一比 | 喜欢踢毽的女生比男生多 6 人。 | 显示 q；高亮 ch2.col.2 ‖ q.text → `'喜欢踢毽的女生比男生多 6 人'` | choose 答案 6（min 1，max 10）“喜欢踢毽的女生比男生多几人？” |

- 要点：条形统计图用直条的长短表示数量的多少；一格可以表示 1 个单位，也可以表示多个单位；复式条形统计图用图例区分不同的组

### `sub-div-properties` 减法、除法的运算性质
- 位置：四上 · `operation-laws-2` · 3.6 · tape-diagram
- 元信息：summary：连续减两个数等于减它们的和；连续除以两个数等于除以它们的积；tags [减法的性质, 除法的性质, 简便运算]；cover “a−b−c=a−(b+c)”；related [simplify-calc, add-laws]
- 舞台：800 × 420；无参数
- 零件：
  - `t` = tape-diagram，lens [[5, 2, 3]]，segLabels [['', '76', '24']]，segColors [[blue, orange, green]]，braces [{ row: 1, from: 1, to: 3, label: '480', side: top }]，unit 50，at [100, 120]
  - `f1` = text，`'480 − 76 − 24 = 480 − (76 + 24) = [380](blank)'`，size 28，at [400, 220]
  - `law1` = text，`'a − b − c = a − (b + c)'`，size 26，color accent，at [400, 270]，hidden
  - `f2` = text，`'600 ÷ 25 ÷ 4 = 600 ÷ (25 × 4) = 6'`，size 28，at [400, 330]，hidden
  - `law2` = text，`'a ÷ b ÷ c = a ÷ (b × c)'`，size 26，color accent，at [400, 380]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 用掉两次 | 480 元，先用 76 元，再用 24 元。 | 高亮 t | — |
| 2 | 合起来去掉 | 两次一共用了 76 + 24 = 100 元，一次去掉。 | t.braces → [{ row: 1, from: 1, to: 3, label: '480', side: top }, { row: 1, from: 2, to: 3, label: '100', side: bottom }] ‖ f1.text → `'480 − 76 − 24 = 480 − (76 + 24) = 380'` | choose 答案 380（选项 380 404 428） |
| 3 | 减法的性质 | 一个数连续减去两个数，等于减去这两个数的和。 | 显示 law1 | — |
| 4 | 除法也一样 | 一个数连续除以两个数，等于除以这两个数的积。 | 显示 f2；显示 law2 | — |

- 要点：a − b − c = a − (b + c)；a ÷ b ÷ c = a ÷ (b × c)；运用它们可以使计算简便

---

## 四年级下册

### `letters-for-numbers` 用字母表示数与数量关系
- 位置：四下 · `letters` · 3.6 · tape-diagram、F4
- 元信息：summary：字母可以表示任意的数，也可以表示运算律和公式；tags [用字母表示数, 含有字母的式子, 公式, 运算律]；cover “a+28”；related [add-laws, rect-perimeter, rect-area]；recommended
- 舞台：800 × 450；params `a: 9`；explore a 滑块“小明几岁” 1–15
- 零件：
  - `t` = tape-diagram，lens [[`{a / 3}`], [`{a / 3}`, `{28 / 3}`]]，segLabels [[`'{a} 岁'`], [`'{a} 岁'`, '28 岁']]，rowLabels [小明, 爸爸]，unit 18，at [140, 100]
  - `e1` = text，`'爸爸：{a} + 28 = {a + 28}（岁）'`，size 30，at [400, 210]
  - `e2` = text，`'小明 a 岁，爸爸 [a + 28](blank) 岁'`，size 30，at [400, 270]，hidden
  - `fs` = text，`'a + b = b + a　S = ab　C = 2(a + b)'`，size 28，color accent，at [400, 360]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 年龄差 | 小明 {a} 岁，爸爸比他大 28 岁，爸爸 {a + 28} 岁。 | 高亮 t；高亮 e1 | — |
| 2 | 年龄会变 | 每过一年都会变，可是爸爸总比小明大 28 岁。 | t.lens → [[`{(a + 3) / 3}`], [`{(a + 3) / 3}`, `{28 / 3}`]] ＋ e1.text → `'爸爸：{a + 3} + 28 = {a + 31}（岁）'`（2s） | — |
| 3 | 用字母表示 | 小明的年龄用 a 表示，爸爸就是 a + 28。 | 显示 e2 ‖ e2.text → `'小明 a 岁，爸爸 a + 28 岁'` | choose 答案 a + 28（选项 a + 28、28a、a − 28）“小明 a 岁，爸爸几岁？” |
| 4 | 表示规律 | 字母还能表示运算律和公式。 | 显示 fs | — |

- 要点：字母可以表示任意的数；含有字母的式子可以表示数量关系；字母和数相乘时，乘号可以写成“·”或省略，数写在字母前面

### `fraction-unit-one` 单位“1”与分数单位
- 位置：四下 · `fraction-meaning` · 随时
- 元信息：summary：一个物体、一些物体都可以看作一个整体，用自然数 1 表示，叫单位“1”；tags [分数的意义, 单位1, 分数单位]；cover “单位1”；related [fraction-intro, fraction-and-division]；recommended
- 舞台：800 × 450；params `t: 12`、`n: 4`、`k: 3`；derived `e: t / n`；presets `{12, 4, 3}`、`{12, 3, 2}`、`{10, 5, 2}`、`{8, 4, 3}`
- 零件：
  - `pie` = fraction-circle，parts `{n}`，take 0，radius 80，at [140, 150]
  - `bar` = fraction-bar，parts `{n}`，take 0，width 260，height 40，at [450, 150]
  - `plate` = counters，count `{t}`，layout grid，cols `{e}`，size 30，color red，at [60, 280]
  - `eq` = text，`'{t} 个苹果的 [{k}/{n}](frac) 是 [{k * e}](blank) 个'`，size 30，at [520, 330]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 一个整体 | 一个饼、一条线段，都可以看作一个整体。 | pie.take → 1；bar.take → 1 | — |
| 2 | 一些物体 | {t} 个苹果放在一起，也可以看作一个整体，叫单位“1”。 | 高亮 plate | — |
| 3 | 平均分 | 把它平均分成 {n} 份，每份 {e} 个（一行就是一份），是它的 1/{n}。 | 高亮 plate | — |
| 4 | 取几份 | 取 {k} 份，是 {k}/{n}，有 {k * e} 个。 | ‖ eq.text → `'{t} 个苹果的 [{k}/{n}](frac) 是 {k * e} 个'` | choose 答案 {k * e}（min 1，max 12）“{t} 个苹果的 {k}/{n} 是几个？”；提示：先算 1 份是几个。 |
| 5 | 分数单位 | 1/{n} 是 {k}/{n} 的分数单位，{k}/{n} 里有 {k} 个 1/{n}。 | 高亮 eq | — |

- 要点：一个物体、一个计量单位或一些物体组成的整体，都可以用自然数 1 表示，叫单位“1”；把单位“1”平均分成若干份，表示其中一份的数叫分数单位

### `fraction-and-division` 分数与除法
- 位置：四下 · `fraction-meaning` · 随时
- 元信息：summary：3 张饼平均分给 4 人，每人 3/4 张，被除数 ÷ 除数 = 除数分之被除数；tags [分数与除法, 分数的意义]；cover “3÷4=3/4”；related [fraction-unit-one, proper-improper]
- 舞台：800 × 450；params `a: 3`、`b: 4`；explore b 滑块“几人” 2–6，a 滑块“几张饼” 1–`b - 1`
- 零件：
  - `c{i}`（repeat `{a}`）= fraction-circle，parts `{b}`，take 0，radius 60，at [`{100 + (i - 1) * 140}`, 120]
  - `mine` = fraction-circle，parts `{b}`，take 0，radius 60，color green，at [640, 120]
  - `eq` = text，`'{a} ÷ {b} = [{a}/{b}](frac blank)（张）'`，size 34，at [400, 300]
  - `rule` = text，`'被除数 ÷ 除数 = [被除数/除数](frac)'`，size 26，at [400, 380]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 分饼 | {a} 张饼平均分给 {b} 个人，每人分多少？ | 重复 a 次：高亮 c{i}（together） | — |
| 2 | 一张一张分 | 每张饼平均分成 {b} 份，每人从每张饼里拿 1 份。 | 重复 a 次：c{i}.take → 1（together）；mine.take → {a}（1.5s） | — |
| 3 | 每人多少 | 每人拿到 {a} 个 1/{b} 张，就是 {a}/{b} 张。 | 高亮 mine ‖ eq.text → `'{a} ÷ {b} = [{a}/{b}](frac)（张）'` | choose 答案 `{a}/{b}`（选项 `{a}/{b}`、`{b}/{a}`、`1/{b}`）“每人分到几分之几张？” |
| 4 | 关系 | 被除数相当于分子，除数相当于分母。 | 显示 rule | — |

- 要点：两个整数相除，商可以用分数表示：被除数 ÷ 除数 = 除数分之被除数（除数不为 0）

### `decimal-meaning` 小数的意义
- 位置：四下 · `decimal-meaning` · 3.3 · ruler（zoom）、grid、place-value（decimals）
- 元信息：summary：十分之几、百分之几、千分之几可以写成一位、两位、三位小数；tags [小数的意义, 十分位, 百分位, 计数单位]；cover “0.01”；related [decimal-intro, decimal-property]；recommended
- 舞台：800 × 450；无参数
- 零件：
  - `r` = ruler，from 0，to 1，unit m，length 600，minor 10，zoomAt 0.05，zoomScale 1，at [100, 60]
  - `g` = grid，rows 10，cols 10，cell 18，filled 0，at [100, 200]
  - `pv` = place-value，value 0.35，places 0，decimals 3，style chart，at [560, 280]
  - `t1` = text，`'[1/10](frac) 米 = 0.1 米'`，size 28，at [560, 120]
  - `t2` = text，`'[1/100](frac) 米 = 0.01 米'`，size 28，at [560, 170]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 十分之一 | 1 米平均分成 10 份，1 份是 1/10 米，写成 0.1 米。 | 高亮 r；高亮 t1 | — |
| 2 | 百分之一 | 再把 1 分米平均分成 10 份，1 份是 1/100 米，写成 0.01 米。 | r.zoomScale → 8（1.5s）；显示 t2 | — |
| 3 | 百格图 | 一个正方形平均分成 100 份，涂 35 份，是 35/100，写成 0.35。 | g.filled → 35（2s） ‖ — | choose 答案 0.35（选项 0.35 3.5 0.035）“涂色部分用小数表示是多少？” |
| 4 | 数位 | 小数点右边依次是十分位、百分位、千分位，计数单位是 0.1、0.01、0.001。 | 高亮 pv | — |

- 要点：分母是 10、100、1000 的分数可以写成一位、两位、三位小数；小数的计数单位是十分之一、百分之一、千分之一……，写作 0.1、0.01、0.001；每相邻两个计数单位之间的进率是 10

### `decimal-property` 小数的性质与大小比较
- 位置：四下 · `decimal-meaning` · 3.3 · grid、place-value、F2（sel）
- 元信息：summary：小数末尾添上或去掉 0，大小不变；比较时从整数部分比起；tags [小数的性质, 小数比较, 小数大小]；cover “0.3=0.30”；related [decimal-meaning, decimal-point-move]
- 舞台：800 × 450；params `a: 2.35`、`b: 2.4`；presets `{2.35, 2.4}`、`{0.8, 0.78}`、`{5.06, 5.1}`
- 零件：
  - `g1` = grid，rows 10，cols 10，cell 16，filled 30，at [60, 60]；`l1` = label，`0.3`，at [140, 240]
  - `g2` = grid，rows 10，cols 10，cell 16，filled 30，at [280, 60]；`l2` = label，`0.30`，at [360, 240]
  - `cmp` = text，`'{a} [>](blank) {b}'`，size 36，at [600, 140]
  - `pa` = place-value，value `{a}`，places 0，decimals 2，style chart，at [600, 260]；`pb` 同 value `{b}`，at [600, 340]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 一样多 | 0.3 是 3 个 0.1，0.30 是 30 个 0.01，涂的一样多。 | 高亮 g1；高亮 g2 | — |
| 2 | 小数的性质 | 小数的末尾添上 0 或去掉 0，大小不变。 | 高亮 l1 ＋ 高亮 l2 | — |
| 3 | 比大小 | 先比整数部分，再比十分位、百分位。 | 高亮 pa ＋ 高亮 pb | — |
| 4 | 比一比 | {a} 和 {b} 比。 | ‖ cmp.text → `'{a} {sel(a > b, '>', sel(a < b, '<', '='))} {b}'` | choose 答案 `{sel(a > b, '>', sel(a < b, '<', '='))}`（选项 > = <）；提示：位数多的不一定大，从高位一位一位比。 |

- 要点：小数的末尾添上“0”或去掉“0”，小数的大小不变；比较小数大小，先比整数部分，整数部分相同再依次比十分位、百分位……

### `decimal-point-move` 小数点移动引起大小变化
- 位置：四下 · `decimal-meaning` · 3.3 · place-value
- 元信息：summary：小数点向右移一位，数扩大到原来的 10 倍；向左移一位，缩小到原来的 1/10；tags [小数点移动, 扩大, 缩小, 10倍]；cover “×10”；related [decimal-meaning, decimal-times-int]
- 舞台：800 × 420；params `n: 0.35`；presets `0.35`、`2.4`、`0.006`
- 零件：
  - `pv` = place-value，value `{n}`，places 2，decimals 3，style chart，at [400, 150]
  - `res` = text，`'{n} × 10 = [{n * 10}](blank)'`，size 34，at [400, 300]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 看数位 | {n} 在数位表里是这样的。 | 高亮 pv | — |
| 2 | 扩大到 10 倍 | 乘 10，每个数字都向左移动一位，就是小数点向右移动一位。 | ‖ pv.value → {n * 10}（1.5s） ＋ res.text → `'{n} × 10 = {n * 10}'` | choose 答案 {n * 10}（选项 `{n * 10}`、`{n * 100}`、`{n / 10}`）“{n} × 10 等于多少？” |
| 3 | 再扩大 | 再乘 10，又移一位，一共扩大到 100 倍。 | pv.value → {n * 100}（1.5s） | — |
| 4 | 反过来 | 除以 10、100，小数点就向左移动一位、两位。 | pv.value → {n}（1.5s） | — |

- 要点：小数点向右移动一位、两位、三位，小数就扩大到原数的 10 倍、100 倍、1000 倍；向左移动，就缩小到原数的 1/10、1/100、1/1000

### `decimal-add-sub` 小数加减法
- 位置：四下 · `decimal-add-sub` · 3.2 · column-calc（X3）
- 元信息：summary：小数点对齐就是相同数位对齐；位数不够补 0；整数运算定律对小数同样适用；tags [小数加法, 小数减法, 竖式, 小数点对齐]；cover “10−2.35”；related [decimal-add-sub-1, decimal-mixed]
- 舞台：800 × 450；params `a: 10`、`b: 2.35`；presets：`10 − 2.35`、`8.2 − 3.67`、`5 − 0.08`（本知识点讲减法，加法在三下 `decimal-add-sub-1`）
- 零件：
  - `calc` = column-calc，a `{a}`，b `{b}`，op −，show 0，at [300, 220]
  - `res` = text，`'{a} − {b} = [{a - b}](blank)'`，size 34，at [600, 380]
  - `law` = text，`'5.6 + 2.8 + 4.4 = 5.6 + (2.8 + 4.4) = 12.8'`，size 26，at [500, 120]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 对齐 | 小数点对齐，就是相同数位对齐。 | 高亮 calc | — |
| 2 | 补 0 | 被减数位数不够，末尾补 0。 | calc.show → 1 | — |
| 3 | 从低位减 | 从最低位减起，不够减向前一位退 1。 | ‖ calc.show → 99 ＋ res.text → `'{a} − {b} = {a - b}'` | choose 答案 {a - b}（选项 `{a - b}`、`{a - b + 1}`、`{(a - b) * 10}`）“{a} − {b} 等于多少？” |
| 4 | 运算定律 | 整数的运算定律，小数也适用。 | 显示 law | — |

- 要点：计算小数加减法，小数点要对齐；位数不同时在末尾补 0；从低位算起；整数加法的运算定律对小数同样适用

### `meeting-problem` 相遇问题
- 位置：四下 · `meeting` · 3.6 · track、tape-diagram
- 元信息：summary：两人相向而行，每分钟一起走“速度和”，路程 = 速度和 × 时间；tags [相遇问题, 行程问题, 速度和]；cover “相遇”；related [mixed-apply]；recommended
- 舞台：800 × 450；params `v1: 60`、`v2: 40`、`t: 5`；derived `s: (v1 + v2) * t`；explore v1 滑块“小明速度” 40–80（步长 10），v2 滑块“小红速度” 30–70（步长 10），t 滑块“几分相遇” 3–8
- 零件：
  - `tr` = track，length 600，distance `{s}`，unitText 米，ends [小明家, 小红家]，movers [{ from: 0, speed: '{v1}', asset: boy, label: '{v1} 米/分' }, { from: 1, speed: '{v2}', asset: girl, label: '{v2} 米/分' }]，t 0，showGap true，at [100, 160]
  - `eq` = expr-steps，lines [`'({v1} + {v2}) × {t}'`, `'{v1 + v2} × {t}'`, `'{s}（米）'`]，show 0，at [300, 330]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 同时出发 | 两人从两家同时出发，相向而行，{t} 分钟后相遇。 | 高亮 tr | — |
| 2 | 走 1 分钟 | 1 分钟，两人一共走了 {v1} + {v2} = {v1 + v2} 米。 | tr.t → 1（2s，linear） | — |
| 3 | 越走越近 | 每过 1 分钟，两人之间就近 {v1 + v2} 米。 | tr.t → {t}（{t}s，linear） | — |
| 4 | 相遇 | 相遇时，两人走的路合起来正好是全程。 | 高亮 tr ‖ eq.show → 99 | choose 答案 {s}（min 100，max 1200）“两家相距多少米？”；提示：速度和 × 时间。 |

- 要点：相遇问题中，两人每分钟一起走的路程叫速度和；路程 = 速度和 × 相遇时间

### `mixed-apply` 三步混合运算解决问题
- 位置：四下 · `mixed-apply` · 3.6 · tape-diagram、expr-steps
- 元信息：summary：先求什么、再求什么，分步列式后合成综合算式；tags [解决问题, 三步计算, 综合算式, 线段图]；cover “综合算式”；related [mixed-order, meeting-problem]
- 舞台：800 × 450；无参数（题目：学校买了 3 箱水彩笔，每箱 12 盒，每盒 8 元，一共多少元？）
- 零件：
  - `t` = tape-diagram，lens [[4, 4, 4]]，segLabels [['12 盒', '12 盒', '12 盒']]，rowLabels [盒数]，unit 60，at [120, 90]
  - `s1` = text，`'① 一共多少盒：12 × 3 = [36](blank)（盒）'`，size 26，at [400, 190]
  - `s2` = text，`'② 一共多少元：36 × 8 = [288](blank)（元）'`，size 26，at [400, 240]，hidden
  - `all` = text，`'综合算式：12 × 3 × 8 = 288（元）'`，size 28，color accent，at [400, 320]，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 读题 | 3 箱水彩笔，每箱 12 盒，每盒 8 元，一共多少元？ | 高亮 t | — |
| 2 | 先求盒数 | 先求一共多少盒：12 × 3 = 36。 | ‖ s1.text → `'① 一共多少盒：12 × 3 = 36（盒）'` | choose 答案 36（min 10，max 50）“一共多少盒？” |
| 3 | 再求钱数 | 再求一共多少元：36 × 8 = 288。 | 显示 s2 ‖ s2.text → `'② 一共多少元：36 × 8 = 288（元）'` | choose 答案 288（min 100，max 400） |
| 4 | 合成一个算式 | 把两步合成一个算式。 | 显示 all | — |

- 要点：解决问题时先想清楚要先求什么、再求什么；可以分步列式，也可以列综合算式，需要先算的部分加括号

### `triangle-classify` 三角形的分类与稳定性
- 位置：四下 · `triangles` · 3.4 · polygon、T3
- 元信息：summary：三角形具有稳定性；按角分锐角、直角、钝角三角形，按边分等腰、等边三角形；tags [三角形分类, 稳定性, 锐角三角形, 直角三角形, 钝角三角形, 等腰三角形, 等边三角形]；cover “△分类”；related [triangle-angle-sum, triangle-sides]
- 舞台：800 × 450；无参数
- 零件：
  - `tri` = polygon，points [[100, 220], [260, 220], [180, 90]]，fill false，color blue
  - `quad` = polygon，points [[320, 220], [480, 220], [480, 90], [320, 90]]，fill false，color orange
  - `items` = item-set，items：6 个三角形素材 tri-acute-a、tri-acute-b、tri-right-a、tri-right-b、tri-obtuse-a、tri-obtuse-b，tags.angle 依次 acute、acute、right、right、obtuse、obtuse，layout row，size 80，at [60, 260]，hidden
  - `b1`、`b2`、`b3` = shape rect 220 × 100 fill false，at [140 / 400 / 660, 400]，hidden；三个 label（锐角三角形 / 直角三角形 / 钝角三角形）在筐上方，hidden

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 拉一拉 | 三根木条钉成三角形，拉不动；四边形一拉就变形。 | tri 移到 by [6, 0]；tri 移到 by [−6, 0]；quad.points → [[320, 220], [480, 220], [520, 90], [360, 90]] | — |
| 2 | 稳定性 | 三角形具有稳定性，自行车架、屋顶都用三角形。 | 高亮 tri | — |
| 3 | 按角分 | 按角分：三个角都是锐角、有一个直角、有一个钝角。 | 隐藏 tri ＋ 隐藏 quad；显示 items；显示 b1 ＋ b2 ＋ b3 ＋ 三个 label | — |
| 4 | 分一分 | 把三角形分到对应的类里。 | ‖ （标准做法）按 angle 移到 b1 / b2 / b3 | sort items 按 angle 到 { acute: b1, right: b2, obtuse: b3 }“按角把三角形分一分。”；提示：看最大的那个角。 |
| 5 | 按边分 | 按边分：两条边相等是等腰三角形，三条边都相等是等边三角形。 | — | — |

- 第 5 步画面：在舞台右上显示两个三角形：`iso` = polygon [[560, 160], [700, 160], [630, 50]]，sideLabels ['', '5', '5']；`equi` = polygon [[600, 330], [720, 330], [660, 226]]，sideLabels ['4', '4', '4']；都在“零件”里设为 hidden，第 5 步显示。
- 要点：三角形具有稳定性；三角形按角分为锐角三角形、直角三角形、钝角三角形；两条边相等的是等腰三角形，三条边都相等的是等边三角形

### `triangle-angle-sum` 三角形的内角和
- 位置：四下 · `triangles` · 3.4 · polygon、E4、angle
- 元信息：summary：三个角撕下来拼成一个平角，内角和是 180°；tags [三角形内角和, 180度, 平角]；cover “180°”；related [triangle-classify, draw-angle]；recommended
- 舞台：800 × 450；params `A: 50`、`B: 70`；derived `C: 180 - A - B`；presets：`{A: 50, B: 70}`、`{A: 60, B: 60}`、`{A: 40, B: 100}`（顶点坐标要用三角函数算，算式不支持，所以用 presets 并写死坐标）
- 零件：
  - `tri` = polygon，points [[150, 330], [450, 330], C]，C 的坐标见下方说明（每个 preset 一组，写死）
  - `wA`、`wB`、`wC` = angle，画在三个顶点处的小扇形角（size = 该角度，length 50，arc true），颜色 red / green / blue；`from` 和 `at` 按顶点和边的方向写死
  - `line` = line，from [300, 120]，to [700, 120]，hidden（拼平角用的直线）
  - `sum` = text，`'{A}° + {B}° + {C}° = [180](blank)°'`，size 32，at [400, 400]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 三个角 | 三角形有三个内角。 | 高亮 wA；wB；wC | — |
| 2 | 撕下来 | 把三个角撕下来。 | wA 移到 by [0, −60] ＋ wB 移到 by [0, −60] ＋ wC 移到 by [0, −40] | — |
| 3 | 拼在一起 | 顶点对在一起，三个角拼成了一条直线——平角。 | 显示 line；wA 移到 [500, 120]；wB 移到 [500, 120]（绕顶点转到 A 的旁边）；wC 移到 [500, 120]（转到 B 的旁边） | — |
| 4 | 180 度 | 平角是 180°，所以三角形三个内角的和是 180°。 | ‖ sum.text → `'{A}° + {B}° + {C}° = 180°'` | choose 答案 180（选项 90 180 360）“三个角加起来是多少度？” |
| 5 | 求第三个角 | 已知两个角是 {A}° 和 {B}°，第三个角是 180 − {A} − {B} = {C}°。 | ‖ — | choose 答案 {C}（min 10，max 120）“第三个角是多少度？” |

- 顶点坐标：A(150,330)、B(450,330)，C = A + 300 × (sin B·cos A, −sin B·sin A) / sin(A + B)（写配置时用这个式子算好，四舍五入到整数写进 `points`；角 `wC` 的 `from` 和 `size` 同样算好写死）。第 3 步三个扇形角拼成平角：wA 的 `from` 设为 0、wB 设为 A、wC 设为 A + B，顶点都移到 [500, 120]（用 `set` 改 `at` 和 `from`）。
- 要点：三角形的内角和是 180°；已知两个角，可以求出第三个角

### `triangle-sides` 三角形的三边关系
- 位置：四下 · `triangles` · 3.4 · line、arc、E4
- 元信息：summary：任意两边之和大于第三边，才能围成三角形；tags [三角形三边关系, 两边之和, 围三角形]；cover “a+b>c”；related [triangle-classify]；recommended
- 舞台：800 × 450；params `a: 5`、`b: 4`、`c: 8`（1 = 40 像素）；presets：`{5, 4, 8}`（能）、`{3, 4, 8}`（不能）、`{4, 4, 8}`（刚好塌成一条线，不能）
- 零件：
  - `base` = line，from [100, 360]，to [`{100 + c * 40}`, 360]，ends [point, point]，width 6，color blue
  - `sa` = line，from [100, 360]，to [`{100 + a * 40}`, 360]，ends [point, point]，width 6，color orange（左端固定在底边左端，绕 [100, 360] 转）
  - `sb` = line，from [`{100 + c * 40}`, 360]，to [`{100 + c * 40 - b * 40}`, 360]，ends [point, point]，width 6，color green（绕右端转）
  - `arcA` = arc，radius `{a * 40}`，start 270，end 360，dashed，arrow false，at [100, 360]，hidden；`arcB` = arc，radius `{b * 40}`，start 0，end 90，dashed，arrow false，at [`{100 + c * 40}`, 360]，hidden
  - `res` = text，`'{a} + {b} [>](blank) {c}'`，size 34，at [600, 100]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 三根小棒 | 三根小棒长 {a}、{b}、{c}，能围成三角形吗？ | 高亮 base；sa；sb | — |
| 2 | 立起来 | 两根短的绕着两端转上去。 | 显示 arcA ＋ 显示 arcB；sa 绕 [100, 360] 转 −60 ＋ sb 绕 [`{100 + c * 40}`, 360] 转 60 | — |
| 3 | 碰不碰得上 | {sel(a + b > c, '两根碰上了，能围成三角形。', sel(a + b == c, '刚好碰上，却塌成了一条线，围不成。', '够不着，围不成。'))} | ‖ — | choose 答案 `{sel(a + b > c, '能', '不能')}`（选项 能 不能）“能围成三角形吗？”；提示：两根短的加起来，比长的那根长吗？ |
| 4 | 比一比 | 两根短的加起来{sel(a + b > c, '大于', sel(a + b == c, '等于', '小于'))}最长的那根。 | ‖ res.text → `'{a} + {b} {sel(a + b > c, '>', sel(a + b == c, '=', '<'))} {c}'` | choose 答案 `{sel(a + b > c, '>', sel(a + b == c, '=', '<'))}`（选项 > = <） |
| 5 | 规律 | 三角形任意两边之和大于第三边。 | 高亮 res | — |

- 说明：第 2 步的转角用固定的 60°，只是示意“转上去”；画面上两根是否碰上由第 3 步讲解说明。能围成的那组（5、4、8），在第 3 步 `‖` 之后把 sa、sb 的终点 set 到真实的三角形顶点（由余弦定理算出，写配置时算好写死），形成三角形；不能的两组不动。
- 要点：三角形任意两边的和大于第三边；判断三根小棒能否围成三角形，看两根较短的和是否大于最长的

### `parallelogram-height` 底和高、图形之间的关系
- 位置：四下 · `quadrilaterals-2` · 3.4 · polygon（heights）、T1
- 元信息：summary：从一边上的点向对边作垂线，这条垂线段是高；正方形、长方形都是特殊的平行四边形；tags [平行四边形的高, 梯形的高, 底, 四边形关系]；cover “高”；related [parallelogram-trapezoid, parallelogram-area]
- 舞台：800 × 450；无参数
- 零件：
  - `pg` = polygon，points [[140, 300], [420, 300], [500, 120], [220, 120]]，color blue，sideLabels ['底', '', '', '']
  - `hs` = 三条虚线高：`h1` = line，from [260, 120]，to [260, 300]，dashed，hidden；`h2` = line，from [330, 120]，to [330, 300]，dashed，hidden；`h3` = line，from [400, 120]，to [400, 300]，dashed，hidden
  - 包含关系图（三个嵌套的框）：`r1` = shape rect 300 × 200 fill false，at [640, 300]，label “平行四边形”；`r2` = shape rect 220 × 130，at [640, 320]，“长方形”；`r3` = shape rect 120 × 70，at [640, 340]，“正方形”（三个 label 分别写在框的左上角内侧），都 hidden
  - `cand` = 用 tap 的三个选项：h2（真正的高）、`slant` = line，from [330, 120]，to [300, 300]，dashed，color dim，hidden；`side` = 平行四边形的左边 pg.e4

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 作高 | 从上边一点向底作垂线，这条垂线段是平行四边形的高。 | 显示 h1；h1 的垂足画直角：pg.heights → [{ from: 4, to: 1 }] | — |
| 2 | 无数条高 | 上边上的每一点都能作高，平行四边形有无数条高，它们一样长。 | 显示 h2；显示 h3 | — |
| 3 | 认一认 | 高一定和底垂直。 | 隐藏 h1 ＋ 隐藏 h3；显示 slant ‖ 高亮 h2 | tap 答案 h2（可点 h2、slant、pg.e4）“哪一条是这条底上的高？”；提示：和底成直角的那条。 |
| 4 | 图形的关系 | 正方形是特殊的长方形，长方形是特殊的平行四边形。 | 显示 r1；显示 r2；显示 r3 | — |

- 要点：从平行四边形一条边上的一点到对边引一条垂线，这点和垂足之间的线段叫平行四边形的高，垂足所在的边叫底；平行四边形有无数条高；长方形、正方形是特殊的平行四边形

### `observe-reconstruct` 根据视图搭立体图形
- 位置：四下 · `observe-3` · 3.7 · cube-stack（count、project）
- 元信息：summary：根据从前面、上面看到的图，搭一搭，想最少、最多用几个；tags [观察物体, 三视图, 搭积木, 最少最多]；cover “搭一搭”；related [observe-cubes]
- 舞台：800 × 450；无参数（从上面看是一排 3 个，从前面看是“左边 2 层、右边 1 层”）
- 零件：
  - `vf` = cube-stack，cubes [[0,0,0],[1,0,0],[2,0,0],[0,0,1]]，view front，unit 30，at [560, 120]；`vt` = 同 cubes，view top，at [700, 120]；两个 label（从前面看、从上面看）在下方
  - `build` = cube-stack，cubes [[0,0,0],[1,0,0],[2,0,0],[0,0,1]]，view iso，count 0，unit 50，at [120, 330]
  - `q` = text，`'最少用 [4](blank) 个'`，size 30，at [600, 330]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 看两张图 | 从前面看和从上面看的样子给出来了，怎么搭？ | 高亮 vf；高亮 vt | — |
| 2 | 先铺底层 | 从上面看是一排 3 个，先在底层摆 3 个。 | build.count → 3（1.5s） | — |
| 3 | 再加一层 | 从前面看左边有 2 层，在左边上面再放 1 个。 | ‖ build.count → 4（0.8s） ＋ q.text → `'最少用 4 个'` | choose 答案 4（选项 3 4 5）“最少用几个小正方体？”；提示：底层 3 个，左边再加 1 个。 |
| 4 | 还能多放吗 | 从上面看只有一排，后面不能放，所以只能是 4 个。 | 高亮 build | — |

- 要点：根据从不同方向看到的图形，可以先摆底层，再按前面或侧面看到的层数往上加；要检查每个方向看到的图形都对得上

### `line-chart-single` 单式折线统计图
- 位置：四下 · `line-chart-1` · 3.5 · chart（line）
- 元信息：summary：描点连线，折线升降表示数量的增减变化；tags [折线统计图, 统计图, 变化趋势]；cover “折线”；related [bar-chart, line-chart-double]；recommended
- 舞台：800 × 450；无参数（某地 1–6 月平均气温：2、5、11、17、22、26 ℃）
- 零件：
  - `ch` = chart，kind line，categories [1月, 2月, 3月, 4月, 5月, 6月]，values [2, 5, 11, 17, 22, 26]，unit 5，max 30，showValues true，axisNames [月份, 气温/℃]，width 480，height 300，show 0，at [100, 380]
  - `q` = text，`'[3 月到 4 月](blank) 上升得最快'`，size 26，at [640, 120]

| # | 标题 | 讲解 | 画面 | 动手做 |
|---|---|---|---|---|
| 1 | 描点 | 按每个月的气温，在图上描点。 | ch.show → 0.5（2s） | — |
| 2 | 连线 | 把点按顺序连起来，就是折线统计图。 | ch.show → 1（2s） | — |
| 3 | 看变化 | 线往上走表示升高，越陡升得越快。 | 高亮 ch | — |
| 4 | 找一找 | 3 月到 4 月、2 月到 3 月都升了 6 ℃，是升得最快的两段。 | ‖ 高亮 ch.pt.3 ＋ 高亮 ch.pt.4 | choose 答案 3 月到 4 月（选项 1 月到 2 月、3 月到 4 月、5 月到 6 月）“哪一段上升得快？” |
| 5 | 和条形图比 | 条形图看多少，折线图还能看出变化趋势。 | 高亮 ch | — |

- 要点：折线统计图用点表示数量多少，用折线的起伏表示数量的增减变化；线段越陡，变化越大
