import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  duration,
  chapterAt,
  chapters,
  scrollDistance,
  progressAtScroll,
  scrollAtProgress,
} from '../src/transport-timeline.js';
import {
  mobileJetPose,
  mobileContentOffset,
  mobileServicesTitlePose,
  mobileShipBlockEntry,
} from '../src/mobile-reference-motion.js';

test('portrait jet reveals only behind its wings, moves upward and reverses exactly', () => {
  const profile = [
    [-0.5, 0.347],
    [0.42, 0.442],
    [0.58, 0.442],
    [1.5, 0.347],
  ];
  for (const [w, h] of [
    [320, 568],
    [393, 852],
    [430, 932],
  ]) {
    let last = Infinity;
    const samples = [];
    for (let i = 0; i <= 100; i++) {
      const pose = mobileJetPose(i / 100, w, h, profile);
      assert.ok(pose.noseY < last);
      last = pose.noseY;
      samples.push(pose);
      assert.ok(
        pose.reveal.boundary.every(
          ([x, y]) => x >= 0 && x <= w && Number.isFinite(y),
        ),
      );
    }
    assert.equal(samples[0].reveal.visible, false);
    assert.equal(samples[100].reveal.complete, true);
    assert.deepEqual(
      Array.from({ length: 101 }, (_, i) =>
        mobileJetPose(1 - i / 100, w, h, profile),
      )
        .reverse()
        .map((p) => Math.round(p.noseY * 1e8)),
      samples.map((p) => Math.round(p.noseY * 1e8)),
    );
  }
});

test('portrait content enters below and clears above at a constant rate per scene', () => {
  for (const content of [200, 900, 1800]) {
    const h = 705,
      positions = Array.from({ length: 11 }, (_, i) =>
        mobileContentOffset(i / 10, content, h),
      );
    assert.equal(positions[0], h);
    assert.equal(positions[10], -content);
    for (let i = 1; i < 10; i++)
      assert.ok(
        Math.abs(
          positions[i] - positions[i - 1] - (positions[i + 1] - positions[i]),
        ) < 1e-9,
      );
  }
});

test('transport removes only approved duplicated overlap and retains chapter clocks', () => {
  assert.equal(chapters[0].duration, 18.75 * 0.97);
  assert.equal(chapters[1].duration, 22 * 0.84);
  assert.equal(chapters[2].duration, 26);
  const boundary = chapters[0].duration / duration;
  assert.equal(chapterAt(boundary).id, 'ship');
  assert.ok(Math.abs(chapterAt(boundary).localProgress) < 1e-12);
  assert.equal(
    chapterAt((chapters[0].duration + chapters[1].duration) / duration).id,
    'crossing',
  );
});
test('scroll coordinator preserves reversible local timing at desktop and small viewports', () => {
  for (const height of [400, 540, 800, 900]) {
    let previous = -1;
    for (let i = 0; i <= 1000; i++) {
      const p = i / 1000,
        offset = scrollAtProgress(p, height);
      assert.ok(offset > previous);
      previous = offset;
      assert.ok(Math.abs(progressAtScroll(offset, height) - p) < 1e-12);
    }
    assert.equal(scrollAtProgress(1, height), scrollDistance(height));
    assert.equal(progressAtScroll(-100, height), 0);
  }
});

test('mobile toolbar changes never alter CSS-stage scroll calibration', async () => {
  const { storyViewport, sameStoryViewport } =
    await import('../src/story-viewport.js');
  const stage = { clientWidth: 393, clientHeight: 705 },
    opening = { clientHeight: 705 };
  const initial = storyViewport(stage, opening, { innerHeight: 705 });
  for (const browserHeight of [705, 740, 799, 740, 705]) {
    const next = storyViewport(stage, opening, { innerHeight: browserHeight });
    assert.ok(sameStoryViewport(initial, next));
    for (const progress of [0.05, 0.3, 0.55, 0.8, 0.96]) {
      const offset = scrollAtProgress(progress, initial.height);
      assert.ok(
        Math.abs(progressAtScroll(offset, next.height) - progress) < 1e-12,
      );
    }
  }
  assert.equal(
    sameStoryViewport(
      initial,
      storyViewport(
        { clientWidth: 852, clientHeight: 330 },
        { clientHeight: 330 },
        { innerHeight: 393 },
      ),
    ),
    false,
  );
});

