import type { Metadata } from 'next';
import { SiteHeader } from '../shared/site-header';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'Pegasoft privacy notes for the v1 website.',
};

export default function PrivacyPage() {
  return (
    <main className="subpage">
      <SiteHeader />
      <section className="legal-copy">
        <p className="eyebrow">Privacy</p>
        <h1>Privacy-first by default.</h1>
        <p>
          This v1 site is planned around minimal data collection. Booking is
          handled by an external scheduling provider, and analytics should only
          be enabled with a GDPR-conscious configuration.
        </p>
        <p>
          Replace this page with reviewed legal copy before production launch.
        </p>
      </section>
    </main>
  );
}
