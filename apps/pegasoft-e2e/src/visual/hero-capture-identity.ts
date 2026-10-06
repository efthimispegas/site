import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import type { Page } from '@playwright/test';
import type { CaptureProvenanceInput } from './hero-capture-provenance';

const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const git = (...args: string[]) => execFileSync('git', args, { cwd: workspaceRoot });
export function readCaptureIdentities() {
  const source = JSON.parse(readFileSync(path.join(workspaceRoot, 'docs/hero-reference/live/source-evidence.json'), 'utf8'));
  const bundles = [...new Set<string>(source.sources.filter((entry: { url?: string; sha256?: string }) => entry.url?.includes('/CommonScripts.') && /^[a-f0-9]{64}$/u.test(entry.sha256 ?? '')).map((entry: { sha256: string }) => entry.sha256))];
  if (bundles.length !== 1) throw new Error('Reference bundle identity is ambiguous');
  const files = git('ls-files', '--others', '--exclude-standard', '-z').toString().split('\0').filter((file) => /^(apps|libs|tools)\//u.test(file) && !/(?:^|\/)(?:test-output|test-results|playwright-report|out-tsc|node_modules|\.next[^/]*|dist|\.cache)(?:\/|$)/u.test(file));
  return {
    sourceIdentity: { siteUrl: source.canonicalUrl, bundleSha256: bundles[0], recordingSha256: hash(readFileSync(path.join(workspaceRoot, 'docs/vectrfl_recording.mov'))) },
    implementationIdentity: { gitRevision: git('rev-parse', 'HEAD').toString().trim(), trackedDiffSha256: hash(git('diff', 'HEAD', '--binary')), untrackedInputFiles: files.map((file) => ({ path: file, sha256: hash(readFileSync(path.join(workspaceRoot, file))) })) },
  };
}

/** CDP reports the fonts that painted glyphs, rather than font-family fallback declarations. */
export async function readPaintedFonts(page: Page): Promise<CaptureProvenanceInput['fontEvidence']> {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument');
    const { nodeIds } = await session.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-hero-copy] h1, [data-hero-copy] p, [data-hero-process-step] h3, header a' });
    const families = new Map<string, { family: string; loaded: boolean; assetSha256: string }>();
    const knownFiles: Record<string, string> = {
      ArialMT: '/System/Library/Fonts/Supplemental/Arial.ttf',
      'Arial-BoldMT': '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
      'AvenirNext-Bold': '/System/Library/Fonts/Avenir Next.ttc',
      'AvenirNext-Regular': '/System/Library/Fonts/Avenir Next.ttc',
      'AvenirNext-Medium': '/System/Library/Fonts/Avenir Next.ttc',
      'AvenirNext-DemiBold': '/System/Library/Fonts/Avenir Next.ttc',
      Helvetica: '/System/Library/Fonts/Helvetica.ttc',
      'Helvetica-Bold': '/System/Library/Fonts/Helvetica.ttc',
    };
    for (const nodeId of nodeIds) {
      const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
      for (const font of fonts) {
        if (font.glyphCount <= 0) continue;
        const file = knownFiles[font.postScriptName];
        if (!file || font.isCustomFont) throw new Error(`No verified asset for painted font ${font.familyName}/${font.postScriptName}`);
        families.set(font.postScriptName, { family: font.familyName, loaded: true, assetSha256: hash(readFileSync(file)) });
      }
    }
    if (!families.size) throw new Error('No painted font evidence');
    return [...families.values()];
  } finally { await session.detach(); }
}
