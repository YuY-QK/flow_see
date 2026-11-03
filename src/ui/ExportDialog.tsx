import { useRef, useState } from 'react';
import type { Animation } from '@/engine';
import type { ExportFormat } from '@/services/export/encode';
import { saveFile } from '@/services/save';
import type { Template } from '@/templates/types';
import { Dialog } from './Dialog';
import ui from './ui.module.css';
import s from './Panels.module.css';

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
  { id: 'video', name: '视频', desc: '1280×720，适合放进 PPT、发给朋友' },
  { id: 'gif', name: 'GIF 动图', desc: '640×360，适合聊天和网页，文件较大时画质会降低' },
];

export function ExportDialog({ animation, template, onClose }: Props) {
  const [format, setFormat] = useState<ExportFormat>('video');
  const [phase, setPhase] = useState<Phase>({ kind: 'choose' });
  const abort = useRef<AbortController | null>(null);

  const start = async () => {
    abort.current = new AbortController();
    setPhase({ kind: 'working', stage: '准备中', progress: 0 });
    try {
      // 编码相关的代码较大，用到时才加载
      const { exportAnimation } = await import('@/services/export/encode');
      const { blob, filename } = await exportAnimation(animation, template, format, {
        signal: abort.current.signal,
        onProgress: (stage, progress) => setPhase({ kind: 'working', stage, progress }),
      });
      const r = await saveFile(blob, filename);
      setPhase({
        kind: 'done',
        how:
          r === 'shared'
            ? '已交给系统分享。'
            : r === 'cancelled'
              ? '已取消保存。'
              : `已下载：${filename}`,
      });
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') {
        setPhase({ kind: 'choose' });
        return;
      }
      setPhase({ kind: 'error', message: (e as Error).message || '导出失败，请重试。' });
    }
  };

  const close = () => {
    abort.current?.abort();
    onClose();
  };

  return (
    <Dialog title="导出" onClose={close}>
      {phase.kind === 'choose' ? (
        <>
          <div className={s.options} role="radiogroup" aria-label="导出格式">
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
          <p className={s.muted}>
            每一步会按朗读长度停留，画面下方带字幕。共 {animation.steps.length} 步。
          </p>
          <div className={s.actions}>
            <button className={ui.btn} onClick={close}>
              取消
            </button>
            <button className={`${ui.btn} ${ui.primary}`} onClick={start}>
              开始导出
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
              取消导出
            </button>
          </div>
        </>
      ) : phase.kind === 'done' ? (
        <>
          <p>{phase.how}</p>
          <div className={s.actions}>
            <button className={ui.btn} onClick={() => setPhase({ kind: 'choose' })}>
              再导出一个
            </button>
            <button className={`${ui.btn} ${ui.primary}`} onClick={close}>
              完成
            </button>
          </div>
        </>
      ) : (
        <div className={s.error} role="alert">
          <p>{phase.message}</p>
          <button className={ui.btn} onClick={() => setPhase({ kind: 'choose' })}>
            返回
          </button>
        </div>
      )}
    </Dialog>
  );
}