test('visible mobile ship cards retain the page gutter and hull clearance', async () => {
  const { shipContentCardBudget, shipContentLayout } =
    await import('../runtime/ship-content.js');
  for (const width of [320, 393, 540, 760]) {
    const hull = { left: width * 0.41, right: width * 0.59 },
      budget = shipContentCardBudget(width, hull),
      gutter = width * 0.06;
    for (const progress of [0.72, 0.8, 0.9, 1]) {
      const layout = shipContentLayout(progress, width, 852, hull, budget, 100);
      for (const box of layout.items.filter((item) => item.side !== 'centre')) {
        assert.ok(box.x >= gutter - 1e-9);
        assert.ok(box.x + box.width <= width - gutter + 1e-9);
        if (box.side === 'left')
          assert.ok(box.x + box.width <= hull.left - box.hullGap + 1e-9);
        else assert.ok(box.x >= hull.right + box.hullGap - 1e-9);
      }
    }
  }
  assert.equal(shipContentCardBudget(1280, { left: 600, right: 680 }), 360);
});

test('dynamic scene height fills browser chrome changes without changing the runway', async () => {
  const { storyViewport, sameStoryViewport } =
    await import('../src/story-viewport.js');
  const document = {
    querySelector: (s) => ({
      clientHeight: s === '#story-scroll-viewport' ? 705 : 799,
    }),
  };
  const stage = {
      clientWidth: 393,
      clientHeight: 705,
      ownerDocument: document,
    },
    opening = { clientHeight: 705 };
  const before = storyViewport(stage, opening, { innerHeight: 705 });
  for (const height of [740, 799, 740, 705]) {
    stage.clientHeight = height;
    opening.clientHeight = height;
    const after = storyViewport(stage, opening, { innerHeight: height });
    assert.ok(sameStoryViewport(before, after));
    assert.equal(after.height, 705);
    assert.equal(after.tailHeight, 799);
    assert.equal(
      scrollDistance(before.height) + before.tailHeight,
      scrollDistance(after.height) + after.tailHeight,
    );
  }
});

test('mobile reading presentation is reversible without changing scene clocks', async () => {
  const { mobileReadingState, mobileReadingOffset } =
    await import('../src/mobile-reading-sequence.js');
  const { chapters, duration, handoffEnd, scrollAtProgress, progressAtScroll } =
    await import('../src/transport-timeline.js');
  const { storyTime: shipTime } =
    await import('../runtime/ship-integration-sequence.js');
  const handoff = (p) => (chapters[0].duration * p) / handoffEnd / duration;
  const ship = (p) => (chapters[0].duration + shipTime(p)) / duration;
  const crossing = (p) =>
    (chapters[0].duration + chapters[1].duration + 26 * p) / duration;
  const states = [
    handoff(0),
    handoff(0.2),
    handoff(0.7),
    handoff(0.91),
    handoff(0.95),
    ship(0),
    ship(0.2),
    ship(0.44),
    ship(0.7),
    ship(0.84),
    crossing(0.2),
    crossing(0.8),
  ].map((journeyProgress) => ({ journeyProgress }));
  const forward = states.map((state) => mobileReadingState(state, 705));
  assert.deepEqual(
    [...states]
      .reverse()
      .map((state) => mobileReadingState(state, 705))
      .reverse(),
    forward,
  );
  assert.deepEqual(
    forward.map((state) => state.section),
    [
      'services',
      'services',
      'services',
      'road',
      'road',
      'road',
      'road',
      'ship',
      'ship',
      'ship',
      'ship',
      'trust',
    ],
  );
  assert.equal(forward[0].progress, 0);
  assert.ok(
    forward[1].progress > 0 && forward[2].progress > forward[1].progress,
  );
  assert.ok(forward[5].progress > forward[4].progress);
  assert.ok(
    Math.abs(
      mobileReadingState({ journeyProgress: handoff(0.97) }, 705).progress -
        forward[5].progress,
    ) < 1e-9,
  );
  assert.ok(
    forward[8].progress > 0 && forward[10].progress > forward[9].progress,
  );
  const midpoint =
    (scrollAtProgress(handoff(0.91), 705) + scrollAtProgress(ship(0.44), 705)) /
    2;
  assert.ok(
    Math.abs(
      mobileReadingState(
        { journeyProgress: progressAtScroll(midpoint, 705) },
        705,
      ).progress - 0.5,
    ) < 1e-9,
  );
  assert.equal(mobileReadingOffset(1, 1200, 300), -900);
  assert.equal(mobileReadingOffset(0.5, 1200, 300), -450);
  assert.equal(mobileReadingOffset(1, 100, 300), 0);
  assert.equal(mobileReadingOffset(0, 100, 300), 200);
  assert.equal(mobileReadingOffset(0.5, 100, 300), 100);
  assert.equal(mobileReadingOffset(-1, 1200, 300), 0);
  assert.equal(mobileReadingOffset(2, 1200, 300), -900);
});

