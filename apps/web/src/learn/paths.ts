export function lessonPath(grade: number, subject: string, id: string): string {
  return `/learn/${grade}/${subject}/${id}`;
}

export type Module = 'learn' | 'create' | 'records' | 'settings' | 'help';

/** 当前页面属于哪个模块（侧边栏高亮用） */
export function moduleOf(pathname: string): Module | null {
  if (pathname === '/' || pathname.startsWith('/learn') || pathname.startsWith('/search'))
    return 'learn';
  if (/^\/(create|mine|edit|play|gallery)(\/|$)/.test(pathname)) return 'create';
  if (pathname.startsWith('/me')) return 'records';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/help')) return 'help';
  return null;
}
