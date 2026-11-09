// 场景模板的配置检查（pnpm content:check 调用）：零件类型和属性、动作写法、引用的零件是否存在。
import {
  COMMON_PROPS,
  COUNTER_LAYOUTS,
  COUNTER_SHAPES,
  PART_TYPES,
  SHAPE_KINDS,
  getPart,
  isColor,
  isCounters,
  isPoint,
  parseClockTime,
} from '@flow-see/blocks';
import { evalExpr, fillParams, resolveParams } from '@flow-see/core';
import type { ConfigIssue, LessonLike } from '@flow-see/runtime/template.ts';
import {
  MULTI_TARGET,
  TIMING_KEYS,
  VERBS,
  VERB_KEYS,
  dealCount,
  isVerb,
  parseAction,
  parseDuration,
} from './actions';
import { coveredActions, dragFrame, dragTargets, type SceneDef } from './evaluate';
import { MAX_REPEAT, expandActions, expandObjects, isObj, isRepeat } from './repeat';

/** 颜色：颜色名、#RRGGBB，或 "@零件id"（跟着那个零件的颜色） */
const colorOk = (v: unknown, alive: Map<string, string>) =>
  isColor(v) || (typeof v === 'string' && v.startsWith('@') && alive.has(v.slice(1)));

/** 文字里的颜色标记 [文字](颜色)、[文字](颜色 @零件id)、[文字](@零件id) */
const RICH = /\[([^\]]*)\]\(([^)]*)\)/g;

const ID = /^[A-Za-z_][\w-]*$/;

/** 零件属性的取值检查（只查容易写错、写错后画面会出问题的） */
function checkProps(
  type: string,
  props: Record<string, unknown>,
  path: (string | number)[],
  out: ConfigIssue[],
  alive: Map<string, string> = new Map(),
) {
  const part = getPart(type);
  if (!part) return;
  const known = new Set<string>([...COMMON_PROPS, ...part.props]);
  for (const [k, v] of Object.entries(props)) {
    if (!known.has(k)) {
      out.push({
        path: [...path, k],
        message: `${part.name}（${type}）没有属性 ${k}；可用的有：${part.props.join('、')}`,
      });
      continue;
    }
    if (k === 'at' && !isPoint(v))
      out.push({ path: [...path, k], message: 'at 要写成 [x, y]，如 [400, 225]' });
    if ((k === 'from' || k === 'to') && (type === 'line' || type === 'arrow') && !isPoint(v))
      out.push({ path: [...path, k], message: `${k} 要写成 [x, y]` });
    if (k === 'color' && !colorOk(v, alive))
      out.push({
        path: [...path, k],
        message: `颜色写颜色名（blue、orange、red、green、purple、yellow、pink、gray、ink、accent）、#RRGGBB，或 "@零件id"`,
      });
    if (k === 'colors' && v && typeof v === 'object' && !Array.isArray(v))
      for (const [n, c] of Object.entries(v))
        if (!colorOk(c, alive))
          out.push({ path: [...path, k, n], message: `${n} 的颜色写颜色名、#RRGGBB 或 "@零件id"` });
    if (k === 'blank' && type === 'split-calc') {
      const names = ['a', 'b', 'p', 'q', 'm', 'r'];
      if (!Array.isArray(v) || v.some((n) => !names.includes(String(n))))
        out.push({
          path: [...path, k],
          message: `blank 写成节点名列表，如 [q]；可用的节点：${names.join('、')}`,
        });
    }
    if (k === 'text' && typeof v === 'string')
      for (const m of v.matchAll(RICH)) {
        const words = m[2].trim().split(/\s+/).filter(Boolean);
        const bad = words.find(
          (w) => w !== 'blank' && w !== 'sup' && w !== 'frac' && !colorOk(w, alive),
        );
        if (!words.length || bad)
          out.push({
            path: [...path, k],
            message: `文字里的 [${m[1]}](${m[2]})：括号里写颜色名、#RRGGBB、"@零件id"、blank、sup 或 frac${bad ? `（${bad} 不认识）` : ''}`,
          });
        if (words.includes('frac') && !/^(?:-?\d+\s+)?-?\d+\/\d+$/.test(m[1].trim())) {
          out.push({
            path: [...path, k],
            message: `文字里的 [${m[1]}](${m[2]})：frac 的内容必须是 a/b 或 w a/b（整数）`,
          });
        }
      }
    if (k === 'layout' && !(COUNTER_LAYOUTS as readonly unknown[]).includes(v))
      out.push({ path: [...path, k], message: `layout 只能是 ${COUNTER_LAYOUTS.join('、')}` });
    if (
      k === 'shape' &&
      isCounters(part.type) &&
      !(COUNTER_SHAPES as readonly unknown[]).includes(v)
    )
      out.push({
        path: [...path, k],
        message: `计数块的 shape 只能是 ${COUNTER_SHAPES.join('、')}`,
      });
    if (k === 'shape' && part.type === 'shape' && !(SHAPE_KINDS as readonly unknown[]).includes(v))
      out.push({ path: [...path, k], message: `图形的 shape 只能是 ${SHAPE_KINDS.join('、')}` });
    if (k === 'time' && part.type === 'clock' && parseClockTime(v) === undefined)
      out.push({ path: [...path, k], message: '钟面的 time 写成 "3:30" 这样的时间，或分钟数' });
  }
}