test('mobile scene initializes with its renderer document, preserves loads and keeps road travel alive', async () => {
  const T = await import('../runtime/vendor/three/build/three.module.js');
  const { createMobileReferenceSequence } =
    await import('../src/mobile-reference-sequence.js');
  const { gates } = await import('../runtime/handoff-sequence.js');
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(12, 393 / 705, 0.1, 10000),
    viewport = { width: 393, height: 705 };
  const material = new T.MeshStandardMaterial({ color: '#c5cdd6' }),
    geometry = new T.BoxGeometry(12, 2.896, 2.438);
  const cargo = new T.Group();
  cargo.add(new T.Mesh(geometry, material));
  const root = new T.Group(),
    load = new T.Group(),
    support = new T.Group(),
    lower = new T.Group(),
    rear = new T.Group(),
    truck = new T.Group(),
    trailer = new T.Group(),
    ship = new T.Group();
  root.add(new T.Mesh(new T.BoxGeometry(8, 3, 3), material.clone()), load);
  support.add(lower, rear);
  for (const group of [lower, rear])
    group.add(new T.Mesh(geometry, material.clone()));
  truck.add(trailer, new T.Mesh(new T.BoxGeometry(15, 2, 3), material.clone()));
  ship.add(new T.Mesh(new T.BoxGeometry(110, 8, 13), material.clone()));
  scene.add(root, support, truck, ship);
  const water = new T.Mesh(
    new T.PlaneGeometry(1000, 1000),
    new T.MeshBasicMaterial(),
  );
  water.material.uniforms = {
    scale: { value: 1 },
    shipInverse: { value: new T.Matrix4() },
  };
  scene.add(water);
  const rig = {
    root,
    load,
    attachment: { support, lowerScene: lower, rearScene: rear },
    stage: { dataset: {} },
  };
  const legacy = {
    truck,
    trailer,
    scale: 1,
    startYaw: Math.PI / 2,
    apply(p) {
      truck.position.set(3, 0, -5 + Math.max(0, p - 0.6) * 100);
      truck.rotation.set(0, Math.PI / 2, 0);
      load.rotation.y = Math.PI / 2;
      load.add(cargo);
      cargo.position.set(3, 3, 0);
      cargo.quaternion.identity();
      cargo.scale.setScalar(1);
      if (p >= gates.lower) {
        trailer.add(cargo);
        cargo.position.set(-5.0575, 0.2, 0);
      }
      scene.updateMatrixWorld(true);
      return { progress: p, travel: Math.max(0, p - 0.6) * 100 };
    },
  };
  const positions = Array.from(geometry.attributes.position.array),
    renderer = {
      domElement: {
        ownerDocument: { querySelector: () => ({ clientHeight: 705 }) },
      },
    };
  const sequence = createMobileReferenceSequence({
    legacy,
    rig,
    cargo,
    ship,
    water,
    road: new T.Group(),
    floor: new T.Group(),
    scene,
    camera,
    viewport,
    renderer,
  });
  const handoff = (p) => (p * 18.75) / duration,
    shipAt = (p) => (chapters[0].duration + p * 22) / duration;
  const initial = sequence.apply(handoff(0.1)),
    matrix = initial.cargoMatrix.slice();
  for (const p of [0.3, 0.55, 0.75, 0.91, 0.95, 0.969]) {
    const frame = sequence.apply(handoff(p));
    assert.ok(frame.camera.every(Number.isFinite));
    assert.ok(Math.abs(frame.quaternion[1]) < 1e-12);
    assert.ok(Math.abs(frame.quaternion[2]) < 1e-12);
  }
  assert.equal(sequence.apply(handoff(0.68)).mobileReading.section, null);
  assert.equal(sequence.apply(handoff(0.7)).mobileReading.section, 'road');
  const tail = sequence.apply(handoff(0.94)),
    later = sequence.apply(handoff(0.96));
  assert.equal(tail.mobileReading.section, null);
  assert.ok(later.mobileRoad.travel > tail.mobileRoad.travel);
  assert.ok(later.mobileRoad.truckBounds);
  const before = sequence.apply(shipAt(0.21999)),
    after = sequence.apply(shipAt(0.22001));
  assert.ok(
    Math.max(
      ...before.mobileCargoVisualMatrix.map((v, i) =>
        Math.abs(v - after.mobileCargoVisualMatrix[i]),
      ),
    ) < 1e-10,
  );
  assert.ok(after.supportGap < 1e-10);
  assert.equal(material.color.getHexString(), 'c5cdd6');
  assert.deepEqual(material.clippingPlanes, []);
  assert.deepEqual(sequence.apply(handoff(0.1)).cargoMatrix, matrix);
  sequence.setVisible(false);
  assert.deepEqual(Array.from(geometry.attributes.position.array), positions);
  assert.equal(cargo.children[0].scale.z, 1);
});

