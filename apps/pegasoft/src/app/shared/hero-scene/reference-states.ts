export const referenceStates = [
  {
    key: 'landing',
    recordingTime: 5,
    progress: 0,
    stepIndex: 0,
  },
  {
    key: 'activation-route',
    recordingTime: 7.5,
    progress: 0.12,
    stepIndex: 0,
  },
  {
    key: 'activation-contact',
    recordingTime: 10,
    progress: 0.25,
    stepIndex: 0,
  },
  {
    key: 'clearance-travel',
    recordingTime: 12.5,
    progress: 0.36,
    stepIndex: 1,
  },
  {
    key: 'clearance-field-preview',
    recordingTime: 17.5,
    progress: 0.54,
    stepIndex: 1,
  },
  {
    key: 'field-contact',
    recordingTime: 20,
    progress: 0.63,
    stepIndex: 2,
  },
  {
    key: 'field-pulse',
    recordingTime: 22.5,
    progress: 0.75,
    stepIndex: 2,
  },
  {
    key: 'arrival-travel',
    recordingTime: 27,
    progress: 0.86,
    stepIndex: 3,
  },
  {
    key: 'arrival-lockup',
    recordingTime: 29,
    progress: 1,
    stepIndex: 3,
  },
] as const;

export type ReferenceState = (typeof referenceStates)[number];
export type ReferenceStateKey = ReferenceState['key'];
