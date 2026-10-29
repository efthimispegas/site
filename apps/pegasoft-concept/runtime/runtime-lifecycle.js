/** Own listeners, observers and callbacks for exactly one mounted scene. */
export function createScope() {
  const cleanups = [];
  const abort = new AbortController();
  let disposed = false;
  return {
    get signal() {
      return abort.signal;
    },
    get disposed() {
      return disposed;
    },
    defer(cleanup) {
      if (disposed) cleanup();
      else cleanups.push(cleanup);
    },
    listen(target, type, listener, options = {}) {
      if (disposed) return;
      target.addEventListener(type, listener, {
        ...options,
        signal: abort.signal,
      });
    },
    handler(target, name, listener) {
      if (disposed) return;
      const previous = target[name];
      target[name] = listener;
      this.defer(() => {
        if (target[name] === listener) target[name] = previous;
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      const errors = [];
      for (const cleanup of cleanups.splice(0).reverse())
        try {
          cleanup();
        } catch (error) {
          errors.push(error);
        }
      if (errors.length)
        throw new AggregateError(errors, 'Scene cleanup failed');
    },
  };
}

/** A single outstanding animation callback; stop also cancels pending work. */
export function createFrameLoop(
  step,
  {
    request = (callback) => requestAnimationFrame(callback),
    cancel = (id) => cancelAnimationFrame(id),
  } = {},
) {
  let pending = null,
    active = false;
  function frame(time) {
    pending = null;
    if (!active) return;
    step(time);
    if (active) pending = request(frame);
  }
  return {
    get active() {
      return active;
    },
    start() {
      if (active) return;
      active = true;
      pending = request(frame);
    },
    stop() {
      active = false;
      if (pending !== null) cancel(pending);
      pending = null;
    },
  };
}

/** Dispose shared GPU resources once, including detached models still loading. */
export function disposeSceneResources(roots) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  for (const root of roots)
    root?.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of [].concat(object.material || [])) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value?.isTexture) textures.add(value);
        for (const uniform of Object.values(material.uniforms || {}))
          if (uniform.value?.isTexture) textures.add(uniform.value);
      }
      object.shadow?.dispose();
    });
  for (const root of roots)
    if (root?.environment) textures.add(root.environment);
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
}
