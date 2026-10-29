import { translate as t } from './locale-messages.js';
/** DriftWall native adaptation of React Bits by David Haz (2026).
 * License: /licenses/react-bits.txt — MIT + Commons Clause.
 * This controller receives time from the application scheduler and owns no frame loop.
 */
import { createScope } from '../runtime/runtime-lifecycle.js';
export function mobilePartnerOffset(position, width, dt) {
  return width > 0
    ? width + ((((position - width + dt * 28) % width) + width) % width)
    : position;
}
export function createPartnerWall({ element, button }) {
  const document = element.ownerDocument,
    window = document.defaultView,
    scope = createScope(),
    catalog = element.querySelector('ol'),
    items = [...catalog.children];
  items.forEach((item) => item.removeAttribute('tabindex'));
  catalog.className = 'partner-wall__catalog';
  element.tabIndex = 0;
  let mounted = false,
    mobile = false,
    columns = -1,
    tracks = [],
    meta = [],
    offsets = [],
    velocities = [],
    paused = false,
    reduced = false,
    visible = false,
    hovered = -1,
    activeTile = null,
    focused = false,
    pointer = { x: 0, y: 0 },
    damped = { x: 0, y: 0 };
  let mobileTime = 0,
    manualUntil = 0,
    held = false,
    mobileWidth = 0,
    mobilePosition = 0,
    lastAuto = 0;
  const plane = document.createElement('div');
  plane.className = 'partner-wall__plane';
  plane.setAttribute('aria-hidden', 'true');
  function resize() {
    mobile = window.innerWidth <= 760;
    element.dataset.layout = mobile ? 'icons' : 'wall';
    button.hidden = false;
    catalog.tabIndex = mobile ? 0 : -1;
    const count = mobile ? 0 : 5;
    if (count === columns) {
      if (mobile) measureMobile();
      return;
    }
    release();
    catalog.replaceChildren(...items);
    if (mobile) {
      const copy = () =>
        items.map((item) => {
          const clone = item.cloneNode(true);
          clone.dataset.mobileCopy = 'true';
          clone.setAttribute('aria-hidden', 'true');
          return clone;
        });
      catalog.prepend(...copy());
      catalog.append(...copy());
      measureMobile();
    } else mobileWidth = 0;
    const old = offsets.map((v, i) => v / meta[i]);
    columns = count;
    plane.replaceChildren();
    tracks = [];
    meta = [];
    offsets = [];
    velocities = [];
    for (let c = 0; c < count; c++) {
      const col = document.createElement('div'),
        track = document.createElement('div');
      col.className = 'partner-wall__col';
      track.className = 'partner-wall__track';
      const group = items.filter((_, i) => i % count === c),
        height = group.length * 150,
        copies = Math.max(
          3,
          Math.ceil((element.clientHeight * 1.8) / height) + 2,
        );
      for (let copy = 0; copy < copies; copy++)
        for (const original of group) {
          const tile = original.cloneNode(true);
          tile.dataset.copy = 'true';
          tile.removeAttribute('tabindex');
          track.append(tile);
        }
      col.append(track);
      plane.append(col);
      tracks.push(track);
      meta.push(height);
      offsets.push(height * (old[c] ?? (c * 0.37) % 1));
      velocities.push(0);
    }
    paint();
  }
  function measureMobile() {
    const first = catalog.firstElementChild;
    mobileWidth = items[0].offsetLeft - first.offsetLeft;
    mobilePosition = mobileWidth;
    catalog.scrollLeft = mobilePosition;
    lastAuto = catalog.scrollLeft;
  }
  function paint() {
    tracks.forEach(
      (track, c) =>
        (track.style.transform = `translate3d(0,${-offsets[c]}px,0)`),
    );
    plane.style.transform = reduced
      ? 'none'
      : `translate(-50%,-50%) scale(1.18) rotateX(${16 + damped.y}deg) rotateY(${-14 + damped.x}deg) translateZ(-120px)`;
  }
  function update({ reducedMotion = reduced } = {}) {
    reduced = reducedMotion;
    element.dataset.reduced = String(reduced);
    const r = element.getBoundingClientRect();
    visible = r.bottom > 0 && r.top < window.innerHeight;
    button.disabled = reduced;
    const label = t(paused ? 'Resume partner motion' : 'Pause partner motion');
    if (button.textContent !== label) button.textContent = label;
    button.setAttribute('aria-pressed', String(paused));
    paint();
  }
  function tick(dt) {
    mobileTime += dt;
    if (!mounted || scope.disposed || !visible || reduced || paused) return;
    if (mobile) {
      if (held || mobileTime < manualUntil || catalog.matches(':focus-visible'))
        return;
      mobilePosition = mobilePartnerOffset(mobilePosition, mobileWidth, dt);
      catalog.scrollLeft = mobilePosition;
      lastAuto = catalog.scrollLeft;
      return;
    }
    if (focused) return;
    // A stable column hit surface must not move underneath a hovering pointer.
    if (hovered < 0) {
      const damping = 1 - Math.exp(-dt / 0.12);
      damped.x += (pointer.x * 4.8 - damped.x) * damping;
      damped.y += (-pointer.y * 4.8 - damped.y) * damping;
    }
    tracks.forEach((_, c) => {
      const pseudo = ((c * 0.6180339887 + 0.35) % 1) * 2 - 1,
        target =
          c === hovered ? 0 : 42 * (1 + 0.45 * pseudo) * (c % 2 ? -1 : 1);
      velocities[c] +=
        (target - velocities[c]) *
        (1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.28)));
      offsets[c] =
        (((offsets[c] + velocities[c] * dt) % meta[c]) + meta[c]) % meta[c];
    });
    paint();
  }
  function release() {
    hovered = -1;
    activeTile = null;
    pointer = { x: 0, y: 0 };
    element
      .querySelectorAll('.is-active')
      .forEach((el) => el.classList.remove('is-active'));
  }
  function mount() {
    if (mounted || scope.disposed) return;
    mounted = true;
    catalog.hidden = false;
    element.append(plane);
    resize();
    scope.listen(button, 'click', () => {
      paused = !paused;
      update();
    });
    scope.listen(
      catalog,
      'pointerdown',
      () => {
        held = true;
        manualUntil = mobileTime + 1;
      },
      { passive: true },
    );
    for (const event of ['pointerup', 'pointercancel'])
      scope.listen(
        window,
        event,
        () => {
          if (held) {
            held = false;
            manualUntil = mobileTime + 1;
            mobilePosition = catalog.scrollLeft;
          }
        },
        { passive: true },
      );
    scope.listen(
      catalog,
      'scroll',
      () => {
        if (!mobile || Math.abs(catalog.scrollLeft - lastAuto) <= 1) return;
        manualUntil = mobileTime + 1;
        mobilePosition = catalog.scrollLeft;
        lastAuto = catalog.scrollLeft;
      },
      { passive: true },
    );
    scope.listen(catalog, 'keydown', () => {
      manualUntil = mobileTime + 3;
      mobilePosition = catalog.scrollLeft;
    });
    scope.listen(element, 'pointermove', (event) => {
      if (reduced || event.pointerType === 'touch') return;
      const r = element.getBoundingClientRect();
      pointer = {
        x: (event.clientX - r.left) / r.width - 0.5,
        y: (event.clientY - r.top) / r.height - 0.5,
      };
      const col = event.target.closest('.partner-wall__col'),
        index = col
          ? tracks.findIndex((track) => track.parentElement === col)
          : -1;
      // The raised tile can project beyond its base column. Keep ownership over its footprint too.
      const active = activeTile
          ?.querySelector('.partner-wall__inner')
          .getBoundingClientRect(),
        overActive =
          active &&
          event.clientX >= active.left &&
          event.clientX <= active.right &&
          event.clientY >= active.top &&
          event.clientY <= active.bottom;
      if (hovered >= 0 && (index === hovered || overActive)) return;
      element
        .querySelectorAll('.is-active')
        .forEach((tile) => tile.classList.remove('is-active'));
      activeTile = null;
      hovered = index;
      if (index < 0) return;
      velocities[index] = 0;
      // Choose the visible row once; neither gaps nor its lift animation can change this owner.
      const tiles = [...tracks[index].children];
      activeTile = tiles.reduce((best, tile) => {
        const bounds = tile.getBoundingClientRect(),
          distance = Math.abs((bounds.top + bounds.bottom) / 2 - event.clientY);
        return !best || distance < best.distance ? { tile, distance } : best;
      }, null)?.tile;
      activeTile?.classList.add('is-active');
    });
    scope.listen(element, 'pointerleave', release);
    scope.listen(element, 'focusin', () => (focused = true));
    scope.listen(element, 'focusout', (event) => {
      focused = element.contains(event.relatedTarget);
    });
    scope.listen(window, 'blur', release);
    update();
  }
  return {
    mount,
    resize,
    update,
    tick,
    dispose() {
      scope.dispose();
      catalog.replaceChildren(...items);
      catalog.hidden = false;
      plane.remove();
      mounted = false;
    },
  };
}
