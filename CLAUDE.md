# 动画学堂 · 开发约定

## 文档

- 开发和验收以 `docs/小学版页面规格.md` 为准；范围与配置格式见 `docs/小学版需求设计.md`；架构与阶段路线见 `docs/教学平台方案.md`。
- 站点级可调项（名称、联系方式、默认值、条数上限等）只放在 `packages/content/site.yaml`，代码里不写死（规格 2.7）。

## 配置优先

- 能配置的都不要写死在代码里：数据、文案、数值、颜色、尺寸、时长、默认值，统一放配置文件，方便管理和调整。
  - 站点级的（零件外观与默认值、播放器时间、界面文字、条数上限等）放 `packages/content/site.yaml`，并在 `src/schema.ts` 里定义格式（没有默认值的节必须在 yaml 里给全）；代码只读取配置，不留第二份。
  - 界面文案放 `packages/content/texts.yaml`（分组 → 键 → 文字，`{名字}` 由代码代入），代码里用 `t('分组.键', { 名字 })` 读取（`@flow-see/core`）；**代码里不要写中文字符串**（注释除外）。
  - 内容级的（知识点的参数、例子、控件范围）放知识点配置文件；创作页的示例动画放 `packages/content/examples/`（每个示例一个 yaml，元素用名字引用）。
  - 界面样式：颜色、阴影、遮罩、字号都用 `apps/web/src/styles/global.css` 里的 CSS 变量（颜色 `--ink`、`--primary`…，字号 `--fs-*`）；没有合适的就在 `:root` 和深色主题块里新增变量，**CSS Modules 和组件里不要写颜色值、固定字号**。
  - 动画主题（配色、圆角、字体）和导出视频/GIF 的画面样式放 `packages/content/style.yaml`；场景零件的颜色名、默认属性放 `site.yaml` 的 `scene`。
- 新增一个可调的值时：先想它归哪一层配置，再写代码读取它；测试里读真实的 `site.yaml`（见 `vitest.setup.ts`）。
- 例外要写明原因：绘制比例等在代码注释里说明；约定检查的例外加到 `scripts/conventions/allow.ts`，每条都写原因，能不加就不加。
- **自动检查**：`pnpm check:conventions`（也包含在 `pnpm test` 和 `pnpm build` 里，CI 会跑）。它会拦住：代码里写死的中文、`t()` 的键在 `texts.yaml` 里不存在、`texts.yaml` 里没用到的键、代入变量对不上；代码或 CSS 里写死的颜色值；CSS 里不用 `--fs-*` 的字号。检查失败时按提示改，不要放宽检查。

- **界面间距与留白**（规格 2.8）：界面要紧凑，不留大块空白。
  - 间距用 4 的倍数：块与块之间 8–12px，容器内边距 8–16px（手机 6–12px），同组控件之间 6–8px。
  - 内容为空时不渲染，**不要用 `min-height` 或空元素给“可能出现的内容”预留空间**；文字容器不写固定高度。
  - 新出现的内容（选项、提示、按钮）要淡入过渡（≤ 0.3 秒），并照顾“减少动态效果”。
  - 改完界面在电脑、iPad、手机三种宽度下截图，逐一检查留白和遮挡后再提交。

- **已知的例外（有意没配置的，别当成遗漏）**：
  - 间距、内边距、宽高等布局尺寸（CSS 里的 `px`）；只有颜色、字号、阴影、遮罩走变量。
  - CSS 媒体查询的断点（767 / 900 等）：CSS 读不了 yaml；`learn/device.ts` 里的断点要和 CSS 保持一致。
  - 创作模板（流程、消息、数据、循环）舞台里的 SVG 绘制尺寸和版式常量（`BOX_W`、`GAP` 等）：属于绘制几何，不是内容参数。
  - `SPEEDS`（播放速度档位）、语言代码（`zh-CN`）：和类型、浏览器接口绑定的枚举。
  - 面向写配置的人的报错（`content:check`、JSON Schema 说明、零件中文名）和 `server/` 里的接口报错：不是产品界面文案。

## 分支命名

- 新分支一律用 `dev/<阶段前缀>-<内容>` 的形式创建。
- 阶段前缀为 `phase<阶段号>`，阶段号对应 `docs/教学平台方案.md` 的路线（0、1、2…）。
- `<内容>` 用小写英文单词，以 `-` 连接，简短说明这条分支做什么。
- 示例：`dev/phase0-monorepo`、`dev/phase0-cloudflare-share`、`dev/phase1-scene-template`、`dev/phase2-lesson-clock`。
- 一个分支只做一个阶段内的一件事。
- **`develop` 是开发主线，`main` 是线上**（推送到 `main` 会自动部署）：
  - 新分支一律从最新的 `develop` 拉出，做完合并回 `develop`；不直接在 `develop`、`main` 上开发。
  - 只有一个里程碑（一个批次的零件 + 知识点验收完）完成后，才由维护人把 `develop` 合并到 `main`。
  - 合并前 `pnpm lint`、`pnpm test`、`pnpm build` 全部通过；CI（`.github/workflows/ci.yml`）在 `develop`、`dev/**` 和合并请求上都会跑。

## 其他

- 回复用中文。
- git 远程地址用 SSH 形式（`git@github.com:yuy-qk/flow_see.git`），不要给 https 地址。
- 未经要求不创建 PR。
