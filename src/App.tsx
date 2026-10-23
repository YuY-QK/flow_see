import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { createBrowserRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useSettings } from './store/settings';

// 按页面拆分加载，首屏只下载需要的代码
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
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
  { path: '/', element: page(<HomePage />) },
  { path: '/gallery', element: page(<GalleryPage />) },
  { path: '/gallery/:id', element: page(<GalleryPlayPage />) },
  { path: '/mine', element: page(<MinePage />) },
  { path: '/settings', element: page(<SettingsPage />) },
  { path: '/create', element: page(<CreatePage />) },
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

export function App() {
  const largeText = useSettings((st) => st.largeText);
  useEffect(() => {
    document.documentElement.dataset.size = largeText ? 'large' : '';
  }, [largeText]);
  return <RouterProvider router={router} />;
}
