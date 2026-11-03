# 知识点

一个知识点一个文件：`lessons/<学科>/g<年级>/<id>.yaml`，例如 `lessons/math/g3/fraction-intro.yaml`。

- 文件第一行写 `# yaml-language-server: $schema=../../../schemas/lesson.schema.json`，编辑器就有补全和报错。
- 格式见 [小学版需求设计](../../../docs/小学版需求设计.md) 5.4、5.5；字段定义以 `src/schema.ts` 为准。
- `status`：`draft`（草稿）→ `reviewed`（已校对，需写 `reviewedAt`）→ `published`（上线）。线上只显示 `published`。
- 写完后在课程目录 `curriculum/<学科>/grade<年级>.yaml` 里加上它的 id，然后运行 `pnpm content:check`。

阶段 0 只建立格式和校验；第一批知识点（认识分数、凑十法、认识钟表）在阶段 1 用场景模板和 fraction、clock 模板制作。
