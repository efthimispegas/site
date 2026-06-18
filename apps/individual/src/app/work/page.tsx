import type { Metadata } from 'next';
import Link from 'next/link';
import { individualProjects } from '@site/content';
import { IndividualHeader } from '../shared/individual-header';

export const metadata: Metadata = {
  title: 'Work',
  description:
    'Concept portfolio pieces for the provisional Iris Vale individual brand.',
};

export default function WorkPage() {
  return (
    <main className="individual-subpage">
      <IndividualHeader />
      <section className="subpage-intro">
        <p className="eyebrow">Work</p>
        <h1>Selected concept pieces.</h1>
        <p>
          These are scaffold entries for a personal freelancer brand. Replace
          them with real work before launch.
        </p>
      </section>
      <section className="project-grid">
        {individualProjects.map((project) => (
          <Link
            className="project-card"
            href={`/work/${project.slug}`}
            key={project.slug}
          >
            <span>{project.serviceType}</span>
            <h2>{project.title}</h2>
            <p>{project.summary}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
