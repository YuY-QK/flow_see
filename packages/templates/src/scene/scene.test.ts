import { createRequire } from 'node:module';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { counterSlot } from '@flow-see/blocks';
import { getTheme, type Animation } from '@flow-see/core';
import { parseDuration, planStep } from './actions';
import { checkScene } from './check';
import {
  coveredActions,
  dragEach,
  dragFrame,
  dragTargets,
  sceneFrame,
  stepMotionMs,
  type SceneDef,
} from './evaluate';
import { expandActions, expandObjects } from './repeat';
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
