import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createNewLesson } from './new';

const ROOT = resolve(import.meta.dirname, '..', '..');

describe('lesson:new scaffold', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'lesson-new-test-'));
    cpSync(join(ROOT, 'packages', 'content'), join(tempDir, 'packages', 'content'), {
      recursive: true,
    });
    if (existsSync(join(ROOT, 'docs'))) {
      cpSync(join(ROOT, 'docs'), join(tempDir, 'docs'), { recursive: true });
    }
  });

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('scaffolds a new lesson file and updates curriculum', () => {
    const result = createNewLesson({
      root: tempDir,
      grade: 1,
      id: 'compare-within-10',
    });

    expect(result.lessonFile).toBe('packages/content/lessons/math/g1/compare-within-10.yaml');
    expect(result.curriculumFile).toBe('packages/content/curriculum/math/grade1.yaml');
    expect(result.title).toBeTruthy();
    expect(result.scriptHint).toContain('compare-within-10');

    const generatedPath = join(tempDir, result.lessonFile);
    expect(existsSync(generatedPath)).toBe(true);

    const content = readFileSync(generatedPath, 'utf8');
    const lines = content.split('\n');

    expect(lines[0]).toBe('# yaml-language-server: $schema=../../../schemas/lesson.schema.json');
    expect(content).toContain('id: compare-within-10');
    expect(content).toContain(`title: ${result.title}`);
    expect(content).toContain("summary: ''");
    expect(content).toContain('status: draft');
    expect(content).toContain('tags: []');
    expect(content).toContain("cover: { text: '' }");
    expect(content).toContain('related: []');
    expect(content).toContain('template: scene');
    expect(content).toContain('stage: { width: 800, height: 450 }');
    expect(content).toContain('params: {}');
    expect(content).toContain('objects: []');
    expect(content).toContain('steps: []');
    expect(content).toContain('keyPoints: []');

    const fields = [
      'id:',
      'title:',
      'summary:',
      'status:',
      'duration:',
      'tags:',
      'cover:',
      'related:',
      'template:',
      'stage:',
      'params:',
      'objects:',
      'steps:',
      'keyPoints:',
    ];
    for (const f of fields) {
      const idx = lines.findIndex((l) => l.startsWith(f));
      expect(idx).toBeGreaterThan(0);
      expect(lines[idx - 1].trim().startsWith('#')).toBe(true);
    }

    const curriculumPath = join(tempDir, result.curriculumFile);
    const curriculumContent = readFileSync(curriculumPath, 'utf8');
    const curriculumLines = curriculumContent.split('\n');

    expect(curriculumLines.some((l) => l === '      - compare-within-10')).toBe(true);
    expect(curriculumLines.some((l) => l.includes('{ id: compare-within-10,'))).toBe(false);
  });

  it('fails on duplicate execution when lesson is already created', () => {
    createNewLesson({
      root: tempDir,
      grade: 1,
      id: 'compare-within-10',
    });

    expect(() => {
      createNewLesson({
        root: tempDir,
        grade: 1,
        id: 'compare-within-10',
      });
    }).toThrow();
  });

  it('fails when lesson is not in curriculum', () => {
    expect(() => {
      createNewLesson({
        root: tempDir,
        grade: 1,
        id: 'non-existent-lesson-id',
      });
    }).toThrow(/First add this lesson to curriculum/);
  });

  it('fails when lesson is already a pure id in curriculum', () => {
    expect(() => {
      createNewLesson({
        root: tempDir,
        grade: 1,
        id: 'make-ten',
      });
    }).toThrow(/already registered as an existing lesson/);
  });

  it('supports CLI invocation via process', () => {
    const scriptPath = join(ROOT, 'scripts', 'lessons', 'new.ts');
    const output = execSync(`npx tsx ${scriptPath} 1 compare-within-10 --root ${tempDir}`, {
      encoding: 'utf8',
    });

    expect(output).toContain('Created packages/content/lessons/math/g1/compare-within-10.yaml');
    expect(output).toContain('Updated packages/content/curriculum/math/grade1.yaml');
    expect(output).toContain('Next steps:');
    expect(output).toContain('pnpm content:check');
    expect(output).toContain('pnpm check:lessons --lesson compare-within-10');

    const generatedPath = join(
      tempDir,
      'packages',
      'content',
      'lessons',
      'math',
      'g1',
      'compare-within-10.yaml',
    );
    expect(existsSync(generatedPath)).toBe(true);
  });
});
