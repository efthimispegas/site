import type { Metadata } from 'next';
import { individualProfile } from '@site/content';
import { IndividualHeader } from '../shared/individual-header';

export const metadata: Metadata = {
  title: 'About',
  description: 'About the provisional Iris Vale individual brand.',
};

export default function AboutPage() {
  return (
    <main className="individual-subpage">
      <IndividualHeader />
      <section className="subpage-intro">
        <p className="eyebrow">About</p>
        <h1>{individualProfile.name}</h1>
        <p>{individualProfile.bio}</p>
        <p className="disclosure">{individualProfile.disclosure}</p>
      </section>
    </main>
  );
}
