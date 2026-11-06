import { useEffect, useRef } from 'react';
import { themeList, updateAnimation, type Animation, t } from '@flow-see/core';
import { useEditor } from '../store/editor';
import ui from '../ui/ui.module.css';
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
    <div className={s.popover} ref={ref} role="dialog" aria-label={t('common.wai_guan')}>
      <div className={s.popTitle}>{t('common.wai_guan')}</div>
      <div className={s.popLabel}>{t('appearancePanel.dong_hua_zhu_ti')}</div>
      <div className={s.themeGrid}>
        {themeList().map((theme) => (
          <button
            key={theme.id}
            className={s.themeBtn}
            aria-pressed={animation.themeId === theme.id}
            onClick={() => apply((a) => updateAnimation(a, { themeId: theme.id }))}
          >
            <span className={s.swatch} style={{ background: theme.stageBg }}>
              <span
                style={{ background: theme.palette[0], borderRadius: Math.min(theme.radius, 7) }}
              />
              <i style={{ background: theme.dim }} />
              <span
                style={{ background: theme.palette[1], borderRadius: Math.min(theme.radius, 7) }}
              />
            </span>
            {theme.name}
          </button>
        ))}
      </div>
      <div className={s.popRow}>
        <span>{t('common.zi_dong_lang_du')}</span>
        <button
          className={ui.toggle}
          role="switch"
          aria-label={t('common.zi_dong_lang_du')}
          aria-checked={animation.settings.autoNarrate}
          onClick={() => setSetting('autoNarrate', !animation.settings.autoNarrate)}
        />
      </div>
      <div className={s.popRow}>
        <span>
          {t('appearancePanel.guan_zhong_ke_yi')}
          <span className={s.popHint}>{t('appearancePanel.zhi_chi_can_shu')}</span>
        </span>
        <button
          className={ui.toggle}
          role="switch"
          aria-label={t('appearancePanel.guan_zhong_ke_yi')}
          aria-checked={animation.settings.allowParamEdit}
          onClick={() => setSetting('allowParamEdit', !animation.settings.allowParamEdit)}
        />
      </div>
    </div>
  );
}
