import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@flow-see/runtime/ui/Icon.tsx';
import { content, gradeName } from '../site';
import { useProfile } from '../store/profile';
import { Avatar } from './Brand';
import { Drawer } from './Drawer';
import { useBackToClose } from './useBackToClose';
import s from './TopBar.module.css';

import { t } from '@flow-see/core';
export interface Crumb {
  label: string;
  /** 上级页面的地址；最后一级（当前页）不填 */
  to?: string;
  /** 点击上级时的额外动作（如切换浏览年级） */
  onClick?(): void;
}

export interface Pick {
  grade: number;
  subject?: string;
}

export interface TopBarProps {
  /** 一级页面显示模块名（学习、创作、个人中心、设置……） */
  title?: string;
  /** 下级页面显示层级路径；最后一项是当前页 */
  crumbs?: Crumb[];
  /** 年级下拉（P1–P4） */
  grade?: number;
  /** 学科下拉（P2、P3）；同时给出 grade 才显示 */
  subject?: string;
  onPick?(next: Pick): void;
  /** 搜索框的初始内容；搜索页上保持展开 */
  query?: string;
  searchPage?: boolean;
  /** 右侧的额外按钮 */
  children?: ReactNode;
}

type Overlay = 'drawer' | 'grade' | 'subject' | 'combo' | null;

/** 组合面板里暂存的选择，g / s 表示年级、学科是否已经选过 */
interface Pending extends Pick {
  g: boolean;
  s: boolean;
}

