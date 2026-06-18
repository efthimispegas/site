'use client';

import { PropsWithChildren, useEffect, useRef } from 'react';
import { animate, createTimeline, stagger } from 'animejs';

export interface KineticRevealProps extends PropsWithChildren {
  className?: string;
  disabled?: boolean;
}

export function KineticReveal({
  children,
  className,
  disabled = false,
}: KineticRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      disabled ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return undefined;
    }

    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    const timeline = createTimeline({
      defaults: {
        duration: 900,
        ease: 'outCubic',
      },
    });

    const lineTargets = root.querySelectorAll('[data-kinetic="line"]');
    const fadeTargets = root.querySelectorAll('[data-kinetic="fade"]');
    const ruleTargets = root.querySelectorAll('[data-kinetic="rule"]');

    if (lineTargets.length > 0) {
      timeline.add(lineTargets, {
        opacity: [0, 1],
        translateY: [48, 0],
        delay: stagger(90),
      });
    }

    if (fadeTargets.length > 0) {
      timeline.add(
        fadeTargets,
        {
          opacity: [0, 1],
          translateY: [18, 0],
          delay: stagger(70),
        },
        lineTargets.length > 0 ? '-=520' : 0,
      );
    }

    const ruleAnimation =
      ruleTargets.length > 0
        ? animate(ruleTargets, {
            scaleX: [0, 1],
            duration: 1100,
            ease: 'outExpo',
            delay: stagger(80),
          })
        : undefined;

    return () => {
      timeline.pause();
      ruleAnimation?.pause();
    };
  }, [disabled]);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
