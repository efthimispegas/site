import js from '@eslint/js';

export default [
  { ignores: ['tools/homepage-motion.mjs','tools/website-check.mjs','tools/transport-check.mjs','tools/website-motion-check.mjs','tools/transport-amendment-check.mjs','tools/package-reviewed-slice.mjs','tools/verify-website-motion.mjs','tools/controller-lifecycle-check.mjs','tools/outcome-bounce-check.mjs','tools/cloud-review-check.mjs','tools/loading-check.mjs','tools/package-opening.mjs','tools/homepage-check.mjs','tools/verify-homepage.mjs','tools/loader-check.mjs','tools/review-check.mjs','tools/controller-review-check.mjs','tools/serve-controller-reference.mjs','review/**/*', '!review/cloud-motion.js', '!review/cloud-story-sequence.js', '!review/runtime-lifecycle.js', '!review/ship-jet-controller.js', '!review/ship-jet-scene.js', '!review/ship-jet-inspection.js', '!review/ship-jet-integration.js', '!review/cloud-story-layers.js', '!review/jet-crossing.js', '!review/ship-water.js', 'review/site-audit.js', 'generation/**', 'public/**'] },
  js.configs.recommended,
  { languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: {
    process: 'readonly', console: 'readonly', Buffer: 'readonly', URL: 'readonly', URLSearchParams: 'readonly',
    document: 'readonly', window: 'readonly', getComputedStyle: 'readonly', matchMedia: 'readonly',
    Event: 'readonly', requestAnimationFrame: 'readonly', innerWidth: 'readonly', innerHeight: 'readonly',
    structuredClone: 'readonly', AbortController: 'readonly', cancelAnimationFrame: 'readonly', ResizeObserver: 'readonly', location: 'readonly', localStorage: 'readonly', navigator: 'readonly', fetch: 'readonly', EventTarget: 'readonly', setTimeout: 'readonly', DOMException: 'readonly', devicePixelRatio: 'readonly',
  } }, rules: {'no-empty': ['error', {allowEmptyCatch:true}]} },
];
