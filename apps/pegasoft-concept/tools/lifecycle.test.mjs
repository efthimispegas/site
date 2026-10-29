import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createScope,
  createFrameLoop,
  disposeSceneResources,
} from '../runtime/runtime-lifecycle.js';

test('scope removes listeners and restores property handlers exactly once', () => {
  const scope = createScope(),
    target = new EventTarget();
  let calls = 0,
    cleanups = 0;
  const previous = () => {},
    replacement = () => {};
  target.onclick = previous;
  scope.listen(target, 'change', () => calls++);
  scope.handler(target, 'onclick', replacement);
  scope.defer(() => cleanups++);
  target.dispatchEvent(new Event('change'));
  scope.dispose();
  scope.dispose();
  target.dispatchEvent(new Event('change'));
  assert.equal(calls, 1);
  assert.equal(cleanups, 1);
  assert.equal(target.onclick, previous);
  assert.equal(scope.signal.aborted, true);
});
test('frame owner never duplicates requests and stop cancels pending work', () => {
  const callbacks = new Map();
  let serial = 0,
    frames = 0;
  const loop = createFrameLoop(() => frames++, {
    request: (fn) => {
      callbacks.set(++serial, fn);
      return serial;
    },
    cancel: (id) => callbacks.delete(id),
  });
  loop.start();
  loop.start();
  assert.equal(callbacks.size, 1);
  const [id, callback] = callbacks.entries().next().value;
  callbacks.delete(id);
  callback(0);
  assert.equal(frames, 1);
  assert.equal(callbacks.size, 1);
  loop.stop();
  assert.equal(callbacks.size, 0);
  assert.equal(loop.active, false);
});
test('stopping during a frame does not schedule a replacement callback', () => {
  let callback,
    pending = 0;
  const loop = createFrameLoop(() => loop.stop(), {
    request: (fn) => {
      callback = fn;
      pending++;
      return 1;
    },
    cancel: () => {
      pending--;
    },
  });
  loop.start();
  pending--;
  callback(0);
  assert.equal(pending, 0);
});
test('resource disposal deduplicates geometry, materials and textures across model roots', () => {
  const disposed = [];
  const resource = (name) => ({ dispose: () => disposed.push(name) });
  const texture = { ...resource('texture'), isTexture: true },
    geometry = resource('geometry');
  const material = {
    ...resource('material'),
    map: texture,
    uniforms: { plate: { value: texture } },
  };
  const root = {
    environment: texture,
    traverse: (fn) => fn({ geometry, material }),
  };
  disposeSceneResources([root, root]);
  assert.deepEqual(disposed.sort(), ['geometry', 'material', 'texture']);
});

test('cooperative setup preserves operation order and yields before finishing a long batch', async () => {
  const { runInSlices } = await import('../src/cooperative-work.js');
  let time = 0;
  const events = [];
  function* setup() {
    for (let i = 0; i < 8; i++) {
      events.push(i);
      time++;
      yield;
    }
    return 'ready';
  }
  const value = await runInSlices(setup(), {
    budgetMs: 2,
    now: () => time,
    yieldTask: async () => events.push('paint'),
  });
  assert.equal(value, 'ready');
  assert.deepEqual(
    events.filter((x) => typeof x === 'number'),
    [0, 1, 2, 3, 4, 5, 6, 7],
  );
  assert.ok(events.indexOf('paint') < events.indexOf(7));
});
test('cooperative setup aborts between chunks without finishing cancelled work', async () => {
  const { runInSlices } = await import('../src/cooperative-work.js');
  const abort = new AbortController();
  let steps = 0,
    closed = false;
  function* setup() {
    try {
      for (;;) {
        steps++;
        yield;
      }
    } finally {
      closed = true;
    }
  }
  await assert.rejects(
    runInSlices(setup(), {
      signal: abort.signal,
      budgetMs: 0,
      yieldTask: async () => abort.abort(),
    }),
    { name: 'AbortError' },
  );
  assert.equal(steps, 1);
  assert.equal(closed, true);
});
test('initialization deadline rejects hung resources and lets settled tasks finish', async () => {
  const { withDeadline } = await import('../src/cooperative-work.js');
  assert.equal(
    await withDeadline(Promise.resolve('ready'), { milliseconds: 100 }),
    'ready',
  );
  await assert.rejects(
    withDeadline(new Promise(() => {}), { milliseconds: 5 }),
    /initialization timed out/,
  );
});

