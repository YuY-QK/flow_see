import { createRequire } from 'node:module';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import {
  counterSlot,
  registerPart,
  unregisterPart,
  type PartDef,
  type Point,
} from '@flow-see/blocks';
import { getTheme, type Animation } from '@flow-see/core';
import { defaultMs, parseDuration, planStep, polylineLength } from './actions';
import { checkScene } from './check';
import {
  blend,
  coveredActions,
  dragEach,
  dragFrame,
  dragTargets,
  pointOnPolyline,
  sceneFrame,
  stepMotionMs,
  type SceneDef,
} from './evaluate';
import { expandActions, expandLists, expandObjects } from './repeat';
import { SceneView } from './SceneView';

const req = createRequire(process.cwd() + '/apps/web/package.json');
const { renderToStaticMarkup } = req('react-dom/server') as typeof import('react-dom/server');

const makeTen: SceneDef = {
  stage: { width: 800, height: 450 },
  objects: [
    { id: 'left', type: 'counters', count: 9, at: [100, 120], layout: 'tenframe' },
    { id: 'right', type: 'counters', count: 4, at: [500, 150], color: 'orange' },
    { id: 'formula', type: 'text', text: '9 + 4 = ?', at: [400, 380] },
    { id: 'clock', type: 'clock', time: '3:00', at: [650, 300], hidden: true },
  ],
  steps: [
    [{ highlight: 'left' }],
    [
      { split: { target: 'right', take: 1, as: 'one' } },
      { move: { target: 'one', to: 'left', duration: '1s' } },
    ],
    [{ set: { target: 'formula', text: '10 + 3 = 13' } }, { highlight: 'formula' }],
    [{ show: 'clock' }, { set: { target: 'clock', time: '4:00', duration: 2, ease: 'linear' } }],
  ],
};

const obj = (def: SceneDef, i: number, t: number, id: string) =>
  sceneFrame(def, i, t).objects.find((o) => o.id === id);

describe('场景模板：动作时间轴', () => {
  it('时长写法：1s、500ms、秒数', () => {
    expect(parseDuration('1s')).toBe(1000);
    expect(parseDuration('500ms')).toBe(500);
    expect(parseDuration(0.8)).toBe(800);
    expect(parseDuration('1.5秒')).toBe(1500);
    expect(parseDuration('快')).toBeUndefined();
  });

  it('默认依次进行；together 时与上一个同时开始；delay 往后推', () => {
    const plan = planStep([
      { show: { target: 'a', duration: 1 } },
      { move: { target: 'a', by: [10, 0], duration: 2, together: true } },
      { hide: { target: 'a', duration: '500ms', delay: 0.5 } },
    ]);
    expect(plan.actions.map((a) => [a.start, a.dur])).toEqual([
      [0, 1000],
      [0, 2000],
      [2500, 500],
    ]);
    expect(plan.total).toBe(3000);
  });

  it('一步的动画段时长 = 最后一个动作结束的时间；没有动作为 0', () => {
    expect(stepMotionMs(makeTen, 1)).toBe(1500);
    expect(stepMotionMs({ ...makeTen, steps: [[]] }, 0)).toBe(0);
  });
});

describe('场景模板：画面 = Stage(场景, 第几步, 步内进度)', () => {
  it('高亮只在当前步有效', () => {
    expect(obj(makeTen, 0, 1, 'left')?.props.highlight).toBe(1);
    expect(obj(makeTen, 0, 0, 'left')?.props.highlight).toBe(0);
    expect(obj(makeTen, 2, 1, 'left')?.props.highlight).toBe(0);
  });

  it('拆分：从末尾拿出 1 个，原来的剩 3 个', () => {
    const right = obj(makeTen, 1, 0.2, 'right');
    const one = obj(makeTen, 1, 0.2, 'one');
    expect(right?.props.count).toBe(3);
    expect(one?.props.count).toBe(1);
  });

  it('移动到另一组计数块：飞到十格框的第 10 格，到达后合并成 10 个', () => {
    const left = obj(makeTen, 0, 1, 'left')!;
    const target = counterSlot(left.props, 9);
    // 移动进行到一半：还没合并，位置在途中
    const mid = sceneFrame(makeTen, 1, 0.6);
    const flying = mid.objects.find((o) => o.id === 'one')!;
    const [x] = (flying.props.items as [number, number][])[0];
    expect(x).toBeGreaterThan(target[0]);
    expect(mid.objects.find((o) => o.id === 'left')?.props.count).toBe(9);
    // 走完：合并
    const end = sceneFrame(makeTen, 1, 1);
    expect(end.objects.find((o) => o.id === 'one')).toBeUndefined();
    expect(end.objects.find((o) => o.id === 'left')?.props.count).toBe(10);
    expect(end.objects.find((o) => o.id === 'right')?.props.count).toBe(3);
  });

  it('前面各步的结果保留到后面的步', () => {
    expect(obj(makeTen, 2, 0, 'left')?.props.count).toBe(10);
    expect(obj(makeTen, 2, 1, 'formula')?.props.text).toBe('10 + 3 = 13');
    expect(obj(makeTen, 1, 1, 'formula')?.props.text).toBe('9 + 4 = ?');
  });

  it('连续变化：钟面时间按进度匀速走（3:00 → 4:00）', () => {
    // 第 4 步：先出现 0.5 秒，再走 2 秒，共 2.5 秒；t=0.6 → 1.5 秒处 → 走了一半
    expect(obj(makeTen, 3, 0, 'clock')?.props.time).toBe(180);
    expect(obj(makeTen, 3, 0.6, 'clock')?.props.time).toBeCloseTo(210);
    expect(obj(makeTen, 3, 1, 'clock')?.props.time).toBe(240);
  });

  it('不传进度时是这一步的完整画面；同样输入画面相同', () => {
    expect(sceneFrame(makeTen, 1)).toEqual(sceneFrame(makeTen, 1, 1));
  });

  it('隐藏的零件出现时透明度从 0 到 1', () => {
    expect(obj(makeTen, 2, 1, 'clock')?.props.opacity).toBe(0);
    expect(obj(makeTen, 3, 1, 'clock')?.props.opacity).toBe(1);
  });
});

describe('场景模板：配置检查', () => {
  const lesson = (objects: Record<string, unknown>[], doList: Record<string, unknown>[]) => ({
    params: {},
    objects,
    steps: [{ say: '看', do: doList }],
  });

  it('正确的配置没有问题', () => {
    expect(
      checkScene({
        params: {},
        objects: makeTen.objects,
        steps: makeTen.steps.map((d) => ({ say: '看', do: d as Record<string, unknown>[] })),
      }),
    ).toEqual([]);
  });

  it('零件类型、属性拼写、颜色写错时报错', () => {
    const issues = checkScene(
      lesson(
        [
          { id: 'a', type: 'counter', count: 3 },
          { id: 'b', type: 'counters', cout: 3, count: 1, color: '橙色' },
        ],
        [],
      ),
    );
    expect(issues.map((i) => i.message).join('\n')).toMatch(/没有这种零件：counter/);
    expect(issues.some((i) => i.path.join('.') === 'objects.1.cout')).toBe(true);
    expect(issues.some((i) => i.path.join('.') === 'objects.1.color')).toBe(true);
  });

  it('动作名、目标零件写错时报错；合并后的零件不能再用', () => {
    const objects = [
      { id: 'a', type: 'counters', count: 3 },
      { id: 'b', type: 'counters', count: 2 },
    ];
    const msgs = (d: Record<string, unknown>[]) =>
      checkScene(lesson(objects, d)).map((i) => i.message);
    expect(msgs([{ jump: 'a' }])[0]).toMatch(/动作名只能是/);
    expect(msgs([{ highlight: 'c' }])[0]).toMatch(/零件 c 不存在/);
    expect(msgs([{ merge: { target: 'b', into: 'a' } }, { show: 'b' }])[0]).toMatch(/已经被合并/);
    expect(
      msgs([{ split: { target: 'a', take: 1, as: 'x' } }, { move: { target: 'x', to: 'b' } }]),
    ).toEqual([]);
    expect(msgs([{ move: { target: 'a', to: [1, 2], speed: 3 } }])[0]).toMatch(/没有参数 speed/);
  });
});

