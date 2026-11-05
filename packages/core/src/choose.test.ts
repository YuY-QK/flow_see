import { describe, expect, it } from 'vitest';
import { chooseOptions, isAnswer, shuffled } from './choose';

describe('点选答案', () => {
  it('数字答案自动生成选项：离答案最近的数，在范围之内', () => {
    expect(chooseOptions({ answer: 5 }).sort()).toEqual([4, 5, 6]);
    expect(chooseOptions({ answer: 1, min: 1 }).sort()).toEqual([1, 2, 3]);
    expect(
      chooseOptions({ answer: 12, min: 1, max: 12 }).sort((x, y) => Number(x) - Number(y)),
    ).toEqual([10, 11, 12]);
  });

  it('写了 options 就用它，答案一定在里面，重复的去掉', () => {
    expect(chooseOptions({ answer: '3/4', options: ['4/3', '3/4', '3/3'] })).toEqual([
      '3/4',
      '4/3',
      '3/3',
    ]);
    expect(chooseOptions({ answer: '2/2', options: ['2/2', '2/2'] })).toEqual(['2/2']);
  });

  it('数字和文字数字算同一个答案', () => {
    expect(isAnswer({ answer: 3 }, '3')).toBe(true);
    expect(isAnswer({ answer: '3', options: [] }, 3)).toBe(true);
    expect(isAnswer({ answer: 3 }, 4)).toBe(false);
  });

  it('打乱后元素不变', () => {
    const l = [1, 2, 3, 4];
    expect(shuffled(l, () => 0.3).sort()).toEqual(l);
  });
});
