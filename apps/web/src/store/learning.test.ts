import { describe, expect, it } from 'vitest';
import {
  completeRecord,
  continueList,
  trimRecords,
  visitRecord,
  type LessonRecord,
} from './learning';

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

describe('学习记录的更新（规格 3.1、3.2）', () => {
  const key = { lessonId: 'make-ten', grade: 1, subject: 'math' };

  it('看到第几步：更新所在步和最远步', () => {
    let r = visitRecord(undefined, key, 2, 10);
    expect(r).toMatchObject({ lastStep: 2, maxStep: 2, completed: false, lastOpenedAt: 10 });
    r = visitRecord(r, key, 1, 20);
    expect(r).toMatchObject({ lastStep: 1, maxStep: 2 });
  });

  it('已学完后再看一遍，不会取消已学完', () => {
    const done = completeRecord(undefined, key, true, 5, 100);
    expect(done).toMatchObject({ completed: true, completedAt: 100, lastStep: 5 });
    const again = visitRecord(done, key, 0, 200);
    expect(again).toMatchObject({ completed: true, completedAt: 100, lastStep: 0 });
  });

  it('取消已学完', () => {
    const done = completeRecord(undefined, key, true, 5, 100);
    expect(completeRecord(done, key, false)).toMatchObject({
      completed: false,
      completedAt: undefined,
      lastStep: 5,
    });
  });
});
