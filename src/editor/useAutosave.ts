import { useEffect } from 'react';
import { repository } from '@/services/storage';
import { useEditor } from '@/store/editor';

const DELAY = 600;

/** 作品有改动后稍等片刻自动保存；离开页面前把未保存的改动写入。 */
export function useAutosave() {
  useEffect(() => {
    let timer: number | undefined;
    let pending: ReturnType<typeof useEditor.getState>['animation'] = null;

    const flush = async () => {
      const a = pending;
      pending = null;
      if (!a) return;
      try {
        await repository.save(a);
        if (!pending) useEditor.getState().setSaveState('saved');
      } catch {
        useEditor.getState().setSaveState('error');
      }
    };

    const unsub = useEditor.subscribe((st, prev) => {
      if (!st.animation || st.animation === prev.animation) return;
      // 刚载入的作品不需要保存
      if (!prev.animation || prev.animation.id !== st.animation.id) return;
      pending = st.animation;
      st.setSaveState('saving');
      window.clearTimeout(timer);
      timer = window.setTimeout(flush, DELAY);
    });

    const onHide = () => void flush();
    window.addEventListener('pagehide', onHide);
    return () => {
      unsub();
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', onHide);
      void flush();
    };
  }, []);
}
