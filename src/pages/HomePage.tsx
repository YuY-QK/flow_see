import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { duplicateAnimation, type Animation } from '@/engine';
import { repository } from '@/services/storage';
import { TEMPLATE_CARDS, getTemplate } from '@/templates/registry';
import { AppHeader } from '@/ui/AppHeader';
import { Icon } from '@/ui/Icon';
import ui from '@/ui/ui.module.css';
import s from './Pages.module.css';

function timeAgo(t: number): string {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.round(h / 24)} 天前`;
}

/** M1 的首页：创建入口 + 我的作品（完整首页与广场在 M3）。 */
export function HomePage() {
  const navigate = useNavigate();
  const [works, setWorks] = useState<Animation[] | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const refresh = () => repository.list().then(setWorks);
  useEffect(() => {
    refresh();
  }, []);

  const toggleMenu = (id: string) => {
    setConfirming(false);
    setMenu(menu === id ? null : id);
  };

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[data-menu]')) setMenu(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menu]);

  const onDuplicate = async (a: Animation) => {
    await repository.save(duplicateAnimation(a));
    setMenu(null);
    refresh();
  };
  // 删除需要在菜单里再点一次确认（不用浏览器弹窗，App 和内嵌页面里也能用）
  const onDelete = async (a: Animation) => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setMenu(null);
    setConfirming(false);
    await repository.remove(a.id);
    refresh();
  };

  return (
    <div className={s.page}>
      <AppHeader>
        <Link to="/create" className={`${ui.btn} ${ui.primary}`}>
          + 创建动画
        </Link>
      </AppHeader>

      <main className={s.content}>
        <section className={s.hero}>
          <div>
            <div className={s.note}>把流程变成看得懂的动画</div>
            <h1 className={s.h1}>今天想讲清楚什么？</h1>
          </div>
          <div className={s.quick}>
            {TEMPLATE_CARDS.map((c) => (
              <Link
                key={c.id}
                to="/create"
                className={s.quickItem}
                style={{ background: `var(--tpl-${c.id}-bg)` }}
              >
                <strong>{c.name}</strong>
                <span>{c.available ? c.scenes : '即将推出'}</span>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <h2 className={s.h2}>我的作品</h2>
            <div className={s.note}>作品保存在这台设备的浏览器里。</div>
          </div>
          <div className={s.grid}>
            <Link to="/create" className={s.newCard}>
              <Icon name="plus" size={28} />
              新建动画
            </Link>
            {(works ?? []).map((a) => {
              const t = getTemplate(a.templateId);
              return (
                <div className={s.card} key={a.id}>
                  <Link
                    to={`/edit/${a.id}`}
                    className={s.thumb}
                    style={{
                      background: `var(--tpl-${a.templateId}-bg)`,
                      color: `var(--tpl-${a.templateId}-ink)`,
                    }}
                  >
                    <span>{t?.name ?? a.templateId}</span>
                  </Link>
                  <div className={s.cardBody}>
                    <div className={s.cardText}>
                      <div className={s.cardTitle}>{a.title || '未命名动画'}</div>
                      <div className={s.cardMeta}>
                        {a.steps.length} 步 · {timeAgo(a.updatedAt)}
                      </div>
                    </div>
                    <button
                      className={`${ui.btn} ${ui.ghost} ${ui.icon}`}
                      aria-label={`「${a.title}」的更多操作`}
                      aria-expanded={menu === a.id}
                      data-menu
                      onClick={() => toggleMenu(a.id)}
                    >
                      <Icon name="more" />
                    </button>
                  </div>
                  {menu === a.id ? (
                    <div className={s.menu} data-menu>
                      <button className={s.menuItem} onClick={() => navigate(`/edit/${a.id}`)}>
                        <Icon name="edit" size={18} /> 编辑
                      </button>
                      <button className={s.menuItem} onClick={() => navigate(`/play/${a.id}`)}>
                        <Icon name="play" size={18} /> 播放
                      </button>
                      <button className={s.menuItem} onClick={() => onDuplicate(a)}>
                        <Icon name="copy" size={18} /> 复制一份
                      </button>
                      <button className={`${s.menuItem} ${s.danger}`} onClick={() => onDelete(a)}>
                        <Icon name="trash" size={18} /> {confirming ? '再点一次确认删除' : '删除'}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
