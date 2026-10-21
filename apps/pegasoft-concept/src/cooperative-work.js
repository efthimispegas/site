/** Yield CPU setup work to input/painting without adding another animation loop. */
export function yieldToBrowser(){
 return globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise(resolve=>setTimeout(resolve,0));
}
export async function runInSlices(iterator,{signal,budgetMs=4,now=()=>globalThis.performance.now(),yieldTask=yieldToBrowser}={}){
 let start=now();
 try{
  for(;;){signal?.throwIfAborted();const step=iterator.next();if(step.done)return step.value;
   if(now()-start>=budgetMs){await yieldTask();start=now();}
  }
 }finally{iterator.return?.();}
}
/** Timeout is owned by the scene scope and clears when initialization settles. */
export async function withDeadline(task,{milliseconds,signal}={}){
 let timer,onAbort;
 const limit=new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(new Error('Graphics initialization timed out')),milliseconds);
  onAbort=()=>reject(signal.reason||new DOMException('Scene disposed','AbortError'));
  if(signal?.aborted)onAbort();else signal?.addEventListener('abort',onAbort,{once:true});
 });
 try{return await Promise.race([task,limit]);}finally{globalThis.clearTimeout(timer);signal?.removeEventListener('abort',onAbort);}
}
