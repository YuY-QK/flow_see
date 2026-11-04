// 内容配置的格式定义（唯一来源）。
// - pnpm content:schema 由这里生成 schemas/*.schema.json（编辑器补全、报错用）；
// - pnpm content:check 和网站构建都按这里校验并补上默认值。
// site.yaml 各项的默认值以《小学版页面规格》2.7 为准；应用代码只读取解析后的配置，不写死这些值。
import { z } from 'zod';

// 校验报错用中文
z.config(z.locales.zhCN());

const text = z.string().trim().min(1);

/* ───────────── site.yaml ───────────── */

export const UI_THEMES = ['light', 'dark', 'auto'] as const;
export const ANIM_THEMES = ['flat', 'cute', 'chalk', 'pro'] as const;
export const FONT_SIZES = ['normal', 'large'] as const;
export const SPEECH_RATES = ['slow', 'normal', 'fast'] as const;

const speed = z.union([z.literal(0.5), z.literal(1), z.literal(1.5), z.literal(2)]);

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色写成 #RRGGBB');
const nonNeg = z.number().min(0);

/** 场景零件的外观与默认值（blocks 的 SceneStyle） */
const sceneStyleSchema = z
  .object({
    stage: z
      .object({ width: z.number().positive(), height: z.number().positive() })
      .strict()
      .describe('没有写 stage 的知识点用这个舞台大小'),
    colors: z
      .record(z.string().regex(/^[a-z][a-z0-9-]*$/), hexColor)
      .describe('配置里可以直接写的颜色名'),
    highlight: z
      .object({
        padding: nonNeg,
        strokeWidth: nonNeg,
        fillOpacity: z.number().min(0).max(1),
        dash: z.string().describe('虚线样式，如 "10 6"'),
      })
      .strict(),
    actionSeconds: z
      .record(z.string(), nonNeg)
      .describe('各动作没写 duration 时的默认时长（秒），键是动作名'),
    splitLift: z.number().describe('拆分出来的计数块默认往上抬多少（相对格子大小）'),
    tenframeGap: nonNeg.describe('十格框之间的间距（相对格子大小）'),
    parts: z
      .record(z.string(), z.record(z.string(), z.unknown()))
      .describe('各零件的默认属性，键是零件 type'),
  })
  .strict();

/** 知识点播放器的时间和行为参数 */
const playerSchema = z
  .object({
    skeletonDelayMs: nonNeg.describe('加载超过这么久才显示骨架屏，避免闪一下'),
    toastMs: nonNeg.describe('轻提示显示多久'),
    largeCaptionMaxGrade: z.int().min(0).describe('这个年级及以下，字幕用大字号'),
    dwell: z
      .object({
        msPerChar: nonNeg.describe('不朗读时，每个字停留多少毫秒'),
        minMs: nonNeg.describe('不朗读时，一步至少停留多久'),
      })
      .strict(),
    afterSpeech: z
      .object({
        pauseMs: nonNeg.describe('读完后至少再停多久（1 倍速）'),
        minMs: nonNeg.describe('读完后停顿的下限'),
        blockedRatio: z
          .number()
          .min(0)
          .max(1)
          .describe('朗读被浏览器拦下、瞬间“读完”时，按估算停留时间的这个比例等待'),
      })
      .strict(),
    maxFrameMs: z
      .number()
      .positive()
      .describe('时钟单帧最多推进多久，切到后台再回来时不会一下跳过去'),
  })
  .strict();

