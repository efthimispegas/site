'use client';

import { animate, createTimeline, stagger } from 'animejs';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export interface FableMenuItem {
  href: string;
  label: string;
}

export interface FableMenuProps {
  items: FableMenuItem[];
  onClose: () => void;
  open: boolean;
}

export function FableMenu({ items, onClose, open }: FableMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setVisible(true);
    }
  }, [open]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !visible) {
      return undefined;
    }

    const panel = root.querySelector('.fable-menu__panel');
    const rows = root.querySelectorAll('.fable-menu__row span');
    const meta = root.querySelectorAll('.fable-menu__meta > *');

    if (!panel) {
      return undefined;
    }

    if (open) {
      const timeline = createTimeline({
        defaults: {
          ease: 'cubicBezier(0.22, 1, 0.36, 1)',
        },
      });

      panel.setAttribute('data-open', 'true');
      timeline
        .add(panel, {
          opacity: [0, 1],
          translateY: ['-101%', '0%'],
          duration: 860,
        })
        .add(
          rows,
          {
            opacity: [0, 1],
            translateY: ['118%', '0%'],
            duration: 820,
            delay: stagger(56),
          },
          '-=560',
        )
        .add(
          meta,
          {
            opacity: [0, 1],
            translateY: [24, 0],
            duration: 520,
            delay: stagger(60),
          },
          '-=420',
        );

      return () => {
        timeline.pause();
      };
    }

    const exit = animate(panel, {
      opacity: [1, 0],
      translateY: ['0%', '-101%'],
      duration: 560,
      ease: 'cubicBezier(0.22, 1, 0.36, 1)',
      onComplete: () => setVisible(false),
    });

    return () => {
      exit.pause();
    };
  }, [open, visible]);

  if (!visible) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className="fable-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Primary navigation"
    >
      <div className="fable-menu__panel">
        <button
          className="fable-menu__close"
          type="button"
          onClick={onClose}
          data-cursor="hover"
        >
          Close
        </button>
        <nav className="fable-menu__nav">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="fable-menu__row"
              onClick={onClose}
            >
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="fable-menu__meta">
          <p>PEGASOFT</p>
          <p>Design and delivery quality digital product solutions</p>
          <p>Book a client call</p>
        </div>
      </div>
    </div>
  );
}
