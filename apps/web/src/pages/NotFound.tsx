import { Link } from 'react-router-dom';
import { TopBar } from '../ui/TopBar';
import ui from '@flow-see/runtime/ui/ui.module.css';
import s from './Pages.module.css';

export function NotFound({
  text = '这个页面不存在，可能是链接写错了，或者内容还没上线。',
}: {
  text?: string;
}) {
  return (
    <div className={s.page}>
      <TopBar title="找不到页面" />
      <div className={s.center}>
        <p>{text}</p>
        <Link to="/" className={`${ui.btn} ${ui.primary}`}>
          回到首页
        </Link>
      </div>
    </div>
  );
}