describe('动手做：拖动', () => {
  // 第 2 步由孩子把拆出来的 1 个拖进十格框（标准做法：split + move）
  const def: SceneDef = {
    ...makeTen,
    tries: [undefined, { task: '拖', drag: { from: 'right', to: 'left', count: 1 } }],
  };

  it('拖动对应的拆分、移动算作孩子做掉的动作', () => {
    expect([...coveredActions(def.steps[1], def.tries?.[1])]).toEqual([0, 1]);
    expect(coveredActions(def.steps[2], def.tries?.[1]).size).toBe(0);
  });

  it('等孩子动手时停在这一步开头；拖对的放进目标的空位', () => {
    const f0 = dragFrame(def, 1, []);
    expect(f0.items).toHaveLength(4);
    expect(f0.from?.props.count).toBe(4);
    expect(f0.to[0]?.props.count).toBe(9);
    const f1 = dragFrame(def, 1, [2]);
    expect(f1.items.map((i) => i.index)).toEqual([0, 1, 3]);
    expect(f1.to[0]?.props.count).toBe(10);
    // 正在拖的那一个先拿掉
    expect(dragFrame(def, 1, [], 0).items.map((i) => i.index)).toEqual([1, 2, 3]);
    expect(stepMotionMs(def, 1, 'doing')).toBe(0);
  });

  it('做对后这一步不再放被孩子做掉的动作，结果和标准做法一样', () => {
    expect(stepMotionMs(def, 1, 'solved')).toBe(0);
    expect(stepMotionMs(def, 1)).toBeGreaterThan(0);
    const solved = sceneFrame(def, 1, 0, 'solved').objects.find((o) => o.id === 'left');
    expect(solved?.props.count).toBe(10);
    expect(obj(def, 1, 1, 'left')?.props.count).toBe(10);
  });

  it('配置检查：零件不存在、个数对不上、do 里没有标准做法时报错', () => {
    const steps = (tryIt: Record<string, unknown>, d = makeTen.steps[1]) => [
      { say: '看', do: makeTen.steps[0] as Record<string, unknown>[] },
      { say: '做', do: d as Record<string, unknown>[], try: tryIt as never },
    ];
    const msgs = (tryIt: Record<string, unknown>, d?: unknown[]) =>
      checkScene({ params: {}, objects: makeTen.objects, steps: steps(tryIt, d) }).map(
        (i) => i.message,
      );
    expect(msgs({ task: '拖', drag: { from: 'right', to: 'left', count: 1 } })).toEqual([]);
    expect(msgs({ task: '拖', drag: { from: 'nope', to: 'left', count: 1 } })[0]).toMatch(/不存在/);
    expect(msgs({ task: '拖', drag: { from: 'right', to: 'left', count: 2 } })[0]).toMatch(
      /标准做法移过去的是 1 个/,
    );
    expect(msgs({ task: '拖', drag: { from: 'right', to: 'left', count: 9 } })[0]).toMatch(
      /只有 4 个/,
    );
    expect(
      msgs({ task: '拖', drag: { from: 'right', to: 'left', count: 1 } }, [
        { highlight: 'left' },
      ])[0],
    ).toMatch(/do 里要有/);
  });
});

describe('一个一个分（deal）', () => {
  const def: SceneDef = {
    stage: { width: 800, height: 400 },
    objects: [
      { id: 'pool', type: 'counters', count: 7, layout: 'grid', cols: 7, at: [20, 20] },
      { id: 'a', type: 'counters', count: 0, layout: 'grid', cols: 2, capacity: 3, at: [20, 200] },
      { id: 'b', type: 'counters', count: 0, layout: 'grid', cols: 2, capacity: 3, at: [200, 200] },
      { id: 'c', type: 'counters', count: 0, layout: 'grid', cols: 2, capacity: 3, at: [380, 200] },
    ],
    steps: [
      [{ deal: { target: 'pool', into: ['a', 'b', 'c'] } }],
      [{ deal: { target: 'pool', into: ['a', 'b', 'c'], count: 4 } }],
    ],
  };
  const count = (i: number, t: number, id: string) => obj(def, i, t, id)?.props.count;

  it('不写 count 时分一轮：每组 1 个；默认时长是每个 0.45 秒', () => {
    expect(stepMotionMs(def, 0)).toBeCloseTo(1350, 0);
    expect([count(0, 1, 'a'), count(0, 1, 'b'), count(0, 1, 'c'), count(0, 1, 'pool')]).toEqual([
      1, 1, 1, 4,
    ]);
  });

  it('一个接一个：进度到 1/3 时只放进了第 1 组，正在飞的那一个单独画出来', () => {
    const f = sceneFrame(def, 0, 0.5).objects;
    const done = (id: string) => f.find((o) => o.id === id)?.props.count;
    expect([done('a'), done('b'), done('c')]).toEqual([1, 0, 0]);
    expect(f.some((o) => o.id === 'pool~deal')).toBe(true);
    // 刚分完时没有飞着的
    expect(sceneFrame(def, 0, 1).objects.some((o) => o.id === 'pool~deal')).toBe(false);
  });

  it('数量不是整份时最后一轮分不满（余数），依次轮流放', () => {
    expect([count(1, 1, 'a'), count(1, 1, 'b'), count(1, 1, 'c')]).toEqual([3, 2, 2]);
    // 第 1 步分了 3 个，剩 4 个，第 2 步 count: 4 正好分完
    expect(count(1, 1, 'pool')).toBe(0);
  });
});

