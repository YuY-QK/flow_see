import { MotionConfig } from 'motion/react';
import { getTheme, type Animation } from '@/engine';
import { getTemplate } from '@/templates/registry';
import s from './Panels.module.css';

/** 作品卡片上的迷你预览：画出最后一步的静止画面 */
export function Thumb({ animation, className }: { animation: Animation; className?: string }) {
  const template = getTemplate(animation.templateId);
  const theme = getTheme(animation.themeId);
  const Stage = template?.Stage;
  return (
    <div
      className={`${s.thumb} ${className ?? ''}`}
      style={{ background: theme.stageBg }}
      aria-hidden="true"
    >
      {Stage && animation.steps.length ? (
        <MotionConfig reducedMotion="always">
          <div>
            <Stage animation={animation} index={animation.steps.length - 1} theme={theme} still />
          </div>
        </MotionConfig>
      ) : null}
    </div>
  );
}
