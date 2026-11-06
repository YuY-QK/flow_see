/** clock 模板每一步可用的画面状态（run 还可以写成 run:30，表示这一步走 30 分钟） */
export const CLOCK_SHOWS = ['face', 'minute-hand', 'hour-hand', 'read', 'run'] as const;
export type ClockShow = (typeof CLOCK_SHOWS)[number];

const RUN_MINUTES = /^run:(\d+)$/;

/** run:N 里的 N（分钟）；不是这种写法时返回 undefined */
export function runMinutesOf(show: string | undefined): number | undefined {
  const m = show ? RUN_MINUTES.exec(show) : null;
  return m ? Number(m[1]) : undefined;
}

/** 这一步的 show 写得对不对；run:N 的 N 要在 1 到 720 之间 */
export function isClockShow(show: string): boolean {
  if ((CLOCK_SHOWS as readonly string[]).includes(show)) return true;
  const n = runMinutesOf(show);
  return n !== undefined && n >= 1 && n <= 720;
}
