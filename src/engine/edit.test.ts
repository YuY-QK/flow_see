import { describe, expect, it } from 'vitest';
import {
  createAnimation,
  createElement,
  createStep,
  duplicateAnimation,
  migrate,
} from './animation';
import { addStep, moveStep, removeElement, removeStep, updateStep } from './edit';

function sample() {
  const a = createElement('A');
  const b = createElement('B');
  return createAnimation({
    templateId: 'message',
    title: '示例',
    elements: [a, b],
    steps: [
      createStep({ id: 's1', title: '一', data: { from: a.id, to: b.id } }),
      createStep({ id: 's2', title: '二', data: { from: b.id, to: a.id } }),
      createStep({ id: 's3', title: '三' }),
    ],
  });
}

describe('作品编辑', () => {
  it('在指定步骤后插入新步骤', () => {
    const a = addStep(sample(), { title: '新' }, 's1');
    expect(a.steps.map((s) => s.title)).toEqual(['一', '新', '二', '三']);
  });

  it('不指定位置时加到最后', () => {
    expect(addStep(sample()).steps).toHaveLength(4);
  });

  it('更新步骤时合并模板数据', () => {
    const a = updateStep(sample(), 's1', { title: '改', data: { label: 'SYN' } });
    expect(a.steps[0].title).toBe('改');
    expect(a.steps[0].data).toMatchObject({ label: 'SYN' });
    expect(a.steps[0].data.from).toBeDefined();
  });

  it('删除与移动步骤', () => {
    expect(removeStep(sample(), 's2').steps.map((s) => s.id)).toEqual(['s1', 's3']);
    expect(moveStep(sample(), 0, 2).steps.map((s) => s.id)).toEqual(['s2', 's3', 's1']);
  });

  it('越界的移动不做任何事', () => {
    const a = sample();
    expect(moveStep(a, 0, 9)).toBe(a);
  });

  it('删除元素时清空步骤里对它的引用', () => {
    const a = sample();
    const removed = removeElement(a, a.elements[0].id);
    expect(removed.elements).toHaveLength(1);
    expect(removed.steps[0].data.from).toBeUndefined();
    expect(removed.steps[0].data.to).toBe(a.elements[1].id);
  });

  it('不修改原对象', () => {
    const a = sample();
    const before = JSON.stringify(a);
    addStep(a);
    updateStep(a, 's1', { title: 'x' });
    removeElement(a, a.elements[0].id);
    expect(JSON.stringify(a)).toBe(before);
  });
});

describe('复制与数据迁移', () => {
  it('复制得到新 id，内容相同', () => {
    const a = sample();
    const b = duplicateAnimation(a);
    expect(b.id).not.toBe(a.id);
    expect(b.steps).toEqual(a.steps);
    expect(b.title).toContain('副本');
  });

  it('复制出的作品不带分享信息', () => {
    const a = { ...sample(), share: { id: 'abc', token: 't', sharedAt: 1 } };
    expect(duplicateAnimation(a).share).toBeUndefined();
  });

  it('补齐缺失字段', () => {
    const m = migrate({
      id: 'x',
      templateId: 'message',
      steps: [{ id: 's', title: 't', desc: '' }],
    });
    expect(m).toMatchObject({ title: '未命名动画', themeId: 'flat', elements: [] });
    expect(m?.steps[0].data).toEqual({});
    expect(m?.settings.autoNarrate).toBe(true);
  });

  it('拒绝无法识别或来自未来版本的数据', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate({ title: 'x' })).toBeNull();
    expect(migrate({ id: 'x', templateId: 'm', schemaVersion: 999 })).toBeNull();
  });
});