describe('重复（repeat）', () => {
  it('零件按次数展开，{i} 从 1 开始，可以写算式', () => {
    const list = expandObjects(
      [
        { id: 'p' },
        { repeat: '{per}', id: 'sub{i}', text: '{total - 3 * i + 3} − 3 = {total - 3 * i}' },
      ],
      { per: 3, total: 9 },
    );
    expect(list.map((o) => o.id)).toEqual(['p', 'sub1', 'sub2', 'sub3']);
    expect(list[1].text).toBe('9 − 3 = 6');
    expect(list[3].text).toBe('3 − 3 = 0');
  });

  it('动作按次数展开，show: "sub{i + 1}" 能代入算式', () => {
    const acts = expandActions(
      [{ repeat: 2, do: [{ deal: { target: 'pool', into: ['a'] } }, { show: 'sub{i + 1}' }] }],
      {},
    );
    expect(acts).toEqual([
      { deal: { target: 'pool', into: ['a'] } },
      { show: 'sub2' },
      { deal: { target: 'pool', into: ['a'] } },
      { show: 'sub3' },
    ]);
  });

  it('次数为 0 或有上限，不会卡死', () => {
    expect(expandObjects([{ repeat: 0, id: 'x{i}' }], {})).toEqual([]);
    expect(expandObjects([{ repeat: 9999, id: 'x{i}' }], {}).length).toBeLessThanOrEqual(50);
  });

  it('零件内列表按参数展开：a = 3、b = 2 时 items 展开成 5 项，{i} 在每组内从 1 开始', () => {
    const list = expandObjects(
      [
        {
          id: 'fruits',
          type: 'item-set',
          items: [
            { repeat: '{a}', asset: 'apple', tags: { kind: 'apple' }, idx: '{i}' },
            { repeat: '{b}', asset: 'pear', tags: { kind: 'pear' }, idx: '{i}' },
          ],
        },
      ],
      { a: 3, b: 2 },
    );
    const items = list[0].items as Array<{
      asset: string;
      tags: { kind: string };
      idx: number;
      repeat?: unknown;
    }>;
    expect(items).toHaveLength(5);
    expect(items.map((it) => it.asset)).toEqual(['apple', 'apple', 'apple', 'pear', 'pear']);
    expect(items.map((it) => it.idx)).toEqual([1, 2, 3, 1, 2]);
    expect(items.every((it) => it.repeat === undefined)).toBe(true);

    const direct = expandLists(
      {
        items: [
          { repeat: '{a}', asset: 'apple', idx: '{i}' },
          { repeat: '{b}', asset: 'pear', idx: '{i}' },
        ],
      },
      { a: 3, b: 2 },
    );
    const directItems = direct.items as Array<{ idx: number }>;
    expect(directItems).toHaveLength(5);
    expect(directItems.map((it) => it.idx)).toEqual([1, 2, 3, 1, 2]);
  });

  it('次数为 0 的元素被去掉；整个列表为空时 check 报错', () => {
    const list = expandObjects(
      [
        {
          id: 'fruits',
          type: 'item-set',
          items: [
            { repeat: '{a}', asset: 'apple' },
            { repeat: '{b}', asset: 'pear' },
          ],
        },
      ],
      { a: 0, b: 2 },
    );
    const items = list[0].items as Array<{ asset: string }>;
    expect(items).toHaveLength(2);
    expect(items.map((it) => it.asset)).toEqual(['pear', 'pear']);

    const issues = checkScene({
      params: { a: 0, b: 0 },
      objects: [
        {
          id: 'fruits',
          type: 'counters',
          items: [
            { repeat: '{a}', asset: 'apple' },
            { repeat: '{b}', asset: 'pear' },
          ],
        },
      ],
      steps: [],
    });
    expect(issues.some((i) => i.path.includes('items') && i.message.includes('为空'))).toBe(true);
    expect(issues.some((i) => i.message.includes('当 a = 0、b = 0 时'))).toBe(true);
  });

  it('嵌套 repeat（元素里再写 repeat）时 check 报错“不能嵌套”', () => {
    const issues = checkScene({
      params: {},
      objects: [
        {
          id: 'fruits',
          type: 'counters',
          items: [
            {
              repeat: 3,
              sub: [{ repeat: 2, asset: 'apple' }],
            },
          ],
        },
      ],
      steps: [],
    });
    expect(issues.some((i) => i.message.includes('不能嵌套'))).toBe(true);
  });

  it('零件属性 values 通过 range 生成列表', () => {
    const list = expandObjects(
      [
        {
          id: 'bars',
          type: 'chart',
          kind: 'bar',
          values: '{range(2, 2 * n, 2)}',
        },
      ],
      { n: 4 },
    );
    expect(list[0].values).toEqual([2, 4, 6, 8]);
  });
});

describe('提问点（ask）', () => {
  const def: SceneDef = {
    stage: { width: 800, height: 400 },
    objects: [
      { id: 'fire', type: 'text', text: 'A', at: [10, 10], hidden: true },
      { id: 'th', type: 'text', value: -10, at: [10, 60] },
    ],
    steps: [
      [
        { show: { target: 'fire', duration: '1s' } },
        { ask: true },
        { count: { target: 'th', from: -10, to: 0, duration: '2s' } },
      ],
    ],
    tries: [{ task: '几度', choose: { answer: 0 } }],
  };

  it('等孩子答的时候只放 ask 之前的动作，答案（后面的动作）还没出现', () => {
    expect(planStep(def.steps[0]).askAt).toBe(1);
    const doing = sceneFrame(def, 0, 1, 'doing').objects;
    expect(doing.find((o) => o.id === 'fire')?.props.opacity).toBe(1);
    expect(doing.find((o) => o.id === 'th')?.props.value).toBe(-10);
    expect(stepMotionMs(def, 0, 'doing')).toBe(1000);
  });

  it('看一看时 ask 不起作用，整段连着放', () => {
    expect(stepMotionMs(def, 0)).toBe(3000);
    expect(obj(def, 0, 1, 'th')?.props.value).toBe(0);
  });
});

describe('颜色对应（refs）', () => {
  const def: SceneDef = {
    stage: { width: 800, height: 400 },
    objects: [
      { id: 'r1', type: 'counters', count: 4, color: 'blue', at: [0, 0] },
      { id: 'eq', type: 'text', text: '[4](@r1) × [3](red)', at: [400, 100] },
    ],
    steps: [[{ highlight: { target: 'r1', color: 'red' } }]],
  };

  it('文字里引用的零件，把它的颜色和高亮程度记进 props.refs', () => {
    const refs = obj(def, 0, 1, 'eq')?.props.refs as Record<
      string,
      { color: unknown; highlight: number }
    >;
    expect(refs.r1).toMatchObject({ color: 'blue', highlight: 1 });
    // 没高亮时为 0
    const before = sceneFrame(def, 0, 0).objects.find((o) => o.id === 'eq')?.props
      .refs as typeof refs;
    expect(before.r1.highlight).toBe(0);
  });

  it('color: "@id" 跟着另一个零件的颜色', () => {
    const d: SceneDef = {
      ...def,
      objects: [...def.objects, { id: 'x', type: 'text', text: 'x', color: '@r1', at: [0, 0] }],
    };
    expect(sceneFrame(d, 0, 1).objects.find((o) => o.id === 'x')?.props.color).toBe('blue');
  });
});

describe('动手做：多目标拖动', () => {
  const def: SceneDef = {
    stage: { width: 800, height: 400 },
    objects: [
      { id: 'pool', type: 'counters', count: 6, layout: 'grid', cols: 6, at: [20, 20] },
      { id: 'a', type: 'counters', count: 0, layout: 'grid', cols: 2, capacity: 2, at: [20, 200] },
      { id: 'b', type: 'counters', count: 0, layout: 'grid', cols: 2, capacity: 2, at: [200, 200] },
      { id: 'c', type: 'counters', count: 0, layout: 'grid', cols: 2, capacity: 2, at: [380, 200] },
    ],
    steps: [[{ deal: { target: 'pool', into: ['a', 'b', 'c'] } }]],
    tries: [{ task: '分', drag: { from: 'pool', to: ['a', 'b', 'c'], count: 3, each: 1 } }],
  };

  it('目标是列表，每个目标最多放 each 个', () => {
    expect(dragTargets(def.tries![0]!.drag!)).toEqual(['a', 'b', 'c']);
    expect(dragEach(def.tries![0]!.drag!)).toBe(1);
  });

  it('拖对的放进各自的目标', () => {
    const f = dragFrame(def, 0, [5, 4], undefined, ['a', 'b']);
    const n = (id: string) => f.objects.find((o) => o.id === id)?.props.count;
    expect([n('a'), n('b'), n('c'), n('pool')]).toEqual([1, 1, 0, 4]);
    expect(f.to.map((o) => o.id)).toEqual(['a', 'b', 'c']);
  });

  it('配置检查：deal 算作标准做法，个数对得上', () => {
    const issues = checkScene({
      params: {},
      objects: def.objects as Record<string, unknown>[],
      steps: [
        {
          say: '分',
          do: def.steps[0] as Record<string, unknown>[],
          try: def.tries![0] as never,
        },
      ],
    });
    expect(issues).toEqual([]);
  });
});