test('mobile services marquee finishes each localized label before departure', () => {
  for (const width of [320, 393, 430])
    for (const titleWidth of [550, 718, 1120]) {
      const gutter = 16,
        entry = mobileServicesTitlePose(0.02, width, titleWidth, gutter),
        read = mobileServicesTitlePose(0.48, width, titleWidth, gutter),
        exit = mobileServicesTitlePose(0.599, width, titleWidth, gutter);
      assert.equal(Math.abs(entry.x), 0);
      assert.ok(
        Math.abs(gutter + read.x + titleWidth - (width - gutter)) < 1e-9,
      );
      assert.ok(gutter + exit.x + titleWidth <= 0);
      assert.equal(
        mobileServicesTitlePose(0.6, width, titleWidth, gutter).visible,
        false,
      );
      let previous = Infinity;
      for (let i = 0; i <= 60; i++) {
        const value = mobileServicesTitlePose(
          i / 100,
          width,
          titleWidth,
          gutter,
        );
        assert.ok(value.x <= previous);
        previous = value.x;
      }
    }
});

test('mobile native-scroll map is invertible with continuous one-to-one content travel', async () => {
  const { createMobileScrollTimeline, mobileJourneyProgress } =
    await import('../src/mobile-scroll-timeline.js');
  const height = 705,
    road = 1800,
    ship = 1600,
    timeline = createMobileScrollTimeline(height, { road, ship });
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000;
    assert.ok(Math.abs(timeline.progressAt(timeline.offsetAt(p)) - p) < 1e-12);
  }
  const offset = (chapter, p) =>
    timeline.offsetAt(mobileJourneyProgress(chapter, p));
  assert.ok(
    Math.abs(
      offset('handoff', 0.93) - offset('handoff', 0.69) - (height + road),
    ) < 1e-9,
  );
  assert.ok(offset('handoff', 0.97) - offset('handoff', 0.93) < height * 0.25);
  const before = (offset('ship', 0.84) - offset('ship', 0.83)) / 0.01;
  const after = (offset('crossing', 0.54) - offset('ship', 0.84)) / 0.16;
  assert.ok(Math.abs(before - after) < 1e-8);
});

