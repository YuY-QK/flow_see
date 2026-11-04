/** fraction 模板每一步可用的画面状态 */
export const FRACTION_SHOWS = ['whole', 'split', 'take-one', 'take-many'] as const;
export type FractionShow = (typeof FRACTION_SHOWS)[number];
/** 图形：圆（饼）或长条 */
export const FRACTION_SHAPES = ['circle', 'bar'] as const;
