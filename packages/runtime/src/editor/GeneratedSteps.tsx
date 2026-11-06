import type { Animation } from '@flow-see/core';
import { useEditor } from '../store/editor';
import s from './Editor.module.css';

import { t } from '@flow-see/core';
/** 由参数自动生成的步骤：只读列表，点击可在预览里跳到那一步 */
export function GeneratedSteps({ animation }: { animation: Animation }) {
  const { selectedId, select } = useEditor();
  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <h2 className={s.sectionTitle}>
          {t('generatedSteps.title', { n: animation.steps.length })}
        </h2>
        <span className={s.hint}>{t('generatedSteps.you_shang_mian_de')}</span>
      </div>
      <ol className={s.genList}>
        {animation.steps.map((st, i) => (
          <li key={st.id}>
            <button
              className={s.genItem}
              aria-current={st.id === selectedId ? 'step' : undefined}
              onClick={() => select(st.id)}
            >
              <span className={s.genNum}>{i + 1}</span>
              <span className={s.genText}>
                <span className={s.stepSummaryTitle}>{st.title}</span>
                <span className={s.stepSummaryDesc}>{st.desc}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
