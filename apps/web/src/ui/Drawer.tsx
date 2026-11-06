import { useEffect } from 'react';
import { Icon } from '@flow-see/runtime/ui/Icon.tsx';
import { gradeName } from '../site';
import { useCompletedCount } from '../store/learning';
import { useProfile } from '../store/profile';
import { Avatar, Brand } from './Brand';
import { moduleOf, type Module } from '../learn/paths';
import s from './TopBar.module.css';

import { t } from '@flow-see/core';
const MENU: { id: Module; label: string; note?: string; to: string }[] = [
  { id: 'learn', label: t('common.xue_xi'), to: '/' },
  { id: 'create', label: t('common.chuang_zuo'), to: '/create' },
  { id: 'records', label: t('common.xue_xi_ji_lu'), to: '/me#records' },
  { id: 'settings', label: t('common.she_zhi'), note: t('drawer.zhu_ti_yu_yan'), to: '/settings' },
  { id: 'help', label: t('common.bang_zhu_yu_fan'), to: '/help' },
];

interface Props {
  pathname: string;
  onClose(): void;
  /** 关闭侧边栏并跳转 */
  onGo(to: string): void;
}

/** 侧边栏（规格 2.6） */
export function Drawer({ pathname, onClose, onGo }: Props) {
  const { nickname, avatar, readingGrade } = useProfile();
  const completed = useCompletedCount();
  const active = moduleOf(pathname);

  // 打开时背后的页面不能滚动
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const go = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onGo(to);
  };

  return (
    <div className={s.drawerWrap}>
      <button
        className={s.scrim}
        aria-label={t('drawer.guan_bi_cai_dan')}
        tabIndex={-1}
        onClick={onClose}
      />
      <aside className={s.drawer} role="dialog" aria-modal="true" aria-label={t('drawer.cai_dan')}>
        <div className={s.drawerHead}>
          <Brand onClick={go('/')} />
          <button className={s.iconBtn} aria-label={t('drawer.guan_bi_cai_dan')} onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <a href="/me" className={s.profileCard} onClick={go('/me')}>
          <Avatar color={avatar} size={44} />
          <span>
            <strong>{nickname || t('drawer.xiao_peng_you')}</strong>
            <small>
              {t('drawer.grade_done', { grade: gradeName(readingGrade), n: completed })}
            </small>
          </span>
        </a>

        <nav className={s.menu} aria-label={t('drawer.zhu_cai_dan')}>
          {MENU.map((m) => (
            <a
              key={m.id}
              href={m.to}
              className={s.menuItem}
              aria-current={active === m.id ? 'page' : undefined}
              onClick={go(m.to)}
            >
              <span>{m.label}</span>
              {m.note ? <small>{m.note}</small> : null}
            </a>
          ))}
        </nav>

        <p className={s.drawerNote}>{t('drawer.xue_xi_ji_lu')}</p>
      </aside>
    </div>
  );
}
