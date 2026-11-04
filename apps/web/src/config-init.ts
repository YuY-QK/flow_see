// 把 texts.yaml、style.yaml 注入核心库。必须在 main.tsx 里最先 import：
// 不少模块（模板等）加载时就会读文案和样式。
import { configureStyle } from '@flow-see/core/style.ts';
import { configureTexts } from '@flow-see/core/texts.ts';
import { content } from './site';

configureTexts(content.texts);
configureStyle(content.style);
