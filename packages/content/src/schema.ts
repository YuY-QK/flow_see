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
    counterBorder: z
      .object({
        width: nonNeg.describe('边框粗细（舞台坐标）'),
        darken: z.number().min(0).max(1).describe('边框比填充色深多少，0 = 同色，1 = 黑色'),
      })
      .strict()
      .describe('计数块的边框：让靠在一起、叠在一起的块也分得清'),
    counterShadow: z
      .object({
        dx: z.number().describe('阴影向右偏多少（舞台坐标）'),
        dy: z.number().describe('阴影向下偏多少（舞台坐标）'),
        opacity: z.number().min(0).max(1).describe('阴影深浅，0 = 没有'),
      })
      .strict()
      .describe('计数块的阴影：让块看起来浮在上面，叠在一起也分得清'),
    tryIt: z
      .object({
        dropPadding: nonNeg.describe('放到目标零件外面这么远以内也算放进去（舞台坐标）'),
        hitScale: z.number().min(1).describe('能拖的零件，按下的范围是它本身的几倍'),
        liftScale: z.number().min(1).describe('拖起来时放大的倍数'),
      })
      .strict()
      .describe('动手做时舞台上的拖动'),
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
    handsOn: z
      .object({
        targetAfterMisses: z.int().min(1).describe('做错几次后，高亮该放到哪里'),
        demoAfterMisses: z.int().min(1).describe('做错几次后，自动“看我做一遍”'),
        demoPauseMs: nonNeg.describe('演示放完后停多久，再让孩子自己做'),
        selfDwellMs: nonNeg.describe('自己做：最后一步（结果）显示多久后算做完'),
      })
      .strict()
      .describe('动手做：跟着做 / 自己做'),
  })
  .strict();

const profileSchema = z
  .object({
    avatarCount: z
      .int()
      .positive()
      .describe('头像颜色的个数，须和 global.css 的 --avatar-N 个数一致'),
    nicknameMax: z.int().positive().describe('昵称最多几个字'),
  })
  .strict();

const speechSchema = z
  .object({
    rates: z
      .object(
        Object.fromEntries(SPEECH_RATES.map((k) => [k, z.number().positive()])) as Record<
          (typeof SPEECH_RATES)[number],
          z.ZodNumber
        >,
      )
      .strict()
      .describe('朗读语速三档对应的倍率'),
  })
  .strict();

const editorSchema = z
  .object({
    autosaveMs: nonNeg.describe('改动后多久自动保存'),
    stepDurations: z
      .array(z.number().positive())
      .describe('“停留时间”下拉里除“自动按朗读”外的可选秒数'),
  })
  .strict();

const uiSchema = z
  .object({
    focusDelayMs: nonNeg.describe('展开搜索框后，等多久再让输入框获得焦点'),
    saveRevokeMs: nonNeg.describe('导出文件下载后，多久释放临时地址'),
  })
  .strict();

/* ───────────── style.yaml ───────────── */