test('mobile batching preserves geometry and attachment motion with overlapping roots', async () => {
  const T = await import('../runtime/vendor/three/build/three.module.js');
  const { createMobileMeshBatches } =
    await import('../src/mobile-mesh-batches.js');
  const root = new T.Group(),
    attachment = new T.Group(),
    material = new T.MeshStandardMaterial(),
    geometry = new T.BoxGeometry(2, 3, 4);
  root.add(attachment);
  const meshes = [0, 1, 2].map((i) => {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(i * 3, 1, 2);
    attachment.add(mesh);
    return mesh;
  });
  const expected = meshes.flatMap((mesh) => {
    mesh.updateMatrix();
    const attribute = geometry.attributes.position;
    return Array.from({ length: attribute.count }, (_, i) =>
      new T.Vector3()
        .fromBufferAttribute(attribute, i)
        .applyMatrix4(mesh.matrix)
        .toArray(),
    ).flat();
  });
  const batches = createMobileMeshBatches([root, attachment]);
  assert.equal(batches.count, 1);
  batches.setActive(true);
  const merged = attachment.children.find(
    (mesh) => mesh.name === 'mobile_static_siblings',
  );
  assert.ok(merged.visible);
  assert.equal(merged.material, material);
  assert.deepEqual(
    Array.from(merged.geometry.attributes.position.array),
    expected,
  );
  assert.ok(meshes.every((mesh) => !mesh.visible));
  attachment.position.set(6, 7, 8);
  root.updateMatrixWorld(true);
  assert.deepEqual(
    merged.matrixWorld.toArray(),
    attachment.matrixWorld.toArray(),
  );
  batches.setActive(false);
  assert.ok(meshes.every((mesh) => mesh.visible));
  assert.equal(merged.visible, false);
  batches.dispose();
  assert.equal(attachment.children.length, 3);
});

// Blocks alternate their entry side without a fade and settle on the same reading axis.
test('mobile ship blocks alternate sides and settle before passing the reader', () => {
  for (const w of [320, 393, 760]) {
    const h = 705;
    for (let index = 0; index < 5; index++) {
      const start = mobileShipBlockEntry(h, w, h, index);
      assert.equal(Math.sign(start), index % 2 ? 1 : -1);
      assert.ok(
        Math.abs(
          Math.abs(mobileShipBlockEntry(h * 0.88, w, h, index)) - w * 0.15,
        ) < 1e-10,
      );
      assert.equal(Math.abs(mobileShipBlockEntry(h * 0.7, w, h, index)), 0);
    }
  }
});

test('mobile ship descriptions trail headings by 10 percent and all text settles at its original position', async () => {
  const { mobileShipTextEntry } =
    await import('../src/mobile-reference-motion.js');
  for (const width of [320, 393, 760])
    for (let index = 0; index < 5; index++) {
      const height = 705,
        span = height * 0.24 * 1.05;
      const halfway = mobileShipTextEntry(
        height - span * 0.5,
        width,
        height,
        index,
      );
      assert.ok(Math.abs(halfway.descriptionX) > Math.abs(halfway.headingX));
      assert.ok(halfway.descriptionY > 0);
      const heading = mobileShipTextEntry(height - span, width, height, index);
      assert.equal(Math.abs(heading.headingX), 0);
      assert.ok(Math.abs(heading.descriptionX) > 0);
      const rest = mobileShipTextEntry(
        height - span / 0.9,
        width,
        height,
        index,
      );
      assert.ok(Math.abs(rest.descriptionX) < 1e-9);
      assert.ok(Math.abs(rest.descriptionY) < 1e-9);
      assert.deepEqual(
        mobileShipTextEntry(height - span * 0.5, width, height, index),
        halfway,
      );
    }
});

test('mobile partner drift moves left at a constant rate and wraps without a visible seam', async () => {
  const { mobilePartnerOffset } = await import('../src/partner-wall.js');
  assert.ok(Math.abs(mobilePartnerOffset(1600, 1600, 0.5) - 1614) < 1e-9);
  assert.ok(Math.abs(mobilePartnerOffset(3190, 1600, 0.5) - 1604) < 1e-9);
  assert.equal(mobilePartnerOffset(1600, 0, 0.5), 1600);
});
