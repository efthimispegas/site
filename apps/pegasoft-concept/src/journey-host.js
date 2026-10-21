import {withDeadline} from './cooperative-work.js';
import {lockStartupScroll} from './startup-scroll.js';
import {createWebsiteMotionController} from './website-motion-controller.js';
import {createIntroController} from './intro-controller.js';
import {introScrollDistance,introProgressAtScroll,introScrollAtProgress} from './intro-sequence.js';
import {createTransportController} from './transport-controller.js';
import {scrollDistance,progressAtScroll,scrollAtProgress,scrollSpans,handoffEnd} from './transport-timeline.js';
import {createScope, createFrameLoop} from '../review/runtime-lifecycle.js';

/** Website scroll owner. The inspector uses the same controller independently. */
export function createJourneyHost(root) {
  const document = root.ownerDocument, window = document.defaultView;
  const stage = root.querySelector('#stage'), track = root.querySelector('#story-track');
  const staticStory = root.querySelector('#static-story'), loading = root.querySelector('#loading');
  const scope = createScope(), media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const startupScroll=lockStartupScroll(document,scope);
  let progress = 0, distance = 1, introDistance = 1, introProgress = 0, inIntro = true, transportVisible=false, scrollPending=false, mounted = false, task;
  const introTrack=root.querySelector('#intro-track'),introStage=root.querySelector('#opening-stage');
  const intro=introStage?createIntroController({stage:introStage}):null;
  const controller = createTransportController({root, stage}),content=createWebsiteMotionController({root});
  const start = () => track.getBoundingClientRect().top + window.scrollY;
  function update() {
    // A fast swipe may reach transport before parsing/warmup finishes. Keep
    // that chapter at its first frame; preparation continues independently.
    if(!mounted&&!startupScroll.locked&&!document.body.classList.contains('static-journey')&&window.scrollY>start())window.scrollTo({top:start(),behavior:'instant'});
    if(intro){
      const top=introTrack.getBoundingClientRect().top+window.scrollY;
      introProgress=introProgressAtScroll(window.scrollY-top,window.innerHeight);
      introStage.style.clipPath=introProgress>=.9?'inset(0 0 100px 0)':'none';
      inIntro=window.scrollY<start();
      intro.update({progress:introProgress,inView:introTrack.getBoundingClientRect().bottom>0});
    }
    progress = progressAtScroll(window.scrollY - start(), window.innerHeight);
    const bounds=stage.getBoundingClientRect();transportVisible=bounds.bottom>0&&bounds.top<window.innerHeight;
    controller.update({progress, reducedMotion: media.matches});content?.update({reducedMotion:media.matches});
  }
  function resize() {
    if (scope.disposed || document.body.classList.contains('static-journey')) return;
    const previous = distance,previousIntro=introDistance,afterStory=window.scrollY>start()+distance,anchor=content?.scrollAnchor;
    if(intro){introDistance=introScrollDistance(window.innerHeight);introTrack.style.height=(introStage.clientHeight+introDistance)+'px';intro.resize();}
    distance = scrollDistance(window.innerHeight);
    track.style.height = (stage.clientHeight + distance) + 'px';
    controller.resize();content?.resize();
    if(mounted&&!startupScroll.locked&&(previous!==distance||previousIntro!==introDistance)){
      const top=afterStory&&anchor?anchor.element.getBoundingClientRect().top+window.scrollY+anchor.fraction*anchor.element.getBoundingClientRect().height:intro&&inIntro?introTrack.getBoundingClientRect().top+window.scrollY+introScrollAtProgress(introProgress,window.innerHeight):start()+scrollAtProgress(progress,window.innerHeight);
      window.scrollTo({top,behavior:'instant'});
    }
    update();
  }
  const loop = createFrameLoop(time => {
    if(scrollPending){scrollPending=false;update();}
    intro?.tick(time);content?.tick(time);
    if(transportVisible&&controller.state==='mounted'&&(controller.tick(time)||controller.dirty))controller.render();
  });
  function staticView() {
    startupScroll.release();loop.stop();content?.update({reducedMotion:true});
    staticStory.hidden = false;
    document.body.classList.add('static-journey');
  }
  function visibility() {
    intro?.pause();content?.pause();
    if ((mounted||intro?.ready) && !document.hidden && !media.matches && !document.body.classList.contains('static-journey')&&introStage?.dataset.preparing!=='true') loop.start();
    else loop.stop();
  }
  scope.defer(() => { loop.stop(); controller.dispose();intro?.dispose();content?.dispose(); });
  scope.defer(() => { track.style.height = '';if(introTrack)introTrack.style.height=''; document.body.classList.remove('static-journey'); staticStory.hidden = true; stage.dataset.loaded = 'false'; });
  scope.listen(window, 'scroll', () => {if(loop.active)scrollPending=true;else update();}, {passive: true});
  scope.listen(window, 'resize', resize);
  scope.listen(document, 'visibilitychange', visibility);
  scope.listen(media, 'change', () => {
    if (media.matches) staticView();
    else { staticStory.hidden = true; document.body.classList.remove('static-journey'); mount(); resize(); visibility(); }
  });
  scope.listen(root.ownerDocument.querySelector('.skip-link'), 'click', event => {
    event.preventDefault(); staticView(); staticStory.tabIndex = -1; staticStory.focus();
  });
  function mount() {
    content?.mount();
    if (media.matches) { staticView(); stage.dataset.loaded = 'static'; return Promise.resolve(); }
    if (task) return task;
    stage.dataset.loaded = 'false'; loading.hidden = false;
    resize();
    if(introStage)introStage.dataset.preparing='true';
    // Fetch model bytes during the opening; defer CPU/GPU construction until
    // the accepted opening has played. Resource loading cannot stall its clock.
    controller.preload({signal:scope.signal});
    const introTask=withDeadline(intro?intro.mount():Promise.resolve(),{milliseconds:20000,signal:scope.signal}).then(()=>{
      if(scope.disposed)return;
      if(introStage)introStage.dataset.preparing='false';
      visibility();return intro?.whenRevealed;
    });
    const fail=error=>{
      if(scope.disposed)return;
      controller.dispose();intro?.dispose();loading.hidden=true;stage.dataset.loaded='error';staticView();
      console.error('Journey initialization failed',error);
    };
    task=introTask.then(()=>{
      if(scope.disposed||document.body.classList.contains('static-journey'))return;
      startupScroll.release();resize();update();
      // Later chapters can prepare while the visitor reads hero/outcomes.
      Promise.resolve(intro?.whenOpened).then(()=>{if(!scope.disposed)return withDeadline(controller.mount(),{milliseconds:60000,signal:scope.signal});}).then(()=>{
        if(scope.disposed)return;
        mounted=true;stage.dataset.loaded='true';loading.hidden=true;
        resize();update();controller.render();
        const observer=new ResizeObserver(resize);observer.observe(stage);if(introStage)observer.observe(introStage);const wordmark=root.querySelector('#particle-wordmark');if(wordmark)observer.observe(wordmark);
        scope.defer(()=>observer.disconnect());visibility();
      }).catch(fail);
    }).catch(fail);
    return task;
  }
  function navigate(target,{behavior=media.matches?'instant':'smooth'}={}){
    if(startupScroll.locked)return;
    if(document.body.classList.contains('static-journey')){staticStory.scrollIntoView({behavior,block:'start'});return;}
    const top=target==='trust'?start()+distance:target==='about'?introTrack.getBoundingClientRect().top+window.scrollY+introScrollAtProgress(.50,window.innerHeight):start()+scrollSpans(window.innerHeight)[0]*.79/handoffEnd;
    window.scrollTo({top,behavior});
  }
  const host = {mount,navigate,refreshLanguage(){content?.resize();if(controller.state==='mounted')controller.render();}, dispose: () => scope.dispose(), get controller() {return controller;}, get intro() {return intro;}, get content(){return content;}, get progress() {return progress;}, get activeFrameLoops() {return loop.active ? 1 : 0;}};
  stage.journey = host;
  scope.defer(() => { if (stage.journey === host) delete stage.journey; });
  return host;
}
