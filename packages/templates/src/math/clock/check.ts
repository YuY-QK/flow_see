// clock 模板的配置检查（pnpm content:check 调用），报错面向写配置的人。
import type { ConfigIssue, LessonLike } from '@flow-see/runtime/template.ts';
import { CLOCK_SHOWS, isClockShow } from './shows';

const isInt = (v: unknown, lo: number, hi: number) =>
  Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

export function checkClock(lesson: LessonLike): ConfigIssue[] {
  const out: ConfigIssue[] = [];
  const { hour, minute, runMinutes } = lesson.params;
  if (!isInt(hour, 1, 12))
    out.push({ path: ['params', 'hour'], message: 'hour（几时）要写 1 到 12 的整数' });
  if (minute !== undefined && !isInt(minute, 0, 59))
    out.push({ path: ['params', 'minute'], message: 'minute（几分）要写 0 到 59 的整数' });
  if (runMinutes !== undefined && !isInt(runMinutes, 1, 720))
    out.push({
      path: ['params', 'runMinutes'],
      message: 'runMinutes（走多少分钟）要写 1 到 720 的整数',
    });
  lesson.steps.forEach((st, i) => {
    if (st.show !== undefined && !isClockShow(st.show))
      out.push({
        path: ['steps', i, 'show'],
        message: `clock 模板的 show 只能是 ${CLOCK_SHOWS.join('、')}，run 还可以写成 run:30（走 30 分钟，1–720）`,
      });
  });
  return out;
}
