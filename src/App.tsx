import { createBrowserRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';
import { CreatePage } from './pages/CreatePage';
import { EditorPage } from './pages/EditorPage';
import { HomePage } from './pages/HomePage';
import { NotFound } from './pages/NotFound';
import { PlayPage } from './pages/PlayPage';

const routes = [
  { path: '/', element: <HomePage /> },
  { path: '/create', element: <CreatePage /> },
  { path: '/edit/:id', element: <EditorPage /> },
  { path: '/play/:id', element: <PlayPage /> },
  { path: '*', element: <NotFound /> },
];

// 内嵌预览（如 Artifact 页面）里地址栏不可用，用内存路由
const router =
  import.meta.env.VITE_ROUTER === 'memory'
    ? createMemoryRouter(routes)
    : createBrowserRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
