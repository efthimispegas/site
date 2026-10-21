import test from 'node:test';
import {invertedHorizonLayout} from '../src/horizon-transition.js';
import assert from 'node:assert/strict';
import {counterPlaces,roundedToPlace,settleWheel} from '../src/hero-odometer.js';
import {metricLayout,createMetricPlayback} from '../src/outcome-metrics.js';
import {introState,introScrollAtProgress,introProgressAtScroll,outcomeTitlePosition} from '../src/intro-sequence.js';
test('decimal places preserve 98.5 and decimal carry without binary rounding loss',()=>{
 assert.deepEqual(counterPlaces(98.5),[10,1,'.',.1]);assert.equal(roundedToPlace(98.5,.1),985);assert.equal(roundedToPlace(.3,.1),3);
 assert.deepEqual(counterPlaces(50),[10,1]);
});
test('spring overshoots and returns to its appointed digit, in either direction',()=>{
 for(const [start,target]of [[0,2],[2,0]]){let value=start,velocity=0,crossed=false;
  for(let i=0;i<240;i++){({value,velocity}=settleWheel(value,velocity,target,1/60));if(target>start?value>target+.01:value<target-.01)crossed=true;}
  assert.ok(crossed);assert.equal(value,target);assert.equal(velocity,0);
 }
});
test('spring trajectory is stable at different frame rates',()=>{
 const run=dt=>{let state={value:0,velocity:0};for(let t=0;t<.5-1e-8;t+=dt)state=settleWheel(state.value,state.velocity,5,dt);return state;};
 assert.ok(Math.abs(run(1/60).value-run(1/30).value)<1e-10);
});
test('outcome overlaps horizon clearance and all five rows end within view',()=>{
 assert.equal(introState(.17).outcomeActive,false);assert.equal(introState(.19).outcomeActive,true);assert.ok(introState(.24).titleY<.8);
 for(const width of [1280,390]){const r=metricLayout(1,width,900);assert.equal(r.rowPositions.length,5);const last=r.metricsY+r.padding+4*r.rowGap;assert.ok(last>=.23&&last<=.47);}
});
test('horizon uses twice the scroll while other phases retain their response and resize mapping',()=>{
 for(const h of [753,844,900]){
  for(let i=0;i<=1000;i++){const p=i/1000;assert.ok(Math.abs(introProgressAtScroll(introScrollAtProgress(p,h),h)-p)<1e-12);}
  assert.ok(Math.abs((introScrollAtProgress(.27,h)-introScrollAtProgress(.10,h))/(h*4.2)-.34)<1e-12);
  assert.ok(Math.abs((introScrollAtProgress(.9,h)-introScrollAtProgress(.5,h))/(h*4.2)-.4)<1e-12);
 }
});
test('outcome title retains entry speed per scroll pixel through both horizon boundaries until pinned',()=>{
 const height=844,step=8,speed=height*.16/(introScrollAtProgress(.19,height)-introScrollAtProgress(.17,height));
 for(const mobile of [false,true]){
  for(const p of [.175,.185,.195,.25,.269,.273,...(mobile?[.295,.305]:[])]){
   const scroll=introScrollAtProgress(p,height),next=introProgressAtScroll(scroll+step,height);
   const y=outcomeTitlePosition(p,{mobile}),nextY=outcomeTitlePosition(next,{mobile});
   assert.ok(Math.abs((y-nextY)*height/step-speed)<1e-10,`speed changed at ${p},mobile=${mobile}`);
   assert.ok(Math.abs(outcomeTitlePosition(introProgressAtScroll(scroll,height),{mobile})-y)<1e-12);
  }
  assert.equal(outcomeTitlePosition(.5,{mobile}),mobile?.08:.20);
  assert.equal(outcomeTitlePosition(1,{mobile}),mobile?.08:.20);
 }
});

test('counter targets latch once on entry, independent of reverse scroll or dwell',()=>{
 const playback=createMetricPlayback([{value:98.5}]);assert.deepEqual(playback.update([1.1],1),[0]);
 assert.deepEqual(playback.update([.8],.1),[98.5]);assert.deepEqual(playback.update([1.1],2),[98.5]);assert.deepEqual(playback.update([.8],.5),[98.5]);
 assert.deepEqual(playback.state,[{started:true,elapsed:2.6,plays:1}]);
});

test('inverted editorial horizon preserves opening travel, resize and reverse without a second clock',()=>{
 for(const h of [788,844]){
  const runway=h*4.2*2*.17;
  for(const progress of [0,.1,.25,.5,.75,.9,1]){
   const top=runway*(1-progress),pose=invertedHorizonLayout(top,h);
   assert.ok(Math.abs(pose.progress-progress)<1e-12);
   assert.ok(Math.abs(pose.originY/h-(introState(.10+.17*progress).horizonY+1.2))<1e-12);
   assert.equal(pose.translateY+top,pose.originY);
   assert.deepEqual(invertedHorizonLayout(top,h),pose);
   assert.equal(invertedHorizonLayout(top,h,{reduced:true}).active,false);
  }
  assert.ok(Math.abs(invertedHorizonLayout(runway,h).originY-2.3*h)<1e-9);
  assert.ok(Math.abs(invertedHorizonLayout(0,h).originY)<1e-9);
 }
});
