'use client';

import { animate } from 'animejs';
import { useEffect, useState } from 'react';

export function ReferencePreloader() {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const skipMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.navigator.webdriver;

    if (skipMotion) {
      setHidden(true);
      return undefined;
    }

    const state = { value: 0 };
    const animation = animate(state, {
      value: 100,
      duration: 1380,
      ease: 'cubicBezier(0.19, 1, 0.22, 1)',
      onUpdate: () => setProgress(Math.round(state.value)),
      onComplete: () => {
        setProgress(100);
        setExiting(true);
        window.setTimeout(() => setHidden(true), 260);
      },
    });

    return () => {
      animation.pause();
    };
  }, []);

  if (hidden) {
    return null;
  }

  return (
    <div
      className="reference-preloader"
      data-exiting={exiting}
      aria-hidden="true"
    >
      <div className="reference-preloader__count">
        {String(progress).padStart(2, '0')}
      </div>
      <div className="reference-preloader__bar">
        <span style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
    </div>
  );
}
