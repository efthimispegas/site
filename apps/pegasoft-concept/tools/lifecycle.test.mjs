import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScope, createFrameLoop, disposeSceneResources } from '../review/runtime-lifecycle.js';

test('scope removes listeners and restores property handlers exactly once',()=>{
 const scope=createScope(),target=new EventTarget();let calls=0,cleanups=0;
 const previous=()=>{},replacement=()=>{};target.onclick=previous;
 scope.listen(target,'change',()=>calls++);scope.handler(target,'onclick',replacement);
 scope.defer(()=>cleanups++);target.dispatchEvent(new Event('change'));
 scope.dispose();scope.dispose();target.dispatchEvent(new Event('change'));
 assert.equal(calls,1);assert.equal(cleanups,1);assert.equal(target.onclick,previous);
 assert.equal(scope.signal.aborted,true);
});
test('frame owner never duplicates requests and stop cancels pending work',()=>{
 const callbacks=new Map();let serial=0,frames=0;
 const loop=createFrameLoop(()=>frames++,{request:fn=>{callbacks.set(++serial,fn);return serial;},cancel:id=>callbacks.delete(id)});
 loop.start();loop.start();assert.equal(callbacks.size,1);
 const [id,callback]=callbacks.entries().next().value;callbacks.delete(id);callback(0);
 assert.equal(frames,1);assert.equal(callbacks.size,1);
 loop.stop();assert.equal(callbacks.size,0);assert.equal(loop.active,false);
});
test('stopping during a frame does not schedule a replacement callback',()=>{
 let callback,pending=0;
 const loop=createFrameLoop(()=>loop.stop(),{request:fn=>{callback=fn;pending++;return 1;},cancel:()=>{pending--;}});
 loop.start();pending--;callback(0);assert.equal(pending,0);
});
test('resource disposal deduplicates geometry, materials and textures across model roots',()=>{
 const disposed=[];const resource=name=>({dispose:()=>disposed.push(name)});
 const texture={...resource('texture'),isTexture:true},geometry=resource('geometry');
 const material={...resource('material'),map:texture,uniforms:{plate:{value:texture}}};
 const root={environment:texture,traverse:fn=>fn({geometry,material})};
 disposeSceneResources([root,root]);assert.deepEqual(disposed.sort(),['geometry','material','texture']);
});
