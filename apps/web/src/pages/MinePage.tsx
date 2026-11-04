import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { duplicateAnimation, type Animation, t } from '@flow-see/core';
import { repository } from '@flow-see/runtime/services/storage.ts';
import { getTemplate } from '@flow-see/templates';
import { TopBar } from '../ui/TopBar';
import { ExportDialog } from '../ui/ExportDialog';
import { Icon } from '@flow-see/runtime/ui/Icon.tsx';
import { ShareDialog } from '../ui/ShareDialog';
import { Thumb } from '../ui/Thumb';
import ui from '@flow-see/runtime/ui/ui.module.css';
import { timeAgo } from './format';
import s from './Pages.module.css';

type Tab = 'all' | 'draft' | 'shared';
const TABS: { id: Tab; name: string }[] = [
  { id: 'all', name: t('common.quan_bu') },
  { id: 'draft', name: t('common.cao_gao') },
  { id: 'shared', name: t('minePage.yi_fen_xiang') },
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
      <TopBar title={t('common.chuang_zuo')} />
      <main className={s.content}>
        <h1 className={s.h1}>{t('common.wo_de_zuo_pin')}</h1>

        <div className={s.banner}>
          <span>{t('minePage.zuo_pin_bao_cun')}</span>
          <Link to="/settings#data" className={s.more}>
            {t('minePage.bei_fen_dao_ru')}
          </Link>
        </div>

        <div className={s.chips} role="group" aria-label={t('minePage.shai_xuan')}>
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
              {t('minePage.xin_jian_dong_hua')}
            </Link>
          ) : null}
          {shown.map((a) => (
            <article className={s.card} key={a.id}>
              <Link
                to={`/edit/${a.id}`}
                className={s.cardLink}
                aria-label={t('minePage.edit_aria', { title: a.title })}
              >
                <Thumb animation={a} className={s.thumb} />
              </Link>
              <div className={s.cardBody}>
                <div className={s.cardText}>
                  <Link to={`/edit/${a.id}`} className={s.cardTitle}>
                    {a.title || t('common.wei_ming_ming_dong')}
                  </Link>
                  <div className={s.cardMeta}>
                    <span className={s.tag}>
                      {a.share ? t('minePage.yi_fen_xiang') : t('common.cao_gao')}
                    </span>
                    <span>
                      {t('minePage.card_meta', {
                        template: getTemplate(a.templateId)?.name,
                        steps: a.steps.length,
                        time: timeAgo(a.updatedAt),
                      })}
                    </span>
                  </div>
                </div>
                <button
                  className={`${ui.btn} ${ui.ghost} ${ui.icon}`}
                  aria-label={t('minePage.more_aria', { title: a.title })}
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
                    <Icon name="edit" size={18} /> {t('common.bian_ji')}
                  </button>
                  <button className={s.menuItem} onClick={() => navigate(`/play/${a.id}`)}>
                    <Icon name="play" size={18} /> {t('common.bo_fang')}
                  </button>
                  <button
                    className={s.menuItem}
                    onClick={() => {
                      setMenu(null);
                      setSharing(a);
                    }}
                  >
                    <Icon name="link" size={18} /> {t('common.fen_xiang_lian_jie')}
                  </button>
                  <button
                    className={s.menuItem}
                    onClick={() => {
                      setMenu(null);
                      setExporting(a);
                    }}
                  >
                    <Icon name="download" size={18} /> {t('minePage.dao_chu_shi_pin')}
                  </button>
                  <button className={s.menuItem} onClick={() => onDuplicate(a)}>
                    <Icon name="copy" size={18} /> {t('minePage.fu_zhi_yi_fen')}
                  </button>
                  <button className={`${s.menuItem} ${s.danger}`} onClick={() => onDelete(a)}>
                    <Icon name="trash" size={18} />{' '}
                    {confirming ? t('minePage.zai_dian_yi_ci') : t('minePage.shan_chu')}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        {works && tab === 'shared' && shown.length === 0 ? (
          <div className={s.empty}>{t('minePage.hai_mei_you_fen')}</div>
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
