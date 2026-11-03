# 动画学堂（flow_see）

把任何有流程的事物或原理，做成可以观察、可以交互的动画，让它们更容易被理解。

## 项目目标

世界上有大量“按步骤发生”的事物：算法如何一步步执行、网络协议如何握手、
工作流程如何流转、科学原理如何演化。纯文字和静态图很难表达“过程”本身。

**动画流**希望做到：

- 把流程类内容（算法、协议、工作流程、科学原理等）可视化为动画
- 支持观察与控制：播放、暂停、单步、回退、调速
- 让人一眼看清“每一步发生了什么、状态如何变化、为什么”
- 新增一个动画的成本尽量低，便于持续扩充内容

## 当前状态

正在把它做成面向小学的 **动画学堂**（数学、科学知识点动画，配置驱动）。文档：

- [小学版页面规格](./docs/小学版页面规格.md)（开发和验收以它为准）
- [小学版需求设计](./docs/小学版需求设计.md)（范围、配置格式）
- [教学平台方案](./docs/教学平台方案.md)（架构、阶段路线）
- [部署](./docs/部署.md)（Cloudflare Pages / 自己的服务器）

阶段 0（分层重构、内容配置与校验、Cloudflare 部署、学习中心骨架）已完成。第一版的创作功能（四种模板、播放器、分享、导出视频/GIF）全部保留，入口在侧边栏“创作”。

## 本地运行

需要 Node.js 20+ 和 pnpm。

```bash
pnpm install
pnpm dev             # 网站开发服务器：http://localhost:5173（改内容配置，页面自动刷新）
pnpm server          # 分享服务（另开一个终端）：http://localhost:8787，开发时 /api 自动转发到这里
pnpm test            # 单元测试（各个包、网站、分享接口的 Node 与 Cloudflare 两种存储）
pnpm lint            # 代码检查（含分层依赖方向检查）
pnpm content:check   # 检查 packages/content 下的全部配置
pnpm content:schema  # 改了内容格式定义（packages/content/src/schema.ts）后重新生成 JSON Schema
pnpm build           # 内容检查 + 类型检查 + 打包到 apps/web/dist/
```

## 新增内容

内容全部在 `packages/content/`，不需要改代码：

```
packages/content/
├── site.yaml            # 站点公共配置：名称、联系方式、默认值、条数上限、分享接口地址（规格 2.7）
├── help.yaml            # 帮助页的常见问题
├── curriculum/
│   ├── grades.yaml      # 年级、学科与学科配色
│   └── <学科>/grade<N>.yaml   # 某年级某学科的单元与知识点目录
├── lessons/<学科>/g<N>/<id>.yaml   # 一个知识点一个文件
├── assets/              # 素材 + manifest.yaml（来源、作者、许可证）
└── schemas/             # 由 src/schema.ts 生成的 JSON Schema（编辑器补全和报错）
```

每个 YAML 文件第一行的 `yaml-language-server` 注释指向对应的 JSON Schema，VS Code 装上 YAML 插件即可补全。

## 部署

见 [docs/部署.md](./docs/部署.md)。简要：Cloudflare Pages 构建命令 `pnpm build`，输出目录 `apps/web/dist`，分享接口由 Pages Functions + KV 提供；也可以 `pnpm build && pnpm start` 部署到自己的服务器。

## 打包 App（暂不维护）

1. 把 `.env.app.example` 复制为 `.env.app`，填上服务器地址（App 里的分享链接要指向公网）。
2. 运行 `pnpm build:app`（打包并同步到原生工程）。
3. 安卓：`pnpm cap:android` 用 Android Studio 打开；iOS：`pnpm cap:ios` 用 Xcode 打开（需要 macOS）。

## 目录结构

分层 monorepo（pnpm workspace），依赖方向只能向下：`apps/web → content → templates → blocks → runtime → core`，由 ESLint 检查。

```
packages/
├── core/        # 纯 TypeScript：作品数据结构、编辑、播放状态机、主题
├── runtime/     # React 运行时：播放器、编辑器组件、存储、朗读、分享、导出、设置
├── blocks/      # 积木（画面零件），阶段 1 起填充
├── templates/   # 动画模板：generic/（流程图、消息传递、数据变化、循环）及注册表
└── content/     # 内容配置（YAML）、格式定义与校验、Vite 插件、创作示例
apps/
└── web/         # 网站：页面、顶部栏与侧边栏、站点启动配置
server/          # 分享接口（share-api.mjs 共用逻辑）+ Node 服务与文件存储 + KV 存储
functions/       # Cloudflare Pages Functions 入口
android/ ios/    # Capacitor 原生工程
```

## 许可证

见 [LICENSE](./LICENSE)。
