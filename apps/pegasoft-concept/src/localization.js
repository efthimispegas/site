import {pageScroll} from './page-scroll.js';
import {resolveLocale,setLocale,locale,translate,messageSource,localeUrl} from './locale-messages.js';
export {translate,locale} from './locale-messages.js';
const attributes=['aria-label','alt','title','placeholder'];
/** Existing DOM nodes keep ownership; language changes never remount scenes or restart clocks. */
export function translateTree(root,language=locale()){
 const document=root.ownerDocument??root,walker=document.createTreeWalker(root,4);let node;
 while((node=walker.nextNode())){
  const parent=node.parentElement;if(!parent||parent.closest('script,style,[data-user-content]'))continue;
  const raw=node.nodeValue.trim();if(!raw)continue;
  const message=parent.dataset.msg??messageSource(raw),next=translate(message,language);
  if(next!==raw)node.nodeValue=node.nodeValue.replace(raw,next);
 }
 for(const element of [root,...root.querySelectorAll('*')]){
  if(!element.getAttribute)continue;
  for(const attr of attributes){const raw=element.getAttribute(attr);if(raw)element.setAttribute(attr,translate(messageSource(raw),language));}
 }
}
export function createLocalization({document,onChange=()=>{}}){
 const window=document.defaultView,scrolling=pageScroll(document);let stored;try{stored=window.localStorage.getItem('pegasoft.locale');}catch{}
 setLocale(resolveLocale({pathname:window.location.pathname,search:window.location.search,stored}));
 function apply({persist=false,notify=true}={}){
  document.documentElement.lang=locale();document.documentElement.dataset.locale=locale();translateTree(document.body);
  document.querySelectorAll('[data-locale]').forEach(button=>button.setAttribute('aria-checked',String(button.dataset.locale===locale())));
  document.querySelectorAll('[data-language-trigger]').forEach(button=>{button.setAttribute('aria-label',locale()==='el'?'Γλώσσα: Ελληνικά':'Language: English');button.querySelector('[data-language-flag]').textContent=locale()==='el'?'🇬🇷':'🇬🇧';});
  const url=localeUrl(window.location.href,locale());window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
  const description=translate('Strategy, design and engineering, carried through by one accountable team.');
  const artworkAlt=translate('Pegasoft — Every idea engineered to matter, alongside the blue connected globe.');
  const values={'og:image:alt':artworkAlt,'twitter:image:alt':artworkAlt,'og:title':translate('Pegasoft — Every idea engineered to matter.'),'twitter:title':translate('Pegasoft — Every idea engineered to matter.'),'og:description':description,'twitter:description':description,'description':description,'og:url':url.origin+(locale()==='en'?'/en/':'/el/'),'og:image':url.origin+`/assets/social/hero-card-${locale()==='el'?'el-':''}20261019.jpg`,'twitter:image':url.origin+`/assets/social/hero-card-${locale()==='el'?'el-':''}20261019.jpg`};
  document.querySelectorAll('meta[property],meta[name]').forEach(tag=>{const key=tag.getAttribute('property')??tag.getAttribute('name');if(values[key])tag.content=values[key];});
  if(persist)try{window.localStorage.setItem('pegasoft.locale',locale());}catch{}
  if(notify)onChange(locale());
 }
 apply({notify:false});
 const menus=[...document.querySelectorAll('[data-language-menu]')],cleanups=[];
 function listen(element,type,handler){element.addEventListener(type,handler);cleanups.push(()=>element.removeEventListener(type,handler));}
 function close(menu,{focus=false}={}){const trigger=menu.querySelector('[data-language-trigger]');menu.querySelector('[role=menu]').hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus({preventScroll:true});}
 function closeAll(except){menus.filter(menu=>menu!==except).forEach(menu=>close(menu));}
 for(const menu of menus){
  const trigger=menu.querySelector('[data-language-trigger]'),panel=menu.querySelector('[role=menu]'),options=[...menu.querySelectorAll('[data-locale]')];
  const open=({keyboard=false}={})=>{closeAll(menu);panel.hidden=false;trigger.setAttribute('aria-expanded','true');if(keyboard)options.find(button=>button.dataset.locale===locale()).focus({preventScroll:true});};
  listen(trigger,'click',event=>panel.hidden?open({keyboard:event.detail===0}):close(menu));
  listen(trigger,'keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();event.stopPropagation();open({keyboard:true});if(event.key==='ArrowUp')options.at(-1).focus();}});
  options.forEach(button=>listen(button,'click',()=>{if(button.dataset.locale!==locale()){setLocale(button.dataset.locale);apply({persist:true});}close(menu,{focus:true});}));
  listen(menu,'keydown',event=>{
   if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopPropagation();close(menu,{focus:true});return;}
   if(panel.hidden)return;let index=options.indexOf(document.activeElement);
   if(event.key==='ArrowDown')index=(index+1)%options.length;else if(event.key==='ArrowUp')index=(index-1+options.length)%options.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=options.length-1;else if(event.key==='Tab'){close(menu);return;}else return;
   event.preventDefault();options[index].focus();
  });
  listen(menu,'focusout',event=>{if(event.relatedTarget&&!menu.contains(event.relatedTarget))close(menu);});
 }
 listen(document,'pointerdown',event=>{for(const menu of menus)if(!menu.contains(event.target))close(menu);});
 // Returning focus aids keyboard users; resumed page scrolling ends that menu interaction.
 let menuScrollY=scrolling.y;
 cleanups.push(scrolling.listen(()=>{
  if(Math.abs(scrolling.y-menuScrollY)<4)return;menuScrollY=scrolling.y;
  for(const menu of menus){const focused=menu.contains(document.activeElement)?document.activeElement:null;close(menu);focused?.blur();}
 }));
 const history=()=>{setLocale(resolveLocale({pathname:window.location.pathname,search:window.location.search,stored:locale()}));apply();};window.addEventListener('popstate',history);
 return {apply,dispose(){cleanups.forEach(cleanup=>cleanup());window.removeEventListener('popstate',history);}};
}
