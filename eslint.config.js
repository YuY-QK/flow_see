import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/**
 * 分层依赖方向只能向下（教学平台方案第 3 节）：
 *   apps/web → content → templates → blocks → runtime → core
 */
const layer = (files, banned, message) => ({
  files,
  rules: {
    'no-restricted-imports': [
      'error',
      { patterns: banned.map((group) => ({ group: [group, `${group}/**`], message })) },
    ],
  },
});

export default tseslint.config(
  { ignores: ['**/dist', '**/node_modules', 'android', 'ios', 'server/data', '.wrangler'] },
  {
    files: ['server/**/*.mjs', 'functions/**/*.{js,mjs}', 'scripts/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.node, ...globals.worker } },
    rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '^_', ignoreRestSiblings: true }] },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  layer(
    ['packages/core/**'],
    [
      'react',
      'react-dom',
      '@flow-see/runtime',
      '@flow-see/blocks',
      '@flow-see/templates',
      '@flow-see/content',
      '@/',
    ],
    'core 是纯 TypeScript，不能依赖 React 或上层包',
  ),
  layer(
    ['packages/runtime/**'],
    ['@flow-see/blocks', '@flow-see/templates', '@flow-see/content', '@/'],
    'runtime 不能依赖上层包（blocks / templates / content / web）',
  ),
  layer(
    ['packages/blocks/**'],
    ['@flow-see/templates', '@flow-see/content', '@/'],
    'blocks 不能依赖上层包（templates / content / web）',
  ),
  layer(
    ['packages/templates/**'],
    ['@flow-see/content', '@/'],
    'templates 不能依赖 content 或网站代码',
  ),
  layer(
    ['packages/content/**'],
    ['@flow-see/runtime', 'react', 'react-dom', '@/'],
    'content 是数据和校验，不能依赖界面代码',
  ),
);
