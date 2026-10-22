import { describe, expect, it } from 'vitest';
import { flowTemplate } from './index';
import { borderPoint, collectEdges, isDecision, layoutNodes } from './layout';

describe('流程图流转模板', () => {
  it('示例：每一步都指向存在的节点', () => {
    const a = flowTemplate.createDefault();
    const ids = new Set(a.elements.map((e) => e.id));
    for (const s of a.steps) expect(ids.has(s.data.node as string)).toBe(true);
  });

  it('连线按相邻步骤生成，同一对节点只算一次，保留第一个非空标签', () => {
    const a = flowTemplate.createDefault();
    const edges = collectEdges(a);
    const [submit, review, back, hr, done] = a.elements.map((e) => e.id);
    expect(edges.map((e) => [e.from, e.to])).toEqual([
      [submit, review],
      [review, back],
      [back, submit],
      [review, hr],
      [hr, done],
    ]);
    expect(edges.find((e) => e.to === back)?.label).toBe('不同意');
    expect(edges.find((e) => e.to === hr)?.label).toBe('同意');
  });

  it('问号结尾的节点是判断节点', () => {
    expect(isDecision('主管审批？')).toBe(true);
    expect(isDecision('ok?')).toBe(true);
    expect(isDecision('完成')).toBe(false);
  });

  it('布局：每个节点位置不重叠', () => {
    const a = flowTemplate.createDefault();
    const { nodes } = layoutNodes(a);
    const spots = new Set(nodes.map((n) => `${n.cx},${n.cy}`));
    expect(spots.size).toBe(nodes.length);
  });

  it('连线端点落在节点边框上', () => {
    const { nodes } = layoutNodes(flowTemplate.createDefault());
    const n = nodes[0];
    const p = borderPoint(n, n.cx + 1000, n.cy);
    expect(p.y).toBeCloseTo(n.cy);
    expect(p.x).toBeGreaterThan(n.cx);
  });

  it('新增一步默认走向下一个节点', () => {
    const a = flowTemplate.createBlank();
    expect(flowTemplate.newStep(a, a.steps[0]).data?.node).toBe(a.elements[1].id);
  });
});
