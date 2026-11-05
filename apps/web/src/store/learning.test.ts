import { describe, expect, it } from 'vitest';
import {
  continueList,
  noStars,
  starRecord,
  starTotals,
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
  stars: noStars(),
  hands: true,
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

  it('星星：每种方式各自的完成度，只增不减；三颗都满才算已学完', () => {
    let r = starRecord(undefined, key, 'watch', 0.5, {}, 10);
    expect(r.stars).toEqual({ watch: 0.5, guided: 0, self: 0 });
    expect(r.completed).toBe(false);
    r = starRecord(r, key, 'watch', 0.3, {}, 11);
    expect(r.stars.watch).toBe(0.5);
    r = starRecord(r, key, 'watch', 1, {}, 12);
    r = starRecord(r, key, 'guided', 1, {}, 13);
    expect(r.completed).toBe(false);
    r = starRecord(r, key, 'self', 1, {}, 14);
    expect(r).toMatchObject({ completed: true, completedAt: 14 });
  });

  it('已学完后再看一遍，不会取消已学完', () => {
    let done = starRecord(undefined, key, 'watch', 1, {}, 1);
    done = starRecord(done, key, 'guided', 1, {}, 2);
    done = starRecord(done, key, 'self', 1, {}, 100);
    const again = visitRecord(done, key, 0, 200);
    expect(again).toMatchObject({ completed: true, completedAt: 100, lastStep: 0 });
    expect(again.stars.self).toBe(1);
  });

  it('取消某种方式：直接改成 0，已学完随之取消', () => {
    let done = starRecord(undefined, { ...key, hands: false }, 'watch', 1, {}, 5);
    expect(done.completed).toBe(true);
    done = starRecord(done, key, 'watch', 0, { replace: true });
    expect(done).toMatchObject({ completed: false, completedAt: undefined });
    expect(done.stars.watch).toBe(0);
  });

  it('没有动手做的知识点只有一颗星', () => {
    const r = starRecord(undefined, { ...key, hands: false }, 'watch', 1, {}, 5);
    expect(r).toMatchObject({ completed: true, hands: false });
  });

  it('统计星星：满的颗数、累计完成度、总颗数', () => {
    const a = starRecord(undefined, key, 'watch', 1, {}, 1);
    const b = starRecord(undefined, { ...key, lessonId: 'x' }, 'guided', 0.5, {}, 1);
    const records = { [a.lessonId]: a, x: b };
    const lessons = [
      { id: 'make-ten', hands: true },
      { id: 'x', hands: true },
      { id: 'y', hands: false },
    ];
    expect(starTotals(records, lessons)).toEqual({ full: 1, sum: 1.5, total: 7 });
  });
});
