/** Review examples supplied by the user. Replace only with confirmed company data. */
export const OUTCOME_METRICS=Object.freeze([
 {value:2,suffix:'+',title:'Years of delivery',description:'From discovery through design, engineering and launch.'},
 {value:98.5,suffix:'%',title:'Conversion rate',description:'An illustrative measure for a complete digital journey.'},
 {value:15,suffix:'+',title:'Clients worldwide',description:'Digital products and platforms across complex industries.'},
 {value:5,suffix:'+',title:'Countries',description:'Connected delivery across markets and teams.'},
 {value:50,suffix:'+',title:'Projects completed',description:'Product experiences, systems and integrations.'},
]);
export function metricLayout(progress,width,height,count=OUTCOME_METRICS.length){
 const start=.19,travel=Math.max(0,Math.min(1,(progress-start)/(1-start))),mobile=width<680;
 const rowGap=mobile?.50:.62,padding=mobile?.44:0,endTop=mobile?.46:.24;
 const initialY=progress<start?1.02-.14*Math.max(0,Math.min(1,(progress-.17)/(start-.17))):.88;
 const metricsY=initialY-(.88+(count-1)*rowGap+padding-endTop)*travel;
 return {metricsY,rowGap,padding,rowPositions:OUTCOME_METRICS.slice(0,count).map((_,i)=>metricsY+padding+i*rowGap)};
}
/** A visibility latch owns one timed spring run. Scroll cannot retarget or reset it. */
export function createMetricPlayback(metrics=OUTCOME_METRICS){
 const rows=metrics.map(()=>({started:false,elapsed:0,plays:0}));
 return {update(positions,dt=0){return rows.map((row,i)=>{
  if(!row.started&&positions[i]<.90){row.started=true;row.plays=1;}
  if(row.started)row.elapsed+=Math.max(0,dt);
  return row.started?metrics[i].value:0;
 });},get state(){return rows.map(row=>({...row}));}};
}
