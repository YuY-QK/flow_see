# 动画学堂 · 小学数学开发手册

> 版本：v1（2026-11-08）
> 上位文档：[小学数学知识点开发文档](../小学数学知识点开发文档.md)（下称“开发文档”，讲做什么、为什么、配置规范）。本手册讲**怎么做**：照着本手册做，就能得到开发文档要求的效果。两者冲突时以开发文档为准，并回头修正本手册。
> 读者：接手开发的工程师或 AI。默认你会 TypeScript、React、SVG，能读懂本仓库代码；不需要懂小学数学教学法——讲法已经写在知识点脚本里。

---

## 1. 手册里有什么

| 文件 | 内容 | 谁用 |
|---|---|---|
| 本文件 | 总览、工作方式、完成标准、通用视觉规范 | 所有人先读 |
| [A-前置工作任务卡.md](./A-前置工作任务卡.md) | 3.0 批次的全部代码任务：前置工作 F1–F13、三个新字段与页面 D1–D4、引擎扩展 E1–E7、动手方式 T1–T5、现有零件扩展 X1–X8。每张卡写明依赖、改哪些文件、接口、实现要点、必须写的测试、验收命令 | 做代码的人 |
| [B-新零件任务卡与视觉规格.md](./B-新零件任务卡与视觉规格.md) | 25 个新零件，每个一张卡：属性、几何画法（坐标怎么算）、各状态长什么样、子项和把手、测试、样板知识点 | 做零件的人 |
| C-知识点脚本（按年级 6 个文件）：[一年级](./C-知识点脚本-一年级.md) · [二年级](./C-知识点脚本-二年级.md) · [三年级](./C-知识点脚本-三年级.md) · [四年级](./C-知识点脚本-四年级.md) · [五年级](./C-知识点脚本-五年级.md) · [六年级](./C-知识点脚本-六年级.md) | 195 个新知识点的脚本：舞台、参数、零件摆放、每一步的标题 / 讲解 / 画面动作 / 动手做、要点、相关知识点 | 写知识点配置的人 |

**怎么读**：先读本文件 → 做代码的读 A、B 里自己认领的卡 → 写配置的读 C 里对应的脚本，并对照开发文档 5.2、5.7。

---

## 2. 工作方式

### 2.1 一张卡 = 一条分支 = 一次合并

- 每张任务卡（A、B）或每个知识点脚本（C，可以一个单元一起）开一条分支，命名写在卡上，规则见仓库 `CLAUDE.md`（`dev/phase3-<内容>`）。
- 分支从最新的 `develop` 拉出，做完合并回 `develop`（`main` 是线上，只在里程碑完成后由维护人从 `develop` 合并，见 `CLAUDE.md`）。
- 开工前确认卡上的“依赖”都已合并到 `develop`（查第 8 节的进度表）；没合并就不要开工（不要在自己的分支里顺手做别人的卡）。
- 一条分支只做卡上的事。发现卡里没写到、但必须做的事：停下，在卡的末尾“问题记录”里写清楚，由维护人决定改手册还是另开卡。**不要自行扩大范围，也不要自行降低要求。**
- 合并前：`pnpm lint`、`pnpm test`、`pnpm build` 全部通过（`build` 包含内容检查、约定检查、类型检查），分支上的 CI 是绿的；卡上的“验收”逐条打勾，写进合并说明；在第 8 节的进度表里把这张卡标成 ✅。

### 2.2 并行

依赖图见 A 文件开头。没有依赖关系的卡可以同时由不同的人（或不同的 AI 会话）做。同一个文件会被多张卡修改时（例如 `evaluate.ts`、`LessonPlayer.tsx`、`site.yaml`），后合并的一方负责解决冲突，并重跑全部测试。

### 2.3 交给 AI 时怎么下指令

每次只给一张卡，指令格式：

```
请在仓库 yuy-qk/flow_see 完成《小学数学开发手册》里的任务卡 <编号>（文件 docs/小学数学开发手册/<文件名>）。
先读 CLAUDE.md、docs/小学数学开发手册/README.md 和这张卡；从最新的 develop 按卡上的分支名开分支；
只做卡上的内容；卡上的测试全部写出并通过；
pnpm lint、pnpm test、pnpm build 全部通过；有样板知识点的，pnpm check:lessons --lesson <样板 id> 通过；
最后按“验收”逐条自查并写在提交说明里，在 README 第 8 节进度表里把这张卡标成 ✅，推送分支，不要合并、不要创建 PR。
遇到卡上没写清楚的地方，不要猜，停下来列出问题。
```

