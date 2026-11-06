import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Animation } from '@flow-see/core';
import { Player } from '@flow-see/runtime/player/Player.tsx';
import { repository } from '@flow-see/runtime/services/storage.ts';
import { getTemplate } from '@flow-see/templates';
import { TopBar } from '../ui/TopBar';
import { ExportDialog } from '../ui/ExportDialog';
import { Icon } from '@flow-see/runtime/ui/Icon.tsx';
import { ShareDialog } from '../ui/ShareDialog';
import ui from '@flow-see/runtime/ui/ui.module.css';
import { NotFound } from './NotFound';
import s from './Pages.module.css';

import { t } from '@flow-see/core';
/** 播放自己的作品 */
export function PlayPage() {
  const { id = '' } = useParams();
  const [animation, setAnimation] = useState<Animation | null | undefined>(undefined);
  const [dialog, setDialog] = useState<'share' | 'export' | null>(null);

  useEffect(() => {
    repository.get(id).then((a) => setAnimation(a ?? null));
  }, [id]);

  if (animation === undefined) return null;
  if (animation === null) return <NotFound text={t('common.zhao_bu_dao_zhe')} />;
  const template = getTemplate(animation.templateId);
  if (!template) return <NotFound text={t('common.zhe_ge_zuo_pin')} />;

  return (
    <div className={`${s.page} ${s.playPage}`}>
      <TopBar title={t('common.chuang_zuo')} />
      <main className={s.playMain}>
        <div className={s.playHead}>
          <div className={s.playTitleBox}>
            <div className={s.crumb}>
              <Link to="/mine">{t('common.wo_de_zuo_pin')}</Link>
            </div>
            <h1 className={s.playTitle}>
              {animation.title || t('common.wei_ming_ming_dong')}
              <span
                className={ui.badge}
                style={{
                  background: `var(--tpl-${template.id}-bg)`,
                  color: `var(--tpl-${template.id}-ink)`,
                }}
              >
                {template.name}
              </span>
            </h1>
          </div>
          <div className={s.playActions}>
            <button className={ui.btn} onClick={() => setDialog('share')}>
              <Icon name="share" size={18} /> {t('common.fen_xiang')}
            </button>
            <button className={ui.btn} onClick={() => setDialog('export')}>
              <Icon name="download" size={18} /> {t('common.dao_chu')}
            </button>
            <Link to={`/edit/${animation.id}`} className={`${ui.btn} ${ui.primary}`}>
              {t('common.bian_ji')}
            </Link>
          </div>
        </div>
        <Player animation={animation} template={template} variant="full" autoPlay />
      </main>

      {dialog === 'share' ? (
        <ShareDialog
          mode="publish"
          animation={animation}
          onClose={() => setDialog(null)}
          onShared={async (share) => {
            const next = { ...animation, share };
            await repository.save(next);
            setAnimation(next);
          }}
        />
      ) : null}
      {dialog === 'export' ? (
        <ExportDialog animation={animation} template={template} onClose={() => setDialog(null)} />
      ) : null}
    </div>
  );
}
