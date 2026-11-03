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

/** 播放自己的作品 */
export function PlayPage() {
  const { id = '' } = useParams();
  const [animation, setAnimation] = useState<Animation | null | undefined>(undefined);
  const [dialog, setDialog] = useState<'share' | 'export' | null>(null);

  useEffect(() => {
    repository.get(id).then((a) => setAnimation(a ?? null));
  }, [id]);

  if (animation === undefined) return null;
  if (animation === null) return <NotFound text="找不到这个作品，它可能已被删除。" />;
  const template = getTemplate(animation.templateId);
  if (!template) return <NotFound text="这个作品使用的模板暂不支持。" />;

  return (
    <div className={`${s.page} ${s.playPage}`}>
      <TopBar title="创作" />
      <main className={s.playMain}>
        <div className={s.playHead}>
          <div className={s.playTitleBox}>
            <div className={s.crumb}>
              <Link to="/mine">我的作品</Link>
            </div>
            <h1 className={s.playTitle}>
              {animation.title || '未命名动画'}
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
              <Icon name="share" size={18} /> 分享
            </button>
            <button className={ui.btn} onClick={() => setDialog('export')}>
              <Icon name="download" size={18} /> 导出
            </button>
            <Link to={`/edit/${animation.id}`} className={`${ui.btn} ${ui.primary}`}>
              编辑
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
