import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import * as net from 'node:net';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { parse as parseYaml } from 'yaml';
import { configureScene, displayText, richSpans } from '../../packages/blocks/src';
import { lessonToAnimation } from '../../packages/content/src';
import { siteSchema, styleSchema, textsSchema } from '../../packages/content/src/schema';
import { chooseAnswers, configureStyle, configureTexts, type TrySpec } from '../../packages/core/src';
import type { FrameObjectInfo, LessonTestApi } from '../../apps/web/src/learn/LessonPlayer';
import { loadContent } from '../../packages/content/src/load';
import { writeReport, type LessonThumbnails, type LessonWalkResult, type WalkProblem } from './report';

export const ROOT = resolve(import.meta.dirname, '..', '..');

export function initConfig(root = ROOT): void {
  const contentRoot = join(root, 'packages', 'content');
  const siteRaw = parseYaml(readFileSync(join(contentRoot, 'site.yaml'), 'utf8'));
  const site = siteSchema.parse(siteRaw);
  configureScene(site.scene);
  const textsRaw = parseYaml(readFileSync(join(contentRoot, site.texts), 'utf8'));
  configureTexts(textsSchema.parse(textsRaw), { strict: false });
  const styleRaw = parseYaml(readFileSync(join(contentRoot, site.style), 'utf8'));
  configureStyle(styleSchema.parse(styleRaw));
}

initConfig();

export interface WalkOptions {
  lessons?: string[];
  changed?: boolean;
  publishedOnly?: boolean;
  noSelf?: boolean;
  port?: number;
  baseUrl?: string;
  outDir?: string;
  skipServer?: boolean;
  executablePath?: string;
}

export function parseArgs(argv = process.argv.slice(2)): WalkOptions {
  const options: WalkOptions = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--lesson' && argv[i + 1]) {
      options.lessons = options.lessons ?? [];
      options.lessons.push(...argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean));
      i++;
    } else if (arg.startsWith('--lesson=')) {
      options.lessons = options.lessons ?? [];
      options.lessons.push(...arg.slice('--lesson='.length).split(',').map((s) => s.trim()).filter(Boolean));
    } else if (arg === '--changed') {
      options.changed = true;
    } else if (arg === '--published' || arg === '--published-only') {
      options.publishedOnly = true;
    } else if (arg === '--no-self') {
      options.noSelf = true;
    } else if (arg === '--port' && argv[i + 1]) {
      options.port = Number(argv[i + 1]);
      i++;
    } else if (arg === '--base-url' && argv[i + 1]) {
      options.baseUrl = argv[i + 1];
      i++;
    } else if (arg === '--executable-path' && argv[i + 1]) {
      options.executablePath = argv[i + 1];
      i++;
    } else if (arg.startsWith('--executable-path=')) {
      options.executablePath = arg.slice('--executable-path='.length);
    }
  }
  return options;
}

