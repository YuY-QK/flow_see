import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { displayText } from '../../packages/blocks/src';
import { lessonToAnimation } from '../../packages/content/src';
import { lessonSchema } from '../../packages/content/src/schema';
import { objectBox, sceneFrame, sceneOf } from '../../packages/templates/src/scene';
import { generateReportHtml, type WalkSummary } from './report';
import {
  checkBoundingBoxes,
  checkEarlyAnswer,
  checkTextOverlaps,
  checkTopLeftArea,
  type FrameObjectInfo,
} from './walk';

describe('walk check rules', () => {
  const stage = { width: 800, height: 450 };

  describe('checkBoundingBoxes', () => {
    it('passes when all parts are within stage boundaries (allowing -4px margin)', () => {
      const objs: FrameObjectInfo[] = [
        { id: 'p1', type: 'text', box: { x: 0, y: 0, w: 100, h: 50 } },
        { id: 'p2', type: 'shape', box: { x: -4, y: -4, w: 100, h: 50 } },
        { id: 'p3', type: 'counters', box: { x: 700, y: 390, w: 104, h: 64 } },
      ];
      expect(checkBoundingBoxes(objs, stage, 1)).toEqual([]);
    });

    it('reports problem when a part exceeds stage boundaries', () => {
      const objs: FrameObjectInfo[] = [
        { id: 'out_left', type: 'text', box: { x: -10, y: 50, w: 40, h: 40 } },
        { id: 'out_right', type: 'label', box: { x: 780, y: 50, w: 50, h: 40 } },
        { id: 'out_bottom', type: 'shape', box: { x: 100, y: 430, w: 50, h: 30 } },
      ];
      const problems = checkBoundingBoxes(objs, stage, 2);
      expect(problems).toHaveLength(3);
      expect(problems[0].message).toContain('out_left');
      expect(problems[0].message).toContain('exceeds stage boundaries');
      expect(problems[1].message).toContain('out_right');
      expect(problems[2].message).toContain('out_bottom');
    });
  });

  describe('checkTextOverlaps', () => {
    it('passes when text parts do not overlap or overlap <= 10%', () => {
      const objs: FrameObjectInfo[] = [
        { id: 't1', type: 'text', box: { x: 100, y: 100, w: 100, h: 50 } },
        { id: 't2', type: 'text', box: { x: 220, y: 100, w: 100, h: 50 } },
        // 5% overlap with t2 (x: 315 to 320, width 5px out of 100px)
        { id: 't3', type: 'label', box: { x: 315, y: 100, w: 100, h: 50 } },
      ];
      expect(checkTextOverlaps(objs, 1)).toEqual([]);
    });

    it('reports problem when two text parts overlap > 10% of the smaller area', () => {
      const objs: FrameObjectInfo[] = [
        { id: 't1', type: 'text', box: { x: 100, y: 100, w: 100, h: 100 } }, // area 10000
        { id: 't2', type: 'label', box: { x: 150, y: 100, w: 100, h: 100 } }, // overlap: 50x100 = 5000 (50%)
      ];
      const problems = checkTextOverlaps(objs, 1);
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('overlap by 50.0%');
      expect(problems[0].message).toContain('t1');
      expect(problems[0].message).toContain('t2');
    });

    it('ignores non-text parts even if they overlap', () => {
      const objs: FrameObjectInfo[] = [
        { id: 's1', type: 'shape', box: { x: 100, y: 100, w: 100, h: 100 } },
        { id: 's2', type: 'counters', box: { x: 120, y: 120, w: 100, h: 100 } },
      ];
      expect(checkTextOverlaps(objs, 1)).toEqual([]);
    });
  });

  describe('checkTopLeftArea', () => {
    it('passes when text parts do not intersect [0, 0, 140, 40]', () => {
      const objs: FrameObjectInfo[] = [
        { id: 't1', type: 'text', box: { x: 150, y: 10, w: 100, h: 30 } },
        { id: 't2', type: 'label', box: { x: 50, y: 50, w: 80, h: 30 } },
      ];
      expect(checkTopLeftArea(objs, 1)).toEqual([]);
    });

    it('reports problem when text part intersects [0, 0, 140, 40]', () => {
      const objs: FrameObjectInfo[] = [
        { id: 'meta_conflict', type: 'text', box: { x: 50, y: 10, w: 80, h: 25 } },
      ];
      const problems = checkTopLeftArea(objs, 3);
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('meta_conflict');
      expect(problems[0].message).toContain('[0, 0, 140, 40]');
    });
  });

  describe('checkEarlyAnswer', () => {
    it('passes when answer does not appear before ask', () => {
      const texts = ['还空着几格？', '数一数'];
      const trySpec = { choose: { answer: 5 } };
      expect(checkEarlyAnswer(texts, trySpec, 1)).toEqual([]);
    });

    it('matches independent numbers correctly (avoids matching 13 to 3 or 50 to 5)', () => {
      const texts = ['这里有 15 个', '总共 50 个'];
      const trySpec = { choose: { answer: 5 } };
      expect(checkEarlyAnswer(texts, trySpec, 1)).toEqual([]);
    });

    it('detects early number answer', () => {
      const texts = ['答案是 5 个', '请选择'];
      const trySpec = { choose: { answer: 5 } };
      const problems = checkEarlyAnswer(texts, trySpec, 1);
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('answer "5" before the question is asked');
    });

    it('detects early string answer', () => {
      const texts = ['这是一个锐角三角形'];
      const trySpec = { choose: { answer: '锐角' } };
      const problems = checkEarlyAnswer(texts, trySpec, 2);
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('answer "锐角" before the question is asked');
    });
  });
});

