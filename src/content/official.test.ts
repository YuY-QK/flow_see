import { describe, expect, it } from 'vitest';
import { getTemplate } from '@/templates/registry';
import { CATEGORIES, findOfficial, officialItems } from './official';

describe('官方内容', () => {
  const items = officialItems();

  it('每个分类都有内容，id 唯一且稳定', () => {
    for (const c of CATEGORIES) expect(items.some((i) => i.category === c)).toBe(true);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(officialItems()).toBe(items);
    expect(findOfficial('official-tcp-handshake')?.animation.title).toBe('TCP 三次握手');
  });

  it('每个作品都使用已注册的模板，且步骤引用的元素都存在', () => {
    for (const { animation: a } of items) {
      expect(getTemplate(a.templateId), a.title).toBeDefined();
      expect(a.steps.length, a.title).toBeGreaterThan(0);
      const ids = new Set(a.elements.map((e) => e.id));
      for (const s of a.steps) {
        for (const key of ['from', 'to', 'node', 'stage']) {
          if (key in s.data) expect(ids.has(s.data[key] as string), `${a.title} ${key}`).toBe(true);
        }
        expect(s.title, a.title).not.toBe('');
      }
    }
  });

  it('至少有一个精选', () => {
    expect(items.some((i) => i.featured)).toBe(true);
  });
});