做素材时（一次一个类别，规则见第 7 节）：

```
请在仓库 yuy-qk/flow_see 按 docs/小学数学开发手册/README.md 第 7 节，做“<类别>”这一类的全部素材。
先读 CLAUDE.md 和 README 第 7 节；从最新的 develop 开分支 dev/phase3-assets-<类别英文>；
每个素材一个 SVG，放 packages/content/assets/math/<类别目录>/，并登记到 assets/manifest.yaml；
只加素材和清单，不改代码、不改知识点；pnpm content:check、pnpm test 通过；
把这一类全部素材排在一张图上截图（浅色、深色背景各一张）贴进提交说明；在第 7 节的表里把这一类标成 ✅，推送分支，不要合并、不要创建 PR。
```

写知识点时：

```
请按 docs/小学数学开发手册/C-知识点脚本-<年级>.md 里 <id> 的脚本，写出 packages/content/lessons/math/g<年级>/<id>.yaml。
先读 CLAUDE.md、开发文档 5.2、packages/content/lessons/scene.md 和脚本；
脚本里的讲解原文照抄，零件和动作照脚本写；跑 pnpm content:check 和 pnpm check:lessons --lesson <id> 都通过；
按开发文档 8.1 自校后提交。
```

---

## 3. 完成标准（所有卡通用）

一张卡只有同时满足下面全部条件才算完成：

1. 卡上“改动文件”里列的都改了，没列的文件没有无关改动。
2. 卡上“测试”列出的用例全部写出，`pnpm test` 通过；没有用 `skip`、`only`、放宽断言。
3. `pnpm lint` 没有错误；`pnpm build` 通过（包含 `content:check`、约定检查、类型检查）。
4. 代码里没有中文字符串（注释除外）、没有颜色值、CSS 里没有固定字号（`pnpm check:conventions` 会拦）。新增的可调值都在 `site.yaml` / `texts.yaml` / CSS 变量里。
5. 文档同步：`packages/content/lessons/scene.md`（零件、动作、动手方式的写法）、`src/schema.ts` 生成的 JSON Schema（`pnpm content:schema`）、卡上写到的规格文档章节。
6. 改了界面的：电脑（1280）、iPad（820）、手机（390）三种宽度截图检查留白、遮挡；“减少动态效果”下检查；深色主题检查。
7. 卡上“验收”逐条通过，并写在合并说明里。
8. 带样板知识点的卡（B 文件的零件、动手方式）：`pnpm check:lessons --lesson <样板 id>` 通过——样板要在页面上真的走完“跟着做”“自己做”，不能只过 `content:check`。

知识点（C）额外满足开发文档 8.1 的全部清单，以及 `pnpm check:lessons --lesson <id>` 无问题（F10 做好之后）。

---

## 4. 通用视觉规范（所有新零件必须遵守）

B 文件里每个零件的视觉规格都建立在这一节之上。

### 4.1 坐标与尺寸

- 所有尺寸是**舞台坐标**（默认舞台 800 × 450）；手机上整个舞台等比缩放，零件不需要自己处理屏幕尺寸。
- 舞台内文字：算式 36–44，普通标注 24–28，零件内部的小字（刻度数字、表头）不小于 20，任何文字不小于 18。
- 线宽：主轮廓 3，次要线（刻度、网格、辅助线）2，强调线 5；虚线 `[8, 6]`。
- 可点的子项、把手：在舞台坐标里不小于 40 × 40（包含 `scene.tryIt.tapPadding` 外扩后），保证手机缩放后仍好点。
- 圆角：方块类元素圆角 = 边长 × 0.12；按钮式的框（标签、表头）圆角 8。

### 4.2 颜色

