import './mobile-reference.css';
import { mobileServicesTitlePose } from './mobile-reference-motion.js';
import { createMobileReferenceJet } from './mobile-reference-jet.js';
import { fetchModelBytes } from './model-download.js';
import { assets } from '../runtime/runtime-assets.js';
import { createShipJetController } from '../runtime/ship-jet-controller.js';
import { loadShipJetScene } from '../runtime/ship-jet-scene.js';
import {
  gates,
  ease,
  storySpanScale,
  roadContentLayout,
} from '../runtime/handoff-sequence.js';
import { createTransportSequence } from './transport-sequence.js';

export function createTransportController({ root, stage }) {
  stage.dataset.mobileJourney = 'reference';
  let modelBuffers;
  const controller = createShipJetController({
    root,
    stage,
    prepareVariants: true,
    jetFactory: createMobileReferenceJet,
    contentSpacing: 0.85,
    loadScene: (params) =>
      loadShipJetScene({
        ...params,
        modelBuffers,
        alpha: true,
        pickupConfig: { addBehind: true },
        sequenceFactory: createTransportSequence,
      }),
  });
  function update(input) {
    const r = controller.update(input);
    if (!r) return;
    const $ = (selector) => root.querySelector(selector),
      p = r.progress,
      h = stage.clientHeight;
    const handoff = r.chapter === 'handoff';
    if (r.mobileReference) {
      const title = $('#services-title'),
        gutter = parseFloat(getComputedStyle(title).left),
        pose = mobileServicesTitlePose(
          p,
          stage.clientWidth,
          title.scrollWidth,
          gutter,
        );
      title.style.opacity = handoff && pose.visible ? '1' : '0';
      title.style.transform = `translateX(${pose.x}px)`;
      r.servicesTitle = pose;
      r.servicesOpacity = 0;
      stage.dataset.motion = JSON.stringify(r);
      return r;
    }
    const services = handoff
      ? ease((p - gates.release) / (0.03 / storySpanScale)) *
        (1 - ease((p - gates.services) / (gates.upper - gates.services)))
      : 0;
    const overlay = $('#services-overlay'),
      rail = $('#services-rail');
    overlay.style.opacity = String(services);
    overlay.style.top =
      50 -
      34 * ease((p - gates.services) / (gates.upper - gates.services)) +
      '%';
    rail.style.transform =
      'translateX(' +
      -Math.max(0, rail.scrollWidth - stage.clientWidth) *
        Math.max(
          0,
          Math.min(
            1,
            (p - (gates.release + 0.02 / storySpanScale)) /
              (0.08 / storySpanScale),
          ),
        ) +
      'px)';
    const title = $('#services-title'),
      titleProgress = Math.max(
        0,
        Math.min(
          1,
          (p - (gates.release + 0.02 / storySpanScale)) /
            (0.08 / storySpanScale),
        ),
      );
    title.style.opacity = String(services);
    if (
      root.ownerDocument.documentElement.lang === 'el' &&
      stage.clientWidth <= 760
    ) {
      const width = stage.clientWidth,
        inset = Math.max(16, Math.min(32, width * 0.015)),
        overflow = Math.max(0, title.scrollWidth - width + 2 * inset);
      title.style.transform =
        'translateX(' +
        (width * 0.025 * (1 - titleProgress) - overflow * titleProgress) +
        'px)';
    } else
      title.style.transform = 'translateX(' + 2.5 * (1 - titleProgress) + 'vw)';
    overlay.setAttribute('aria-hidden', String(services < 0.01));
    $('#road-copy ol').style.setProperty(
      '--road-row-gap',
      0.36 * h * 0.85 + 'px',
    );
    const road = roadContentLayout(
      handoff ? p : 0.97 + p * 0.25,
      h,
      $('#road-copy ol').offsetHeight,
    );
    $('#road-copy h2').style.transform = 'translateY(' + road.leftY + 'px)';
    $('#road-copy ol').style.transform = 'translateY(' + road.rightY + 'px)';
    $('#road-copy').style.clipPath = handoff
      ? 'none'
      : 'inset(0 0 ' +
        Math.max(0, Math.min(1, (r.cutNDC + 1) / 2)) * 100 +
        '% 0)';
    $('#road-copy').setAttribute(
      'aria-hidden',
      String(handoff ? !road.visible : r.chapter === 'crossing' || p >= 0.44),
    );
    r.roadCopy = road;
    r.servicesOpacity = services;
    stage.dataset.motion = JSON.stringify(r);
    return r;
  }
  function preload({ signal } = {}) {
    if (modelBuffers) return;
    modelBuffers = new Map(
      Object.entries(assets)
        .filter(([key]) => key.endsWith('.glb'))
        .map(([, url]) => {
          const bytes = fetchModelBytes(url, { signal });
          // Errors remain observable by the model loader; background prefetch never
          // creates an unhandled rejection or owns a frame/scroll clock.
          bytes.catch(() => {});
          return [url, bytes];
        }),
    );
  }
  return {
    ...controller,
    preload,
    mount: () => controller.mount(),
    update,
    resize() {
      controller.resize();
      if (controller.trace) update();
    },
    render: () => controller.render(),
    tick: (t) => controller.tick(t),
    dispose: () => controller.dispose(),
    get dirty() {
      return controller.dirty;
    },
    get trace() {
      return controller.trace;
    },
    get state() {
      return controller.state;
    },
  };
}
