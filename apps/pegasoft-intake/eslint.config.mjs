import js from '@eslint/js';
export default [
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: Object.fromEntries(
        [
          'Request',
          'Response',
          'Blob',
          'File',
          'FormData',
          'fetch',
          'crypto',
          'AbortSignal',
          'URL',
          'URLSearchParams',
          'TextEncoder',
          'TextDecoder',
        ].map((name) => [name, 'readonly']),
      ),
    },
    rules: js.configs.recommended.rules,
  },
  {
    files: [
      'tools/gmail-retention/Code.js',
      'tools/gmail-retention/Qualification.js',
    ],
    languageOptions: { sourceType: 'script' },
  },
];
