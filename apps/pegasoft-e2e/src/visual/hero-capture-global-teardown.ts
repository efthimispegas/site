import { finalizeCaptureRun, readCaptureRun } from './hero-capture-run';

export default async function captureGlobalTeardown(): Promise<void> {
  const context = await readCaptureRun();
  const manifest = await finalizeCaptureRun(context);
  if (manifest.status !== 'complete') {
    throw new Error(
      `Capture failed; preserved manifest: ${context.outputRoot}/capture-manifest.json (${manifest.failures.length} failures)`,
    );
  }
}
