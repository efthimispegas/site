// Focused wheel-volume amendment. Original wheel meshes stay in their axle
// groups as hidden comparison inputs; no chassis, fender or cab is altered.
export function amendWheels(THREE, wheels, carbon) {
  const rubber = new THREE.MeshStandardMaterial({
    name: 'Wheel rubber · untextured physical volume',
    color: '#11151B',
    roughness: 0.88,
    metalness: 0,
  });
  const steel = new THREE.MeshStandardMaterial({
    name: 'Wheel rim · dark steel',
    color: '#363F49',
    roughness: 0.34,
    metalness: 0.8,
  });
  const bolts = new THREE.MeshStandardMaterial({
    name: 'Wheel fasteners · existing steel role',
    color: '#9DA9B5',
    roughness: 0.3,
    metalness: 0.85,
  });
  const hub = carbon.clone();
  hub.name = 'Wheel hub · approved shared satin carbon';
  hub.side = THREE.FrontSide;
  // A welded surface of revolution around local Z. Axis endpoints are single
  // vertices, not degenerate stacks of triangles; profiles have no open seams.
  function revolution(profile, N = 256, tread = false) {
    const points = [],
      rings = [],
      indices = [];
    for (const [r, z] of profile) {
      const ring = [];
      if (r === 0) {
        ring.push(points.length / 3);
        points.push(0, 0, z);
      } else
        for (let i = 0; i < N; i++) {
          const a = (i / N) * Math.PI * 2,
            phase =
              ((((a / (Math.PI * 2)) * 32 + Math.abs(z) * 3.5) % 1) + 1) % 1,
            edge = Math.min(phase, 1 - phase),
            relief =
              tread && r > 0.125
                ? 0.0043 * THREE.MathUtils.smoothstep(edge, 0.055, 0.14)
                : 0;
          ring.push(points.length / 3);
          points.push(
            (r + relief) * Math.cos(a),
            (r + relief) * Math.sin(a),
            z,
          );
        }
      rings.push(ring);
    }
    for (let j = 0; j < rings.length; j++) {
      const a = rings[j],
        b = rings[(j + 1) % rings.length];
      if (a.length === 1 && b.length === 1) continue;
      for (let i = 0; i < N; i++) {
        const n = (i + 1) % N;
        if (a.length === 1) indices.push(a[0], b[n], b[i]);
        else if (b.length === 1) indices.push(a[i], a[n], b[0]);
        else indices.push(a[i], a[n], b[n], a[i], b[n], b[i]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const uv = [];
    for (let i = 0; i < points.length; i += 3)
      uv.push(points[i] * 54.58, points[i + 1] * 54.58);
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(indices);
    // Orient outward for all profile orders, then light the actual curved surface.
    let volume = 0;
    const p = g.attributes.position,
      A = new THREE.Vector3(),
      B = new THREE.Vector3(),
      C = new THREE.Vector3();
    for (let i = 0; i < indices.length; i += 3) {
      A.fromBufferAttribute(p, indices[i]);
      B.fromBufferAttribute(p, indices[i + 1]);
      C.fromBufferAttribute(p, indices[i + 2]);
      volume += A.dot(B.cross(C)) / 6;
    }
    if (volume < 0)
      for (let i = 0; i < indices.length; i += 3)
        [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    g.setIndex(indices);
    g.computeVertexNormals();
    g.computeBoundingBox();
    return g;
  }
  const report = [];
  for (const w of wheels) {
    const source = w.children[0];
    source.geometry.computeBoundingBox();
    const bounds = source.geometry.boundingBox;
    // Circular tires retain the existing axle and ground height. Width is measured
    // from source sidewall quantiles to avoid isolated reconstruction spikes.
    const p = source.geometry.attributes.position,
      zs = Array.from({ length: p.count }, (_, i) => p.getZ(i)).sort(
        (a, b) => a - b,
      ),
      lo = zs[Math.floor(zs.length * 0.05)],
      hi = zs[Math.floor(zs.length * 0.95)],
      mid = (lo + hi) / 2,
      half = (hi - lo) / 2;
    const front = source.name.startsWith('front'),
      R = front ? 0.132 : 0.133;
    const add = (name, g, material, z = 0) => {
      const m = new THREE.Mesh(g, material);
      m.name = source.name + ' · ' + name;
      m.position.z = mid + z;
      m.userData.wheelAmendment = true;
      w.add(m);
      return m;
    };
    // Closed toroidal tire: both sidewalls, bead return and full tread barrel.
    const tire = add(
      'closed tire',
      revolution(
        [
          [0.06, -half * 0.78],
          [0.069, -half * 0.96],
          [0.087, -half * 1.035],
          [0.108, -half * 0.99],
          [0.123, -half * 0.81],
          [R, -half * 0.56],
          [R, -half * 0.28],
          [R, 0],
          [R, half * 0.28],
          [R, half * 0.56],
          [0.123, half * 0.81],
          [0.108, half * 0.99],
          [0.087, half * 1.035],
          [0.069, half * 0.96],
          [0.06, half * 0.78],
        ],
        256,
        true,
      ),
      rubber,
    );
    add(
      'closed rim barrel',
      revolution([
        [0, -half * 0.72],
        [0.03, -half * 0.72],
        [0.045, -half * 0.75],
        [0.056, -half * 0.84],
        [0.063, -half * 0.83],
        [0.064, -half * 0.64],
        [0.061, -half * 0.56],
        [0.061, half * 0.56],
        [0.064, half * 0.64],
        [0.063, half * 0.83],
        [0.056, half * 0.84],
        [0.045, half * 0.75],
        [0.03, half * 0.72],
        [0, half * 0.72],
      ]),
      steel,
    );
    for (const side of [-1, 1]) {
      // Complete physical hub, bead rings, lug nuts and valve on each face.
      const face = side * half * 0.75;
      add(
        'hub ' + side,
        revolution(
          [
            [0, -0.006],
            [0.027, -0.006],
            [0.031, -0.004],
            [0.031, 0.004],
            [0.027, 0.007],
            [0, 0.007],
          ],
          96,
        ),
        hub,
        side * (half * 0.72 + 0.004),
      );
      for (const r of [0.087, 0.108])
        add(
          'molded sidewall ring ' + side + ' ' + r,
          new THREE.TorusGeometry(r, 0.00065, 6, 128),
          rubber,
          side * (half * (r > 0.1 ? 0.99 : 1.035) + 0.0002),
        );
      const ring = new THREE.TorusGeometry(0.055, 0.0015, 8, 128);
      add('rim bead ' + side, ring, steel, side * half * 0.86);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2,
          m = add(
            'lug ' + side + ' ' + i,
            new THREE.CylinderGeometry(0.0027, 0.0027, 0.0045, 6),
            bolts,
            face + side * 0.002,
          );
        m.rotation.x = Math.PI / 2;
        m.position.x = Math.cos(a) * 0.044;
        m.position.y = Math.sin(a) * 0.044;
      }
      const valve = add(
        'valve ' + side,
        new THREE.CylinderGeometry(0.0015, 0.0015, 0.009, 8),
        rubber,
        side * half * 0.9,
      );
      valve.rotation.x = Math.PI / 2;
      valve.position.x = 0.06;
      valve.position.y = 0.013;
    }
    // Photo-textured fragmented geometry is retained, but cannot draw through or
    // overlap the continuous amendment. The visible wheel uses zero photographic color maps.
    source.visible = false;
    source.userData.wheelComparisonInput = true;
    const tris = w.children
      .filter((m) => m.userData.wheelAmendment)
      .reduce(
        (n, m) =>
          n +
          (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3,
        0,
      );
    report.push({
      name: source.name,
      method:
        'closed volumetric tire and rim at original axle; original fragmented surface retained hidden',
      radius_model_units: R,
      tread_relief: 0.0043,
      axial_midpoint: mid,
      tire_width_model_units: half * 2.07,
      source_bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      visible_meshes: w.children.filter((m) => m.userData.wheelAmendment)
        .length,
      added_triangles: tris,
      source_vertex_count: p.count,
      tire_mesh: tire.name,
      photographic_color_maps: 0,
      hub_material: {
        name: hub.name,
        color: '#' + hub.color.getHexString(),
        metalness: hub.metalness,
        roughness: hub.roughness,
        normal_scale: hub.normalScale.toArray(),
      },
    });
  }
  return report;
}
