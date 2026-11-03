import { useEffect } from 'react';
import { Icon } from '@flow-see/runtime/ui/Icon.tsx';
import { gradeName } from '../site';
import { useCompletedCount } from '../store/learning';
import { useProfile } from '../store/profile';
import { Avatar, Brand } from './Brand';
import { moduleOf, type Module } from '../learn/paths';
import s from './TopBar.module.css';

const MENU: { id: Module; label: string; note?: string; to: string }[] = [
  { id: 'learn', label: '学习', to: '/' },
  { id: 'create', label: '创作', to: '/create' },
  { id: 'records', label: '学习记录', to: '/me#records' },
  { id: 'settings', label: '设置', note: '主题、语言、朗读', to: '/settings' },
  { id: 'help', label: '帮助与反馈', to: '/help' },
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
      <button className={s.scrim} aria-label="关闭菜单" tabIndex={-1} onClick={onClose} />
      <aside className={s.drawer} role="dialog" aria-modal="true" aria-label="菜单">
        <div className={s.drawerHead}>
          <Brand onClick={go('/')} />
          <button className={s.iconBtn} aria-label="关闭菜单" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <a href="/me" className={s.profileCard} onClick={go('/me')}>
          <Avatar color={avatar} size={44} />
          <span>
            <strong>{nickname || '小朋友'}</strong>
            <small>
              {gradeName(readingGrade)} · 已学完 {completed} 个
            </small>
          </span>
        </a>

        <nav className={s.menu} aria-label="主菜单">
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

        <p className={s.drawerNote}>学习记录和作品保存在这台设备上</p>
      </aside>
    </div>
  );
}
