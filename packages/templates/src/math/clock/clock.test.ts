import { describe, expect, it } from 'vitest';
import { formatClockTime } from '@flow-see/blocks';
import { createAnimation, createStep } from '@flow-see/core';
import { sceneFrame } from '../../scene/evaluate';
import { checkClock } from './check';
import { clockScene, clockTemplate, readTime } from './index';

const anim = (params: Record<string, unknown>, shows: string[]) =>
  createAnimation({
    templateId: 'clock',
    title: 'x',
    params,
    steps: shows.map((show) => createStep({ title: '', desc: '', data: { show } })),
  });
const frame = (a: ReturnType<typeof anim>, i: number, t = 1) =>
  Object.fromEntries(sceneFrame(clockScene(a), i, t).objects.map((o) => [o.id, o.props]));

describe('clock 模板', () => {
  const a = anim({ hour: 3, minute: 0, runMinutes: 60 }, [
    'face',
    'minute-hand',
    'hour-hand',
    'read',
    'run',
    'read',
  ]);

  it('钟面、突出分针、突出时针', () => {
    expect(frame(a, 0).clock).toMatchObject({ time: 180, emphasis: 'none', highlight: 1 });
    expect(frame(a, 1).clock.emphasis).toBe('minute');
    expect(frame(a, 2).clock.emphasis).toBe('hour');
  });

  it('读时间：电子钟出现，说明是“3 时”', () => {
    const f = frame(a, 3);
    expect(f.digital).toMatchObject({ time: 180, opacity: 1 });
    expect(f.caption.text).toBe('3 时');
  });

  it('走一走：时间按进度匀速连续走，钟面和电子钟同步；后面的步骤从新时间算', () => {
    expect(frame(a, 4, 0.5).clock.time).toBeCloseTo(210, 0);
    expect(frame(a, 4, 0.5).digital.time).toBeCloseTo(210, 0);
    expect(frame(a, 4).clock.time).toBe(240);
    expect(frame(a, 4).caption.text).toBe('从 3 时到 4 时');
    expect(frame(a, 5).caption.text).toBe('4 时');
  });

  it('走 1 小时的时长来自 style.yaml（secondsPerHour），读时间这类没有连续变化的步骤很短', () => {
    expect(clockTemplate.motionMs!(a, 4)).toBeGreaterThan(clockTemplate.motionMs!(a, 3));
  });

  it('时间格式：12 小时制，0 点显示 12；整点读作“几时”', () => {
    expect(formatClockTime(0)).toBe('12:00');
    expect(formatClockTime(13 * 60 + 5)).toBe('1:05');
    expect(readTime(12 * 60 + 60)).toBe('1 时');
    expect(readTime(3 * 60 + 30)).toBe('3 时 30 分');
  });

  it('配置检查：参数范围和 show 写错时报错', () => {
    const issues = checkClock({
      params: { hour: 13, minute: 60, runMinutes: 0 },
      steps: [{ say: 'x', show: 'tick' }],
    });
    expect(issues.map((i) => i.path.join('.'))).toEqual([
      'params.hour',
      'params.minute',
      'params.runMinutes',
      'steps.0.show',
    ]);
  });

  it('示例作品能直接播放', () => {
    const d = clockTemplate.createDefault();
    expect(clockScene(d).steps).toHaveLength(3);
  });
});