describe('SceneView subitems tap and handles turn', () => {
  const dummyAnim = {
    id: 'test-anim',
    title: 'Test Animation',
    templateId: 'scene',
    steps: [],
  } as unknown as Animation;
  const theme = getTheme('cute');

  const gridScene: SceneDef = {
    stage: { width: 800, height: 450 },
    objects: [{ id: 'my-grid', type: 'grid', rows: 2, cols: 3, cell: 30, at: [50, 50] }],
    steps: [[]],
  };

  const clockScene: SceneDef = {
    stage: { width: 800, height: 450 },
    objects: [{ id: 'my-clock', type: 'clock', radius: 100, time: '3:00', at: [200, 200] }],
    steps: [[]],
  };

  it('renders hit rects when tryIt.tap is present and no hit layer when absent', () => {
    // 3. SceneView 渲染：tryIt.tap 存在时有命中矩形，个数 = 可点子项数；没有 tap 时没有命中层
    // When tap is present with among: ['cell.*'], only 6 cells are clickable
    const htmlWithAmong = renderToStaticMarkup(
      createElement(SceneView, {
        def: gridScene,
        animation: dummyAnim,
        index: 0,
        theme,
        tryIt: { phase: 'doing', tap: { among: ['cell.*'] } },
      }),
    );
    const amongHits = (htmlWithAmong.match(/data-tap-sub/g) || []).length;
    expect(amongHits).toBe(6);

    // When tap is present without among, all 11 subitems (2 rows + 3 cols + 6 cells) are clickable
    const htmlAll = renderToStaticMarkup(
      createElement(SceneView, {
        def: gridScene,
        animation: dummyAnim,
        index: 0,
        theme,
        tryIt: { phase: 'doing', tap: true },
      }),
    );
    const allHits = (htmlAll.match(/data-tap-sub/g) || []).length;
    expect(allHits).toBe(11);

    // When tap is absent, no hit layer is rendered (count = 0)
    const htmlNoTap = renderToStaticMarkup(
      createElement(SceneView, {
        def: gridScene,
        animation: dummyAnim,
        index: 0,
        theme,
      }),
    );
    const noHits = (htmlNoTap.match(/data-tap-sub/g) || []).length;
    expect(noHits).toBe(0);
    expect(htmlNoTap).not.toContain('data-tap-sub');
  });

  it('renders hit rects for whole objects without subitems and supports wrong feedback', () => {
    const shapeScene: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [
        { id: 'c1', type: 'shape', shape: 'circle', size: 40, at: [100, 100] },
        { id: 'c2', type: 'shape', shape: 'circle', size: 40, at: [160, 100] },
      ],
      steps: [[]],
    };

    const html = renderToStaticMarkup(
      createElement(SceneView, {
        def: shapeScene,
        animation: dummyAnim,
        index: 0,
        theme,
        tryIt: {
          phase: 'doing',
          tap: { among: ['c1', 'c2'] },
          wrong: 'c1',
          tapped: ['c2'],
        },
      }),
    );
    expect(html).toContain('data-tap-part="c1"');
    expect(html).toContain('data-tap-part="c2"');
    expect(html).toContain('data-tap-wrong="true"');
  });

  it('renders turn handle when tryIt.turn is present', () => {
    const htmlWithTurn = renderToStaticMarkup(
      createElement(SceneView, {
        def: clockScene,
        animation: dummyAnim,
        index: 0,
        theme,
        tryIt: { phase: 'doing', turn: { target: 'my-clock', prop: 'time' }, turnValue: 180 },
      }),
    );
    expect(htmlWithTurn).toContain('role="slider"');
    expect(htmlWithTurn).toContain('data-handle-prop="time"');
    expect(htmlWithTurn).toContain('aria-valuenow="180"');

    const htmlNoTurn = renderToStaticMarkup(
      createElement(SceneView, {
        def: clockScene,
        animation: dummyAnim,
        index: 0,
        theme,
      }),
    );
    expect(htmlNoTurn).not.toContain('role="slider"');
  });
});

describe('顶层属性与数组插值（blend）', () => {
  it('[1, 2, 3] → [3, 4, 5]，t = 0.5 得 [2, 3, 4]', () => {
    expect(blend([1, 2, 3], [3, 4, 5], 0.5)).toEqual([2, 3, 4]);
  });

  it('坐标数组 [[0,0],[10,0]] → [[0,10],[10,10]]，t = 0.5 得 [[0,5],[10,5]]', () => {
    expect(
      blend(
        [
          [0, 0],
          [10, 0],
        ],
        [
          [0, 10],
          [10, 10],
        ],
        0.5,
      ),
    ).toEqual([
      [0, 5],
      [10, 5],
    ]);
  });

  it('二维数组 [[1,1],[2]] → [[3,3],[4]]，t = 0.5 得 [[2,2],[3]]', () => {
    expect(blend([[1, 1], [2]], [[3, 3], [4]], 0.5)).toEqual([[2, 2], [3]]);
  });

  it('长度不同 [1,2] → [1,2,3]：t = 0.4 得 from，t = 0.6 得 to', () => {
    expect(blend([1, 2], [1, 2, 3], 0.4)).toEqual([1, 2]);
    expect(blend([1, 2], [1, 2, 3], 0.6)).toEqual([1, 2, 3]);
  });

  it('对象 { a: 1 } → { a: 3 }：t = 0.4 得 from（不插值）', () => {
    expect(blend({ a: 1 }, { a: 3 }, 0.4)).toEqual({ a: 1 });
    expect(blend({ a: 1 }, { a: 3 }, 0.6)).toEqual({ a: 3 });
  });

  it('递归深度超过 3 层时按其他处理', () => {
    expect(blend([[[[1]]]], [[[[3]]]], 0.4)).toEqual([[[[1]]]]);
    expect(blend([[[[1]]]], [[[[3]]]], 0.6)).toEqual([[[[3]]]]);
  });

  it('回归：现有零件 set 数字属性仍正常（如 grid 的 filled: 6）', () => {
    const gridDef: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [{ id: 'g', type: 'grid', rows: 3, cols: 3, cell: 40, filled: 0, at: [100, 100] }],
      steps: [[{ set: { target: 'g', filled: 6, duration: 2, ease: 'linear' } }]],
    };
    expect(obj(gridDef, 0, 0, 'g')?.props.filled).toBe(0);
    expect(obj(gridDef, 0, 0.5, 'g')?.props.filled).toBeCloseTo(3);
    expect(obj(gridDef, 0, 1, 'g')?.props.filled).toBe(6);
  });

  it('零件 set 数组属性平滑变化（如 wire 的 points）', () => {
    const wireDef: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [{ id: 'w', type: 'wire', points: [[0, 0], [10, 0]], at: [0, 0] }],
      steps: [[{ set: { target: 'w', points: [[0, 10], [10, 10]], duration: 2, ease: 'linear' } }]],
    };
    expect(obj(wireDef, 0, 0, 'w')?.props.points).toEqual([[0, 0], [10, 0]]);
    expect(obj(wireDef, 0, 0.5, 'w')?.props.points).toEqual([[0, 5], [10, 5]]);
    expect(obj(wireDef, 0, 1, 'w')?.props.points).toEqual([[0, 10], [10, 10]]);
  });
});

