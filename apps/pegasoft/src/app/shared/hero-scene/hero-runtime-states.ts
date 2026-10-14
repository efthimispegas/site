import type { HeroReferenceStateKey, HeroRuntimeState } from './hero-contract';

const SETTLED_PAGE_CLOCKS = {
  loaderMs: 5000,
  landingIdleMs: 0,
  fieldPulseMs: 0,
  arrivalMs: 0,
} as const;

export const heroRuntimeStates = [
  {
    key: 'loader-mark',
    phase: 'loader',
    progress: { target: null, settledCamera: null },
    copyState: 'none',
    processStepIndex: null,
    localPhase: 'loader-mark',
    captureClocks: { ...SETTLED_PAGE_CLOCKS, loaderMs: 2000 },
  },
  {
    key: 'world-reveal',
    phase: 'reveal',
    progress: { target: null, settledCamera: null },
    copyState: 'none',
    processStepIndex: null,
    localPhase: 'world-reveal',
    captureClocks: { ...SETTLED_PAGE_CLOCKS, loaderMs: 3500 },
  },
  {
    key: 'landing',
    phase: 'landing',
    progress: { target: 0, settledCamera: 0 },
    copyState: 'landing',
    processStepIndex: null,
    localPhase: 'landing-base',
    captureClocks: SETTLED_PAGE_CLOCKS,
  },
  {
    key: 'landing-idle',
    phase: 'landing',
    progress: { target: 0, settledCamera: 0 },
    copyState: 'landing',
    processStepIndex: null,
    localPhase: 'landing-packet-visible',
    captureClocks: {
      ...SETTLED_PAGE_CLOCKS,
      loaderMs: 7500,
      landingIdleMs: 2500,
    },
  },
  {
    key: 'activation-route',
    phase: 'journey',
    progress: { target: 0.12395, settledCamera: 0.12395 },
    copyState: 'step-01-activation',
    processStepIndex: 0,
    localPhase: null,
    captureClocks: SETTLED_PAGE_CLOCKS,
  },
  {
    key: 'activation-contact',
    phase: 'journey',
    progress: { target: 0.16128, settledCamera: 0.16128 },
    copyState: 'step-01-activation',
    processStepIndex: 0,
    localPhase: null,
    captureClocks: SETTLED_PAGE_CLOCKS,
  },
  {
    key: 'clearance-travel',
    phase: 'journey',
    progress: { target: 0.32704, settledCamera: 0.32704 },
    copyState: 'step-02-clearance',
    processStepIndex: 1,
    localPhase: null,
    captureClocks: SETTLED_PAGE_CLOCKS,
  },
  {
    key: 'clearance-field-preview',
    phase: 'journey',
    progress: { target: 0.54059, settledCamera: 0.54059 },
    copyState: 'step-02-clearance',
    processStepIndex: 1,
    localPhase: null,
    captureClocks: SETTLED_PAGE_CLOCKS,
  },
  {
    key: 'field-approach',
    phase: 'journey',
    progress: { target: 0.60928, settledCamera: 0.60928 },
    copyState: 'step-02-clearance',
    processStepIndex: 1,
    localPhase: null,
    captureClocks: SETTLED_PAGE_CLOCKS,
  },
  {
    key: 'field-contact',
    phase: 'journey',
    progress: { target: 0.74, settledCamera: 0.74 },
    copyState: 'step-03-field-match',
    processStepIndex: 2,
    localPhase: null,
    captureClocks: SETTLED_PAGE_CLOCKS,
  },
  {
    key: 'field-pulse-a',
    phase: 'journey',
    progress: { target: 0.74, settledCamera: 0.74 },
    copyState: 'step-03-field-match',
    processStepIndex: 2,
    localPhase: 'field-pulse-inner',
    captureClocks: { ...SETTLED_PAGE_CLOCKS, fieldPulseMs: 300 },
  },
  {
    key: 'field-pulse-b',
    phase: 'journey',
    progress: { target: 0.74, settledCamera: 0.74 },
    copyState: 'step-03-field-match',
    processStepIndex: 2,
    localPhase: 'field-pulse-outer',
    captureClocks: { ...SETTLED_PAGE_CLOCKS, fieldPulseMs: 2800 },
  },
  {
    key: 'arrival-travel',
    phase: 'journey',
    progress: { target: 0.89301, settledCamera: 0.89301 },
    copyState: 'step-04-arrival',
    processStepIndex: 3,
    localPhase: null,
    captureClocks: SETTLED_PAGE_CLOCKS,
  },
  {
    key: 'arrival-lockup',
    phase: 'journey',
    progress: { target: 0.9, settledCamera: 0.9 },
    copyState: 'step-04-arrival',
    processStepIndex: 3,
    localPhase: 'arrival-readable-lockup',
    captureClocks: { ...SETTLED_PAGE_CLOCKS, arrivalMs: 0 },
  },
  {
    key: 'journey-exit',
    phase: 'exit',
    progress: { target: 1.0513, settledCamera: 1.0513 },
    copyState: 'step-04-arrival-transitioning-out',
    processStepIndex: 3,
    localPhase: null,
    captureClocks: { ...SETTLED_PAGE_CLOCKS, arrivalMs: 1000 },
  },
] as const satisfies readonly HeroRuntimeState[];

const heroRuntimeStateByKey = new Map<HeroReferenceStateKey, HeroRuntimeState>(
  heroRuntimeStates.map((state) => [state.key, state]),
);

export function getHeroRuntimeState(
  key: HeroReferenceStateKey,
): HeroRuntimeState {
  const state = heroRuntimeStateByKey.get(key);

  if (!state) {
    throw new Error(`Unknown hero runtime state: ${key}`);
  }

  return state;
}
