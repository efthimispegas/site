import js from '@eslint/js';

export default [
  { ignores: ['review/**/*', '!review/cloud-motion.js', '!review/cloud-story-sequence.js', '!review/runtime-lifecycle.js', '!review/ship-jet-controller.js', '!review/ship-jet-scene.js', '!review/ship-jet-inspection.js', '!review/ship-jet-integration.js', '!review/cloud-story-layers.js', '!review/jet-crossing.js', '!review/ship-water.js', 'generation/**', 'public/**'] },
  js.configs.recommended,
  { languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: {
    process: 'readonly', console: 'readonly', Buffer: 'readonly', URL: 'readonly', URLSearchParams: 'readonly',
    document: 'readonly', window: 'readonly', getComputedStyle: 'readonly', matchMedia: 'readonly',
    Event: 'readonly', requestAnimationFrame: 'readonly', innerWidth: 'readonly', innerHeight: 'readonly',
    structuredClone: 'readonly', AbortController: 'readonly', cancelAnimationFrame: 'readonly', ResizeObserver: 'readonly', location: 'readonly', localStorage: 'readonly', navigator: 'readonly', fetch: 'readonly', EventTarget: 'readonly', setTimeout: 'readonly', DOMException: 'readonly', devicePixelRatio: 'readonly',
  } }, rules: {'no-empty': ['error', {allowEmptyCatch:true}]} },
];
