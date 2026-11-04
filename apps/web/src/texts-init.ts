// 把 texts.yaml 注入 t()。必须在 main.tsx 里最先 import：不少模块（模板、动画主题）加载时就会读文案。
import { configureTexts } from '@flow-see/core/texts.ts';
import { content } from './site';

configureTexts(content.texts);
