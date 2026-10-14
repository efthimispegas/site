import {test} from 'node:test';
import assert from 'node:assert/strict';
import {duration,chapterAt,chapters,scrollDistance,progressAtScroll,scrollAtProgress} from '../src/transport-timeline.js';

test('transport removes only approved duplicated overlap and retains chapter clocks',()=>{
  assert.equal(chapters[0].duration,18.75*.97);
  assert.equal(chapters[1].duration,22*.84);
  assert.equal(chapters[2].duration,26);
  const boundary=chapters[0].duration/duration;
  assert.equal(chapterAt(boundary).id,'ship');
  assert.ok(Math.abs(chapterAt(boundary).localProgress)<1e-12);
  assert.equal(chapterAt((chapters[0].duration+chapters[1].duration)/duration).id,'crossing');
});
test('scroll coordinator preserves reversible local timing at desktop and small viewports',()=>{
  for(const height of [400,540,800,900]){
    let previous=-1;
    for(let i=0;i<=1000;i++){
      const p=i/1000,offset=scrollAtProgress(p,height);
      assert.ok(offset>previous);previous=offset;
      assert.ok(Math.abs(progressAtScroll(offset,height)-p)<1e-12);
    }
    assert.equal(scrollAtProgress(1,height),scrollDistance(height));
    assert.equal(progressAtScroll(-100,height),0);
  }
});
