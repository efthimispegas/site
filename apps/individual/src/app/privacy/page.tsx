import type { Metadata } from 'next';
import { IndividualHeader } from '../shared/individual-header';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'Privacy notes for the provisional individual brand site.',
};

export default function PrivacyPage() {
  return (
    <main className="individual-subpage">
      <IndividualHeader />
      <section className="subpage-intro">
        <p className="eyebrow">Privacy</p>
        <h1>Minimal data by default.</h1>
        <p>
          This personal brand scaffold uses direct email contact and should be
          reviewed before production launch.
        </p>
      </section>
    </main>
  );
}
