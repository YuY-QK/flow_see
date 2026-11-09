// 目录索引：首页、学科页、搜索只需要它；知识点的完整内容按需加载。
// 这里只放纯数据和纯函数，浏览器和 Node 都能用。
import type {
  ExamplesConfig,
  GradesConfig,
  HelpConfig,
  LessonStatus,
  SiteConfig,
  TextsConfig,
  StyleConfigData,
} from './schema';

export interface LessonMeta {
  id: string;
  title: string;
  summary: string;
  duration?: string;
  tags: string[];
  recommended: boolean;
  status: LessonStatus;
  related?: string[];
  /** 缩略图素材 id */
  thumbnail?: string;
  /** 缩略图画面加载出来之前显示的文字（cover.text） */
  coverText?: string;
  template: string;
  steps: number;
  /** 有没有动手做（步骤里有 try）：有 = 三颗星，没有 = 只有“看一看”一颗 */
  hands: boolean;
}

export interface CatalogLesson {
  id: string;
  title: string;
  /** false = 目录里列了但还没有可用的知识点文件，显示“即将上线” */
  available: boolean;
  meta?: LessonMeta;
}

export interface CatalogUnit {
  id: string;
  title: string;
  term?: 1 | 2;
  domain?: string;
  lessons: CatalogLesson[];
}

export interface CatalogEntry {
  subject: string;
  grade: number;
  units: CatalogUnit[];
}

export interface ContentIndex {
  site: SiteConfig;
  help: HelpConfig;
  /** 界面文案（texts.yaml） */
  texts: TextsConfig;
  /** 动画主题与导出样式（style.yaml） */
  style: StyleConfigData;
  /** 创作页的示例动画（examples/） */
  examples: ExamplesConfig;
  grades: GradesConfig['grades'];
  subjects: GradesConfig['subjects'];
  catalog: CatalogEntry[];
  /** 开发模式：草稿和待发布的知识点也显示（带标记） */
  dev: boolean;
}

export interface IndexSource {
  site: SiteConfig;
  help: HelpConfig;
  texts: TextsConfig;
  style: StyleConfigData;
  examples: ExamplesConfig;
  grades: GradesConfig;
  curricula: {
    data: {
      subject: string;
      grade: number;
      units: {
        id: string;
        title: string;
        term?: 1 | 2;
        domain?: string;
        lessons: (string | { id: string; title: string })[];
      }[];
    };
  }[];
  lessons: {
    lesson: {
      id: string;
      title: string;
      summary: string;
      duration?: string;
      tags: string[];
      recommended: boolean;
      status: LessonStatus;
      related?: string[];
      thumbnail?: string;
      cover?: { text?: string };
      template: string;
      steps: { try?: unknown }[];
    };
  }[];
}

/** 线上只显示已发布的知识点；未发布的在目录里直接隐藏（规格 3.6） */
export function isVisible(status: LessonStatus, dev: boolean): boolean {
  return dev || status === 'published';
}

export function buildIndex(src: IndexSource, dev: boolean): ContentIndex {
  const metas = new Map<string, LessonMeta>(
    src.lessons.map(({ lesson: l }) => [
      l.id,
      {
        id: l.id,
        title: l.title,
        summary: l.summary,
        duration: l.duration,
        tags: l.tags,
        recommended: l.recommended,
        status: l.status,
        related: l.related,
        thumbnail: l.thumbnail,
        coverText: l.cover?.text,
        template: l.template,
        steps: l.steps.length,
        hands: l.steps.some((st) => !!st.try),
      },
    ]),
  );
  const catalog: CatalogEntry[] = src.curricula.map(({ data }) => ({
    subject: data.subject,
    grade: data.grade,
    units: data.units.map((u) => ({
      id: u.id,
      title: u.title,
      term: u.term,
      domain: u.domain,
      lessons: u.lessons.flatMap((entry): CatalogLesson[] => {
        const id = typeof entry === 'string' ? entry : entry.id;
        const meta = metas.get(id);
        if (!meta)
          return [{ id, title: typeof entry === 'string' ? id : entry.title, available: false }];
        if (!isVisible(meta.status, dev)) return [];
        return [{ id, title: meta.title, available: true, meta }];
      }),
    })),
  }));
  return {
    site: src.site,
    help: src.help,
    texts: src.texts,
    style: src.style,
    examples: src.examples,
    grades: src.grades.grades,
    subjects: src.grades.subjects,
    catalog,
    dev,
  };
}

/* ───────────── 页面上常用的查询 ───────────── */

