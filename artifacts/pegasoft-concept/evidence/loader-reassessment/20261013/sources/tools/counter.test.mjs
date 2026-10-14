import test from 'node:test';
import assert from 'node:assert/strict';
import {counterPlaces,roundedToPlace,settleWheel} from '../src/hero-odometer.js';
import {metricLayout,createMetricPlayback} from '../src/outcome-metrics.js';
import {introState} from '../src/intro-sequence.js';
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
test('entry begins near 26% and all five rows end within view',()=>{
 assert.equal(introState(.24).outcomeActive,false);assert.equal(introState(.26).outcomeActive,true);assert.ok(introState(.27).titleY<.94);
 for(const width of [1280,390]){const r=metricLayout(1,width,900);assert.equal(r.rowPositions.length,5);const last=r.metricsY+r.padding+4*r.rowGap;assert.ok(last>=.23&&last<=.47);}
});

test('counter targets latch once on entry, independent of reverse scroll or dwell',()=>{
 const playback=createMetricPlayback([{value:98.5}]);assert.deepEqual(playback.update([1.1],1),[0]);
 assert.deepEqual(playback.update([.8],.1),[98.5]);assert.deepEqual(playback.update([1.1],2),[98.5]);assert.deepEqual(playback.update([.8],.5),[98.5]);
 assert.deepEqual(playback.state,[{started:true,elapsed:2.6,plays:1}]);
});
