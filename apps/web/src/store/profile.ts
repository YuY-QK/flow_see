// 本机资料（个人中心）与当前浏览的年级（规格 2.3）。
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage } from '@flow-see/runtime/store/safeStorage.ts';
import { site } from '../site';

interface ProfileState {
  nickname: string;
  avatar: number;
  /** 在读年级：每次打开网站时首页默认显示的年级 */
  readingGrade: number;
  set(patch: Partial<Pick<ProfileState, 'nickname' | 'avatar'>>): void;
  setReadingGrade(grade: number): void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      nickname: '',
      avatar: 0,
      readingGrade: site.defaults.grade,
      set: (patch) => set(patch),
      setReadingGrade: (grade) => {
        set({ readingGrade: grade });
        // 修改在读年级时，当前浏览年级也切过去
        useBrowse.getState().setGrade(grade);
      },
    }),
    {
      name: 'flow-see-profile',
      storage: createJSONStorage(() => safeStorage('local')),
      partialize: ({ nickname, avatar, readingGrade }) => ({ nickname, avatar, readingGrade }),
    },
  ),
);

interface BrowseState {
  /** 当前浏览年级：本次访问内有效（关掉网页后回到在读年级） */
  grade: number | null;
  setGrade(grade: number): void;
}

export const useBrowse = create<BrowseState>()(
  persist(
    (set) => ({
      grade: null,
      setGrade: (grade) => set({ grade }),
    }),
    {
      name: 'flow-see-browse',
      storage: createJSONStorage(() => safeStorage('session')),
      partialize: ({ grade }) => ({ grade }),
    },
  ),
);

/** 当前浏览的年级 */
export function useCurrentGrade(): number {
  const browsing = useBrowse((s) => s.grade);
  const reading = useProfile((s) => s.readingGrade);
  return browsing ?? reading;
}
