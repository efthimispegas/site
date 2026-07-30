import {
  expect,
  test,
  type Locator,
  type Page,
} from '@playwright/test';

const REFERENCE_STATE = 'landing-idle';
const HERO_URL = `/?__heroState=${REFERENCE_STATE}&__heroTime=2500`;

type RuntimeErrors = {
  console: string[];
  page: string[];
};

function captureRuntimeErrors(page: Page): RuntimeErrors {
  const errors: RuntimeErrors = {
    console: [],
    page: [],
  };

  page.on('pageerror', (error) => {
    errors.page.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.console.push(message.text());
    }
  });

  return errors;
}

async function waitForNamedHeroState(page: Page) {
  const state = page.locator(
    `[data-hero-reference-state="${REFERENCE_STATE}"]`,
  );

  await expect(state).toHaveCount(1, { timeout: 10_000 });
  await expect(state).toHaveAttribute('data-hero-direct-entry', 'true');
  await expect(state).toHaveAttribute('data-hero-render-ready', 'true', {
    timeout: 10_000,
  });
  await expect(state.locator('[data-hero-surface]')).toBeVisible();

  return state;
}

async function expectUsefulLanding(page: Page, state: Locator) {
  await expect(
    page.getByRole('heading', {
      name: /the new standard\s+in product delivery/i,
      level: 1,
    }),
  ).toBeVisible();
  await expect(page.locator('header.pegasoft-header')).toBeVisible();
  await expect(state.locator('[data-hero-surface]')).toBeVisible();
}

async function expectLoaderDoesNotBlock(page: Page) {
  const shell = page.locator('[data-hero-shell]');
  const loader = page.locator(
    '[aria-hidden="true"][data-direct][data-hidden][data-revealing]',
  );

  await expect(shell).toHaveAttribute('data-loader-cleared', 'true');
  await expect(loader).toHaveCount(1);
  await expect(loader).toHaveAttribute('data-hidden', 'true');
  await expect(loader).toBeHidden();
  await expect(loader).toHaveCSS('pointer-events', 'none');
  await expect(page.locator('body')).not.toHaveClass(/pegasoft-locked/u);
}

async function tabTo(page: Page, target: Locator, maximumPresses = 8) {
  for (let attempt = 0; attempt < maximumPresses; attempt += 1) {
    await page.keyboard.press('Tab');

    if (
      await target.evaluate(
        (element) => element === element.ownerDocument.activeElement,
      )
    ) {
      return;
    }
  }

  await expect(
    target,
    `Expected keyboard focus within ${maximumPresses} Tab presses`,
  ).toBeFocused();
}

