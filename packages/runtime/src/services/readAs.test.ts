import { describe, expect, it } from 'vitest';
import { toSpeech } from './readAs';
import { speak } from './speech';
import { runtimeConfig } from '../config';

describe('F3: 朗读规整与 readAs', () => {
  const defaultRules = runtimeConfig().speech?.readAs ?? [];

  it('每条默认规则至少一个用例，及组合算式用例', () => {
    expect(defaultRules.length).toBeGreaterThan(0);

    // 带分数与分数
    expect(toSpeech('[1 3/4](frac)', defaultRules)).toBe('1又4分之3');
    expect(toSpeech('[3/4](frac)', defaultRules)).toBe('4分之3');
    expect(toSpeech('[3/4](red frac)', defaultRules)).toBe('4分之3');
    expect(toSpeech('3/4', defaultRules)).toBe('4分之3');
    expect(toSpeech('3/4 + 1/4 = 1', defaultRules)).toBe('4分之3 + 4分之1 = 1');

    // 时间
    expect(toSpeech('15:05', defaultRules)).toBe('15时05分');
    expect(toSpeech('8:30', defaultRules)).toBe('8时30分');

    // 负数
    expect(toSpeech('−5', defaultRules)).toBe('负5');
    expect(toSpeech('−12', defaultRules)).toBe('负12');

    // 运算符
    expect(toSpeech('a ≈ b', defaultRules)).toBe('a 约等于 b');
    expect(toSpeech('3 × 5', defaultRules)).toBe('3 乘 5');
    expect(toSpeech('10 ÷ 2', defaultRules)).toBe('10 除以 2');

    // 面积单位
    expect(toSpeech('1km[2](sup)', defaultRules)).toBe('1平方千米');
    expect(toSpeech('2dm[2](sup)', defaultRules)).toBe('2平方分米');
    expect(toSpeech('5cm[2](sup)', defaultRules)).toBe('5平方厘米');
    expect(toSpeech('3mm[2](sup)', defaultRules)).toBe('3平方毫米');
    expect(toSpeech('10m[2](sup)', defaultRules)).toBe('10平方米');

    // 体积单位
    expect(toSpeech('1km[3](sup)', defaultRules)).toBe('1立方千米');
    expect(toSpeech('2dm[3](sup)', defaultRules)).toBe('2立方分米');
    expect(toSpeech('5cm[3](sup)', defaultRules)).toBe('5立方厘米');
    expect(toSpeech('3mm[3](sup)', defaultRules)).toBe('3立方毫米');
    expect(toSpeech('10m[3](sup)', defaultRules)).toBe('10立方米');

    // 长度与质量单位
    expect(toSpeech('5km', defaultRules)).toBe('5千米');
    expect(toSpeech('3dm', defaultRules)).toBe('3分米');
    expect(toSpeech('20cm', defaultRules)).toBe('20厘米');
    expect(toSpeech('50mm', defaultRules)).toBe('50毫米');
    expect(toSpeech('2kg', defaultRules)).toBe('2千克');
    expect(toSpeech('500g', defaultRules)).toBe('500克');

    // 百分数与度数、π
    expect(toSpeech('25%', defaultRules)).toBe('百分之25');
    expect(toSpeech('12.5%', defaultRules)).toBe('百分之12.5');
    expect(toSpeech('90°', defaultRules)).toBe('90度');
    expect(toSpeech('圆周率 π', defaultRules)).toBe('圆周率 派');
  });

  it('[7](blank) 读作几；[4](@r1) 读作 4', () => {
    expect(toSpeech('[7](blank)', defaultRules)).toBe('几');
    expect(toSpeech('[15](red blank)', defaultRules)).toBe('几');
    expect(toSpeech('[4](@r1)', defaultRules)).toBe('4');
    expect(toSpeech('[8](blue @col)', defaultRules)).toBe('8');
    expect(toSpeech('结果是 [5](blank)，不是 [4](@r1)', defaultRules)).toBe('结果是 几，不是 4');
  });

  it('readAs 为空数组时原样朗读（不报错）', () => {
    expect(toSpeech('3/4 + 1/4 = 1', [])).toBe('3/4 + 1/4 = 1');
    expect(toSpeech('[4](@r1)', [])).toBe('4');
    expect(toSpeech('普通文字', [])).toBe('普通文字');
    expect(toSpeech('', [])).toBe('');
  });

  it('speak() 调用时先经过 toSpeech 规整发音', () => {
    let spokenText = '';
    const fakeUtterance = function (this: unknown, t: string) {
      spokenText = t;
    };
    const g = globalThis as unknown as Record<string, unknown>;
    const hadWindow = 'window' in g;
    const origWindow = g.window;
    const origSynth = g.speechSynthesis;
    const origUtterance = g.SpeechSynthesisUtterance;

    g.window = g;
    g.SpeechSynthesisUtterance = fakeUtterance;
    g.speechSynthesis = {
      cancel: () => {},
      speak: () => {},
      getVoices: () => [],
    };

    try {
      speak('算式是 3/4 + 1/4 = 1');
      expect(spokenText).toBe('算式是 4分之3 + 4分之1 = 1');

      speak('[7](blank)');
      expect(spokenText).toBe('几');

      speak('[1 3/4](frac)');
      expect(spokenText).toBe('1又4分之3');
    } finally {
      if (hadWindow) {
        g.window = origWindow;
      } else {
        delete g.window;
      }
      if (origSynth !== undefined) {
        g.speechSynthesis = origSynth;
      } else {
        delete g.speechSynthesis;
      }
      if (origUtterance !== undefined) {
        g.SpeechSynthesisUtterance = origUtterance;
      } else {
        delete g.SpeechSynthesisUtterance;
      }
    }
  });
});
