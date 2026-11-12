import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

export interface CreateLessonOptions {
  root?: string;
  grade: string | number;
  id: string;
}

export interface CreateLessonResult {
  lessonFile: string;
  curriculumFile: string;
  title: string;
  scriptHint?: string;
}

export function normalizeGrade(grade: string | number): string {
  const match = String(grade).match(/\d+/);
  return match ? match[0] : String(grade).trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findScriptLocation(
  root: string,
  gradeNum: string,
  id: string,
): string | undefined {
  const docsRoot = join(root, 'docs');
  if (!existsSync(docsRoot)) return undefined;

  const candidateDirs: string[] = [docsRoot];
  try {
    const entries = readdirSync(docsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        candidateDirs.push(join(docsRoot, entry.name));
      }
    }
  } catch {
    return undefined;
  }

  for (const dir of candidateDirs) {
    let files: string[];
    try {
      files = readdirSync(dir).filter((f) => f.startsWith('C-') && f.endsWith('.md'));
    } catch {
      continue;
    }
    for (const f of files) {
      const fullPath = join(dir, f);
      try {
        const text = readFileSync(fullPath, 'utf8');
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith(`### \`${id}\``)) {
            const rel = relative(root, fullPath);
            return `${rel}:${i + 1} (${line.trim()})`;
          }
        }
      } catch {
        // ignore read error
      }
    }
  }

  try {
    const gradesPath = join(root, 'packages/content/curriculum/grades.yaml');
    if (existsSync(gradesPath)) {
      const parsed = parseYaml(readFileSync(gradesPath, 'utf8')) as {
        grades?: { id: number; name: string }[];
      };
      const gradeEntry = parsed?.grades?.find((g) => String(g.id) === String(gradeNum));
      if (gradeEntry?.name) {
        for (const dir of candidateDirs) {
          const files = readdirSync(dir).filter(
            (f) => f.includes(gradeEntry.name) && f.endsWith('.md'),
          );
          if (files[0]) {
            const rel = relative(root, join(dir, files[0]));
            return `${rel} (### \`${id}\`)`;
          }
        }
      }
    }
  } catch {
    // ignore
  }

  return undefined;
}

export function createNewLesson(options: CreateLessonOptions): CreateLessonResult {
  const root = options.root ? resolve(options.root) : resolve(import.meta.dirname, '..', '..');
  const gradeNum = normalizeGrade(options.grade);
  const id = options.id.trim();

  if (!gradeNum) {
    throw new Error(`Invalid grade: ${options.grade}`);
  }
  if (!id) {
    throw new Error('Lesson id must not be empty');
  }

  const curriculumRelPath = join('packages/content/curriculum/math', `grade${gradeNum}.yaml`);
  const curriculumPath = join(root, curriculumRelPath);
  if (!existsSync(curriculumPath)) {
    throw new Error(`Curriculum file not found: ${curriculumRelPath}`);
  }

  const curriculumContent = readFileSync(curriculumPath, 'utf8');
  const lines = curriculumContent.split(/\r?\n/);

  const escapedId = escapeRegex(id);
  const pureIdRegex = new RegExp(`^\\s*-\\s*['"]?${escapedId}['"]?\\s*(?:#.*)?$`);
  if (lines.some((line) => pureIdRegex.test(line))) {
    throw new Error(
      `Lesson "${id}" is already registered as an existing lesson in ${curriculumRelPath}.`,
    );
  }

  const lessonRelPath = join('packages/content/lessons/math', `g${gradeNum}`, `${id}.yaml`);
  const lessonPath = join(root, lessonRelPath);
  if (existsSync(lessonPath)) {
    throw new Error(`Lesson file already exists: ${lessonRelPath}`);
  }

  let matchedIndex = -1;
  let title = '';
  let indent = '';
  let comment = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*)-\s*(\{[^}]+\})(\s*#.*)?$/);
    if (m) {
      try {
        const parsed = parseYaml(m[2]);
        if (parsed && typeof parsed === 'object' && parsed.id === id) {
          matchedIndex = i;
          title = String(parsed.title ?? '').trim();
          indent = m[1];
          comment = m[3] ?? '';
          break;
        }
      } catch {
        // ignore parse error on unrelated line
      }
    }
  }

  if (matchedIndex === -1) {
    throw new Error(
      `Lesson "${id}" not found in ${curriculumRelPath}. First add this lesson to curriculum.`,
    );
  }

  if (!title) {
    title = id;
  }

  const templatePath = join(import.meta.dirname, 'template.yaml');
  if (!existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }

  const templateContent = readFileSync(templatePath, 'utf8');
  const lessonContent = templateContent
    .replaceAll('__ID__', () => id)
    .replaceAll('__TITLE__', () => title);

  mkdirSync(dirname(lessonPath), { recursive: true });
  writeFileSync(lessonPath, lessonContent, 'utf8');

  lines[matchedIndex] = `${indent}- ${id}${comment}`;
  const eol = curriculumContent.includes('\r\n') ? '\r\n' : '\n';
  writeFileSync(curriculumPath, lines.join(eol), 'utf8');

  const scriptHint = findScriptLocation(root, gradeNum, id);

  return {
    lessonFile: lessonRelPath,
    curriculumFile: curriculumRelPath,
    title,
    scriptHint,
  };
}

export function runCli(argv = process.argv.slice(2)): void {
  let root = resolve(import.meta.dirname, '..', '..');
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root' && argv[i + 1]) {
      root = resolve(argv[i + 1]);
      i++;
    } else if (!argv[i].startsWith('-')) {
      positional.push(argv[i]);
    }
  }

  const [grade, id] = positional;
  if (!grade || !id) {
    console.error('Usage: pnpm lesson:new <grade> <id>');
    process.exit(1);
  }

  try {
    const result = createNewLesson({ root, grade, id });
    console.log(`Created ${result.lessonFile}`);
    console.log(`Updated ${result.curriculumFile}`);
    console.log('');
    console.log('Next steps:');
    if (result.scriptHint) {
      console.log(`- Script: ${result.scriptHint}`);
    } else {
      console.log(`- Check script in docs for grade ${normalizeGrade(grade)}`);
    }
    console.log('- pnpm content:check');
    console.log(`- pnpm check:lessons --lesson ${id}`);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}

const isMain =
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === resolve(process.argv[1]) ||
    process.argv[1].endsWith('scripts/lessons/new.ts'));

if (isMain) {
  runCli();
}