function revParse(ref: string, root: string): string | undefined {
  try {
    return execSync(`git rev-parse --verify --quiet ${ref}^{commit}`, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}

export function getChangedLessonIds(root = ROOT): string[] {
  try {
    let stdout = '';
    // 比较基准：功能分支和 develop 比，develop 自己和 main 比（一个里程碑里改过的全部知识点）。
    // WALK_BASE 可以指定基准；基准就是当前提交时跳过，换下一个。
    const head = revParse('HEAD', root);
    const diffTargets = [
      process.env.WALK_BASE,
      'origin/develop',
      'develop',
      'origin/main',
      'main',
      'HEAD~1',
    ].filter((x): x is string => Boolean(x));
    for (const target of diffTargets) {
      const rev = revParse(target, root);
      if (!rev || rev === head) continue;
      try {
        stdout = execSync(`git diff --name-only ${target}...HEAD -- packages/content/lessons/`, {
          cwd: root,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        break;
      } catch {
        // try next target
      }
    }
    if (!stdout.trim()) {
      try {
        stdout = execSync('git diff --name-only HEAD packages/content/lessons/', {
          cwd: root,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
      } catch {
        // ignore
      }
    }
    const ids: string[] = [];
    const lines = stdout.split('\n');
    for (const line of lines) {
      const match = line.match(/lessons\/([^/]+)\/([^/]+)\/([a-z0-9-]+)\.ya?ml$/);
      if (match) {
        ids.push(match[3]);
      }
    }
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

export async function findFreePort(prefer = 5188): Promise<number> {
  return new Promise((res) => {
    const s = net.createServer();
    s.listen(prefer, () => {
      const port = (s.address() as net.AddressInfo).port;
      s.close(() => res(port));
    });
    s.on('error', () => {
      const s2 = net.createServer();
      s2.listen(0, () => {
        const port = (s2.address() as net.AddressInfo).port;
        s2.close(() => res(port));
      });
    });
  });
}

export async function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 404) {
        return;
      }
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
}

export function checkBoundingBoxes(
  objects: FrameObjectInfo[],
  stage: { width: number; height: number },
  stepNum: number,
): WalkProblem[] {
  const problems: WalkProblem[] = [];
  const W = stage.width;
  const H = stage.height;
  for (const obj of objects) {
    const b = obj.box;
    if (b.x < -4 || b.y < -4 || b.x + b.w > W + 4 || b.y + b.h > H + 4) {
      problems.push({
        step: stepNum,
        message: `Part "${obj.id}" (${obj.type}) bounding box [${b.x.toFixed(1)}, ${b.y.toFixed(1)}, ${b.w.toFixed(1)}, ${b.h.toFixed(1)}] exceeds stage boundaries [0, 0, ${W}, ${H}]`,
        severity: 'error',
      });
    }
  }
  return problems;
}

export function checkTextOverlaps(
  objects: FrameObjectInfo[],
  stepNum: number,
): WalkProblem[] {
  const problems: WalkProblem[] = [];
  const textObjs = objects.filter((o) => o.type === 'text' || o.type === 'label');
  for (let i = 0; i < textObjs.length; i++) {
    for (let j = i + 1; j < textObjs.length; j++) {
      const a = textObjs[i].box;
      const b = textObjs[j].box;
      const x1 = Math.max(a.x, b.x);
      const y1 = Math.max(a.y, b.y);
      const x2 = Math.min(a.x + a.w, b.x + b.w);
      const y2 = Math.min(a.y + a.h, b.y + b.h);
      if (x2 > x1 && y2 > y1) {
        const overlapArea = (x2 - x1) * (y2 - y1);
        const areaA = a.w * a.h;
        const areaB = b.w * b.h;
        const minArea = Math.min(areaA, areaB);
        const overlapH = y2 - y1;
        const minH = Math.min(a.h, b.h);
        if (minH > 0 && overlapH / minH < 0.2) {
          continue;
        }
        if (minArea > 0 && overlapArea / minArea > 0.1) {
          problems.push({
            step: stepNum,
            message: `Text parts "${textObjs[i].id}" and "${textObjs[j].id}" overlap by ${((overlapArea / minArea) * 100).toFixed(1)}% (allowed <= 10%)`,
            severity: 'warn',
          });
        }
      }
    }
  }
  return problems;
}

export function checkTopLeftArea(
  objects: FrameObjectInfo[],
  stepNum: number,
): WalkProblem[] {
  const problems: WalkProblem[] = [];
  const textObjs = objects.filter((o) => o.type === 'text' || o.type === 'label');
  for (const obj of textObjs) {
    const b = obj.box;
    const x1 = Math.max(b.x, 0);
    const y1 = Math.max(b.y, 0);
    const x2 = Math.min(b.x + b.w, 140);
    const y2 = Math.min(b.y + b.h, 40);
    if (x2 > x1 && y2 > y1) {
      problems.push({
        step: stepNum,
        message: `Text part "${obj.id}" intersects stage top-left reserved area [0, 0, 140, 40] (duration & step progress)`,
        severity: 'error',
      });
    }
  }
  return problems;
}

export function visibleText(props: Record<string, unknown>): string {
  let raw = typeof props.text === 'string' ? props.text : (typeof props.label === 'string' ? props.label : '');
  if (typeof props.value === 'number') {
    const v = String(Math.round(props.value));
    raw = raw ? raw.replaceAll('{value}', v) : v;
  }
  if (!raw) return displayText(props);
  const spans = richSpans(raw);
  // Blank boxes ([...](blank)) are rendered as empty placeholder boxes for the user to answer,
  // so the text within blank spans is not exposed on screen.
  return spans
    .filter((s) => !s.blank)
    .map((s) => s.text)
    .join('');
}

export function checkEarlyAnswer(
  texts: string[],
  trySpec: TrySpec,
  stepNum: number,
): WalkProblem[] {
  const problems: WalkProblem[] = [];
  if (!trySpec.choose) return problems;

  const answers = chooseAnswers(trySpec.choose);
  const combinedText = texts.join(' ');

  for (const ans of answers) {
    const ansStr = String(ans).trim();
    if (!ansStr) continue;

    const isNum = /^-?\d+(\.\d+)?$/.test(ansStr);
    if (isNum) {
      const escaped = ansStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const numRegex = new RegExp(`(?:^|[^0-9.])${escaped}(?:[^0-9.]|$)`);
      if (numRegex.test(combinedText)) {
        problems.push({
          step: stepNum,
          message: `Screen text contains answer "${ansStr}" before the question is asked (ask: true)`,
          severity: 'error',
        });
      }
    } else {
      if (combinedText.includes(ansStr)) {
        problems.push({
          step: stepNum,
          message: `Screen text contains answer "${ansStr}" before the question is asked (ask: true)`,
          severity: 'error',
        });
      }
    }
  }

  return problems;
}

export async function runWalk(opts: WalkOptions = {}): Promise<number> {
  const { objectBox, sceneFrame, sceneOf } = await import('../../packages/templates/src/scene');
  const root = ROOT;
  const contentRoot = join(root, 'packages', 'content');
  const { bundle } = loadContent(contentRoot);
  if (!bundle) {
    console.error('Failed to load content bundle');
    return 1;
  }

  let lessonItems: typeof bundle.lessons;
  if (opts.lessons && opts.lessons.length > 0) {
    const set = new Set(opts.lessons);
    lessonItems = bundle.lessons.filter((l) => set.has(l.lesson.id));
    if (lessonItems.length === 0) {
      console.error(`No lessons matched the filter: ${opts.lessons.join(', ')}`);
      return 1;
    }
  } else if (opts.changed) {
    const changedIds = getChangedLessonIds(root);
    if (changedIds.length === 0) {
      console.log('No changed lessons found relative to git diff.');
      return 0;
    }
    const set = new Set(changedIds);
    lessonItems = bundle.lessons.filter((l) => set.has(l.lesson.id));
  } else if (opts.publishedOnly) {
    lessonItems = bundle.lessons.filter((l) => l.lesson.status === 'published');
  } else {
    // Default: walk all lessons (including drafts)
    lessonItems = bundle.lessons;
  }

  console.log(`Preparing to walk ${lessonItems.length} lessons...`);

  let serverProc: ChildProcess | undefined;
  let baseUrl = opts.baseUrl;

  if (!baseUrl) {
    const port = opts.port ?? (await findFreePort(5188));
    baseUrl = `http://localhost:${port}`;
    console.log(`Starting Vite dev server on port ${port}...`);
    serverProc = spawn('pnpm', ['--filter', '@flow-see/web', 'dev', '--port', String(port), '--strictPort'], {
      cwd: root,
      stdio: 'pipe',
      detached: process.platform !== 'win32',
    });

    const cleanup = () => {
      if (serverProc && !serverProc.killed) {
        try {
          if (process.platform !== 'win32' && serverProc.pid) {
            process.kill(-serverProc.pid);
          } else {
            serverProc.kill();
          }
        } catch {
          // ignore
        }
      }
    };

    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit(130);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(143);
    });

    try {
      await waitForServer(baseUrl, 40000);
      console.log(`Dev server ready at ${baseUrl}`);
    } catch (e) {
      cleanup();
      console.error((e as Error).message);
      return 1;
    }
  }

  const executablePath =
    opts.executablePath ||
    process.env.CHROMIUM_PATH ||
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    undefined;

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  const context = await browser.newContext({ deviceScaleFactor: 1 });

  const outDir = resolve(opts.outDir ?? join(root, 'test-results', 'lessons'));
  mkdirSync(outDir, { recursive: true });

  const viewports = [
    { name: '1280', width: 1280, height: 800 },
    { name: '820', width: 820, height: 1180 },
    { name: '390', width: 390, height: 844 },
  ];

  const results: LessonWalkResult[] = [];
  const startTime = Date.now();

  for (let idx = 0; idx < lessonItems.length; idx++) {
    const item = lessonItems[idx];
    const lessonStart = Date.now();
    const lessonId = item.lesson.id;
    const lessonProblems: WalkProblem[] = [];
    const lessonDir = join(outDir, 'screenshots', lessonId);
    mkdirSync(lessonDir, { recursive: true });

    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg: { type(): string; text(): string }) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err: { message: string }) => {
      pageErrors.push(err.message);
    });

    const safeGetState = async () => {
      return page.evaluate(() => {
        const testObj = (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest;
        if (!testObj) throw new Error('Lesson player unmounted or crashed (window.__lessonTest is undefined)');
        return testObj.getState?.() ?? {
          index: 0,
          total: 0,
          waiting: false,
          playing: false,
        };
      });
    };

    const safeSolve = async () => {
      return page.evaluate(async () => {
        const testObj = (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest;
        if (!testObj) throw new Error('Lesson player unmounted or crashed (window.__lessonTest is undefined)');
        return testObj.solve();
      });
    };

    const url = `${baseUrl}/learn/${item.grade}/${item.subject}/${lessonId}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => typeof (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest !== 'undefined', {
        timeout: 15000,
      });

      const totalSteps = await page.evaluate(() => (window as unknown as { __lessonTest: LessonTestApi }).__lessonTest.steps());
      const stage = await page.evaluate(() => (window as unknown as { __lessonTest: LessonTestApi }).__lessonTest.stage());
      const midStep = Math.max(1, Math.ceil(totalSteps / 2));

      const thumbnails: LessonThumbnails[] = [];

      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(60);

        for (let s = 0; s < totalSteps; s++) {
          await page.evaluate((step) => (window as unknown as { __lessonTest: LessonTestApi }).__lessonTest.goto(step), s);
          await page.waitForTimeout(60);

          const stepNum = s + 1;
          const relPath = `screenshots/${lessonId}/${vp.name}_step_${stepNum}.png`;
          const fullPath = join(outDir, relPath);
          await page.screenshot({ path: fullPath });

          // Run geometry checks primarily on 1280
          if (vp.name === '1280') {
            const objs = await page.evaluate(() => (window as unknown as { __lessonTest: LessonTestApi }).__lessonTest.frameObjects());
            const boxProblems = checkBoundingBoxes(objs, stage, stepNum);
            const overlapProblems = checkTextOverlaps(objs, stepNum);
            const topLeftProblems = checkTopLeftArea(objs, stepNum);

            for (const p of [...boxProblems, ...overlapProblems, ...topLeftProblems]) {
              lessonProblems.push({ ...p, screenshot: relPath });
            }
          }
        }

        thumbnails.push({
          viewport: `${vp.name}px`,
          first: `screenshots/${lessonId}/${vp.name}_step_1.png`,
          mid: `screenshots/${lessonId}/${vp.name}_step_${midStep}.png`,
          last: `screenshots/${lessonId}/${vp.name}_step_${totalSteps}.png`,
        });
      }

      // Check 5: Answer early check in steps with try
      try {
        const anim = lessonToAnimation(item.lesson);
        const def = sceneOf(anim);
        for (let s = 0; s < item.lesson.steps.length; s++) {
          const st = item.lesson.steps[s];
          if (!st.try) continue;
          const doingFrame = sceneFrame(def, s, 1, 'doing');
          const texts: string[] = [];
          for (const o of doingFrame.objects) {
            const b = objectBox(o);
            if (!b) continue;
            if (o.type === 'text' || o.type === 'label') {
              texts.push(visibleText(o.props));
            } else if (typeof o.props.text === 'string') {
              texts.push(visibleText(o.props));
            } else if (typeof o.props.label === 'string') {
              texts.push(String(o.props.label));
            }
          }
          const earlyProblems = checkEarlyAnswer(texts, st.try, s + 1);
          for (const ep of earlyProblems) {
            lessonProblems.push({
              ...ep,
              screenshot: `screenshots/${lessonId}/1280_step_${s + 1}.png`,
            });
          }
        }
      } catch {
        // ignore scene calculation error
      }

      const hasTries = item.lesson.steps.some((st) => Boolean(st.try));

      // 4. Follow mode
      if (hasTries) {
        await page.evaluate(() => {
          (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest?.mode('follow');
          (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest?.setSpeed?.(2);
        });
        let lastStep = -1;
        let stepStartTime = Date.now();
        const maxStepWait = 30000;

        while (true) {
          const st = await safeGetState();
          if (st.index !== lastStep) {
            lastStep = st.index;
            stepStartTime = Date.now();
          } else if (Date.now() - stepStartTime > maxStepWait) {
            lessonProblems.push({
              step: lastStep + 1,
              message: `Follow mode stuck at step ${lastStep + 1} for more than 30 seconds`,
              severity: 'error',
            });
            break;
          }

          const pending = await page.evaluate(() => (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest?.pending());
          if (pending) {
            await safeSolve();
            stepStartTime = Date.now();
          }

          const finished = await page.evaluate(
            () => (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest?.isFinished?.() ?? false,
          );
          if (finished) break;
          await page.waitForTimeout(100);
        }
      }

      // 5. Self mode
      if (hasTries && !opts.noSelf) {
        await page.evaluate(() => {
          (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest?.mode('self');
          (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest?.setSpeed?.(2);
        });
        let lastStep = -1;
        let stepStartTime = Date.now();
        const maxStepWait = 30000;

        while (true) {
          const st = await safeGetState();
          if (st.index !== lastStep) {
            lastStep = st.index;
            stepStartTime = Date.now();
          } else if (Date.now() - stepStartTime > maxStepWait) {
            lessonProblems.push({
              step: lastStep + 1,
              message: `Self mode stuck at step ${lastStep + 1} for more than 30 seconds`,
              severity: 'error',
            });
            break;
          }

          const pending = await page.evaluate(() => (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest?.pending());
          if (pending) {
            await safeSolve();
            stepStartTime = Date.now();
          }

          const finished = await page.evaluate(
            () => (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest?.isFinished?.() ?? false,
          );
          if (finished) break;
          await page.waitForTimeout(100);
        }

        // Second pass: Explore controls (test min and max each once)
        const controls = await page.evaluate(
          () => (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest?.getControls?.() ?? [],
        );
        if (controls && controls.length > 0) {
          const minPatch: Record<string, number> = {};
          const maxPatch: Record<string, number> = {};
          for (const c of controls) {
            minPatch[c.param] = c.min;
            maxPatch[c.param] = c.max;
          }
          for (const [modeLabel, patch] of [
            ['min', minPatch],
            ['max', maxPatch],
          ] as const) {
            await page.evaluate(
              (p) => (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest?.setParams?.(p),
              patch,
            );
            lastStep = -1;
            stepStartTime = Date.now();

            while (true) {
              const st = await safeGetState();
              if (st.index !== lastStep) {
                lastStep = st.index;
                stepStartTime = Date.now();
              } else if (Date.now() - stepStartTime > maxStepWait) {
                lessonProblems.push({
                  step: lastStep + 1,
                  message: `Self mode (with ${modeLabel} params) stuck at step ${lastStep + 1} for more than 30 seconds`,
                  severity: 'error',
                });
                break;
              }

              const pending = await page.evaluate(() => (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest?.pending());
              if (pending) {
                await safeSolve();
                stepStartTime = Date.now();
              }

              const finished = await page.evaluate(
                () => (window as unknown as { __lessonTest?: LessonTestApi }).__lessonTest?.isFinished?.() ?? false,
              );
              if (finished) break;
              await page.waitForTimeout(100);
            }
          }
        }
      }

      for (const err of consoleErrors) {
        lessonProblems.push({ message: `Console error: ${err}`, severity: 'error' });
      }

      const durationMs = Date.now() - lessonStart;
      const errors = lessonProblems.filter((p) => p.severity !== 'warn');
      const warnings = lessonProblems.filter((p) => p.severity === 'warn');
      const statusStr =
        errors.length === 0
          ? warnings.length === 0
            ? 'PASS'
            : `PASS (${warnings.length} warnings)`
          : `FAIL (${errors.length} errors, ${warnings.length} warnings)`;
      console.log(`[${idx + 1}/${lessonItems.length}] ${lessonId} (${item.lesson.title}): ${statusStr} in ${(durationMs / 1000).toFixed(1)}s`);

      results.push({
        id: lessonId,
        title: item.lesson.title,
        grade: item.grade,
        subject: item.subject,
        status: item.lesson.status,
        thumbnails,
        problems: lessonProblems,
        durationMs,
      });
    } catch (e) {
      const durationMs = Date.now() - lessonStart;
      const primaryErr = (e as Error).message;
      console.error(`[${idx + 1}/${lessonItems.length}] ${lessonId}: ERROR: ${primaryErr}`);
      if (pageErrors.length > 0) {
        for (const pe of pageErrors) {
          lessonProblems.push({ message: `Page crash: ${pe}`, severity: 'error' });
        }
      } else {
        lessonProblems.push({ message: primaryErr, severity: 'error' });
      }
      for (const err of consoleErrors) {
        lessonProblems.push({ message: `Console error: ${err}`, severity: 'error' });
      }
      results.push({
        id: lessonId,
        title: item.lesson.title,
        grade: item.grade,
        subject: item.subject,
        status: item.lesson.status,
        thumbnails: [],
        problems: lessonProblems,
        durationMs,
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  if (serverProc && !serverProc.killed) {
    try {
      if (process.platform !== 'win32' && serverProc.pid) {
        process.kill(-serverProc.pid);
      } else {
        serverProc.kill();
      }
    } catch {
      // ignore
    }
  }

  const totalDurationMs = Date.now() - startTime;
  const passedCount = results.filter((r) => !r.problems.some((p) => p.severity !== 'warn')).length;
  const failedCount = results.length - passedCount;

  const reportPath = writeReport(
    {
      total: results.length,
      passed: passedCount,
      failed: failedCount,
      durationMs: totalDurationMs,
      results,
    },
    outDir,
  );

  console.log('\n----------------------------------------');
  console.log(`Walk completed in ${(totalDurationMs / 1000).toFixed(1)}s`);
  console.log(`Total: ${results.length}, Passed: ${passedCount}, Failed: ${failedCount}`);
  console.log(`Report generated at: ${reportPath}`);
  console.log('----------------------------------------\n');

  return failedCount === 0 ? 0 : 1;
}

const isMain =
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === resolve(process.argv[1]) ||
    process.argv[1].endsWith('scripts/lessons/walk.ts'));

if (isMain) {
  runWalk(parseArgs())
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