/** 顶部栏（规格 2.5）：头像、模块名/层级路径、搜索、年级和学科下拉。 */
export function TopBar({
  title,
  crumbs,
  grade,
  subject,
  onPick,
  query = '',
  searchPage,
  children,
}: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const avatar = useProfile((p) => p.avatar);

  const [overlay, setOverlay] = useState<Overlay>(null);
  const dismiss = useBackToClose(overlay !== null, () => setOverlay(null));

  const [searchOpen, setSearchOpen] = useState(!!searchPage);
  const [q, setQ] = useState(query);
  const searchRef = useRef<HTMLInputElement>(null);

  // 组合面板（手机）里暂存的选择：两项都选完或点空白处才生效
  const [pending, setPending] = useState<Pending | null>(null);

  // 网址变化时同步搜索词（搜索页上改关键词、浏览器前进后退）
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    setQ(query);
  }

  // 点击面板以外的地方、按 Esc 关闭面板或侧边栏
  useEffect(() => {
    if (!overlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onDown = (e: PointerEvent) => {
      if (overlay === 'drawer') return; // 侧边栏有自己的遮罩
      const t = e.target as Element;
      if (t.closest('[data-panel]') || t.closest('[data-overlay-toggle]')) return;
      close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  });

  function apply(next: Pick) {
    if (onPick && (next.grade !== grade || next.subject !== subject)) onPick(next);
  }

  /** 关闭当前浮层；组合面板里已经选了的一项在关闭时生效 */
  function close(then?: () => void, keepPending = true) {
    const p =
      keepPending && overlay === 'combo' && pending && (pending.g || pending.s) ? pending : null;
    setPending(null);
    dismiss(() => {
      if (p) apply({ grade: p.grade, subject: p.subject });
      then?.();
    });
  }

  function toggle(o: Exclude<Overlay, null>) {
    if (overlay === o) return close();
    setSearchOpen(!!searchPage);
    setPending(o === 'combo' ? { grade: grade!, subject, g: false, s: false } : null);
    setOverlay(o);
  }

  function pick(next: Pick) {
    close(() => apply(next), false);
  }

  function pickInCombo(patch: Partial<Pick>, which: 'g' | 's') {
    const p = { ...pending!, ...patch, [which]: true };
    if (p.g && (subject === undefined || p.s)) pick({ grade: p.grade, subject: p.subject });
    else setPending(p);
  }

  function openSearch() {
    if (overlay) close();
    setSearchOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const text = q.trim();
    if (!text) return;
    searchRef.current?.blur();
    navigate(`/search?q=${encodeURIComponent(text)}`, { replace: !!searchPage });
  }

  function onSearchBlur() {
    if (!searchPage && !q.trim()) setSearchOpen(false);
  }

  function cancelSearch() {
    setQ('');
    if (searchPage) navigate(-1);
    else setSearchOpen(false);
  }

  const showSubject = grade !== undefined && subject !== undefined;
  const subj = showSubject ? content.subjects.find((x) => x.id === subject) : undefined;

  const gradeList = (current: number | undefined, onClick: (g: number) => void) => (
    <div className={s.options} role="listbox" aria-label={t('topBar.nian_ji')}>
      {content.grades.map((g) => (
        <button
          key={g.id}
          role="option"
          aria-selected={g.id === current}
          className={s.option}
          onClick={() => onClick(g.id)}
        >
          {g.name}
        </button>
      ))}
    </div>
  );
  const subjectList = (current: string | undefined, onClick: (id: string) => void) => (
    <div className={s.options} role="listbox" aria-label={t('common.xue_ke')}>
      {content.subjects.map((x) => (
        <button
          key={x.id}
          role="option"
          aria-selected={x.id === current}
          className={s.option}
          onClick={() => onClick(x.id)}
        >
          <span className={s.dot} style={{ background: x.color }} />
          {x.name}
        </button>
      ))}
    </div>
  );

  const parents = crumbs?.slice(0, -1) ?? [];
  const current = crumbs?.at(-1)?.label ?? title;

  return (
    <>
      <header className={`${s.bar} ${searchOpen && !searchPage ? s.searching : ''}`}>
        <button
          className={s.avatarBtn}
          aria-label={t('topBar.da_kai_cai_dan')}
          data-overlay-toggle
          onClick={() => {
            setSearchOpen(!!searchPage);
            setOverlay('drawer');
          }}
        >
          <Avatar color={avatar} />
        </button>

        <nav className={s.where} aria-label={t('topBar.dang_qian_wei_zhi')}>
          {crumbs?.length ? (
            <>
              {/* 电脑 / iPad：一行路径 */}
              <ol className={s.crumbs}>
                {crumbs.map((c, i) => (
                  <li key={i} className={i === crumbs.length - 1 ? s.crumbCurrent : s.crumb}>
                    {c.to ? (
                      <Link to={c.to} onClick={c.onClick}>
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current="page">{c.label}</span>
                    )}
                  </li>
                ))}
              </ol>
              {/* 手机：上级路径小字一行，当前页一行 */}
              <div className={s.crumbsPhone}>
                <div className={s.parentLine}>
                  {parents.map((c, i) => (
                    <span key={i}>
                      {i > 0 ? ' › ' : ''}
                      {c.to ? (
                        <Link to={c.to} onClick={c.onClick}>
                          {c.label}
                        </Link>
                      ) : (
                        c.label
                      )}
                    </span>
                  ))}
                </div>
                <div className={s.currentLine}>{current}</div>
              </div>
            </>
          ) : (
            <h1 className={s.title}>{title}</h1>
          )}
        </nav>

        <div className={s.actions}>
          {children}

          <form
            className={`${s.search} ${searchOpen ? s.searchOpen : ''}`}
            role="search"
            onSubmit={onSearch}
          >
            {searchOpen ? (
              <>
                <Icon name="search" size={18} />
                <label className="sr-only" htmlFor="topbar-search">
                  {t('topBar.sou_suo_zhi_shi')}
                </label>
                <input
                  id="topbar-search"
                  ref={searchRef}
                  type="search"
                  enterKeyHint="search"
                  placeholder={t('topBar.sou_suo_zhi_shi')}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onBlur={onSearchBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      if (!searchPage) {
                        setQ('');
                        setSearchOpen(false);
                      }
                      searchRef.current?.blur();
                    }
                  }}
                />
                <button
                  type="button"
                  className={s.cancel}
                  // 先于输入框失焦触发，避免点“取消”时输入框先收起
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={cancelSearch}
                >
                  {t('common.qu_xiao')}
                </button>
              </>
            ) : (
              <button
                type="button"
                className={s.iconBtn}
                aria-label={t('common.sou_suo')}
                data-overlay-toggle
                onClick={openSearch}
              >
                <Icon name="search" size={20} />
              </button>
            )}
          </form>

          {grade !== undefined ? (
            <>
              {/* 电脑 / iPad：年级、学科两个下拉 */}
              <div className={`${s.dropdown} ${s.wide}`}>
                <button
                  className={s.select}
                  aria-haspopup="listbox"
                  aria-expanded={overlay === 'grade'}
                  data-overlay-toggle
                  onClick={() => toggle('grade')}
                >
                  {gradeName(grade)} <span className={s.caret}>▾</span>
                </button>
                {overlay === 'grade' ? (
                  <div className={s.panel} data-panel>
                    {gradeList(grade, (g) => pick({ grade: g, subject }))}
                  </div>
                ) : null}
              </div>
              {showSubject ? (
                <div className={`${s.dropdown} ${s.wide}`}>
                  <button
                    className={s.select}
                    aria-haspopup="listbox"
                    aria-expanded={overlay === 'subject'}
                    data-overlay-toggle
                    onClick={() => toggle('subject')}
                  >
                    <span className={s.dot} style={{ background: subj?.color }} />
                    {subj?.name ?? subject} <span className={s.caret}>▾</span>
                  </button>
                  {overlay === 'subject' ? (
                    <div className={s.panel} data-panel>
                      {subjectList(subject, (id) => pick({ grade, subject: id }))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* 手机：合并成一个按钮 */}
              <div className={`${s.dropdown} ${s.narrow}`}>
                <button
                  className={s.select}
                  aria-haspopup="dialog"
                  aria-expanded={overlay === 'combo'}
                  data-overlay-toggle
                  onClick={() => toggle('combo')}
                >
                  {gradeName(grade)}
                  {showSubject ? `·${subj?.name ?? subject}` : ''}{' '}
                  <span className={s.caret}>▾</span>
                </button>
                {overlay === 'combo' ? (
                  <div className={`${s.panel} ${s.comboPanel}`} data-panel>
                    <div className={s.panelLabel}>{t('topBar.nian_ji')}</div>
                    {gradeList(pending?.grade ?? grade, (g) => pickInCombo({ grade: g }, 'g'))}
                    {showSubject ? (
                      <>
                        <div className={s.panelLabel}>{t('common.xue_ke')}</div>
                        {subjectList(pending?.subject ?? subject, (id) =>
                          pickInCombo({ subject: id }, 's'),
                        )}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </header>

      {overlay === 'drawer' ? (
        <Drawer
          pathname={location.pathname}
          onClose={() => close()}
          onGo={(to) => close(() => navigate(to))}
        />
      ) : null}
    </>
  );
}