describe('绕点旋转（E4）', () => {
  it('矩形 at: [100, 100] 绕 [0, 100] 转 180° 后 at = [−100, 100]、rotate = 180；t = 0.5 时在中间位置', () => {
    const rectDef: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [{ id: 'rect1', type: 'shape', shape: 'rect', width: 40, height: 40, at: [100, 100] }],
      steps: [
        [
          {
            rotate: {
              target: 'rect1',
              by: 180,
              around: [0, 100],
              duration: 1,
              ease: 'linear',
            },
          },
        ],
      ],
    };

    // t = 0: 初始位置
    const o0 = obj(rectDef, 0, 0, 'rect1');
    expect(o0?.props.at).toEqual([100, 100]);
    expect(o0?.props.rotate).toBe(0);

    // t = 0.5: 中间位置（顺时针转 90°，at 到达 [0, 200]，rotate 到达 90）
    const oHalf = obj(rectDef, 0, 0.5, 'rect1');
    expect(oHalf?.props.at).toEqual([0, 200]);
    expect(oHalf?.props.rotate).toBe(90);

    // t = 1: 转完 180°，at 到达 [-100, 100]，rotate 到达 180
    const o1 = obj(rectDef, 0, 1, 'rect1');
    expect(o1?.props.at).toEqual([-100, 100]);
    expect(o1?.props.rotate).toBe(180);
  });

  it('三角形绕自己的 v1 转 90° 后顶点坐标正确；t = 0.5 时在中间位置', () => {
    const triPartDef: PartDef = {
      type: 'test-triangle-poly',
      name: '多边形三角形',
      anchor: 'start',
      rotatesPoints: true,
      props: ['points'],
      bbox(p) {
        const pts = (p.points as Point[]) ?? [];
        const xs = pts.map((pt) => pt[0]);
        const ys = pts.map((pt) => pt[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      },
      subitems(p) {
        const pts = (p.points as Point[]) ?? [];
        return pts.map((pt, i) => ({
          name: `v${i + 1}`,
          box: { x: pt[0] - 12, y: pt[1] - 12, w: 24, h: 24 },
        }));
      },
      Render: () => null,
    };
    registerPart(triPartDef);

    try {
      const triDef: SceneDef = {
        stage: { width: 800, height: 450 },
        objects: [
          {
            id: 'tri1',
            type: 'test-triangle-poly',
            points: [
              [100, 100],
              [200, 100],
              [100, 200],
            ],
            at: [0, 0],
          },
        ],
        steps: [
          [
            {
              rotate: {
                target: 'tri1',
                by: 90,
                around: 'tri1.v1',
                duration: 1,
                ease: 'linear',
              },
            },
          ],
        ],
      };

      // t = 0: 初始坐标
      const p0 = obj(triDef, 0, 0, 'tri1')?.props.points as Point[];
      expect(p0).toEqual([
        [100, 100],
        [200, 100],
        [100, 200],
      ]);
      expect(obj(triDef, 0, 0, 'tri1')?.props.rotate).toBeUndefined();

      // t = 0.5: 转 45° 的中间位置，绕 [100, 100] 转 45°
      const pHalf = obj(triDef, 0, 0.5, 'tri1')?.props.points as Point[];
      // v1 在旋转中心，保持不变
      expect(pHalf[0]).toEqual([100, 100]);
      // v2 [200, 100] 绕 [100, 100] 转 45°: x = 100 + 100*cos(45°), y = 100 + 100*sin(45°)
      expect(pHalf[1][0]).toBeCloseTo(100 + 100 * Math.cos(Math.PI / 4), 4);
      expect(pHalf[1][1]).toBeCloseTo(100 + 100 * Math.sin(Math.PI / 4), 4);
      // v3 [100, 200] 绕 [100, 100] 转 45°: x = 100 - 100*sin(45°), y = 100 + 100*cos(45°)
      expect(pHalf[2][0]).toBeCloseTo(100 - 100 * Math.sin(Math.PI / 4), 4);
      expect(pHalf[2][1]).toBeCloseTo(100 + 100 * Math.cos(Math.PI / 4), 4);
      // rotatesPoints 零件不设置 props.rotate
      expect(obj(triDef, 0, 0.5, 'tri1')?.props.rotate).toBeUndefined();

      // t = 1: 转完 90°
      const p1 = obj(triDef, 0, 1, 'tri1')?.props.points as Point[];
      expect(p1).toEqual([
        [100, 100],
        [100, 200],
        [0, 100],
      ]);
      expect(obj(triDef, 0, 1, 'tri1')?.props.rotate).toBeUndefined();
    } finally {
      unregisterPart('test-triangle-poly');
    }
  });

  it('跨步累积旋转：多边形转完 90° 后的顶点坐标作为下一步的起点', () => {
    const triPartDef: PartDef = {
      type: 'test-poly-step',
      name: '测试多边形',
      anchor: 'start',
      rotatesPoints: true,
      props: ['points'],
      bbox: () => ({ x: 0, y: 0, w: 100, h: 100 }),
      subitems(p) {
        const pts = (p.points as Point[]) ?? [];
        return pts.map((pt, i) => ({
          name: `v${i + 1}`,
          box: { x: pt[0] - 12, y: pt[1] - 12, w: 24, h: 24 },
        }));
      },
      Render: () => null,
    };
    registerPart(triPartDef);

    try {
      const def: SceneDef = {
        stage: { width: 800, height: 450 },
        objects: [
          {
            id: 't',
            type: 'test-poly-step',
            points: [
              [0, 0],
              [10, 0],
            ],
          },
        ],
        steps: [
          [{ rotate: { target: 't', by: 90, around: [0, 0] } }],
          [{ rotate: { target: 't', by: 90, around: [0, 0] } }],
        ],
      };
      // 第 0 步后：[0, 0], [0, 10]
      expect(obj(def, 0, 1, 't')?.props.points).toEqual([
        [0, 0],
        [0, 10],
      ]);
      // 第 1 步后：[0, 0], [-10, 0]
      expect(obj(def, 1, 1, 't')?.props.points).toEqual([
        [0, 0],
        [-10, 0],
      ]);
    } finally {
      unregisterPart('test-poly-step');
    }
  });

  it('配置检查：around 参数校验', () => {
    // 正确写法
    const ok = checkScene({
      params: {},
      objects: [{ id: 'r', type: 'shape', shape: 'rect', at: [100, 100] }],
      steps: [
        { say: '转', do: [{ rotate: { target: 'r', by: 90, around: [0, 0] } }] },
        { say: '转', do: [{ rotate: { target: 'r', by: 90, around: 'r' } }] },
      ],
    });
    expect(ok).toHaveLength(0);

    // around 格式不对
    const badCoord = checkScene({
      params: {},
      objects: [{ id: 'r', type: 'shape', shape: 'rect', at: [100, 100] }],
      steps: [{ say: '转', do: [{ rotate: { target: 'r', by: 90, around: 123 } }] }],
    });
    expect(badCoord.some((e) => e.message.includes('around 写成坐标'))).toBe(true);

    // around 引用不存在的零件
    const badRef = checkScene({
      params: {},
      objects: [{ id: 'r', type: 'shape', shape: 'rect', at: [100, 100] }],
      steps: [{ say: '转', do: [{ rotate: { target: 'r', by: 90, around: 'missing.v1' } }] }],
    });
    expect(badRef.some((e) => e.message.includes('around 引用的零件 missing 不存在'))).toBe(true);
  });
});

describe('E7 子项引用（高亮、颜色）', () => {
  it('highlight: grid1.row.2 时帧里有一个子项高亮且 box 正确', () => {
    const def: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [{ id: 'grid1', type: 'grid', rows: 3, cols: 4, cell: 20, at: [100, 100] }],
      steps: [[{ highlight: 'grid1.row.2' }]],
    };
    const frame = sceneFrame(def, 0);
    expect(frame.subHighlights).toHaveLength(1);
    expect(frame.subHighlights[0].id).toBe('grid1');
    expect(frame.subHighlights[0].name).toBe('row.2');
    expect(frame.subHighlights[0].box).toEqual({ x: 100, y: 120, w: 80, h: 20 });
  });

  it('highlight: grid1.row.* 全部行', () => {
    const def: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [{ id: 'grid1', type: 'grid', rows: 3, cols: 4, cell: 20, at: [100, 100] }],
      steps: [[{ highlight: 'grid1.row.*' }]],
    };
    const frame = sceneFrame(def, 0);
    expect(frame.subHighlights).toHaveLength(3);
    expect(frame.subHighlights.map((s) => s.name)).toEqual(['row.1', 'row.2', 'row.3']);
    expect(frame.subHighlights[0].box).toEqual({ x: 100, y: 100, w: 80, h: 20 });
    expect(frame.subHighlights[1].box).toEqual({ x: 100, y: 120, w: 80, h: 20 });
    expect(frame.subHighlights[2].box).toEqual({ x: 100, y: 140, w: 80, h: 20 });
  });

  it('highlight: grid1.row.9（只有 3 行）check 报错', () => {
    const issues = checkScene({
      params: {},
      objects: [{ id: 'grid1', type: 'grid', rows: 3, cols: 4, cell: 20, at: [100, 100] }],
      steps: [{ say: '看', do: [{ highlight: 'grid1.row.9' }] }],
    });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.map((i) => i.message).join('\n')).toMatch(/零件 grid1 没有子项 row.9/);
  });

  it('keep: true 跨步保留', () => {
    const def: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [{ id: 'grid1', type: 'grid', rows: 3, cols: 4, cell: 20, at: [100, 100] }],
      steps: [
        [{ highlight: { target: 'grid1.row.2', keep: true } }],
        [{ wait: '1s' }],
      ],
    };
    const frame0 = sceneFrame(def, 0);
    expect(frame0.subHighlights).toHaveLength(1);
    expect(frame0.subHighlights[0].name).toBe('row.2');

    const frame1 = sceneFrame(def, 1);
    expect(frame1.subHighlights).toHaveLength(1);
    expect(frame1.subHighlights[0].name).toBe('row.2');

    // 不写 keep: true 时跨步消失
    const defNoKeep: SceneDef = {
      ...def,
      steps: [[{ highlight: 'grid1.row.2' }], [{ wait: '1s' }]],
    };
    expect(sceneFrame(defNoKeep, 1).subHighlights).toHaveLength(0);
  });

  it('unhighlight 取消子项高亮', () => {
    const def: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [{ id: 'grid1', type: 'grid', rows: 3, cols: 4, cell: 20, at: [100, 100] }],
      steps: [
        [{ highlight: { target: 'grid1.row.2', keep: true } }],
        [{ unhighlight: 'grid1.row.2' }],
      ],
    };
    expect(sceneFrame(def, 0).subHighlights).toHaveLength(1);
    expect(sceneFrame(def, 1).subHighlights).toHaveLength(0);
  });

  it('color 改变子项颜色并在帧的 subColors 及对象的 _subColors 中体现', () => {
    const def: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [{ id: 'grid1', type: 'grid', rows: 3, cols: 4, cell: 20, at: [100, 100] }],
      steps: [[{ color: { target: 'grid1.row.2', to: 'red' } }]],
    };
    const frame = sceneFrame(def, 0);
    expect(frame.subColors).toEqual([{ id: 'grid1', name: 'row.2', color: 'red' }]);
    const gridObj = frame.objects.find((o) => o.id === 'grid1');
    expect(gridObj?.props._subColors).toMatchObject({ 'row.2': 'red' });
  });

  it('choose.show 允许子项并在 checkScene 中校验', () => {
    const valid = checkScene({
      params: {},
      objects: [{ id: 'grid1', type: 'grid', rows: 3, cols: 4, cell: 20, at: [100, 100] }],
      steps: [
        {
          say: '做',
          do: [],
          try: { task: '做', choose: { answer: 1, show: ['grid1.row.2'] } },
        },
      ],
    });
    expect(valid).toEqual([]);

    const invalid = checkScene({
      params: {},
      objects: [{ id: 'grid1', type: 'grid', rows: 3, cols: 4, cell: 20, at: [100, 100] }],
      steps: [
        {
          say: '做',
          do: [],
          try: { task: '做', choose: { answer: 1, show: ['grid1.row.9'] } },
        },
      ],
    });
    expect(invalid.map((i) => i.message).join('\n')).toMatch(/零件 grid1 没有子项 row.9/);
  });

  it('SceneView 渲染子项高亮框以及 choose.show 子项提示框', () => {
    const dummyAnim = {
      id: 'test-anim',
      title: 'Test',
      templateId: 'scene',
      steps: [],
    } as unknown as Animation;
    const theme = getTheme('cute');

    const def: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [{ id: 'grid1', type: 'grid', rows: 3, cols: 4, cell: 20, at: [100, 100] }],
      steps: [[{ highlight: 'grid1.row.2' }]],
    };

    const html = renderToStaticMarkup(
      createElement(SceneView, {
        def,
        animation: dummyAnim,
        index: 0,
        theme,
      }),
    );
    expect(html).toContain('x="82"'); // 100 - padX(18) = 82
    expect(html).toContain('y="110"'); // 120 - padY(10) = 110

    const defTry: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [{ id: 'grid1', type: 'grid', rows: 3, cols: 4, cell: 20, at: [100, 100] }],
      steps: [[]],
      tries: [{ task: '选', choose: { answer: 1, show: ['grid1.row.1'] } }],
    };

    const htmlHint = renderToStaticMarkup(
      createElement(SceneView, {
        def: defTry,
        animation: dummyAnim,
        index: 0,
        theme,
        tryIt: { phase: 'doing', showTarget: true },
      }),
    );
    expect(htmlHint).toContain('x="82"');
    expect(htmlHint).toContain('y="90"'); // 100 - padY(10) = 90
  });
});


