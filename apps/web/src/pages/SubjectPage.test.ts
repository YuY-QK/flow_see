import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { defaultTerm, SubjectPage } from './SubjectPage';

vi.mock('@flow-see/content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@flow-see/content')>();
  return {
    ...actual,
    findEntry: (content: unknown, grade: number, subject: string) => {
      if (grade === 2 && subject === 'math') {
        return {
          grade: 2,
          subject: 'math',
          units: [
            {
              id: 'unit-term1',
              title: 'Unit 1 Add Sub',
              term: 1 as const,
              domain: 'number',
              lessons: [
                {
                  id: 'lesson-1',
                  title: 'Addition Meaning',
                  available: true,
                  meta: {
                    id: 'lesson-1',
                    title: 'Addition Meaning',
                    summary: 'Intro to addition',
                    status: 'published',
                    template: 'scene',
                    steps: 3,
                    hands: true,
                    tags: ['addition'],
                    recommended: false,
                  },
                },
              ],
            },
            {
              id: 'unit-term2',
              title: 'Unit 2 Geometry Shapes',
              term: 2 as const,
              domain: 'geometry',
              lessons: [
                {
                  id: 'lesson-2',
                  title: 'Angles',
                  available: true,
                  meta: {
                    id: 'lesson-2',
                    title: 'Angles',
                    summary: 'Intro to angles',
                    status: 'published',
                    template: 'scene',
                    steps: 4,
                    hands: true,
                    tags: ['geometry'],
                    recommended: false,
                  },
                },
              ],
            },
          ],
        };
      }
      if (grade === 2 && subject === 'science') {
        return {
          grade: 2,
          subject: 'science',
          units: [
            {
              id: 'unit-sci-1',
              title: 'Plant Life',
              lessons: [
                {
                  id: 'lesson-sci-1',
                  title: 'Seed Sprouting',
                  available: true,
                  meta: {
                    id: 'lesson-sci-1',
                    title: 'Seed Sprouting',
                    summary: 'Seed sprouting process',
                    status: 'published',
                    template: 'scene',
                    steps: 3,
                    hands: false,
                    tags: ['plants'],
                    recommended: false,
                  },
                },
              ],
            },
          ],
        };
      }
      return actual.findEntry(content as Parameters<typeof actual.findEntry>[0], grade, subject);
    },
  };
});

function renderPage(url: string) {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [url] },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: '/learn/:grade/:subject',
          element: createElement(SubjectPage),
        }),
      ),
    ),
  );
}

describe('SubjectPage term switching and domain tags', () => {
  describe('defaultTerm pure function', () => {
    it('9, 12, 1 month -> term 1 (upper)', () => {
      expect(defaultTerm(9)).toBe(1);
      expect(defaultTerm(12)).toBe(1);
      expect(defaultTerm(1)).toBe(1);
    });

    it('2, 8 month -> term 2 (lower)', () => {
      expect(defaultTerm(2)).toBe(2);
      expect(defaultTerm(8)).toBe(2);
    });

    it('other boundary months and custom termRule', () => {
      expect(defaultTerm(10)).toBe(1);
      expect(defaultTerm(11)).toBe(1);
      expect(defaultTerm(3)).toBe(2);
      expect(defaultTerm(7)).toBe(2);

      // Custom rule: spring semester first (3 to 8 is 1, 9 to 2 is 2)
      expect(defaultTerm(3, { firstFromMonth: 3, secondFromMonth: 9 })).toBe(1);
      expect(defaultTerm(8, { firstFromMonth: 3, secondFromMonth: 9 })).toBe(1);
      expect(defaultTerm(9, { firstFromMonth: 3, secondFromMonth: 9 })).toBe(2);
      expect(defaultTerm(1, { firstFromMonth: 3, secondFromMonth: 9 })).toBe(2);
    });
  });

  describe('Component rendering', () => {
    it('displays switcher when both terms are present', () => {
      const html = renderPage('/learn/2/math');
      // Segmented button tablist exists
      expect(html).toContain('role="tablist"');
      expect(html).toContain('aria-selected="true"');
      // Domain tag exists for term 1 (number domain)
      expect(html).toContain('Unit 1 Add Sub');
    });

    it('renders only term 2 units when ?term=2', () => {
      const html = renderPage('/learn/2/math?term=2');
      // Term 2 unit is rendered
      expect(html).toContain('Unit 2 Geometry Shapes');
      // Term 1 unit is NOT rendered
      expect(html).not.toContain('Unit 1 Add Sub');
      // Domain tag for geometry is rendered
      expect(html).toContain('domainTag');
    });

    it('does not display switcher or domain tag on science page', () => {
      const html = renderPage('/learn/2/science');
      // No tablist switcher
      expect(html).not.toContain('role="tablist"');
      // No domain tag
      expect(html).not.toContain('domainTag');
      // Science unit is rendered
      expect(html).toContain('Plant Life');
    });
  });
});
