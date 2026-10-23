import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import s from './AppHeader.module.css';

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className={s.logo}>
      <span className={s.mark}>
        <Icon name="logo" size={16} />
      </span>
      动画流
    </Link>
  );
}

const NAV = [
  { to: '/', label: '首页', end: true },
  { to: '/gallery', label: '动画广场', end: false },
  { to: '/mine', label: '我的作品', end: false },
];

/**
 * 站内导航。
 * 电脑：左侧 Logo 和文字链接，右侧搜索框、设置、创建按钮。
 * 手机：左侧菜单按钮（展开侧边栏），中间标题，右侧搜索和动画广场。
 */
export function AppHeader({ children }: { children?: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // 换页时关闭侧边栏
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setDrawer(false);
  }

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/gallery?q=${encodeURIComponent(q.trim())}` : '/gallery');
  };

  return (
    <>
      <header className={s.header}>
        {/* 手机 */}
        <button
          className={`${s.iconBtn} ${s.mobile}`}
          aria-label="打开菜单"
          onClick={() => setDrawer(true)}
        >
          <Icon name="menu" size={22} />
        </button>
        <div className={`${s.mobileTitle} ${s.mobile}`}>动画流</div>

        {/* 电脑 */}
        <div className={s.desktop}>
          <Logo />
        </div>
        <nav className={`${s.nav} ${s.desktop}`} aria-label="主导航">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={s.navLink}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className={s.spacer} />
        {children}
        <form className={`${s.search} ${s.desktop}`} role="search" onSubmit={onSearch}>
          <label className="sr-only" htmlFor="site-search">
            搜索动画
          </label>
          <input
            id="site-search"
            type="search"
            placeholder="搜索：排序、TCP、光合作用…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>
        <Link to="/settings" className={`${s.iconBtn} ${s.desktop}`} aria-label="设置">
          <Icon name="settings" size={20} />
        </Link>
        <Link to="/create" className={`${s.create} ${s.desktop}`}>
          + 创建动画
        </Link>

        <Link to="/gallery?search=1" className={`${s.iconBtn} ${s.mobile}`} aria-label="搜索">
          <Icon name="search" size={20} />
        </Link>
        <Link to="/gallery" className={`${s.iconBtn} ${s.mobile}`} aria-label="动画广场">
          <Icon name="grid" size={20} />
        </Link>
      </header>

      {drawer ? (
        <div className={s.drawerWrap}>
          <div className={s.drawer} role="dialog" aria-modal="true" aria-label="菜单">
            <div className={s.drawerHead}>
              <Logo />
              <button className={s.iconBtn} aria-label="关闭菜单" onClick={() => setDrawer(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <Link to="/create" className={s.drawerCreate}>
              + 创建动画
            </Link>
            {[...NAV, { to: '/settings', label: '设置', end: false }].map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={s.drawerLink}>
                {n.label}
              </NavLink>
            ))}
            <div className={s.drawerNote}>作品保存在这台设备上</div>
          </div>
          <button className={s.scrim} aria-label="关闭菜单" onClick={() => setDrawer(false)} />
        </div>
      ) : null}
    </>
  );
}
