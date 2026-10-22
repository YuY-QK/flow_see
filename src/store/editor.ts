import { create } from 'zustand';
import type { Animation } from '@/engine';

export type SaveState = 'saved' | 'saving' | 'error';

interface EditorState {
  animation: Animation | null;
  selectedId: string | null;
  saveState: SaveState;
  load(animation: Animation): void;
  /** 用 engine/edit 里的纯函数修改作品 */
  apply(fn: (a: Animation) => Animation): void;
  select(id: string | null): void;
  setSaveState(s: SaveState): void;
}

export const useEditor = create<EditorState>((set) => ({
  animation: null,
  selectedId: null,
  saveState: 'saved',
  load: (animation) =>
    set({ animation, selectedId: animation.steps[0]?.id ?? null, saveState: 'saved' }),
  apply: (fn) => set((st) => (st.animation ? { animation: fn(st.animation) } : {})),
  select: (selectedId) => set({ selectedId }),
  setSaveState: (saveState) => set({ saveState }),
}));
