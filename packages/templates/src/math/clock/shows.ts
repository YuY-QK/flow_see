/** clock 模板每一步可用的画面状态 */
export const CLOCK_SHOWS = ['face', 'minute-hand', 'hour-hand', 'read', 'run'] as const;
export type ClockShow = (typeof CLOCK_SHOWS)[number];
