import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  allParts,
  AssetUrlContext,
  color,
  sceneStyle,
  type Handle,
  type PartContext,
  type Point,
  type Props,
  type ResolvedPart,
} from '@flow-see/blocks';
import { getTheme, themeList, t, type ThemeId } from '@flow-see/core';
import { useSettings } from '@flow-see/runtime/store/settings.ts';
import { parse, stringify } from 'yaml';
import { assetUrl } from '../site';
import s from './DevParts.module.css';

function getInitialProps(part: ResolvedPart): Props {
  const isStart = part.anchor === 'start';
  const at: Point = isStart ? [100, 80] : [400, 225];
  const initial: Props = { ...part.defaults, at };

  if (part.type === 'text' && initial.text === undefined && initial.value === undefined) {
    initial.text = '123';
  } else if (part.type === 'fraction') {
    if (initial.num === undefined) initial.num = 1;
    if (initial.den === undefined) initial.den = 2;
  } else if (part.type === 'label' && initial.text === undefined) {
    initial.text = 'A';
  } else if (part.type === 'line' || part.type === 'arrow') {
    if (initial.from === undefined) initial.from = [200, 225];
    if (initial.to === undefined) initial.to = [600, 225];
  } else if (part.type === 'image' && initial.asset === undefined) {
    initial.asset = 'sun';
  } else if (part.type === 'wire' && initial.points === undefined) {
    initial.points = [
      [200, 225],
      [600, 225],
    ];
  } else if (part.type === 'split-calc') {
    if (initial.a === undefined) initial.a = 8;
    if (initial.b === undefined) initial.b = 5;
    if (initial.parts === undefined) initial.parts = [2, 3];
  } else if (part.type === 'column-calc') {
    if (initial.a === undefined) initial.a = 24;
    if (initial.b === undefined) initial.b = 18;
  } else if (part.type === 'money') {
    if (initial.items === undefined) {
      initial.items = [100, 50, 20, 10, 5, '1n', 1, 0.5, 0.1, 0.05, 0.01];
    }
  }
  return initial;
}

function getRange(
  prop: string,
  val: number,
  defaultVal: unknown,
  handle?: Handle,
): { min: number; max: number; step: number } {
  if (handle && typeof handle.min === 'number' && typeof handle.max === 'number') {
    const isSmall = handle.max - handle.min <= 1;
    return {
      min: handle.min,
      max: handle.max,
      step: prop === 'time' ? 1 : isSmall ? 0.01 : 1,
    };
  }
  const base = typeof defaultVal === 'number' ? defaultVal : val;
  const isZeroToOne =
    (base >= 0 &&
      base <= 1 &&
      (prop === 't' ||
        prop === 'draw' ||
        prop === 'phase' ||
        prop === 'lit' ||
        prop === 'opacity' ||
        !Number.isInteger(base))) ||
    (base === 0 && (prop === 't' || prop === 'draw' || prop === 'phase' || prop === 'lit'));

  if (isZeroToOne) {
    return { min: 0, max: 1, step: 0.01 };
  }
  if (prop === 'wholes') {
    return { min: 1, max: 5, step: 1 };
  }
  if (prop === 'subdivide') {
    return { min: 1, max: 6, step: 0.1 };
  }
  if (base > 1) {
    return { min: 0, max: Math.ceil(base * 3), step: Number.isInteger(base) ? 1 : 0.1 };
  }
  if (base === 0) {
    if (prop === 'angle' || prop === 'start' || prop === 'end') {
      return { min: 0, max: 360, step: 1 };
    }
    return { min: 0, max: 100, step: 1 };
  }
  if (base < 0) {
    return { min: Math.floor(base * 3), max: 0, step: Number.isInteger(base) ? 1 : 0.1 };
  }
  return { min: 0, max: 100, step: 1 };
}

function YamlPropField({
  propKey,
  value,
  onChange,
}: {
  propKey: string;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const formatVal = (v: unknown): string => {
    if (v === undefined || v === null) return '';
    if (typeof v === 'string') return v;
    return stringify(v).trim();
  };

  const [text, setText] = useState(() => formatVal(value));
  const [error, setError] = useState(false);

  useEffect(() => {
    setText(formatVal(value));
    setError(false);
  }, [value]);

  const handleBlur = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError(false);
      onChange(undefined);
      return;
    }
    try {
      const parsed = parse(trimmed);
      setError(false);
      onChange(parsed);
    } catch {
      setError(true);
    }
  };

  return (
    <div className={s.fieldGroup}>
      <div className={s.fieldLabel}>
        <span className={s.propName}>{propKey}</span>
        {error ? <span className={s.fieldError}>{t('dev.yaml_invalid')}</span> : null}
      </div>
      <textarea
        className={`${s.textarea} ${error ? s.fieldErrorBorder : ''}`}
        rows={typeof value === 'object' && value !== null ? 3 : 1}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(false);
        }}
        onBlur={handleBlur}
      />
    </div>
  );
}

