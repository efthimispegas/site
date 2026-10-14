export const HERO_LOADING_DEADLINE_MS = 15_000;

export type HeroAttemptState =
  'initializing' | 'loading-resources' | 'frame-pending' | 'ready' | 'fallback';

export type HeroAttemptEvent =
  'canvas-created' | 'resources-ready' | 'frame-applied' | 'fatal' | 'deadline';

/** Attempts are one-way: fallback is useful UI, never renderer readiness. */
export function advanceHeroAttempt(
  current: HeroAttemptState,
  event: HeroAttemptEvent,
): HeroAttemptState {
  if (current === 'fallback') return current;
  if (event === 'fatal') return 'fallback';
  if (current === 'ready') return current;
  if (event === 'deadline') return 'fallback';
  if (current === 'initializing' && event === 'canvas-created') {
    return 'loading-resources';
  }
  if (current === 'loading-resources' && event === 'resources-ready') {
    return 'frame-pending';
  }
  if (current === 'frame-pending' && event === 'frame-applied') return 'ready';
  return current;
}
