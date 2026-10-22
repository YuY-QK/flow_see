import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Animation } from '@/engine';
import { Player } from '@/player/Player';
import { repository } from '@/services/storage';
import { getTemplate } from '@/templates/registry';
import { AppHeader } from '@/ui/AppHeader';
import ui from '@/ui/ui.module.css';
import { NotFound } from './NotFound';
import s from './Pages.module.css';

export function PlayPage() {
  const { id = '' } = useParams();
  const [animation, setAnimation] = useState<Animation | null | undefined>(undefined);

  useEffect(() => {
    repository.get(id).then((a) => setAnimation(a ?? null));
  }, [id]);

  if (animation === undefined) return null;
  if (animation === null) return <NotFound text="找不到这个作品，它可能已被删除。" />;
  const template = getTemplate(animation.templateId);
  if (!template) return <NotFound text="这个作品使用的模板暂不支持。" />;

  return (
    <div className={`${s.page} ${s.playPage}`}>
      <AppHeader>
        <Link to="/" className={`${ui.btn} ${ui.ghost}`}>
          我的作品
        </Link>
      </AppHeader>
      <main className={s.playMain}>
        <div className={s.playHead}>
          <h1 className={s.playTitle}>{animation.title || '未命名动画'}</h1>
          <span
            className={ui.badge}
            style={{
              background: `var(--tpl-${template.id}-bg)`,
              color: `var(--tpl-${template.id}-ink)`,
            }}
          >
            {template.name}
          </span>
          <Link to={`/edit/${animation.id}`} className={`${ui.btn} ${ui.primary}`}>
            编辑
          </Link>
        </div>
        <Player animation={animation} template={template} variant="full" />
      </main>
    </div>
  );
}
