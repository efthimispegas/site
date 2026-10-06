import { expect, test, type Page } from '@playwright/test';
import { readCaptureSample } from './hero-capture-contract';
import type { HeroPresentation, readHeroCaptureWithPresentation, compareHeroPresentationBrackets } from './hero-presentation-readback';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const evidenceRoot = path.resolve(process.cwd(), '../../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-exit-presentation-readback');
const modulePath = './hero-presentation-readback';
async function read(page: Page, expectedFrameId?: number) {
  const module = await import(modulePath).catch((error) => {
    if (error.code !== 'MODULE_NOT_FOUND' && error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    return {};
  });
  expect(typeof module.readHeroCaptureWithPresentation, 'same-task presentation collector is missing').toBe('function');
  return page.evaluate(module.readHeroCaptureWithPresentation as typeof readHeroCaptureWithPresentation, { expectedFrameId });
}
async function fixture(page: Page, css = '', extra = '') {
  await page.setViewportSize({ width: 600, height: 400 });
  await page.setContent(`<style>html,body{margin:0}#outer{position:relative;width:200px;height:180px}#inner{position:relative;width:180px;height:160px}canvas{display:block;width:240px;height:220px}${css}</style><div id="outer" data-hero-render-ready="true"><div id="inner"><canvas width="240" height="220"></canvas>${extra}</div></div>`);
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => {
      const canvas = document.querySelector('canvas');
      canvas?.getContext('2d')?.fillRect(0,0,240,220);
      Object.assign(window, { __pegasoftHeroFrame: {
        renderedAtMs: performance.now(),
        frame: { frameId: 7, target: 0, rendered: { value: 0, velocity: 0 }, fieldElapsedMs: 0 },
        appliedConsumers: { camera: { frameId: 7 }, field: { frameId: 7 } },
        canvas: { cssWidth: 240, cssHeight: 220, backingWidth: 240, backingHeight: 220 },
      } });
      resolve();
    }));
  });
}
async function retain(name: string, value: unknown) {
  await mkdir(evidenceRoot + '/fixtures', { recursive: true });
  await writeFile(evidenceRoot + '/fixtures/' + name + '.json', JSON.stringify(value,null,2)+'\n');
}

// Break caught: sampling only canvas bounds misses actual ancestor clips.
test('same-task readback intersects nested overflow and rectangular inset clips', async ({ page }) => {
  await fixture(page, '#outer{border:4px solid black;overflow:hidden}#inner{clip-path:inset(10px 20px 30px 5px)}');
  const sample = await read(page);
  expect(sample.presentation.clipping.status).toBe('supported-rectangular');
  expect(sample.presentation.clipping.intersection).toEqual({ x:9,y:14,width:155,height:120 });
  expect(sample.presentation.binding.status).toBe('bound-to-completed-frame');
  expect(sample.presentation.binding.frameId).toBe(sample.record?.frame.frameId);
  await retain('nested-clips', sample);
});

// Break caught: the canvas's own opacity hides ancestor multiplication/zero.
test('readback records ancestor CSS opacity product and preserves zero', async ({ page }) => {
  await fixture(page, '#outer{opacity:.5}#inner{opacity:.4}canvas{opacity:.25}');
  const sample = await read(page);
  expect(sample.presentation.opacity.status).toBe('observed-css-opacity-product');
  expect(sample.presentation.opacity.cssOpacityProduct).toBeCloseTo(.05,9);
  expect(sample.presentation.opacity.quantity).toBe('ancestor-css-group-opacity-product');
  expect(sample.presentation.opacity.sceneMaterialOpacity).toBeNull();
  await page.locator('#inner').evaluate((node) => { (node as HTMLElement).style.opacity = '0'; });
  const zero = await read(page);
  expect(zero.presentation.opacity.cssOpacityProduct).toBe(0);
  await retain('opacity-product-zero', { sample, zero });
});

