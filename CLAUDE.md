# 动画学堂 · 开发约定

## 文档

- 开发和验收以 `docs/小学版页面规格.md` 为准；范围与配置格式见 `docs/小学版需求设计.md`；架构与阶段路线见 `docs/教学平台方案.md`。
- 站点级可调项（名称、联系方式、默认值、条数上限等）只放在 `packages/content/site.yaml`，代码里不写死（规格 2.7）。

## 配置优先

- 能配置的都不要写死在代码里：数据、文案、数值、颜色、尺寸、时长、默认值，统一放配置文件，方便管理和调整。
  - 站点级的（零件外观与默认值、播放器时间、界面文字、条数上限等）放 `packages/content/site.yaml`，并在 `src/schema.ts` 里定义格式（没有默认值的节必须在 yaml 里给全）；代码只读取配置，不留第二份。
  - 内容级的（知识点的参数、例子、控件范围）放知识点配置文件。
  - 样式放 CSS 变量（`styles/global.css` 的 `--` 变量）和 CSS Modules，不在组件里写死颜色、间距。
- 新增一个可调的值时：先想它归哪一层配置，再写代码读取它；测试里读真实的 `site.yaml`（见 `vitest.setup.ts`）。
- 例外要在代码里写明原因（如图形内部的绘制比例、校验用的枚举）。

## 分支命名

- 新分支一律用 `dev/<阶段前缀>-<内容>` 的形式创建。
- 阶段前缀为 `phase<阶段号>`，阶段号对应 `docs/教学平台方案.md` 的路线（0、1、2…）。
- `<内容>` 用小写英文单词，以 `-` 连接，简短说明这条分支做什么。
- 示例：`dev/phase0-monorepo`、`dev/phase0-cloudflare-share`、`dev/phase1-scene-template`、`dev/phase2-lesson-clock`。
- 不直接在 `main` 上开发；一个分支只做一个阶段内的一件事。

## 其他

- 回复用中文。
- git 远程地址用 SSH 形式（`git@github.com:yuy-qk/flow_see.git`），不要给 https 地址。
- 未经要求不创建 PR。