export function findEntry(
  index: ContentIndex,
  grade: number,
  subject: string,
): CatalogEntry | undefined {
  return index.catalog.find((c) => c.grade === grade && c.subject === subject);
}

/** 某年级某学科已上线（可学习）的知识点，按目录顺序 */
export function availableLessons(
  entry: CatalogEntry | undefined,
): (CatalogLesson & { unit: CatalogUnit })[] {
  if (!entry) return [];
  return entry.units.flatMap((unit) =>
    unit.lessons.filter((l) => l.available).map((l) => ({ ...l, unit })),
  );
}

/** 按 id 找知识点（id 全站唯一）；只返回可学习的 */
export function findLesson(
  index: ContentIndex,
  id: string,
): { lesson: CatalogLesson; entry: CatalogEntry; unit: CatalogUnit } | undefined {
  for (const entry of index.catalog)
    for (const unit of entry.units)
      for (const lesson of unit.lessons)
        if (lesson.id === id && lesson.available) return { lesson, entry, unit };
  return undefined;
}

/** 搜索（规格 3.7）：标题、简介、标签、单元名；多个词需同时匹配；当前年级在前，标题命中优先 */
export function searchLessons(
  index: ContentIndex,
  query: string,
  currentGrade: number,
  limit: number,
) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits: {
    lesson: CatalogLesson;
    entry: CatalogEntry;
    unit: CatalogUnit;
    titleHit: boolean;
  }[] = [];
  for (const entry of index.catalog)
    for (const unit of entry.units)
      for (const lesson of unit.lessons) {
        if (!lesson.available || !lesson.meta) continue;
        const m = lesson.meta;
        const hay = [m.title, m.summary, ...m.tags, unit.title].join(' ').toLowerCase();
        if (!words.every((w) => hay.includes(w))) continue;
        hits.push({
          lesson,
          entry,
          unit,
          titleHit: words.some((w) => m.title.toLowerCase().includes(w)),
        });
      }
  return hits
    .map((h, i) => ({ h, i }))
    .sort(
      (a, b) =>
        Number(b.h.entry.grade === currentGrade) - Number(a.h.entry.grade === currentGrade) ||
        Number(b.h.titleHit) - Number(a.h.titleHit) ||
        a.i - b.i,
    )
    .slice(0, limit)
    .map(({ h }) => h);
}

/** 搜索词拆成小写的词（空格分隔） */
export function splitQuery(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

export interface TextPart {
  text: string;
  hit: boolean;
}

/** 把文字按搜索词切成命中 / 未命中的片段，用于高亮；重叠的命中合并成一段 */
export function highlightParts(text: string, words: string[]): TextPart[] {
  const lower = text.toLowerCase();
  const hit = new Array<boolean>(text.length).fill(false);
  for (const w of words) {
    if (!w) continue;
    for (let i = lower.indexOf(w); i !== -1; i = lower.indexOf(w, i + 1))
      hit.fill(true, i, i + w.length);
  }
  const parts: TextPart[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.hit === hit[i]) last.text += text[i];
    else parts.push({ text: text[i], hit: hit[i] });
  }
  return parts;
}

export interface LessonPlace {
  lesson: CatalogLesson;
  entry: CatalogEntry;
  unit: CatalogUnit;
}

/**
 * 上一个 / 下一个（规格 3.5）：按目录里单元顺序 + 单元内顺序，可以跨单元，跳过“即将上线”的。
 * 默认不跨年级、不跨学科（site.yaml 的 learning.prevNextCrossGrade / prevNextCrossSubject）。
 */
export function lessonNeighbors(
  index: ContentIndex,
  id: string,
  opts: { crossGrade: boolean; crossSubject: boolean },
): { prev?: LessonPlace; next?: LessonPlace } {
  const here = findLesson(index, id);
  if (!here) return {};
  const subjectOrder = (s: string) => index.subjects.findIndex((x) => x.id === s);
  const entries = index.catalog
    .filter(
      (c) =>
        (opts.crossGrade || c.grade === here.entry.grade) &&
        (opts.crossSubject || c.subject === here.entry.subject),
    )
    .sort((a, b) => a.grade - b.grade || subjectOrder(a.subject) - subjectOrder(b.subject));
  const list: LessonPlace[] = entries.flatMap((entry) =>
    availableLessons(entry).map(({ unit, ...lesson }) => ({ lesson, entry, unit })),
  );
  const i = list.findIndex((p) => p.lesson.id === id);
  return { prev: list[i - 1], next: list[i + 1] };
}