const colorValue = z
  .string()
  .regex(
    /^(#[0-9a-fA-F]{6}|transparent|rgba?\([\d\s.,]+\))$/,
    '颜色写成 #RRGGBB、transparent，或 rgba 写法',
  );
const textStyle = z
  .object({ weight: z.int().min(100).max(900), size: z.number().positive() })
  .strict();

const themeSchema = z
  .object({
    name: text.describe('主题名称（设置页和创作的外观面板里显示）'),
    stageBg: colorValue,
    stageBorder: colorValue,
    ink: colorValue,
    dim: colorValue,
    accent: colorValue,
    line: colorValue,
    labelBg: colorValue,
    palette: z.array(colorValue).min(1).describe('元素依次使用的颜色'),
    elementInk: colorValue,
    radius: z.number().min(0),
    font: text.describe('字体；inherit = 跟随界面'),
  })
  .strict();

const point = z.tuple([z.number(), z.number()]);
const labelLayout = z.object({ at: point, size: z.number().positive() }).strict();

/** fraction 模板的版式 */
const fractionLayoutSchema = z
  .object({
    stage: z.object({ width: z.number().positive(), height: z.number().positive() }).strict(),
    shapeAt: point.describe('图形中心'),
    radius: z.number().positive().describe('圆的半径'),
    bar: z.object({ width: z.number().positive(), height: z.number().positive() }).strict(),
    color: text.describe('涂色的颜色（site.yaml scene.colors 里的颜色名）'),
    caption: labelLayout.describe('图形下方的说明'),
    fraction: labelLayout.describe('右侧的分数'),
  })
  .strict();

/** clock 模板的版式 */
const clockLayoutSchema = z
  .object({
    stage: z.object({ width: z.number().positive(), height: z.number().positive() }).strict(),
    at: point.describe('钟面中心'),
    radius: z.number().positive().describe('钟面半径'),
    digital: labelLayout.describe('电子钟'),
    caption: labelLayout.describe('说明文字'),
    secondsPerHour: z.number().positive().describe('时间连续走动时，走 1 小时用几秒'),
  })
  .strict();

/** 动画主题 + 导出视频/GIF 的画面样式 */
export const styleSchema = z
  .object({
    themes: z
      .object(
        Object.fromEntries(ANIM_THEMES.map((id) => [id, themeSchema])) as Record<
          (typeof ANIM_THEMES)[number],
          typeof themeSchema
        >,
      )
      .strict()
      .describe('动画主题：只影响动画画面，不影响界面本身'),
    export: z
      .object({
        font: text,
        baseWidth: z
          .number()
          .positive()
          .describe('下面的尺寸都以这个宽度为基准，按实际输出宽度等比缩放'),
        darkThemes: z
          .array(z.enum(ANIM_THEMES))
          .describe('深色的动画主题：字幕直接用主题自己的文字色'),
        hold: z.object({ minMs: nonNeg, maxMs: nonNeg }).strict(),
        video: z
          .object({
            width: z.int().positive(),
            height: z.int().positive(),
            fps: z.int().positive(),
            codec: text,
            bitrate: z.int().positive(),
          })
          .strict(),
        gif: z
          .object({
            width: z.int().positive(),
            height: z.int().positive(),
            colors: z.int().min(2).max(256),
            fadeFrames: z.int().min(0),
          })
          .strict(),
        fadeMs: nonNeg.describe('两步之间的叠化时长'),
        layout: z
          .object({
            pad: nonNeg,
            titleH: nonNeg,
            captionH: nonNeg,
            captionRadius: nonNeg,
            captionInset: nonNeg,
          })
          .strict(),
        title: textStyle,
        signature: textStyle,
        counter: textStyle.extend({ top: nonNeg }),
        step: textStyle.extend({ top: nonNeg }),
        desc: textStyle.extend({ top: nonNeg, lineHeight: nonNeg, maxLines: z.int().positive() }),
        caption: z
          .object({
            bg: colorValue,
            border: colorValue,
            darkBg: colorValue,
            darkBorder: colorValue,
            counter: colorValue,
            step: colorValue,
            desc: colorValue,
          })
          .strict(),
      })
      .strict(),
    templates: z
      .object({ fraction: fractionLayoutSchema, clock: clockLayoutSchema })
      .strict()
      .describe('由参数生成画面的模板（fraction、clock）的版式'),
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
    style: z
      .string()
      .default('style.yaml')
      .describe('动画主题和导出画面的样式文件，相对 packages/content'),
    texts: z
      .string()
      .default('texts.yaml')
      .describe('界面文案文件，相对 packages/content；代码里用 t("分组.键") 读取'),
    // 以下两节没有写在代码里的默认值：必须在 site.yaml 里给全（单一来源，改它就能调整）
    scene: sceneStyleSchema,
    player: playerSchema,
    profile: profileSchema,
    speech: speechSchema,
    editor: editorSchema,
    ui: uiSchema,
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

/** 动手做：这一步由孩子来做（跟着做 / 自己做时），do 是标准做法（演示、做对后的结果） */
const trySchema = z
  .object({
    task: text.describe(
      '任务提示：轮到孩子时显示并朗读，如“把 1 个圆片拖进十格框。”“十格框还空着几格？”',
    ),
    drag: z
      .object({
        from: z.string().describe('从哪一组计数块里拖（零件 id）'),
        to: z.string().describe('拖到哪个零件上（零件 id）'),
        count: paramRef.describe('要拖几个，可以写参数，如 "{gap}"'),
      })
      .strict()
      .optional()
      .describe('拖动：把计数块一个一个拖到目标零件上（只有场景模板支持）'),
    choose: z
      .object({
        answer: paramRef.describe('正确答案：数字或文字，可以写参数，如 "{gap}"、"{take}/{parts}"'),
        options: z
          .array(paramRef)
          .min(2)
          .max(4)
          .optional()
          .describe('选项；不写时答案是数字就自动生成（答案和离它最近的两个数）'),
        min: z.number().optional().describe('自动生成选项时数字的下限'),
        max: z.number().optional().describe('自动生成选项时数字的上限'),
        show: z
          .array(z.string())
          .optional()
          .describe('做错几次后高亮这些零件（零件 id）；不写就不高亮'),
      })
      .strict()
      .optional()
      .describe('点选：从几个选项里选出答案（所有模板都支持）'),
    hints: z
      .array(text)
      .max(3)
      .optional()
      .describe('做错时依次给出的提示（每句不超过约 30 字）；不写用通用提示'),
  })
  .strict()
  .refine((v) => !!v.drag !== !!v.choose, '动手方式 drag 和 choose 写一个就行');

const stepSchema = z
  .object({
    say: text.describe('这一步的讲解，会朗读；可以用 {参数名} 代入参数'),
    title: z.string().optional(),
    show: z.string().optional().describe('模板约定的画面状态'),
    do: z
      .array(z.record(z.string(), z.unknown()))
      .optional()
      .describe('场景模板：这一步对零件做的动作'),
    try: trySchema.optional().describe('动手做：跟着做 / 自己做时，这一步由孩子来做'),
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
    cover: z
      .object({
        step: z.int().min(1).optional().describe('缩略图用第几步的画面，默认最后一步'),
        params: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('缩略图用的参数，默认标准取值'),
        text: text.optional().describe('画面加载出来之前显示的文字，如算式“9 + 4”“3/4”'),
      })
      .strict()
      .optional()
      .describe('缩略图：用这个知识点自己的动画画面，不用另外做图'),
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

/* ───────────── examples/*.yaml ───────────── */

/** 创作页示例的目录：分类、显示顺序、来源署名 */
export const examplesIndexSchema = z
  .object({
    categories: z.array(text).min(1).describe('分类，显示顺序同这里'),
    source: text.describe('来源：第一版只有官方；以后社区投稿入选精选后显示作者名'),
    author: text.describe('示例作品的署名'),
    items: z
      .array(z.string().regex(/^[a-z0-9][a-z0-9-]*$/))
      .describe('示例的显示顺序，对应 examples/<id>.yaml'),
  })
  .strict();

/**
 * 一个示例动画。元素用名字写（不用 id）：
 * - message：每步 from / to（角色名）、label；
 * - flow：每步 node（节点名）、via；
 * - cycle：每步 stage（阶段名），params.layout 是 cycle 或 timeline；
 * - data：不写 steps，由 params（values、algorithm、order）自动生成。
 */
export const exampleSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, '示例 id 用小写英文、数字和 -'),
    title: text,
    category: text.describe('必须是 examples/index.yaml 里 categories 的一项'),
    featured: z.boolean().default(false),
    summary: text,
    template: z.enum(['message', 'flow', 'cycle', 'data']),
    theme: z.enum(ANIM_THEMES),
    elements: z.array(text).optional().describe('角色 / 节点 / 阶段的名字，不能重复'),
    params: z.record(z.string(), z.unknown()).optional(),
    steps: z
      .array(
        z
          .object({
            title: text,
            desc: z.string().default(''),
            from: z.string().optional(),
            to: z.string().optional(),
            label: z.string().optional(),
            node: z.string().optional(),
            via: z.string().optional(),
            stage: z.string().optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

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
  style: styleSchema,
  examples: examplesIndexSchema,
  example: exampleSchema,
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
export type StyleConfigData = z.output<typeof styleSchema>;
export type ExamplesIndexConfig = z.output<typeof examplesIndexSchema>;
export type ExampleConfig = z.output<typeof exampleSchema>;
/** 创作页的示例：目录 + 全部示例（按 items 的顺序） */
export type ExamplesConfig = ExamplesIndexConfig & { list: ExampleConfig[] };
export type GradesConfig = z.output<typeof gradesSchema>;
export type CurriculumConfig = z.output<typeof curriculumSchema>;
export type LessonConfig = z.output<typeof lessonSchema>;
export type AssetEntry = z.output<typeof assetSchema>;
export type LessonStatus = (typeof LESSON_STATUSES)[number];
