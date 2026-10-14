/** Review examples supplied by the user. Replace only with confirmed company data. */
export const OUTCOME_METRICS=Object.freeze([
 {value:2,suffix:'+',title:'Years of delivery',description:'From discovery through design, engineering and launch.'},
 {value:98.5,suffix:'%',title:'Conversion rate',description:'An illustrative measure for a complete digital journey.'},
 {value:15,suffix:'+',title:'Clients worldwide',description:'Digital products and platforms across complex industries.'},
 {value:5,suffix:'+',title:'Countries',description:'Connected delivery across markets and teams.'},
 {value:50,suffix:'+',title:'Projects completed',description:'Product experiences, systems and integrations.'},
]);
export function metricLayout(progress,width,height,count=OUTCOME_METRICS.length){
 const start=.285,travel=Math.max(0,Math.min(1,(progress-start)/(1-start))),mobile=width<680;
 const rowGap=mobile?.50:.62,padding=mobile?.44:0,endTop=mobile?.46:.24;
 const initialY=progress<start?1.08-.14*Math.max(0,Math.min(1,(progress-.27)/(start-.27))):.94;
 const metricsY=initialY-(.94+(count-1)*rowGap+padding-endTop)*travel;
 return {metricsY,rowGap,padding,counts:OUTCOME_METRICS.slice(0,count).map((metric,i)=>{
  const rowY=metricsY+padding+i*rowGap,t=Math.max(0,Math.min(1,(.94-rowY)/.32));
  return Math.round(metric.value*(t*t*(3-2*t))*10)/10;
 })};
}
