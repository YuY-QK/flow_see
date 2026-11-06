// 舞台底部的工具条：点右下角的菜单按钮，工具条从舞台底部向上滑入；再点向下滑出，默认收起。
// 左边是文字按钮（演示、教我、换题），中间撑开，右边是图标按钮（分享、下载、全屏）。
// 点了某个功能后是否自动收起，由 site.yaml 的 player.toolbar.closeOnPick 决定。
import { useState, type KeyboardEvent } from 'react';
import { t } from '@flow-see/core';
import { Icon, type IconName } from '@flow-see/runtime/ui/Icon.tsx';
import { site } from '../site';
import s from './StageToolbar.module.css';

/** 右边的图标按钮 */
export interface ToolItem {
  id: string;
  icon: IconName;
  label: string;
  onClick(): void;
}

/** 左边的文字按钮；primary = 主按钮样式（如做完后的“换题”） */
export interface ToolText {
  id: string;
  label: string;
  onClick(): void;
  primary?: boolean;
}

interface Props {
  texts: ToolText[];
  icons: ToolItem[];
}

export function StageToolbar({ texts, icons }: Props) {
  const [open, setOpen] = useState(false);
  const pick = (fn: () => void) => () => {
    if (site.player.toolbar.closeOnPick) setOpen(false);
    fn();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  };
  const label = open ? t('lessonTools.close') : t('lessonTools.open');
  return (
    <div className={s.dock} data-open={open} onKeyDown={onKey}>
      <div className={s.bar} id="stage-toolbar" role="toolbar" aria-label={t('lessonTools.aria')}>
        {texts.map((it) => (
          <button
            key={it.id}
            className={s.text}
            data-primary={!!it.primary}
            tabIndex={open ? 0 : -1}
            onClick={pick(it.onClick)}
          >
            {it.label}
          </button>
        ))}
        <span className={s.gap} />
        {icons.map((it) => (
          <button
            key={it.id}
            className={s.icon}
            aria-label={it.label}
            title={it.label}
            tabIndex={open ? 0 : -1}
            onClick={pick(it.onClick)}
          >
            <Icon name={it.icon} size={20} />
          </button>
        ))}
      </div>
      <button
        className={s.menu}
        aria-label={label}
        aria-expanded={open}
        aria-controls="stage-toolbar"
        title={label}
        onClick={() => setOpen((v) => !v)}
        // 空格不要同时触发播放器的“播放/暂停”
        onKeyDown={(e) => {
          if (e.key === ' ') e.stopPropagation();
        }}
      >
        <Icon name={open ? 'close' : 'menu'} size={22} />
      </button>
    </div>
  );
}
