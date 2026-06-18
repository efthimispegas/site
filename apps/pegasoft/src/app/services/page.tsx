import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import { serviceOfferings } from '@site/content';
import { SiteHeader } from '../shared/site-header';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Pegasoft services for digital product strategy, interface systems, delivery quality, and interactive brand platforms.',
};

export default function ServicesPage() {
  return (
    <main className="subpage">
      <SiteHeader />
      <section className="subpage-hero">
        <p className="eyebrow">Services</p>
        <h1>Digital product solutions with delivery quality built in.</h1>
        <p>
          Pegasoft works where high-craft interface design and accountable
          execution need to meet.
        </p>
      </section>
      <section
        className="service-detail-list"
        aria-label="Pegasoft service offerings"
      >
        {serviceOfferings.map((service) => (
          <article
            id={service.slug}
            className="service-detail"
            key={service.slug}
          >
            <div>
              <p className="eyebrow">{service.idealFor}</p>
              <h2>{service.title}</h2>
              <p>{service.summary}</p>
            </div>
            <div>
              <h3>Delivery proof</h3>
              <p>{service.deliveryQualityProof}</p>
              <h3>Deliverables</h3>
              <ul className="check-list">
                {service.deliverables.map((item) => (
                  <li key={item}>
                    <CheckCircle2 aria-hidden="true" size={18} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
