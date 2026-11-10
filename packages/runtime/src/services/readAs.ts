// 朗读规整：去除颜色与 blank 标记、按配置规则替换读法（如分数、单位、负数等）。
import { t } from '@flow-see/core';

export interface ReadAsRule {
  match: string;
  say: string;
}

const RICH = /\[([^\]]*)\]\(([^)]*)\)/g;

/**
 * 朗读规整：
 * 1. 先去掉颜色 / blank 标记（只保留文字；blank 读作“几”——来自 texts.yaml 的 num.blank）
 * 2. 再按规则依次替换
 */
export function toSpeech(text: string, rules: ReadAsRule[] = []): string {
  if (!text) return '';

  const blankWord = t('num.blank');

  // 先处理颜色 / blank 标记
  let processed = text.replace(RICH, (_match, content, tag) => {
    const words = tag.trim().split(/\s+/);
    if (words.includes('blank')) {
      return blankWord;
    }
    if (words.includes('frac')) {
      return `[${content}](frac)`;
    }
    if (words.includes('sup')) {
      return `[${content}](sup)`;
    }
    return content;
  });

  // 再按规则依次替换
  for (const rule of rules) {
    if (!rule.match) continue;
    try {
      const re = new RegExp(rule.match, 'g');
      processed = processed.replace(re, rule.say ?? '');
    } catch {
      // 忽略配置中无效的正则表达式
    }
  }

  return processed;
}
