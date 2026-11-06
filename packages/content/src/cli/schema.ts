// 由 src/schema.ts 生成 schemas/*.schema.json。改了格式定义后运行：pnpm content:schema
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_ROOT, generateSchemas } from '../json-schema';

const dir = join(CONTENT_ROOT, 'schemas');
mkdirSync(dir, { recursive: true });
for (const [name, json] of Object.entries(generateSchemas())) {
  writeFileSync(join(dir, `${name}.schema.json`), json);
  console.log(`已生成 schemas/${name}.schema.json`);
}