- 只用三类颜色：`site.yaml` 的 `scene.colors` 颜色名（blue、orange、red、green、purple、yellow、pink、brown、gray、white、black）、动画主题色（ink 文字和主线、dim 次要、accent 强调、line 辅助线）、`@零件id`。代码里一律通过 `blocks/src/base.ts` 的 `color()` / `mixColor()` 取色，不写颜色值。
- 颜色语义（开发文档 6.5）：第一个数 blue，第二个数 orange，拆出来 / 变化的部分 accent，结果 green，辅助线 line，题目里的固定信息 ink。
- 填充色 + 描边：填充用颜色本身，描边用 `mixColor(颜色, ink, scene.counterBorder.darken)`（和计数块一致）；大面积填充（面、扇形、条形）用颜色本身、不透明度 0.85。
- 高亮统一走现有高亮框（`scene.highlight`），零件自己不另画高亮效果；子项高亮也走同一套（F6）。

### 4.3 动画

- 连续变化的属性用引擎插值（开发文档 4 节开头），零件不自己做定时动画；零件的 `Render` 只根据属性画一帧。
- 需要“过程感”的（捆小棒、展开盒子、圆滚动）由一个 0–1 的属性驱动，0 和 1 是稳定状态，中间是过程，过程中的画面要能单独看懂（暂停在 0.5 不是乱的）。
- 不做闪烁、抖动以外的装饰动画；“减少动态效果”时 blank 不闪（已有机制）。

### 4.4 主题

- 四个动画主题（flat、cute、chalk、pro）下都要好看：不要依赖某一个主题的背景色；chalk 主题背景深，文字和线用 ink 就会自动变浅。
- 每个零件做完，在零件试验场（F9）里四个主题各截一张图贴进合并说明。

### 4.5 包围盒

`bbox(p)` 返回的矩形必须包住零件画出的全部内容（含文字、箭头、把手、展开后的部分）；它决定高亮框、手机贴合范围和旋转中心。连续变化时（展开、滚动）按**当前属性**算包围盒。

---

## 5. 名词表

| 名词 | 意思 |
|---|---|
| 零件 | 舞台上的一个画面元素（`objects` 里的一项），代码里是 `PartDef` |
| 子项 | 零件里可以单独引用的部分，写成 `零件id.子项名`（如 `chart.bar.2`），由 F6 的 `subitems()` 提供 |
| 把手 | 孩子可以拖动来改变零件某个属性的点，由 F6 的 `handles()` 提供，用于 turn（T2） |
| 动作 | 步骤 `do` 里的一项（`move`、`set`、`flip`…） |
| 动手做 | 步骤里的 `try`：choose、drag、tap、turn、sort、place |
| 看一看 / 跟着做 / 自己做 | 三种学习方式，见规格 P3 |
| 样板知识点 | 每个新零件附带的最小知识点（`status: draft`），见 B 文件 |
| 走查 | F10 的自动检查脚本 `pnpm check:lessons` |

---

## 6. 知识点脚本（C 文件）的格式

C 文件里每个知识点一节，格式固定。写配置的人把它**逐项翻译**成 yaml：讲解原文照抄，零件和动作照写；脚本没写的零件属性用默认值。

### 6.1 一节的结构

```
### `id` 知识点名
- 位置：一上 · 单元 id · 批次 3.1 · 用到的新零件 / 能力
- 元信息：summary（一句话）；tags；cover 文字；related；recommended（只有标了的才写 true）
- 舞台：宽 × 高；参数（标准取值）；derived；explore（出题控件）
- 零件：id = type，关键属性，at
- 步骤表：| # | 标题 | 讲解（say） | 画面（do） | 动手做（try） |
- 要点：keyPoints
```

### 6.2 步骤表里的记号

| 记号 | 意思 | 翻译成配置 |
|---|---|---|
| `；` | 动作之间的分隔，按顺序一个接一个 | `do` 里的多项 |
| `＋` | 和上一个动作同时开始 | `together: true` |
| `‖` | 提问点：前面的动作先放，孩子答对后再放后面的 | `- ask: true` |
| `高亮 x` | `highlight: x`（可以是子项 `x.bar.2`） | |
| `显示 x` / `隐藏 x` | `show` / `hide` | |
| `x.属性 → 值` | `set: { target: x, 属性: 值 }` | 可带时长：`（1.2s）` |
| `x 移到 y` | `move: { target: x, to: y }` | |
| `从 x 拆 n 个为 y` | `split: { target: x, take: n, as: y }` | |
| `x 一个一个分到 [a, b]` | `deal` | |
| `x 绕 p 转 θ` | `rotate: { target: x, by: θ, around: p }`（E4） | |
| `x 沿 l 翻折` | `flip`（E5） | |
| `x 沿 r 走` | `follow`（E6） | |
| `重复 n 次：…` | 动作级 `repeat` | |
| `choose 答案 a（选项 …）` | `choose: { answer: a, options: [...] }`；没写选项时数字答案自动出选项，写了 `min`/`max` 的照写 | |
| `drag x → y ×n` | `drag: { from: x, to: y, count: n }` | |
| `tap 答案 …（可点 …）` | T1 | |
| `turn x.属性 到 v（容差 d，步长 s）` | T2 | |
| `sort x 按 k 到 {值: 筐}` | T3 | |
| `place x 到 [x, y]（转 θ）` | T4 | |
| `付钱 x → y 共 n 元` | T5（drag sum） | |
| `提示：…` | `hints`（依次给出） | |
| `高亮提示：…` | choose 的 `show`（做错后高亮哪些零件） | |

