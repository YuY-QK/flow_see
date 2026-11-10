// 动手做：点选零件（tap）的判定与“看我做一遍”目标计算。纯函数，浏览器和 Node 都能用。
import { evalExpr } from './params.ts';

export interface TapSpec {
  answer?: (string | number)[] | string | number;
  among?: string[];
  pick?: number | string;
  valid?: string;
}

export interface TapSubitem {
  id?: string;
  name: string;
  value?: number;
}

export interface TapResult {
  status: 'correct' | 'wrong' | 'repeat' | 'ignored';
  correct: boolean;
  miss: boolean;
  solved: boolean;
  tapped: string[];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchPattern(pat: string, target: string): boolean {
  if (pat === target) return true;
  const dot = target.indexOf('.');
  const sub = dot === -1 ? '' : target.slice(dot + 1);
  const id = dot === -1 ? target : target.slice(0, dot);
  if (pat === sub || pat === id) return true;
  if (pat.includes('*')) {
    const re = new RegExp('^' + pat.split('*').map(escapeRegex).join('.*') + '$');
    return re.test(target) || (sub ? re.test(sub) : false) || re.test(id);
  }
  return false;
}

export function isAnswerMatch(ans: string, target: string): boolean {
  if (ans === target) return true;
  const ansDot = ans.indexOf('.');
  const targetDot = target.indexOf('.');
  const ansSub = ansDot === -1 ? '' : ans.slice(ansDot + 1);
  const targetSub = targetDot === -1 ? '' : target.slice(targetDot + 1);
  if (ansSub && targetSub) return ans === target || ansSub === targetSub;
  if (ansSub && !targetDot) return ansSub === target;
  if (!ansDot && targetSub) return ans === targetSub;
  return false;
}

export function tapDemoAnswers(
  spec: TapSpec,
  subitems: TapSubitem[] = [],
  scope: Record<string, number> = {},
): string[] {
  if (spec.answer) {
    return Array.isArray(spec.answer) ? spec.answer.map(String) : [String(spec.answer)];
  }
  if (spec.valid && spec.pick !== undefined) {
    const pick = Math.max(1, Math.round(Number(spec.pick)));
    const matching: string[] = [];
    for (const sub of subitems) {
      const fullName = sub.id ? `${sub.id}.${sub.name}` : sub.name;
      if (spec.among && spec.among.length > 0) {
        if (!spec.among.some((pat) => matchPattern(pat, fullName))) continue;
      }
      if (sub.value !== undefined) {
        const val = evalExpr(spec.valid, { ...scope, n: sub.value });
        if (val !== undefined && val !== 0) {
          matching.push(fullName);
          if (matching.length >= pick) break;
        }
      }
    }
    return matching;
  }
  return [];
}

export function tapResult(
  spec: TapSpec,
  tapped: string | string[] | { target: string; current?: string[] },
  arg3?: TapSubitem[] | string[] | Record<string, unknown>,
  arg4?: TapSubitem[] | Record<string, unknown>,
  arg5?: Record<string, unknown>,
): TapResult {
  let target = '';
  let current: string[] = [];
  let subitems: TapSubitem[] = [];
  let scope: Record<string, number> = {};

  if (typeof tapped === 'string') {
    target = tapped;
    if (Array.isArray(arg3) && (arg3.length === 0 || typeof arg3[0] === 'string')) {
      current = arg3 as string[];
      subitems = (Array.isArray(arg4) ? arg4 : []) as TapSubitem[];
      scope = (arg5 ?? {}) as Record<string, number>;
    } else {
      current = [];
      subitems = (Array.isArray(arg3) ? arg3 : []) as TapSubitem[];
      scope = (arg4 ?? {}) as Record<string, number>;
    }
  } else if (Array.isArray(tapped)) {
    if (tapped.length === 0) {
      return { status: 'ignored', correct: false, miss: false, solved: false, tapped: [] };
    }
    target = tapped[tapped.length - 1];
    current = tapped.slice(0, -1);
    subitems = (Array.isArray(arg3) ? arg3 : []) as TapSubitem[];
    scope = (arg4 ?? {}) as Record<string, number>;
  } else if (typeof tapped === 'object' && tapped !== null && 'target' in tapped) {
    target = tapped.target;
    current = tapped.current ?? [];
    subitems = (Array.isArray(arg3) ? arg3 : []) as TapSubitem[];
    scope = (arg4 ?? {}) as Record<string, number>;
  }

  const isAlreadyTapped = current.some((t) => isAnswerMatch(t, target));
  if (isAlreadyTapped) {
    return {
      status: 'repeat',
      correct: false,
      miss: false,
      solved: false,
      tapped: current,
    };
  }

  if (spec.among && spec.among.length > 0) {
    const isClickable = spec.among.some((pat) => matchPattern(pat, target));
    if (!isClickable) {
      return {
        status: 'ignored',
        correct: false,
        miss: false,
        solved: false,
        tapped: current,
      };
    }
  } else if (subitems.length > 0) {
    const exists = subitems.some((s) => {
      const full = s.id ? `${s.id}.${s.name}` : s.name;
      return isAnswerMatch(full, target) || (s.id && s.id === target);
    });
    if (!exists) {
      return {
        status: 'ignored',
        correct: false,
        miss: false,
        solved: false,
        tapped: current,
      };
    }
  }

  if (spec.answer !== undefined) {
    const answers = (Array.isArray(spec.answer) ? spec.answer : [spec.answer]).map(String);
    const matchedAns = answers.find((ans) => isAnswerMatch(ans, target));
    if (!matchedAns) {
      return {
        status: 'wrong',
        correct: false,
        miss: true,
        solved: false,
        tapped: current,
      };
    }
    const newTapped = [...current, target];
    const solved = answers.every((ans) =>
      newTapped.some((t) => isAnswerMatch(ans, t)),
    );
    return {
      status: 'correct',
      correct: true,
      miss: false,
      solved,
      tapped: newTapped,
    };
  }

  if (spec.valid && spec.pick !== undefined) {
    const pick = Math.max(1, Math.round(Number(spec.pick)));
    let val: number | undefined;
    const sub = subitems.find((s) => {
      const full = s.id ? `${s.id}.${s.name}` : s.name;
      return isAnswerMatch(full, target) || (s.id && s.id === target);
    });
    if (sub?.value !== undefined) {
      val = sub.value;
    } else {
      const last = target.split('.').pop();
      const numTarget = Number(last);
      if (Number.isFinite(numTarget)) val = numTarget;
    }
    if (val === undefined) {
      return {
        status: 'wrong',
        correct: false,
        miss: true,
        solved: false,
        tapped: current,
      };
    }
    const res = evalExpr(spec.valid, { ...scope, n: val });
    const isTrue = res !== undefined && res !== 0;
    if (!isTrue) {
      return {
        status: 'wrong',
        correct: false,
        miss: true,
        solved: false,
        tapped: current,
      };
    }
    const newTapped = [...current, target];
    const solved = newTapped.length >= pick;
    return {
      status: 'correct',
      correct: true,
      miss: false,
      solved,
      tapped: newTapped,
    };
  }

  return {
    status: 'ignored',
    correct: false,
    miss: false,
    solved: false,
    tapped: current,
  };
}
