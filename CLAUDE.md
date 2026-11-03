# 动画学堂 · 开发约定

## 文档

- 开发和验收以 `docs/小学版页面规格.md` 为准；范围与配置格式见 `docs/小学版需求设计.md`；架构与阶段路线见 `docs/教学平台方案.md`。
- 站点级可调项（名称、联系方式、默认值、条数上限等）只放在 `packages/content/site.yaml`，代码里不写死（规格 2.7）。

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
