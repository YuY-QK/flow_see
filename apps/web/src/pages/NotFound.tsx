import { Link } from 'react-router-dom';
import { TopBar } from '../ui/TopBar';
import ui from '@flow-see/runtime/ui/ui.module.css';
import s from './Pages.module.css';

import { t } from '@flow-see/core';
export function NotFound({ text = t('notFound.zhe_ge_ye_mian') }: { text?: string }) {
  return (
    <div className={s.page}>
      <TopBar title={t('notFound.zhao_bu_dao_ye')} />
      <div className={s.center}>
        <p>{text}</p>
        <Link to="/" className={`${ui.btn} ${ui.primary}`}>
          {t('common.hui_dao_shou_ye')}
        </Link>
      </div>
    </div>
  );
}
