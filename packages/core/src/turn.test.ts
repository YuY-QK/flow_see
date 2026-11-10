import { describe, expect, it } from 'vitest';
import { parseTurnAnswer, snapToStep, turnResult, type TurnSpec } from './turn';

describe('turnResult 转动把手判定（任务卡 T2）', () => {
  describe('snapToStep 吸附测试', () => {
    it('step 未指定或非正数时不吸附', () => {
      expect(snapToStep(208)).toBe(208);
      expect(snapToStep(208, 0)).toBe(208);
      expect(snapToStep(208, -1)).toBe(208);
    });

    it('吸附到整数步长的最近整数倍', () => {
      expect(snapToStep(208, 5)).toBe(210);
      expect(snapToStep(206, 5)).toBe(205);
      expect(snapToStep(212, 5)).toBe(210);
      expect(snapToStep(88, 15)).toBe(90);
      expect(snapToStep(97, 15)).toBe(90);
      expect(snapToStep(100, 15)).toBe(105);
    });

    it('支持小数步长吸附', () => {
      expect(snapToStep(2.3, 0.5)).toBe(2.5);
      expect(snapToStep(2.2, 0.5)).toBe(2.0);
    });
  });

  describe('parseTurnAnswer 答案解析测试', () => {
    it('解析数字和数字字符串', () => {
      expect(parseTurnAnswer(210)).toBe(210);
      expect(parseTurnAnswer('210')).toBe(210);
      expect(parseTurnAnswer('90')).toBe(90);
    });

    it('钟表时间字符串解析为从 0:00 起的分钟数', () => {
      expect(parseTurnAnswer('3:30')).toBe(210);
      expect(parseTurnAnswer('3:00')).toBe(180);
      expect(parseTurnAnswer('12:15')).toBe(735);
      expect(parseTurnAnswer('0:45')).toBe(45);
    });

    it('支持自定义 normalize 归一化函数', () => {
      const customNorm = (v: number | string) => (v === 'half' ? 180 : Number(v));
      expect(parseTurnAnswer('half', customNorm)).toBe(180);
    });
  });

  describe('容差与做对判定', () => {
    it('无容差无步长时需完全一致', () => {
      const spec: TurnSpec = { target: 'dial', prop: 'angle', answer: 90 };
      expect(turnResult(spec, 90).correct).toBe(true);
      expect(turnResult(spec, 90).status).toBe('correct');
      expect(turnResult(spec, 91).correct).toBe(false);
    });

    it('吸附后与答案相差在 tolerance 范围内算做对', () => {
      const spec: TurnSpec = {
        target: 'clk',
        prop: 'time',
        answer: 210,
        tolerance: 5,
        step: 5,
      };
      // 208 吸附到 210，diff = 0 <= 5
      const res1 = turnResult(spec, 208);
      expect(res1.status).toBe('correct');
      expect(res1.correct).toBe(true);
      expect(res1.snapped).toBe(210);

      // 214 吸附到 215，diff = 5 <= 5
      const res2 = turnResult(spec, 214);
      expect(res2.status).toBe('correct');
      expect(res2.correct).toBe(true);
      expect(res2.snapped).toBe(215);

      // 204 吸附到 205，diff = 5 <= 5
      const res3 = turnResult(spec, 204);
      expect(res3.status).toBe('correct');
      expect(res3.correct).toBe(true);
    });
  });

  describe('快对了提示判定（不计做错）', () => {
    it('在 2 倍 tolerance 内提示快对了', () => {
      const spec: TurnSpec = {
        target: 'clk',
        prop: 'time',
        answer: 210,
        tolerance: 5,
      };
      // diff = 8，8 > tolerance(5) 且 8 <= 2 * tolerance(10)
      const res = turnResult(spec, 218);
      expect(res.status).toBe('close');
      expect(res.close).toBe(true);
      expect(res.correct).toBe(false);
      expect(res.miss).toBe(false);
    });

    it('在 2 倍 step 内提示快对了', () => {
      const spec: TurnSpec = {
        target: 'clk',
        prop: 'time',
        answer: 210,
        tolerance: 0,
        step: 5,
      };
      // 220 吸附到 220，diff = 10，10 > tolerance(0) 且 10 <= 2 * step(10)
      const res1 = turnResult(spec, 220);
      expect(res1.status).toBe('close');
      expect(res1.close).toBe(true);
      expect(res1.miss).toBe(false);

      // 215 吸附到 215，diff = 5 <= 10
      const res2 = turnResult(spec, 215);
      expect(res2.status).toBe('close');
      expect(res2.close).toBe(true);
      expect(res2.miss).toBe(false);
    });
  });

  describe('差得多弹回 / 做错一次判定', () => {
    it('超出 2 倍 tolerance 与 2 倍 step 时做错一次', () => {
      const spec: TurnSpec = {
        target: 'clk',
        prop: 'time',
        answer: 210,
        tolerance: 5,
        step: 5,
      };
      // 225 吸附到 225，diff = 15 > Math.max(10, 10) = 10
      const res = turnResult(spec, 225);
      expect(res.status).toBe('wrong');
      expect(res.correct).toBe(false);
      expect(res.close).toBe(false);
      expect(res.miss).toBe(true);
    });
  });

  describe('钟表 answer: "3:30" 正常', () => {
    it('answer 为时间格式字符串时能够正确换算为分钟数判定', () => {
      const spec: TurnSpec = {
        target: 'clk',
        prop: 'time',
        answer: '3:30',
        tolerance: 5,
        step: 5,
      };

      // 3:30 对应 210 分钟
      expect(turnResult(spec, 210).status).toBe('correct');
      // 208 吸附到 210
      expect(turnResult(spec, 208).status).toBe('correct');
      // 220 吸附到 220 (3:40)，diff 10 <= 10 -> close
      expect(turnResult(spec, 220).status).toBe('close');
      // 240 (4:00)，diff 30 > 10 -> wrong
      expect(turnResult(spec, 240).status).toBe('wrong');
    });
  });
});
