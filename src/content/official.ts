// 动画广场的官方内容。第一版以内置数据提供，以后可改为从服务器读取。
import { createAnimation, createElement, createStep, type Animation, type ThemeId } from '@/engine';
import { generateDataSteps, type DataParams } from '@/templates/data/algorithms';

export const CATEGORIES = [
  '算法',
  '网络协议',
  '自然科学',
  '人体与生命',
  '生活流程',
  '工作流程',
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface OfficialItem {
  id: string;
  category: Category;
  /** 精选 */
  featured: boolean;
  /** 来源：第一版只有官方；以后社区投稿入选精选后显示作者名 */
  source: string;
  summary: string;
  animation: Animation;
}

function base(title: string, templateId: string, themeId: ThemeId) {
  return createAnimation({ templateId, title, themeId, author: '动画流官方' }, 0);
}

function message(
  slug: string,
  title: string,
  themeId: ThemeId,
  roles: string[],
  steps: [from: number, to: number, label: string, title: string, desc: string][],
): Animation {
  const els = roles.map(createElement);
  return {
    ...base(title, 'message', themeId),
    id: `official-${slug}`,
    elements: els,
    steps: steps.map(([f, t, label, st, desc]) =>
      createStep({ title: st, desc, data: { from: els[f].id, to: els[t].id, label } }),
    ),
  };
}

function flow(
  slug: string,
  title: string,
  themeId: ThemeId,
  nodes: string[],
  steps: [node: number, via: string, title: string, desc: string][],
): Animation {
  const els = nodes.map(createElement);
  return {
    ...base(title, 'flow', themeId),
    id: `official-${slug}`,
    elements: els,
    steps: steps.map(([n, via, st, desc]) =>
      createStep({ title: st, desc, data: { node: els[n].id, via } }),
    ),
  };
}

function cycle(
  slug: string,
  title: string,
  themeId: ThemeId,
  layout: 'cycle' | 'timeline',
  stages: string[],
  steps: [stage: number, title: string, desc: string][],
): Animation {
  const els = stages.map(createElement);
  return {
    ...base(title, 'cycle', themeId),
    id: `official-${slug}`,
    params: { layout },
    elements: els,
    steps: steps.map(([n, st, desc]) =>
      createStep({ title: st, desc, data: { stage: els[n].id } }),
    ),
  };
}

function data(slug: string, title: string, themeId: ThemeId, params: DataParams): Animation {
  return {
    ...base(title, 'data', themeId),
    id: `official-${slug}`,
    params: { ...params },
    steps: generateDataSteps({ ...params }),
  };
}

function item(
  category: Category,
  featured: boolean,
  summary: string,
  animation: Animation,
): OfficialItem {
  return { id: animation.id, category, featured, source: '官方', summary, animation };
}

let cache: OfficialItem[] | null = null;

export function officialItems(): OfficialItem[] {
  cache ??= [
    item(
      '算法',
      true,
      '反复比较相邻的两个数，把大的往后“冒”。',
      data('bubble-sort', '冒泡排序', 'flat', {
        values: [5, 2, 8, 1, 9],
        algorithm: 'bubble',
        order: 'asc',
      }),
    ),
    item(
      '算法',
      false,
      '每一轮挑出最小的数，放到最前面。',
      data('selection-sort', '选择排序', 'pro', {
        values: [29, 10, 14, 37, 13],
        algorithm: 'selection',
        order: 'asc',
      }),
    ),
    item(
      '算法',
      false,
      '像整理扑克牌一样，一张张插到合适的位置。',
      data('insertion-sort', '插入排序', 'cute', {
        values: [8, 3, 5, 1, 6, 2],
        algorithm: 'insertion',
        order: 'asc',
      }),
    ),
    item(
      '网络协议',
      true,
      '建立连接前，双方要确认彼此都能收发消息。',
      message(
        'tcp-handshake',
        'TCP 三次握手',
        'flat',
        ['客户端', '服务器'],
        [
          [0, 1, 'SYN', '客户端发送 SYN', '“你好，我想和你建立连接。”'],
          [1, 0, 'SYN + ACK', '服务器回复 SYN + ACK', '“收到！我也准备好了，你能听到我吗？”'],
          [0, 1, 'ACK', '客户端发送 ACK', '“能听到！那我们开始吧。”连接建立。'],
        ],
      ),
    ),
    item(
      '网络协议',
      false,
      '断开连接时，双方各自说“再见”并确认。',
      message(
        'tcp-teardown',
        'TCP 四次挥手',
        'pro',
        ['客户端', '服务器'],
        [
          [0, 1, 'FIN', '客户端发送 FIN', '客户端：我的数据发完了，想断开连接。'],
          [1, 0, 'ACK', '服务器回复 ACK', '服务器：知道了，但我可能还有数据没发完。'],
          [1, 0, 'FIN', '服务器发送 FIN', '服务器：我也发完了，可以断开了。'],
          [0, 1, 'ACK', '客户端回复 ACK', '客户端：好的，再见。连接关闭。'],
        ],
      ),
    ),
    item(
      '网络协议',
      false,
      '从输入网址到看到网页，背后发生了哪些对话。',
      message(
        'open-web-page',
        '打开网页时发生了什么',
        'flat',
        ['浏览器', 'DNS 服务器', '网站服务器'],
        [
          [0, 1, '查询地址', '浏览器问 DNS', '“example.com 在哪里？”'],
          [1, 0, 'IP 地址', 'DNS 回答地址', '“在 93.184.216.34。”'],
          [0, 2, 'HTTP 请求', '浏览器请求网页', '浏览器向网站服务器要网页内容。'],
          [2, 0, '网页内容', '服务器返回网页', '服务器把 HTML 发回给浏览器。'],
          [0, 0, '渲染', '浏览器显示网页', '浏览器把收到的内容画成你看到的页面。'],
        ],
      ),
    ),
    item(
      '自然科学',
      true,
      '水在大海、天空和陆地之间不停地循环。',
      cycle(
        'water-cycle',
        '水的循环',
        'chalk',
        'cycle',
        ['蒸发', '凝结', '降水', '汇集'],
        [
          [0, '蒸发', '太阳加热，海洋和湖泊里的水变成水蒸气升上天空。'],
          [1, '凝结', '水蒸气遇冷，凝结成小水滴，聚在一起形成云。'],
          [2, '降水', '小水滴越聚越大，落下来变成雨或雪。'],
          [3, '汇集', '雨水流进江河湖海，或者渗入地下。'],
          [0, '再次蒸发', '水又被太阳加热，开始新的一轮循环。'],
        ],
      ),
    ),
    item(
      '自然科学',
      false,
      '植物用阳光、水和二氧化碳制造养分。',
      flow(
        'photosynthesis',
        '光合作用',
        'flat',
        ['吸收阳光', '吸收水分', '吸收二氧化碳', '叶绿体加工', '产生糖和氧气'],
        [
          [0, '', '叶子吸收阳光', '叶子里的叶绿素吸收太阳光，获得能量。'],
          [1, '', '根吸收水分', '根从土壤里吸水，送到叶子。'],
          [2, '', '叶子吸入二氧化碳', '叶子上的小孔从空气里吸入二氧化碳。'],
          [3, '', '叶绿体加工', '叶绿体用光的能量，把水和二氧化碳加工起来。'],
          [4, '', '产生糖和氧气', '做出植物需要的糖，同时放出氧气。'],
        ],
      ),
    ),
    item(
      '人体与生命',
      true,
      '从一颗卵到美丽的蝴蝶，再产下新的卵。',
      cycle(
        'butterfly',
        '蝴蝶的一生',
        'cute',
        'cycle',
        ['卵', '毛毛虫', '蛹', '蝴蝶'],
        [
          [0, '卵', '蝴蝶妈妈把卵产在叶子上。'],
          [1, '毛毛虫', '卵孵化出毛毛虫，它不停地吃叶子长大。'],
          [2, '蛹', '毛毛虫吐丝把自己包起来，变成蛹。'],
          [3, '蝴蝶', '蛹里钻出一只漂亮的蝴蝶。'],
          [0, '新的卵', '蝴蝶又产下新的卵，生命继续循环。'],
        ],
      ),
    ),
    item(
      '人体与生命',
      false,
      '食物在身体里走过的一段旅程。',
      cycle(
        'digestion',
        '一顿饭的消化之旅',
        'flat',
        'timeline',
        ['口腔', '食道', '胃', '小肠', '大肠'],
        [
          [0, '口腔', '牙齿把食物嚼碎，唾液开始分解淀粉。'],
          [1, '食道', '食物顺着食道被推进胃里。'],
          [2, '胃', '胃把食物搅拌成糊状，继续消化。'],
          [3, '小肠', '大部分营养在小肠里被吸收。'],
          [4, '大肠', '吸收剩下的水分，残渣排出体外。'],
        ],
      ),
    ),
    item(
      '生活流程',
      true,
      '一个带判断的小流程：水开了没有？',
      flow(
        'make-tea',
        '泡一杯茶',
        'cute',
        ['烧水', '水开了吗？', '再等等', '放茶叶', '倒热水', '闷两分钟'],
        [
          [0, '', '烧水', '把水壶装满水，开始烧水。'],
          [1, '', '检查水开了没有', '看看水有没有冒大泡。'],
          [2, '还没开', '再等等', '水还没开，再等一会儿。'],
          [1, '再看看', '再检查一次', '这次水开了。'],
          [3, '开了', '放茶叶', '在杯子里放一小撮茶叶。'],
          [4, '', '倒热水', '把开水倒进杯子。'],
          [5, '', '闷两分钟', '等茶叶舒展开，一杯茶就泡好了。'],
        ],
      ),
    ),
    item(
      '生活流程',
      false,
      '网上下单后，包裹是怎么一步步到你手里的。',
      message(
        'express-delivery',
        '快递是怎么送到家的',
        'flat',
        ['你', '商家', '分拣中心', '快递员'],
        [
          [0, 1, '下单', '你在网上下单', '你选好商品，付款下单。'],
          [1, 2, '发货', '商家打包发货', '商家把包裹交给快递公司，送往分拣中心。'],
          [2, 3, '派送', '分拣中心分拣', '按地址分好，交给负责你家附近的快递员。'],
          [3, 0, '送达', '快递员送货上门', '快递员把包裹送到你手里。'],
          [0, 1, '确认收货', '你确认收货', '你在网上点击确认收货，交易完成。'],
        ],
      ),
    ),
    item(
      '工作流程',
      false,
      '提交、审批、退回、再提交，直到通过。',
      flow(
        'leave-approval',
        '请假审批流程',
        'pro',
        ['提交申请', '主管审批？', '退回修改', '人事备案', '完成'],
        [
          [0, '', '提交请假申请', '员工填写请假单并提交。'],
          [1, '', '主管审批', '主管查看申请，决定是否同意。'],
          [2, '不同意', '不同意，退回修改', '理由不充分，申请被退回。'],
          [0, '重新提交', '修改后重新提交', '员工补充说明后再次提交。'],
          [1, '', '主管再次审批', '这次理由充分了。'],
          [3, '同意', '同意，交人事备案', '主管同意，人事部门登记备案。'],
          [4, '', '完成', '请假流程结束，可以安心休假了。'],
        ],
      ),
    ),
    item(
      '工作流程',
      false,
      '开发者、自动检查和评审人之间的一次协作。',
      message(
        'code-review',
        '一次代码评审',
        'pro',
        ['开发者', '自动检查', '评审人'],
        [
          [0, 1, '提交代码', '开发者提交代码', '开发者把改动提交上去，触发自动检查。'],
          [1, 0, '检查通过', '自动检查通过', '测试和格式检查都通过了。'],
          [0, 2, '请求评审', '请评审人看看', '开发者邀请同事评审这次改动。'],
          [2, 0, '修改建议', '评审人提出建议', '“这里的命名可以更清楚一点。”'],
          [0, 2, '已修改', '开发者修改后再提交', '按建议改好，再请评审人看。'],
          [2, 0, '批准', '评审通过', '评审人批准，代码可以合并了。'],
        ],
      ),
    ),
  ];
  return cache;
}

export function findOfficial(id: string): OfficialItem | undefined {
  return officialItems().find((i) => i.id === id);
}
