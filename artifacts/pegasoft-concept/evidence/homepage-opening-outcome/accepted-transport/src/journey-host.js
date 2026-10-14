import {createTransportController} from './transport-controller.js';
import {scrollDistance,progressAtScroll,scrollAtProgress} from './transport-timeline.js';
import {createScope, createFrameLoop} from '../review/runtime-lifecycle.js';

/** Website scroll owner. The inspector uses the same controller independently. */
export function createJourneyHost(root) {
  const document = root.ownerDocument, window = document.defaultView;
  const stage = root.querySelector('#stage'), track = root.querySelector('#story-track');
  const staticStory = root.querySelector('#static-story'), loading = root.querySelector('#loading');
  const scope = createScope(), media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let progress = 0, distance = 1, mounted = false, task;
  const controller = createTransportController({root, stage});
  const start = () => track.getBoundingClientRect().top + window.scrollY;
  function update() {
    progress = progressAtScroll(window.scrollY - start(), window.innerHeight);
    controller.update({progress, reducedMotion: media.matches});
  }
  function resize() {
    if (scope.disposed || document.body.classList.contains('static-journey')) return;
    const previous = distance;
    distance = scrollDistance(window.innerHeight);
    track.style.height = (stage.clientHeight + distance) + 'px';
    controller.resize();
    if (mounted && previous !== distance) window.scrollTo({top: start() + scrollAtProgress(progress, window.innerHeight), behavior: 'instant'});
    update();
  }
  const loop = createFrameLoop(time => {
    if (controller.tick(time) || controller.dirty) controller.render();
  });
  function staticView() {
    loop.stop();
    staticStory.hidden = false;
    document.body.classList.add('static-journey');
  }
  function visibility() {
    if (mounted && !document.hidden && !media.matches && !document.body.classList.contains('static-journey')) loop.start();
    else loop.stop();
  }
  scope.defer(() => { loop.stop(); controller.dispose(); });
  scope.defer(() => { track.style.height = ''; document.body.classList.remove('static-journey'); staticStory.hidden = true; stage.dataset.loaded = 'false'; });
  scope.listen(window, 'scroll', update, {passive: true});
  scope.listen(document, 'visibilitychange', visibility);
  scope.listen(media, 'change', () => {
    if (media.matches) staticView();
    else { staticStory.hidden = true; document.body.classList.remove('static-journey'); mount(); resize(); visibility(); }
  });
  scope.listen(root.ownerDocument.querySelector('.skip-link'), 'click', event => {
    event.preventDefault(); staticView(); staticStory.tabIndex = -1; staticStory.focus();
  });
  function mount() {
    if (media.matches) { staticView(); stage.dataset.loaded = 'static'; return Promise.resolve(); }
    if (task) return task;
    stage.dataset.loaded = 'false'; loading.hidden = false;
    resize();
    task = controller.mount().then(() => {
      if (scope.disposed) return;
      mounted = true; stage.dataset.loaded = 'true'; loading.hidden = true;
      resize(); update(); controller.render();
      const observer = new ResizeObserver(resize); observer.observe(stage);
      scope.defer(() => observer.disconnect()); visibility();
    }).catch(error => {
      if (scope.disposed) return;
      controller.dispose(); stage.dataset.loaded = 'error'; staticView();
      console.error('Journey initialization failed', error);
    });
    return task;
  }
  const host = {mount, dispose: () => scope.dispose(), get controller() {return controller;}, get progress() {return progress;}, get activeFrameLoops() {return loop.active ? 1 : 0;}};
  stage.journey = host;
  scope.defer(() => { if (stage.journey === host) delete stage.journey; });
  return host;
}
