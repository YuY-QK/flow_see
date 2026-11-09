import { describe, expect, it } from 'vitest';
import { lessonToAnimation } from './animation';
import type { LessonConfig } from './schema';

const baseLesson: LessonConfig = {
  id: 'test-repeat',
  title: '测试重复与条件',
  summary: '测试用',
  status: 'draft',
  template: 'scene',
  tags: [],
  recommended: false,
  params: { a: 345, b: 12 },
  steps: [
    {
      repeat: '{len(a)}',
      title: '第 {i} 位',
      say: '{digit(a, i - 1)} 加 {digit(b, i - 1)}',
      do: [{ set: { target: 'calc', show: '{i}' } }],
      try: {
        task: '请做第 {i} 位',
        choose: { answer: '{i}', options: [1, 2, 3] },
      },
    },
  ],
  keyPoints: ['要点一', '要点二'],
};

interface TestTry {
  task?: string;
  choose?: { answer?: unknown; options?: unknown[] };
}

describe('E1: 步骤按次数复制', () => {
  it('a = 345 时复制 3 步，每步 {i} 为 1、2、3，标题“第 1 位”…；a = 12 时 2 步', () => {
    const anim345 = lessonToAnimation(baseLesson, { params: { a: 345 } });
    expect(anim345.steps.length).toBe(3);
    expect(anim345.steps[0].title).toBe('第 1 位');
    expect(anim345.steps[1].title).toBe('第 2 位');
    expect(anim345.steps[2].title).toBe('第 3 位');
    expect(anim345.steps[0].desc).toBe('5 加 2');
    expect(anim345.steps[1].desc).toBe('4 加 1');
    expect(anim345.steps[2].desc).toBe('3 加 0');
    expect(anim345.steps[0].data.do).toEqual([{ set: { target: 'calc', show: 1 } }]);

    const anim12 = lessonToAnimation(baseLesson, { params: { a: 12 } });
    expect(anim12.steps.length).toBe(2);
    expect(anim12.steps[0].title).toBe('第 1 位');
    expect(anim12.steps[1].title).toBe('第 2 位');
    expect(anim12.steps[0].desc).toBe('2 加 2');
    expect(anim12.steps[1].desc).toBe('1 加 1');
  });

  it('不写 repeat 的步骤不受影响；repeat: 0 的步骤消失', () => {
    const lesson: LessonConfig = {
      ...baseLesson,
      steps: [
        { title: '普通步骤', say: '第一步' },
        { repeat: 0, title: '不应出现', say: '跳过' },
        { repeat: '{0}', title: '算式0也不应出现', say: '跳过' },
        { title: '最后一步', say: '结束' },
      ],
    };
    const anim = lessonToAnimation(lesson);
    expect(anim.steps.length).toBe(2);
    expect(anim.steps[0].title).toBe('普通步骤');
    expect(anim.steps[0].desc).toBe('第一步');
    expect(anim.steps[1].title).toBe('最后一步');
    expect(anim.steps[1].desc).toBe('结束');
  });

  it('步骤里的 try 也被正确代入 {i}', () => {
    const anim = lessonToAnimation(baseLesson, { params: { a: 345 } });
    const try0 = anim.steps[0].data.try as TestTry | undefined;
    const try1 = anim.steps[1].data.try as TestTry | undefined;
    const try2 = anim.steps[2].data.try as TestTry | undefined;
    expect(try0?.task).toBe('请做第 1 位');
    expect(try0?.choose?.answer).toBe(1);
    expect(try1?.task).toBe('请做第 2 位');
    expect(try1?.choose?.answer).toBe(2);
    expect(try2?.task).toBe('请做第 3 位');
    expect(try2?.choose?.answer).toBe(3);
  });
});

describe('E2: 步骤条件 when', () => {
  it('when: \'{carry > 0}\' 在 carry = 0 / 1 时步数不同', () => {
    const lesson: LessonConfig = {
      ...baseLesson,
      params: { carry: 0 },
      steps: [
        { title: '计算', say: '算一算' },
        { when: '{carry > 0}', title: '进位', say: '有进位' },
      ],
    };
    const anim0 = lessonToAnimation(lesson, { params: { carry: 0 } });
    expect(anim0.steps.length).toBe(1);
    expect(anim0.steps[0].title).toBe('计算');

    const anim1 = lessonToAnimation(lesson, { params: { carry: 1 } });
    expect(anim1.steps.length).toBe(2);
    expect(anim1.steps[0].title).toBe('计算');
    expect(anim1.steps[1].title).toBe('进位');
  });

  it('repeat + when: \'{digit(a, i - 1) > 0}\' 只保留非零位', () => {
    const lesson: LessonConfig = {
      ...baseLesson,
      params: { a: 305 },
      steps: [
        {
          repeat: '{len(a)}',
          when: '{digit(a, i - 1) > 0}',
          title: '第 {i} 位',
          say: '{digit(a, i - 1)}',
        },
      ],
    };
    // 305 的第 1 位是个位 5 (>0 保留)，第 2 位是十位 0 (=0 过滤)，第 3 位是百位 3 (>0 保留)
    const anim = lessonToAnimation(lesson, { params: { a: 305 } });
    expect(anim.steps.length).toBe(2);
    expect(anim.steps[0].title).toBe('第 1 位');
    expect(anim.steps[0].desc).toBe('5');
    expect(anim.steps[1].title).toBe('第 3 位');
    expect(anim.steps[1].desc).toBe('3');
  });
});
