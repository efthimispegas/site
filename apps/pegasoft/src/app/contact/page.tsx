import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { SiteHeader } from '../shared/site-header';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Book a client call with Pegasoft.',
};

export default function ContactPage() {
  const bookingUrl =
    process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'mailto:hello@pegasoft.studio';
  const email =
    process.env['NEXT_PUBLIC_CONTACT_EMAIL'] ?? 'hello@pegasoft.studio';

  return (
    <main className="subpage">
      <SiteHeader />
      <section className="final-cta final-cta--page">
        <p className="eyebrow">Contact</p>
        <h1>Start with a focused product call.</h1>
        <p>
          Bring the goal, constraints, and quality bar. Pegasoft will help turn
          it into a clearer delivery path.
        </p>
        <a className="primary-cta primary-cta--dark" href={bookingUrl}>
          Book a client call
          <ArrowUpRight aria-hidden="true" size={18} />
        </a>
        <a className="text-link" href={`mailto:${email}`}>
          {email}
        </a>
      </section>
    </main>
  );
}
