// clock 钟表模板：认识钟面、读整点/几时几分、看时间连续走动（需求设计第 6 节）。
// 由参数（hour、minute、runMinutes）和每一步的 show 生成场景，画面、时间轴、导出都复用场景模板。
import { formatClockTime } from '@flow-see/blocks';
import { createAnimation, createStep, styleConfig, t, type Animation } from '@flow-see/core';
import type { Template } from '@flow-see/runtime/template.ts';
import { stepMotionMs, type SceneDef } from '../../scene/evaluate';
import { makeSceneStage } from '../../scene/stage';
import { checkClock } from './check';
import { runMinutesOf, type ClockShow } from './shows';

export { CLOCK_SHOWS, type ClockShow } from './shows';

type Point = [number, number];
/** style.yaml 的 templates.clock */
export interface ClockLayout {
  stage: { width: number; height: number };
  at: Point;
  radius: number;
  digital: { at: Point; size: number };
  caption: { at: Point; size: number };
  secondsPerHour: number;
}

export function clockLayout(): ClockLayout {
  return styleConfig().templates.clock as ClockLayout;
}

export interface ClockParams {
  hour: number;
  minute: number;
  runMinutes: number;
}

export function clockParams(raw: Record<string, unknown> | undefined): ClockParams {
  const int = (v: unknown, lo: number, hi: number, d: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
  };
  return {
    hour: int(raw?.hour, 1, 12, 12),
    minute: int(raw?.minute, 0, 59, 0),
    runMinutes: int(raw?.runMinutes, 1, 720, 60),
  };
}

/** 读出来的时间：整点说“3 时”，否则“3 时 30 分” */
export function readTime(minutes: number): string {
  const [h, m] = formatClockTime(minutes).split(':').map(Number);
  return m === 0 ? t('clockTemplate.oclock', { h }) : t('clockTemplate.hour_minute', { h, m });
}

/** 由参数和每一步的 show 生成场景；“run”会让后面各步的时间往后走 */
export function clockScene(animation: Animation): SceneDef {
  const L = clockLayout();
  const p = clockParams(animation.params);
  const cfg = animation.config as { stage?: SceneDef['stage'] } | undefined;
  let time = p.hour * 60 + p.minute;
  const caption = (text: string) => [
    { set: { target: 'caption', text, duration: 0, together: true } },
    { show: { target: 'caption', together: true } },
  ];
  const emphasis = (e: string) => ({ set: { target: 'clock', emphasis: e, duration: 0 } });
  const steps = animation.steps.map((s) => {
    const show = s.data.show as string | undefined;
    // run:30 = 这一步走 30 分钟；只写 run 时走参数里的 runMinutes
    const runMinutes = runMinutesOf(show) ?? p.runMinutes;
    switch (runMinutesOf(show) === undefined ? (show as ClockShow | undefined) : 'run') {
      case 'face':
        return [
          emphasis('none'),
          ...caption(t('clockTemplate.face')),
          { hide: { target: 'digital', together: true } },
          { highlight: 'clock' },
        ];
      case 'minute-hand':
        return [emphasis('minute'), ...caption(t('clockTemplate.minute_hand'))];
      case 'hour-hand':
        return [emphasis('hour'), ...caption(t('clockTemplate.hour_hand'))];
      case 'read':
        return [
          emphasis('none'),
          { set: { target: 'digital', time, duration: 0, together: true } },
          { show: { target: 'digital', together: true } },
          ...caption(readTime(time)),
          { highlight: 'digital' },
        ];
      case 'run': {
        const from = time;
        time += runMinutes;
        const seconds = (runMinutes / 60) * L.secondsPerHour;
        return [
          emphasis('none'),
          ...caption(t('clockTemplate.run', { from: readTime(from), to: readTime(time) })),
          { show: { target: 'digital', together: true } },
          { set: { target: 'clock', time, duration: seconds, ease: 'linear', together: true } },
          { set: { target: 'digital', time, duration: seconds, ease: 'linear', together: true } },
        ];
      }
      default:
        return [];
    }
  });
  const start = p.hour * 60 + p.minute;
  return {
    stage: cfg?.stage ?? L.stage,
    objects: [
      {
        id: 'clock',
        type: 'clock',
        at: L.at,
        radius: L.radius,
        time: start,
        numbers: animation.params?.numbers !== false,
        ticks: animation.params?.ticks !== false,
      },
      {
        id: 'digital',
        type: 'digital-clock',
        at: L.digital.at,
        size: L.digital.size,
        time: start,
        hidden: true,
      },
      {
        id: 'caption',
        type: 'text',
        text: '',
        at: L.caption.at,
        size: L.caption.size,
        hidden: true,
      },
    ],
    steps,
  };
}

const cache = new WeakMap<Animation, SceneDef>();
const sceneOf = (a: Animation) => {
  let d = cache.get(a);
  if (!d) cache.set(a, (d = clockScene(a)));
  return d;
};

export const clockTemplate: Template = {
  id: 'clock',
  name: t('clockTemplate.name'),
  tagline: t('clockTemplate.tagline'),
  elementNoun: '',
  minElements: 0,
  maxElements: 0,
  stepFields: [],
  // 知识点用的模板，不在创作的选模板页出现；从网址打开时给一个能播放的示例
  createBlank() {
    return clockTemplate.createDefault();
  },
  createDefault() {
    const step = (show: ClockShow, desc: string) => createStep({ title: '', desc, data: { show } });
    return createAnimation({
      templateId: 'clock',
      title: t('clockTemplate.sample_title'),
      params: { hour: 3, minute: 0, runMinutes: 60 },
      steps: [
        step('face', t('clockTemplate.sample_face')),
        step('read', t('clockTemplate.sample_read')),
        step('run', t('clockTemplate.sample_run')),
      ],
    });
  },
  newStep: () => ({ data: { show: 'read' } }),
  Stage: makeSceneStage(sceneOf),
  motionMs: (animation, index) => stepMotionMs(sceneOf(animation), index),
  checkConfig: checkClock,
};
