// 本机学习记录（规格 3.1、3.2）。
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage } from '@flow-see/runtime/store/safeStorage.ts';
import { site } from '../site';

/** 学习方式：每种方式一颗星 */
export type StarMode = 'watch' | 'guided' | 'self';
export const STAR_MODES: readonly StarMode[] = ['watch', 'guided', 'self'];
/** 每种方式的完成度 0–1（学到第几步占总步数的比例；做完整个流程 = 1） */
export type Stars = Record<StarMode, number>;
export const noStars = (): Stars => ({ watch: 0, guided: 0, self: 0 });
/** 这个知识点有哪几颗星：有动手做 = 三颗；没有就只有“看一看”一颗 */
export const starModes = (hands: boolean): readonly StarMode[] => (hands ? STAR_MODES : ['watch']);
/** 已学完 = 这个知识点的星星都满了 */
export const allStars = (stars: Stars, hands: boolean): boolean =>
  starModes(hands).every((m) => stars[m] >= 1);

export interface LessonRecord {
  lessonId: string;
  grade: number;
  subject: string;
  lastStep: number;
  maxStep: number;
  /** 三种学习方式各自的完成度 */
  stars: Stars;
  /** 这个知识点有没有动手做（决定有几颗星） */
  hands: boolean;
  /** 已学完：星星都满了（随 stars 更新） */
  completed: boolean;
  completedAt?: number;
  lastOpenedAt: number;
}

/** 记录属于哪个知识点 */
export interface LessonKey {
  lessonId: string;
  grade: number;
  subject: string;
  /** 有没有动手做；不写按“有”算 */
  hands?: boolean;
}

interface LearningState {
  records: Record<string, LessonRecord>;
  /** 产生或更新过学习记录的日期（本地时区，YYYY-MM-DD） */
  days: string[];
  upsert(record: Omit<LessonRecord, 'lastOpenedAt'> & { lastOpenedAt?: number }): void;
  /** 看到了第 index 步（从 0 开始） */
  visit(key: LessonKey, index: number): void;
  /**
   * 更新某种学习方式的星星。默认只增不减（取最大值）；replace = true 时直接改成这个值（取消时用）。
   */
  setStar(key: LessonKey, mode: StarMode, value: number, opts?: { replace?: boolean }): void;
  clear(): void;
}

/** 看到第 index 步后的记录：更新所在步、最远步；星星和已学完不变（规格 3.2） */
export function visitRecord(
  prev: LessonRecord | undefined,
  key: LessonKey,
  index: number,
  now = Date.now(),
): LessonRecord {
  const { hands: _h, ...base } = key;
  return {
    ...base,
    lastStep: index,
    maxStep: Math.max(prev?.maxStep ?? 0, index),
    stars: prev?.stars ?? noStars(),
    hands: key.hands ?? prev?.hands ?? true,
    completed: prev?.completed ?? false,
    completedAt: prev?.completedAt,
    lastOpenedAt: now,
  };
}

/** 更新某种学习方式的星星；星星都满了就是已学完（没有记录时也会产生一条） */
export function starRecord(
  prev: LessonRecord | undefined,
  key: LessonKey,
  mode: StarMode,
  value: number,
  opts: { replace?: boolean } = {},
  now = Date.now(),
): LessonRecord {
  const base = visitRecord(prev, key, prev?.lastStep ?? 0, now);
  const v = Math.max(0, Math.min(1, value));
  const stars = { ...base.stars, [mode]: opts.replace ? v : Math.max(base.stars[mode], v) };
  const completed = allStars(stars, base.hands);
  return {
    ...base,
    stars,
    completed,
    completedAt: completed ? (prev?.completed ? prev.completedAt : now) : undefined,
  };
}

/** 星星统计：已得（满的）颗数、累计完成度、总颗数。lessons 是要统计的知识点 */
export function starTotals(
  records: Record<string, LessonRecord>,
  lessons: { id: string; hands: boolean }[],
): { full: number; sum: number; total: number } {
  let full = 0;
  let sum = 0;
  let total = 0;
  for (const l of lessons) {
    const r = records[l.id];
    for (const m of starModes(l.hands)) {
      total += 1;
      const v = r?.stars[m] ?? 0;
      sum += v;
      if (v >= 1) full += 1;
    }
  }
  return { full, sum, total };
}

function today(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** 超过上限时删除最久没打开的 */
export function trimRecords(
  records: Record<string, LessonRecord>,
  limit: number,
): Record<string, LessonRecord> {
  const list = Object.values(records);
  if (list.length <= limit) return records;
  const keep = list.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt).slice(0, limit);
  return Object.fromEntries(keep.map((r) => [r.lessonId, r]));
}

/** 继续学习：未学完的在前，各自按最近打开排序（规格 3.3） */
export function continueList(records: Record<string, LessonRecord>, count: number): LessonRecord[] {
  return Object.values(records)
    .sort((a, b) => Number(a.completed) - Number(b.completed) || b.lastOpenedAt - a.lastOpenedAt)
    .slice(0, count);
}

export const useLearning = create<LearningState>()(
  persist(
    (set, get) => ({
      records: {},
      days: [],
      upsert: (r) =>
        set((st) => {
          const record = { ...r, lastOpenedAt: r.lastOpenedAt ?? Date.now() };
          const d = today();
          return {
            records: trimRecords(
              { ...st.records, [r.lessonId]: record },
              site.learning.recordLimit,
            ),
            days: st.days.includes(d) ? st.days : [...st.days, d],
          };
        }),
      visit: (key, index) => get().upsert(visitRecord(get().records[key.lessonId], key, index)),
      setStar: (key, mode, value, opts) =>
        get().upsert(starRecord(get().records[key.lessonId], key, mode, value, opts)),
      clear: () => set({ records: {}, days: [] }),
    }),
    {
      name: 'flow-see-learning',
      version: 1,
      // 旧记录没有星星：学完的算“看一看”那颗星满，其余从 0 开始；已学完要三颗星都满
      migrate: (old) => {
        const st = old as { records?: Record<string, Partial<LessonRecord>>; days?: string[] };
        const records = Object.fromEntries(
          Object.entries(st.records ?? {}).map(([id, r]) => {
            const stars = r.stars ?? { ...noStars(), watch: r.completed ? 1 : 0 };
            const hands = r.hands ?? true;
            return [id, { ...r, stars, hands, completed: allStars(stars, hands) }];
          }),
        );
        return { records, days: st.days ?? [] };
      },
      storage: createJSONStorage(() => safeStorage('local')),
      partialize: ({ records, days }) => ({ records, days }),
    },
  ),
);

export function useCompletedCount(): number {
  return useLearning((s) => Object.values(s.records).filter((r) => r.completed).length);
}
