import type { Metadata } from 'next';
import { individualProfile } from '@site/content';
import { IndividualHeader } from '../shared/individual-header';

export const metadata: Metadata = {
  title: 'Services',
  description: 'Freelance product design, brand systems, and handoff support.',
};

export default function ServicesPage() {
  return (
    <main className="individual-subpage">
      <IndividualHeader />
      <section className="subpage-intro">
        <p className="eyebrow">Services</p>
        <h1>
          Focused design support for teams that need the last 20% of clarity.
        </h1>
      </section>
      <section className="process-list process-list--services">
        {individualProfile.skills.map((skill, index) => (
          <article key={skill}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h2>{skill}</h2>
          </article>
        ))}
      </section>
    </main>
  );
}
