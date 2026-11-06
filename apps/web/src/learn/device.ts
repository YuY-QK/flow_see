import { useSyncExternalStore } from 'react';

export type Device = 'desktop' | 'pad' | 'phone';

/** 三档布局：电脑 ≥1024，iPad 768–1023，手机 <768（需求设计第 8 节） */
const PHONE = '(max-width: 767px)';
const PAD = '(min-width: 768px) and (max-width: 1023px)';

function current(): Device {
  if (typeof matchMedia === 'undefined') return 'desktop';
  if (matchMedia(PHONE).matches) return 'phone';
  if (matchMedia(PAD).matches) return 'pad';
  return 'desktop';
}

function subscribe(cb: () => void) {
  if (typeof matchMedia === 'undefined') return () => {};
  const qs = [matchMedia(PHONE), matchMedia(PAD)];
  qs.forEach((q) => q.addEventListener('change', cb));
  return () => qs.forEach((q) => q.removeEventListener('change', cb));
}

export function useDevice(): Device {
  return useSyncExternalStore(subscribe, current, () => 'desktop');
}
