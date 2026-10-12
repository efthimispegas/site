const video=document.querySelector('#reference-video');
const clips={
 loader:{path:'../evidence/motion/clips/loader.mp4',label:'Loader reference clip',caption:'Dedicated loader recording · 0–2.89 seconds. The clip starts within the loader and can end before every entrance finishes.'},
 entry:{path:'../evidence/motion/clips/hero-entry.mp4',label:'Hero entrance reference clip',caption:'Hero walkthrough · 0–5 seconds. Observe aperture / headline overlap, right-side globe crop, dotted geography and raised arcs.'},
 hover:{path:'../evidence/motion/clips/hero-hover.mp4',label:'Pointer response reference clip',caption:'Hero walkthrough · 5–9.5 seconds. Observe pointer enter / leave separately from the globe’s continuous rotation.'},
 exit:{path:'../evidence/motion/clips/hero-exit.mp4',label:'Hero exit reference clip',caption:'Hero walkthrough · 9.5–14.24 seconds. Later integration: text leaves ahead of the blue-to-porcelain atmospheric wipe; recorded time includes manual scrolling.'}
};
for(const button of document.querySelectorAll('[data-reference]'))button.addEventListener('click',()=>{
 video.pause();const clip=clips[button.dataset.reference];video.src=clip.path;video.setAttribute('aria-label',clip.label);video.load();document.querySelector('#reference-caption').textContent=clip.caption;
 for(const tab of document.querySelectorAll('[data-reference]'))tab.setAttribute('aria-pressed',String(tab===button));
});
document.querySelector('#reference-play').addEventListener('click',()=>video.play().catch(()=>{document.querySelector('#reference-caption').textContent='Use the video’s native Play control to inspect this reference.';}));
document.querySelector('#reference-pause').addEventListener('click',()=>video.pause());
document.querySelector('#reference-restart').addEventListener('click',()=>{video.pause();video.currentTime=0;});
