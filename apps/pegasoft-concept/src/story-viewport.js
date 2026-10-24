/** Stable scroll geometry is independent of retracting mobile browser chrome. */
export function storyViewport(stage,openingStage,window){
 const document=stage.ownerDocument,small=document?.querySelector('#story-scroll-viewport'),large=document?.querySelector('#story-max-viewport');
 const height=Math.max(1,small?.clientHeight||stage.clientHeight||window.innerHeight);
 return {width:stage.clientWidth,height,introHeight:small?.clientHeight||Math.max(1,openingStage?.clientHeight||height),tailHeight:document?.documentElement?.dataset.mobileScroll==='true'?height:Math.max(height,large?.clientHeight||height)};
}
export const sameStoryViewport=(a,b)=>a.width===b.width&&a.height===b.height&&a.introHeight===b.introHeight&&a.tailHeight===b.tailHeight;
