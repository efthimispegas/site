'use client';

import { animate, stagger } from 'animejs';
import { createElement, useEffect, useRef } from 'react';

type TextTag = 'h1' | 'h2' | 'p' | 'span';

export interface SplitTextRevealProps {
  as?: TextTag;
  className?: string;
  delay?: number;
  text: string;
}

export function SplitTextReveal({
  as = 'span',
  className,
  delay = 0,
  text,
}: SplitTextRevealProps) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    const targets = root.querySelectorAll('.split-text__inner');
    const animation = animate(targets, {
      translateY: ['112%', '0%'],
      opacity: [0, 1],
      duration: 1100,
      delay: stagger(34, { start: delay }),
      ease: 'cubicBezier(0.19, 1, 0.22, 1)',
    });

    return () => {
      animation.pause();
    };
  }, [delay]);

  return createElement(
    as,
    { className, ref: rootRef },
    text.split('').map((character, index) => (
      <span className="split-text__mask" key={`${character}-${index}`}>
        <span className="split-text__inner">
          {character === ' ' ? '\u00A0' : character}
        </span>
      </span>
    )),
  );
}
