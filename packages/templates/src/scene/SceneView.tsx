import { useContext, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  AssetUrlContext,
  color,
  getPart,
  num,
  sceneStyle,
  type PartContext,
  type Point,
} from '@flow-see/blocks';
import type { StageProps } from '@flow-see/runtime/template.ts';
import { t } from '@flow-see/core';
import {
  dragFrame,
  dragTargets,
  sceneFrame,
  type SceneDef,
  type SceneObject,
} from './evaluate';

/**
 * 场景画面：纯函数，画面只由 (场景, 第几步, 步内进度) 决定。
 * 动手做（tryIt）时：doing 停在这一步开头，孩子把计数块拖到目标上；solved 照常播放这一步，
 * 被孩子做掉的动作直接到位。
 */
export function SceneView({
  def,
  animation,
  index,
  theme,
  progress = 1,
  tryIt,
}: StageProps & { def: SceneDef }) {
  const assetUrl = useContext(AssetUrlContext);
  const ctx: PartContext = useMemo(() => ({ theme, assetUrl }), [theme, assetUrl]);
  const { width: W, height: H } = def.stage;
  const spec = def.tries?.[index];
  const doing = tryIt?.phase === 'doing' && !!spec;
  const dragging = doing && !!spec?.drag;
  const svgRef = useRef<SVGSVGElement>(null);
  // 正在拖的计数块：原来的序号、手指位置
  const [lift, setLift] = useState<{ index: number; at: Point; pointer: number } | undefined>();

  const moved = tryIt?.moved;
  const placed = tryIt?.placed;
  const drag = useMemo(
    () => (dragging ? dragFrame(def, index, moved ?? [], lift?.index, placed) : undefined),
    [dragging, def, index, moved, lift?.index, placed],
  );
  // 等孩子动手时：提问前那一段动作按 tryIt.progress 放
  const shown = tryIt?.phase === 'doing' ? (tryIt.progress ?? 1) : progress;
  const frame = useMemo(
    () => drag ?? sceneFrame(def, index, shown, tryIt?.phase),
    [drag, def, index, shown, tryIt?.phase],
  );

  const toStage = (e: PointerEvent): Point | undefined => {
    const m = svgRef.current?.getScreenCTM();
    if (!m) return undefined;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  };
  /** 放下的位置在哪个目标零件上（外面 dropPadding 以内也算）；都不在时为 undefined */
  const onTarget = (at: Point): string | undefined => {
    const pad = sceneStyle().tryIt.dropPadding;
    return drag?.to.find((to) => {
      const part = getPart(to.type);
      if (!part) return false;
      const b = part.bbox(to.props);
      return (
        at[0] >= b.x - pad &&
        at[0] <= b.x + b.w + pad &&
        at[1] >= b.y - pad &&
        at[1] <= b.y + b.h + pad
      );
    })?.id;
  };
  /** 键盘放下：按顺序放进下一个目标（一个一个分时轮流放） */
  const nextTarget = (): string | undefined => {
    const ids = spec?.drag ? dragTargets(spec.drag) : [];
    return ids[(moved?.length ?? 0) % Math.max(1, ids.length)];
  };

  const onDown = (e: PointerEvent, i: number) => {
    const at = toStage(e);
    if (!at) return;
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    setLift({ index: i, at, pointer: e.pointerId });
  };
  const onMove = (e: PointerEvent) => {
    if (!lift || e.pointerId !== lift.pointer) return;
    const at = toStage(e);
    if (at) setLift({ ...lift, at });
  };
  const onUp = (e: PointerEvent) => {
    if (!lift || e.pointerId !== lift.pointer) return;
    const at = toStage(e) ?? lift.at;
    setLift(undefined);
    tryIt?.onDrop?.(lift.index, onTarget(at));
  };

  // 做错几次后：拖动高亮目标零件；点选高亮配置里指定的零件
  const hint = new Set(spec?.drag ? dragTargets(spec.drag) : (spec?.choose?.show ?? []));
  const objects = frame.objects.map((o) =>
    doing && tryIt?.showTarget && hint.has(o.id)
      ? { ...o, props: { ...o.props, highlight: 1 } }
      : o,
  );
  const src = drag?.from;
  const size = num(src?.props.size, 44);
  const { hitScale, liftScale } = sceneStyle().tryIt;
  const liftedColor = lift ? drag?.colors[lift.index] : undefined;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={t('common.stage_aria', { title: animation.title, n: index + 1 })}
      style={{
        fontFamily: theme.font,
        display: 'block', // 拖动时不滚动页面、不选中文字
        touchAction: dragging ? 'none' : undefined,
        userSelect: dragging ? 'none' : undefined,
        WebkitUserSelect: dragging ? 'none' : undefined,
      }}
      onPointerMove={dragging ? onMove : undefined}
      onPointerUp={dragging ? onUp : undefined}
      onPointerCancel={dragging ? () => setLift(undefined) : undefined}
    >
      {objects.map((o) => (
        <PartView key={o.id} o={o} ctx={ctx} theme={theme} />
      ))}

      {doing && drag
        ? drag.items.map((it) => (
            <circle
              key={it.index}
              cx={it.at[0]}
              cy={it.at[1]}
              r={(size / 2) * hitScale}
              fill="transparent"
              style={{ cursor: 'grab' }}
              role="button"
              tabIndex={0}
              aria-label={t('handsOn.drag_item_aria')}
              data-try-item={it.index}
              onPointerDown={(e) => onDown(e, it.index)}
              onKeyDown={(e) => {
                // 键盘：回车或空格直接放进目标
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  tryIt?.onDrop?.(it.index, nextTarget());
                }
              }}
            />
          ))
        : null}

      {doing && lift && src ? (
        <g
          transform={`translate(${lift.at[0]} ${lift.at[1]}) scale(${liftScale}) translate(${-lift.at[0]} ${-lift.at[1]})`}
          style={{ pointerEvents: 'none' }}
        >
          <PartView
            o={{
              ...src,
              props: {
                ...src.props,
                count: 1,
                items: [lift.at],
                colors: liftedColor ? [liftedColor] : undefined,
                highlight: 0,
                opacity: 1,
              },
            }}
            ctx={ctx}
            theme={theme}
          />
        </g>
      ) : null}
    </svg>
  );
}

