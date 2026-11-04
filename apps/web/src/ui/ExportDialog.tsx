import { useRef, useState } from 'react';
import type { Animation } from '@flow-see/core';
import type { ExportFormat } from '@flow-see/runtime/services/export/encode.ts';
import { saveFile } from '@flow-see/runtime/services/save.ts';
import type { Template } from '@flow-see/runtime/template.ts';
import { Dialog } from './Dialog';
import ui from '@flow-see/runtime/ui/ui.module.css';
import s from './Panels.module.css';

import { t } from '@flow-see/core';
interface Props {
  animation: Animation;
  template: Template;
  onClose(): void;
}

type Phase =
  | { kind: 'choose' }
  | { kind: 'working'; stage: string; progress: number }
  | { kind: 'done'; how: string }
  | { kind: 'error'; message: string };

const FORMATS: { id: ExportFormat; name: string; desc: string }[] = [
  { id: 'video', name: t('exportDialog.shi_pin'), desc: t('exportDialog.shi_he_fang_jin') },
  { id: 'gif', name: t('exportDialog.dong_tu'), desc: t('exportDialog.shi_he_liao_tian') },
];

export function ExportDialog({ animation, template, onClose }: Props) {
  const [format, setFormat] = useState<ExportFormat>('video');
  const [phase, setPhase] = useState<Phase>({ kind: 'choose' });
  const abort = useRef<AbortController | null>(null);

  const start = async () => {
    abort.current = new AbortController();
    setPhase({ kind: 'working', stage: t('exportDialog.zhun_bei_zhong'), progress: 0 });
    try {
      // 编码相关的代码较大，用到时才加载
      const { exportAnimation } = await import('@flow-see/runtime/services/export/encode.ts');
      const { blob, filename } = await exportAnimation(animation, template, format, {
        signal: abort.current.signal,
        onProgress: (stage, progress) => setPhase({ kind: 'working', stage, progress }),
      });
      const r = await saveFile(blob, filename);
      setPhase({
        kind: 'done',
        how:
          r === 'shared'
            ? t('exportDialog.yi_jiao_gei_xi')
            : r === 'cancelled'
              ? t('exportDialog.yi_qu_xiao_bao')
              : t('exportDialog.downloaded', { filename }),
      });
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') {
        setPhase({ kind: 'choose' });
        return;
      }
      setPhase({
        kind: 'error',
        message: (e as Error).message || t('exportDialog.dao_chu_shi_bai'),
      });
    }
  };

  const close = () => {
    abort.current?.abort();
    onClose();
  };

  return (
    <Dialog title={t('common.dao_chu')} onClose={close}>
      {phase.kind === 'choose' ? (
        <>
          <div
            className={s.options}
            role="radiogroup"
            aria-label={t('exportDialog.dao_chu_ge_shi')}
          >
            {FORMATS.map((f) => (
              <button
                key={f.id}
                role="radio"
                aria-checked={format === f.id}
                className={s.option}
                onClick={() => setFormat(f.id)}
              >
                <strong>{f.name}</strong>
                <span>{f.desc}</span>
              </button>
            ))}
          </div>
          <p className={s.muted}>{t('exportDialog.note', { n: animation.steps.length })}</p>
          <div className={s.actions}>
            <button className={ui.btn} onClick={close}>
              {t('common.qu_xiao')}
            </button>
            <button className={`${ui.btn} ${ui.primary}`} onClick={start}>
              {t('exportDialog.kai_shi_dao_chu')}
            </button>
          </div>
        </>
      ) : phase.kind === 'working' ? (
        <>
          <p className={s.muted} aria-live="polite">
            {phase.stage}… {Math.round(phase.progress * 100)}%
          </p>
          <progress className={s.progress} value={phase.progress} max={1} />
          <div className={s.actions}>
            <button className={ui.btn} onClick={() => abort.current?.abort()}>
              {t('exportDialog.qu_xiao_dao_chu')}
            </button>
          </div>
        </>
      ) : phase.kind === 'done' ? (
        <>
          <p>{phase.how}</p>
          <div className={s.actions}>
            <button className={ui.btn} onClick={() => setPhase({ kind: 'choose' })}>
              {t('exportDialog.zai_dao_chu_yi')}
            </button>
            <button className={`${ui.btn} ${ui.primary}`} onClick={close}>
              {t('common.wan_cheng')}
            </button>
          </div>
        </>
      ) : (
        <div className={s.error} role="alert">
          <p>{phase.message}</p>
          <button className={ui.btn} onClick={() => setPhase({ kind: 'choose' })}>
            {t('exportDialog.fan_hui')}
          </button>
        </div>
      )}
    </Dialog>
  );
}
