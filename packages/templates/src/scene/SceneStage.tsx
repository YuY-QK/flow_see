import { useContext, useMemo } from 'react';
import { AssetUrlContext, getPart, num, sceneStyle, type PartContext } from '@flow-see/blocks';
import type { StageProps } from '@flow-see/runtime/template.ts';
import { sceneFrame } from './evaluate';
import { sceneOf } from './scene';

import { t } from '@flow-see/core';
/** 场景舞台：纯函数，画面只由 (动画, 第几步, 步内进度) 决定 */
export function SceneStage({ animation, index, theme, progress = 1 }: StageProps) {
  const def = sceneOf(animation);
  const assetUrl = useContext(AssetUrlContext);
  const frame = useMemo(() => sceneFrame(def, index, progress), [def, index, progress]);
  const ctx: PartContext = useMemo(() => ({ theme, assetUrl }), [theme, assetUrl]);
  const { width: W, height: H } = def.stage;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={t('common.stage_aria', { title: animation.title, n: index + 1 })}
      style={{ fontFamily: theme.font, display: 'block' }}
    >
      {frame.objects.map((o) => {
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
        return (
          <g key={o.id} opacity={opacity} transform={transform} data-part={o.id}>
            {hl > 0 ? (
              <rect
                x={b.x - pad}
                y={b.y - pad}
                width={b.w + pad * 2}
                height={b.h + pad * 2}
                rx={Math.min(theme.radius, 18)}
                fill={theme.accent}
                fillOpacity={fillOpacity * hl}
                stroke={theme.accent}
                strokeWidth={strokeWidth}
                strokeOpacity={hl}
                strokeDasharray={dash}
              />
            ) : null}
            <part.Render p={o.props} ctx={ctx} />
          </g>
        );
      })}
    </svg>
  );
}
