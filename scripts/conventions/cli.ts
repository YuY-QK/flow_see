// pnpm check:conventions：检查仓库约定（见 rules.ts）。有问题时退出码为 1。
import { format, runAll } from './rules';

const problems = runAll();
for (const p of problems) console.log(format(p));
console.log(problems.length ? `\n✗ ${problems.length} 个问题` : '✓ 约定检查通过');
process.exit(problems.length ? 1 : 0);
