import {
  createMobileScrollTimeline,
  mobileJourneyProgress,
} from './mobile-scroll-timeline.js';
import { pageScroll } from './page-scroll.js';
import { createMobileReading } from './mobile-reading.js';
import { storyViewport, sameStoryViewport } from './story-viewport.js';
import { withDeadline } from './cooperative-work.js';
import { lockStartupScroll } from './startup-scroll.js';
import { createWebsiteMotionController } from './website-motion-controller.js';
import { createIntroController } from './intro-controller.js';
import {
  introScrollDistance,
  introProgressAtScroll,
  introScrollAtProgress,
} from './intro-sequence.js';
import { createTransportController } from './transport-controller.js';
import {
  scrollDistance as desktopScrollDistance,
  progressAtScroll as desktopProgressAtScroll,
  scrollAtProgress as desktopScrollAtProgress,
  scrollSpans,
  handoffEnd,
} from './transport-timeline.js';
import { createScope, createFrameLoop } from '../runtime/runtime-lifecycle.js';

/** Website scroll owner. The inspector uses the same controller independently. */
export function createJourneyHost(root) {
  const document = root.ownerDocument,
    window = document.defaultView;
  const stage = root.querySelector('#stage'),
    track = root.querySelector('#story-track');
  const staticStory = root.querySelector('#static-story'),
    loading = root.querySelector('#loading');
  const scope = createScope(),
    media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrolling = pageScroll(document);
  const startupScroll = lockStartupScroll(document, scope);
  let progress = 0,
    distance = 1,
    introDistance = 1,
    introProgress = 0,
    transportVisible = false,
    scrollPending = false,
    mounted = false,
    task;
  const introTrack = root.querySelector('#intro-track'),
    introStage = root.querySelector('#opening-stage');
  const intro = introStage
    ? createIntroController({ stage: introStage })
    : null;
  const reading = createMobileReading({ root, stage });
  const controller = createTransportController({ root, stage }),
    content = createWebsiteMotionController({ root });
  let viewport = storyViewport(stage, introStage, window);
  const progressAtScroll = (offset, height) =>
    scrolling.mobile && scrolling.timeline
      ? scrolling.timeline.progressAt(offset)
      : desktopProgressAtScroll(offset, height);
  const scrollAtProgress = (p, height) =>
    scrolling.mobile && scrolling.timeline
      ? scrolling.timeline.offsetAt(p)
      : desktopScrollAtProgress(p, height);
  let layoutReady = false,
    renderHeight = 0,
    introRenderHeight = 0;
  document.fonts.ready.then(() => {
    if (!scope.disposed) {
      layoutReady = false;
      resize();
    }
  });
  const start = () => track.getBoundingClientRect().top + scrolling.y;
  function update() {
    if (viewport.width <= 760 !== scrolling.mobile) return;
    // A fast swipe may reach transport before parsing/warmup finishes. Keep
    // that chapter at its first frame; preparation continues independently.
    if (
      !mounted &&
      !startupScroll.locked &&
      !document.body.classList.contains('static-journey') &&
      scrolling.y > start()
    )
      scrolling.to({ top: start(), behavior: 'instant' });
    if (intro) {
      const top = introTrack.getBoundingClientRect().top + scrolling.y;
      introProgress = introProgressAtScroll(
        scrolling.y - top,
        viewport.introHeight,
      );
      introStage.style.clipPath =
        introProgress >= 0.9 ? 'inset(0 0 100px 0)' : 'none';
      intro.update({
        progress: introProgress,
        inView: introTrack.getBoundingClientRect().bottom > 0,
      });
    }
    progress = progressAtScroll(scrolling.y - start(), viewport.height);
    const bounds = stage.getBoundingClientRect();
    transportVisible = bounds.bottom > 0 && bounds.top < window.innerHeight;
    reading.update(
      controller.update({ progress, reducedMotion: media.matches }),
    );
    content?.update({ reducedMotion: media.matches });
  }
  function resize() {
    if (scope.disposed || document.body.classList.contains('static-journey'))
      return;
    const next = storyViewport(stage, introStage, window);
    // Safari toolbar/keyboard changes can resize innerHeight while 100svh stays
    // fixed. They must never re-lengthen the story or move native page scroll.
    const sceneChanged =
      renderHeight !== stage.clientHeight ||
      introRenderHeight !== introStage?.clientHeight;
    renderHeight = stage.clientHeight;
    introRenderHeight = introStage?.clientHeight;
    if (layoutReady && sameStoryViewport(viewport, next)) {
      if (sceneChanged) {
        intro?.resize();
        controller.resize();
      }
      update();
      return;
    }
    const previous = distance,
      previousIntro = introDistance,
      storyTop = start();
    const afterStory = scrolling.y > storyTop + distance;
    // Read the native offset now, not the previous animation frame's progress.
    const changedScrollOwner = viewport.width <= 760 !== scrolling.mobile;
    const priorProgress = changedScrollOwner
      ? progress
      : progressAtScroll(scrolling.y - storyTop, viewport.height);
    const introTop = introTrack?.getBoundingClientRect().top + scrolling.y;
    const priorIntro = changedScrollOwner
      ? introProgress
      : intro
        ? introProgressAtScroll(scrolling.y - introTop, viewport.introHeight)
        : 0;
    const wasIntro = scrolling.y < storyTop;
    if (afterStory) content?.update();
    const anchor = content?.scrollAnchor;
    viewport = next;
    layoutReady = true;
    if (intro) {
      introDistance = introScrollDistance(viewport.introHeight);
      introTrack.style.height = viewport.tailHeight + introDistance + 'px';
      intro.resize();
    }
    scrolling.timeline = scrolling.mobile
      ? createMobileScrollTimeline(viewport.height, reading.measure?.())
      : null;
    distance =
      scrolling.timeline?.distance || desktopScrollDistance(viewport.height);
    track.style.height = viewport.tailHeight + distance + 'px';
    controller.resize();
    content?.resize();
    if (
      mounted &&
      !startupScroll.locked &&
      (previous !== distance || previousIntro !== introDistance)
    ) {
      const top =
        afterStory && anchor
          ? anchor.element.getBoundingClientRect().top +
            scrolling.y +
            anchor.fraction * anchor.element.getBoundingClientRect().height
          : intro && wasIntro
            ? introTrack.getBoundingClientRect().top +
              scrolling.y +
              introScrollAtProgress(priorIntro, viewport.introHeight)
            : start() + scrollAtProgress(priorProgress, viewport.height);
      scrolling.to({ top, behavior: 'instant' });
    }
    update();
  }
  const loop = createFrameLoop((time) => {
    if (scrollPending) {
      scrollPending = false;
      update();
    }
    intro?.tick(time);
    content?.tick(time);
    if (
      transportVisible &&
      controller.state === 'mounted' &&
      (controller.tick(time) || controller.dirty)
    )
      controller.render();
  });
  function staticView() {
    startupScroll.release();
    loop.stop();
    content?.update({ reducedMotion: true });
    staticStory.hidden = false;
    document.body.classList.add('static-journey');
  }
  function visibility() {
    intro?.pause();
    content?.pause();
    if (
      (mounted || intro?.ready) &&
      !document.hidden &&
      !media.matches &&
      !document.body.classList.contains('static-journey') &&
      introStage?.dataset.preparing !== 'true'
    )
      loop.start();
    else loop.stop();
  }
  scope.defer(() => {
    loop.stop();
    controller.dispose();
    intro?.dispose();
    content?.dispose();
    reading.dispose();
  });
  scope.defer(() => {
    track.style.height = '';
    if (introTrack) introTrack.style.height = '';
    document.body.classList.remove('static-journey');
    staticStory.hidden = true;
    stage.dataset.loaded = 'false';
  });
  scope.defer(
    scrolling.listen(() => {
      if (loop.active) scrollPending = true;
      else update();
    }),
  );
  scope.listen(window, 'resize', resize);
  scope.listen(document, 'visibilitychange', visibility);
  scope.listen(media, 'change', () => {
    if (media.matches) staticView();
    else {
      staticStory.hidden = true;
      document.body.classList.remove('static-journey');
      mount();
      resize();
      visibility();
    }
  });
  scope.listen(
    root.ownerDocument.querySelector('.skip-link'),
    'click',
    (event) => {
      event.preventDefault();
      staticView();
      staticStory.tabIndex = -1;
      staticStory.focus();
    },
  );
  function mount() {
    content?.mount();
    if (media.matches) {
      staticView();
      stage.dataset.loaded = 'static';
      return Promise.resolve();
    }
    if (task) return task;
    stage.dataset.loaded = 'false';
    loading.hidden = false;
    resize();
    if (introStage) introStage.dataset.preparing = 'true';
    // Fetch model bytes during the opening; defer CPU/GPU construction until
    // the accepted opening has played. Resource loading cannot stall its clock.
    controller.preload({ signal: scope.signal });
    const introTask = withDeadline(intro ? intro.mount() : Promise.resolve(), {
      milliseconds: 20000,
      signal: scope.signal,
    }).then(() => {
      if (scope.disposed) return;
      if (introStage) introStage.dataset.preparing = 'false';
      visibility();
      return intro?.whenRevealed;
    });
    const fail = (error) => {
      if (scope.disposed) return;
      controller.dispose();
      intro?.dispose();
      loading.hidden = true;
      stage.dataset.loaded = 'error';
      staticView();
      console.error('Journey initialization failed', error);
    };
    task = introTask
      .then(() => {
        if (
          scope.disposed ||
          document.body.classList.contains('static-journey')
        )
          return;
        startupScroll.release();
        resize();
        update();
        // Later chapters can prepare while the visitor reads hero/outcomes.
        Promise.resolve(intro?.whenOpened)
          .then(() => {
            if (!scope.disposed)
              return withDeadline(controller.mount(), {
                milliseconds: 60000,
                signal: scope.signal,
              });
          })
          .then(() => {
            if (scope.disposed) return;
            mounted = true;
            stage.dataset.loaded = 'true';
            loading.hidden = true;
            resize();
            update();
            controller.render();
            const wordmark = root.querySelector('#particle-wordmark');
            const observer = new ResizeObserver((entries) => {
              if (entries.some((entry) => entry.target === wordmark))
                content?.resize();
              if (entries.some((entry) => entry.target !== wordmark)) resize();
            });
            observer.observe(stage);
            if (introStage) observer.observe(introStage);
            if (wordmark) observer.observe(wordmark);
            scope.defer(() => observer.disconnect());
            visibility();
          })
          .catch(fail);
      })
      .catch(fail);
    return task;
  }
  function navigate(
    target,
    { behavior = media.matches ? 'instant' : 'smooth' } = {},
  ) {
    if (startupScroll.locked) return;
    if (document.body.classList.contains('static-journey')) {
      (target === 'services'
        ? root.querySelector('#static-services')
        : staticStory
      ).scrollIntoView({ behavior, block: 'start' });
      return;
    }
    const top =
      target === 'trust'
        ? start() + distance
        : target === 'about'
          ? introTrack.getBoundingClientRect().top +
            scrolling.y +
            introScrollAtProgress(0.5, viewport.introHeight)
          : start() +
            (scrolling.mobile
              ? scrollAtProgress(
                  mobileJourneyProgress('handoff', 0.63),
                  viewport.height,
                )
              : (scrollSpans(viewport.height)[0] * 0.79) / handoffEnd);
    scrolling.to({ top, behavior });
  }
  const host = {
    mount,
    navigate,
    refreshLanguage() {
      content?.resize();
      reading.refresh();
      layoutReady = false;
      resize();
      if (controller.state === 'mounted') controller.render();
    },
    dispose: () => scope.dispose(),
    get controller() {
      return controller;
    },
    get intro() {
      return intro;
    },
    get content() {
      return content;
    },
    get progress() {
      return progress;
    },
    get activeFrameLoops() {
      return loop.active ? 1 : 0;
    },
  };
  stage.journey = host;
  scope.defer(() => {
    if (stage.journey === host) delete stage.journey;
  });
  return host;
}