/** 检查是否有嵌套的 repeat（元素里不能再写 repeat） */
function hasNestedRepeat(val: unknown, inRepeat = false): boolean {
  if (Array.isArray(val)) {
    for (const item of val) {
      if (isRepeat(item)) {
        if (inRepeat) return true;
        const { repeat: _, ...rest } = item as Record<string, unknown>;
        if (hasNestedRepeat(rest, true)) return true;
      } else if (hasNestedRepeat(item, inRepeat)) {
        return true;
      }
    }
    return false;
  }
  if (isObj(val)) {
    if (isRepeat(val)) {
      if (inRepeat) return true;
      const { repeat: _, ...rest } = val as Record<string, unknown>;
      return hasNestedRepeat(rest, true);
    }
    for (const v of Object.values(val)) {
      if (hasNestedRepeat(v, inRepeat)) return true;
    }
    return false;
  }
  return false;
}

/** 检查 repeat 次数是否超出上限 */
function checkRepeatLimits(
  val: unknown,
  path: (string | number)[],
  scope: Record<string, unknown>,
  out: ConfigIssue[],
) {
  if (Array.isArray(val)) {
    val.forEach((item, i) => checkRepeatLimits(item, [...path, i], scope, out));
  } else if (isObj(val)) {
    if ('repeat' in val) {
      const v = val.repeat;
      const n = typeof v === 'number' ? v : typeof v === 'string' ? evalExpr(v, scope) : undefined;
      if (n !== undefined && n > MAX_REPEAT) {
        const paramStr =
          Object.keys(scope).length > 0
            ? `（当 ${Object.entries(scope).map(([p, val]) => `${p} = ${String(val)}`).join('、')} 时）`
            : '';
        out.push({
          path: [...path, 'repeat'],
          message: `repeat 次数不能超过 ${MAX_REPEAT}${paramStr}`,
        });
      }
    }
    for (const [k, v] of Object.entries(val)) {
      if (k !== 'repeat') checkRepeatLimits(v, [...path, k], scope, out);
    }
  }
}

/** 检查展开后的列表是否为空 */
function checkEmptyLists(
  val: unknown,
  path: (string | number)[],
  scope: Record<string, unknown>,
  out: ConfigIssue[],
) {
  if (Array.isArray(val)) {
    if (val.length === 0) {
      const paramStr =
        Object.keys(scope).length > 0
          ? `（当 ${Object.entries(scope).map(([p, val]) => `${p} = ${String(val)}`).join('、')} 时）`
          : '';
      const name = path[path.length - 1];
      out.push({
        path,
        message: `${name} 列表展开后为空${paramStr}`,
      });
    } else {
      val.forEach((item, i) => checkEmptyLists(item, [...path, i], scope, out));
    }
  } else if (isObj(val)) {
    for (const [k, v] of Object.entries(val)) {
      checkEmptyLists(v, [...path, k], scope, out);
    }
  }
}

