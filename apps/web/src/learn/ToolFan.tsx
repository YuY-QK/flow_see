// 舞台角上的工具扇形菜单：点主按钮，以它为圆心向外展开几个图标按钮；再点收起；按住可以拖到别处。
// 展开的方向跟着位置走：在舞台右半边就向左展开，在下半边就向上展开，不会超出舞台。
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { t } from '@flow-see/core';
import { Icon, type IconName } from '@flow-see/runtime/ui/Icon.tsx';
import s from './ToolFan.module.css';

export interface ToolItem {
  id: string;
  icon: IconName;
  label: string;
  onClick(): void;
}

/** 扇形的半径（主按钮中心到图标按钮中心，像素）。布局尺寸，不属于内容配置。 */
const RADIUS = 76;
/** 按下后移动超过这么远才算拖动，否则算点击（像素） */
const DRAG_SLOP = 6;
/** 拖动时离舞台边缘至少留多少（像素） */
const EDGE = 26;

export function ToolFan({ items }: { items: ToolItem[] }) {
  const [open, setOpen] = useState(false);
  // 拖动后的位置（占舞台宽、高的比例）；null = 默认在右下角
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const press = useRef<{ id: number; x: number; y: number; cx: number; cy: number } | null>(null);
  const moved = useRef(false);

  // 展开方向：向舞台里面展开
  const sx = pos && pos.x < 0.5 ? 1 : -1;
  const sy = pos && pos.y < 0.5 ? 1 : -1;

  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    const box = root.current?.parentElement?.getBoundingClientRect();
    const me = root.current?.getBoundingClientRect();
    if (!box || !me) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      cx: me.left + me.width / 2 - box.left,
      cy: me.top + me.height / 2 - box.top,
    };
    moved.current = false;
  };
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    const box = root.current?.parentElement?.getBoundingClientRect();
    if (!p || p.id !== e.pointerId || !box) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!moved.current && Math.hypot(dx, dy) < DRAG_SLOP) return;
    if (!moved.current) {
      moved.current = true;
      setDragging(true);
      setOpen(false);
    }
    const x = Math.max(EDGE, Math.min(box.width - EDGE, p.cx + dx));
    const y = Math.max(EDGE, Math.min(box.height - EDGE, p.cy + dy));
    setPos({ x: x / box.width, y: y / box.height });
  };
  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (press.current?.id !== e.pointerId) return;
    press.current = null;
    setDragging(false);
    if (!moved.current) setOpen((v) => !v);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  };

  const n = items.length;
  const style: CSSProperties = pos
    ? { left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }
    : { right: 'var(--fan-edge)', bottom: 'var(--fan-edge)' };

  return (
    <div
      ref={root}
      className={s.fan}
      data-open={open}
      data-dragging={dragging}
      data-free={!!pos}
      style={style}
      onKeyDown={onKey}
    >
      {items.map((it, i) => {
        // 在朝里的四分之一圆上平均排开：0° 在水平方向，90° 在竖直方向
        const deg = n === 1 ? 45 : (i / (n - 1)) * 90;
        const rad = (deg * Math.PI) / 180;
        const x = sx * RADIUS * Math.cos(rad);
        const y = sy * RADIUS * Math.sin(rad);
        return (
          <button
            key={it.id}
            className={s.item}
            style={{ '--x': `${x}px`, '--y': `${y}px`, '--i': i } as CSSProperties}
            aria-label={it.label}
            title={it.label}
            tabIndex={open ? 0 : -1}
            onClick={() => {
              setOpen(false);
              it.onClick();
            }}
          >
            <Icon name={it.icon} size={20} />
          </button>
        );
      })}
      <button
        className={s.main}
        aria-label={open ? t('lessonTools.close') : t('lessonTools.open')}
        aria-expanded={open}
        title={open ? t('lessonTools.close') : t('lessonTools.open')}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          press.current = null;
          setDragging(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation(); // 空格不要同时触发播放器的“播放/暂停”
            setOpen((v) => !v);
          }
        }}
      >
        <Icon name={open ? 'close' : 'more'} size={22} />
      </button>
    </div>
  );
}