async function expectKeyboardNavigation(page: Page) {
  const isMobile = (page.viewportSize()?.width ?? 1280) <= 820;

  if (!isMobile) {
    const servicesLink = page
      .getByRole('navigation', { name: 'Primary links' })
      .getByRole('link', { name: 'Services', exact: true });

    await expect(servicesLink).toBeVisible();
    await tabTo(page, servicesLink);
    await expect(servicesLink).toBeFocused();
    return;
  }

  const menuButton = page.getByRole('button', { name: 'Toggle menu' });
  await expect(menuButton).toBeVisible();
  await tabTo(page, menuButton);
  await expect(menuButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');

  const mobileNavigation = page.getByRole('navigation', {
    name: 'Mobile navigation',
  });
  const servicesLink = mobileNavigation.getByRole('link', {
    name: 'Services',
    exact: true,
  });

  await expect(mobileNavigation).toHaveClass(/\bis-open\b/u);
  await expect(servicesLink).toBeVisible();
  await tabTo(page, servicesLink);
  await expect(servicesLink).toBeFocused();
}

async function readStateSignature(state: Locator) {
  return state.evaluate((element) => ({
    directEntry: element.getAttribute('data-hero-direct-entry'),
    motion: element.getAttribute('data-hero-motion'),
    pointerTrail: element.getAttribute('data-hero-pointer-trail'),
    profile: element.getAttribute('data-hero-profile'),
    referenceState: element.getAttribute('data-hero-reference-state'),
    sceneProgress: element.getAttribute('data-hero-scene-progress'),
    seed: element.getAttribute('data-hero-seed'),
    step: element.getAttribute('data-hero-step'),
    surface: element
      .querySelector('[data-hero-surface]')
      ?.getAttribute('data-hero-surface'),
  }));
}

function expectNoRuntimeErrors(errors: RuntimeErrors) {
  expect(errors.page, 'uncaught page errors').toEqual([]);
  expect(errors.console, 'console and hydration errors').toEqual([]);
}

test('reduced motion is useful, non-blocking, deterministic, and keyboard reachable', async ({
  page,
}) => {
  const errors = captureRuntimeErrors(page);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(HERO_URL);

  const state = await waitForNamedHeroState(page);
  await expect(state).toHaveAttribute('data-hero-motion', 'reduced');
  await expect(state).toHaveAttribute('data-hero-pointer-trail', 'false');
  await expectUsefulLanding(page, state);
  await expectLoaderDoesNotBlock(page);

  const firstSignature = await readStateSignature(state);
  await page.reload();
  const reloadedState = await waitForNamedHeroState(page);
  const secondSignature = await readStateSignature(reloadedState);

  expect(secondSignature).toEqual(firstSignature);
  await expectKeyboardNavigation(page);
  expectNoRuntimeErrors(errors);
});

test('forced WebGL fallback is useful, non-blocking, deterministic, and keyboard reachable', async ({
  page,
}) => {
  const errors = captureRuntimeErrors(page);

  await page.goto(`${HERO_URL}&__heroFallback=1`);

  const state = await waitForNamedHeroState(page);
  await expect(state).toHaveAttribute('data-hero-motion', 'static');
  await expect(state).toHaveAttribute('data-hero-pointer-trail', 'false');
  await expect(
    state.locator(
      `[data-hero-surface="fallback"][data-hero-fallback-state="${REFERENCE_STATE}"]`,
    ),
  ).toBeVisible();
  await expect(state.locator('[data-hero-fallback-shape]')).toHaveCount(4);
  await expectUsefulLanding(page, state);
  await expectLoaderDoesNotBlock(page);

  const firstSignature = await readStateSignature(state);
  await page.reload();
  const reloadedState = await waitForNamedHeroState(page);
  const secondSignature = await readStateSignature(reloadedState);

  expect(secondSignature).toEqual(firstSignature);
  await expectKeyboardNavigation(page);
  expectNoRuntimeErrors(errors);
});

test('closed mobile navigation is hidden from assistive technology and keyboard focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(HERO_URL);

  const menuButton = page.getByRole('button', { name: 'Toggle menu' });
  const mobileNavigation = page.locator('#pegasoft-mobile-navigation');
  const mobileControls = mobileNavigation.locator('a, button');

  await expect(mobileNavigation).toHaveAttribute('aria-hidden', 'true');
  await expect(mobileNavigation).toHaveAttribute('inert', '');
  await expect(mobileControls).toHaveCount(7);
  await expect
    .poll(() =>
      mobileControls.evaluateAll((elements) =>
        elements.every((element) => element.getAttribute('tabindex') === '-1'),
      ),
    )
    .toBe(true);

  await menuButton.click();
  await expect(mobileNavigation).toHaveAttribute('aria-hidden', 'false');
  await expect(mobileNavigation).not.toHaveAttribute('inert', '');
  await expect(
    mobileNavigation.getByRole('button', { name: 'Close menu' }),
  ).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(mobileNavigation).toHaveAttribute('aria-hidden', 'true');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menuButton).toBeFocused();
});

test('static fallback selects a deterministic composition for every hero phase', async ({
  page,
}) => {
  const cases = [
    ['loader-mark', 'loader', 2000],
    ['landing-idle', 'landing', 2500],
    ['clearance-travel', 'journey', 0],
    ['field-pulse-a', 'field', 300],
    ['arrival-lockup', 'arrival', 1200],
    ['journey-exit', 'exit', 1000],
  ] as const;

  for (const [stateKey, composition, localTime] of cases) {
    await page.goto(
      `/?__heroState=${stateKey}&__heroTime=${localTime}&__heroFallback=1`,
    );

    const fallback = page.locator(
      `[data-hero-surface="fallback"][data-hero-fallback-state="${stateKey}"]`,
    );
    await expect(fallback).toHaveAttribute(
      'data-hero-fallback-composition',
      composition,
    );
    await expect(fallback.locator('[data-hero-fallback-shape]')).toHaveCount(4);

    const firstMarkup = await fallback.locator('svg').innerHTML();
    await page.reload();
    const secondMarkup = await page
      .locator(
        `[data-hero-surface="fallback"][data-hero-fallback-state="${stateKey}"] svg`,
      )
      .innerHTML();

    expect(secondMarkup).toBe(firstMarkup);
  }
});