export function checkScene(raw: LessonLike): ConfigIssue[] {
  const out: ConfigIssue[] = [];
  const scope = resolveParams(raw.params, raw.derived);

  // repeat 不能嵌套
  (raw.objects ?? []).forEach((o, i) => {
    if (hasNestedRepeat(o)) {
      out.push({ path: ['objects', i], message: 'repeat 不能嵌套' });
    }
  });
  (raw.steps ?? []).forEach((st, si) => {
    if (hasNestedRepeat(st.do)) {
      out.push({ path: ['steps', si, 'do'], message: 'repeat 不能嵌套' });
    }
  });

  // repeat 次数上限检查
  (raw.objects ?? []).forEach((o, i) => {
    checkRepeatLimits(o, ['objects', i], scope, out);
  });
  (raw.steps ?? []).forEach((st, si) => {
    checkRepeatLimits(st.do, ['steps', si, 'do'], scope, out);
  });

  // 参数和派生值先代入，再检查（配置里的 count: "{a}" 要按代入后的数字检查）
  const filled = fillParams({ objects: raw.objects ?? [], steps: raw.steps }, scope);
  // 重复（repeat）先展开，再按展开后的零件和动作检查
  const lesson = {
    ...raw,
    objects: expandObjects(filled.objects, scope),
    steps: filled.steps.map((st) => ({
      ...st,
      do: expandActions(st.do, scope) as Record<string, unknown>[],
    })),
  };
  const objects = lesson.objects ?? [];
  if (!objects.length) out.push({ path: ['objects'], message: '场景模板要在 objects 里摆好零件' });

  // 展开后的列表为空时报错
  objects.forEach((o, i) => {
    for (const [k, v] of Object.entries(o)) {
      if (k !== 'id' && k !== 'type') {
        checkEmptyLists(v, ['objects', i, k], scope, out);
      }
    }
  });

  /** 当前存在的零件：id → 类型 */
  const alive = new Map<string, string>();
  objects.forEach((o, i) => {
    const id = o.id;
    const type = String(o.type);
    if (typeof id !== 'string' || !ID.test(id))
      out.push({ path: ['objects', i, 'id'], message: '零件 id 用英文字母开头，可含数字、_、-' });
    else if (alive.has(id))
      out.push({ path: ['objects', i, 'id'], message: `零件 id 重复：${id}` });
    const part = getPart(type);
    if (!part) {
      out.push({
        path: ['objects', i, 'type'],
        message: `没有这种零件：${type}（已有：${PART_TYPES.join('、')}）`,
      });
      return;
    }
    for (const r of part.required ?? [])
      if (o[r] === undefined) out.push({ path: ['objects', i], message: `${part.name}要写 ${r}` });
    if (typeof id === 'string') alive.set(id, part.type);
  });
  // 颜色可以引用别的零件（"@id"），所以等所有零件登记完再查属性
  objects.forEach((o, i) => {
    if (getPart(String(o.type))) checkProps(String(o.type), o, ['objects', i], out, alive);
  });

  const def: SceneDef = {
    stage: lesson.stage ?? { width: 800, height: 450 },
    objects,
    steps: lesson.steps.map((st) => st.do ?? []),
    tries: lesson.steps.map((st) => st.try),
  };

  lesson.steps.forEach((step, si) => {
    if (step.try?.drag) checkTry(def, si, alive, out);
    (step.do ?? []).forEach((raw, ai) => {
      const path = ['steps', si, 'do', ai];
      const keys = Object.keys(raw ?? {});
      if (keys.length !== 1 || !isVerb(keys[0])) {
        out.push({
          path,
          message: `每个动作写成“动作名: 参数”，动作名只能是：${Object.keys(VERBS).join('、')}`,
        });
        return;
      }
      const a = parseAction(raw);
      if (!a) {
        out.push({ path, message: `${keys[0]} 的参数格式不对` });
        return;
      }
      const { verb, args, targets } = a;
      const label = `${verb}（${VERBS[verb].name}）`;
      const need = (k: string, ok: boolean, msg: string) => {
        if (!ok) out.push({ path: [...path, verb, k], message: `${label}：${msg}` });
      };

      // 参数名
      if (verb !== 'set')
        for (const k of Object.keys(args))
          if (!VERB_KEYS[verb].includes(k) && !(TIMING_KEYS as readonly string[]).includes(k))
            out.push({
              path: [...path, verb, k],
              message: `${label} 没有参数 ${k}；可用的有：${[...VERB_KEYS[verb], ...TIMING_KEYS].join('、')}`,
            });
      for (const k of ['duration', 'delay'])
        need(
          k,
          args[k] === undefined || parseDuration(args[k]) !== undefined,
          `${k} 写成 1s、500ms 或秒数`,
        );

      // 目标零件
      if (verb === 'wait' || verb === 'ask') return;
      if (!targets.length) {
        need('target', false, '要写 target（零件 id）');
        return;
      }
      if (targets.length > 1 && !MULTI_TARGET.has(verb))
        need('target', false, '这个动作一次只能作用于一个零件');
      for (const t of targets) need('target', alive.has(t), `零件 ${t} 不存在（或已经被合并掉了）`);
      const type = alive.get(targets[0]);

      switch (verb) {
        case 'move': {
          const to = args.to;
          need(
            'to',
            isPoint(args.by) || isPoint(to) || (typeof to === 'string' && alive.has(to)),
            'to 写目标坐标 [x, y] 或零件 id；也可以用 by: [dx, dy] 写移动多少',
          );
          // 计数块移到另一组计数块 = 合并
          if (typeof to === 'string' && type && isCounters(type) && isCounters(alive.get(to) ?? ''))
            alive.delete(targets[0]);
          break;
        }
        case 'merge':
          need(
            'into',
            typeof args.into === 'string' && alive.has(args.into),
            'into 写要合并进去的零件 id',
          );
          need('target', !type || isCounters(type), '只有计数块可以合并');
          need(
            'into',
            !args.into || isCounters(alive.get(String(args.into)) ?? ''),
            '只能合并进计数块',
          );
          alive.delete(targets[0]);
          break;
        case 'split':
          need('target', !type || isCounters(type), '只有计数块可以拆分');
          need(
            'take',
            args.take === undefined || (Number.isInteger(args.take) && Number(args.take) > 0),
            'take 写拿出几个（正整数）',
          );
          need('as', typeof args.as === 'string' && ID.test(args.as), 'as 写拆出来的这一组的新 id');
          need(
            'as',
            typeof args.as !== 'string' || !alive.has(args.as),
            `id ${String(args.as)} 已经有零件在用`,
          );
          need('offset', args.offset === undefined || isPoint(args.offset), 'offset 写成 [dx, dy]');
          if (typeof args.as === 'string') alive.set(args.as, 'counters');
          break;
        case 'set': {
          const patch = Object.fromEntries(
            Object.entries(args).filter(
              ([k]) => k !== 'target' && !(TIMING_KEYS as readonly string[]).includes(k),
            ),
          );
          need(
            'target',
            Object.keys(patch).length > 0,
            '至少写一个要改的属性，如 text: "10 + 3 = 13"',
          );
          for (const t of targets) {
            const tt = alive.get(t);
            if (tt) checkProps(tt, patch, [...path, verb], out, alive);
          }
          break;
        }
        case 'rotate':
          need(
            'to',
            typeof args.to === 'number' || typeof args.by === 'number',
            '写 to（转到多少度）或 by（转多少度）',
          );
          break;
        case 'scale':
          need('to', typeof args.to === 'number' && args.to >= 0, 'to 写放大倍数，如 1.5');
          break;
        case 'color':
          need('to', colorOk(args.to, alive), 'to 写颜色名、#RRGGBB 或 "@零件id"');
          break;
        case 'highlight':
          need(
            'color',
            args.color === undefined || colorOk(args.color, alive),
            'color 写高亮框的颜色（颜色名或 #RRGGBB）',
          );
          break;
        case 'deal': {
          const into = Array.isArray(args.into) ? args.into : [args.into];
          need('target', !type || isCounters(type), '只能从一组计数块里分');
          need(
            'into',
            into.length > 0 &&
              into.every((x) => typeof x === 'string' && isCounters(alive.get(x) ?? '')),
            'into 写分到哪几组计数块里（零件 id 列表，如 [pl1, pl2, pl3]）',
          );
          need(
            'count',
            args.count === undefined || (Number.isInteger(args.count) && Number(args.count) > 0),
            'count 写一共分几个（正整数）；不写时每组分 1 个',
          );
          break;
        }
        case 'count':
          need('to', typeof args.to === 'number', 'to 写数到多少');
          break;
        case 'hop':
          need('target', type === 'numberline', '只能在数轴上跳');
          need('from', typeof args.from === 'number', 'from 写起点数');
          need('to', typeof args.to === 'number', 'to 写终点数');
          break;
      }
    });
  });
  return out;
}

