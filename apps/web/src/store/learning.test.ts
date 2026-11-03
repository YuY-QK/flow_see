import { describe, expect, it } from 'vitest';
import { continueList, trimRecords, type LessonRecord } from './learning';

const rec = (lessonId: string, lastOpenedAt: number, completed = false): LessonRecord => ({
  lessonId,
  grade: 1,
  subject: 'math',
  lastStep: 0,
  maxStep: 0,
  completed,
  lastOpenedAt,
});

describe('学习记录', () => {
  it('继续学习：未学完的在前，各自按最近打开排序（规格 3.3）', () => {
    const records = Object.fromEntries(
      [rec('a', 1, true), rec('b', 2), rec('c', 3, true), rec('d', 4)].map((r) => [r.lessonId, r]),
    );
    expect(continueList(records, 3).map((r) => r.lessonId)).toEqual(['d', 'b', 'c']);
  });

  it('超出上限时删除最久没打开的', () => {
    const records = Object.fromEntries(
      [rec('a', 1), rec('b', 2), rec('c', 3)].map((r) => [r.lessonId, r]),
    );
    expect(Object.keys(trimRecords(records, 2)).sort()).toEqual(['b', 'c']);
  });
});
