import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

// Baseline diagnostic only: exercise the existing renderer, never alter it.
const output = new URL('./', import.meta.url);
const url = 'http://127.0.0.1:4200';
const report = {
  schemaVersion: 1,
  startedAtUtc: new Date().toISOString(),
  revision: execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
  trackedDiffSha256: createHash('sha256')
    .update(execFileSync('git', ['diff', '--binary', 'HEAD']))
    .digest('hex'),
  mode: 'development-baseline-not-production-acceptance',
  url,
  viewport: { width: 1508, height: 761 },
  deviceScaleFactor: 2,
  errors: [],
  artifacts: [],
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
report.browser = browser.version();
try {
  const page = await browser.newPage({
    viewport: report.viewport,
    deviceScaleFactor: 2,
  });
  page.on('pageerror', (error) => report.errors.push(error.message));
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator('[data-hero-shell][data-loader-cleared="true"]')
    .waitFor({ timeout: 45000 });
  await page
    .locator('[data-hero-render-ready="true"]')
    .waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  report.before = await page.evaluate(() => {
    const rect = (r) => ({
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      right: r.right,
      bottom: r.bottom,
    });
    const measureText = (el) => {
      if (!el) return null;
      const range = document.createRange();
      range.selectNodeContents(el);
      const boxes = [...range.getClientRects()].map(rect);
      const clipping = [];
      for (
        let ancestor = el.parentElement;
        ancestor;
        ancestor = ancestor.parentElement
      ) {
        const style = getComputedStyle(ancestor);
        if (
          /(hidden|clip|scroll|auto)/.test(
            style.overflowX + ' ' + style.overflowY,
          )
        ) {
          const bounds = ancestor.getBoundingClientRect();
          clipping.push({
            tag: ancestor.tagName,
            className: ancestor.className,
            bounds: rect(bounds),
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            textExceedsX: boxes.some(
              (b) => b.x < bounds.x - 1 || b.right > bounds.right + 1,
            ),
            textExceedsY: boxes.some(
              (b) => b.y < bounds.y - 1 || b.bottom > bounds.bottom + 1,
            ),
          });
        }
      }
      return {
        text: el.textContent,
        bounds: rect(el.getBoundingClientRect()),
        boxes,
        lineCount: new Set(boxes.map((b) => Math.round(b.y))).size,
        clipping,
      };
    };
    const canvas = document.querySelector(
      '[data-hero-surface="canvas"] canvas',
    );
    return {
      scrollY,
      directStateRequested: location.search.includes('__hero'),
      ctas: [
        ...document.querySelectorAll('.pegasoft-header__ctas .pill-btn-span'),
      ].map(measureText),
      cue: measureText(
        document.querySelector('[data-hero-copy="landing"] button span span'),
      ),
      canvas: canvas
        ? {
            width: canvas.width,
            height: canvas.height,
            css: rect(canvas.getBoundingClientRect()),
          }
        : null,
    };
  });
  async function capture(name) {
    const path = new URL(name, output);
    await page.screenshot({ path: path.pathname });
    const bytes = await readFile(path);
    report.artifacts.push({
      path: `docs/hero-reference/repairs/s0/browser/${name}`,
      sizeBytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  await capture('ordinary-landing.png');
  report.contextLoss = await page.evaluate(() => {
    const canvas = document.querySelector(
      '[data-hero-surface="canvas"] canvas',
    );
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_lose_context');
    window.__baselineContextLost = false;
    canvas?.addEventListener(
      'webglcontextlost',
      () => {
        window.__baselineContextLost = true;
      },
      { once: true },
    );
    if (!extension) return { supported: false };
    extension.loseContext();
    return { supported: true, actualCanvas: true };
  });
  await page.waitForTimeout(1200);
  report.after = await page.evaluate(() => ({
    contextLossEventObserved: window.__baselineContextLost === true,
    fallbackCount: document.querySelectorAll('[data-hero-surface="fallback"]')
      .length,
    canvasCount: document.querySelectorAll(
      '[data-hero-surface="canvas"] canvas',
    ).length,
    renderReady: document
      .querySelector('[data-hero-render-ready]')
      ?.getAttribute('data-hero-render-ready'),
    loaderCleared: document
      .querySelector('[data-hero-shell]')
      ?.getAttribute('data-loader-cleared'),
  }));
  await capture('after-context-loss.png');
  report.finishedAtUtc = new Date().toISOString();
  await writeFile(
    new URL('local-before-cases.json', output),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
