import { Link } from 'react-router-dom';
import { AppHeader } from '@/ui/AppHeader';
import ui from '@/ui/ui.module.css';
import s from './Pages.module.css';

export function NotFound({ text = '页面不存在。' }: { text?: string }) {
  return (
    <div className={s.page}>
      <AppHeader />
      <div className={s.center}>
        <p>{text}</p>
        <Link to="/" className={`${ui.btn} ${ui.primary}`}>
          回到首页
        </Link>
      </div>
    </div>
  );
}