// Break caught: bounding boxes of transformed or rounded shapes invent planes.
test('readback rejects nonrectangular and transformed clipping without inventing a plane', async ({ page }) => {
  for (const [name,css] of [
    ['rotation','#inner{transform:rotate(10deg);overflow:hidden}'],
    ['shape','#inner{clip-path:circle(30%)}'],
    ['rounded','#inner{clip-path:inset(10px round 12px)}'],
    ['overflow-radius','#inner{overflow:hidden;border-radius:12px}'],
  ]) {
    await fixture(page, css);
    const sample = await read(page);
    expect(sample.presentation.clipping.status, name).toBe('unsupported');
    expect(sample.presentation.clipping.intersection, name).toBeNull();
    expect(sample.presentation.clipping.horizontalCropPlaneCssY, name).toBeNull();
    await retain('unsupported-'+name, sample);
  }
});

// Break caught: external opacity filters and boxless ancestors masquerade as
// a complete applied opacity scalar.
test('readback marks unsupported compositing separately from observed CSS values', async ({ page }) => {
  for (const [name,css] of [['filter','#inner{filter:opacity(.3)}'],['boxless','#inner{display:contents;opacity:.4}']]) {
    await fixture(page, css);
    const sample = await read(page);
    expect(sample.presentation.opacity.status, name).toBe('uncertain');
    expect(sample.presentation.opacity.reasons.length, name).toBeGreaterThan(0);
    expect(sample.presentation.opacity.sceneMaterialOpacity, name).toBeNull();
    await retain('unsupported-opacity-'+name, sample);
  }
});

// Break caught: a requested frame or stale consumer is called same-frame data.
test('readback rejects frame mismatch and incomplete consumer application', async ({ page }) => {
  await fixture(page);
  const mismatch = await read(page, 8);
  expect(mismatch.presentation.binding.status).toBe('mismatch');
  expect(mismatch.presentation.status).toBe('uncertain');
  await page.evaluate(() => {
    const runtime = window as unknown as Window & { __pegasoftHeroFrame: { appliedConsumers: { camera: { frameId: number } } } };
    runtime.__pegasoftHeroFrame.appliedConsumers.camera.frameId = 6;
  });
  const stale = await read(page);
  expect(stale.presentation.binding.status).toBe('unavailable');
  await retain('frame-mismatch', { mismatch, stale });
});

// Break caught: an uncompleted render or missing canvas is assigned geometry.
test('readback cannot bind pending renders or an ambiguous canvas selection', async ({ page }) => {
  await fixture(page);
  await page.evaluate(() => {
    const runtime = window as unknown as Window & { __pegasoftHeroFrame: { renderedAtMs?: number } };
    delete runtime.__pegasoftHeroFrame.renderedAtMs;
  });
  const pending = await read(page);
  expect(pending.presentation.binding.status).toBe('unavailable');
  await fixture(page, '', '<canvas width="10" height="10"></canvas>');
  const ambiguous = await read(page);
  expect(ambiguous.presentation.status).toBe('unavailable');
  expect(ambiguous.presentation.clipping.intersection).toBeNull();
  await retain('pending-ambiguous', { pending, ambiguous });
});

// Break caught: real CSS animation changes presentation while a completed GL
// frame record stays fixed; that record cannot certify presentation timing.
test('running native opacity animation remains temporally uncertain on a completed frame', async ({ page }) => {
  await fixture(page, '@keyframes fade{from{opacity:.2}to{opacity:.8}}#inner{animation:fade 100s linear infinite}');
  const sample = await read(page);
  expect(sample.presentation.binding.status).toBe('bound-to-completed-frame');
  expect(sample.presentation.opacity.status).toBe('uncertain');
  expect(sample.presentation.temporal.status).toBe('uncertain-animated-presentation');
  expect(sample.presentation.timing.sampleStartedAtMs).toBeGreaterThanOrEqual(Number(sample.record?.renderedAtMs));
  expect(sample.presentation.timing.sampleEndedAtMs).toBeGreaterThanOrEqual(sample.presentation.timing.sampleStartedAtMs);
  expect(sample.presentation.opacity.cssOpacityProduct).toBeGreaterThanOrEqual(.2);
  expect(sample.presentation.opacity.cssOpacityProduct).toBeLessThan(.8);
  await retain('real-animation-timing', sample);
});

