import { addElement, getTheme, removeElement, renameElement, type Animation } from '@/engine';
import { useEditor } from '@/store/editor';
import type { Template } from '@/templates/types';
import { Icon } from '@/ui/Icon';
import s from './Editor.module.css';

export function ElementsEditor({
  animation,
  template,
}: {
  animation: Animation;
  template: Template;
}) {
  const apply = useEditor((st) => st.apply);
  const palette = getTheme(animation.themeId).palette;
  const { elements } = animation;
  const noun = template.elementNoun;

  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <h2 className={s.sectionTitle}>{noun}</h2>
      </div>
      <div className={s.chips}>
        {elements.map((e, i) => (
          <div className={s.chip} key={e.id}>
            <span className={s.dot} style={{ background: palette[i % palette.length] }} />
            <input
              className={s.chipInput}
              value={e.name}
              aria-label={`${noun} ${i + 1} 的名字`}
              placeholder={`${noun} ${i + 1}`}
              size={Math.max(3, e.name.length + 1)}
              onChange={(ev) => apply((a) => renameElement(a, e.id, ev.target.value))}
            />
            {elements.length > template.minElements ? (
              <button
                className={s.chipRemove}
                aria-label={`删除${noun}「${e.name}」`}
                onClick={() => apply((a) => removeElement(a, e.id))}
              >
                <Icon name="close" size={14} />
              </button>
            ) : null}
          </div>
        ))}
        {elements.length < template.maxElements ? (
          <button
            className={s.chipAdd}
            onClick={() => apply((a) => addElement(a, `${noun} ${a.elements.length + 1}`))}
          >
            + 添加{noun}
          </button>
        ) : null}
      </div>
      {template.elementHint ? <p className={s.elementHint}>{template.elementHint}</p> : null}
    </section>
  );
}