export const siteSchema = z
  .object({
    site: z
      .object({
        name: text.default('动画学堂').describe('网站名称：顶部栏、侧边栏、网页标题、设置·关于'),
        slogan: z.string().default('看动画，动手试，弄明白为什么'),
        logo: z.string().default('assets/brand/logo.svg').describe('相对 packages/content 的路径'),
      })
      .strict()
      .prefault({}),
    contact: z
      .object({
        email: z.union([z.literal(''), z.email()]).default(''),
        wechat: z.string().default(''),
      })
      .strict()
      .prefault({})
      .describe('全部留空 → 帮助页隐藏反馈区'),
    defaults: z
      .object({
        grade: z
          .int()
          .min(1)
          .default(1)
          .describe('第一次打开时的年级，须在 curriculum/grades.yaml 中'),
        subject: z.string().default('math'),
        uiTheme: z.enum(UI_THEMES).default('light'),
        animTheme: z.enum(ANIM_THEMES).default('cute'),
        fontSize: z.enum(FONT_SIZES).default('normal'),
        narrate: z.boolean().default(true).describe('自动朗读'),
        speechRate: z.enum(SPEECH_RATES).default('normal'),
        speed: speed.default(1),
        autoplayOnFirstOpen: z.boolean().default(true),
      })
      .strict()
      .prefault({})
      .describe('第一次打开时的默认值；用户改过后以本机设置为准'),
    learning: z
      .object({
        recordLimit: z.int().positive().default(200),
        continueCount: z
          .object({
            desktop: z.int().min(0).default(3),
            pad: z.int().min(0).default(2),
            phone: z.int().min(0).default(2),
          })
          .strict()
          .prefault({}),
        recommendedLimit: z.int().min(0).default(4),
        prevNextCrossGrade: z.boolean().default(false),
        prevNextCrossSubject: z.boolean().default(false),
      })
      .strict()
      .prefault({}),
    search: z
      .object({
        hints: z.array(text).default(['分数', '钟表', '凑十', '植物', '水']),
        maxResults: z.int().positive().default(50),
      })
      .strict()
      .prefault({}),
    share: z
      .object({
        apiBase: z.string().default('/api').describe('分享接口地址；换到自己的服务器时只改这里'),
      })
      .strict()
      .prefault({}),
    help: z
      .object({
        faq: z.string().default('help.yaml').describe('常见问题文件，相对 packages/content'),
      })
      .strict()
      .prefault({}),
    texts: z
      .string()
      .default('texts.yaml')
      .describe('界面文案文件，相对 packages/content；代码里用 t("分组.键") 读取'),
    // 以下两节没有写在代码里的默认值：必须在 site.yaml 里给全（单一来源，改它就能调整）
    scene: sceneStyleSchema,
    player: playerSchema,
  })
  .strict();

/* ───────────── texts.yaml ───────────── */

/** 界面文案：分组 → 键 → 文字。文字里的 {名字} 由代码代入。 */
export const textsSchema = z
  .record(
    z.string().regex(/^[a-z][A-Za-z0-9]*$/, '分组名用英文小驼峰，如 lessonPage'),
    z.record(z.string().regex(/^[a-z][A-Za-z0-9_]*$/, '键用英文、数字、下划线'), z.string()),
  )
  .describe('界面文案：分组 → 键 → 文字；文字里的 {名字} 由代码代入');

/* ───────────── help.yaml ───────────── */

export const helpSchema = z
  .object({
    faq: z.array(z.object({ q: text, a: text }).strict()).min(1),
  })
  .strict();

/* ───────────── curriculum/grades.yaml ───────────── */

export const gradesSchema = z
  .object({
    grades: z.array(z.object({ id: z.int().min(1), name: text }).strict()).min(1),
    subjects: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z][a-z0-9-]*$/, '学科 id 用小写英文'),
            name: text,
            color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色写成 #RRGGBB'),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

/* ───────────── curriculum/<学科>/grade<N>.yaml ───────────── */

const lessonId = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, '知识点 id 用小写英文、数字和 -');

