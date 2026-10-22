import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import s from './AppHeader.module.css';

export function Logo() {
  return (
    <Link to="/" className={s.logo}>
      <span className={s.mark}>
        <Icon name="logo" size={16} />
      </span>
      动画流
    </Link>
  );
}

/** 站内顶部栏：左 Logo，右侧放页面自己的操作。 */
export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className={s.header}>
      <Logo />
      <div className={s.spacer} />
      {children}
    </header>
  );
}
