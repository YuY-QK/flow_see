import { lazy, Suspense, useEffect, useLayoutEffect, type ReactNode } from 'react';
import { createBrowserRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useSettings } from '@flow-see/runtime/store/settings.ts';

// 按页面拆分加载，首屏只下载需要的代码
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const SubjectPage = lazy(() =>
  import('./pages/SubjectPage').then((m) => ({ default: m.SubjectPage })),
);
const LessonPage = lazy(() =>
  import('./pages/LessonPage').then((m) => ({ default: m.LessonPage })),
);
const SearchPage = lazy(() =>
  import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })),
);
const MePage = lazy(() => import('./pages/MePage').then((m) => ({ default: m.MePage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const GalleryPage = lazy(() =>
  import('./pages/GalleryPage').then((m) => ({ default: m.GalleryPage })),
);
const GalleryPlayPage = lazy(() =>
  import('./pages/GalleryPlayPage').then((m) => ({ default: m.GalleryPlayPage })),
);
const MinePage = lazy(() => import('./pages/MinePage').then((m) => ({ default: m.MinePage })));
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const CreatePage = lazy(() =>
  import('./pages/CreatePage').then((m) => ({ default: m.CreatePage })),
);
const EditorPage = lazy(() =>
  import('./pages/EditorPage').then((m) => ({ default: m.EditorPage })),
);
const PlayPage = lazy(() => import('./pages/PlayPage').then((m) => ({ default: m.PlayPage })));
const SharedPage = lazy(() =>
  import('./pages/SharedPage').then((m) => ({ default: m.SharedPage })),
);
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

const page = (el: ReactNode) => <Suspense fallback={null}>{el}</Suspense>;

const routes = [
  // 学习
  { path: '/', element: page(<HomePage />) },
  { path: '/learn/:grade/:subject', element: page(<SubjectPage />) },
  { path: '/learn/:grade/:subject/:lessonId', element: page(<LessonPage />) },
  { path: '/search', element: page(<SearchPage />) },
  { path: '/me', element: page(<MePage />) },
  { path: '/help', element: page(<HelpPage />) },
  { path: '/settings', element: page(<SettingsPage />) },
  // 创作（原“动画广场”的示例在 /gallery，入口在创作页）
  { path: '/create', element: page(<CreatePage />) },
  { path: '/mine', element: page(<MinePage />) },
  { path: '/gallery', element: page(<GalleryPage />) },
  { path: '/gallery/:id', element: page(<GalleryPlayPage />) },
  { path: '/edit/:id', element: page(<EditorPage />) },
  { path: '/play/:id', element: page(<PlayPage />) },
  { path: '/s/:id', element: page(<SharedPage />) },
  { path: '*', element: page(<NotFound />) },
];

// 内嵌预览（如 Artifact 页面）里地址栏不可用，用内存路由
const router =
  import.meta.env.VITE_ROUTER === 'memory'
    ? createMemoryRouter(routes)
    : createBrowserRouter(routes);

/** 界面主题：浅色 / 深色 / 跟随系统（在首次绘制前设置，避免闪一下浅色） */
function useUiTheme() {
  const uiTheme = useSettings((st) => st.uiTheme);
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (uiTheme !== 'auto') {
      root.dataset.theme = uiTheme;
      return;
    }
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => (root.dataset.theme = mq.matches ? 'dark' : 'light');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [uiTheme]);
}

export function App() {
  const largeText = useSettings((st) => st.largeText);
  useEffect(() => {
    document.documentElement.dataset.size = largeText ? 'large' : '';
  }, [largeText]);
  useUiTheme();
  return <RouterProvider router={router} />;
}
