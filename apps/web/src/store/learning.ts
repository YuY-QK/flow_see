// 本机学习记录（规格 3.1、3.2）。
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage } from '@flow-see/runtime/store/safeStorage.ts';
import { site } from '../site';

export interface LessonRecord {
  lessonId: string;
  grade: number;
  subject: string;
  lastStep: number;
  maxStep: number;
  completed: boolean;
  completedAt?: number;
  lastOpenedAt: number;
}

/** 记录属于哪个知识点 */
export interface LessonKey {
  lessonId: string;
  grade: number;
  subject: string;
}

interface LearningState {
  records: Record<string, LessonRecord>;
  /** 产生或更新过学习记录的日期（本地时区，YYYY-MM-DD） */
  days: string[];
  upsert(record: Omit<LessonRecord, 'lastOpenedAt'> & { lastOpenedAt?: number }): void;
  /** 看到了第 index 步（从 0 开始） */
  visit(key: LessonKey, index: number): void;
  /** 标为已学完 / 取消已学完 */
  setCompleted(key: LessonKey, completed: boolean, index?: number): void;
  clear(): void;
}

/** 看到第 index 步后的记录：更新所在步、最远步；已学完的再看一遍不会取消（规格 3.2） */
export function visitRecord(
  prev: LessonRecord | undefined,
  key: LessonKey,
  index: number,
  now = Date.now(),
): LessonRecord {
  return {
    ...key,
    lastStep: index,
    maxStep: Math.max(prev?.maxStep ?? 0, index),
    completed: prev?.completed ?? false,
    completedAt: prev?.completedAt,
    lastOpenedAt: now,
  };
}

/** 标为已学完 / 取消已学完（没有记录时也会产生一条） */
export function completeRecord(
  prev: LessonRecord | undefined,
  key: LessonKey,
  completed: boolean,
  index = prev?.lastStep ?? 0,
  now = Date.now(),
): LessonRecord {
  const base = visitRecord(prev, key, index, now);
  return completed
    ? { ...base, completed: true, completedAt: prev?.completed ? prev.completedAt : now }
    : { ...base, completed: false, completedAt: undefined };
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
      setCompleted: (key, completed, index) =>
        get().upsert(completeRecord(get().records[key.lessonId], key, completed, index)),
      clear: () => set({ records: {}, days: [] }),
    }),
    {
      name: 'flow-see-learning',
      storage: createJSONStorage(() => safeStorage('local')),
      partialize: ({ records, days }) => ({ records, days }),
    },
  ),
);

export function useCompletedCount(): number {
  return useLearning((s) => Object.values(s.records).filter((r) => r.completed).length);
}
