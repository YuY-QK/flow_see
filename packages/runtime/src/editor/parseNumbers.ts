import type { FieldDef } from '../template';

import { t } from '@flow-see/core';
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
  if (values.some((v) => !Number.isInteger(v)))
    return { error: t('parseNumbers.zhi_neng_tian_zheng') };
  const { min = -Infinity, max = Infinity, minCount = 1, maxCount = Infinity } = field;
  if (values.some((v) => v < min || v > max))
    return { error: t('parseNumbers.range', { min, max }) };
  if (values.length < minCount || values.length > maxCount) {
    return { error: t('parseNumbers.count', { min: minCount, max: maxCount, now: values.length }) };
  }
  return { values };
}
