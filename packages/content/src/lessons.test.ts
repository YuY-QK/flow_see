import { describe, expect, it } from 'vitest';
import { getTemplate, TEMPLATE_IDS } from '@flow-see/templates';
import { sceneFrame, sceneOf } from '@flow-see/templates/scene/index.ts';
import { clampParams, exploreCombos, type ExploreControl } from '@flow-see/core';
import { lessonToAnimation } from './animation';
import { buildIndex, lessonNeighbors, type ContentIndex } from './catalog';
import { CONTENT_ROOT } from './json-schema';
import { loadContent } from './load';

// 读一遍内容要检查所有知识点的每种参数组合，比较慢：整个文件只读一次
let loaded: ReturnType<typeof loadContent> | undefined;
const load = () =>
  (loaded ??= loadContent(CONTENT_ROOT, {
    templateIds: TEMPLATE_IDS,
    checkLesson: (l) => getTemplate(l.template)?.checkConfig?.(l) ?? [],
  }));

describe('真实的知识点配置', () => {
  it('全部通过检查（含场景模板的零件和动作）', () => {
    expect(load().issues.filter((i) => i.level === 'error')).toEqual([]);
  });

  it('凑十法 9 + 6：只用配置做出来，最后一步是 10 + 5，拆分算式图全部画出、得数 15', () => {
    const lf = load().bundle!.lessons.find((l) => l.lesson.id === 'make-ten')!;
    expect(lf.lesson).toMatchObject({ template: 'scene', status: 'published' });
    const anim = lessonToAnimation({ ...lf.lesson, subject: lf.subject, grade: lf.grade });
    const last = anim.steps.length - 1;
    const frame = sceneFrame(sceneOf(anim), last);
    const byId = Object.fromEntries(frame.objects.map((o) => [o.id, o.props]));
    expect(byId.left.count).toBe(10);
    expect(byId.right.count).toBe(5);
    // 原题不变，竖式全部显示出来
    expect(byId.calc).toMatchObject({ a: 9, b: 6, parts: [1, 5], show: 4 });
    expect((byId.calc.second as { value: number }).value).toBe(15);
    // 借来的 1 个保留橙色，孩子能看出是从 4 里拿的
    expect((byId.left.colors as string[]).at(-1)).toBe('orange');
    // 每一步都有动画段（连续时间模型）
    const tpl = getTemplate('scene')!;
    for (let i = 0; i < anim.steps.length; i++) expect(tpl.motionMs!(anim, i)).toBeGreaterThan(0);
  });
});

describe('凑十法：动手试一试，换示例', () => {
  const lf = () => load().bundle!.lessons.find((l) => l.lesson.id === 'make-ten')!;
  const lesson = () => ({ ...lf().lesson, subject: lf().subject, grade: lf().grade });
  /** 最后一步的画面 */
  const finalFrame = (params?: Record<string, unknown>) => {
    const anim = lessonToAnimation(lesson(), { params });
    const byId = Object.fromEntries(
      sceneFrame(sceneOf(anim), anim.steps.length - 1).objects.map((o) => [o.id, o.props]),
    );
    return { anim, byId };
  };

  it('8 + 6：拆出 2 个，凑成 10，剩 4，得 14；讲解也跟着变', () => {
    const { anim, byId } = finalFrame({ a: 8, b: 6 });
    expect(byId.left.count).toBe(10);
    expect(byId.right.count).toBe(4);
    expect(byId.calc).toMatchObject({ a: 8, b: 6, parts: [2, 4] });
    expect(anim.steps[2].desc).toBe('把 6 拆成 2 和 4，先拿出 2 个。');
    expect(anim.steps[3].desc).toBe('把这 2 个放进十格框，8 和 2 凑成 10。');
  });

  it('点选的每个例子、滑块的每种组合都讲得通：凑成 10，剩下的数加上去等于得数', () => {
    const l = lesson();
    const controls = l.explore as ExploreControl[];
    const all = exploreCombos(controls, l.params, l.derived);
    expect(all.length).toBeGreaterThan(20);
    for (const p of all) {
      const a = p.a as number;
      const b = p.b as number;
      const { byId } = finalFrame(p);
      expect(byId.left.count, `${a}+${b}`).toBe(10);
      expect(byId.right.count, `${a}+${b}`).toBe(a + b - 10);
      expect(byId.calc, `${a}+${b}`).toMatchObject({ a, b, parts: [10 - a, a + b - 10], show: 4 });
      expect((byId.calc.second as { value: number }).value).toBe(a + b);
    }
    for (const pr of l.presets!)
      expect(clampParams(controls, { ...l.params, ...pr.params }, l.derived)).toMatchObject(
        pr.params,
      );
  });

  it('取值超出范围时自动收回：大数改成 6 后，小数至少是 5', () => {
    const l = lesson();
    expect(clampParams(l.explore as ExploreControl[], { a: 6, b: 4 }, l.derived)).toMatchObject({
      a: 6,
      b: 5,
    });
  });

  it('标准讲解（不传参数）是 9 + 6', () => {
    expect(finalFrame().byId.calc).toMatchObject({ a: 9, b: 6 });
  });
});

