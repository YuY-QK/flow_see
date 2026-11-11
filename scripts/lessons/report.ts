import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface WalkProblem {
  step?: number;
  message: string;
  screenshot?: string;
}

export interface LessonThumbnails {
  viewport: string;
  first: string;
  mid: string;
  last: string;
}

export interface LessonWalkResult {
  id: string;
  title: string;
  grade: number | string;
  subject: string;
  status: string;
  thumbnails: LessonThumbnails[];
  problems: WalkProblem[];
  durationMs: number;
}

export interface WalkSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: LessonWalkResult[];
}

function escapeHtml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function generateReportHtml(summary: WalkSummary): string {
  const durationSec = (summary.durationMs / 1000).toFixed(1);
  const now = new Date().toLocaleString('zh-CN', { hour12: false });

  const rows = summary.results
    .map((r) => {
      const isOk = r.problems.length === 0;
      const statusBadge = isOk
        ? '<span class="badge badge-pass">✓ 通过</span>'
        : `<span class="badge badge-fail">✗ ${r.problems.length} 个问题</span>`;

      const thumbsHtml = r.thumbnails
        .map((t) => {
          return `
            <div class="thumb-group">
              <div class="thumb-header">${escapeHtml(t.viewport)}</div>
              <div class="thumb-row">
                ${t.first ? `<a href="${escapeHtml(t.first)}" target="_blank" class="thumb-link" title="第 1 步"><img src="${escapeHtml(t.first)}" alt="第 1 步" loading="lazy" /><span class="thumb-label">第 1 步</span></a>` : ''}
                ${t.mid ? `<a href="${escapeHtml(t.mid)}" target="_blank" class="thumb-link" title="中间步"><img src="${escapeHtml(t.mid)}" alt="中间步" loading="lazy" /><span class="thumb-label">中间步</span></a>` : ''}
                ${t.last ? `<a href="${escapeHtml(t.last)}" target="_blank" class="thumb-link" title="最后一步"><img src="${escapeHtml(t.last)}" alt="最后一步" loading="lazy" /><span class="thumb-label">最后一步</span></a>` : ''}
              </div>
            </div>
          `;
        })
        .join('');

      const problemsHtml = isOk
        ? '<div class="problem-pass">✓ 全部检查通过</div>'
        : `<ul class="problem-list">
            ${r.problems
              .map(
                (p) => `
              <li class="problem-item">
                <span class="problem-step">${p.step !== undefined ? `[第 ${p.step} 步]` : '[全局]'}</span>
                <span class="problem-msg">${escapeHtml(p.message)}</span>
                ${p.screenshot ? `<a href="${escapeHtml(p.screenshot)}" target="_blank" class="problem-link">查看截图</a>` : ''}
              </li>
            `,
              )
              .join('')}
          </ul>`;

      return `
        <div class="lesson-card ${isOk ? 'lesson-card-pass' : 'lesson-card-fail'}">
          <div class="lesson-meta-row">
            <div class="lesson-info">
              <span class="lesson-title">${escapeHtml(r.title)}</span>
              <code class="lesson-id">${escapeHtml(r.id)}</code>
              <span class="lesson-tag">${escapeHtml(String(r.grade))} 年级 · ${escapeHtml(r.subject)}</span>
              <span class="lesson-status">${escapeHtml(r.status)}</span>
            </div>
            <div class="lesson-status-cell">
              <span class="duration">${(r.durationMs / 1000).toFixed(1)}s</span>
              ${statusBadge}
            </div>
          </div>
          <div class="lesson-body">
            <div class="thumbs-container">
              ${thumbsHtml}
            </div>
            <div class="problems-container">
              ${problemsHtml}
            </div>
          </div>
        </div>
      `;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>知识点自动走查报告</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --primary: #2563eb;
      --pass: #16a34a;
      --pass-bg: #f0fdf4;
      --pass-border: #bbf7d0;
      --fail: #dc2626;
      --fail-bg: #fef2f2;
      --fail-border: #fecaca;
      --radius: 8px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px;
    }
    .header {
      max-width: 1400px;
      margin: 0 auto 24px auto;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid var(--border);
      padding-bottom: 16px;
    }
    .title h1 {
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
    }
    .title p {
      font-size: 14px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .stats {
      display: flex;
      gap: 16px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 8px 16px;
      text-align: center;
      min-width: 100px;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 700;
    }
    .stat-label {
      font-size: 12px;
      color: var(--text-muted);
    }
    .stat-pass { color: var(--pass); }
    .stat-fail { color: var(--fail); }

    .content {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .lesson-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      overflow: hidden;
    }
    .lesson-card-fail {
      border-color: var(--fail-border);
    }
    .lesson-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      background: #f1f5f9;
      border-bottom: 1px solid var(--border);
    }
    .lesson-card-fail .lesson-meta-row {
      background: var(--fail-bg);
    }
    .lesson-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .lesson-title {
      font-size: 17px;
      font-weight: 600;
    }
    .lesson-id {
      background: #e2e8f0;
      color: #334155;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
    .lesson-tag {
      font-size: 13px;
      color: var(--text-muted);
    }
    .lesson-status {
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;
      background: #cbd5e1;
      color: #1e293b;
    }
    .lesson-status-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .duration {
      font-size: 13px;
      color: var(--text-muted);
    }
    .badge {
      display: inline-block;
      font-size: 13px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 20px;
    }
    .badge-pass {
      background: var(--pass-bg);
      color: var(--pass);
      border: 1px solid var(--pass-border);
    }
    .badge-fail {
      background: var(--fail-bg);
      color: var(--fail);
      border: 1px solid var(--fail-border);
    }

    .lesson-body {
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .thumbs-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
    .thumb-group {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px;
    }
    .thumb-header {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-align: center;
    }
    .thumb-row {
      display: flex;
      gap: 6px;
      justify-content: center;
    }
    .thumb-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-decoration: none;
      width: calc((100% - 12px) / 3);
      max-width: 140px;
    }
    .thumb-link img {
      width: 100%;
      height: 70px;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid var(--border);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .thumb-link:hover img {
      transform: scale(1.05);
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }
    .thumb-label {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 3px;
    }

    .problems-container {
      border-top: 1px dashed var(--border);
      padding-top: 12px;
    }
    .problem-pass {
      font-size: 14px;
      color: var(--pass);
      font-weight: 500;
    }
    .problem-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .problem-item {
      font-size: 14px;
      color: var(--fail);
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .problem-step {
      font-weight: 600;
      color: #991b1b;
      white-space: nowrap;
    }
    .problem-link {
      font-size: 12px;
      color: var(--primary);
      text-decoration: underline;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">
      <h1>知识点自动走查报告</h1>
      <p>生成时间：${now} · 总耗时：${durationSec}s</p>
    </div>
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${summary.total}</div>
        <div class="stat-label">总计</div>
      </div>
      <div class="stat-card">
        <div class="stat-value stat-pass">${summary.passed}</div>
        <div class="stat-label">通过</div>
      </div>
      <div class="stat-card">
        <div class="stat-value stat-fail">${summary.failed}</div>
        <div class="stat-label">问题</div>
      </div>
    </div>
  </div>

  <div class="content">
    ${rows}
  </div>
</body>
</html>
`;
}

export function writeReport(summary: WalkSummary, outDir = 'test-results/lessons'): string {
  mkdirSync(outDir, { recursive: true });
  const htmlPath = join(outDir, 'index.html');
  const html = generateReportHtml(summary);
  writeFileSync(htmlPath, html, 'utf8');
  return htmlPath;
}