export const curriculumSchema = z
  .object({
    subject: z.string(),
    grade: z.int().min(1),
    units: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
            title: text,
            lessons: z.array(
              z.union([
                lessonId,
                z
                  .object({
                    id: lessonId,
                    title: text.describe('知识点文件还没写时，卡片上显示的名称'),
                  })
                  .strict(),
              ]),
            ),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

/* ───────────── lessons/<学科>/g<年级>/<id>.yaml ───────────── */

/** 数字，或用其他参数算出来的式子，如 "{parts}"、"11 - a" */
const paramRef = z.union([z.number(), z.string().min(1)]);

const exploreSchema = z
  .object({
    param: z.string(),
    control: z.enum(['slider', 'buttons', 'switch']),
    label: text,
    min: paramRef.optional(),
    max: paramRef.optional(),
    step: z.number().positive().optional(),
    options: z.array(z.object({ value: z.unknown(), label: text }).strict()).optional(),
  })
  .strict();

const stepSchema = z
  .object({
    say: text.describe('这一步的讲解，会朗读；可以用 {参数名} 代入参数'),
    title: z.string().optional(),
    show: z.string().optional().describe('模板约定的画面状态'),
    do: z
      .array(z.record(z.string(), z.unknown()))
      .optional()
      .describe('场景模板：这一步对零件做的动作'),
  })
  .strict();

export const LESSON_STATUSES = ['draft', 'reviewed', 'published'] as const;

export const lessonSchema = z
  .object({
    id: lessonId,
    title: text,
    summary: text,
    status: z.enum(LESSON_STATUSES).default('draft'),
    reviewedAt: z.iso.date().optional(),
    duration: z.string().optional(),
    tags: z.array(text).default([]),
    recommended: z.boolean().default(false),
    thumbnail: z.string().optional().describe('素材 id'),
    template: z.string(),
    theme: z.enum(ANIM_THEMES).optional(),
    stage: z
      .object({ width: z.number().positive(), height: z.number().positive() })
      .strict()
      .optional(),
    params: z.record(z.string(), z.unknown()).default({}),
    derived: z
      .record(z.string().regex(/^[A-Za-z_]\w*$/), z.union([z.number(), z.string().min(1)]))
      .optional()
      .describe('派生值：由参数算出来，如 gap: "10 - a"；按写的顺序计算，后面的可以用前面的'),
    presets: z
      .array(
        z
          .object({
            label: text.describe('按钮上的文字，如 8 + 6'),
            params: z.record(z.string(), z.unknown()),
          })
          .strict(),
      )
      .optional()
      .describe('动手试一试：点选的例子（只写要改的参数）'),
    objects: z.array(z.object({ id: z.string(), type: z.string() }).loose()).optional(),
    explore: z.array(exploreSchema).optional(),
    resultStep: z.int().min(1).optional().describe('调整“动手试一试”后跳到第几步，默认最后一步'),
    steps: z.array(stepSchema).min(1),
    keyPoints: z.array(text).min(2).max(4),
  })
  .strict()
  .superRefine((l, ctx) => {
    if (l.status !== 'draft' && !l.reviewedAt)
      ctx.addIssue({
        code: 'custom',
        path: ['reviewedAt'],
        message: '已校对或已发布的知识点要写校对日期 reviewedAt',
      });
  });

/* ───────────── assets/manifest.yaml ───────────── */

export const AI_SOURCE = 'AI 生成';

export const assetSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    file: z.string().describe('相对 assets/ 的路径'),
    source: text.describe(`“${AI_SOURCE}”、“自绘”或开源素材的来源名称`),
    tool: z.string().optional(),
    author: z.string().optional(),
    license: z.string().optional(),
    url: z.string().optional(),
    createdAt: z.iso.date().optional(),
  })
  .strict()
  .superRefine((a, ctx) => {
    if (a.source === AI_SOURCE && !a.tool)
      ctx.addIssue({ code: 'custom', path: ['tool'], message: 'AI 生成的素材要写所用工具 tool' });
    if (a.source !== AI_SOURCE && a.source !== '自绘' && !a.license)
      ctx.addIssue({ code: 'custom', path: ['license'], message: '开源素材要写许可证 license' });
  });

export const manifestSchema = z.array(assetSchema);

/** 每种配置文件对应的格式；key 也是 schemas/ 下的文件名 */
export const SCHEMAS = {
  site: siteSchema,
  help: helpSchema,
  texts: textsSchema,
  grades: gradesSchema,
  curriculum: curriculumSchema,
  lesson: lessonSchema,
  manifest: manifestSchema,
} as const;
export type SchemaName = keyof typeof SCHEMAS;

export type SiteConfig = z.output<typeof siteSchema>;
export type SceneStyleConfig = SiteConfig['scene'];
export type HelpConfig = z.output<typeof helpSchema>;
export type TextsConfig = z.output<typeof textsSchema>;
export type GradesConfig = z.output<typeof gradesSchema>;
export type CurriculumConfig = z.output<typeof curriculumSchema>;
export type LessonConfig = z.output<typeof lessonSchema>;
export type AssetEntry = z.output<typeof assetSchema>;
export type LessonStatus = (typeof LESSON_STATUSES)[number];
