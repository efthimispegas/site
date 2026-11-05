import { LOADER_DEFAULTS, loaderState } from './loader-sequence.js';

/** The approved homepage renderer. Each host supplies its existing clock. */
export function createSiteLoader(stage, settings = LOADER_DEFAULTS) {
  const radar = stage.querySelector('.radar');
  const rings = [...radar.querySelectorAll('i')];
  const mark = stage.querySelector('.loader-mark');
  const pulse = stage.querySelector('.pulse');
  const layers = [0, 1].map((index) => {
    const layer = stage.ownerDocument.createElement('i');
    layer.className = 'pulse-layer';
    layer.dataset.wave = String(index + 1);
    return layer;
  });
  pulse.replaceChildren(...layers);
  pulse.dataset.fronts = '3';
  let preset = { ...LOADER_DEFAULTS, ...settings },
    handoff = null;
  function configure(values) {
    preset = { ...preset, ...values };
    stage.style.setProperty(
      '--loader-beat-duration',
      preset.beatDuration + 's',
    );
    stage.style.setProperty('--loader-beat-amount', preset.beatAmount);
    stage.style.setProperty('--loader-ring-from', preset.ringFrom);
  }
  configure(settings);
  return {
    configure,
    captureWaitingBeat() {
      const transform =
        stage.ownerDocument.defaultView.getComputedStyle(radar).transform;
      if (transform !== 'none') {
        const matrix = new stage.ownerDocument.defaultView.DOMMatrixReadOnly(
          transform,
        );
        handoff = Math.hypot(matrix.a, matrix.b);
      }
    },
    resetHandoff() {
      handoff = null;
    },
    get handoffScale() {
      return handoff;
    },
    render(time, reduced = false) {
      const opening = loaderState(time, preset, reduced);
      const radius =
        Math.hypot(stage.clientWidth / 2, stage.clientHeight / 2) + 2;
      radar.style.opacity = 1;
      radar.style.transform = 'none';
      mark.style.opacity = opening.markOpacity;
      rings.forEach((ring, index) => {
        const value = opening.rings[index];
        const offset =
          index === 0 && handoff !== null
            ? (handoff - preset.ringFrom) * (1 - Math.min(1, time / 0.2))
            : 0;
        ring.style.opacity = value.opacity;
        ring.style.transform = `translate(-50%,-50%) scale(${value.scale + offset})`;
      });
      pulse.style.visibility = opening.pulseVisible ? 'visible' : 'hidden';
      layers.forEach((layer, index) => {
        layer.style.width = layer.style.height = `${radius * 2}px`;
        layer.style.transform = `translate(-50%,-50%) scale(${opening.pulses[index].scale})`;
      });
      return {
        ...opening,
        apertureRadius: Math.max(0.01, opening.aperture * radius),
      };
    },
  };
}

/** Native pages use the same renderer, preset, waiting beat and clamped clock. */
export function createPageLoader({ stage, reduced, onFrame, onReady }) {
  const loader = createSiteLoader(stage);
  const window = stage.ownerDocument.defaultView;
  let frame,
    disposed = false,
    started = false,
    time = 0,
    last = null;
  function tick(now) {
    if (disposed) return;
    const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.1);
    last = now;
    time = reduced.matches
      ? loaderState(0).end
      : Math.min(time + dt, loaderState(0).end);
    const opening = loader.render(time, reduced.matches);
    // The expanding transparent aperture reveals the page beneath the loader.
    stage.style.maskImage = `radial-gradient(circle at 50% 50%, transparent ${opening.apertureRadius}px, #000 ${opening.apertureRadius + 0.5}px)`;
    stage.dataset.motion = JSON.stringify({
      openingTime: time,
      opening,
      loaderSettings: LOADER_DEFAULTS,
    });
    onFrame(opening);
    if (opening.complete) {
      stage.hidden = true;
      onReady();
    } else frame = window.requestAnimationFrame(tick);
  }
  function preferenceChanged() {
    if (started && !stage.hidden && reduced.matches) {
      window.cancelAnimationFrame(frame);
      tick(window.performance.now());
    }
  }
  reduced.addEventListener('change', preferenceChanged);
  stage.ownerDocument.fonts.ready.then(() => {
    if (disposed) return;
    loader.captureWaitingBeat();
    stage.dataset.loaded = 'true';
    started = true;
    frame = window.requestAnimationFrame(tick);
  });
  return {
    dispose() {
      disposed = true;
      window.cancelAnimationFrame(frame);
      reduced.removeEventListener('change', preferenceChanged);
    },
  };
}
