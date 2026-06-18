import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getPegasoftWorkItems,
  hasPublishableClientProjects,
} from '@site/content';
import { SiteHeader } from '../shared/site-header';

export const metadata: Metadata = {
  title: 'Work',
  description:
    'Pegasoft work taxonomy separating Concept Lab studies from approved client and product portfolio entries.',
};

export default function WorkPage() {
  const workItems = getPegasoftWorkItems();

  return (
    <main className="subpage">
      <SiteHeader />
      <section className="subpage-hero">
        <p className="eyebrow">Work</p>
        <h1>Two portfolios. One truth standard.</h1>
        <p>
          Concept Lab studies show product thinking. Client Product Portfolio
          entries show real, approved work only.
        </p>
        <div className="hero-actions">
          <Link className="secondary-cta" href="/work/concepts">
            Browse concepts
          </Link>
          <Link className="secondary-cta" href="/work/portfolio">
            Client portfolio
          </Link>
        </div>
      </section>
      <section
        className="work-grid work-grid--wide"
        aria-label="All Pegasoft work"
      >
        {workItems.map((item) => (
          <Link
            className="work-card"
            href={`/work/${item.slug}`}
            key={item.slug}
          >
            <span>{item.kind === 'concept' ? item.label : item.industry}</span>
            <h2>{item.kind === 'concept' ? item.title : item.productName}</h2>
            <p>{item.kind === 'concept' ? item.challenge : item.problem}</p>
          </Link>
        ))}
        {!hasPublishableClientProjects() && (
          <div className="work-card work-card--quiet">
            <span>Client Product Portfolio</span>
            <h2>Awaiting approved entries</h2>
            <p>
              Real client/product work will be posted when client permission,
              assets, and outcome details are ready.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
