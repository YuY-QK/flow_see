// 场景模板的配置检查（pnpm content:check 调用）：零件类型和属性、动作写法、引用的零件是否存在。
import {
  COMMON_PROPS,
  COUNTER_LAYOUTS,
  COUNTER_SHAPES,
  ITEM_SET_LAYOUTS,
  ITEM_SET_SHAPES,
  MONEY_LAYOUTS,
  PART_TYPES,
  SHAPE_KINDS,
  findSubitem,
  getPart,
  isColor,
  isCounters,
  isPoint,
  parseClockTime,
  type Props,
} from '@flow-see/blocks';
import {
  evalExpr,
  fillParams,
  isAngleEqual,
  matchPattern,
  parseTurnAnswer,
  resolveParams,
} from '@flow-see/core';
import type { ConfigIssue, LessonLike, TrySpec } from '@flow-see/runtime/template.ts';
import {
  MULTI_TARGET,
  TIMING_KEYS,
  VERBS,
  VERB_KEYS,
  dealCount,
  isVerb,
  parseAction,
  parseDuration,
  parseTargetRef,
} from './actions';
import { coveredActions, dragFrame, dragTargets, sceneFrame, type SceneDef } from './evaluate';
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
  if (type === 'grid' && props.filled !== undefined && props.cells !== undefined) {
    out.push({
      path: [...path, 'cells'],
      message: '方格的 cells 和 filled 二者写一个，不能同时指定',
    });
  }
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
    if (k === 'layout') {
      if (part.type === 'item-set') {
        if (!(ITEM_SET_LAYOUTS as readonly unknown[]).includes(v))
          out.push({
            path: [...path, k],
            message: `物品组的 layout 只能是 ${ITEM_SET_LAYOUTS.join('、')}`,
          });
      } else if (part.type === 'money') {
        if (!(MONEY_LAYOUTS as readonly unknown[]).includes(v))
          out.push({
            path: [...path, k],
            message: `人民币的 layout 只能是 ${MONEY_LAYOUTS.join('、')}`,
          });
      } else if (!(COUNTER_LAYOUTS as readonly unknown[]).includes(v)) {
        out.push({ path: [...path, k], message: `layout 只能是 ${COUNTER_LAYOUTS.join('、')}` });
      }
    }
    if (k === 'items' && part.type === 'money') {
      if (!Array.isArray(v)) {
        out.push({ path: [...path, k], message: 'items 必须是列表' });
      }
    }
    if (k === 'items' && part.type === 'item-set') {
      if (!Array.isArray(v)) {
        out.push({ path: [...path, k], message: 'items 必须是列表' });
      } else {
        v.forEach((it, idx) => {
          if (!it || typeof it !== 'object') {
            out.push({ path: [...path, k, idx], message: '物品必须是对象' });
            return;
          }
          const item = it as Record<string, unknown>;
          if (
            item.shape !== undefined &&
            !(ITEM_SET_SHAPES as readonly unknown[]).includes(item.shape)
          ) {
            out.push({
              path: [...path, k, idx, 'shape'],
              message: `物品的 shape 只能是 ${ITEM_SET_SHAPES.join('、')}`,
            });
          }
          if (item.color !== undefined && !colorOk(item.color, alive)) {
            out.push({
              path: [...path, k, idx, 'color'],
              message: `颜色写颜色名、#RRGGBB，或 "@零件id"`,
            });
          }
        });
      }
    }
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
    if (k === 'points' && part.type === 'polygon') {
      if (!Array.isArray(v) || v.length < 3 || !v.every(isPoint))
        out.push({ path: [...path, k], message: '多边形的 points 必须至少包含 3 个顶点坐标 [x, y]' });
    }
    if (k === 'cut' && part.type === 'polygon') {
      if (!Array.isArray(v) || v.length !== 2 || !isPoint(v[0]) || !isPoint(v[1]))
        out.push({ path: [...path, k], message: '剪开线 cut 要写成两个坐标 [[x1, y1], [x2, y2]]' });
    }
    if (k === 'cells' && part.type === 'grid') {
      if (!Array.isArray(v)) {
        out.push({ path: [...path, k], message: 'cells 必须是坐标列表 [[行, 列], …]' });
      } else {
        v.forEach((item, idx) => {
          if (
            !Array.isArray(item) ||
            item.length !== 2 ||
            typeof item[0] !== 'number' ||
            typeof item[1] !== 'number' ||
            item[0] < 1 ||
            item[1] < 1
          ) {
            out.push({
              path: [...path, k, idx],
              message: '格子坐标写成 [行, 列]，从 1 开始',
            });
          } else {
            if (typeof props.rows === 'number' && item[0] > props.rows) {
              out.push({
                path: [...path, k, idx],
                message: `行号 ${item[0]} 超出方格总行数 ${props.rows}`,
              });
            }
            if (typeof props.cols === 'number' && item[1] > props.cols) {
              out.push({
                path: [...path, k, idx],
                message: `列号 ${item[1]} 超出方格总列数 ${props.cols}`,
              });
            }
          }
        });
      }
    }
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
    if (step.try) checkTry(def, si, alive, objects, (lesson.params ?? {}) as Record<string, unknown>, out);
    if (step.try?.choose?.show) checkChooseShow(step.try.choose.show, si, alive, objects, out);
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

      const allowsSubitem =
        verb === 'highlight' || verb === 'unhighlight' || verb === 'color' || verb === 'move';
      for (const t of targets) {
        const { id, sub } = parseTargetRef(t);
        if (sub) {
          if (!allowsSubitem) {
            need('target', false, `${label} 不能以子项作为目标`);
          } else if (!alive.has(id)) {
            need('target', false, `零件 ${id} 不存在（或已经被合并掉了）`);
          } else {
            const partType = alive.get(id);
            const part = partType ? getPart(partType) : undefined;
            if (!part?.subitems) {
              need('target', false, `${part?.name ?? id} 没有子项`);
            } else {
              const obj = objects.find((o) => o.id === id);
              const props: Props = obj ? { ...part.defaults, ...(part.normalize?.(obj) ?? obj) } : {};
              const found = findSubitem(part, props, sub);
              if (!found || (Array.isArray(found) && found.length === 0)) {
                need('target', false, `零件 ${id} 没有子项 ${sub}`);
              }
            }
          }
        } else {
          need('target', alive.has(t), `零件 ${t} 不存在（或已经被合并掉了）`);
        }
      }
      const firstId = parseTargetRef(targets[0]).id;
      const type = alive.get(firstId);

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
            if (tt === 'grid') {
              const orig = objects.find((o) => o.id === t);
              if (orig) {
                if (orig.cells !== undefined && patch.filled !== undefined) {
                  out.push({
                    path: [...path, verb, 'filled'],
                    message: '方格已使用 cells，不能再设置 filled（二者写一个）',
                  });
                }
                if (orig.filled !== undefined && patch.cells !== undefined) {
                  out.push({
                    path: [...path, verb, 'cells'],
                    message: '方格已使用 filled，不能再设置 cells（二者写一个）',
                  });
                }
                if (Array.isArray(patch.cells)) {
                  (patch.cells as unknown[]).forEach((item, idx) => {
                    if (
                      Array.isArray(item) &&
                      item.length === 2 &&
                      typeof item[0] === 'number' &&
                      typeof item[1] === 'number'
                    ) {
                      if (typeof orig.rows === 'number' && item[0] > orig.rows) {
                        out.push({
                          path: [...path, verb, 'cells', idx],
                          message: `行号 ${item[0]} 超出方格总行数 ${orig.rows}`,
                        });
                      }
                      if (typeof orig.cols === 'number' && item[1] > orig.cols) {
                        out.push({
                          path: [...path, verb, 'cells', idx],
                          message: `列号 ${item[1]} 超出方格总列数 ${orig.cols}`,
                        });
                      }
                    }
                  });
                }
              }
            }
          }
          break;
        }
        case 'rotate':
          need(
            'to',
            typeof args.to === 'number' || typeof args.by === 'number',
            '写 to（转到多少度）或 by（转多少度）',
          );
          if (args.around !== undefined) {
            const around = args.around;
            const isAroundPoint = isPoint(around);
            const isAroundStr = typeof around === 'string';
            need(
              'around',
              isAroundPoint || isAroundStr,
              'around 写成坐标 [x, y] 或子项 "零件id.子项名"',
            );
            if (isAroundStr) {
              const dot = around.indexOf('.');
              const partId = dot > 0 ? around.slice(0, dot) : around;
              need('around', alive.has(partId), `around 引用的零件 ${partId} 不存在`);
            }
          }
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
          need(
            'color',
            args.color === undefined || colorOk(args.color, alive),
            'color 写颜色名或 #RRGGBB',
          );
          break;
        case 'flip': {
          need(
            'axis',
            Array.isArray(args.axis) &&
              args.axis.length === 2 &&
              isPoint(args.axis[0]) &&
              isPoint(args.axis[1]) &&
              (args.axis[0][0] !== args.axis[1][0] || args.axis[0][1] !== args.axis[1][1]),
            'axis 写对称轴的两点坐标 [[x1, y1], [x2, y2]]',
          );
          for (const t of targets) {
            const tt = alive.get(t);
            if (tt === 'text' || tt === 'label') {
              out.push({
                path: [...path, verb, 'target'],
                message: `${label}：文字零件（${t}）翻折后文字会镜像，知识点里不要翻折文字`,
              });
            }
          }
          break;
        }
        case 'follow': {
          need(
            'path',
            (Array.isArray(args.path) && args.path.length >= 2 && args.path.every(isPoint)) ||
              (typeof args.path === 'string' && alive.has(args.path)),
            'path 写坐标列表（至少两个点），如 [[100, 100], [200, 100]]，或路径零件 id',
          );
          if (args.draw !== undefined) {
            need(
              'draw',
              typeof args.draw === 'string' && alive.has(args.draw),
              'draw 写要同步画出的路径零件 id',
            );
          }
          break;
        }
      }
    });
  });
  return out;
}

