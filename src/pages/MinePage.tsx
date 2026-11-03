import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { duplicateAnimation, type Animation } from '@/engine';
import { repository } from '@/services/storage';
import { getTemplate } from '@/templates/registry';
import { AppHeader } from '@/ui/AppHeader';
import { ExportDialog } from '@/ui/ExportDialog';
import { Icon } from '@/ui/Icon';
import { ShareDialog } from '@/ui/ShareDialog';
import { Thumb } from '@/ui/Thumb';
import ui from '@/ui/ui.module.css';
import { timeAgo } from './format';
import s from './Pages.module.css';

type Tab = 'all' | 'draft' | 'shared';
const TABS: { id: Tab; name: string }[] = [
  { id: 'all', name: '全部' },
  { id: 'draft', name: '草稿' },
  { id: 'shared', name: '已分享' },
];

export function MinePage() {
  const navigate = useNavigate();
  const [works, setWorks] = useState<Animation[] | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [menu, setMenu] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sharing, setSharing] = useState<Animation | null>(null);
  const [exporting, setExporting] = useState<Animation | null>(null);

  const refresh = () => repository.list().then(setWorks);
  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[data-menu]')) setMenu(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menu]);

  const toggleMenu = (id: string) => {
    setConfirming(false);
    setMenu(menu === id ? null : id);
  };

  const onDuplicate = async (a: Animation) => {
    setMenu(null);
    await repository.save(duplicateAnimation(a));
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

  const shown = (works ?? []).filter(
    (a) => tab === 'all' || (tab === 'shared') === Boolean(a.share),
  );

  return (
    <div className={s.page}>
      <AppHeader />
      <main className={s.content}>
        <h1 className={s.h1}>我的作品</h1>

        <div className={s.banner}>
          <span>作品保存在这台设备上。分享过的作品会存一份到云端，换设备也能通过链接打开。</span>
          <Link to="/settings#data" className={s.more}>
            备份 / 导入
          </Link>
        </div>

        <div className={s.chips} role="group" aria-label="筛选">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={s.chip}
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className={s.grid}>
          {tab !== 'shared' ? (
            <Link to="/create" className={s.newCard}>
              <Icon name="plus" size={28} />
              新建动画
            </Link>
          ) : null}
          {shown.map((a) => (
            <article className={s.card} key={a.id}>
              <Link to={`/edit/${a.id}`} className={s.cardLink} aria-label={`编辑「${a.title}」`}>
                <Thumb animation={a} className={s.thumb} />
              </Link>
              <div className={s.cardBody}>
                <div className={s.cardText}>
                  <Link to={`/edit/${a.id}`} className={s.cardTitle}>
                    {a.title || '未命名动画'}
                  </Link>
                  <div className={s.cardMeta}>
                    <span className={s.tag}>{a.share ? '已分享' : '草稿'}</span>
                    <span>
                      {getTemplate(a.templateId)?.name} · {a.steps.length} 步 ·{' '}
                      {timeAgo(a.updatedAt)}
                    </span>
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
                  <button
                    className={s.menuItem}
                    onClick={() => {
                      setMenu(null);
                      setSharing(a);
                    }}
                  >
                    <Icon name="link" size={18} /> 分享链接
                  </button>
                  <button
                    className={s.menuItem}
                    onClick={() => {
                      setMenu(null);
                      setExporting(a);
                    }}
                  >
                    <Icon name="download" size={18} /> 导出视频 / GIF
                  </button>
                  <button className={s.menuItem} onClick={() => onDuplicate(a)}>
                    <Icon name="copy" size={18} /> 复制一份
                  </button>
                  <button className={`${s.menuItem} ${s.danger}`} onClick={() => onDelete(a)}>
                    <Icon name="trash" size={18} /> {confirming ? '再点一次确认删除' : '删除'}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        {works && tab === 'shared' && shown.length === 0 ? (
          <div className={s.empty}>还没有分享过作品。在作品的“⋯”菜单里选“分享链接”试试。</div>
        ) : null}
      </main>

      {sharing ? (
        <ShareDialog
          mode="publish"
          animation={sharing}
          onClose={() => setSharing(null)}
          onShared={async (share) => {
            await repository.save({ ...sharing, share });
            refresh();
          }}
        />
      ) : null}
      {exporting && getTemplate(exporting.templateId) ? (
        <ExportDialog
          animation={exporting}
          template={getTemplate(exporting.templateId)!}
          onClose={() => setExporting(null)}
        />
      ) : null}
    </div>
  );
}
