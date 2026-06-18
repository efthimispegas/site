'use client';

import { useEffect, useRef } from 'react';
import { shouldReduceMotion } from './reduced-motion';

export interface ParticleFieldHeroProps {
  className?: string;
}

export function ParticleFieldHero({ className }: ParticleFieldHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }

    const reducedMotion = shouldReduceMotion(
      undefined,
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    const pointer = { x: 0.5, y: 0.45 };
    let frame = 0;
    let animationFrame = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) {
        return;
      }

      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      context.clearRect(0, 0, width, height);

      for (let x = 0; x <= width + 40; x += 34) {
        for (let y = 0; y <= height + 40; y += 34) {
          const dx = x / width - pointer.x;
          const dy = y / height - pointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const wave = reducedMotion
            ? 0
            : Math.sin(frame * 0.02 + x * 0.014 + y * 0.01) * 7;
          const lift = reducedMotion ? 0 : Math.max(0, 1 - distance * 2.8) * 22;
          const radius = distance < 0.12 ? 2.2 : 1.3;

          context.beginPath();
          context.fillStyle =
            distance < 0.12
              ? 'rgba(55, 136, 255, 0.78)'
              : distance < 0.18
                ? 'rgba(237, 99, 57, 0.52)'
                : 'rgba(20, 20, 20, 0.18)';
          context.arc(x, y + wave - lift, radius, 0, Math.PI * 2);
          context.fill();
        }
      }

      frame += 1;
      animationFrame = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width;
      pointer.y = (event.clientY - rect.top) / rect.height;
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointermove', onPointerMove);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? 'particle-field-hero'}
      aria-hidden="true"
    />
  );
}