/** 动手做（try）：拖动的零件要在这一步开头存在，要拖的个数要对得上 do 里的标准做法 */
function checkTry(def: SceneDef, si: number, alive: Map<string, string>, out: ConfigIssue[]) {
  const spec = def.tries?.[si];
  const drag = spec?.drag;
  const path = ['steps', si, 'try'];
  if (!drag) {
    out.push({ path, message: 'try 要写一种动手方式，如 drag（拖动）' });
    return;
  }
  const p = [...path, 'drag'];
  const fromType = alive.get(drag.from);
  if (!fromType) {
    out.push({ path: [...p, 'from'], message: `零件 ${drag.from} 在这一步开头不存在` });
    return;
  }
  if (!isCounters(fromType))
    out.push({ path: [...p, 'from'], message: 'from 要写一组计数块（只有计数块可以一个一个拖）' });
  for (const to of dragTargets(drag))
    if (!alive.has(to)) out.push({ path: [...p, 'to'], message: `零件 ${to} 在这一步开头不存在` });
  const count = drag.count;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) {
    out.push({ path: [...p, 'count'], message: 'count 写要拖几个（正整数，可以写 "{参数}"）' });
    return;
  }
  const have = dragFrame(def, si, []).items.length;
  if (count > have)
    out.push({
      path: [...p, 'count'],
      message: `要拖 ${count} 个，但 ${drag.from} 在这一步开头只有 ${have} 个`,
    });
  // do 是标准做法：演示和做对后的画面都由它给出，所以要有对应的拆分/移动，个数也要一样
  const list = def.steps[si] ?? [];
  const covered = coveredActions(list, spec);
  const moves = [...covered]
    .map((i) => parseAction(list[i]))
    .filter((a) => a && (a.verb === 'move' || a.verb === 'merge' || a.verb === 'deal'));
  const to = dragTargets(drag).join('、');
  if (!moves.length) {
    out.push({
      path,
      message: `do 里要有把 ${drag.from} 移动（move）、合并（merge）或一个一个分（deal）到 ${to} 的动作，演示和做对后的画面都用它`,
    });
    return;
  }
  const split = [...covered].map((i) => parseAction(list[i])).find((a) => a?.verb === 'split');
  const deals = moves.filter((a) => a?.verb === 'deal');
  const standard = deals.length
    ? deals.reduce((n, a) => n + dealCount(a!.args), 0)
    : split
      ? Math.round(Number(split.args.take ?? 1))
      : have;
  if (standard !== count)
    out.push({
      path: [...p, 'count'],
      message: `要孩子拖 ${count} 个，但 do 里的标准做法移过去的是 ${standard} 个`,
    });
}
