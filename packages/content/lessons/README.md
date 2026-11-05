# 知识点

一个知识点一个文件：`lessons/<学科>/g<年级>/<id>.yaml`，例如 `lessons/math/g3/fraction-intro.yaml`。

- 文件第一行写 `# yaml-language-server: $schema=../../../schemas/lesson.schema.json`，编辑器就有补全和报错。
- 格式见 [小学版需求设计](../../../docs/小学版需求设计.md) 5.4、5.5；字段定义以 `src/schema.ts` 为准。
- `status`：`draft`（草稿）→ `reviewed`（已校对，需写 `reviewedAt`）→ `published`（上线）。线上只显示 `published`。
- 缩略图用 `cover` 指定（第几步的画面、用什么参数、加载前显示的文字），格式见需求设计 5.4。
- 写完后在课程目录 `curriculum/<学科>/grade<年级>.yaml` 里加上它的 id，然后运行 `pnpm content:check`。

- 场景模板（`template: scene`）的零件和动作见 [scene.md](./scene.md)；fraction、clock 等由参数生成画面的模板见 [templates.md](./templates.md)，示例：`math/g1/make-ten.yaml`（凑十法 9 + 4）。

已上线：凑十法、借十法、平十法、破十法、乘法的意义、平均分与除法（场景模板）、认识分数（fraction 模板）、认识钟表（clock 模板，含半点和几时几分）、两位数乘两位数的竖式（column-calc 竖式零件），都带动手做（看一看 / 跟着做 / 自己做），全部只用配置做出来。
