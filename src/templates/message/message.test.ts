import { describe, expect, it } from 'vitest';
import { messageTemplate } from './index';
import { getTemplate, TEMPLATE_CARDS } from '../registry';

describe('消息传递模板', () => {
  it('示例内容：两个角色、三步，每步都指向存在的角色', () => {
    const a = messageTemplate.createDefault();
    const ids = new Set(a.elements.map((e) => e.id));
    expect(a.elements).toHaveLength(2);
    expect(a.steps).toHaveLength(3);
    for (const s of a.steps) {
      expect(ids.has(s.data.from as string)).toBe(true);
      expect(ids.has(s.data.to as string)).toBe(true);
    }
  });

  it('空白作品：两个角色、一个空步骤', () => {
    const a = messageTemplate.createBlank();
    expect(a.elements).toHaveLength(2);
    expect(a.steps).toHaveLength(1);
    expect(a.steps[0].data).toMatchObject({ from: a.elements[0].id, to: a.elements[1].id });
  });

  it('每次新建都是独立的作品', () => {
    expect(messageTemplate.createDefault().id).not.toBe(messageTemplate.createDefault().id);
  });

  it('新增一步默认“回话”', () => {
    const a = messageTemplate.createDefault();
    const last = a.steps[a.steps.length - 1];
    const next = messageTemplate.newStep(a, last);
    expect(next.data).toMatchObject({ from: last.data.to, to: last.data.from });
  });

  it('没有上一步时从第一个角色发给第二个', () => {
    const a = messageTemplate.createDefault();
    expect(messageTemplate.newStep(a).data).toMatchObject({
      from: a.elements[0].id,
      to: a.elements[1].id,
    });
  });
});

describe('模板注册表', () => {
  it('能按 id 找到已实现的模板，卡片的可用状态与注册表一致', () => {
    expect(getTemplate('message')).toBe(messageTemplate);
    expect(getTemplate('nope')).toBeUndefined();
    expect(TEMPLATE_CARDS.filter((c) => c.available).map((c) => c.id)).toEqual(['message']);
  });
});
