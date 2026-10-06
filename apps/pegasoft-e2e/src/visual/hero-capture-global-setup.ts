import type { FullConfig } from '@playwright/test';
import {
  CAPTURE_RUN_CONTEXT_ENV,
  initializeCaptureRun,
  type CaptureProvenance,
} from './hero-capture-run';

export type CaptureSetupMetadata = {
  root: string;
  expectedStates: readonly string[];
  provenance: CaptureProvenance;
};

export default async function captureGlobalSetup(
  config: FullConfig,
): Promise<void> {
  const metadata = config.metadata.heroCapture as
    | CaptureSetupMetadata
    | undefined;
  if (!metadata)
    throw new Error('Capture global setup requires metadata.heroCapture');
  const context = await initializeCaptureRun(
    metadata.root,
    metadata.expectedStates,
    metadata.provenance,
  );
  process.env[CAPTURE_RUN_CONTEXT_ENV] = context.contextPath;
}
