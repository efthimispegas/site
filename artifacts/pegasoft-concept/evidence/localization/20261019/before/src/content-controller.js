import {createScope} from '../review/runtime-lifecycle.js';
import {createContactForm} from './contact-form.js';
/** Ordinary DOM interactions. No animation clock, network submission or tracker loading. */
export function createContentController({root,journey}){
 const document=root.ownerDocument,window=document.defaultView,scope=createScope(),$=s=>root.querySelector(s);

 let mounted=false,selected='General';const tabs=[...root.querySelectorAll('[data-contact-tab]')].filter(el=>el.getAttribute('role')==='tab'),panel=$('#contact-field-plan'),dialog=$('#cookie-preferences'),menu=document.querySelector('#mobile-navigation'),contactForm=createContactForm({panel,scope});
 function selectTab(value){selected=value;tabs.forEach(tab=>{const active=tab.dataset.contactTab===value;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});contactForm.show(value);panel.setAttribute('aria-labelledby',tabs.find(tab=>tab.dataset.contactTab===value).id);$('#contact').dataset.tab=value;}
 function go(target){if(menu.open)menu.close();const reduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches,behavior=reduced?'instant':'smooth';if(target==='services')journey.navigate('services');else if(target==='about')journey.navigate('about');else{if(target==='#website-footer')$('[data-footer-mode=industries]').click();$(target).scrollIntoView({block:'start',behavior});}}
 function mount(){if(mounted||scope.disposed)return;mounted=true;selectTab(selected);
  document.querySelectorAll('[data-page-target]').forEach(el=>scope.listen(el,'click',event=>{event.preventDefault();go(el.dataset.pageTarget);}));
  tabs.forEach((tab,i)=>{scope.listen(tab,'click',()=>selectTab(tab.dataset.contactTab));scope.listen(tab,'keydown',event=>{let index;if(event.key==='ArrowRight')index=(i+1)%tabs.length;else if(event.key==='ArrowLeft')index=(i-1+tabs.length)%tabs.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=tabs.length-1;else return;event.preventDefault();selectTab(tabs[index].dataset.contactTab);tabs[index].focus();});});
  document.querySelectorAll('[data-careers-action]').forEach(el=>scope.listen(el,'click',()=>{selectTab('Careers');go('#contact');}));
  scope.listen($('#open-mobile-menu'),'click',()=>menu.showModal());scope.listen(document.querySelector('#close-mobile-menu'),'click',()=>menu.close());
  scope.listen($('#open-cookies'),'click',()=>{dialog.showModal();});scope.listen($('[data-close-cookies]'),'click',()=>dialog.close());
  scope.listen($('#save-cookies'),'click',()=>{try{window.localStorage.setItem('pegasoft.cookie-preferences',JSON.stringify({necessary:true,analytics:false,marketing:false}));$('#cookie-status').textContent='Preferences saved. No optional trackers enabled.';dialog.close();}catch{$('#cookie-status').textContent='Preferences could not be stored in this browser. No optional trackers enabled.';}});
  const rail=$('#testimonials-rail');
  function advance(direction){const card=rail.querySelector('article'),step=card.getBoundingClientRect().width+24;rail.scrollBy({left:direction*step,behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}
  root.querySelectorAll('[data-testimonial-step]').forEach(button=>scope.listen(button,'click',()=>advance(Number(button.dataset.testimonialStep))));
  scope.listen(rail,'keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();advance(event.key==='ArrowRight'?1:-1);}else if(event.key==='Home'||event.key==='End'){event.preventDefault();rail.scrollTo({left:event.key==='Home'?0:rail.scrollWidth,behavior:'instant'});}});
  scope.defer(()=>{if(dialog.open)dialog.close();if(menu.open)menu.close();});
 }
 function followInitialHash(){if(scope.disposed)return;const id=window.location.hash.slice(1);if(id==='trust-evidence'&&!document.body.classList.contains('static-journey')){journey.navigate('trust',{behavior:'instant'});return;}if(['trust-evidence','partners','insights','faq','contact'].includes(id))$('#'+id).scrollIntoView({block:'start',behavior:'instant'});}
 return {mount,followInitialHash,dispose(){scope.dispose();mounted=false;},get selected(){return selected;}};
}
