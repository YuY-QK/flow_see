import { describe, expect, it } from 'vitest';
import { counterSlot } from '@flow-see/blocks';
import { parseDuration, planStep } from './actions';
import { checkScene } from './check';
import { sceneFrame, stepMotionMs, type SceneDef } from './evaluate';

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
