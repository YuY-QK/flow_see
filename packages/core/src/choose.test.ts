import { describe, expect, it } from 'vitest';
import { chooseAnswers, chooseOptions, isAnswer, isMultiChoose, shuffled } from './choose';

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

  it('多选：答案写成列表，列表里的每一项都算对，选项里一定包含全部答案', () => {
    const spec = { answer: ['水分', '空气', '适宜的温度'], options: ['水分', '阳光', '土壤'] };
    expect(isMultiChoose(spec)).toBe(true);
    expect(isMultiChoose({ answer: 3 })).toBe(false);
    expect(chooseAnswers(spec)).toEqual(['水分', '空气', '适宜的温度']);
    expect(isAnswer(spec, '空气')).toBe(true);
    expect(isAnswer(spec, '阳光')).toBe(false);
    const opts = chooseOptions(spec).map(String);
    for (const a of spec.answer) expect(opts).toContain(a);
    expect(new Set(opts).size).toBe(opts.length);
  });
});
