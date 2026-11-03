import { useCallback, useEffect, useRef } from 'react';

const KEY = '__flowSeeOverlay';

function onOverlayEntry(): boolean {
  return !!(history.state as Record<string, unknown> | null)?.[KEY];
}

/**
 * 侧边栏、下拉面板打开时，按返回键先关闭它们而不是离开页面（规格 2.2）。
 * 打开时在历史里放一个同网址的临时记录；关闭时把它退掉，所以不会留下多余的历史。
 *
 * 返回 dismiss(then?)：关闭浮层；then 会在历史退回原页面之后执行（例如跳转），
 * 避免跳转和“退掉临时记录”互相打架。
 */
export function useBackToClose(open: boolean, close: () => void): (then?: () => void) => void {
  const closeRef = useRef(close);
  const pending = useRef<(() => void) | null>(null);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (!open) return;
    history.pushState({ ...(history.state ?? {}), [KEY]: true }, '');
    let active = true;
    const onPop = () => {
      active = false;
      window.removeEventListener('popstate', onPop);
      closeRef.current();
      const then = pending.current;
      pending.current = null;
      then?.();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (active && onOverlayEntry()) history.back();
    };
  }, [open]);

  return useCallback((then?: () => void) => {
    if (onOverlayEntry()) {
      pending.current = then ?? null;
      history.back();
    } else {
      closeRef.current();
      then?.();
    }
  }, []);
}
