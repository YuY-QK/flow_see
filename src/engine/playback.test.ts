import { describe, expect, it } from 'vitest';
import { initPlayback, playbackReducer as r, stepDurationMs, narrationText } from './playback';
import { createStep } from './animation';

describe('playbackReducer', () => {
  it('从第一步开始，暂停状态', () => {
    expect(initPlayback(3)).toEqual({ index: 0, total: 3, playing: false, speed: 1 });
  });

  it('播放时 tick 推进，到最后一步自动停止', () => {
    let s = r(initPlayback(3), { type: 'play' });
    s = r(s, { type: 'tick' });
    expect(s).toMatchObject({ index: 1, playing: true });
    s = r(s, { type: 'tick' });
    expect(s).toMatchObject({ index: 2, playing: true });
    s = r(s, { type: 'tick' });
    expect(s).toMatchObject({ index: 2, playing: false });
  });

  it('暂停时 tick 不动', () => {
    expect(r(initPlayback(3), { type: 'tick' }).index).toBe(0);
  });

  it('在最后一步按播放，从头开始', () => {
    const s = r(initPlayback(3, 2), { type: 'play' });
    expect(s).toMatchObject({ index: 0, playing: true });
  });

  it('任何手动操作都会暂停', () => {
    const playing = r(initPlayback(5, 2), { type: 'play' });
    expect(r(playing, { type: 'next' })).toMatchObject({ index: 3, playing: false });
    expect(r(playing, { type: 'prev' })).toMatchObject({ index: 1, playing: false });
    expect(r(playing, { type: 'seek', index: 4 })).toMatchObject({ index: 4, playing: false });
  });

  it('上一步、下一步、跳转不会越界', () => {
    expect(r(initPlayback(3), { type: 'prev' }).index).toBe(0);
    expect(r(initPlayback(3, 2), { type: 'next' }).index).toBe(2);
    expect(r(initPlayback(3), { type: 'seek', index: 99 }).index).toBe(2);
    expect(r(initPlayback(3), { type: 'seek', index: -5 }).index).toBe(0);
  });

  it('步骤数变少时收回越界的位置', () => {
    const s = r(initPlayback(5, 4), { type: 'setTotal', total: 2 });
    expect(s.index).toBe(1);
  });

  it('没有步骤时不能播放', () => {
    expect(r(initPlayback(0), { type: 'play' }).playing).toBe(false);
  });

  it('循环切换速度', () => {
    let s = initPlayback(1);
    const seen = [s.speed];
    for (let i = 0; i < 4; i++) {
      s = r(s, { type: 'cycleSpeed' });
      seen.push(s.speed);
    }
    expect(seen).toEqual([1, 1.5, 2, 0.5, 1]);
  });
});

describe('步骤时长与朗读文本', () => {
  it('优先朗读单独的朗读文本，其次说明，再次标题', () => {
    expect(narrationText(createStep({ title: 'T', desc: 'D', narration: 'N' }))).toBe('N');
    expect(narrationText(createStep({ title: 'T', desc: 'D', narration: '  ' }))).toBe('D');
    expect(narrationText(createStep({ title: 'T' }))).toBe('T');
  });

  it('设置了停留时长就用它，并按速度缩放', () => {
    expect(stepDurationMs(createStep({ duration: 2 }), 1)).toBe(2000);
    expect(stepDurationMs(createStep({ duration: 2 }), 2)).toBe(1000);
  });

  it('自动时长至少 1.8 秒，文字越长越久', () => {
    expect(stepDurationMs(createStep({ desc: '短' }), 1)).toBe(1800);
    expect(stepDurationMs(createStep({ desc: '字'.repeat(20) }), 1)).toBe(4400);
  });
});
