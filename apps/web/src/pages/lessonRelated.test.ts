import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { RelatedLessons } from './LessonPage';

describe('RelatedLessons 相关知识点组件渲染（任务卡 D3）', () => {
  it('列表为空时不渲染任何 DOM', () => {
    const html = renderToStaticMarkup(
      React.createElement(RelatedLessons, { related: [] }),
    );
    expect(html).toBe('');
  });

  it('列表有内容时渲染“相关：”标签与各链接，链接之间用“ · ”分隔', () => {
    const items = [
      { id: 'make-ten', title: '凑十法', grade: 1, subject: 'math', available: true },
      { id: 'commute-add', title: '交换加数的位置', grade: 1, subject: 'math', available: true },
      { id: 'clock', title: '认识钟表（二年级）', grade: 2, subject: 'math', available: true },
    ];
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(RelatedLessons, { related: items }),
      ),
    );

    // 应该包含“相关”标签
    expect(html).toContain('相关');
    // 应该包含每个知识点的标题
    expect(html).toContain('凑十法');
    expect(html).toContain('交换加数的位置');
    expect(html).toContain('认识钟表（二年级）');
    // 应该生成正确的路由链接
    expect(html).toContain('href="/learn/1/math/make-ten"');
    expect(html).toContain('href="/learn/1/math/commute-add"');
    expect(html).toContain('href="/learn/2/math/clock"');
    // 链接之间包含分隔符“ · ”
    expect(html).toContain(' · ');
  });
});
