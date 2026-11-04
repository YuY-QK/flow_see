import { cycleTemplate } from './generic/cycle';
import { dataTemplate } from './generic/data';
import { flowTemplate } from './generic/flow';
import { messageTemplate } from './generic/message';
import { fractionTemplate } from './math/fraction';
import { sceneTemplate } from './scene';
import type { Template, TemplateCard } from '@flow-see/runtime/template.ts';

import { t } from '@flow-see/core';
const TEMPLATES: Template[] = [
  flowTemplate,
  messageTemplate,
  dataTemplate,
  cycleTemplate,
  // 知识点用的模板（不在创作的选模板页里出现）
  sceneTemplate,
  fractionTemplate,
];

const byId = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): Template | undefined {
  return byId.get(id);
}

/** 选模板页的卡片；尚未实现的模板标记为“即将推出”。 */
export const TEMPLATE_CARDS: TemplateCard[] = [
  {
    id: 'flow',
    name: t('common.liu_cheng_tu_liu'),
    tagline: t('common.yi_bu_jie_yi'),
    scenes: t('registry.gong_zuo_liu_cheng'),
    available: false,
  },
  {
    id: 'message',
    name: t('common.xiao_xi_chuan_di'),
    tagline: t('common.ji_ge_jue_se'),
    scenes: t('registry.wang_luo_xie_yi'),
    available: true,
  },
  {
    id: 'data',
    name: t('common.shu_ju_bian_hua'),
    tagline: t('registry.yi_pai_shu_zi'),
    scenes: t('registry.pai_xu_cha_zhao'),
    available: false,
  },
  {
    id: 'cycle',
    name: t('common.xun_huan_shi_jian'),
    tagline: t('common.an_shi_jian_huo'),
    scenes: t('registry.shui_xun_huan_sheng'),
    available: false,
  },
].map((c) => ({ ...c, available: byId.has(c.id) }));

/** 已注册的模板 id（内容校验用） */
export const TEMPLATE_IDS: readonly string[] = TEMPLATES.map((t) => t.id);