test('truck service lines retain geometry for rigid travel and rebuild for articulation', async () => {
  const T = await import('../runtime/vendor/three/build/three.module.js');
  const { applyRig } = await import('../src/truck-motion-rig.js');
  const root = new T.Group(),
    trailer = new T.Group();
  trailer.name = 'trailer_fifth_wheel_pivot';
  trailer.position.set(0, 1.2, 0);
  root.add(trailer);
  for (const side of [-1, 1]) {
    const steering = new T.Group();
    steering.name = 'tractor_front_' + side + '_steering';
    root.add(steering);
  }
  const line = new T.Mesh(new T.BoxGeometry(), new T.MeshBasicMaterial());
  line.userData = {
    role: 'flexible service line',
    tractorAnchor: [1.435, 1.73, 0],
    trailerAnchor: [1.163, 0.205, 0],
  };
  root.add(line);
  applyRig(root, 0, 0);
  const straight = line.geometry;
  root.position.set(40, 0, 17);
  root.rotation.y = 0.8;
  applyRig(root, 0, 0);
  assert.equal(
    line.geometry,
    straight,
    'world translation/rotation preserves the relative hose shape',
  );
  applyRig(root, 12, 10);
  assert.notEqual(line.geometry, straight);
  const end = new T.Vector3(...line.userData.trailerAnchor).applyMatrix4(
    trailer.matrix,
  );
  assert.ok(
    end.distanceTo(new T.Vector3(...line.userData.currentEnd)) < 1e-12,
    'service line stays connected to articulated trailer',
  );
  const turning = line.geometry;
  applyRig(root, 12, 10);
  assert.equal(line.geometry, turning);
  line.geometry.dispose();
  line.material.dispose();
});

test('startup input lock releases on readiness or disposal and removes its listeners', async () => {
  const { lockStartupScroll } = await import('../src/startup-scroll.js');
  const document = new EventTarget(),
    classes = new Set(),
    scrolls = [];
  document.documentElement = {
    classList: { add: (v) => classes.add(v), remove: (v) => classes.delete(v) },
  };
  document.defaultView = { scrollTo: (value) => scrolls.push(value) };
  const scope = createScope(),
    lock = lockStartupScroll(document, scope);
  const swipe = () => {
    const e = new Event('touchmove', { cancelable: true });
    document.dispatchEvent(e);
    return e.defaultPrevented;
  };
  assert.equal(swipe(), true);
  assert.equal(lock.locked, true);
  assert.ok(classes.has('journey-booting'));
  lock.release();
  lock.release();
  assert.equal(swipe(), false);
  assert.equal(classes.size, 0);
  assert.equal(scrolls.length, 1);
  const nextScope = createScope(),
    next = lockStartupScroll(document, nextScope);
  assert.equal(swipe(), true);
  nextScope.dispose();
  assert.equal(next.locked, false);
  assert.equal(swipe(), false);
  scope.dispose();
});

test('native model downloads decode exact bytes and support raw fallback and cancellation', async () => {
  const { fetchModelBytes } = await import('../src/model-download.js'),
    { gzipSync } = await import('node:zlib');
  const bytes = Buffer.from('approved model bytes ' + 'abc123'.repeat(200)),
    calls = [];
  const compressed = await fetchModelBytes('/model.glb', {
    fetcher: async (url) => {
      calls.push(url);
      return new globalThis.Response(gzipSync(bytes));
    },
  });
  assert.deepEqual(Buffer.from(compressed), bytes);
  assert.deepEqual(calls, ['/model.glb.gz.bin']);
  const fallback = [];
  assert.deepEqual(
    Buffer.from(
      await fetchModelBytes('/model.glb', {
        fetcher: async (url) => {
          fallback.push(url);
          return url.endsWith('.gz.bin')
            ? new globalThis.Response('', { status: 404 })
            : new globalThis.Response(bytes);
        },
      }),
    ),
    bytes,
  );
  assert.deepEqual(fallback, ['/model.glb.gz.bin', '/model.glb']);
  const original = [];
  await fetchModelBytes('/model.glb', {
    decompress: null,
    fetcher: async (url) => {
      original.push(url);
      return new globalThis.Response(bytes);
    },
  });
  assert.deepEqual(original, ['/model.glb']);
  const abort = new AbortController();
  let attempts = 0;
  await assert.rejects(
    fetchModelBytes('/model.glb', {
      signal: abort.signal,
      fetcher: async () => {
        attempts++;
        abort.abort();
        throw new DOMException('Cancelled', 'AbortError');
      },
    }),
    { name: 'AbortError' },
  );
  assert.equal(attempts, 1);
});