### 6.3 写配置时的统一做法

- `task`（轮到孩子时的任务文字）= 步骤表“动手做”一列里引号中的文字；没写引号时用这一步的讲解改成问句。
- 讲解里的 `{a}` 等是参数，照抄。**提问步骤的讲解里会出现答案**——这是“答对后朗读”的内容，规格 P3 已规定答对后才朗读讲解；画面上提问前不出现答案由 `‖` 保证。
- 坐标是舞台坐标；脚本给的是推荐位置，写完在三种宽度下看一遍，有遮挡就微调（只改坐标，不改结构），微调后的坐标写回配置即可，不需要改脚本。
- 颜色未写时按 README 4.2 的语义：第一个数 blue、第二个数 orange、结果 green。
- 每个知识点的 `status` 先写 `draft`；走查（F10）和自校（开发文档 8.1）通过后改 `reviewed`、`published`。
- 脚本里如果发现数学错误或者零件做不到的写法：**停下报告**，不要自己改讲法。

---

## 7. 素材清单（C 脚本里用到的全部图片素材）

> 规则见开发文档 5.6：SVG，同一类画风一致，登记在 `packages/content/assets/manifest.yaml`（来源、作者 / 工具、许可证），放在 `packages/content/assets/math/<类别>/`，素材 id = 下表的名字。**在用到它的知识点开工前做好**；`sun` 已有（科学用过），直接复用。人民币不用素材（`money` 零件画）。

| 类别 | 素材 id | 用在 |
|---|---|---|
| 水果 | apple、pear、peach、banana、strawberry | count-to-10、classify-count、pictograph、data-collect-1 |
| 小动物 | rabbit、cat、dog、chick、duck、monkey、bear、squirrel | cardinal-ordinal、compare-size-weight |
| 人物 | kid（坐着的小朋友，小）、kid-walk、kid-seat、kid-front、kid-back、kid-left、kid-right（四个方向观察的小朋友）、boy、girl（行走侧面） | continuous-add-sub、route-description、coordinate-pairs、observe-directions、meeting-problem、review-word-problems |
| 生活物品 | gift-box、cube-toy、can、ball（立体图形实物）、tri-block（三棱柱积木）、toy-car、schoolbag、pencil-box、pencil、basketball、stone、paperclip、set-square（三角尺） | solids-intro、shapes-2d-intro、money-shopping-1/2、measure-length、clock-direction、volume-meaning、gram-kilogram、angle-intro |
| 质量 | rice-bag（100 千克大米袋）、salt-bag（500 克盐袋）、weight-1g（1 克砝码） | ton、gram-kilogram |
| 交通与场景 | bus、truck、playground-track（400 米跑道）、map-two-cities（虚构两城地图，带比例尺位置留白）、lighthouse | continuous-add-sub、ton、length-units、map-scale、direction-distance |
| 地点图标 | home、school、shop、park、library、hospital、zoo、cinema、museum | route-description、directions-8 |
| 观察物体 | car-top（玩具车俯视）、car-view-front、car-view-back、car-view-left、car-view-right、car-view-top | observe-directions |
| 图形卡片 | para-a、para-b（平行四边形）、trap-a、trap-b（梯形）、rect、square、quad（一般四边形）、tri-acute-a、tri-acute-b、tri-right-a、tri-right-b、tri-obtuse-a、tri-obtuse-b | parallelogram-trapezoid、triangle-classify、review-shapes-relations |
| 其他 | leaf（树叶，轮廓清楚）、ant（小蚂蚁，做 path 的 marker）、fist-months（拳头记大月小月示意图） | perimeter-meaning、year-month-day |

