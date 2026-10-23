import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
import s from './Dialog.module.css';

interface Props {
  title: string;
  onClose(): void;
  children: ReactNode;
}

/** 简单的对话框：点遮罩、按 Esc 或右上角关闭；手机上从底部弹出 */
export function Dialog({ title, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={s.wrap}>
      <button className={s.scrim} aria-label="关闭" onClick={onClose} tabIndex={-1} />
      <div
        className={s.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex={-1}
      >
        <div className={s.head}>
          <h2 className={s.title}>{title}</h2>
          <button className={s.close} aria-label="关闭" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
