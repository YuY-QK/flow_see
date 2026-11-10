import { useContext, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  AssetUrlContext,
  color,
  findSubitem,
  formatClockTime,
  getPart,
  isPoint,
  itemSetLayout,
  num,
  sceneStyle,
  type Handle,
  type PartContext,
  type Point,
  type Subitem,
} from '@flow-see/blocks';
import type { StageProps } from '@flow-see/runtime/template.ts';
import { evalExpr, findDropBin, normalizeAngle, t } from '@flow-see/core';
import {
  axisTransformMatrix,
  dragFrame,
  dragTargets,
  isAxis,
  sceneFrame,
  sortFrame,
  type SceneDef,
  type SceneObject,
  type SubHighlight,
} from './evaluate';
import { parseTargetRef } from './actions';

function formatHandleValue(val: number, prop: string, type: string): string {
  if (prop === 'seconds') {
    return `${Math.round(val)}s`;
  }
  if (type === 'clock' || prop === 'time') {
    return formatClockTime(val);
  }
  if (prop === 'angle' || prop === 'rotate' || prop === 'size') {
    return `${Math.round(val)}°`;
  }
  return String(Math.round(val * 10) / 10);
}

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
  viewBox,
}: StageProps & { def: SceneDef }) {
  const assetUrl = useContext(AssetUrlContext);
  const ctx: PartContext = useMemo(
    () => ({ theme, assetUrl, stage: def.stage }),
    [theme, assetUrl, def.stage],
  );
  const { width: W, height: H } = def.stage;
  const spec = def.tries?.[index];
  const doing = tryIt?.phase === 'doing' && !!spec;
  const dragging = doing && !!spec?.drag;
  const isSorting = doing && !!spec?.sort;
  const isTapping = Boolean(tryIt?.tap || (doing && spec?.tap));
  const isTurning = Boolean(tryIt?.turn || (doing && spec?.turn));
  const isPlacing = Boolean(tryIt?.place || (doing && spec?.place));
  const placeSpec = typeof tryIt?.place === 'object' ? tryIt.place : spec?.place;
  const placeTarget = placeSpec?.target;

  const svgRef = useRef<SVGSVGElement>(null);
  // 正在拖的计数块/物品：原来的序号、手指位置
  const [lift, setLift] = useState<{ index: number; at: Point; pointer: number } | undefined>();
  // 正在转动的把手
  const [turning, setTurning] = useState<{ handle: Handle; pointer: number } | undefined>();
  const [focusedProp, setFocusedProp] = useState<string | undefined>();

  // 拖到位：选中状态、拖动零件状态、转动把手状态与本地位置/角度
  const [selectedPlace, setSelectedPlace] = useState(false);
  const [placingDrag, setPlacingDrag] = useState<{
    startPointer: Point;
    startCenter: Point;
    pointer: number;
  }>();
  const [rotatingHandle, setRotatingHandle] = useState<{
    startPointer: Point;
    startAngle: number;
    pointer: number;
    startTime: number;
  }>();
  const [localPlacePos, setLocalPlacePos] = useState<Point | undefined>();
  const [localPlaceRotate, setLocalPlaceRotate] = useState<number | undefined>();

  const moved = tryIt?.moved;
  const placed = tryIt?.placed;
  const drag = useMemo(
    () => (dragging ? dragFrame(def, index, moved ?? [], lift?.index, placed) : undefined),
    [dragging, def, index, moved, lift?.index, placed],
  );
  const sort = useMemo(
    () => (isSorting ? sortFrame(def, index, moved ?? [], lift?.index, placed) : undefined),
    [isSorting, def, index, moved, lift?.index, placed],
  );
  // 等孩子动手时：提问前那一段动作按 tryIt.progress 放
  const shown = tryIt?.phase === 'doing' ? (tryIt.progress ?? 1) : progress;
  const frame = useMemo(
    () => sort ?? drag ?? sceneFrame(def, index, shown, tryIt?.phase),
    [sort, drag, def, index, shown, tryIt?.phase],
  );

  const toStage = (e: { clientX: number; clientY: number }): Point | undefined => {
    const m = svgRef.current?.getScreenCTM();
    if (!m) return undefined;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  };
  /** 放下的位置在哪个目标零件上（外面 dropPadding 以内也算）；都不在时为 undefined */
  const onTarget = (at: Point): string | undefined => {
    const pad = sceneStyle().tryIt.dropPadding;
    if (isSorting && sort) {
      const binBoxes = sort.to.map((to) => {
        const part = getPart(to.type);
        const box = part ? part.bbox(to.props) : { x: 0, y: 0, w: 0, h: 0 };
        return { id: to.id, box };
      });
      return findDropBin(at, binBoxes, pad);
    }
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
  const nextTarget = (itemIdx?: number): string | undefined => {
    if (spec?.sort) {
      if (itemIdx !== undefined && sort?.from) {
        const itemSlot = itemSetLayout(sort.from.props).slots.find((s) => s.index === itemIdx);
        const tagVal = itemSlot?.item.tags ? itemSlot.item.tags[spec.sort.by] : undefined;
        if (tagVal && spec.sort.bins[tagVal]) return spec.sort.bins[tagVal];
      }
      const binIds = Object.values(spec.sort.bins);
      return binIds[(moved?.length ?? 0) % Math.max(1, binIds.length)];
    }
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

  const onHandleDown = (e: PointerEvent, handle: Handle) => {
    const at = toStage(e);
    if (!at) return;
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    setTurning({ handle, pointer: e.pointerId });
  };
  const onHandleMove = (e: PointerEvent) => {
    if (!turning || e.pointerId !== turning.pointer) return;
    const at = toStage(e);
    if (at) {
      const val = turning.handle.valueAt(at);
      tryIt?.onTurn?.(val, false);
    }
  };
  const onHandleUp = (e: PointerEvent) => {
    if (!turning || e.pointerId !== turning.pointer) return;
    const at = toStage(e);
    const val = at ? turning.handle.valueAt(at) : turning.handle.min;
    setTurning(undefined);
    tryIt?.onTurn?.(val, true);
  };

  const onPlacingMove = (e: PointerEvent) => {
    if (!placingDrag || e.pointerId !== placingDrag.pointer) return;
    const at = toStage(e);
    if (at) {
      const dx = at[0] - placingDrag.startPointer[0];
      const dy = at[1] - placingDrag.startPointer[1];
      const nextPos: Point = [placingDrag.startCenter[0] + dx, placingDrag.startCenter[1] + dy];
      setLocalPlacePos(nextPos);
      tryIt?.onPlace?.(nextPos, currentRotate, false);
    }
  };
  const onPlacingUp = (e: PointerEvent) => {
    if (!placingDrag || e.pointerId !== placingDrag.pointer) return;
    const at = toStage(e) ?? placingDrag.startPointer;
    const dx = at[0] - placingDrag.startPointer[0];
    const dy = at[1] - placingDrag.startPointer[1];
    const finalPos: Point = [placingDrag.startCenter[0] + dx, placingDrag.startCenter[1] + dy];
    setPlacingDrag(undefined);
    setLocalPlacePos(undefined);
    tryIt?.onPlace?.(finalPos, currentRotate, true);
  };

  const onRotateHandleMove = (e: PointerEvent) => {
    if (!rotatingHandle || e.pointerId !== rotatingHandle.pointer) return;
    const at = toStage(e);
    if (at) {
      const angleDeg =
        (Math.atan2(at[1] - currentCenter[1], at[0] - currentCenter[0]) * 180) / Math.PI + 90;
      const step = sceneStyle().tryIt.rotateStep ?? 45;
      const snapped = Math.round(angleDeg / step) * step;
      const normalized = normalizeAngle(snapped);
      setLocalPlaceRotate(normalized);
      tryIt?.onPlace?.(currentCenter, normalized, false);
    }
  };
  const onRotateHandleUp = (e: PointerEvent) => {
    if (!rotatingHandle || e.pointerId !== rotatingHandle.pointer) return;
    const at = toStage(e) ?? rotatingHandle.startPointer;
    const movedDist = Math.hypot(
      at[0] - rotatingHandle.startPointer[0],
      at[1] - rotatingHandle.startPointer[1],
    );
    const duration = Date.now() - rotatingHandle.startTime;
    const step = sceneStyle().tryIt.rotateStep ?? 45;
    let finalRot = currentRotate;
    if (movedDist < 5 && duration < 300) {
      // 点一下转一档
      finalRot = normalizeAngle(currentRotate + step);
    }
    setRotatingHandle(undefined);
    setLocalPlaceRotate(undefined);
    tryIt?.onPlace?.(currentCenter, finalRot, true);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (lift && e.pointerId === lift.pointer) onMove(e);
    else if (turning && e.pointerId === turning.pointer) onHandleMove(e);
    else if (placingDrag && e.pointerId === placingDrag.pointer) onPlacingMove(e);
    else if (rotatingHandle && e.pointerId === rotatingHandle.pointer) onRotateHandleMove(e);
  };
  const handlePointerUp = (e: PointerEvent) => {
    if (lift && e.pointerId === lift.pointer) onUp(e);
    else if (turning && e.pointerId === turning.pointer) onHandleUp(e);
    else if (placingDrag && e.pointerId === placingDrag.pointer) onPlacingUp(e);
    else if (rotatingHandle && e.pointerId === rotatingHandle.pointer) onRotateHandleUp(e);
  };
  const handlePointerCancel = () => {
    setLift(undefined);
    setTurning(undefined);
    setPlacingDrag(undefined);
    setRotatingHandle(undefined);
    setLocalPlacePos(undefined);
    setLocalPlaceRotate(undefined);
  };

  const turnSpec = typeof tryIt?.turn === 'object' ? tryIt.turn : spec?.turn;
  const turnTarget = turnSpec?.target;
  const turnProp = turnSpec?.prop;

  const subColorsByPart = useMemo(() => {
    const map = new Map<string, Record<string, string>>();
    for (const sc of frame.subColors ?? []) {
      let m = map.get(sc.id);
      if (!m) {
        m = {};
        map.set(sc.id, m);
      }
      m[sc.name] = sc.color;
    }
    return map;
  }, [frame.subColors]);

  // 做错几次后：拖动高亮目标零件；点选高亮配置里指定的零件；sort 高亮分类筐
  const hint = new Set(
    spec?.drag
      ? dragTargets(spec.drag)
      : spec?.sort
        ? (() => {
            if (lift && sort?.from) {
              const slot = itemSetLayout(sort.from.props).slots.find(
                (s) => s.index === lift.index,
              );
              const tagVal = slot?.item.tags ? slot.item.tags[spec.sort.by] : undefined;
              const expectedBin = tagVal ? spec.sort.bins[tagVal] : undefined;
              if (expectedBin) return [expectedBin];
            }
            return Object.values(spec.sort.bins);
          })()
        : (spec?.choose?.show ?? []),
  );

  const initialTargetObj = frame.objects.find((o) => o.id === placeTarget);
  const initialPart = initialTargetObj ? getPart(initialTargetObj.type) : undefined;
  const initialBox =
    initialPart && initialTargetObj ? initialPart.bbox(initialTargetObj.props) : undefined;
  const initialCenter: Point = initialBox
    ? [initialBox.x + initialBox.w / 2, initialBox.y + initialBox.h / 2]
    : [0, 0];
  const initialRotate = Number(initialTargetObj?.props.rotate ?? 0);
  const [initialAtX, initialAtY] = isPoint(initialTargetObj?.props.at)
    ? (initialTargetObj!.props.at as Point)
    : [0, 0];

  const currentCenter: Point =
    localPlacePos ?? (tryIt?.placedPos as Point | undefined) ?? initialCenter;
  const currentRotate: number =
    localPlaceRotate ?? (tryIt?.placedRotate as number | undefined) ?? initialRotate;
  const objects = frame.objects.map((o) => {
    let obj = o;
    const extraColors = subColorsByPart.get(o.id);
    if (extraColors || obj.props._subColors) {
      obj = {
        ...obj,
        props: {
          ...obj.props,
          _subColors: {
            ...(obj.props._subColors as Record<string, string> | undefined),
            ...extraColors,
          },
        },
      };
    }
    if (doing && tryIt?.showTarget && hint.has(o.id)) {
      obj = { ...obj, props: { ...obj.props, highlight: 1 } };
    }
    if ((isTurning || tryIt?.turnValue !== undefined) && turnProp && o.id === turnTarget) {
      obj = { ...obj, props: { ...obj.props, [turnProp]: tryIt?.turnValue ?? o.props[turnProp] } };
    }
    if (isPlacing && o.id === placeTarget && tryIt?.phase !== 'solved') {
      const dx = currentCenter[0] - initialCenter[0];
      const dy = currentCenter[1] - initialCenter[1];
      obj = {
        ...obj,
        props: {
          ...obj.props,
          at: [initialAtX + dx, initialAtY + dy],
          rotate: currentRotate,
        },
      };
    }
    return obj;
  });

  const currentBox = useMemo(() => {
    if (!initialPart || !initialTargetObj) return { x: 0, y: 0, w: 0, h: 0 };
    const dx = currentCenter[0] - initialCenter[0];
    const dy = currentCenter[1] - initialCenter[1];
    const curProps = {
      ...initialTargetObj.props,
      at: [initialAtX + dx, initialAtY + dy],
      rotate: currentRotate,
    };
    return initialPart.bbox(curProps);
  }, [
    initialPart,
    initialTargetObj,
    currentCenter,
    initialCenter,
    initialAtX,
    initialAtY,
    currentRotate,
  ]);

  const hasRotate = placeSpec?.rotate !== undefined;
  const handleDist = Math.max(currentBox.h / 2 + 28, 40);
  const edgeDist = Math.max(currentBox.h / 2, 10);
  const angleRad = ((currentRotate - 90) * Math.PI) / 180;
  const stemStart: Point = [
    currentCenter[0] + edgeDist * Math.cos(angleRad),
    currentCenter[1] + edgeDist * Math.sin(angleRad),
  ];
  const handlePos: Point = [
    currentCenter[0] + handleDist * Math.cos(angleRad),
    currentCenter[1] + handleDist * Math.sin(angleRad),
  ];
  const hr = sceneStyle().tryIt.turnHandle ? sceneStyle().tryIt.turnHandle / 2 : 16;
  const showRotateBadge = Boolean(rotatingHandle || selectedPlace);
  const displayRot = `${Math.round(normalizeAngle(currentRotate))}°`;
  const pillW = Math.max(48, displayRot.length * 9 + 18);

  const goalObj = useMemo(() => {
    if (!isPlacing || !placeSpec?.showGoal || !initialTargetObj || tryIt?.phase === 'solved')
      return null;
    let targetPos: Point = [0, 0];
    if (Array.isArray(placeSpec.to) && placeSpec.to.length === 2) {
      targetPos = [Number(placeSpec.to[0]), Number(placeSpec.to[1])];
    } else if (typeof placeSpec.to === 'string') {
      const dest = frame.objects.find((o) => o.id === placeSpec.to);
      if (dest) {
        const p = getPart(dest.type);
        if (p) {
          const b = p.bbox(dest.props);
          targetPos = [b.x + b.w / 2, b.y + b.h / 2];
        }
      }
    }
    const goalRotate = placeSpec.rotate !== undefined ? Number(placeSpec.rotate) : 0;
    const goalDx = targetPos[0] - initialCenter[0];
    const goalDy = targetPos[1] - initialCenter[1];
    return {
      ...initialTargetObj,
      id: `${initialTargetObj.id}__goal`,
      props: {
        ...initialTargetObj.props,
        at: [initialAtX + goalDx, initialAtY + goalDy],
        rotate: goalRotate,
        fill: false,
        dashed: true,
        strokeColor: 'line',
        opacity: 0.85,
        highlight: 0,
      },
    };
  }, [
    isPlacing,
    placeSpec?.showGoal,
    placeSpec?.to,
    placeSpec?.rotate,
    initialTargetObj,
    tryIt?.phase,
    frame.objects,
    initialCenter,
    initialAtX,
    initialAtY,
  ]);

  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const subHints = useMemo(() => {
    if (!doing || !tryIt?.showTarget) return [];
    const res: SubHighlight[] = [];
    if (spec?.choose?.show) {
      for (const item of spec.choose.show) {
        const { id, sub } = parseTargetRef(item);
        if (!sub) continue;
        const obj = objects.find((o) => o.id === id);
        const part = obj ? getPart(obj.type) : undefined;
        if (!part || !obj) continue;
        const found = findSubitem(part, obj.props, sub);
        const items = Array.isArray(found) ? found : found ? [found] : [];
        for (const it of items) {
          res.push({ id, name: it.name, box: it.box, value: it.value });
        }
      }
    }
    if (spec?.tap) {
      if (spec.tap.answer) {
        const answers = Array.isArray(spec.tap.answer) ? spec.tap.answer : [spec.tap.answer];
        for (const ans of answers) {
          const { id, sub } = parseTargetRef(String(ans));
          const obj = objects.find((o) => o.id === id);
          const part = obj ? getPart(obj.type) : undefined;
          if (!part || !obj) continue;
          if (sub && part.subitems) {
            const found = findSubitem(part, obj.props, sub);
            const items = Array.isArray(found) ? found : found ? [found] : [];
            for (const it of items) {
              res.push({ id, name: it.name, box: it.box, value: it.value });
            }
          } else {
            res.push({ id, name: sub ?? '', box: part.bbox(obj.props) });
          }
        }
      } else if (spec.tap.valid && spec.tap.pick !== undefined) {
        const pick = Math.max(1, Math.round(Number(spec.tap.pick)));
        const params = (animation.params ?? {}) as Record<string, number>;
        for (const obj of objects) {
          const part = getPart(obj.type);
          if (!part) continue;
          const subs: Subitem[] = part.subitems
            ? part.subitems(obj.props)
            : [{ name: '', box: part.bbox(obj.props), value: (obj.props.value as number) ?? undefined }];
          for (const it of subs) {
            if (it.value !== undefined) {
              const r = evalExpr(spec.tap.valid, { ...params, n: it.value });
              if (r !== undefined && r !== 0) {
                res.push({ id: obj.id, name: it.name, box: it.box, value: it.value });
                if (res.length >= pick) break;
              }
            }
          }
          if (res.length >= pick) break;
        }
      }
    }
    return res;
  }, [doing, tryIt?.showTarget, spec?.choose?.show, spec?.tap, objects, animation.params]);

  const allSubHighlights = useMemo(
    () => [...(frame.subHighlights ?? []), ...subHints],
    [frame.subHighlights, subHints],
  );
  const targetObjects = turnTarget
    ? objects.filter((o) => o.id === turnTarget)
    : objects.filter((o) => !!getPart(o.type)?.handles);
  const src = drag?.from;
  const size = num(src?.props.size, 44);
  const { hitScale, liftScale } = sceneStyle().tryIt;
  const liftedColor = lift ? drag?.colors[lift.index] : undefined;
  const isInteracting = dragging || isSorting || isTurning || Boolean(placingDrag || rotatingHandle);

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox ? `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}` : `0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={t('common.stage_aria', { title: animation.title, n: index + 1 })}
      style={{
        fontFamily: theme.font,
        display: 'block', // 拖动时不滚动页面、不选中文字
        touchAction: isInteracting ? 'none' : undefined,
        userSelect: isInteracting ? 'none' : undefined,
        WebkitUserSelect: isInteracting ? 'none' : undefined,
      }}
      onPointerDown={(e) => {
        if (e.target === svgRef.current) setSelectedPlace(false);
      }}
      onPointerMove={isInteracting ? handlePointerMove : undefined}
      onPointerUp={isInteracting ? handlePointerUp : undefined}
      onPointerCancel={isInteracting ? handlePointerCancel : undefined}
    >
      <defs>
        <filter id="turn-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.25" />
        </filter>
      </defs>

      {goalObj ? (
        <g
          pointerEvents="none"
          stroke={color('line', theme)}
          strokeDasharray="8 6"
          strokeWidth={2}
          fill="none"
          opacity={0.85}
        >
          <PartView o={goalObj} ctx={ctx} theme={theme} />
        </g>
      ) : null}

      {objects.map((o) => (
        <PartView key={o.id} o={o} ctx={ctx} theme={theme} />
      ))}

      {allSubHighlights.map((sh, idx) => {
        const obj = objects.find((o) => o.id === sh.id);
        const opacity = Math.max(0, Math.min(1, num(obj?.props.opacity, 1)));
        if (!obj || opacity <= 0.001) return null;
        const { padX, padY, strokeWidth, fillOpacity, dash } = sceneStyle().highlight;
        const frameColor = color(sh.color ?? obj.props.hlColor, theme, 'accent');
        const box =
          sh.box ??
          (() => {
            const part = getPart(obj.type);
            if (!part) return undefined;
            const sub = findSubitem(part, obj.props, sh.name);
            return Array.isArray(sub) ? sub[0]?.box : sub?.box;
          })();
        if (!box) return null;
        return (
          <rect
            key={`sh-${idx}-${sh.id}-${sh.name}`}
            x={box.x - padX}
            y={box.y - padY}
            width={box.w + padX * 2}
            height={box.h + padY * 2}
            rx={Math.min(theme.radius, 18)}
            fill={frameColor}
            fillOpacity={fillOpacity}
            stroke={frameColor}
            strokeWidth={strokeWidth}
            strokeDasharray={dash}
            style={{ pointerEvents: 'none' }}
          >
            {doing && tryIt?.showTarget && !isReducedMotion ? (
              <animate
                attributeName="opacity"
                values={`1;${sceneStyle().blank.minOpacity};1`}
                dur={`${sceneStyle().blank.seconds}s`}
                repeatCount="indefinite"
              />
            ) : null}
          </rect>
        );
      })}

      {isTapping
        ? objects.map((o) => {
            const part = getPart(o.type);
            if (!part) return null;
            const subs: Subitem[] = part.subitems
              ? part.subitems(o.props)
              : [
                  {
                    name: '',
                    box: part.bbox(o.props),
                    label: (o.props.label as string) ?? o.id,
                    value: (o.props.value as number) ?? (o.props.val as number) ?? undefined,
                  },
                ];
            const tapSpec = typeof tryIt?.tap === 'object' ? tryIt.tap : spec?.tap;
            const among = tapSpec?.among;
            const pad = sceneStyle().tryIt.tapPadding;
            return subs.map((sub) => {
              const fullName = sub.name ? `${o.id}.${sub.name}` : o.id;
              const clickable =
                !sub.disabled &&
                (!among ||
                  among.some((pat) => {
                    if (pat === sub.name || pat === fullName || pat === o.id) return true;
                    if (pat.includes('*')) {
                      const re = new RegExp(
                        '^' +
                          pat
                            .split('*')
                            .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                            .join('.*') +
                          '$',
                      );
                      return re.test(sub.name) || re.test(fullName) || re.test(o.id);
                    }
                    return false;
                  }));
              if (!clickable) return null;
              const isTapped = Boolean(
                tryIt?.tapped?.includes(fullName) ||
                  tryIt?.tapped?.includes(o.id) ||
                  (sub.name && tryIt?.tapped?.includes(sub.name)),
              );
              const isWrong = Boolean(
                tryIt?.wrong &&
                  (tryIt.wrong === fullName ||
                    tryIt.wrong === o.id ||
                    (sub.name && tryIt.wrong === sub.name)),
              );
              const targetName = sub.name || undefined;
              return (
                <g
                  key={`tap-${o.id}-${sub.name || 'self'}`}
                  role="button"
                  tabIndex={0}
                  aria-label={t('a11y.subitem', { name: sub.label ?? sub.name ?? o.id })}
                  style={{ cursor: 'pointer' }}
                  data-tap-part={o.id}
                  data-tap-sub={targetName}
                  data-tap-wrong={isWrong ? 'true' : undefined}
                  onClick={() => tryIt?.onTap?.(o.id, targetName)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      tryIt?.onTap?.(o.id, targetName);
                    }
                  }}
                >
                  <rect
                    x={sub.box.x - pad}
                    y={sub.box.y - pad}
                    width={sub.box.w + pad * 2}
                    height={sub.box.h + pad * 2}
                    fill="transparent"
                  />
                  {isTapped ? (
                    <rect
                      x={sub.box.x}
                      y={sub.box.y}
                      width={sub.box.w}
                      height={sub.box.h}
                      rx={Math.min(theme.radius, 8)}
                      fill="none"
                      stroke={color('accent', theme)}
                      strokeWidth={sceneStyle().highlight.strokeWidth}
                    />
                  ) : null}
                </g>
              );
            });
          })
        : null}

      {isTurning && tryIt?.phase !== 'solved'
        ? targetObjects.map((targetObj) => {
            const part = getPart(targetObj.type);
            if (!part?.handles) return null;
            const handles = part.handles(targetObj.props);
            const activeHandles = turnProp
              ? handles.filter((h) => h.prop === turnProp)
              : handles;
            const hr = sceneStyle().tryIt.turnHandle;
            return activeHandles.map((handle, handleIdx) => {
              const currentVal =
                tryIt?.turnValue ?? num(targetObj.props[handle.prop], handle.min);
              const showBadge =
                turning?.handle === handle || focusedProp === `${handle.prop}-${handleIdx}`;
              const displayStr = formatHandleValue(currentVal, handle.prop, targetObj.type);
              const pillW = Math.max(48, displayStr.length * 9 + 18);
              return (
                <g
                  key={`handle-${targetObj.id}-${handle.prop}-${handleIdx}`}
                  role="slider"
                  tabIndex={0}
                  aria-label={t('a11y.handle', { name: handle.prop })}
                  aria-valuemin={handle.min}
                  aria-valuemax={handle.max}
                  aria-valuenow={currentVal}
                  style={{ cursor: 'grab' }}
                  data-handle-prop={handle.prop}
                  onFocus={() => setFocusedProp(`${handle.prop}-${handleIdx}`)}
                  onBlur={() => setFocusedProp(undefined)}
                  onPointerDown={(e) => onHandleDown(e, handle)}
                  onKeyDown={(e) => {
                    const step = num(turnSpec?.step, 1);
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      const next = Math.max(handle.min, currentVal - step);
                      tryIt?.onTurn?.(next, false);
                    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                      e.preventDefault();
                      const next = Math.min(handle.max, currentVal + step);
                      tryIt?.onTurn?.(next, false);
                    } else if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      tryIt?.onTurn?.(currentVal, true);
                    }
                  }}
                >
                  <circle
                    cx={handle.at[0]}
                    cy={handle.at[1]}
                    r={Math.max(hr, 22)}
                    fill="transparent"
                  />
                  <circle
                    cx={handle.at[0]}
                    cy={handle.at[1]}
                    r={hr}
                    fill={color('accent', theme)}
                    stroke={color('white', theme)}
                    strokeWidth={3}
                    filter="url(#turn-handle-shadow)"
                  />
                  {showBadge ? (
                    <g
                      transform={`translate(${handle.at[0]} ${handle.at[1] - hr - 14})`}
                      style={{ pointerEvents: 'none' }}
                    >
                      <rect
                        x={-pillW / 2}
                        y={-14}
                        width={pillW}
                        height={24}
                        rx={6}
                        fill={color('ink', theme)}
                        fillOpacity={0.88}
                      />
                      <text
                        x={0}
                        y={3}
                        textAnchor="middle"
                        fill={color('white', theme)}
                        fontSize={14}
                        fontWeight="bold"
                        fontFamily={theme.font}
                      >
                        {displayStr}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            });
          })
        : null}

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

      {doing && sort
        ? sort.items.map((it) => (
            <circle
              key={it.index}
              cx={it.at[0]}
              cy={it.at[1]}
              r={(it.box.w / 2) * hitScale}
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
                  tryIt?.onDrop?.(it.index, nextTarget(it.index));
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

      {doing && lift && sort && sort.from ? (
        <g
          transform={`translate(${lift.at[0]} ${lift.at[1]}) scale(${liftScale}) translate(${-lift.at[0]} ${-lift.at[1]})`}
          style={{ pointerEvents: 'none' }}
        >
          <PartView
            o={{
              id: `${sort.from.id}__lifted`,
              type: 'item-set',
              props: {
                ...sort.from.props,
                items: (() => {
                  const itemSlot = itemSetLayout(sort.from.props).slots.find(
                    (s) => s.index === lift.index,
                  );
                  return itemSlot ? [itemSlot.item] : [];
                })(),
                layout: 'row',
                cols: 1,
                size: num(sort.from.props.size, 56),
                at: [
                  lift.at[0] - num(sort.from.props.size, 56) / 2,
                  lift.at[1] - num(sort.from.props.size, 56) / 2,
                ],
                show: 1,
                hiddenItems: [],
                highlight: 0,
                opacity: 1,
              },
            }}
            ctx={ctx}
            theme={theme}
          />
        </g>
      ) : null}

      {isPlacing && tryIt?.phase !== 'solved' && initialTargetObj ? (
        <g data-place-target={placeTarget}>
          {/* 零件整体拖动区域 */}
          <rect
            x={currentBox.x - 8}
            y={currentBox.y - 8}
            width={currentBox.w + 16}
            height={currentBox.h + 16}
            rx={Math.min(theme.radius, 12)}
            fill="transparent"
            style={{ cursor: placingDrag ? 'grabbing' : 'grab' }}
            role="button"
            tabIndex={0}
            aria-label={t('a11y.handle', { name: initialPart?.name ?? placeTarget })}
            data-place-wrong={tryIt?.wrong === placeTarget ? 'true' : undefined}
            onFocus={() => setSelectedPlace(true)}
            onPointerDown={(e) => {
              const at = toStage(e);
              if (!at) return;
              e.preventDefault();
              svgRef.current?.setPointerCapture(e.pointerId);
              setSelectedPlace(true);
              setPlacingDrag({
                startPointer: at,
                startCenter: currentCenter,
                pointer: e.pointerId,
              });
            }}
            onKeyDown={(e) => {
              const step = sceneStyle().tryIt.rotateStep ?? 45;
              if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                const nextRot = normalizeAngle(currentRotate + step);
                tryIt?.onPlace?.(currentCenter, nextRot, true);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const nextPos: Point = [currentCenter[0] - 10, currentCenter[1]];
                tryIt?.onPlace?.(nextPos, currentRotate, false);
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const nextPos: Point = [currentCenter[0] + 10, currentCenter[1]];
                tryIt?.onPlace?.(nextPos, currentRotate, false);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const nextPos: Point = [currentCenter[0], currentCenter[1] - 10];
                tryIt?.onPlace?.(nextPos, currentRotate, false);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextPos: Point = [currentCenter[0], currentCenter[1] + 10];
                tryIt?.onPlace?.(nextPos, currentRotate, false);
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                tryIt?.onPlace?.(currentCenter, currentRotate, true);
              }
            }}
          />

          {/* 旋转把手：写了 rotate 且选中后显示 */}
          {hasRotate && selectedPlace ? (
            <g>
              <line
                x1={stemStart[0]}
                y1={stemStart[1]}
                x2={handlePos[0]}
                y2={handlePos[1]}
                stroke={color('accent', theme)}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              <g
                role="slider"
                tabIndex={0}
                aria-label={t('a11y.handle', { name: 'rotate' })}
                style={{ cursor: rotatingHandle ? 'grabbing' : 'grab' }}
                onPointerDown={(e) => {
                  const at = toStage(e);
                  if (!at) return;
                  e.preventDefault();
                  e.stopPropagation();
                  svgRef.current?.setPointerCapture(e.pointerId);
                  setRotatingHandle({
                    startPointer: at,
                    startAngle: currentRotate,
                    pointer: e.pointerId,
                    startTime: Date.now(),
                  });
                }}
                onKeyDown={(e) => {
                  const step = sceneStyle().tryIt.rotateStep ?? 45;
                  if (e.key === 'r' || e.key === 'R') {
                    e.preventDefault();
                    const nextRot = normalizeAngle(currentRotate + step);
                    tryIt?.onPlace?.(currentCenter, nextRot, true);
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextRot = normalizeAngle(currentRotate - step);
                    tryIt?.onPlace?.(currentCenter, nextRot, false);
                  } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const nextRot = normalizeAngle(currentRotate + step);
                    tryIt?.onPlace?.(currentCenter, nextRot, false);
                  } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    tryIt?.onPlace?.(currentCenter, currentRotate, true);
                  }
                }}
              >
                <circle
                  cx={handlePos[0]}
                  cy={handlePos[1]}
                  r={Math.max(hr, 22)}
                  fill="transparent"
                />
                <circle
                  cx={handlePos[0]}
                  cy={handlePos[1]}
                  r={hr}
                  fill={color('accent', theme)}
                  stroke={color('white', theme)}
                  strokeWidth={3}
                  filter="url(#turn-handle-shadow)"
                />
                {showRotateBadge ? (
                  <g
                    transform={`translate(${handlePos[0]} ${handlePos[1] - hr - 14})`}
                    style={{ pointerEvents: 'none' }}
                  >
                    <rect
                      x={-pillW / 2}
                      y={-14}
                      width={pillW}
                      height={24}
                      rx={6}
                      fill={color('ink', theme)}
                      fillOpacity={0.88}
                    />
                    <text
                      x={0}
                      y={3}
                      textAnchor="middle"
                      fill={color('white', theme)}
                      fontSize={14}
                      fontWeight="bold"
                      fontFamily={theme.font}
                    >
                      {displayRot}
                    </text>
                  </g>
                ) : null}
              </g>
            </g>
          ) : null}
        </g>
      ) : null}
    </svg>
  );
}

function round6(v: number): number {
  return Math.abs(v) < 1e-9 ? 0 : Number(v.toFixed(6));
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
  const selfTransform =
    scale !== 1 || rotate !== 0
      ? `translate(${cx} ${cy}) rotate(${rotate}) scale(${scale}) translate(${-cx} ${-cy})`
      : undefined;

  let flipTransform: string | undefined;
  if (!part.rotatesPoints && isAxis(o.props.mirrorAxis)) {
    const s = typeof o.props.flipScale === 'number' ? o.props.flipScale : -1;
    const [a, b, c, d, e, f] = axisTransformMatrix(o.props.mirrorAxis as [Point, Point], s);
    flipTransform = `matrix(${round6(a)} ${round6(b)} ${round6(c)} ${round6(d)} ${round6(e)} ${round6(f)})`;
  }

  const transform = [flipTransform, selfTransform].filter(Boolean).join(' ') || undefined;
  const { padX, padY, strokeWidth, fillOpacity, dash } = sceneStyle().highlight;
  // 高亮框的颜色：highlight 动作写了 color 就用它，否则用动画主题的强调色
  const frame = color(o.props.hlColor, theme, 'accent');
  return (
    <g opacity={opacity} transform={transform} data-part={o.id}>
      {hl > 0 ? (
        <rect
          x={b.x - padX}
          y={b.y - padY}
          width={b.w + padX * 2}
          height={b.h + padY * 2}
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
