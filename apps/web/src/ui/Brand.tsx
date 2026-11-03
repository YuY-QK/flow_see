import { Link } from 'react-router-dom';
import { assets, site } from '../site';
import s from './TopBar.module.css';

/** Logo + 网站名称（都来自 site.yaml） */
export function Brand({
  to = '/',
  onClick,
}: {
  to?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <Link to={to} className={s.brand} onClick={onClick}>
      <img src={assets.logo} alt="" width={28} height={28} />
      {site.site.name}
    </Link>
  );
}

export function Avatar({ color, size = 36 }: { color: number; size?: number }) {
  return (
    <span
      className={s.avatar}
      style={{ width: size, height: size, background: `var(--avatar-${color})` }}
      aria-hidden
    >
      <svg viewBox="0 0 36 36" width={size * 0.72} height={size * 0.72}>
        <circle cx="18" cy="14" r="7" fill="#fff" opacity="0.95" />
        <path d="M6 33c1.5-7 6.5-10 12-10s10.5 3 12 10" fill="#fff" opacity="0.95" />
      </svg>
    </span>
  );
}
