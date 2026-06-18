import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { DotField, KineticReveal } from '@site/motion-system';
import { individualProfile, individualProjects } from '@site/content';
import { IndividualHeader } from './shared/individual-header';

export default function Index() {
  return (
    <main id="top" className="individual-shell">
      <DotField density={86} label="Individual brand dot background" />
      <IndividualHeader />
      <section className="personal-hero" aria-labelledby="hero-title">
        <div
          className="portrait-panel"
          role="img"
          aria-label="Abstract portrait placeholder for the provisional persona"
        >
          <span />
        </div>
        <KineticReveal className="personal-copy">
          <p className="eyebrow" data-kinetic="fade">
            {individualProfile.title}
          </p>
          <h1 id="hero-title">
            <span data-kinetic="line">Iris</span>
            <span data-kinetic="line">Vale</span>
          </h1>
          <p data-kinetic="fade">{individualProfile.statement}</p>
          <div className="hero-actions" data-kinetic="fade">
            <a
              className="primary-cta"
              href={`mailto:${individualProfile.email}`}
            >
              Start a collaboration
              <ArrowUpRight aria-hidden="true" size={18} />
            </a>
            <Link className="secondary-cta" href="/work">
              Selected work
            </Link>
          </div>
        </KineticReveal>
      </section>

      <section className="manifesto" aria-label="Design statement">
        <p className="eyebrow">Intro</p>
        <blockquote>
          I design products people do not want to close, then help teams ship
          them with less drift.
        </blockquote>
        <p className="disclosure">{individualProfile.disclosure}</p>
      </section>

      <section className="selected-work" aria-labelledby="work-title">
        <p className="eyebrow">Selected work</p>
        <h2 id="work-title">
          Concept portfolio pieces for the v1 personal brand.
        </h2>
        <div className="project-rail">
          {individualProjects.map((project) => (
            <Link
              className="project-card"
              href={`/work/${project.slug}`}
              key={project.slug}
            >
              <span>{project.serviceType}</span>
              <h3>{project.title}</h3>
              <p>{project.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="client-marquee" aria-label="Provisional capabilities">
        <div>
          Product UX · Brand systems · Interaction direction · Handoff quality ·
          Product UX · Brand systems · Interaction direction · Handoff quality ·
        </div>
      </section>

      <section className="process-block" aria-labelledby="process-title">
        <p className="eyebrow">Process</p>
        <h2 id="process-title">
          A small senior workflow for focused engagements.
        </h2>
        <div className="process-list">
          {[
            'Frame the brief',
            'Design the system',
            'Prototype the edge cases',
            'Package the handoff',
          ].map((step, index) => (
            <article key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="contact-band" aria-labelledby="contact-title">
        <p className="eyebrow">Contact</p>
        <h2 id="contact-title">Let&apos;s build something exact.</h2>
        <a href={`mailto:${individualProfile.email}`}>
          {individualProfile.email}
        </a>
      </section>
    </main>
  );
}
