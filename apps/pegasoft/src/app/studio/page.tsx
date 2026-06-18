import type { Metadata } from 'next';
import { SiteHeader } from '../shared/site-header';

export const metadata: Metadata = {
  title: 'Studio',
  description:
    'Pegasoft studio principles for design craft, delivery quality, accessibility, and honest proof.',
};

const principles = [
  'Make the first impression memorable, then make every detail useful.',
  'Keep speculative and client work clearly separated.',
  'Treat accessibility, performance, and release readiness as design material.',
  'Use motion and 3D only when they sharpen the product story.',
];

export default function StudioPage() {
  return (
    <main className="subpage">
      <SiteHeader />
      <section className="subpage-hero">
        <p className="eyebrow">Studio</p>
        <h1>Mythic precision, practical delivery.</h1>
        <p>
          Pegasoft is shaped around a simple standard: the work should feel
          premium and survive production reality.
        </p>
      </section>
      <section className="principle-list" aria-label="Studio principles">
        {principles.map((principle, index) => (
          <article className="principle" key={principle}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <p>{principle}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
