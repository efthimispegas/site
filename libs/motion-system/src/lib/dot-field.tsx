'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { shouldReduceMotion } from './reduced-motion';

export interface DotFieldProps {
  density?: number;
  label?: string;
}

export function DotField({
  density = 96,
  label = 'Interactive background field',
}: DotFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const dots = useMemo(
    () =>
      Array.from({ length: density }, (_, index) => ({
        id: index,
        delay: `${(index % 17) * 70}ms`,
      })),
    [density],
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => {
      setReducedMotion(shouldReduceMotion(undefined, media.matches));
    };

    syncPreference();
    media.addEventListener('change', syncPreference);

    return () => media.removeEventListener('change', syncPreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      return undefined;
    }

    const field = fieldRef.current;
    if (!field) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = field.getBoundingClientRect();
      field.style.setProperty('--cursor-x', `${event.clientX - rect.left}px`);
      field.style.setProperty('--cursor-y', `${event.clientY - rect.top}px`);
    };

    field.addEventListener('pointermove', handlePointerMove);

    return () => field.removeEventListener('pointermove', handlePointerMove);
  }, [reducedMotion]);

  return (
    <div
      ref={fieldRef}
      className="dot-field"
      aria-label={label}
      aria-hidden="true"
      data-reduced-motion={reducedMotion}
    >
      {dots.map((dot) => (
        <span
          className="dot-field__point"
          key={dot.id}
          style={{ animationDelay: dot.delay }}
        />
      ))}
    </div>
  );
}
