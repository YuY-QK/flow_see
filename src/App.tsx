import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { CreatePage } from './pages/CreatePage';
import { EditorPage } from './pages/EditorPage';
import { HomePage } from './pages/HomePage';
import { NotFound } from './pages/NotFound';
import { PlayPage } from './pages/PlayPage';

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/create', element: <CreatePage /> },
  { path: '/edit/:id', element: <EditorPage /> },
  { path: '/play/:id', element: <PlayPage /> },
  { path: '*', element: <NotFound /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