describe('draft lesson with intentional problems', () => {
  it('detects text placed outside stage and answer exposed early before ask', () => {
    const draftYaml = `
id: draft-test
title: 临时测试知识点
summary: 测试脚本检测问题能力
status: draft
duration: 1分钟
template: scene
stage: { width: 800, height: 450 }
params: {}
objects:
  - id: bad_pos_text
    type: text
    text: 舞台外文字
    at: [950, 200]
  - id: prompt_text
    type: text
    text: 这里有 7 个苹果
    at: [300, 200]
steps:
  - title: 第一步提问
    say: 几？
    do:
      - show: prompt_text
      - ask: true
    try:
      task: 选出数字
      choose:
        answer: 7
        options: [5, 6, 7]
keyPoints:
  - 要点一
  - 要点二
`;

    const raw = parseYaml(draftYaml);
    const parsed = lessonSchema.parse(raw);
    const anim = lessonToAnimation(parsed);
    const def = sceneOf(anim);

    // 1. Check frame bounding box on step 1
    const frame = sceneFrame(def, 0, 1);
    const objs: FrameObjectInfo[] = [];
    for (const o of frame.objects) {
      const b = objectBox(o);
      if (b) {
        objs.push({ id: o.id, type: o.type, box: b, text: displayText(o.props) });
      }
    }

    const boxProblems = checkBoundingBoxes(objs, parsed.stage!, 1);
    expect(boxProblems.some((p) => p.message.includes('bad_pos_text'))).toBe(true);

    // 2. Check early answer exposure before ask
    const doingFrame = sceneFrame(def, 0, 1, 'doing');
    const texts: string[] = [];
    for (const o of doingFrame.objects) {
      const b = objectBox(o);
      if (b && (o.type === 'text' || o.type === 'label')) {
        texts.push(displayText(o.props));
      }
    }

    const earlyProblems = checkEarlyAnswer(texts, parsed.steps[0].try!, 1);
    expect(earlyProblems.some((p) => p.message.includes('answer "7" before the question is asked'))).toBe(true);
  });
});

describe('generateReportHtml', () => {
  it('generates HTML report with passes, problems, and stats', () => {
    const summary: WalkSummary = {
      total: 2,
      passed: 1,
      failed: 1,
      durationMs: 12500,
      results: [
        {
          id: 'make-ten',
          title: '凑十法',
          grade: 1,
          subject: 'math',
          status: 'published',
          thumbnails: [
            {
              viewport: '1280px',
              first: 'screenshots/make-ten/1280_step_1.png',
              mid: 'screenshots/make-ten/1280_step_3.png',
              last: 'screenshots/make-ten/1280_step_6.png',
            },
          ],
          problems: [],
          durationMs: 5000,
        },
        {
          id: 'draft-bad',
          title: '问题知识点',
          grade: 2,
          subject: 'math',
          status: 'draft',
          thumbnails: [],
          problems: [
            {
              step: 1,
              message: 'Part "bad_text" exceeds stage boundaries',
              screenshot: 'screenshots/draft-bad/1280_step_1.png',
            },
          ],
          durationMs: 7500,
        },
      ],
    };

    const html = generateReportHtml(summary);
    expect(html).toContain('知识点自动走查报告');
    expect(html).toContain('凑十法');
    expect(html).toContain('make-ten');
    expect(html).toContain('✓ 通过');
    expect(html).toContain('✗ 1 个问题');
    expect(html).toContain('bad_text');
    expect(html).toContain('screenshots/draft-bad/1280_step_1.png');
  });
});
