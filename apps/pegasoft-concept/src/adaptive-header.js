/** Shared homepage visibility, direction, surface and focus behavior. */
export function createAdaptiveHeader(header) {
  const document = header.ownerDocument;
  const contact = header.querySelector('#site-header-contact');
  const language = header.querySelector('#site-header-language');
  let shown = true,
    ready = false,
    previousY = 0,
    direction = 0,
    travel = 0;
  return {
    get ready() {
      return ready;
    },
    get y() {
      return previousY;
    },
    update({ y, mobile, openingReady, heroSurface, light }) {
      y = Math.max(0, y);
      const delta = y - previousY;
      previousY = y;
      if (Math.abs(delta) > 0.1) {
        const nextDirection = Math.sign(delta);
        if (nextDirection !== direction) travel = 0;
        direction = nextDirection;
        travel += Math.abs(delta);
        if (travel >= 4) {
          shown = direction < 0;
          if (direction > 0 && header.contains(document.activeElement))
            document.activeElement.blur();
        }
      }
      if (y <= 4) shown = true;
      ready ||= openingReady;
      header.dataset.compact = String(!heroSurface);
      header.dataset.surface = mobile && !heroSurface ? 'paper' : 'transparent';
      header.dataset.tone = mobile
        ? heroSurface
          ? 'dark'
          : 'light'
        : light
          ? 'light'
          : 'dark';
      const surface = (mobile ? !heroSurface : light)
        ? document.documentElement.dataset.colorTheme === 'dark'
          ? '#11151b'
          : '#edf2f7'
        : '#05070a';
      const theme = document.querySelector('meta[name="theme-color"]');
      if (theme && theme.content !== surface) theme.content = surface;
      const visible =
        ready &&
        (!mobile ||
          shown ||
          header.contains(document.activeElement) ||
          contact?.contains(document.activeElement) ||
          language?.contains(document.activeElement));
      header.dataset.ready = String(ready);
      header.dataset.visible = String(visible);
      for (const target of [header, contact, language])
        if (target) target.inert = !visible;
    },
  };
}
