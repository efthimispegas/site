import type { Metadata } from 'next';
import Link from 'next/link';
import { conceptLabStudies } from '@site/content';
import { SiteHeader } from '../../shared/site-header';

export const metadata: Metadata = {
  title: 'Concept Lab',
  description:
    'Speculative Pegasoft product studies clearly labeled as Concept Lab work.',
};

export default function ConceptsPage() {
  return (
    <main className="subpage">
      <SiteHeader />
      <section className="subpage-hero">
        <p className="eyebrow">Concept Lab</p>
        <h1>Speculative product studies, labeled without ambiguity.</h1>
        <p>
          These studies explore product strategy, interface systems, and
          delivery logic without claiming real clients.
        </p>
      </section>
      <section
        className="work-grid work-grid--wide"
        aria-label="Concept Lab studies"
      >
        {conceptLabStudies.map((study) => (
          <Link
            className="work-card"
            href={`/work/${study.slug}`}
            key={study.slug}
          >
            <span>{study.label}</span>
            <h2>{study.title}</h2>
            <p>{study.solution}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