// Break caught: arbitrary overflow ancestors are intersected despite a fixed
// descendant escaping their containing block.
test('fixed descendant clipping ambiguity reports a barrier rather than a false intersection', async ({ page }) => {
  await fixture(page, '#outer{overflow:hidden}#inner{position:fixed;inset:0;width:180px;height:160px}');
  const sample = await read(page);
  expect(sample.presentation.clipping.status).toBe('unsupported');
  expect(sample.presentation.clipping.intersection).toBeNull();
  await retain('fixed-overflow-barrier', sample);
});

// Break caught: missing completed-frame context is silently manufactured.
test('readback retains DOM values but cannot invent a missing completed frame', async ({ page }) => {
  await fixture(page);
  await page.evaluate(() => { delete (window as Window & { __pegasoftHeroFrame?: unknown }).__pegasoftHeroFrame; });
  const sample = await read(page);
  expect(sample.record).toBeNull();
  expect(sample.presentation.binding.status).toBe('unavailable');
  expect(sample.presentation.status).toBe('uncertain');
  await retain('missing-frame', sample);
});

async function parity(initial: unknown, before: unknown, after: unknown) {
  const module = await import(modulePath).catch((error) => {
    if (error.code !== 'MODULE_NOT_FOUND' && error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    return {};
  });
  expect(typeof module.compareHeroPresentationBrackets, 'presentation bracket parity is missing').toBe('function');
  return (module.compareHeroPresentationBrackets as typeof compareHeroPresentationBrackets)(initial as HeroPresentation, before as HeroPresentation, after as HeroPresentation);
}

// Break caught: equal completed-frame IDs alone conceal changed presentation.
test('bracket parity masks DOM readback when opacity changes around acquisition', async ({ page }) => {
  await fixture(page, '#inner{opacity:.4}');
  const initial = await read(page), before = await read(page);
  await page.locator('#inner').evaluate((node) => { (node as HTMLElement).style.opacity = '.7'; });
  const after = await read(page);
  const result = await parity(initial.presentation, before.presentation, after.presentation);
  expect(result.status).toBe('blocked');
  expect(result.readback).toBeNull();
  await retain('bracket-opacity-mismatch', { initial, before, after, result });
});

// Break caught: matching a pair while ignoring initial acquisition admits drift.
test('bracket parity compares the initial acquisition clipping too', async ({ page }) => {
  await fixture(page, '#inner{clip-path:inset(10px)}');
  const initial = await read(page);
  await page.locator('#inner').evaluate((node) => { (node as HTMLElement).style.clipPath = 'inset(20px)'; });
  const before = await read(page), after = await read(page);
  const result = await parity(initial.presentation, before.presentation, after.presentation);
  expect(result.status).toBe('blocked');
  expect(result.readback).toBeNull();
  await retain('bracket-initial-clip-mismatch', { initial, before, after, result });
});

// Break caught: a stable supported sample is unnecessarily discarded, or a
// running CSS animation is accepted solely because values happen to match.
test('bracket parity exposes only stable supported DOM quantities', async ({ page }) => {
  await fixture(page, '#inner{clip-path:inset(10px);opacity:.4}');
  const sample = await read(page);
  const stable = await parity(sample.presentation, sample.presentation, sample.presentation);
  expect(stable.status).toBe('supported-stable-brackets');
  expect(stable.readback?.ancestorCssOpacityProduct).toBe(.4);
  expect(stable.qualification).toBe('blocked');
  await fixture(page, '@keyframes fade{from{opacity:.2}to{opacity:.8}}#inner{animation:fade 100s linear infinite}');
  const animated = await read(page);
  const blocked = await parity(animated.presentation, animated.presentation, animated.presentation);
  expect(blocked.status).toBe('blocked');
  expect(blocked.readback).toBeNull();
  await retain('bracket-supported-animation-control', { sample, stable, animated, blocked });
});

// Break caught: a separate collector exists but acquisition drops its readback.
test('capture acquisition retains presentation from its own completed-frame task', async ({ page }) => {
  await fixture(page, '#inner{opacity:.4;clip-path:inset(10px)}');
  const sample = await readCaptureSample(page);
  expect(sample.presentation?.binding.frameId).toBe(sample.record?.frame.frameId);
  expect(sample.presentation?.opacity.cssOpacityProduct).toBe(.4);
  await retain('capture-integration', sample);
});
