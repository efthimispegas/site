import {greek} from './locales/el.js';
export const SUPPORTED_LOCALES=Object.freeze(['el','en']);
export const DEFAULT_LOCALE='el';
export function resolveLocale({pathname='/',search='',stored}={}){
 const query=new URLSearchParams(search).get('lang'),path=pathname.split('/')[1];
 return [query,path,stored,DEFAULT_LOCALE].find(locale=>SUPPORTED_LOCALES.includes(locale));
}
// Standalone approved inspectors retain English; the homepage explicitly selects its launch locale.
let active='en';
export const locale=()=>active;
export function setLocale(value){active=SUPPORTED_LOCALES.includes(value)?value:DEFAULT_LOCALE;return active;}
export const messageSource=value=>Object.hasOwn(greek,value)?value:Object.keys(greek).find(key=>greek[key]===value)??value;
const englishAliases={'ship.engineered':'Engineered'};
export const translate=(message,language=active)=>language==='el'?greek[message]??message:englishAliases[message]??message;
const numbers=Object.fromEntries(SUPPORTED_LOCALES.map(language=>[language,new Intl.NumberFormat(language,{maximumFractionDigits:1,useGrouping:false})]));
const separators=Object.fromEntries(SUPPORTED_LOCALES.map(language=>[language,numbers[language].formatToParts(1.1).find(part=>part.type==='decimal').value]));
export const decimalSeparator=(language=active)=>separators[language]??separators[DEFAULT_LOCALE];
export const formatNumber=(value,language=active)=>(numbers[language]??numbers[DEFAULT_LOCALE]).format(value);
export function localeUrl(href,language){
 const url=new URL(href),rest=url.pathname.replace(/^\/(el|en)(?=\/|$)/,'');
 url.pathname=`/${SUPPORTED_LOCALES.includes(language)?language:DEFAULT_LOCALE}${rest.startsWith('/')?rest:'/'+rest}`;url.searchParams.delete('lang');return url;
}
const decode=value=>value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#(?:39|x27);/gi,"'").replace(/&nbsp;/g,'\u00a0').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const escape=value=>value.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
/** Static HTML translation shares its message catalog with the runtime. Never evaluate embedded scripts. */
export function localizeHtml(html,language,{origin=''}={}){
 let key=null;
 const parts=html.split(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]*>)/gi);
 let flag=false;
 const output=parts.map(part=>{
  if(part.startsWith('<')){
   if(/^<(script|style)\b|^<!--/i.test(part))return part;
   if(/data-locale=/.test(part))part=part.replace(/aria-checked="[^"]*"/,`aria-checked="${part.includes('data-locale="'+language+'"')}"`);
   if(/data-language-trigger/.test(part))part=part.replace(/aria-label="[^"]*"/,`aria-label="${language==='el'?'Γλώσσα: Ελληνικά':'Language: English'}"`);
   flag=/data-language-flag/.test(part);
   key=part.match(/data-msg="([^"]+)"/)?.[1]??null;
   return part.replace(/\b(aria-label|alt|title|placeholder)="([^"]*)"/g,(_,attr,value)=>`${attr}="${escape(translate(decode(value),language))}"`);
  }
  if(flag){flag=false;return language==='el'?'🇬🇷':'🇬🇧';}
  const raw=decode(part.trim());if(!raw)return part;
  const translated=translate(key??raw,language);key=null;return translated===raw?part:part.replace(part.trim(),escape(translated));
 }).join('');
 const image=`${origin}/assets/social/hero-card-${language==='el'?'el-':''}20261019.jpg`,page=language==='en'?`${origin}/en/`:`${origin}/el/`;
 return output.replace(/<html\b([^>]*)\blang="[^"]*"/,`<html$1lang="${language}"`).replace(/<meta\b([^>]+)>/g,(tag,attributes)=>{
  const name=attributes.match(/(?:property|name)="([^"]+)"/)?.[1];let value;
  if(['og:title','twitter:title','og:description','twitter:description','description','og:image:alt','twitter:image:alt'].includes(name))value=translate(decode(attributes.match(/content="([^"]*)"/)?.[1]??''),language);
  if(name==='og:url')value=page;
  if(['og:image','twitter:image'].includes(name))value=image;
  return value===undefined?tag:tag.replace(/content="[^"]*"/,`content="${escape(value)}"`);
 });
}
