import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { addStep, moveStep, type Animation, t } from '@flow-see/core';
import { useEditor } from '../store/editor';
import type { Template } from '../template';
import { StepCard } from './StepCard';
import s from './Editor.module.css';

export function StepList({ animation, template }: { animation: Animation; template: Template }) {
  const { apply, select, selectedId } = useEditor();
  const [advanced, setAdvanced] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = animation.steps.findIndex((st) => st.id === active.id);
    const to = animation.steps.findIndex((st) => st.id === over.id);
    apply((a) => moveStep(a, from, to));
  };

  const onAdd = () => {
    const prev = animation.steps[animation.steps.length - 1];
    const next = addStep(animation, template.newStep(animation, prev));
    apply(() => next);
    select(next.steps[next.steps.length - 1].id);
  };

  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <h2 className={s.sectionTitle}>{t('stepList.bu_zhou')}</h2>
        <span className={s.hint}>{t('stepList.dian_yi_bu_lai')}</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={animation.steps.map((st) => st.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={s.steps}>
            {animation.steps.map((st, i) => (
              <StepCard
                key={st.id}
                step={st}
                index={i}
                template={template}
                selected={st.id === selectedId}
                showAdvanced={advanced}
                onToggleAdvanced={() => setAdvanced((v) => !v)}
                canDelete={animation.steps.length > 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button className={s.addStep} onClick={onAdd}>
        {t('stepList.tian_jia_yi_bu')}
      </button>
    </section>
  );
}