describe('翻折（flip）', () => {
  registerPart({
    type: 'triangle',
    name: '三角形',
    anchor: 'center',
    props: ['points', 'fill', 'color'],
    rotatesPoints: true,
    bbox(p) {
      const pts = (p.points as Point[]) ?? [];
      const xs = pts.map((q) => q[0]);
      const ys = pts.map((q) => q[1]);
      const minX = Math.min(...xs, 0);
      const maxX = Math.max(...xs, 0);
      const minY = Math.min(...ys, 0);
      const maxY = Math.max(...ys, 0);
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    },
    Render() {
      return null;
    },
  });

  it('默认时长来自 site.yaml 的 scene.actionSeconds.flip（0.8s）', () => {
    const plan = planStep([{ flip: { target: 't', axis: [[200, 0], [200, 450]] } }]);
    expect(plan.actions[0].dur).toBe(800);
  });

  it('三角形沿竖直轴 x = 200 翻折后顶点 x 坐标镜像；e = 0.5 时所有顶点到轴的距离为 0', () => {
    const triDef: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [
        {
          id: 'tri',
          type: 'triangle',
          points: [
            [100, 100],
            [150, 200],
            [100, 200],
          ],
        },
      ],
      steps: [
        [
          {
            flip: {
              target: 'tri',
              axis: [
                [200, 0],
                [200, 450],
              ],
              duration: 1,
              ease: 'linear',
            },
          },
        ],
      ],
    };

    // e = 0 时：初始位置
    expect(obj(triDef, 0, 0, 'tri')?.props.points).toEqual([
      [100, 100],
      [150, 200],
      [100, 200],
    ]);

    // e = 0.5 时：所有顶点到对称轴 x = 200 的距离为 0
    const midPoints = obj(triDef, 0, 0.5, 'tri')?.props.points as [number, number][];
    expect(midPoints).toBeDefined();
    expect(midPoints.length).toBe(3);
    for (const [x] of midPoints) {
      expect(Math.abs(x - 200)).toBeCloseTo(0);
    }

    // e = 1 时（翻折后）：顶点 x 坐标镜像（100 -> 300, 150 -> 250, 100 -> 300），y 保持不变
    expect(obj(triDef, 0, 1, 'tri')?.props.points).toEqual([
      [300, 100],
      [250, 200],
      [300, 200],
    ]);
  });

  it('矩形（非 points 零件）翻折后 mirrorAxis 被设置，并在后续步骤保持', () => {
    const axis: [[number, number], [number, number]] = [
      [200, 0],
      [200, 450],
    ];
    const rectDef: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [
        { id: 'rect1', type: 'shape', shape: 'rect', width: 100, height: 60, at: [100, 150] },
      ],
      steps: [
        [{ flip: { target: 'rect1', axis, duration: 1, ease: 'linear' } }],
        [{ wait: '1s' }],
      ],
    };

    // 翻折后：mirrorAxis 被设置
    const rectEnd = obj(rectDef, 0, 1, 'rect1');
    expect(rectEnd?.props.mirrorAxis).toEqual(axis);

    // 后续步骤：mirrorAxis 依然保留
    const rectNext = obj(rectDef, 1, 1, 'rect1');
    expect(rectNext?.props.mirrorAxis).toEqual(axis);
  });

  it('SceneView 渲染非 points 零件翻折时套用变换矩阵', () => {
    const axis: [[number, number], [number, number]] = [
      [200, 0],
      [200, 450],
    ];
    const rectDef: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [
        { id: 'r1', type: 'shape', shape: 'rect', width: 100, height: 60, at: [100, 150] },
      ],
      steps: [[{ flip: { target: 'r1', axis, duration: 1 } }]],
    };
    const anim = {
      id: 'test',
      title: 'test',
      summary: '',
      templateId: 'scene',
      theme: 'flat',
      duration: '1s',
      steps: [{ id: 's1', title: 'step1', desc: '', data: {} }],
    } as unknown as Animation;
    const html = renderToStaticMarkup(
      createElement(SceneView, {
        def: rectDef,
        animation: anim,
        index: 0,
        progress: 1,
        theme: getTheme('flat'),
      }),
    );
    expect(html).toContain('matrix(-1 0 0 1 400 0)');
  });

  it('配置检查：flip 参数与文字零件警告', () => {
    const lesson = (objects: Record<string, unknown>[], doList: Record<string, unknown>[]) => ({
      params: {},
      objects,
      steps: [{ say: '看', do: doList }],
    });

    // 正确的 flip 配置
    expect(
      checkScene(
        lesson(
          [{ id: 's1', type: 'shape' }],
          [{ flip: { target: 's1', axis: [[200, 0], [200, 450]] } }],
        ),
      ),
    ).toEqual([]);

    // 对 text 零件翻折报警告
    const textIssues = checkScene(
      lesson(
        [{ id: 'txt', type: 'text', text: '123' }],
        [{ flip: { target: 'txt', axis: [[200, 0], [200, 450]] } }],
      ),
    );
    expect(
      textIssues.some((i) => i.message.includes('文字零件') && i.message.includes('不要翻折文字')),
    ).toBe(true);

    // 对 label 零件翻折报警告
    const labelIssues = checkScene(
      lesson(
        [{ id: 'lbl', type: 'label', text: 'A' }],
        [{ flip: { target: 'lbl', axis: [[200, 0], [200, 450]] } }],
      ),
    );
    expect(
      labelIssues.some((i) => i.message.includes('文字零件') && i.message.includes('不要翻折文字')),
    ).toBe(true);

    // 轴坐标格式错误（两点重合）
    const badAxisIssues = checkScene(
      lesson(
        [{ id: 's1', type: 'shape' }],
        [{ flip: { target: 's1', axis: [[200, 0], [200, 0]] } }],
      ),
    );
    expect(badAxisIssues.some((i) => i.message.includes('axis'))).toBe(true);
  });

  it('斜向对称轴（y = x）翻折点坐标', () => {
    const diagDef: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [
        {
          id: 'tri',
          type: 'triangle',
          points: [
            [100, 50],
            [120, 80],
            [100, 80],
          ],
        },
      ],
      steps: [
        [
          {
            flip: {
              target: 'tri',
              axis: [
                [0, 0],
                [100, 100],
              ],
              duration: 1,
              ease: 'linear',
            },
          },
        ],
      ],
    };

    // e = 1 时：沿 y = x 翻折，(x, y) 变成 (y, x)
    const endPts = obj(diagDef, 0, 1, 'tri')?.props.points as [number, number][];
    expect(endPts[0][0]).toBeCloseTo(50);
    expect(endPts[0][1]).toBeCloseTo(100);
    expect(endPts[1][0]).toBeCloseTo(80);
    expect(endPts[1][1]).toBeCloseTo(120);

    // e = 0.5 时：所有点到 y = x 的距离为 0（即 x = y）
    const midPts = obj(diagDef, 0, 0.5, 'tri')?.props.points as [number, number][];
    for (const [x, y] of midPts) {
      expect(Math.abs(x - y)).toBeCloseTo(0);
    }
  });

  it('多目标翻折：同时翻折两个零件', () => {
    const axis: [[number, number], [number, number]] = [
      [200, 0],
      [200, 450],
    ];
    const multiDef: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [
        { id: 'r1', type: 'shape', shape: 'rect', width: 60, height: 40, at: [100, 100] },
        { id: 'r2', type: 'shape', shape: 'rect', width: 80, height: 50, at: [150, 200] },
      ],
      steps: [[{ flip: { target: ['r1', 'r2'], axis, duration: 1 } }]],
    };
    const r1 = obj(multiDef, 0, 1, 'r1');
    const r2 = obj(multiDef, 0, 1, 'r2');
    expect(r1?.props.mirrorAxis).toEqual(axis);
    expect(r2?.props.mirrorAxis).toEqual(axis);
  });
});


