// 本机学习记录（规格 3.1）。阶段 0 只建立数据结构和读取；记录的写入在阶段 1 随知识点页完成。
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

interface LearningState {
  records: Record<string, LessonRecord>;
  /** 产生或更新过学习记录的日期（本地时区，YYYY-MM-DD） */
  days: string[];
  upsert(record: Omit<LessonRecord, 'lastOpenedAt'> & { lastOpenedAt?: number }): void;
  clear(): void;
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
    (set) => ({
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
