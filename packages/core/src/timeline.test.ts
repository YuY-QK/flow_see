import { describe, expect, it } from 'vitest';
import {
  fillParams,
  fillText,
  initTimeline,
  timelinePosition,
  timelineReducer as r,
  type TimelineAction,
  type TimelineState,
} from './timeline';

const run = (s: TimelineState, ...actions: TimelineAction[]) => actions.reduce(r, s);
/** 当前这一步的动画段走完 + 讲解读完 */
const finishStep = (s: TimelineState) =>
  run(s, { type: 'frame', delta: Infinity }, { type: 'spoken', epoch: s.epoch });

describe('连续时间模型', () => {
  it('自动播放：从第 1 步开头放起；否则显示这一步的完整画面、暂停', () => {
    expect(initTimeline(3, { autoPlay: true })).toMatchObject({
      index: 0,
      progress: 0,
      playing: true,
      running: true,
    });
    expect(initTimeline(3, { index: 1 })).toMatchObject({
      index: 1,
      progress: 1,
      playing: false,
      running: false,
    });
  });

  it('时钟推进步内进度，进度不超过 1', () => {
    let s = initTimeline(2, { autoPlay: true });
    s = r(s, { type: 'frame', delta: 0.25 });
    expect(s.progress).toBe(0.25);
    s = r(s, { type: 'frame', delta: 5 });
    expect(s).toMatchObject({ progress: 1, running: false, index: 0 });
  });

  it('动画段和讲解都结束才进入下一步（与先后顺序无关）', () => {
    let s = initTimeline(3, { autoPlay: true });
    s = r(s, { type: 'spoken', epoch: s.epoch });
    expect(s.index).toBe(0); // 动画还没走完
    s = r(s, { type: 'frame', delta: 1 });
    expect(s).toMatchObject({ index: 1, progress: 0, playing: true, spoken: false });

    s = r(s, { type: 'frame', delta: 1 });
    expect(s.index).toBe(1); // 讲解还没读完
    s = r(s, { type: 'spoken', epoch: s.epoch });
    expect(s.index).toBe(2);
  });

  it('过期的讲解结束信号被忽略', () => {
    let s = initTimeline(3, { autoPlay: true });
    const old = s.epoch;
    s = r(s, { type: 'next' });
    s = r(s, { type: 'play' });
    s = run(s, { type: 'frame', delta: 1 }, { type: 'spoken', epoch: old });
    expect(s).toMatchObject({ index: 1, spoken: false });
  });

  it('播放中自然播完最后一步：停止并记一次播完', () => {
    let s = initTimeline(2, { autoPlay: true });
    s = finishStep(s);
    s = finishStep(s);
    expect(s).toMatchObject({ index: 1, playing: false, finishes: 1 });
  });

  it('拖进度条到最后一步不算播完；再按播放从头开始', () => {
    let s = initTimeline(3, { autoPlay: true });
    s = r(s, { type: 'scrub', position: 3 });
    expect(s).toMatchObject({ index: 2, progress: 1, playing: false, finishes: 0 });
    s = r(s, { type: 'play' });
    expect(s).toMatchObject({ index: 0, progress: 0, playing: true });
  });

  it('拖进度条：位置 = 第几步 + 步内进度，暂停且动画段不走', () => {
    const s = r(initTimeline(4, { autoPlay: true }), { type: 'scrub', position: 2.5 });
    expect(s).toMatchObject({ index: 2, progress: 0.5, playing: false, running: false });
    expect(timelinePosition(s)).toBe(2.5);
    expect(r(s, { type: 'frame', delta: 0.1 }).progress).toBe(0.5);
  });

  it('单步、点步骤点：暂停，但把这一步的动画放一遍', () => {
    let s = initTimeline(4, { autoPlay: true });
    s = r(s, { type: 'next' });
    expect(s).toMatchObject({ index: 1, progress: 0, playing: false, running: true });
    s = r(s, { type: 'frame', delta: 1 });
    s = r(s, { type: 'spoken', epoch: s.epoch });
    expect(s.index).toBe(1); // 暂停时不会自动进入下一步
    s = r(s, { type: 'seek', index: 3 });
    expect(s).toMatchObject({ index: 3, progress: 0, playing: false });
    expect(r(s, { type: 'prev' }).index).toBe(2);
  });

  it('暂停后继续：动画从暂停处接着走，讲解重新读', () => {
    let s = initTimeline(3, { autoPlay: true });
    s = r(s, { type: 'frame', delta: 0.4 });
    const before = s.epoch;
    s = r(s, { type: 'pause' });
    expect(s).toMatchObject({ playing: false, running: false, progress: 0.4 });
    s = r(s, { type: 'play' });
    expect(s).toMatchObject({ playing: true, running: true, progress: 0.4, spoken: false });
    expect(s.epoch).toBe(before + 1);
  });

  it('没有步骤时不能播放', () => {
    expect(r(initTimeline(0), { type: 'play' }).playing).toBe(false);
  });
});

describe('动手做：要等孩子做完的步骤', () => {
  const gates = [false, true, false];
  it('进入要动手的步骤时停在开头，讲解读完也不往下走', () => {
    let s = initTimeline(3, { autoPlay: true, gates });
    s = r(s, { type: 'frame', delta: 1 });
    s = r(s, { type: 'spoken', epoch: s.epoch });
    expect(s).toMatchObject({ index: 1, waiting: true, running: false, progress: 0 });
    s = r(s, { type: 'frame', delta: 1 });
    s = r(s, { type: 'spoken', epoch: s.epoch });
    expect(s).toMatchObject({ index: 1, waiting: true, progress: 0 });
  });

  it('做对后放这一步并接着自动播放；再回到这一步不用重做', () => {
    let s = initTimeline(3, { index: 1, gates });
    expect(s).toMatchObject({ waiting: true, progress: 0, playing: false });
    s = r(s, { type: 'solve' });
    expect(s).toMatchObject({ waiting: false, running: true, playing: true, progress: 0 });
    s = r(s, { type: 'frame', delta: 1 });
    s = r(s, { type: 'spoken', epoch: s.epoch });
    expect(s.index).toBe(2);
    s = r(s, { type: 'prev' });
    expect(s).toMatchObject({ index: 1, waiting: false, running: true });
  });

  it('不在等待时 solve 不起作用；拖进度到要动手的步骤也停在开头', () => {
    const s = initTimeline(3, { gates });
    expect(r(s, { type: 'solve' })).toBe(s);
    expect(r(s, { type: 'scrub', position: 1.6 })).toMatchObject({
      index: 1,
      waiting: true,
      progress: 0,
    });
  });
});

describe('参数代入', () => {
  it('讲解里的 {参数名} 换成参数值，未知参数保持原样', () => {
    expect(fillText('平均分成 {parts} 份，{x}', { parts: 6 })).toBe('平均分成 6 份，{x}');
  });

  it('深度代入；整个字符串只是 {参数} 时保留数字类型', () => {
    expect(fillParams({ count: '{n}', text: '{n} + 1', at: [1, '{n}'] }, { n: 9 })).toEqual({
      count: 9,
      text: '9 + 1',
      at: [1, 9],
    });
  });
});
