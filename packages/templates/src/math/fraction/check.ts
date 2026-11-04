// fraction 模板的配置检查（pnpm content:check 调用），报错面向写配置的人。
import type { ConfigIssue, LessonLike } from '@flow-see/runtime/template.ts';
import { FRACTION_SHAPES, FRACTION_SHOWS } from './shows';

/** 检查知识点配置：每一步的 show、参数取值 */
export function checkFraction(lesson: LessonLike): ConfigIssue[] {
  const out: ConfigIssue[] = [];
  const { shape, parts, take } = lesson.params;
  if (shape !== undefined && !(FRACTION_SHAPES as readonly unknown[]).includes(shape))
    out.push({ path: ['params', 'shape'], message: `shape 只能是 ${FRACTION_SHAPES.join('、')}` });
  if (!Number.isInteger(parts) || (parts as number) < 1)
    out.push({ path: ['params', 'parts'], message: 'parts（平均分成几份）要写正整数' });
  if (
    take !== undefined &&
    (!Number.isInteger(take) || (take as number) < 0 || (take as number) > (parts as number))
  )
    out.push({ path: ['params', 'take'], message: 'take（取几份）要写 0 到 parts 之间的整数' });
  lesson.steps.forEach((st, i) => {
    if (st.show === undefined) return;
    if (!(FRACTION_SHOWS as readonly string[]).includes(st.show))
      out.push({
        path: ['steps', i, 'show'],
        message: `fraction 模板的 show 只能是 ${FRACTION_SHOWS.join('、')}`,
      });
  });
  return out;
}