export function DevPartsPage() {
  const partsList = useMemo(() => allParts(), []);
  const [selectedType, setSelectedType] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('part');
      if (q && partsList.some((p) => p.type === q)) return q;
    }
    const foundClock = partsList.find((p) => p.type === 'clock');
    return foundClock ? foundClock.type : partsList[0]?.type ?? 'text';
  });

  const currentPart = useMemo(
    () => partsList.find((p) => p.type === selectedType),
    [partsList, selectedType],
  );

  const [props, setProps] = useState<Props>(() =>
    currentPart ? getInitialProps(currentPart) : {},
  );

  useEffect(() => {
    if (currentPart) {
      setProps(getInitialProps(currentPart));
    }
  }, [currentPart]);

  const [animTheme, setAnimTheme] = useState<ThemeId>(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('theme') as ThemeId;
      if (['flat', 'cute', 'chalk', 'pro'].includes(q)) return q;
    }
    return 'cute';
  });
  const settingsUiTheme = useSettings((st) => st.uiTheme);
  const isDarkUi =
    settingsUiTheme === 'dark' ||
    (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark');

  const [showBBox, setShowBBox] = useState(true);
  const [showSubitems, setShowSubitems] = useState(true);
  const [showHandles, setShowHandles] = useState(true);
  const [copied, setCopied] = useState(false);

  const [draggingHandle, setDraggingHandle] = useState<
    { handle: Handle; pointerId: number } | undefined
  >();

  const svgRef = useRef<SVGSVGElement>(null);
  const theme = useMemo(() => getTheme(animTheme), [animTheme]);
  const ctx: PartContext = useMemo(() => ({ theme, assetUrl }), [theme]);

  const bbox = useMemo(() => {
    if (!currentPart?.bbox) return undefined;
    try {
      return currentPart.bbox(props);
    } catch {
      return undefined;
    }
  }, [currentPart, props]);

  const subitems = useMemo(() => {
    if (!currentPart?.subitems) return [];
    try {
      return currentPart.subitems(props);
    } catch {
      return [];
    }
  }, [currentPart, props]);

  const handles = useMemo(() => {
    if (!currentPart?.handles) return [];
    try {
      return currentPart.handles(props);
    } catch {
      return [];
    }
  }, [currentPart, props]);

  const toStageCoords = (e: PointerEvent): Point | undefined => {
    const m = svgRef.current?.getScreenCTM();
    if (!m) return undefined;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  };

  const onHandlePointerDown = (e: PointerEvent, handle: Handle) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingHandle({ handle, pointerId: e.pointerId });
  };

  const onStagePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!draggingHandle) return;
    const pt = toStageCoords(e);
    if (!pt) return;
    const { handle } = draggingHandle;
    if (handle.apply) {
      const next = handle.apply(props, pt);
      setProps(next);
    } else {
      const val = handle.valueAt(pt);
      setProps((prev) => ({ ...prev, [handle.prop]: val }));
    }
  };

  const onStagePointerUp = (e: PointerEvent<SVGSVGElement>) => {
    if (draggingHandle) {
      try {
        (e.target as Element).releasePointerCapture(draggingHandle.pointerId);
      } catch {
        // ignore
      }
      setDraggingHandle(undefined);
    }
  };

  const updateProp = (key: string, val: unknown) => {
    setProps((prev) => ({ ...prev, [key]: val }));
  };

  const handleCopyConfig = async () => {
    if (!currentPart) return;
    const item = {
      id: currentPart.type,
      type: currentPart.type,
      ...props,
    };
    const yamlText = stringify([item]);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(yamlText);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleResetProps = () => {
    if (!currentPart) return;
    setProps(getInitialProps(currentPart));
  };

  const toggleUiTheme = (target: 'light' | 'dark') => {
    useSettings.getState().set({ uiTheme: target });
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = target;
    }
  };

  const handleForProp = (key: string) => handles.find((h) => h.prop === key);

  return (
    <AssetUrlContext.Provider value={assetUrl}>
      <div className={s.container}>
        {/* 左栏：零件列表 */}
        <aside className={s.leftSidebar}>
          <div className={s.panelHeader}>
            <span>{t('dev.parts_list')}</span>
          </div>
          <div className={s.partList} role="tablist">
            {partsList.map((p) => {
              const active = p.type === selectedType;
              return (
                <button
                  key={p.type}
                  className={`${s.partItem} ${active ? s.partItemActive : ''}`}
                  onClick={() => setSelectedType(p.type)}
                  role="tab"
                  aria-selected={active}
                >
                  <span className={s.partType}>{p.type}</span>
                  <span className={s.partName}>{p.name}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* 中间：舞台与操作栏 */}
        <main className={s.centerStage}>
          <header className={s.toolbar}>
            <div className={s.toolGroup}>
              <span className={s.groupLabel}>{t('dev.title')}</span>
            </div>

            {/* 动画主题切换 */}
            <div className={s.toolGroup}>
              <span className={s.groupLabel}>{t('dev.theme')}</span>
              <div className={s.segment}>
                {themeList().map((th) => {
                  const active = th.id === animTheme;
                  return (
                    <button
                      key={th.id}
                      className={`${s.segmentBtn} ${active ? s.segmentBtnActive : ''}`}
                      onClick={() => setAnimTheme(th.id)}
                    >
                      {th.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 界面浅/深主题切换 */}
            <div className={s.toolGroup}>
              <span className={s.groupLabel}>{t('dev.ui_theme')}</span>
              <div className={s.segment}>
                <button
                  className={`${s.segmentBtn} ${!isDarkUi ? s.segmentBtnActive : ''}`}
                  onClick={() => toggleUiTheme('light')}
                >
                  {t('dev.theme_light')}
                </button>
                <button
                  className={`${s.segmentBtn} ${isDarkUi ? s.segmentBtnActive : ''}`}
                  onClick={() => toggleUiTheme('dark')}
                >
                  {t('dev.theme_dark')}
                </button>
              </div>
            </div>

            {/* 三个开关 */}
            <div className={s.toolGroup}>
              <label className={s.toggleLabel}>
                <input
                  type="checkbox"
                  className={s.checkbox}
                  checked={showBBox}
                  onChange={(e) => setShowBBox(e.target.checked)}
                />
                <span>{t('dev.show_bbox')}</span>
              </label>

              <label className={s.toggleLabel}>
                <input
                  type="checkbox"
                  className={s.checkbox}
                  checked={showSubitems}
                  onChange={(e) => setShowSubitems(e.target.checked)}
                />
                <span>{t('dev.show_subitems')}</span>
              </label>

              <label className={s.toggleLabel}>
                <input
                  type="checkbox"
                  className={s.checkbox}
                  checked={showHandles}
                  onChange={(e) => setShowHandles(e.target.checked)}
                />
                <span>{t('dev.show_handles')}</span>
              </label>
            </div>

            {/* 按钮 */}
            <div className={s.toolGroup}>
              <button className={s.actionBtn} onClick={handleResetProps}>
                {t('dev.reset_props')}
              </button>
              <button
                className={`${s.actionBtn} ${s.actionBtnPrimary}`}
                onClick={handleCopyConfig}
              >
                {copied ? t('dev.copied') : t('dev.copy_config')}
              </button>
            </div>
          </header>

          <div className={s.stageArea}>
            <div className={s.stageWrapper}>
              <svg
                ref={svgRef}
                viewBox="0 0 800 450"
                className={s.stageSvg}
                style={{ background: theme.stageBg }}
                onPointerMove={onStagePointerMove}
                onPointerUp={onStagePointerUp}
              >
                <rect
                  width={800}
                  height={450}
                  rx={theme.radius}
                  fill={theme.stageBg}
                  stroke={theme.stageBorder}
                  strokeWidth={1}
                />

                {/* 零件本体 */}
                {currentPart ? (
                  <g data-part={currentPart.type}>
                    <currentPart.Render p={props} ctx={ctx} />
                  </g>
                ) : null}

                {/* 包围盒 */}
                {showBBox && currentPart && bbox ? (
                  <g className={s.bboxLayer} pointerEvents="none" data-bbox="true">
                    <rect
                      x={bbox.x}
                      y={bbox.y}
                      width={bbox.w}
                      height={bbox.h}
                      fill="none"
                      stroke={color('accent', theme)}
                      strokeWidth={sceneStyle().highlight.strokeWidth}
                      strokeDasharray={sceneStyle().highlight.dash}
                    />
                    <text
                      x={bbox.x + 4}
                      y={Math.max(16, bbox.y - 4)}
                      className={s.svgLabel}
                      fill={color('accent', theme)}
                    >
                      {`${Math.round(bbox.w)} × ${Math.round(bbox.h)}`}
                    </text>
                  </g>
                ) : null}

                {/* 子项 */}
                {showSubitems && currentPart && subitems.length > 0 ? (
                  <g className={s.subitemsLayer} pointerEvents="none">
                    {subitems.map((sub) => (
                      <g key={sub.name} data-subitem={sub.name}>
                        <rect
                          x={sub.box.x}
                          y={sub.box.y}
                          width={sub.box.w}
                          height={sub.box.h}
                          fill="none"
                          stroke={color('blue', theme)}
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                        />
                        <rect
                          x={sub.box.x + 2}
                          y={sub.box.y + 2}
                          width={Math.max(24, sub.name.length * 8 + 6)}
                          height={14}
                          rx={3}
                          fill={color('blue', theme)}
                          fillOpacity={0.85}
                        />
                        <text
                          x={sub.box.x + 5}
                          y={sub.box.y + 12}
                          className={s.subitemLabel}
                          fill={color('white', theme)}
                        >
                          {sub.name}
                        </text>
                      </g>
                    ))}
                  </g>
                ) : null}

                {/* 把手 */}
                {showHandles && currentPart && handles.length > 0 ? (
                  <g className={s.handlesLayer}>
                    {handles.map((h, i) => (
                      <g
                        key={`${h.prop}-${i}`}
                        style={{ cursor: 'grab' }}
                        data-handle-prop={h.prop}
                        onPointerDown={(e) => onHandlePointerDown(e, h)}
                        onPointerMove={onStagePointerMove}
                        onPointerUp={onStagePointerUp}
                      >
                        <circle cx={h.at[0]} cy={h.at[1]} r={24} fill="transparent" />
                        <circle
                          cx={h.at[0]}
                          cy={h.at[1]}
                          r={sceneStyle().tryIt.turnHandle}
                          fill={color('accent', theme)}
                          stroke={color('white', theme)}
                          strokeWidth={3}
                        />
                      </g>
                    ))}
                  </g>
                ) : null}
              </svg>
            </div>

            <div className={s.stageInfo}>
              <span>{`${t('dev.stage_size')}: 800 × 450`}</span>
              <span>{`anchor: ${currentPart?.anchor ?? 'center'}`}</span>
              <span>{`at: [${(props.at as Point | undefined)?.[0] ?? 0}, ${(props.at as Point | undefined)?.[1] ?? 0}]`}</span>
            </div>
          </div>
        </main>

        {/* 右栏：属性编辑 */}
        <aside className={s.rightSidebar}>
          <div className={s.panelHeader}>
            <span>{t('dev.props_title')}</span>
          </div>

          <div className={s.propsScroll}>
            {/* 零件专属属性 */}
            <div className={s.propSection}>
              <span className={s.sectionTitle}>{currentPart?.type ?? ''}</span>

              {currentPart && currentPart.props.length > 0 ? (
                currentPart.props.map((propKey) => {
                  const currentVal = props[propKey];
                  const defaultVal = currentPart.defaults[propKey];
                  const handle = handleForProp(propKey);

                  const isBool =
                    typeof currentVal === 'boolean' ||
                    (currentVal === undefined && typeof defaultVal === 'boolean');

                  const isNum =
                    typeof currentVal === 'number' ||
                    (currentVal === undefined && typeof defaultVal === 'number');

                  if (isBool) {
                    const checked =
                      typeof currentVal === 'boolean' ? currentVal : Boolean(defaultVal);
                    return (
                      <div key={propKey} className={s.fieldGroup}>
                        <label className={s.switchLabel}>
                          <input
                            type="checkbox"
                            className={s.checkbox}
                            checked={checked}
                            onChange={(e) => updateProp(propKey, e.target.checked)}
                          />
                          <span className={s.propName}>{propKey}</span>
                        </label>
                      </div>
                    );
                  }

                  if (isNum) {
                    const numVal =
                      typeof currentVal === 'number'
                        ? currentVal
                        : typeof defaultVal === 'number'
                          ? defaultVal
                          : 0;
                    const { min, max, step } = getRange(propKey, numVal, defaultVal, handle);

                    return (
                      <div key={propKey} className={s.fieldGroup}>
                        <div className={s.fieldLabel}>
                          <span className={s.propName}>{propKey}</span>
                          <span>{numVal}</span>
                        </div>
                        <div className={s.numberControl}>
                          <input
                            type="range"
                            className={s.slider}
                            min={min}
                            max={max}
                            step={step}
                            value={numVal}
                            onChange={(e) => updateProp(propKey, Number(e.target.value))}
                          />
                          <input
                            type="number"
                            className={s.numberInput}
                            min={min}
                            max={max}
                            step={step}
                            value={numVal}
                            onChange={(e) => updateProp(propKey, Number(e.target.value))}
                          />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <YamlPropField
                      key={propKey}
                      propKey={propKey}
                      value={currentVal !== undefined ? currentVal : defaultVal}
                      onChange={(v) => updateProp(propKey, v)}
                    />
                  );
                })
              ) : (
                <div className={s.emptyHint}>{t('dev.no_props')}</div>
              )}
            </div>

            {/* 公共属性 */}
            <div className={s.propSection}>
              <span className={s.sectionTitle}>{t('dev.common_props')}</span>

              {/* color */}
              <div className={s.fieldGroup}>
                <div className={s.fieldLabel}>
                  <span className={s.propName}>color</span>
                </div>
                <input
                  type="text"
                  className={s.textInput}
                  value={typeof props.color === 'string' ? props.color : ''}
                  placeholder="blue, orange, ink..."
                  onChange={(e) => updateProp('color', e.target.value || undefined)}
                />
              </div>

              {/* opacity */}
              <div className={s.fieldGroup}>
                <div className={s.fieldLabel}>
                  <span className={s.propName}>opacity</span>
                  <span>{props.opacity !== undefined ? Number(props.opacity) : 1}</span>
                </div>
                <div className={s.numberControl}>
                  <input
                    type="range"
                    className={s.slider}
                    min={0}
                    max={1}
                    step={0.05}
                    value={props.opacity !== undefined ? Number(props.opacity) : 1}
                    onChange={(e) => updateProp('opacity', Number(e.target.value))}
                  />
                  <input
                    type="number"
                    className={s.numberInput}
                    min={0}
                    max={1}
                    step={0.05}
                    value={props.opacity !== undefined ? Number(props.opacity) : 1}
                    onChange={(e) => updateProp('opacity', Number(e.target.value))}
                  />
                </div>
              </div>

              {/* scale */}
              <div className={s.fieldGroup}>
                <div className={s.fieldLabel}>
                  <span className={s.propName}>scale</span>
                  <span>{props.scale !== undefined ? Number(props.scale) : 1}</span>
                </div>
                <div className={s.numberControl}>
                  <input
                    type="range"
                    className={s.slider}
                    min={0.2}
                    max={3}
                    step={0.1}
                    value={props.scale !== undefined ? Number(props.scale) : 1}
                    onChange={(e) => updateProp('scale', Number(e.target.value))}
                  />
                  <input
                    type="number"
                    className={s.numberInput}
                    min={0.2}
                    max={3}
                    step={0.1}
                    value={props.scale !== undefined ? Number(props.scale) : 1}
                    onChange={(e) => updateProp('scale', Number(e.target.value))}
                  />
                </div>
              </div>

              {/* rotate */}
              <div className={s.fieldGroup}>
                <div className={s.fieldLabel}>
                  <span className={s.propName}>rotate</span>
                  <span>{props.rotate !== undefined ? Number(props.rotate) : 0}°</span>
                </div>
                <div className={s.numberControl}>
                  <input
                    type="range"
                    className={s.slider}
                    min={0}
                    max={360}
                    step={1}
                    value={props.rotate !== undefined ? Number(props.rotate) : 0}
                    onChange={(e) => updateProp('rotate', Number(e.target.value))}
                  />
                  <input
                    type="number"
                    className={s.numberInput}
                    min={0}
                    max={360}
                    step={1}
                    value={props.rotate !== undefined ? Number(props.rotate) : 0}
                    onChange={(e) => updateProp('rotate', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AssetUrlContext.Provider>
  );
}