describe('沿路径移动（follow）', () => {
  const path100_300 = [
    [0, 0],
    [100, 0],
    [100, 300],
  ] as [number, number][];

  it('折线长度与默认时长计算正确（路径长 400，默认时长 2.4s）', () => {
    expect(polylineLength(path100_300)).toBe(400);
    // site.yaml 中 followPer100: 0.6，所以 400 像素对应 4 * 0.6s = 2.4s = 2400ms
    expect(defaultMs('follow', { path: path100_300 })).toBe(2400);
  });

  it('planStep 对 follow 默认 ease: linear，并采用路径计算出的默认时长', () => {
    const plan = planStep([{ follow: { target: 'kid', path: path100_300 } }]);
    expect(plan.actions[0].dur).toBe(2400);
    expect(plan.actions[0].linear).toBe(true);
  });

  it('planStep 支持覆盖 duration 与 ease', () => {
    const plan = planStep([
      { follow: { target: 'kid', path: path100_300, duration: '1s', ease: 'smooth' } },
    ]);
    expect(plan.actions[0].dur).toBe(1000);
    expect(plan.actions[0].linear).toBe(false);
  });

  it('两段折线（长 100 和 300）在 e = 0.25 时位于第一段终点', () => {
    expect(pointOnPolyline(path100_300, 0)).toEqual([0, 0]);
    expect(pointOnPolyline(path100_300, 0.25)).toEqual([100, 0]);
    expect(pointOnPolyline(path100_300, 0.625)).toEqual([100, 150]);
    expect(pointOnPolyline(path100_300, 1)).toEqual([100, 300]);
  });

  it('画面求值：e = 0.25 时位于第一段终点，且 draw 同步', () => {
    const def: SceneDef = {
      stage: { width: 800, height: 450 },
      objects: [
        { id: 'kid', type: 'image', at: [0, 0] },
        { id: 'route1', type: 'line', draw: 0, from: [0, 0], to: [100, 300] },
      ],
      steps: [
        [
          {
            follow: {
              target: 'kid',
              path: path100_300,
              draw: 'route1',
            },
          },
        ],
      ],
    };

    // t = 0 时，起点
    const frame0 = sceneFrame(def, 0, 0);
    expect(frame0.objects.find((o) => o.id === 'kid')?.props.at).toEqual([0, 0]);
    expect(frame0.objects.find((o) => o.id === 'route1')?.props.draw).toBe(0);

    // t = 0.25 时，位于第一段终点 [100, 0]，route1 的 draw 同步为 0.25
    const frameMid = sceneFrame(def, 0, 0.25);
    expect(frameMid.objects.find((o) => o.id === 'kid')?.props.at).toEqual([100, 0]);
    expect(frameMid.objects.find((o) => o.id === 'route1')?.props.draw).toBe(0.25);

    // t = 1 时，终点 [100, 300]，route1 的 draw 为 1
    const frameEnd = sceneFrame(def, 0, 1);
    expect(frameEnd.objects.find((o) => o.id === 'kid')?.props.at).toEqual([100, 300]);
    expect(frameEnd.objects.find((o) => o.id === 'route1')?.props.draw).toBe(1);
  });

  it('配置检查（checkScene）校验 follow 动作的 target、path 和 draw', () => {
    // 正常配置：无报错
    const okIssues = checkScene({
      params: {},
      objects: [
        { id: 'kid', type: 'image', asset: 'kid', at: [0, 0] },
        { id: 'route1', type: 'line', from: [0, 0], to: [100, 100] },
      ],
      steps: [
        {
          say: '走',
          do: [
            {
              follow: {
                target: 'kid',
                path: [
                  [0, 0],
                  [100, 100],
                ],
                draw: 'route1',
              },
            },
          ],
        },
      ],
    });
    expect(okIssues).toEqual([]);

    // 缺少 target
    const noTargetIssues = checkScene({
      params: {},
      objects: [{ id: 'kid', type: 'image', asset: 'kid', at: [0, 0] }],
      steps: [
        {
          say: '走',
          do: [
            {
              follow: {
                path: [
                  [0, 0],
                  [100, 100],
                ],
              },
            },
          ],
        },
      ],
    });
    expect(noTargetIssues.some((issue) => issue.message.includes('要写 target'))).toBe(true);

    // 零件不存在
    const badTargetIssues = checkScene({
      params: {},
      objects: [{ id: 'kid', type: 'image', asset: 'kid', at: [0, 0] }],
      steps: [
        {
          say: '走',
          do: [
            {
              follow: {
                target: 'ghost',
                path: [
                  [0, 0],
                  [100, 100],
                ],
              },
            },
          ],
        },
      ],
    });
    expect(badTargetIssues.some((issue) => issue.message.includes('ghost 不存在'))).toBe(true);

    // 路径点少于 2 个
    const badPathIssues = checkScene({
      params: {},
      objects: [{ id: 'kid', type: 'image', asset: 'kid', at: [0, 0] }],
      steps: [
        {
          say: '走',
          do: [
            {
              follow: {
                target: 'kid',
                path: [[0, 0]],
              },
            },
          ],
        },
      ],
    });
    expect(badPathIssues.some((issue) => issue.message.includes('至少两个点'))).toBe(true);

    // draw 零件不存在
    const badDrawIssues = checkScene({
      params: {},
      objects: [{ id: 'kid', type: 'image', asset: 'kid', at: [0, 0] }],
      steps: [
        {
          say: '走',
          do: [
            {
              follow: {
                target: 'kid',
                path: [
                  [0, 0],
                  [100, 100],
                ],
                draw: 'non-existent-route',
              },
            },
          ],
        },
      ],
    });
    expect(badDrawIssues.some((issue) => issue.message.includes('draw'))).toBe(true);
  });

  describe('配置检查（checkScene）校验 tap 动手方式', () => {
    const baseGrid = {
      id: 'grid1',
      type: 'grid',
      rows: 3,
      cols: 3,
      cell: 20,
      at: [100, 100],
    };

    it('合法的指定答案 tap 通过检查', () => {
      const issues = checkScene({
        params: {},
        objects: [baseGrid],
        steps: [
          {
            say: '点第 2 行',
            try: {
              task: '点出第 2 行',
              tap: {
                answer: 'grid1.row.2',
                among: ['grid1.row.*'],
              },
            },
          },
        ],
      });
      expect(issues).toHaveLength(0);
    });

    it('答案不在 among 范围内报错', () => {
      const issues = checkScene({
        params: {},
        objects: [baseGrid],
        steps: [
          {
            say: '点第 2 行',
            try: {
              task: '点出第 2 行',
              tap: {
                answer: 'grid1.row.2',
                among: ['grid1.col.*'],
              },
            },
          },
        ],
      });
      expect(issues.some((i) => i.message.includes('不在 among 允许的范围内'))).toBe(true);
    });

    it('引用的零件不存在报错', () => {
      const issues = checkScene({
        params: {},
        objects: [baseGrid],
        steps: [
          {
            say: '点不存在的零件',
            try: {
              task: '点点看',
              tap: {
                answer: 'nonexistent.row.1',
              },
            },
          },
        ],
      });
      expect(issues.some((i) => i.message.includes('nonexistent 在这一步开头不存在'))).toBe(true);
    });

    it('引用的子项不存在报错', () => {
      const issues = checkScene({
        params: {},
        objects: [baseGrid],
        steps: [
          {
            say: '点不存在的行',
            try: {
              task: '点第 9 行',
              tap: {
                answer: 'grid1.row.9',
              },
            },
          },
        ],
      });
      expect(issues.some((i) => i.message.includes('没有子项 row.9'))).toBe(true);
    });

    it('按条件点选：满足 valid 条件的子项数满足 pick 时通过', () => {
      const issues = checkScene({
        params: {},
        objects: [
          {
            id: 'chart',
            type: 'grid',
            rows: 4,
            cols: 1,
            cell: 20,
            at: [100, 100],
          },
        ],
        steps: [
          {
            say: '点 2 行',
            try: {
              task: '点 2 行',
              tap: {
                pick: 2,
                among: ['chart.row.*'],
                valid: '{1 == 1}',
              },
            },
          },
        ],
      });
      expect(issues).toHaveLength(0);
    });

    it('按条件点选：满足条件的子项数不足 pick 时报错', () => {
      const issues = checkScene({
        params: {},
        objects: [
          {
            id: 'chart',
            type: 'grid',
            rows: 2,
            cols: 1,
            cell: 20,
            at: [100, 100],
          },
        ],
        steps: [
          {
            say: '点 5 行',
            try: {
              task: '点 5 行',
              tap: {
                pick: 5,
                among: ['chart.row.*'],
                valid: '{1 == 1}',
              },
            },
          },
        ],
      });
      expect(issues.some((i) => i.message.includes('少于 pick 要求的 5 个'))).toBe(true);
    });
  });

  describe('动手做：转动把手（turn）配置检查与 coveredActions（任务卡 T2）', () => {
    it('正确配置的 turn 检查通过', () => {
      const issues = checkScene({
        params: {},
        objects: [{ id: 'clk', type: 'clock', time: '3:00', at: [400, 220] }],
        steps: [
          {
            say: '拨到 3:30',
            do: [{ set: { target: 'clk', time: '3:30' } }],
            try: {
              task: '把钟面拨到 3:30。',
              turn: {
                target: 'clk',
                prop: 'time',
                answer: '3:30',
                tolerance: 5,
                step: 5,
              },
            },
          },
        ],
      });
      expect(issues).toHaveLength(0);
    });

    it('校验目标零件存在', () => {
      const issues = checkScene({
        params: {},
        objects: [],
        steps: [
          {
            say: '拨钟',
            try: {
              task: '拨钟',
              turn: {
                target: 'ghost',
                prop: 'time',
                answer: '3:30',
              },
            },
          },
        ],
      });
      expect(issues.some((i) => i.message.includes('ghost 在这一步开头不存在'))).toBe(true);
    });

    it('校验零件支持 handles', () => {
      const issues = checkScene({
        params: {},
        objects: [{ id: 'txt', type: 'text', text: 'Hello', at: [0, 0] }],
        steps: [
          {
            say: '转文字',
            try: {
              task: '转文字',
              turn: {
                target: 'txt',
                prop: 'text',
                answer: 'World',
              },
            },
          },
        ],
      });
      expect(issues.some((i) => i.message.includes('未定义 handles'))).toBe(true);
    });

    it('校验把手包含该 prop', () => {
      const issues = checkScene({
        params: {},
        objects: [{ id: 'clk', type: 'clock', time: '3:00', at: [0, 0] }],
        steps: [
          {
            say: '拨钟',
            try: {
              task: '拨钟',
              turn: {
                target: 'clk',
                prop: 'unknownProp',
                answer: 10,
              },
            },
          },
        ],
      });
      expect(issues.some((i) => i.message.includes('不包含属性 unknownProp'))).toBe(true);
    });

    it('校验 answer 在属性范围 [min, max] 内', () => {
      const issues = checkScene({
        params: {},
        objects: [{ id: 'clk', type: 'clock', time: '3:00', at: [0, 0] }],
        steps: [
          {
            say: '拨钟',
            try: {
              task: '拨钟',
              turn: {
                target: 'clk',
                prop: 'time',
                answer: 800, // clock handles min: 0, max: 720
              },
            },
          },
        ],
      });
      expect(issues.some((i) => i.message.includes('超出属性 time 的取值范围'))).toBe(true);
    });

    it('coveredActions 覆盖对 turn.target 和 turn.prop 的 set 动作', () => {
      const spec = {
        task: '拨钟',
        turn: {
          target: 'clk',
          prop: 'time',
          answer: '3:30',
        },
      };
      const actions = [
        { highlight: 'clk' },
        { set: { target: 'clk', time: '3:30' } },
        { set: { target: 'other', time: '3:30' } },
      ];
      const covered = coveredActions(actions, spec);
      expect(covered.has(1)).toBe(true);
      expect(covered.has(0)).toBe(false);
      expect(covered.has(2)).toBe(false);
    });
  });
});
