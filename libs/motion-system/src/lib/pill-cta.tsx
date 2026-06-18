'use client';

import clsx from 'clsx';

export interface PillCtaProps {
  className?: string;
  href: string;
  hoverLabel?: string;
  label: string;
  target?: string;
}

export function PillCta({
  className,
  href,
  hoverLabel = 'Book a client call',
  label,
  target,
}: PillCtaProps) {
  return (
    <a
      className={clsx('pill-cta', className)}
      data-cursor="hover"
      href={href}
      target={target}
      rel={target === '_blank' ? 'noreferrer' : undefined}
      aria-label={label}
    >
      <span className="pill-cta__sr">{label}</span>
      <span className="pill-cta__label" aria-hidden="true">
        <span>{label}</span>
        <span>{hoverLabel}</span>
      </span>
    </a>
  );
}
