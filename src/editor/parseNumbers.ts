import type { FieldDef } from '@/templates/types';

/** 解析“5, 2, 8”这样的一组数字；不合法时返回错误说明 */
export function parseNumbers(
  text: string,
  field: Pick<FieldDef, 'min' | 'max' | 'minCount' | 'maxCount'>,
): { values: number[] } | { error: string } {
  const parts = text
    .split(/[,，、\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const values = parts.map(Number);
  if (values.some((v) => !Number.isInteger(v))) return { error: '只能填整数，用逗号隔开' };
  const { min = -Infinity, max = Infinity, minCount = 1, maxCount = Infinity } = field;
  if (values.some((v) => v < min || v > max)) return { error: `每个数要在 ${min} 到 ${max} 之间` };
  if (values.length < minCount || values.length > maxCount) {
    return { error: `需要 ${minCount} 到 ${maxCount} 个数，现在是 ${values.length} 个` };
  }
  return { values };
}
