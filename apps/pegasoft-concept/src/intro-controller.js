import { createDecryptedCta } from './cta-decryption.js';
import { createGlobe } from './hero-globe.js';
import { GLOBE_DEFAULTS, clamp } from './hero-opening-sequence.js';
import { createCounter } from './hero-odometer.js';
import {
  OUTCOME_METRICS,
  metricLayout,
  createMetricPlayback,
} from './outcome-metrics.js';
import {
  LOADER_DEFAULTS,
  loaderState,
  heroTextReveal,
} from './loader-sequence.js';
import {
  introState,
  outcomeTitlePosition,
  outcomeColumnPosition,
} from './intro-sequence.js';
import { createScope } from '../runtime/runtime-lifecycle.js';

/** Scoped chapter lifecycle. The homepage owns its single frame scheduler. */
export function createIntroController({ stage, settings = LOADER_DEFAULTS }) {
  const scope = createScope(),
    $ = (s) => stage.querySelector(s),
    lines = [...stage.querySelectorAll('.line>span')];
  const rings = [...stage.querySelectorAll('#radar i')],
    pulse = $('#pulse');
  const pulseLayers = [0, 1].map((index) => {
    const layer = stage.ownerDocument.createElement('i');
    layer.className = 'pulse-layer';
    layer.dataset.wave = String(index + 1);
    return layer;
  });
  pulse.replaceChildren(...pulseLayers);
  pulse.dataset.fronts = '3';
  let textWidths = [],
    ringHandoffScale = null,
    metricDimensions = {};
  const counters = [...stage.querySelectorAll('.metric-value')].map((el, i) =>
    createCounter(el, {
      ...OUTCOME_METRICS[i],
      fontSize: null,
      gap: 0,
      horizontalPadding: 0,
      gradientFrom: '#edf2f7',
    }),
  );
  const ctaLabels = [...stage.querySelectorAll('.hero-actions .cta')]
    .map((button) => createDecryptedCta(button, { scope }))
    .filter(Boolean);
  const playback = createMetricPlayback();
  let resolveOpened, resolveRevealed;
  const whenOpened = new Promise((resolve) => (resolveOpened = resolve)),
    whenRevealed = new Promise((resolve) => (resolveRevealed = resolve));
  let loaderSettings = { ...LOADER_DEFAULTS, ...settings },
    reduced = false,
    running = true,
    speed = 1;
  let globe,
    geometry,
    task,
    ready = false,
    progress = 0,
    openingTime = 0,
    sceneTime = 0,
    rotationTime = 0,
    last = null,
    active = true;
  function render(dt = 0) {
    if (!ready || scope.disposed) return;
    const state = introState(progress),
      opening = loaderState(openingTime, loaderSettings, reduced),
      w = stage.clientWidth,
      h = stage.clientHeight,
      radius = Math.hypot(w / 2, h / 2) + 2;
    // A subpixel aperture keeps the hero raster warm; zero-area clips defer its
    // first paint until the reveal and stall cold playback. Timing remains zero.
    const hero = $('#hero');
    hero.style.willChange = opening.aperture < 1 ? 'clip-path' : 'auto';
    hero.style.clipPath = `circle(${Math.max(0.01, opening.aperture * radius)}px at 50% 50%)`;
    hero.style.transform = `translateY(${state.heroY * h}px)`;
    const maskOrigin = (state.horizonY - state.heroY) * h;
    // Keep the entire region above the bowl opaque. Only its lower curved edge
    // merges with the incoming atmosphere; a full ellipse would clip the top.
    hero.style.maskImage =
      state.wipe === 0
        ? 'none'
        : `linear-gradient(180deg,#000 ${Math.max(0, maskOrigin)}px,transparent ${Math.max(0, maskOrigin)}px),radial-gradient(ellipse ${Math.max(0.9 * w, 1.2 * h)}px ${h}px at 50% ${maskOrigin}px,#000 48%,transparent 66%)`;
    hero.inert = progress > 0.2 || opening.aperture < 0.95;
    hero.setAttribute('aria-hidden', String(state.wipe === 1));
    $('#radar').style.opacity = 1;
    $('#radar').style.transform = 'none';
    $('#mark').style.opacity = opening.markOpacity;
    rings.forEach((ring, index) => {
      const value = opening.rings[index],
        handoff =
          index === 0 && ringHandoffScale !== null
            ? (ringHandoffScale - loaderSettings.ringFrom) *
              (1 - Math.min(1, openingTime / 0.2))
            : 0;
      ring.style.opacity = value.opacity;
      ring.style.transform = `translate(-50%,-50%) scale(${value.scale + handoff})`;
    });
    pulse.style.visibility = opening.pulseVisible ? 'visible' : 'hidden';
    pulseLayers.forEach((layer, index) => {
      layer.style.width = layer.style.height = `${radius * 2}px`;
      layer.style.transform = `translate(-50%,-50%) scale(${opening.pulses[index].scale})`;
    });
    const nav = $('.hero-nav');
    if (nav) {
      nav.style.opacity = opening.nav * (1 - state.utilityExit);
      nav.style.transform = `translateY(${(1 - opening.nav) * -12 - state.utilityExit * 16}px)`;
      nav.inert = progress > 0.12 || opening.nav < 0.95;
    }
    const mobile = w <= 760;
    $('.hero-copy').style.transform = mobile
      ? `translateY(${-progress * h * 3}px)`
      : '';
    lines.forEach((el, i) => {
      const reveal = heroTextReveal(openingTime, i, loaderSettings, reduced),
        width = textWidths[i] || el.clientWidth,
        feather = Math.max(8, width * 0.06);
      const visible = reveal.visible * (width + feather) - feather,
        settled = reveal.settled * (width + feather) - feather;
      const accent = 'var(--action-accent,#147dff)',
        final = i === 0 ? accent : '#f5f8fc';
      el.style.transform = `translateY(${-(mobile ? 0 : state.lineExit[i]) * 115}%)`;
      el.style.opacity = 1;
      el.style.backgroundImage = `linear-gradient(90deg,${final} ${settled - feather}px,${accent} ${settled + feather}px,${accent} ${visible - feather}px,transparent ${visible + feather}px)`;
      // A permanent background-clip text fill can truncate glyph descenders on
      // WebKit. Return to ordinary glyph painting as soon as the wipe settles.
      const complete = reveal.settled === 1;
      if (complete) el.style.backgroundImage = 'none';
      el.style.color = complete ? final : 'transparent';
      el.style.backgroundClip = complete ? 'border-box' : 'text';
      el.style.webkitBackgroundClip = complete ? 'border-box' : 'text';
    });
    $('#kicker').style.opacity =
      opening.lines[0] * (mobile ? 1 : 1 - state.utilityExit);
    $('#kicker').style.transform =
      `translateY(${(1 - opening.lines[0]) * 10 - (mobile ? 0 : state.utilityExit) * 20}px)`;
    $('.hero-body').style.opacity =
      opening.body * (mobile ? 1 : 1 - state.utilityExit);
    $('.hero-body').style.transform =
      `translateY(${(1 - opening.body) * 20 - (mobile ? 0 : state.utilityExit) * 20}px)`;
    $('.hero-actions').style.opacity =
      opening.cta * (mobile ? 1 : 1 - state.utilityExit);
    $('.hero-actions').style.transform =
      `translateY(${(1 - opening.cta) * 20 - (mobile ? 0 : state.utilityExit) * 20}px)`;
    $('.hero-actions').inert = progress > 0.12 || opening.cta < 0.95;
    const bottom = $('.hero-bottom');
    if (bottom)
      bottom.style.opacity =
        opening.body * (mobile ? 1 : 1 - state.utilityExit);
    $('.horizon').style.transform = `translateY(${state.horizonY * h}px)`;
    const outcome = $('.outcome');
    outcome.hidden = !state.outcomeActive;
    outcome.dataset.horizonClear = String(state.wipe === 1);
    const titleY =
        w < 680
          ? outcomeColumnPosition(progress)
          : outcomeTitlePosition(progress),
      metrics = metricLayout(
        progress,
        w,
        h,
        OUTCOME_METRICS.length,
        metricDimensions,
      ),
      metricsY = metrics.metricsY;
    $('.outcome-title').style.transform = `translateY(${titleY * h}px)`;
    $('.metrics').style.transform = `translateY(${metricsY * h}px)`;
    $('.metrics').style.paddingTop = `${metrics.inset * h}px`;
    const targets = playback.update(metrics.rowPositions, dt);
    counters.forEach((counter, i) => counter.render(targets[i], dt, reduced));
    ctaLabels.forEach((label) =>
      label.update(sceneTime * 1000, {
        visible: active && progress < 0.12 && opening.cta > 0.1,
        reducedMotion: reduced,
      }),
    );
    if (active)
      geometry = globe.render(rotationTime, sceneTime * 1.15, reduced);
    stage.dataset.motion = JSON.stringify({
      progress,
      openingTime,
      sceneTime,
      rotationTime,
      ringHandoffScale,
      opening,
      loaderSettings,
      counterPlayback: playback.state,
      state,
      layout: { titleY, ...metrics },
      geometry,
    });
    if (opening.aperture === 1) resolveRevealed();
    if (opening.complete) resolveOpened();
  }
  function resize() {
    if (!globe || scope.disposed) return;
    globe.resize(stage.clientWidth, stage.clientHeight);
    textWidths = lines.map((line) => {
      const range = stage.ownerDocument.createRange();
      range.selectNodeContents(line);
      return range.getBoundingClientRect().width;
    });
    const outcome = $('.outcome'),
      wasHidden = outcome.hidden;
    outcome.hidden = false;
    metricDimensions = {
      introHeight:
        ($('.metrics-intro')?.offsetHeight || 0) / stage.clientHeight,
      titleHeight: $('.outcome-title').offsetHeight / stage.clientHeight,
    };
    const values = [...stage.querySelectorAll('.metric-value')];
    values.forEach((el) => (el.style.fontSize = ''));
    const base = parseFloat(getComputedStyle(values[0]).fontSize),
      width = $('.metrics').clientWidth,
      max = Math.max(...values.map((el) => el.getBoundingClientRect().width));
    const size = base * Math.min(1, (width - 4) / max);
    values.forEach((el) => (el.style.fontSize = size + 'px'));
    counters.forEach((counter) => counter.resize());
    outcome.hidden = wasHidden;
    render();
  }
  function mount() {
    if (scope.disposed) throw Error('Intro controller disposed');
    if (task) return task;
    task = createGlobe($('#globe'), {
      assetUrl: new URL(
        import.meta.env.BASE_URL + 'assets/live/hero-globe/land-dots.json',
        stage.ownerDocument.location.origin,
      ).href,
      signal: scope.signal,
    }).then(async (instance) => {
      globe = instance;
      await stage.ownerDocument.fonts.ready;
      if (scope.disposed) {
        globe.dispose();
        return;
      }
      const waiting = getComputedStyle($('#radar')).transform;
      if (waiting !== 'none') {
        const matrix = new stage.ownerDocument.defaultView.DOMMatrixReadOnly(
          waiting,
        );
        ringHandoffScale = Math.hypot(matrix.a, matrix.b);
      }
      scope.defer(() => {
        counters.forEach((counter) => counter.dispose());
        globe.dispose();
        $('#globe').dataset.disposed = 'true';
      });
      globe.configure(GLOBE_DEFAULTS);
      ready = true;
      stage.dataset.loaded = 'true';
      resize();
    });
    return task;
  }
  return {
    mount,
    update({ progress: value = progress, inView = true } = {}) {
      progress = clamp(value);
      active = inView;
    },
    resize,
    tick(now) {
      if (!active && openingTime >= loaderState(0, loaderSettings).end) {
        last = now;
        return;
      }
      const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!ready || scope.disposed) return;
      const step = dt * speed;
      if (running) {
        openingTime = reduced
          ? loaderState(0, loaderSettings).end
          : Math.min(
              openingTime + step,
              loaderState(openingTime, loaderSettings).end,
            );
        if (active) {
          sceneTime += step;
          rotationTime += step * GLOBE_DEFAULTS.speed * 1.25;
        }
        render(step);
      }
    },
    configureLoader(values) {
      loaderSettings = { ...loaderSettings, ...values };
      stage.style.setProperty(
        '--loader-beat-duration',
        loaderSettings.beatDuration + 's',
      );
      stage.style.setProperty(
        '--loader-beat-amount',
        loaderSettings.beatAmount,
      );
      stage.style.setProperty('--loader-ring-from', loaderSettings.ringFrom);
      render();
    },
    setPlayback(values) {
      if ('running' in values) running = values.running;
      if ('speed' in values) speed = values.speed;
      if ('reduced' in values) reduced = values.reduced;
      last = null;
      render();
    },
    seek(time) {
      ringHandoffScale = null;
      openingTime = clamp(time, 0, loaderState(0, loaderSettings).end);
      running = false;
      ctaLabels.forEach((label) =>
        label.update(sceneTime * 1000, { reducedMotion: true }),
      );
      render();
    },
    restart() {
      ringHandoffScale = null;
      openingTime = 0;
      sceneTime = 0;
      rotationTime = 0;
      running = true;
      last = null;
      render();
    },
    get whenOpened() {
      return whenOpened;
    },
    get whenRevealed() {
      return whenRevealed;
    },
    pause() {
      last = null;
    },
    dispose() {
      scope.dispose();
      ready = false;
      stage.dataset.loaded = 'false';
    },
    get ready() {
      return ready;
    },
  };
}