describe('认识分数：fraction 模板，只用配置', () => {
  const lf = load().bundle!.lessons.find((l) => l.lesson.id === 'fraction-intro')!;
  const lesson = () => ({ ...lf.lesson, subject: lf.subject, grade: lf.grade });
  const last = (params?: Record<string, unknown>) => {
    const anim = lessonToAnimation(lesson(), { params });
    const tpl = getTemplate('fraction')!;
    expect(tpl.motionMs!(anim, anim.steps.length - 1)).toBeGreaterThan(0);
    return anim;
  };

  it('已发布，讲解代入参数（规格 P3 验收：拖到 6 份时字幕变为“平均分成 6 份”）', () => {
    expect(lesson()).toMatchObject({ template: 'fraction', status: 'published' });
    expect(last({ parts: 6, take: 5 }).steps[1].desc).toBe('把它平均分成 6 份，每一份都一样大。');
  });

  it('“分成几份”从 6 调到 3 时，“取几份”是 5 会自动变为 2（最多比份数少 1）', () => {
    const l = lesson();
    expect(
      clampParams(l.explore as ExploreControl[], { shape: 'circle', parts: 3, take: 5 }, l.derived),
    ).toMatchObject({ parts: 3, take: 2 });
  });

  it('滑块和按钮的每一种组合都能生成画面', () => {
    const l = lesson();
    const combos = exploreCombos(l.explore as ExploreControl[], l.params, l.derived);
    expect(combos.length).toBeGreaterThan(100);
    for (const p of combos) expect(last(p).steps).toHaveLength(4);
  });
});

describe('认识钟表：clock 模板，只用配置', () => {
  const lf = load().bundle!.lessons.find((l) => l.lesson.id === 'clock-basics')!;
  const lesson = { ...lf.lesson, subject: lf.subject, grade: lf.grade };

  it('已发布；每个整点都能讲：走 1 小时后读出下一个整点（12 时之后是 1 时）', () => {
    expect(lesson).toMatchObject({ template: 'clock', status: 'published' });
    const tpl = getTemplate('clock')!;
    for (let hour = 1; hour <= 12; hour++) {
      const anim = lessonToAnimation(lesson, { params: { hour } });
      const next = (hour % 12) + 1;
      expect(anim.steps[5].desc).toContain(`时针指着 ${next}，现在是 ${next} 时`);
      const frame = tpl.motionMs!(anim, 4);
      expect(frame).toBeGreaterThan(0);
      // 半点、几时几分：再走半小时读“N 时半”，再走 15 分钟读“N 时 45 分”
      const next2 = (next % 12) + 1;
      expect(anim.steps[7].desc).toBe(
        `分针指着 6，时针在 ${next} 和 ${next2} 中间，是 ${next} 时半。`,
      );
      expect(anim.steps[9].desc).toBe(`分针指着 9，是 45 分，现在是 ${next} 时 45 分。`);
      expect(tpl.motionMs!(anim, 6)).toBeLessThan(tpl.motionMs!(anim, 4));
    }
  });
});

describe('知识点 → 动画', () => {
  it('讲解和零件里的 {参数} 代入参数；动手试一试的参数覆盖标准取值', () => {
    const anim = lessonToAnimation(
      {
        id: 'x',
        title: 'x',
        summary: 'x',
        status: 'draft',
        tags: [],
        recommended: false,
        template: 'scene',
        params: { n: 4 },
        objects: [{ id: 'a', type: 'counters', count: '{n}' }],
        steps: [{ say: '一共 {n} 个', do: [{ highlight: 'a' }] }],
        keyPoints: ['a', 'b'],
        subject: 'math',
        grade: 1,
      },
      { params: { n: 6 } },
    );
    expect(anim.steps[0].desc).toBe('一共 6 个');
    expect((anim.config!.objects as { count: number }[])[0].count).toBe(6);
  });
});

describe('上一个 / 下一个（规格 3.5）', () => {
  const lesson = (id: string) => ({
    id,
    title: id,
    summary: '',
    tags: [],
    recommended: false,
    status: 'published' as const,
    template: 'scene',
    steps: [{}],
  });
  const index: ContentIndex = buildIndex(
    {
      ...load().bundle!,
      curricula: [
        {
          data: {
            subject: 'math',
            grade: 1,
            units: [
              { id: 'u1', title: '一', lessons: ['a', { id: 'soon', title: '即将上线' }, 'b'] },
              { id: 'u2', title: '二', lessons: ['c'] },
            ],
          },
        },
        { data: { subject: 'math', grade: 2, units: [{ id: 'u3', title: '三', lessons: ['d'] }] } },
      ],
      lessons: ['a', 'b', 'c', 'd'].map((id) => ({ lesson: lesson(id) })),
    },
    false,
  );
  const ids = (id: string, crossGrade = false) => {
    const n = lessonNeighbors(index, id, { crossGrade, crossSubject: false });
    return [n.prev?.lesson.id, n.next?.lesson.id];
  };

  it('跨单元、跳过即将上线', () => {
    expect(ids('a')).toEqual([undefined, 'b']);
    expect(ids('b')).toEqual(['a', 'c']);
  });

  it('默认不跨年级；配置允许时跨', () => {
    expect(ids('c')).toEqual(['b', undefined]);
    expect(ids('c', true)).toEqual(['b', 'd']);
  });
});
