// 星星：每种学习方式一颗，按完成度从左往右填色（0 = 空心，0.5 = 填一半，1 = 全满）。
import { useId } from 'react';
import { t } from '@flow-see/core';
import s from './Stars.module.css';

/** 五角星的轮廓（24 × 24 的画布） */
const STAR = 'M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z';

interface Props {
  /** 每颗星的完成度 0–1 */
  values: number[];
  size?: number;
  /** 每颗星的悬停提示（如“看一看 50%”） */
  titles?: string[];
}

export function Stars({ values, size = 20, titles }: Props) {
  const uid = useId();
  const full = values.filter((v) => v >= 1).length;
  return (
    <span
      className={s.row}
      role="img"
      aria-label={t('stars.label', { n: full, total: values.length })}
    >
      {values.map((v, i) => {
        const r = Math.max(0, Math.min(1, v));
        const id = `${uid}-${i}`;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            {titles?.[i] ? <title>{titles[i]}</title> : null}
            <defs>
              <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
                <stop offset={r} style={{ stopColor: 'var(--star)' }} />
                <stop offset={r} style={{ stopColor: 'var(--star-empty)' }} />
              </linearGradient>
            </defs>
            <path
              d={STAR}
              fill={`url(#${id})`}
              strokeWidth="1.2"
              strokeLinejoin="round"
              style={{ stroke: r > 0 ? 'var(--star-edge)' : 'var(--border-strong)' }}
            />
          </svg>
        );
      })}
    </span>
  );
}
