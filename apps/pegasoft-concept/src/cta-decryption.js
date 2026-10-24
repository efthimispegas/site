/** Vanilla adaptation of React Bits DecryptedText; see public/licenses/react-bits.txt.
 * Fixed glyph cells preserve the label's size. The existing intro scheduler owns time.
 */
const characters=Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+');
const graphemes=text=>typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text),part=>part.segment):Array.from(text);
export function decryptedFrame(text,elapsed,{speed=60,reduced=false,random=Math.random}={}){
 const chars=graphemes(text),letters=chars.filter(char=>!/^\s$/.test(char)).length;
 const count=reduced?letters:Math.max(0,Math.floor(elapsed/Math.max(16,speed)));let rank=0;
 return {complete:count>=letters,shown:chars.map(char=>/^\s$/.test(char)||rank++<count?char:characters[Math.min(characters.length-1,Math.floor(random()*characters.length))]).join('')};
}
export function createDecryptedCta(button,{scope}){
 const document=button.ownerDocument,wrapper=button.querySelector('.roll');if(!wrapper)return null;
 const label=wrapper.firstElementChild;label.className='cta-decrypt-label';
 const visual=document.createElement('span');visual.className='cta-decrypt-visual';visual.setAttribute('aria-hidden','true');visual.dataset.userContent='';
 wrapper.replaceChildren(label,visual);wrapper.className='cta-decrypt';
 let text='',glyphs=[],started=null,lastNow=0,lastFrame=-1,seen=false,reduced=false,disposed=false,settled=true,measureContext,font='';const widths=new Map();
 function metrics(){const style=document.defaultView.getComputedStyle(wrapper),next=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;measureContext??=document.createElement('canvas').getContext('2d');if(next!==font){font=next;widths.clear();}if(measureContext)measureContext.font=font;}
 function width(char){if(!widths.has(char))widths.set(char,measureContext?.measureText(char).width||0);return widths.get(char);}
 function build(){text=label.textContent;glyphs=[];visual.replaceChildren();for(const char of graphemes(text)){const cell=document.createElement('span'),ghost=document.createElement('span'),glyph=document.createElement('span');cell.className='cta-decrypt-cell';ghost.className='cta-decrypt-ghost';ghost.textContent=char;glyph.className='cta-decrypt-glyph';glyph.textContent=char;cell.append(ghost,glyph);visual.append(cell);glyphs.push(glyph);}started=null;lastFrame=-1;settled=true;button.dataset.decrypting='false';}
 function finish(){if(settled&&started===null)return;settled=true;started=null;lastFrame=-1;const chars=graphemes(text);glyphs.forEach((glyph,i)=>{glyph.textContent=chars[i];glyph.style.transform='';});button.dataset.decrypting='false';}
 function start(){if(disposed||reduced)return;metrics();settled=false;started=lastNow;lastFrame=-1;button.dataset.decrypting='true';paint(lastNow);}
 function paint(now){if(started===null)return;const elapsed=Math.max(0,now-started),frame=Math.floor(elapsed/60);if(frame===lastFrame)return;lastFrame=frame;const next=decryptedFrame(text,elapsed,{reduced}),chars=graphemes(text);graphemes(next.shown).forEach((char,i)=>{glyphs[i].textContent=char;const scale=width(char)>0?Math.min(1,width(chars[i])/width(char)):1;glyphs[i].style.transform=scale<1?`scaleX(${scale})`:'';});if(next.complete)finish();}
 build();
 scope.listen(button,'pointerenter',event=>{if(event.pointerType==='mouse')start();});
 scope.listen(button,'pointerleave',finish);scope.listen(button,'focus',start);scope.listen(button,'blur',finish);
 scope.defer(()=>{disposed=true;finish();const first=document.createElement('span'),second=document.createElement('span');first.textContent=second.textContent=label.textContent;second.setAttribute('aria-hidden','true');wrapper.className='roll';wrapper.replaceChildren(first,second);delete button.dataset.decrypting;});
 return {update(now,{visible=false,reducedMotion=false}={}){if(disposed)return;lastNow=now;reduced=reducedMotion;if(text!==label.textContent)build();if(reduced||!visible){finish();if(reduced)seen=true;return;}if(!seen){seen=true;start();}paint(now);},get active(){return started!==null;}};
}
