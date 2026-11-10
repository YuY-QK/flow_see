// 动手做的“拖到位”（place）：判定与角度归一化。纯函数，浏览器和 Node 都能用。

export interface PlaceSpec {
  target: string;
  to: [number | string, number | string] | string;
  rotate?: number | string;
  tolerance?: number | string;
  showGoal?: boolean;
}

export interface PlaceResult {
  status: 'correct' | 'rotate' | 'wrong';
  correct: boolean;
  miss: boolean;
  needRotate: boolean;
  distance: number;
  angleDiff: number;
  targetPos: [number, number];
  targetRotate: number;
}

/**
 * 角度归一化到 [0, 360) 范围。
 */
export function normalizeAngle(deg: number): number {
  const mod = ((deg % 360) + 360) % 360;
  return Math.abs(mod - 360) < 1e-5 ? 0 : mod;
}

/**
 * 判定两个角度在模 360 下是否相同（例如 -90 与 270 视为相同）。
 */
export function isAngleEqual(a: number, b: number, eps = 1e-4): boolean {
  const na = normalizeAngle(a);
  const nb = normalizeAngle(b);
  const diff = Math.abs(na - nb);
  return diff < eps || Math.abs(diff - 360) < eps;
}

/**
 * 判定 place 结果：
 * 松手时零件锚点到 to 的距离 ≤ placeTolerance 且角度（取模 360）与 rotate 相同 → 吸附到准确位置、做对；
 * 位置对角度不对 → 停在原处，提示“转一转再放”（不计做错）；
 * 位置不对 → 弹回、做错一次。
 */
export function placeResult(
  spec: {
    to: [number | string, number | string] | string;
    rotate?: number | string;
    tolerance?: number | string;
  },
  currentPos: [number, number],
  currentRotate = 0,
  options?: {
    defaultTolerance?: number;
    targetPos?: [number, number];
  },
): PlaceResult {
  let targetPos: [number, number] = [0, 0];
  if (options?.targetPos) {
    targetPos = options.targetPos;
  } else if (Array.isArray(spec.to) && spec.to.length === 2) {
    targetPos = [Number(spec.to[0]), Number(spec.to[1])];
  }

  const tolerance =
    spec.tolerance !== undefined
      ? Math.max(0, Number(spec.tolerance))
      : (options?.defaultTolerance ?? 24);

  const dx = currentPos[0] - targetPos[0];
  const dy = currentPos[1] - targetPos[1];
  const distance = Math.hypot(dx, dy);
  const posMatch = distance <= tolerance;

  const hasRotate = spec.rotate !== undefined;
  const targetRotate = hasRotate ? Number(spec.rotate) : 0;
  const na1 = normalizeAngle(currentRotate);
  const na2 = normalizeAngle(targetRotate);
  const rawAngleDiff = Math.abs(na1 - na2);
  const angleDiff = Math.min(rawAngleDiff, 360 - rawAngleDiff);
  const angleMatch = !hasRotate || isAngleEqual(currentRotate, targetRotate);

  if (posMatch && angleMatch) {
    return {
      status: 'correct',
      correct: true,
      miss: false,
      needRotate: false,
      distance,
      angleDiff,
      targetPos,
      targetRotate,
    };
  }

  if (posMatch && !angleMatch) {
    return {
      status: 'rotate',
      correct: false,
      miss: false,
      needRotate: true,
      distance,
      angleDiff,
      targetPos,
      targetRotate,
    };
  }

  return {
    status: 'wrong',
    correct: false,
    miss: true,
    needRotate: false,
    distance,
    angleDiff,
    targetPos,
    targetRotate,
  };
}