- 图形卡片（para-a 等）是“画在卡片上的几何图形”，用于分类拖放；几何形状必须准确（平行四边形两组对边严格平行，梯形只有一组），每张卡片 100 × 100，图形居中。
- 观察物体的五个视图必须和 car-top 是同一辆车（颜色、车型一致）。

### 7.1 素材怎么做（素材任务的规则）

一次做一个类别（上表的一行），一个类别一条分支 `dev/phase3-assets-<类别英文>`，只加素材和清单，不改代码。素材和零件互不依赖，可以和零件并行做；**样板知识点要用到的素材先做**（水果、小动物、生活物品）。

- **格式**：手写的 SVG，`viewBox="0 0 100 100"`（明显不是方形的，如公交车、跑道、地图，用 `0 0 200 100` 等整数比例），不带位图、外链、字体、脚本、`<style>`；单个文件不超过 4 KB。参考 `assets/math/fruits/apple.svg`。
- **画风**（同一类必须一致，和已有的 apple、toy-car 协调）：扁平色块 + 深一号的同色描边（线宽 3，圆头圆角），最多一处半透明高光；不画渐变、阴影、细碎纹理；图形占画布约 70–90%，居中。
- **不写字**：素材里不出现任何文字、数字（要标的字由知识点里的 label 写）；不画商标、真实人物、教材插图里的形象。
- **准确**：图形卡片类（平行四边形、梯形、三角形等）几何必须准确（平行就是严格平行，直角就是 90°）；观察物体的五个视图是同一辆车；动物、物品一眼能认出是什么。
- **清单**：每个素材在 `assets/manifest.yaml` 加一条，`id` = 上表的名字，`file`、`source: AI 生成`、`tool`（所用模型或工具）、`createdAt`；用开源素材的写 `source`、`author`、`license`、`url`。
- **检查**：`pnpm content:check`、`pnpm test` 通过；把这一类排在一张图上，浅色和深色（chalk 主题）背景各截一张图贴进提交说明，确认深色背景上看得清。
- 做完在上表这一类的“类别”格里加 ✅。

---

## 8. 进度表

> 每张卡合并到 `develop` 后，在这里标 ✅（由做卡的人在同一条分支里改）。开工前在这里查依赖。

**A 文件（前置工作、新字段、引擎、动手方式、零件扩展）**：全部 ✅

| 卡 | 状态 | 卡 | 状态 | 卡 | 状态 | 卡 | 状态 |
|---|---|---|---|---|---|---|---|
| F1–F12 | ✅ | D1–D4 | ✅ | E1–E7 | ✅ | T1–T5、X1–X8 | ✅ |

**B 文件（25 个新零件）**

| 卡 | 零件 | 批次 | 状态 | 卡 | 零件 | 批次 | 状态 |
|---|---|---|---|---|---|---|---|
| B1 | item-set | 3.1 | ✅ | B14 | angle | 3.4 | |
| B2 | number-bond | 3.1 | | B15 | protractor | 3.4 | |
| B3 | base-ten | 3.1 | | B16 | coordinate-grid | 3.4 | |
| B4 | place-value | 3.1 | | B17 | direction | 3.4 | |
| B5 | number-chart | 3.1 | | B18 | circle-draw | 3.4 | |
| B6 | expr-steps | 3.1 | | B19 | chart | 3.5 | |
| B7 | table | 3.1 | | B20 | chance | 3.5 | |
| B8 | money | 3.3 | ✅ | B21 | tape-diagram | 3.6 | |
| B9 | balance | 3.3 | | B22 | track | 3.6 | |
| B10 | ruler | 3.3 | | B23 | fraction-area | 3.6 | |
| B11 | calendar | 3.3 | | B24 | solid | 3.7 | |
| B12 | polygon | 3.4 | ✅ | B25 | cube-stack | 3.7 | |
| B13 | path | 3.4 | | | | | |

**C 文件（知识点）**：正式知识点 0 个；已有样板草稿：count-to-10、cardinal-ordinal、classify-single、money-intro、money-shopping-1、shapes-compose、parallelogram-area（另有清单外的 clock-half）。知识点的进度在开发文档第 3 节用 ✅ 标。
