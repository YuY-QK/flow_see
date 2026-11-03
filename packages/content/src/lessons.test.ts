import { describe, expect, it } from 'vitest';
import { getTemplate, TEMPLATE_IDS } from '@flow-see/templates';
import { sceneFrame, sceneOf } from '@flow-see/templates/scene/index.ts';
import { lessonToAnimation } from './animation';
import { buildIndex, lessonNeighbors, type ContentIndex } from './catalog';
import { CONTENT_ROOT } from './json-schema';
import { loadContent } from './load';

const load = () =>
  loadContent(CONTENT_ROOT, {
    templateIds: TEMPLATE_IDS,
    checkLesson: (l) => getTemplate(l.template)?.checkConfig?.(l) ?? [],
  });

describe('真实的知识点配置', () => {
  it('全部通过检查（含场景模板的零件和动作）', () => {
    expect(load().issues.filter((i) => i.level === 'error')).toEqual([]);
  });

  it('凑十法 9 + 4：只用配置做出来，最后一步画面是 10 + 3 → 13', () => {
    const lf = load().bundle!.lessons.find((l) => l.lesson.id === 'make-ten')!;
    expect(lf.lesson).toMatchObject({ template: 'scene', status: 'published' });
    const anim = lessonToAnimation({ ...lf.lesson, subject: lf.subject, grade: lf.grade });
    const last = anim.steps.length - 1;
    const frame = sceneFrame(sceneOf(anim), last);
    const byId = Object.fromEntries(frame.objects.map((o) => [o.id, o.props]));
    expect(byId.left.count).toBe(10);
    expect(byId.right.count).toBe(3);
    expect(byId.formula.text).toBe('9 + 4 = 13');
    // 借来的 1 个保留橙色，孩子能看出是从 4 里拿的
    expect((byId.left.colors as string[]).at(-1)).toBe('orange');
    // 每一步都有动画段（连续时间模型）
    const tpl = getTemplate('scene')!;
    for (let i = 0; i < anim.steps.length; i++) expect(tpl.motionMs!(anim, i)).toBeGreaterThan(0);
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
