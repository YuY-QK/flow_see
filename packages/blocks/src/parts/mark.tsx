// 文字上的底块与空框：颜色标记的底块（高亮时衬在字后面）、要孩子答的数画成的虚线空框。
// 间距、圆角、闪烁都来自 site.yaml 的 scene.highlight / scene.blank，所有零件统一用这一套。
import { sceneStyle } from '../style';
import { blankRect, reducedMotion } from './markRect';

/**
 * 要孩子答的数：画成和数字一样大的虚线圆角空框，缓慢闪烁（用 SVG 动画改透明度；
 * 导出的静止帧里就是空框）。孩子答对后，数字才填上。
 */
export function BlankBox({
  cx,
  cy,
  textW,
  size,
  stroke,
}: {
  cx: number;
  cy: number;
  textW: number;
  size: number;
  stroke: string;
}) {
  const b = sceneStyle().blank;
  const r = blankRect(cx, cy, textW, size);
  return (
    <rect
      {...r}
      fill={stroke}
      fillOpacity={b.fillOpacity}
      stroke={stroke}
      strokeWidth={b.strokeWidth}
      strokeDasharray={b.dash}
      data-blank
    >
      {reducedMotion() ? null : (
        <animate
          attributeName="opacity"
          values={`1;${b.minOpacity};1`}
          dur={`${b.seconds}s`}
          repeatCount="indefinite"
        />
      )}
    </rect>
  );
}
