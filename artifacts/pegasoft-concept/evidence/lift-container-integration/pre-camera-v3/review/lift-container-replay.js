// Record the actual canvas and applied geometric witnesses during ordinary
// playback. Capture does not seek named poses or replace the animation clock.
export function installIntegrationReplay({stage,renderer,start,state,witnesses,pause}){
 const button=document.querySelector('#capture-integration'),panel=document.querySelector('#integration-replay-panel'),video=document.querySelector('#integration-replay'),videoLink=document.querySelector('#save-integration-video'),traceLink=document.querySelector('#save-integration-trace'),readout=document.querySelector('#integration-replay-status');
 let recorder=null,chunks=[],frames=[],first=null,lastProgress=null,loops=0,mode=null,urls=[];
 button.addEventListener('click',()=>{
  if(recorder)return;
  if(!renderer.domElement.captureStream||typeof MediaRecorder==='undefined'){readout.textContent='Replay capture unavailable; use the live playback controls.';return;}
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));if(!mime){readout.textContent='WebM capture unavailable.';return;}
  chunks=[];frames=[];first=null;lastProgress=null;loops=0;mode=start();const stream=renderer.domElement.captureStream(30);
  recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3500000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onstop=async()=>{
   stream.getTracks().forEach(t=>t.stop());urls.forEach(url=>URL.revokeObjectURL(url));urls=[];
   const webm=new Blob(chunks,{type:mime}),trace={status:'actual_canvas_playback_capture',mode,canvas:{width:renderer.domElement.width,height:renderer.domElement.height},durationMs:frames.at(-1)?.elapsedMs||0,renderedFrameObservations:frames.length,witnessType:'Projected actual casting-rim geometry after rendering; not independent raster-edge measurement.',frames};
   const v=URL.createObjectURL(webm),j=URL.createObjectURL(new Blob([JSON.stringify(trace,null,2)],{type:'application/json'}));urls.push(v,j);video.src=v;videoLink.href=v;traceLink.href=j;
   videoLink.download=`C01-camera-v2-${mode.scope}-${mode.reverse?'reverse':'forward'}-${mode.speed===.25?'quarter':'normal'}.webm`;traceLink.download=videoLink.download.replace('.webm','.json');panel.hidden=false;
   readout.textContent=`Replay ready · ${frames.length} rendered observations`;stage.dataset.replay=JSON.stringify({ready:true,mode,frames:frames.length,durationMs:trace.durationMs,bytes:webm.size});
   if(location.port==='8767'){
    try{
     for(const [name,body] of [[videoLink.download,webm],[traceLink.download,new Blob([JSON.stringify(trace,null,2)],{type:'application/json'})]]){
      const response=await fetch(`/capture/${name}`,{method:'POST',body});if(!response.ok)throw Error(`Replay save ${response.status}`);
     }
     video.src=`../evidence/lift-container-integration/playback/${videoLink.download}`;videoLink.href=video.src;traceLink.href=`../evidence/lift-container-integration/playback/${traceLink.download}`;readout.textContent=`Replay saved · ${frames.length} rendered observations`;stage.dataset.replay=JSON.stringify({ready:true,saved:true,mode,frames:frames.length,durationMs:trace.durationMs,bytes:webm.size});
    }catch(error){readout.textContent=`Replay ready; local save unavailable (${error.message}). Use Save replay.`;}
   }
   button.disabled=false;recorder=null;
  };
  recorder.start(200);button.disabled=true;readout.textContent='Recording live playback…';
 });
 return {frame(time){if(!recorder||recorder.state!=='recording')return;if(first===null)first=time;const s=state();frames.push({elapsedMs:time-first,...s,projectedCastingWitnesses:witnesses()});if(lastProgress!==null&&((!mode.reverse&&s.progress<lastProgress-.05)||(mode.reverse&&s.progress>lastProgress+.05)))loops++;lastProgress=s.progress;if((mode.scope==='settling'&&loops>=2)||(mode.scope==='full'&&!s.playing)||time-first>60000){pause();recorder.stop();}}};
}
