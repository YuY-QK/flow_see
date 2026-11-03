// 部署前准备 Cloudflare 资源（可重复运行）：
//   1. 确保 KV 命名空间存在，并把它的 id 写进 wrangler.toml（替换占位符）
//   2. 确保 Pages 项目存在
// 需要环境变量 CLOUDFLARE_API_TOKEN、CLOUDFLARE_ACCOUNT_ID（GitHub Actions 里来自仓库 Secrets）。
import { readFileSync, writeFileSync } from 'node:fs';

const PLACEHOLDER = 'REPLACE_WITH_KV_NAMESPACE_ID';
const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !account) {
  console.error('缺少 CLOUDFLARE_API_TOKEN 或 CLOUDFLARE_ACCOUNT_ID');
  process.exit(1);
}

const toml = readFileSync('wrangler.toml', 'utf8');
const project = toml.match(/^name\s*=\s*"([^"]+)"/m)?.[1];
const binding = toml.match(/binding\s*=\s*"([^"]+)"/)?.[1] ?? 'SHARES';
const kvTitle = `${project}-${binding}`;
const productionBranch = process.env.PRODUCTION_BRANCH ?? 'main';

async function api(path, init = {}) {
  const res = await fetch(
    `${process.env.CF_API_BASE ?? 'https://api.cloudflare.com/client/v4'}/accounts/${account}${path}`,
    {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...init.headers,
      },
    },
  );
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function fail(what, r) {
  console.error(`${what}失败（HTTP ${r.status}）：`, JSON.stringify(r.body.errors ?? r.body));
  process.exit(1);
}

// 1. KV
let kvId = toml.includes(PLACEHOLDER) ? null : toml.match(/^id\s*=\s*"([^"]+)"/m)?.[1];
if (!kvId) {
  for (let page = 1; !kvId; page++) {
    const r = await api(`/storage/kv/namespaces?per_page=100&page=${page}`);
    if (!r.body.success) fail('读取 KV 命名空间', r);
    kvId = r.body.result.find((n) => n.title === kvTitle)?.id;
    if (r.body.result.length < 100) break;
  }
  if (kvId) console.log(`KV 命名空间已存在：${kvTitle}`);
  else {
    const r = await api('/storage/kv/namespaces', {
      method: 'POST',
      body: JSON.stringify({ title: kvTitle }),
    });
    if (!r.body.success) fail('创建 KV 命名空间', r);
    kvId = r.body.result.id;
    console.log(`已创建 KV 命名空间：${kvTitle}`);
  }
  writeFileSync('wrangler.toml', toml.replace(PLACEHOLDER, kvId));
}

// 2. Pages 项目
const got = await api(`/pages/projects/${project}`);
if (got.status === 404) {
  const r = await api('/pages/projects', {
    method: 'POST',
    body: JSON.stringify({ name: project, production_branch: productionBranch }),
  });
  if (!r.body.success) fail('创建 Pages 项目', r);
  console.log(`已创建 Pages 项目：${project}（生产分支 ${productionBranch}）`);
} else if (got.body.success) {
  console.log(`Pages 项目已存在：${project}，地址 https://${got.body.result.subdomain}`);
} else fail('读取 Pages 项目', got);
