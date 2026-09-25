import { describe, expect, it } from 'vitest';
import { advanceHeroAttempt } from './hero-attempt';

describe('hero canvas attempt lifecycle', () => {
  it('does not expire a successfully rendered attempt at the loading deadline', () => {
    expect(advanceHeroAttempt('ready', 'deadline')).toBe('ready');
    expect(advanceHeroAttempt('ready', 'fatal')).toBe('fallback');
  });
  it('does not call a created context renderer-ready before an applied frame', () => {
    let state = advanceHeroAttempt('initializing', 'canvas-created');
    state = advanceHeroAttempt(state, 'resources-ready');
    expect(state).toBe('frame-pending');
    expect(advanceHeroAttempt(state, 'frame-applied')).toBe('ready');
  });

  it('latches fallback against late resource, frame, and retry callbacks', () => {
    let state = advanceHeroAttempt('initializing', 'fatal');
    state = advanceHeroAttempt(state, 'canvas-created');
    state = advanceHeroAttempt(state, 'resources-ready');
    state = advanceHeroAttempt(state, 'frame-applied');
    expect(state).toBe('fallback');
  });

  it('falls back on a fatal active-context event after a rendered frame', () => {
    let state = advanceHeroAttempt('initializing', 'canvas-created');
    state = advanceHeroAttempt(state, 'resources-ready');
    state = advanceHeroAttempt(state, 'frame-applied');
    expect(advanceHeroAttempt(state, 'fatal')).toBe('fallback');
  });

  it('selects fallback at the deadline without allowing a late frame to revive it', () => {
    let state = advanceHeroAttempt('initializing', 'canvas-created');
    state = advanceHeroAttempt(state, 'deadline');
    expect(advanceHeroAttempt(state, 'frame-applied')).toBe('fallback');
  });
});
