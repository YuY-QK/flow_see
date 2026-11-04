// 动手试一试（规格 P3）：点选换例子 + 滑块 / 按钮组 / 开关调参数。
// 控件、取值范围、例子都来自知识点配置，界面文字来自 site.yaml 的 explore.texts。
import { sliderRange, t, type ExploreControl, type Scope } from '@flow-see/core';
import ui from '@flow-see/runtime/ui/ui.module.css';
import s from './Lesson.module.css';

interface Props {
  controls: ExploreControl[];
  presets: { label: string; params: Scope }[];
  /** 当前取值（已含派生值） */
  values: Scope;
  /** 调过参数后可以“回到标准讲解” */
  changed: boolean;
  onChange(patch: Scope): void;
  onPreset(params: Scope): void;
  onReset(): void;
}

export function ExplorePanel({
  controls,
  presets,
  values,
  changed,
  onChange,
  onPreset,
  onReset,
}: Props) {
  return (
    <section className={s.explore} aria-label={t('explorePanel.title')}>
      <div className={s.exploreHead}>
        <h2 className={s.exploreTitle}>{t('explorePanel.title')}</h2>
        {changed ? (
          <button className={`${ui.btn} ${s.reset}`} onClick={onReset}>
            {t('explorePanel.reset')}
          </button>
        ) : null}
      </div>

      {presets.length ? (
        <div className={s.group}>
          <div className={s.groupLabel}>{t('explorePanel.presets')}</div>
          <div className={s.chips} role="group" aria-label={t('explorePanel.presets')}>
            {presets.map((p) => {
              const on = Object.entries(p.params).every(([k, v]) => values[k] === v);
              return (
                <button
                  key={p.label}
                  className={s.chip}
                  data-on={on}
                  aria-pressed={on}
                  onClick={() => onPreset(p.params)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {controls.length ? (
        <div className={s.group}>
          <div className={s.groupLabel}>{t('explorePanel.controls')}</div>
          <div className={s.controlList}>
            {controls.map((c) => (
              <Control key={c.param} c={c} values={values} onChange={onChange} />
            ))}
          </div>
        </div>
      ) : null}
      <p className={s.exploreHint}>{t('explorePanel.hint')}</p>
    </section>
  );
}

function Control({
  c,
  values,
  onChange,
}: {
  c: ExploreControl;
  values: Scope;
  onChange(patch: Scope): void;
}) {
  const v = values[c.param];
  if (c.control === 'slider') {
    const { min, max, step } = sliderRange(c, values);
    const id = `explore-${c.param}`;
    return (
      <div className={s.control}>
        <label htmlFor={id} className={s.controlLabel}>
          {c.label}
          <strong className={s.controlValue}>{String(v)}</strong>
        </label>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number(v)}
          disabled={min === max}
          aria-valuetext={`${c.label} ${String(v)}`}
          onChange={(e) => onChange({ [c.param]: Number(e.target.value) })}
        />
        <div className={s.controlRange} aria-hidden>
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  }
  if (c.control === 'buttons')
    return (
      <div className={s.control}>
        <div className={s.controlLabel}>{c.label}</div>
        <div className={s.chips} role="group" aria-label={c.label}>
          {(c.options ?? []).map((o) => (
            <button
              key={o.label}
              className={s.chip}
              data-on={o.value === v}
              aria-pressed={o.value === v}
              onClick={() => onChange({ [c.param]: o.value })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  return (
    <div className={s.control}>
      <label className={s.switchRow}>
        <span className={s.controlLabel}>{c.label}</span>
        <input
          type="checkbox"
          role="switch"
          checked={!!v}
          onChange={(e) => onChange({ [c.param]: e.target.checked })}
        />
      </label>
    </div>
  );
}