function PartView({
  o,
  ctx,
  theme,
}: {
  o: SceneObject;
  ctx: PartContext;
  theme: StageProps['theme'];
}) {
  const part = getPart(o.type);
  const opacity = Math.max(0, Math.min(1, num(o.props.opacity, 1)));
  if (!part || opacity <= 0.001) return null;
  const b = part.bbox(o.props);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const scale = num(o.props.scale, 1);
  const rotate = num(o.props.rotate, 0);
  const hl = Math.max(0, Math.min(1, num(o.props.highlight, 0)));
  const transform =
    scale !== 1 || rotate !== 0
      ? `translate(${cx} ${cy}) rotate(${rotate}) scale(${scale}) translate(${-cx} ${-cy})`
      : undefined;
  const { padding: pad, strokeWidth, fillOpacity, dash } = sceneStyle().highlight;
  // 高亮框的颜色：highlight 动作写了 color 就用它，否则用动画主题的强调色
  const frame = color(o.props.hlColor, theme, 'accent');
  return (
    <g opacity={opacity} transform={transform} data-part={o.id}>
      {hl > 0 ? (
        <rect
          x={b.x - pad}
          y={b.y - pad}
          width={b.w + pad * 2}
          height={b.h + pad * 2}
          rx={Math.min(theme.radius, 18)}
          fill={frame}
          fillOpacity={fillOpacity * hl}
          stroke={frame}
          strokeWidth={strokeWidth}
          strokeOpacity={hl}
          strokeDasharray={dash}
        />
      ) : null}
      <part.Render p={o.props} ctx={ctx} />
    </g>
  );
}
