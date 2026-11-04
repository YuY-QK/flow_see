import { t } from '@flow-see/core';
export function timeAgo(time: number, now = Date.now()): string {
  const m = Math.round((now - time) / 60000);
  if (m < 1) return t('format.gang_gang');
  if (m < 60) return t('format.minutes_ago', { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return t('format.hours_ago', { n: h });
  const d = Math.round(h / 24);
  if (d < 30) return t('format.days_ago', { n: d });
  return new Date(time).toLocaleDateString(t('format.locale'));
}
