import { useEffect, useRef } from 'react';
import { THEME_LIST, updateAnimation, type Animation } from '@/engine';
import { useEditor } from '@/store/editor';
import ui from '@/ui/ui.module.css';
import s from './Editor.module.css';

export function AppearancePanel({ animation, onClose }: { animation: Animation; onClose(): void }) {
  const apply = useEditor((st) => st.apply);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!ref.current?.contains(t) && !t.closest('[data-appearance-toggle]')) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const setSetting = (k: keyof Animation['settings'], v: boolean) =>
    apply((a) => updateAnimation(a, { settings: { ...a.settings, [k]: v } }));

  return (
    <div className={s.popover} ref={ref} role="dialog" aria-label="外观">
      <div className={s.popTitle}>外观</div>
      <div className={s.popLabel}>动画主题</div>
      <div className={s.themeGrid}>
        {THEME_LIST.map((t) => (
          <button
            key={t.id}
            className={s.themeBtn}
            aria-pressed={animation.themeId === t.id}
            onClick={() => apply((a) => updateAnimation(a, { themeId: t.id }))}
          >
            <span className={s.swatch} style={{ background: t.stageBg }}>
              <span style={{ background: t.palette[0], borderRadius: Math.min(t.radius, 7) }} />
              <i style={{ background: t.dim }} />
              <span style={{ background: t.palette[1], borderRadius: Math.min(t.radius, 7) }} />
            </span>
            {t.name}
          </button>
        ))}
      </div>
      <div className={s.popRow}>
        <span>自动朗读每一步</span>
        <button
          className={ui.toggle}
          role="switch"
          aria-label="自动朗读每一步"
          aria-checked={animation.settings.autoNarrate}
          onClick={() => setSetting('autoNarrate', !animation.settings.autoNarrate)}
        />
      </div>
      <div className={s.popRow}>
        <span>
          观众可以改参数
          <span className={s.popHint}>（支持参数的模板生效）</span>
        </span>
        <button
          className={ui.toggle}
          role="switch"
          aria-label="观众可以改参数"
          aria-checked={animation.settings.allowParamEdit}
          onClick={() => setSetting('allowParamEdit', !animation.settings.allowParamEdit)}
        />
      </div>
    </div>
  );
}
