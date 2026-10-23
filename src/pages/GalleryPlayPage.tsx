import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { findOfficial } from '@/content/official';
import { duplicateAnimation } from '@/engine';
import { Player } from '@/player/Player';
import { repository } from '@/services/storage';
import { getTemplate } from '@/templates/registry';
import { AppHeader } from '@/ui/AppHeader';
import { ExportDialog } from '@/ui/ExportDialog';
import { Icon } from '@/ui/Icon';
import { ShareDialog } from '@/ui/ShareDialog';
import ui from '@/ui/ui.module.css';
import { NotFound } from './NotFound';
import s from './Pages.module.css';

/** 播放动画广场里的作品：可分享、导出、复制并修改 */
export function GalleryPlayPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const item = findOfficial(id);
  const [dialog, setDialog] = useState<'share' | 'export' | null>(null);

  if (!item) return <NotFound text="找不到这个动画。" />;
  const animation = item.animation;
  const template = getTemplate(animation.templateId);
  if (!template) return <NotFound text="这个动画使用的模板暂不支持。" />;

  const copyAndEdit = async () => {
    // 复制成自己的草稿：沿用原作的标题和主题，不再署官方的名字
    const copy = { ...duplicateAnimation(animation), title: animation.title, author: undefined };
    await repository.save(copy);
    navigate(`/edit/${copy.id}`);
  };

  return (
    <div className={`${s.page} ${s.playPage}`}>
      <AppHeader />
      <main className={s.playMain}>
        <div className={s.playHead}>
          <div className={s.playTitleBox}>
            <div className={s.crumb}>
              <Link to="/gallery">动画广场</Link> ›{' '}
              <Link to={`/gallery?cat=${encodeURIComponent(item.category)}`}>{item.category}</Link>
            </div>
            <h1 className={s.playTitle}>
              {animation.title}
              <span
                className={ui.badge}
                style={{
                  background: `var(--tpl-${template.id}-bg)`,
                  color: `var(--tpl-${template.id}-ink)`,
                }}
              >
                {template.name}
              </span>
              <span className={ui.badge} style={{ background: 'var(--hover)' }}>
                {item.featured ? '精选 · ' : ''}
                {item.source}
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
            <button className={`${ui.btn} ${ui.primary}`} onClick={copyAndEdit}>
              复制并修改
            </button>
          </div>
        </div>
        <Player key={id} animation={animation} template={template} variant="full" autoPlay />
      </main>

      {dialog === 'share' ? (
        <ShareDialog
          mode="link"
          title={animation.title}
          url={`${location.origin}/gallery/${item.id}`}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === 'export' ? (
        <ExportDialog animation={animation} template={template} onClose={() => setDialog(null)} />
      ) : null}
    </div>
  );
}
