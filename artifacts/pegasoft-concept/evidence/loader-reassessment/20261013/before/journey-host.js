import {createIntroController} from './intro-controller.js';
import {introScrollDistance} from './intro-sequence.js';
import {createTransportController} from './transport-controller.js';
import {scrollDistance,progressAtScroll,scrollAtProgress} from './transport-timeline.js';
import {createScope, createFrameLoop} from '../review/runtime-lifecycle.js';

/** Website scroll owner. The inspector uses the same controller independently. */
export function createJourneyHost(root) {
  const document = root.ownerDocument, window = document.defaultView;
  const stage = root.querySelector('#stage'), track = root.querySelector('#story-track');
  const staticStory = root.querySelector('#static-story'), loading = root.querySelector('#loading');
  const scope = createScope(), media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let progress = 0, distance = 1, introDistance = 1, introProgress = 0, inIntro = true, mounted = false, task;
  const introTrack=root.querySelector('#intro-track'),introStage=root.querySelector('#opening-stage');
  const intro=introStage?createIntroController({stage:introStage}):null;
  const controller = createTransportController({root, stage});
  const start = () => track.getBoundingClientRect().top + window.scrollY;
  function update() {
    if(intro){
      const top=introTrack.getBoundingClientRect().top+window.scrollY;
      introProgress=Math.max(0,Math.min(1,(window.scrollY-top)/introDistance));
      inIntro=window.scrollY<start();
      intro.update({progress:introProgress,inView:introTrack.getBoundingClientRect().bottom>0});
    }
    progress = progressAtScroll(window.scrollY - start(), window.innerHeight);
    controller.update({progress, reducedMotion: media.matches});
  }
  function resize() {
    if (scope.disposed || document.body.classList.contains('static-journey')) return;
    const previous = distance,previousIntro=introDistance;
    if(intro){introDistance=introScrollDistance(window.innerHeight);introTrack.style.height=(introStage.clientHeight+introDistance)+'px';intro.resize();}
    distance = scrollDistance(window.innerHeight);
    track.style.height = (stage.clientHeight + distance) + 'px';
    controller.resize();
    if(mounted&&(previous!==distance||previousIntro!==introDistance)){
      const top=intro&&inIntro?introTrack.getBoundingClientRect().top+window.scrollY+introProgress*introDistance:start()+scrollAtProgress(progress,window.innerHeight);
      window.scrollTo({top,behavior:'instant'});
    }
    update();
  }
  const loop = createFrameLoop(time => {
    intro?.tick(time);
    if(controller.state==='mounted'&&(controller.tick(time)||controller.dirty))controller.render();
  });
  function staticView() {
    loop.stop();
    staticStory.hidden = false;
    document.body.classList.add('static-journey');
  }
  function visibility() {
    intro?.pause();
    if ((mounted||intro?.ready) && !document.hidden && !media.matches && !document.body.classList.contains('static-journey')) loop.start();
    else loop.stop();
  }
  scope.defer(() => { loop.stop(); controller.dispose();intro?.dispose(); });
  scope.defer(() => { track.style.height = '';if(introTrack)introTrack.style.height=''; document.body.classList.remove('static-journey'); staticStory.hidden = true; stage.dataset.loaded = 'false'; });
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
    const introTask=intro?intro.mount().then(()=>{if(!scope.disposed){resize();visibility();}}):Promise.resolve();
    task = Promise.all([introTask,controller.mount()]).then(() => {
      if (scope.disposed) return;
      mounted = true; stage.dataset.loaded = 'true'; loading.hidden = true;
      resize(); update(); controller.render();
      const observer = new ResizeObserver(resize); observer.observe(stage);if(introStage)observer.observe(introStage);
      scope.defer(() => observer.disconnect()); visibility();
    }).catch(error => {
      if (scope.disposed) return;
      controller.dispose();intro?.dispose(); stage.dataset.loaded = 'error'; staticView();
      console.error('Journey initialization failed', error);
    });
    return task;
  }
  const host = {mount, dispose: () => scope.dispose(), get controller() {return controller;}, get intro() {return intro;}, get progress() {return progress;}, get activeFrameLoops() {return loop.active ? 1 : 0;}};
  stage.journey = host;
  scope.defer(() => { if (stage.journey === host) delete stage.journey; });
  return host;
}
