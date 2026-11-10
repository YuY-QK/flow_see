import { describe, expect, it } from 'vitest';
import { isAngleEqual, normalizeAngle, placeResult } from './place';

describe('place 拖到位判定函数（placeResult）', () => {
  describe('normalizeAngle & isAngleEqual', () => {
    it('角度归一化到 [0, 360)', () => {
      expect(normalizeAngle(0)).toBe(0);
      expect(normalizeAngle(360)).toBe(0);
      expect(normalizeAngle(720)).toBe(0);
      expect(normalizeAngle(-360)).toBe(0);
      expect(normalizeAngle(-90)).toBe(270);
      expect(normalizeAngle(450)).toBe(90);
    });

    it('判定角度模 360 相同，-90 与 270 视为相同', () => {
      expect(isAngleEqual(-90, 270)).toBe(true);
      expect(isAngleEqual(270, -90)).toBe(true);
      expect(isAngleEqual(0, 360)).toBe(true);
      expect(isAngleEqual(180, -180)).toBe(true);
      expect(isAngleEqual(45, 405)).toBe(true);
      expect(isAngleEqual(90, 180)).toBe(false);
      expect(isAngleEqual(-90, 90)).toBe(false);
    });
  });

  describe('placeResult 组合测试', () => {
    const baseSpec = {
      target: 'piece',
      to: [380, 220] as [number, number],
      rotate: 180,
      tolerance: 20,
    };

    it('位置对且角度对 -> correct', () => {
      const res = placeResult(baseSpec, [385, 215], 180);
      expect(res.status).toBe('correct');
      expect(res.correct).toBe(true);
      expect(res.miss).toBe(false);
      expect(res.needRotate).toBe(false);
      expect(res.distance).toBeCloseTo(Math.hypot(5, -5));
      expect(res.angleDiff).toBe(0);
    });

    it('位置对角度不对 -> rotate（提示转一转再放，不计做错）', () => {
      const res = placeResult(baseSpec, [380, 220], 90);
      expect(res.status).toBe('rotate');
      expect(res.correct).toBe(false);
      expect(res.miss).toBe(false);
      expect(res.needRotate).toBe(true);
      expect(res.distance).toBe(0);
      expect(res.angleDiff).toBe(90);
    });

    it('位置不对角度对 -> wrong（弹回、计做错一次）', () => {
      const res = placeResult(baseSpec, [420, 220], 180);
      expect(res.status).toBe('wrong');
      expect(res.correct).toBe(false);
      expect(res.miss).toBe(true);
      expect(res.needRotate).toBe(false);
      expect(res.distance).toBe(40);
    });

    it('位置不对角度也不对 -> wrong', () => {
      const res = placeResult(baseSpec, [100, 100], 0);
      expect(res.status).toBe('wrong');
      expect(res.correct).toBe(false);
      expect(res.miss).toBe(true);
      expect(res.needRotate).toBe(false);
    });

    it('角度 -90 与 270 视为相同', () => {
      const spec = { target: 'piece', to: [200, 200] as [number, number], rotate: 270 };
      const res = placeResult(spec, [200, 200], -90);
      expect(res.status).toBe('correct');
      expect(res.correct).toBe(true);
      expect(res.miss).toBe(false);
    });

    it('容差边界：正好等于 tolerance 算对，超过 tolerance 算错', () => {
      const spec = { target: 'piece', to: [100, 100] as [number, number], tolerance: 24 };
      const onEdge = placeResult(spec, [124, 100]);
      expect(onEdge.status).toBe('correct');
      expect(onEdge.correct).toBe(true);

      const beyondEdge = placeResult(spec, [124.1, 100]);
      expect(beyondEdge.status).toBe('wrong');
      expect(beyondEdge.miss).toBe(true);
    });

    it('未指定 rotate 时，只需位置对即可做对（任意角度通过）', () => {
      const spec = { target: 'piece', to: [300, 150] as [number, number] };
      const res = placeResult(spec, [300, 150], 73);
      expect(res.status).toBe('correct');
      expect(res.correct).toBe(true);
      expect(res.miss).toBe(false);
    });

    it('支持 options 中提供 targetPos 和 defaultTolerance', () => {
      const spec = { target: 'piece', to: 'box-target' };
      const res = placeResult(spec, [105, 100], 0, {
        targetPos: [100, 100],
        defaultTolerance: 10,
      });
      expect(res.status).toBe('correct');
      expect(res.correct).toBe(true);
      expect(res.targetPos).toEqual([100, 100]);
    });

    it('支持字符串格式的坐标和数值参数', () => {
      const spec = {
        target: 'piece',
        to: ['200', '300'] as unknown as [number, number],
        rotate: '90',
        tolerance: '15',
      };
      const res = placeResult(spec, [205, 305], 90);
      expect(res.status).toBe('correct');
      expect(res.targetPos).toEqual([200, 300]);
      expect(res.targetRotate).toBe(90);
    });
  });
});
