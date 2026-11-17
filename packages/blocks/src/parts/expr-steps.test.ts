import { describe, expect, it } from 'vitest';
import {
  exprStepsLayout,
  exprStepsPart,
  tokenizeExpr,
} from './expr-steps';

describe('expr-steps 零件', () => {
  it('正确 tokenize 算式并支持中文和各种运算符', () => {
    const tokens = tokenizeExpr('36 + (48 − 12) × 2');
    expect(tokens.map((t) => t.value)).toEqual([
      '36',
      '+',
      '(',
      '48',
      '−',
      '12',
      ')',
      '×',
      '2',
    ]);
  });

  it('验收测试 1: 36 + (48 − 12) × 2 自动生成各行', () => {
    const layout = exprStepsLayout({
      expr: '36 + (48 − 12) × 2',
      show: 4,
    });

    expect(layout.lines.length).toBe(4);
    expect(layout.lines[0].text).toBe('36 + (48 − 12) × 2');
    expect(layout.lines[1].text).toBe('= 36 + 36 × 2');
    expect(layout.lines[2].text).toBe('= 36 + 72');
    expect(layout.lines[3].text).toBe('= 108');
  });

  it('验收测试 2: [(5 + 3) × 4 − 2] ÷ 3 的各行生成与 underline', () => {
    const layout = exprStepsLayout({
      expr: '[(5 + 3) × 4 − 2] ÷ 3',
      show: 5,
    });

    expect(layout.lines.length).toBe(5);
    expect(layout.lines[0].text).toBe('[(5 + 3) × 4 − 2] ÷ 3');
    expect(layout.lines[1].text).toBe('= [8 × 4 − 2] ÷ 3');
    expect(layout.lines[2].text).toBe('= [32 − 2] ÷ 3');
    expect(layout.lines[3].text).toBe('= 30 ÷ 3');
    expect(layout.lines[4].text).toBe('= 10');

    // 下划线逐步覆盖
    expect(layout.lines[0].underline).toBeDefined();
    expect(layout.lines[1].underline).toBeDefined();
    expect(layout.lines[2].underline).toBeDefined();
    expect(layout.lines[3].underline).toBeDefined();
    expect(layout.lines[4].underline).toBeUndefined();
  });

  it('验收测试 3: lines 手写模式自动加等号', () => {
    const layout = exprStepsLayout({
      lines: ['102 × 35', '(100 + 2) × 35', '100 × 35 + 2 × 35', '3500 + 70', '3570'],
      show: 5,
    });

    expect(layout.lines.length).toBe(5);
    expect(layout.lines[0].text).toBe('102 × 35');
    expect(layout.lines[1].text).toBe('= (100 + 2) × 35');
    expect(layout.lines[2].text).toBe('= 100 × 35 + 2 × 35');
    expect(layout.lines[3].text).toBe('= 3500 + 70');
    expect(layout.lines[4].text).toBe('= 3570');
    // 如果手写行已经有等号，也能自动规范化处理
    const layoutWithEquals = exprStepsLayout({
      lines: ['10 + 20', '= 30'],
      show: 2,
    });
    expect(layoutWithEquals.lines[0].text).toBe('10 + 20');
    expect(layoutWithEquals.lines[1].text).toBe('= 30');
  });

  it('验收测试 4: underline 的范围与位置对齐测试', () => {
    const layout = exprStepsLayout({
      expr: '36 + (48 − 12) × 2',
      show: 4,
      underline: true,
      size: 36,
      at: [100, 200],
    });

    // 第 1 行：先算 (48 − 12)，下划线涵盖该部分
    const u0 = layout.lines[0].underline;
    expect(u0).toBeDefined();
    expect(u0!.x1).toBeGreaterThan(100);
    expect(u0!.x2).toBeGreaterThan(u0!.x1);
    expect(u0!.y).toBeCloseTo(200 + 36 * 0.18, 1);

    // 第 2 行：先算 36 × 2
    const u1 = layout.lines[1].underline;
    expect(u1).toBeDefined();
    expect(u1!.x1).toBeGreaterThan(100);
    expect(u1!.x2).toBeGreaterThan(u1!.x1);

    // 第 3 行：先算 36 + 72
    const u2 = layout.lines[2].underline;
    expect(u2).toBeDefined();

    // 最后一行：无下划线
    const u3 = layout.lines[3].underline;
    expect(u3).toBeUndefined();
  });

  it('子项测试: line.<n> 与 op.<n>', () => {
    const p = {
      expr: '36 + (48 − 12) × 2',
      show: 4,
      size: 36,
      at: [100, 100],
    };
    const subs = exprStepsPart.subitems?.(p) ?? [];
    const names = subs.map((s) => s.name);

    expect(names).toContain('line.1');
    expect(names).toContain('line.2');
    expect(names).toContain('line.3');
    expect(names).toContain('line.4');

    // 第一行有 3 个运算符：+ 为 1，− 为 2，× 为 3
    expect(names).toContain('op.1');
    expect(names).toContain('op.2');
    expect(names).toContain('op.3');

    // 检查 op.1 的范围应该包含 36 + (48 − 12)
    const op1 = subs.find((s) => s.name === 'op.1');
    expect(op1).toBeDefined();
    expect(op1!.box.x).toBe(100);
    expect(op1!.box.w).toBeGreaterThan(50);
  });

  it('错误检查: expr 解析失败与结果非有限数报错', () => {
    // 括号不匹配
    expect(() => exprStepsLayout({ expr: '36 + (48 − 12' })).toThrow(/parenthesis/i);
    // 除以 0
    expect(() => exprStepsLayout({ expr: '10 ÷ 0' })).toThrow(/division by zero|not finite/i);
    // 缺少操作数
    expect(() => exprStepsLayout({ expr: '10 +' })).toThrow();
  });

  it('连续显示 show 与 notes 说明测试', () => {
    const layout = exprStepsLayout({
      lines: ['102 × 35', '(100 + 2) × 35', '3570'],
      notes: ['', '拆分 102', '得出结果'],
      show: 1.5,
      size: 30,
    });

    expect(layout.lines[0].opacity).toBe(1);
    expect(layout.lines[1].opacity).toBe(0.5);
    expect(layout.lines[2].opacity).toBe(0);

    expect(layout.lines[1].note?.text).toBe('拆分 102');
    expect(layout.lines[2].note?.text).toBe('得出结果');
  });

  it('包围盒 bbox 必须包住零件内容', () => {
    const box = exprStepsPart.bbox({
      expr: '36 + (48 − 12) × 2',
      show: 2,
      at: [100, 100],
      size: 36,
    });

    expect(box.x).toBe(100);
    expect(box.w).toBeGreaterThan(100);
    expect(box.h).toBeGreaterThan(36);
  });
});
