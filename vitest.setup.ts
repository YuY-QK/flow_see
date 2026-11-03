// 测试开始前，把 packages/content/site.yaml 的 scene 注入 blocks（和网站启动时做的一样）。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { configureScene } from './packages/blocks/src/index';
import { CONTENT_ROOT } from './packages/content/src/json-schema';
import { siteSchema } from './packages/content/src/schema';

const site = siteSchema.parse(parse(readFileSync(join(CONTENT_ROOT, 'site.yaml'), 'utf8')));
configureScene(site.scene);
