// 自己做时舞台上方的出题参数面板：右上角一个齿轮，点开后面板从舞台顶部向下滑入，再点向上滑出。
// 面板里是一排“块”，每块两行：上面是标签（如“大数”），下面是调节（减号、可直接输入的数字、加号）。
// 控件、范围来自知识点配置的 explore。
import { useState } from 'react';
import { sliderRange, t, type ExploreControl, type Scope } from '@flow-see/core';
import { Icon } from '@flow-see/runtime/ui/Icon.tsx';
import { snapToRange } from './snapToRange';
import s from './StageControls.module.css';

export interface ParamsPanelProps {
  controls: ExploreControl[];
  /** 当前取值（已含派生值） */
  values: Scope;
  onChange(patch: Scope): void;
  /** 已经开始做这道题：做完之前不能再调 */
  locked?: boolean;
}

interface Props extends ParamsPanelProps {
  open: boolean;
  onToggle(): void;
}

/** 可以直接输入的数字：输入过程中不收回，失焦或回车时按范围收回 */
function NumberInput({
  value,
  min,
  max,
  step,
  label,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onCommit(v: number): void;
}) {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const n = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(n)) return setDraft(String(value));
    const next = snapToRange(n, min, max, step);
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };
  return (
    <input
      className={s.num}
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={draft}
      size={Math.max(2, String(max).length)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        // 回车确认；空格、方向键不要触发播放器的快捷键
        e.stopPropagation();
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}

export function StageControls({ controls, values, onChange, locked, open, onToggle }: Props) {
  const title = open ? t('handsOn.params_close') : t('handsOn.params_open');
  return (
    <div className={s.dock} data-open={open}>
      <div className={s.panel} id="stage-params">
        <fieldset
          className={s.blocks}
          disabled={locked}
          aria-label={t('handsOn.controls_aria')}
          title={locked ? t('handsOn.controls_locked') : undefined}
        >
          {controls.map((c) => {
            const v = values[c.param];
            if (c.control === 'slider') {
              const { min, max, step } = sliderRange(c, values);
              const n = Number(v);
              return (
                <div key={c.param} className={s.block}>
                  <span className={s.label}>{c.label}</span>
                  <div className={s.stepper}>
                    <button
                      aria-label={t('handsOn.minus', { name: c.label })}
                      disabled={n - step < min}
                      tabIndex={open ? 0 : -1}
                      onClick={() => onChange({ [c.param]: n - step })}
                    >
                      −
                    </button>
                    <NumberInput
                      // 值被别处改了（点加减、换题）时重新挂载，输入框跟着变
                      key={n}
                      value={n}
                      min={min}
                      max={max}
                      step={step}
                      label={c.label}
                      onCommit={(next) => onChange({ [c.param]: next })}
                    />
                    <button
                      aria-label={t('handsOn.plus', { name: c.label })}
                      disabled={n + step > max}
                      tabIndex={open ? 0 : -1}
                      onClick={() => onChange({ [c.param]: n + step })}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            }
            if (c.control === 'buttons')
              return (
                <div key={c.param} className={s.block}>
                  <span className={s.label}>{c.label}</span>
                  <div className={s.chips}>
                    {(c.options ?? []).map((o) => (
                      <button
                        key={o.label}
                        data-on={o.value === v}
                        aria-pressed={o.value === v}
                        tabIndex={open ? 0 : -1}
                        onClick={() => onChange({ [c.param]: o.value })}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            return (
              <label key={c.param} className={s.block}>
                <span className={s.label}>{c.label}</span>
                <input
                  className={s.switch}
                  type="checkbox"
                  role="switch"
                  checked={!!v}
                  tabIndex={open ? 0 : -1}
                  onChange={(e) => onChange({ [c.param]: e.target.checked })}
                />
              </label>
            );
          })}
        </fieldset>
      </div>
      <button
        className={s.gear}
        aria-label={title}
        aria-expanded={open}
        aria-controls="stage-params"
        title={title}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === ' ') e.stopPropagation();
        }}
      >
        <Icon name="settings" size={20} />
      </button>
    </div>
  );
}
