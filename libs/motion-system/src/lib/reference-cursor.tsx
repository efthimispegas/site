'use client';

import { useEffect, useState } from 'react';

export function ReferenceCursor() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncEnabled = () => {
      const active = !coarsePointer.matches && !reducedMotion.matches;
      setEnabled(active);
      document.body.dataset.referenceCursor = active ? 'true' : 'false';
    };

    syncEnabled();
    coarsePointer.addEventListener('change', syncEnabled);
    reducedMotion.addEventListener('change', syncEnabled);

    return () => {
      coarsePointer.removeEventListener('change', syncEnabled);
      reducedMotion.removeEventListener('change', syncEnabled);
      delete document.body.dataset.referenceCursor;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const dot = document.querySelector<HTMLElement>('.reference-cursor__dot');
    const ring = document.querySelector<HTMLElement>('.reference-cursor__ring');

    if (!dot || !ring) {
      return undefined;
    }

    const move = (event: PointerEvent) => {
      const x = `${event.clientX}px`;
      const y = `${event.clientY}px`;

      dot.style.left = x;
      dot.style.top = y;
      ring.style.left = x;
      ring.style.top = y;
    };

    const onPointerOver = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const interactive = target.closest(
        'a, button, input, textarea, select, [data-cursor="hover"]',
      );
      ring.dataset.hover = interactive ? 'true' : 'false';
    };

    const onPointerLeave = () => {
      ring.dataset.hover = 'false';
    };

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerover', onPointerOver, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);

    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="reference-cursor" aria-hidden="true">
      <span className="reference-cursor__dot" />
      <span className="reference-cursor__ring" data-hover="false" />
    </div>
  );
}