/** 动手做（try）：拖动的零件要在这一步开头存在，要拖的个数要对得上 do 里的标准做法；点选的零件/子项要在 among 内存在 */
function checkTry(
  def: SceneDef,
  si: number,
  alive: Map<string, string>,
  objects: Props[],
  scope: Record<string, unknown>,
  out: ConfigIssue[],
) {
  const spec = def.tries?.[si];
  const path = ['steps', si, 'try'];
  if (!spec?.drag && !spec?.tap && !spec?.choose && !spec?.turn && !spec?.sort && !spec?.place) {
    out.push({ path, message: 'try 要写一种动手方式，如 drag（拖动）或 tap（点选）' });
    return;
  }
  if (spec.drag) checkDrag(def, si, alive, out);
  if (spec.tap) checkTap(spec.tap, si, alive, objects, scope, out);
  if (spec.turn) checkTurn(def, si, alive, objects, out);
  if (spec.sort) checkSort(spec.sort, si, alive, objects, out);
  if (spec.place) checkPlace(def, si, alive, objects, out);
}

function checkDrag(def: SceneDef, si: number, alive: Map<string, string>, out: ConfigIssue[]) {
  const spec = def.tries?.[si];
  const drag = spec?.drag;
  if (!drag) return;
  const p = ['steps', si, 'try', 'drag'];
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
      path: ['steps', si, 'try'],
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

function checkTap(
  tap: TrySpec['tap'],
  si: number,
  alive: Map<string, string>,
  objects: Props[],
  scope: Record<string, unknown>,
  out: ConfigIssue[],
) {
  if (!tap) return;
  const path = ['steps', si, 'try', 'tap'];

  if (!tap.answer && (!tap.valid || tap.pick === undefined)) {
    out.push({
      path,
      message: 'tap 要写指定答案（answer）或按条件点（valid 与 pick）',
    });
    return;
  }

  // 1. 检查 among
  if (tap.among) {
    if (!Array.isArray(tap.among) || tap.among.length === 0) {
      out.push({ path: [...path, 'among'], message: 'among 写子项或零件列表，如 ["grid1.row.*"]' });
    } else {
      tap.among.forEach((pat: string, idx: number) => {
        if (typeof pat !== 'string') return;
        const { id, sub } = parseTargetRef(pat);
        if (!alive.has(id)) {
          out.push({ path: [...path, 'among', idx], message: `零件 ${id} 在这一步开头不存在` });
        } else if (sub) {
          const type = alive.get(id);
          const part = type ? getPart(type) : undefined;
          if (!part?.subitems) {
            out.push({ path: [...path, 'among', idx], message: `${part?.name ?? id} 没有子项` });
          } else {
            const obj = objects.find((o) => o.id === id);
            const props: Props = obj ? { ...part.defaults, ...(part.normalize?.(obj) ?? obj) } : {};
            const found = findSubitem(part, props, sub);
            if (!found || (Array.isArray(found) && found.length === 0)) {
              out.push({ path: [...path, 'among', idx], message: `零件 ${id} 没有子项 ${sub}` });
            }
          }
        }
      });
    }
  }

  // 2. 检查指定答案（answer）
  if (tap.answer !== undefined) {
    const answers = Array.isArray(tap.answer) ? tap.answer : [tap.answer];
    if (answers.length === 0) {
      out.push({ path: [...path, 'answer'], message: 'answer 不能为空' });
    }
    answers.forEach((ans: string | number, idx: number) => {
      const ansStr = String(ans);
      const { id, sub } = parseTargetRef(ansStr);
      const ansPath = Array.isArray(tap.answer) ? [...path, 'answer', idx] : [...path, 'answer'];
      if (!alive.has(id)) {
        out.push({ path: ansPath, message: `零件 ${id} 在这一步开头不存在` });
      } else if (sub) {
        const type = alive.get(id);
        const part = type ? getPart(type) : undefined;
        if (!part?.subitems) {
          out.push({ path: ansPath, message: `${part?.name ?? id} 没有子项` });
        } else {
          const obj = objects.find((o) => o.id === id);
          const props: Props = obj ? { ...part.defaults, ...(part.normalize?.(obj) ?? obj) } : {};
          const found = findSubitem(part, props, sub);
          if (!found || (Array.isArray(found) && found.length === 0)) {
            out.push({ path: ansPath, message: `零件 ${id} 没有子项 ${sub}` });
          }
        }
      }
      if (tap.among && tap.among.length > 0) {
        const inAmong = tap.among.some((pat: string) => matchPattern(pat, ansStr));
        if (!inAmong) {
          out.push({ path: ansPath, message: `答案 ${ansStr} 不在 among 允许的范围内` });
        }
      }
    });
  }

  // 3. 检查按条件点（valid 和 pick）
  if (tap.valid !== undefined || tap.pick !== undefined) {
    const pick = Number(tap.pick);
    if (!Number.isFinite(pick) || pick < 1 || !Number.isInteger(pick)) {
      out.push({ path: [...path, 'pick'], message: 'pick 写需要点选的个数（正整数）' });
    }
    if (!tap.valid || typeof tap.valid !== 'string') {
      out.push({ path: [...path, 'valid'], message: 'valid 写判定条件的算式，如 "{n % 2 == 0}"' });
    } else {
      const eligibleSubitems: { id: string; name: string; value?: number }[] = [];
      for (const obj of objects) {
        if (!alive.has(obj.id as string)) continue;
        const type = alive.get(obj.id as string);
        const part = type ? getPart(type) : undefined;
        if (!part?.subitems) continue;
        const props: Props = { ...part.defaults, ...(part.normalize?.(obj) ?? obj) };
        const subs = part.subitems(props);
        for (const sub of subs) {
          const fullName = `${obj.id}.${sub.name}`;
          if (
            !tap.among ||
            tap.among.some((pat: string) => matchPattern(pat, fullName) || matchPattern(pat, sub.name))
          ) {
            eligibleSubitems.push({ id: obj.id as string, name: sub.name, value: sub.value });
          }
        }
      }
      let matchCount = 0;
      for (const sub of eligibleSubitems) {
        const val =
          sub.value ??
          (() => {
            const last = sub.name.split('.').pop();
            const n = Number(last);
            return Number.isFinite(n) ? n : undefined;
          })();
        if (val !== undefined) {
          const evalScope: Record<string, number> = {};
          for (const [k, v] of Object.entries(scope)) {
            if (typeof v === 'number') evalScope[k] = v;
          }
          evalScope.n = val;
          const r = evalExpr(tap.valid, evalScope);
          if (r !== undefined && r !== 0) {
            matchCount++;
          }
        }
      }
      if (Number.isFinite(pick) && pick >= 1 && matchCount < pick) {
        out.push({
          path: [...path, 'valid'],
          message: `满足条件的子项只有 ${matchCount} 个，少于 pick 要求的 ${pick} 个`,
        });
      }
    }
  }
}

/** 点选（choose）做错提示：检查 show 里引用的零件或子项是否存在 */
function checkChooseShow(
  show: unknown,
  si: number,
  alive: Map<string, string>,
  objects: Props[],
  out: ConfigIssue[],
) {
  if (!Array.isArray(show)) return;
  const path = ['steps', si, 'try', 'choose', 'show'];
  show.forEach((item, idx) => {
    if (typeof item !== 'string') return;
    const { id, sub } = parseTargetRef(item);
    if (sub) {
      if (!alive.has(id)) {
        out.push({ path: [...path, idx], message: `零件 ${id} 不存在（或已经被合并掉了）` });
      } else {
        const type = alive.get(id);
        const part = type ? getPart(type) : undefined;
        if (!part?.subitems) {
          out.push({ path: [...path, idx], message: `${part?.name ?? id} 没有子项` });
        } else {
          const obj = objects.find((o) => o.id === id);
          const props: Props = obj ? { ...part.defaults, ...(part.normalize?.(obj) ?? obj) } : {};
          const found = findSubitem(part, props, sub);
          if (!found || (Array.isArray(found) && found.length === 0)) {
            out.push({ path: [...path, idx], message: `零件 ${id} 没有子项 ${sub}` });
          }
        }
      }
    } else {
      if (!alive.has(id)) {
        out.push({ path: [...path, idx], message: `零件 ${id} 不存在（或已经被合并掉了）` });
      }
    }
  });
}

/** 动手做（turn）：转动把手，检查目标零件在这一步开头存在、handles() 包含该 prop、answer 在取值范围内 */
function checkTurn(
  def: SceneDef,
  si: number,
  alive: Map<string, string>,
  objects: Props[],
  out: ConfigIssue[],
) {
  const spec = def.tries?.[si];
  const turn = spec?.turn;
  if (!turn) return;
  const p = ['steps', si, 'try', 'turn'];

  if (!turn.target) {
    out.push({ path: [...p, 'target'], message: 'turn 要写 target（转动哪个零件）' });
    return;
  }
  if (!alive.has(turn.target)) {
    out.push({ path: [...p, 'target'], message: `零件 ${turn.target} 在这一步开头不存在` });
    return;
  }

  const obj = objects.find((o) => o.id === turn.target);
  if (!obj) return;
  const part = getPart(String(obj.type));
  if (!part) {
    out.push({ path: [...p, 'target'], message: `未知的零件类型：${obj.type}` });
    return;
  }

  if (!part.handles) {
    out.push({
      path: [...p, 'target'],
      message: `零件 ${turn.target}（${part.name}）不支持转动把手（未定义 handles）`,
    });
    return;
  }

  if (!turn.prop) {
    out.push({ path: [...p, 'prop'], message: 'turn 要写 prop（修改哪个属性）' });
    return;
  }

  const props: Props = { ...part.defaults, ...(part.normalize?.(obj) ?? obj) };
  const handles = part.handles(props);
  const handle = handles.find((h) => h.prop === turn.prop);
  if (!handle) {
    const available = handles.map((h) => h.prop).join('、');
    out.push({
      path: [...p, 'prop'],
      message: `零件 ${turn.target}（${part.name}）的把手不包含属性 ${turn.prop}${available ? `（可选属性：${available}）` : ''}`,
    });
    return;
  }

  if (turn.answer === undefined || turn.answer === '') {
    out.push({ path: [...p, 'answer'], message: 'turn 要写 answer（目标数值）' });
    return;
  }

  let normalizedVal: number | undefined;
  if (part.normalize) {
    const norm = part.normalize({ ...props, [turn.prop]: turn.answer });
    if (norm && norm[turn.prop] !== undefined) {
      const n = Number(norm[turn.prop]);
      if (Number.isFinite(n)) normalizedVal = n;
    }
  }
  if (normalizedVal === undefined) {
    normalizedVal = parseTurnAnswer(turn.answer);
  }

  if (!Number.isFinite(normalizedVal)) {
    out.push({
      path: [...p, 'answer'],
      message: `answer（${turn.answer}）无法解析为有效数值`,
    });
    return;
  }

  if (normalizedVal < handle.min || normalizedVal > handle.max) {
    out.push({
      path: [...p, 'answer'],
      message: `answer（${normalizedVal}）超出属性 ${turn.prop} 的取值范围 [${handle.min}, ${handle.max}]`,
    });
  }

  if (turn.tolerance !== undefined) {
    const tol = Number(turn.tolerance);
    if (!Number.isFinite(tol) || tol < 0) {
      out.push({ path: [...p, 'tolerance'], message: 'tolerance 必须为非负数' });
    }
  }

  if (turn.step !== undefined) {
    const st = Number(turn.step);
    if (!Number.isFinite(st) || st <= 0) {
      out.push({ path: [...p, 'step'], message: 'step 必须为正数' });
    }
  }
}

/** 动手做（sort）：分类拖放，检查 from 是 item-set、每个物品 tags[by] 都在 bins 里、筐零件存在 */
function checkSort(
  sort: TrySpec['sort'],
  si: number,
  alive: Map<string, string>,
  objects: Props[],
  out: ConfigIssue[],
) {
  if (!sort) return;
  const path = ['steps', si, 'try', 'sort'];

  if (!sort.from) {
    out.push({ path: [...path, 'from'], message: 'sort 要写 from（从哪个物品组拖）' });
    return;
  }
  if (!alive.has(sort.from)) {
    out.push({ path: [...path, 'from'], message: `零件 ${sort.from} 在这一步开头不存在` });
    return;
  }
  const fromType = alive.get(sort.from);
  if (fromType !== 'item-set') {
    out.push({ path: [...path, 'from'], message: 'from 要写一个物品组（item-set）' });
    return;
  }

  if (!sort.by || typeof sort.by !== 'string') {
    out.push({ path: [...path, 'by'], message: 'by 要写分类依据的标签名（如 "color"、"shape"）' });
    return;
  }

  if (!sort.bins || typeof sort.bins !== 'object' || Array.isArray(sort.bins)) {
    out.push({ path: [...path, 'bins'], message: 'bins 要写分类筐的映射表' });
    return;
  }

  // 检查每个筐零件是否存在
  for (const [tagVal, binId] of Object.entries(sort.bins)) {
    if (typeof binId !== 'string' || !alive.has(binId)) {
      out.push({ path: [...path, 'bins', tagVal], message: `零件 ${binId} 在这一步开头不存在` });
    }
  }

  // 检查 from 里的每一个物品：tags[by] 必须存在且在 bins 里
  const fromObj = objects.find((o) => o.id === sort.from);
  const rawItems = fromObj && Array.isArray(fromObj.items) ? fromObj.items : [];
  if (!rawItems.length) {
    out.push({ path: [...path, 'from'], message: `${sort.from} 没有物品` });
    return;
  }

  rawItems.forEach((it: unknown, idx: number) => {
    if (!it || typeof it !== 'object') return;
    const item = it as Record<string, unknown>;
    const tags =
      item.tags && typeof item.tags === 'object'
        ? (item.tags as Record<string, string>)
        : undefined;
    const tagVal = tags ? tags[sort.by] : undefined;
    if (tagVal === undefined) {
      out.push({
        path: [...path, 'from'],
        message: `第 ${idx + 1} 个物品缺少标签 ${sort.by}`,
      });
    } else if (!(tagVal in sort.bins)) {
      out.push({
        path: [...path, 'from'],
        message: `第 ${idx + 1} 个物品的标签 ${tagVal} 不在 bins 里`,
      });
    }
  });
}

/** 动手做（place）：拖到位，检查目标零件在这一步开头存在、do 里有把 target 移到 to 的 move（坐标一致）、写了 rotate 时还要有转到该角度的 rotate */
function checkPlace(
  def: SceneDef,
  si: number,
  alive: Map<string, string>,
  objects: Props[],
  out: ConfigIssue[],
) {
  const spec = def.tries?.[si];
  const place = spec?.place;
  if (!place) return;
  const p = ['steps', si, 'try', 'place'];

  if (!place.target) {
    out.push({ path: [...p, 'target'], message: 'place 要写 target（拖动哪个零件）' });
    return;
  }
  if (!alive.has(place.target)) {
    out.push({ path: [...p, 'target'], message: `零件 ${place.target} 在这一步开头不存在` });
    return;
  }

  if (place.to === undefined) {
    out.push({ path: [...p, 'to'], message: 'place 要写 to（目标位置）' });
    return;
  }

  const isToArray =
    Array.isArray(place.to) &&
    place.to.length === 2 &&
    Number.isFinite(Number(place.to[0])) &&
    Number.isFinite(Number(place.to[1]));
  const isToStr = typeof place.to === 'string';
  if (!isToArray && !isToStr) {
    out.push({ path: [...p, 'to'], message: 'to 写目标坐标 [x, y] 或零件 id' });
    return;
  }
  if (typeof place.to === 'string' && !alive.has(place.to)) {
    out.push({ path: [...p, 'to'], message: `目标零件 ${place.to} 在这一步开头不存在` });
    return;
  }

  const list = def.steps[si] ?? [];
  const moveAction = list
    .map(parseAction)
    .find((a) => a && a.verb === 'move' && a.targets.includes(place.target));

  if (!moveAction) {
    out.push({
      path: ['steps', si, 'try', 'place'],
      message: `do 里要有把 ${place.target} 移动到目标位置的 move 动作`,
    });
    return;
  }

  let targetPoint: [number, number] | undefined;
  if (isToArray) {
    targetPoint = [Number((place.to as unknown[])[0]), Number((place.to as unknown[])[1])];
  } else if (isToStr) {
    const targetObj = objects.find((o) => o.id === place.to);
    if (targetObj) {
      const part = getPart(String(targetObj.type));
      if (part) {
        const box = part.bbox(targetObj);
        targetPoint = [box.x + box.w / 2, box.y + box.h / 2];
      }
    }
  }

  if (targetPoint) {
    const moveTo = moveAction.args.to;
    const moveBy = moveAction.args.by;
    let finalMovePoint: [number, number] | undefined;
    if (isPoint(moveTo)) {
      finalMovePoint = [Number(moveTo[0]), Number(moveTo[1])];
    } else if (typeof moveTo === 'string' && alive.has(moveTo)) {
      const destObj = objects.find((o) => o.id === moveTo);
      if (destObj) {
        const part = getPart(String(destObj.type));
        if (part) {
          const box = part.bbox(destObj);
          finalMovePoint = [box.x + box.w / 2, box.y + box.h / 2];
        }
      }
    } else if (isPoint(moveBy)) {
      const frameBefore = sceneFrame(def, si, 0);
      const currObj = frameBefore.objects.find((o) => o.id === place.target);
      if (currObj) {
        const part = getPart(currObj.type);
        if (part) {
          const box = part.bbox(currObj.props);
          const cx = box.x + box.w / 2;
          const cy = box.y + box.h / 2;
          finalMovePoint = [cx + Number(moveBy[0]), cy + Number(moveBy[1])];
        }
      }
    }

    if (finalMovePoint) {
      const dist = Math.hypot(
        finalMovePoint[0] - targetPoint[0],
        finalMovePoint[1] - targetPoint[1],
      );
      if (dist > 1) {
        out.push({
          path: ['steps', si, 'try', 'place'],
          message: `move 移动目标坐标 [${finalMovePoint[0]}, ${finalMovePoint[1]}] 与 place.to 坐标 [${targetPoint[0]}, ${targetPoint[1]}] 不一致`,
        });
      }
    }
  }

  if (place.rotate !== undefined) {
    const targetDeg = Number(place.rotate);
    if (!Number.isFinite(targetDeg)) {
      out.push({ path: [...p, 'rotate'], message: `rotate（${place.rotate}）必须为有效数值` });
    } else {
      const rotateAction = list
        .map(parseAction)
        .find(
          (a) =>
            a &&
            (a.verb === 'rotate' || (a.verb === 'set' && a.args.rotate !== undefined)) &&
            a.targets.includes(place.target),
        );
      if (!rotateAction) {
        out.push({
          path: ['steps', si, 'try', 'place'],
          message: `写了 rotate 时，do 里要有把 ${place.target} 旋转到该角度的 rotate 动作`,
        });
      } else {
        let moveDeg: number | undefined;
        if (rotateAction.verb === 'rotate') {
          if (typeof rotateAction.args.to === 'number') {
            moveDeg = rotateAction.args.to;
          } else if (typeof rotateAction.args.by === 'number') {
            const frameBefore = sceneFrame(def, si, 0);
            const currObj = frameBefore.objects.find((o) => o.id === place.target);
            const curRot = Number(currObj?.props.rotate ?? 0);
            moveDeg = curRot + rotateAction.args.by;
          }
        } else if (rotateAction.verb === 'set') {
          moveDeg = Number(rotateAction.args.rotate);
        }
        if (moveDeg !== undefined && !isAngleEqual(moveDeg, targetDeg)) {
          out.push({
            path: ['steps', si, 'try', 'place'],
            message: `rotate 动作目标角度（${moveDeg}°）与 place.rotate（${targetDeg}°）不一致`,
          });
        }
      }
    }
  }

  if (place.tolerance !== undefined) {
    const tol = Number(place.tolerance);
    if (!Number.isFinite(tol) || tol < 0) {
      out.push({ path: [...p, 'tolerance'], message: 'tolerance 必须为非负数' });
    }
  }
}
