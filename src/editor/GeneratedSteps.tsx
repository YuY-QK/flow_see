import type { Animation } from '@/engine';
import { useEditor } from '@/store/editor';
import s from './Editor.module.css';

/** 由参数自动生成的步骤：只读列表，点击可在预览里跳到那一步 */
export function GeneratedSteps({ animation }: { animation: Animation }) {
  const { selectedId, select } = useEditor();
  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <h2 className={s.sectionTitle}>步骤（共 {animation.steps.length} 步）</h2>
        <span className={s.hint}>由上面的参数自动生成，点一步可预览</span>
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
