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

  it('run:30 / run:15：这一步走指定的分钟数，之后的步骤接着算；走半小时只要一半的时间', () => {
    const b = anim({ hour: 3, minute: 0, runMinutes: 60 }, [
      'run',
      'run:30',
      'read',
      'run:15',
      'read',
    ]);
    expect(frame(b, 1).clock.time).toBe(270);
    expect(frame(b, 2).caption.text).toBe('4 时 30 分');
    expect(frame(b, 4).caption.text).toBe('4 时 45 分');
    expect(clockTemplate.motionMs!(b, 1)).toBeLessThan(clockTemplate.motionMs!(b, 0));
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
      steps: [
        { say: 'x', show: 'tick' },
        { say: 'x', show: 'run:30' },
        { say: 'x', show: 'run:0' },
        { say: 'x', show: 'run:abc' },
      ],
    });
    expect(issues.map((i) => i.path.join('.'))).toEqual([
      'params.hour',
      'params.minute',
      'params.runMinutes',
      'steps.0.show',
      'steps.2.show',
      'steps.3.show',
    ]);
  });

  it('示例作品能直接播放', () => {
    const d = clockTemplate.createDefault();
    expect(clockScene(d).steps).toHaveLength(3);
  });

  it('读时间的步骤有动手做时：提问前钟面先摆好、电子钟和文字隐藏，答完才写出时间', () => {
    const b = createAnimation({
      templateId: 'clock',
      title: 'x',
      params: { hour: 3, minute: 0, runMinutes: 60 },
      steps: [
        createStep({
          title: '',
          desc: '',
          data: { show: 'read', try: { task: '几时', choose: { answer: 3 } } },
        }),
      ],
    });
    const def = clockScene(b);
    const doing = Object.fromEntries(
      sceneFrame(def, 0, 1, 'doing').objects.map((o) => [o.id, o.props]),
    );
    expect(doing.digital.opacity).toBe(0);
    expect(doing.caption.opacity).toBe(0);
    const solved = Object.fromEntries(sceneFrame(def, 0, 1).objects.map((o) => [o.id, o.props]));
    expect(solved.digital.opacity).toBe(1);
    expect(solved.caption.text).toBe('3 时');
  });
});
