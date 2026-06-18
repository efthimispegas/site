import type { Metadata } from 'next';
import { individualProfile } from '@site/content';
import { IndividualHeader } from '../shared/individual-header';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact the provisional Iris Vale individual brand.',
};

export default function ContactPage() {
  return (
    <main className="individual-subpage">
      <IndividualHeader />
      <section className="contact-band contact-band--page">
        <p className="eyebrow">Contact</p>
        <h1>Available for focused freelance collaborations.</h1>
        <a href={`mailto:${individualProfile.email}`}>
          {individualProfile.email}
        </a>
      </section>
    </main>
  );
}
